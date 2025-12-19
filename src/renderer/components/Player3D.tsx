// src/renderer/components/Player3D.tsx

import { useRef, useEffect, useState } from 'react'
import { ReactSkinview3d } from 'react-skinview3d'
import type { SkinViewer } from 'skinview3d'
import { RunningAnimation, WalkingAnimation } from 'skinview3d'

interface Player3DProps {
  uuid: string
  username?: string
  width?: number
  height?: number
  scale?: number
  defaultSkin?: 'steve' | 'alex'
}

export default function Player3D({ 
  uuid, 
  username,
  width = 180,
  height = 380,
  scale = 1,
  defaultSkin = 'steve'
}: Player3DProps) {
  const viewerRef = useRef<SkinViewer | null>(null)
  const animationRef = useRef<RunningAnimation | WalkingAnimation | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const [skinUrl, setSkinUrl] = useState<string>('')
  const [capeUrl, setCapeUrl] = useState<string | null>(null)

  const finalWidth = width * scale
  const finalHeight = height * scale

  useEffect(() => {
    const loadTextures = async () => {
      if (!username) {
        setSkinUrl(`https://minotar.net/skin/${uuid}`)
        setCapeUrl(null)
        return
      }

      let loadedSkin: string | null = null
      let loadedCape: string | null = null

      try {
        const localSkin = await window.electronAPI.getLocalSkinBase64(username)
        if (localSkin) loadedSkin = localSkin

        const localCape = await window.electronAPI.getLocalCapeBase64(username)
        if (localCape) loadedCape = localCape

        if (loadedSkin || loadedCape) {
          setSkinUrl(loadedSkin || `https://minotar.net/skin/${username}`)
          setCapeUrl(loadedCape)
          return
        }
      } catch (err) {}

      try {
        const currentProfile = await window.electronAPI.profileAPI.getCurrentProfile()
        if (currentProfile?.gameDirectory) {
          const gameDir = currentProfile.gameDirectory

          const cslSkin = await window.electronAPI.getCustomSkinLoaderSkin({ gameDir, username })
          if (cslSkin) loadedSkin = cslSkin

          const cslCape = await window.electronAPI.getCustomSkinLoaderCape({ gameDir, username })
          if (cslCape) loadedCape = cslCape

          if (loadedSkin || loadedCape) {
            setSkinUrl(loadedSkin || `https://minotar.net/skin/${username}`)
            setCapeUrl(loadedCape)
            return
          }
        }
      } catch (err) {
        console.log('Không lấy được texture từ CustomSkinLoader')
      }

      if (uuid.length === 32 || uuid.length === 36) {
        try {
          const res = await fetch(`http://skinsystem.ely.by/textures/${username}`)
          if (res.ok) {
            const data = await res.json()
            if (data.SKIN?.url) loadedSkin = data.SKIN.url
            if (data.CAPE?.url) loadedCape = data.CAPE.url

            if (loadedSkin || loadedCape) {
              setSkinUrl(loadedSkin!)
              setCapeUrl(loadedCape)
              return
            }
          }
        } catch (err) {}
      }

      if (uuid.includes('-')) {
        try {
          const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid.replace(/-/g, '')}`)
          if (res.ok) {
            const data = await res.json()
            const prop = data.properties?.find((p: any) => p.name === 'textures')
            if (prop) {
              const textures = JSON.parse(atob(prop.value))
              setSkinUrl(textures.textures.SKIN.url)
              setCapeUrl(textures.textures.CAPE?.url || null)
              return
            }
          }
        } catch (err) {}
      }

      setSkinUrl(`https://minotar.net/skin/${username || uuid}`)
      setCapeUrl(null)
    }

    loadTextures()
  }, [username, uuid])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const anim = isHovered ? new RunningAnimation() : new WalkingAnimation()
    if (!isHovered) (anim as WalkingAnimation).headBobbing = true
    anim.speed = isHovered ? 0.70 : 0.6

    viewer.animation = anim
    animationRef.current = anim
    viewer.playerObject.skin.rotation.y = 0.35
  }, [isHovered])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    let isDragging = false
    let lastX = 0

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      isDragging = true
      lastX = e.clientX
      viewer.autoRotate = false
      if (animationRef.current) animationRef.current.paused = true
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const delta = (e.clientX - lastX) * 0.015
      lastX = e.clientX
      viewer.camera.rotation.y -= delta
    }

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false
        viewer.autoRotate = true
        if (animationRef.current) animationRef.current.paused = false
      }
    }

    const canvas = viewer.canvas
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mouseleave', onMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mouseleave', onMouseUp)
    }
  }, [])

  return (
    <div 
      className="select-none relative group"
      style={{ width: finalWidth, height: finalHeight }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ReactSkinview3d
        width={finalWidth}
        height={finalHeight}
        skinUrl={skinUrl}
        capeUrl={capeUrl || undefined}
        onReady={({ viewer }) => {
          viewerRef.current = viewer

          viewer.zoom = 0.85
          viewer.fov = 48
          viewer.autoRotate = true
          viewer.autoRotateSpeed = 0.2

          viewer.globalLight.intensity = 2.9
          viewer.cameraLight.intensity = 2.0

          viewer.background = null
          viewer.renderer.setPixelRatio(window.devicePixelRatio)
        }}
      />
    </div>
  )
}