// src/main/launcher/customSkinLoader.ts
import path from 'path'
import fs from 'fs/promises'
import { Profile } from '../../main/types/profile.js'
import { fileExists } from './utils.js'  

export async function injectCustomSkinLoader(
  profile: Profile,
  gameDir: string,  
  appDataPath: string,
  downloadFile: (url: string, dest: string, name: string, signal: AbortSignal) => Promise<void>,
  signal: AbortSignal,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
): Promise<string | null> {
  if (profile.loader !== 'fabric') {
    log('CustomSkinLoader chỉ hỗ trợ cho Fabric loader', 'warn')
    return null
  }

  const globalModDir = path.join(appDataPath, 'mod')
  await fs.mkdir(globalModDir, { recursive: true })

  const apiUrl = 'https://api.modrinth.com/v2/project/customskinloader/version' 

  let versions: any[]
  try {
    const res = await fetch(apiUrl, { signal })
    if (!res.ok) throw new Error(`Lỗi khi fetch API: ${res.status}`)
    versions = await res.json()
  } catch (err: any) {
    log(`Lỗi khi tải danh sách phiên bản CustomSkinLoader: ${err.message}`, 'error')
    return null
  }
  const matching = versions.filter(v => 
    v.loaders.includes('fabric') &&
    v.game_versions.includes(profile.version)
  ).sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime())

  if (!matching.length) {
    log(`Không tìm thấy phiên bản CustomSkinLoader tương thích cho Minecraft ${profile.version}`, 'warn')
    return null
  }

  const selected = matching[0]
  const jarUrl = selected.files.find((f: any) => f.primary)?.url || selected.files[0].url
  const jarFilename = selected.files[0].filename
  const jarPath = path.join(globalModDir, jarFilename)

  if (await fileExists(jarPath)) {
    log(`CustomSkinLoader (${selected.version_number}) đã tồn tại (global)`, 'info')
  } else {
    try {
      await downloadFile(jarUrl, jarPath, `CustomSkinLoader (${selected.version_number})`, signal)
      log(`Đã tải CustomSkinLoader (${selected.version_number}) thành công (global)`, 'success')
    } catch (err: any) {
      log(`Lỗi khi tải CustomSkinLoader: ${err.message}`, 'error')
      return null
    }
  }

  return jarPath
}