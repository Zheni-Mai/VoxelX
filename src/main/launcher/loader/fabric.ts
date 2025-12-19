// src/main/launcher/fabric.ts
import fs from 'fs/promises'
import path from 'path'
import { fileExists } from '../utils.js'
import { installVanillaVersion } from './vanilla.js'

export async function installFabric(
  mcVersion: string,
  loaderVersion: string,
  gameDir: string,
  signal: AbortSignal
): Promise<string> {
  let url = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion || 'latest'}/profile/json`

  if (!loaderVersion || loaderVersion === 'latest') {
    const loaders = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`, { signal }).then(r => r.json())
    if (!loaders?.length) throw new Error(`Không có Fabric loader cho ${mcVersion}`)
    const latest = loaders[0].loader.version
    url = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${latest}/profile/json`
  }

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Không thể tải Fabric profile: ${res.statusText}`)
  const profile = await res.json()

  const id = profile.id
  const jsonPath = path.join(gameDir, 'versions', id, `${id}.json`)
  await fs.mkdir(path.dirname(jsonPath), { recursive: true })
  await fs.writeFile(jsonPath, JSON.stringify(profile, null, 2))

  return id
}

export async function resolveFullVersion(
  id: string,
  gameDir: string,
  signal: AbortSignal,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void,
  ensureVanillaVersion: (
    id: string,
    gameDir: string,
    signal: AbortSignal,
    log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void,
    downloadFile: (url: string, dest: string, name: string, signal: AbortSignal) => Promise<void>
  ) => Promise<any>,
  mergeVersionJson: (parent: any, child: any) => any,
  downloadFile: (url: string, dest: string, name: string, signal: AbortSignal) => Promise<void>
): Promise<any> {
  const versionDir = path.join(gameDir, 'versions', id)
  const jsonPath = path.join(versionDir, `${id}.json`)

  if (!await fileExists(jsonPath)) {
    if (id.includes('fabric-loader') || id.includes('-fabric-')) {
      const mcVersion = id.split('-').pop()!
      await installFabric(mcVersion, '', gameDir, signal)
    } else {
      await installVanillaVersion(id, gameDir, signal, log, downloadFile)
    }
  }

  let version: any = JSON.parse(await fs.readFile(jsonPath, 'utf-8'))

  if (version.inheritsFrom) {
    const parent = await ensureVanillaVersion(version.inheritsFrom, gameDir, signal, log, downloadFile)
    version = mergeVersionJson(parent, version)
  }

  if (!version.downloads?.client || !version.assetIndex) {
    const vanillaId = version.inheritsFrom || id
    const vanilla = await ensureVanillaVersion(vanillaId, gameDir, signal, log, downloadFile)
    version.downloads = version.downloads || {}
    version.downloads.client = vanilla.downloads.client
    version.assetIndex = vanilla.assetIndex
  }

  return version
}