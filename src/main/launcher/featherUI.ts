// src/main/launcher/featherUI.ts
import path from 'path'
import fs from 'fs/promises'
import { Profile } from '../../main/types/profile.js'
import { fileExists } from './utils.js'

export async function injectFeatherUI(
  profile: Profile,
  gameDir: string,          
  appDataPath: string,    
  downloadFile: (url: string, dest: string, name: string, signal: AbortSignal) => Promise<void>,
  signal: AbortSignal,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
): Promise<string | null> {
  if (profile.loader !== 'fabric') {
    log('Feather UI chỉ hỗ trợ cho Fabric loader', 'warn')
    return null
  }

  if (!profile.enableFeatherUI) {
    log('Feather UI đã bị tắt trong cài đặt profile', 'info')
    return null
  }

  const globalModDir = path.join(appDataPath, 'mod')
  await fs.mkdir(globalModDir, { recursive: true })

  const indexUrl = 'https://feather-loader.feathermc.com/index.json'

  let indexData: any
  try {
    const res = await fetch(indexUrl, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    indexData = await res.json()
  } catch (err: any) {
    log(`Lỗi khi tải index Feather UI: ${err.message}`, 'error')
    return null
  }

  const chainLoader = indexData.chainLoader
  if (!chainLoader || !chainLoader.version || !chainLoader.url) {
    log('Không tìm thấy thông tin chainLoader trong index.json', 'warn')
    return null
  }

  const version = chainLoader.version
  const jarFilename = `feather-standalone-${version}.jar`
  const jarUrl = chainLoader.url
  const jarPath = path.join(globalModDir, jarFilename)

  if (await fileExists(jarPath)) {
    log(`Feather UI (${version}) đã tồn tại (global)`, 'info')
  } else {
    try {
      await downloadFile(jarUrl, jarPath, `Feather UI (${version})`, signal)
      log(`Đã tải Feather UI (${version}) thành công (global)`, 'success')
    } catch (err: any) {
      log(`Lỗi khi tải Feather UI: ${err.message}`, 'error')
      return null
    }
  }

  return jarPath
}