// src/renderer/hooks/useProfiles.ts
import { useState, useEffect, useCallback } from 'react'
import type { Profile } from '../../main/types/profile'

let globalProfiles: Profile[] = []
let globalAppDataPath = ''
const listeners = new Set<() => void>()
let version = 0

export const notifyProfileChanged = () => {
    version ++
  listeners.forEach(cb => cb())
}

export default function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>(globalProfiles)
  const [appDataPath, setAppDataPath] = useState(globalAppDataPath)
  const [loading, setLoading] = useState(true)

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true)
      const path = await window.electronAPI.profileAPI.getAppDataPath()
      const list = await window.electronAPI.profileAPI.listProfiles(path)

      globalAppDataPath = path
      globalProfiles = list

      setAppDataPath(path)
      setProfiles(list)
    } catch (err) {
      console.error('Lỗi load profiles:', err)
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    loadProfiles()

    const handleFocus = () => loadProfiles()
    window.addEventListener('focus', handleFocus)

    const callback = () => loadProfiles()
    listeners.add(callback)

    return () => {
      window.removeEventListener('focus', handleFocus)
      listeners.delete(callback)
    }
  }, [loadProfiles])
  const refresh = () => loadProfiles()
  const defaultProfile = profiles.find(p => p.isDefault) || profiles[0] || null

  return {
    profiles,
    defaultProfile,
    appDataPath,
    loading,
    refresh,
    version,
  }
}