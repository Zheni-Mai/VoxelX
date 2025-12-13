// src/main/launcher/vanilla.ts
import fs from 'fs/promises'
import path from 'path'
import { fileExists } from './utils.js'

export async function installVanillaVersion(
  id: string,
  gameDir: string,
  signal: AbortSignal,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void,
  downloadFile: (url: string, dest: string, name: string, signal: AbortSignal) => Promise<void>
): Promise<any> {
  log(`Đang cài đặt vanilla ${id}...`)

  const manifest = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json', { signal })
    .then(r => r.json())

  const versionInfo = manifest.versions.find((v: any) => v.id === id)
  if (!versionInfo) throw new Error(`Không tìm thấy phiên bản vanilla: ${id}`)

  const versionData = await fetch(versionInfo.url, { signal }).then(r => r.json())

  const versionDir = path.join(gameDir, 'versions', id)
  const jsonPath = path.join(versionDir, `${id}.json`)
  const jarPath = path.join(versionDir, `${id}.jar`)

  await fs.mkdir(versionDir, { recursive: true })
  await fs.writeFile(jsonPath, JSON.stringify(versionData, null, 2))

  if (!await fileExists(jarPath)) {
    log(`Tải client jar cho ${id}...`)
    await downloadFile(versionData.downloads.client.url, jarPath, `Vanilla ${id} JAR`, signal)
  }

  log(`Vanilla ${id} đã được cài đặt`, 'success')
  return versionData
}

export async function ensureVanillaVersion(
  id: string,
  gameDir: string,
  signal: AbortSignal,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void,
  downloadFile: (url: string, dest: string, name: string, signal: AbortSignal) => Promise<void>
): Promise<any> {
  const versionDir = path.join(gameDir, 'versions', id)
  const jsonPath = path.join(versionDir, `${id}.json`)
  const jarPath = path.join(versionDir, `${id}.jar`)
  if (await fileExists(jsonPath) && await fileExists(jarPath)) {
    return JSON.parse(await fs.readFile(jsonPath, 'utf-8'))
  }
  log(`Thiếu vanilla ${id}, đang tự động cài đặt...`)
  return await installVanillaVersion(id, gameDir, signal, log, downloadFile)
}