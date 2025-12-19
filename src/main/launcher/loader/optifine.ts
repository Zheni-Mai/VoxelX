// src/main/launcher/loader/optifine.ts
import fs from 'fs/promises'
import path from 'path'
import { fileExists } from '../utils.js'
import { ensureVanillaVersion } from './vanilla.js'
import { spawn } from 'child_process'

const BMCLAPI_OPTIFINE_LIST = 'https://bmclapi2.bangbang93.com/optifine'
const BMCLAPI_OPTIFINE_DOWNLOAD = 'https://bmclapi2.bangbang93.com/optifine'

interface OptiFineVersion {
  type: string
  patch: string
}

async function fetchOptiFineVersions(mcVersion: string): Promise<OptiFineVersion[]> {
  const res = await fetch(`${BMCLAPI_OPTIFINE_LIST}/${mcVersion}`)
  if (!res.ok) throw new Error(`Không tải được danh sách OptiFine cho ${mcVersion}`)
  const versions: OptiFineVersion[] = await res.json()
  if (versions.length === 0) throw new Error(`Không có OptiFine cho ${mcVersion}`)
  return versions
}

export async function getLatestOptiFineVersion(mcVersion: string): Promise<string> {
  const versions = await fetchOptiFineVersions(mcVersion)

  const stable = versions.filter(v => !v.type.includes('_pre') && !v.type.includes('_J'))
  const selected = stable.length > 0
    ? stable.reduce((a, b) => (a.patch > b.patch ? a : b))
    : versions.reduce((a, b) => (a.patch > b.patch ? a : b))

  return `${selected.type}_${selected.patch}`
}

export async function installOptiFine(
  mcVersion: string,
  optiVersion: string | 'latest' = 'latest',
  gameDir: string,
  javaPath: string,
  signal: AbortSignal,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void = console.log,
  downloadFile: (url: string, dest: string, name: string, signal: AbortSignal) => Promise<void>
): Promise<string> {
  let type: string
  let patch: string
  let displayVer: string
  let isPreview: boolean = false

  if (optiVersion === 'latest') {
    const versions = await fetchOptiFineVersions(mcVersion)
    const stable = versions.filter(v => !v.type.includes('_pre') && !v.type.includes('_J'))
    const selected = stable.length > 0
      ? stable.reduce((a, b) => (a.patch > b.patch ? a : b))
      : versions.reduce((a, b) => (a.patch > b.patch ? a : b))

    type = selected.type
    patch = selected.patch
    displayVer = `${type}_${patch}`
    isPreview = type.includes('_pre') || type.includes('_J')
  } else {
    displayVer = optiVersion
    const lastUnderscore = optiVersion.lastIndexOf('_')
    if (lastUnderscore === -1) throw new Error('Định dạng phiên bản OptiFine không hợp lệ')
    type = optiVersion.substring(0, lastUnderscore)
    patch = optiVersion.substring(lastUnderscore + 1)
    isPreview = type.includes('_pre') || type.includes('_J')
  }

  const installerUrl = `${BMCLAPI_OPTIFINE_DOWNLOAD}/${mcVersion}/${type}/${patch}`
  const installerName = isPreview
    ? `preview_OptiFine_${mcVersion}_${type}_${patch}.jar`
    : `OptiFine_${mcVersion}_${type}_${patch}.jar`

  const installerDir = path.join(gameDir, 'installers', 'optifine')
  await fs.mkdir(installerDir, { recursive: true })
  const installerPath = path.join(installerDir, installerName)

  if (!(await fileExists(installerPath))) {
    log(`[OptiFine] Đang tải ${installerName}...`)
    await downloadFile(installerUrl, installerPath, installerName, signal)
    log('[OptiFine] Tải thành công')
  } else {
  }

  await ensureVanillaVersion(mcVersion, gameDir, signal, log, downloadFile)
  const optiFineVersionId = `${mcVersion}-OptiFine_${type}_${patch}`
  const optiFineJsonPath = path.join(gameDir, 'versions', optiFineVersionId, `${optiFineVersionId}.json`)
  if (await fileExists(optiFineJsonPath)) {
    log(`[OptiFine] Đã cài sẵn: ${optiFineVersionId}`)
    return optiFineVersionId
  }

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(javaPath, ['-jar', installerPath, '--installClient', gameDir], {
      cwd: gameDir,
      stdio: 'pipe'
    })

    let output = ''
    proc.stdout?.on('data', d => { output += d.toString(); process.stdout.write(d) })
    proc.stderr?.on('data', d => { output += d.toString(); process.stderr.write(d) })

    proc.on('close', code => {
      console.log('[Forge Installer Full Output]:\n' + output)

      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Installer thất bại (exit code ${code})`))
      }
    })

    proc.on('error', reject)
  })


  return optiFineVersionId
}