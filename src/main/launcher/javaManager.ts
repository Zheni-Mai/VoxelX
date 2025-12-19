// src/main/launcher/javaManager.ts
import path from 'path'
import fs from 'fs/promises'
import { getAppDataPath } from '../utils.js'
import { fileExists } from './utils.js'
import { net } from 'electron'

const AZUL_ZULU_DOWNLOADS = {
  8: 'https://cdn.azul.com/zulu/bin/zulu8.88.0.19-ca-jdk8.0.462-win_x64.zip',
  11: 'https://cdn.azul.com/zulu/bin/zulu11.84.17-ca-jdk11.0.29-win_x64.zip',
  17: 'https://cdn.azul.com/zulu/bin/zulu17.62.17-ca-jdk17.0.17-win_x64.zip',
  21: 'https://cdn.azul.com/zulu/bin/zulu21.46.19-ca-jdk21.0.9-win_x64.zip',
} as const;

export interface JavaInfo {
  path: string
  version: number
  source: 'bundled' | 'system' | 'custom'
}

export class JavaManager {
  private appDataPathPromise?: Promise<string>

  constructor() {
  }

  private getAppData(): Promise<string> {
    return (this.appDataPathPromise ??= getAppDataPath())
  }

  async getJavaHome(version: number): Promise<string> {
    const appData = await this.getAppData()
    return path.join(appData, 'java', version === 17 ? 'jdk-17' : 'jdk-21')
  }

  async findBestJavaForVersion(mcVersion: string): Promise<JavaInfo> {
    const ver = parseFloat(mcVersion.split('.')[1] || '0')
    const required = ver >= 20.5 ? 21 : ver >= 17 ? 17 : 8
    const bundled = await this.findBundledJava(required === 21 ? 21 : 17)
    if (bundled) return bundled
    if (required === 21) {
      const fallback = await this.findBundledJava(17)
      if (fallback) return fallback
    }
    throw new Error(`Không tìm thấy Java bundled ${required}. Launcher sẽ tự động tải.`)
  }

  async findBundledJava(targetVersion: 8 | 11 | 17 | 21): Promise<JavaInfo | null> {
    const appData = await this.getAppData()
    const home = path.join(appData, 'runtime', `jdk-${targetVersion}`)
    const exe = path.join(home, 'bin', 'javaw.exe')
    if (await fileExists(exe)) {
      return { path: exe, version: targetVersion, source: 'bundled' }
    }
    return null
  }


async ensureJava(version: 8 | 11 | 17 | 21, progress?: (p: number, msg: string) => void): Promise<string> {
  const bundled = await this.findBundledJava(version)
  if (bundled) {
    progress?.(100, `Java ${version} đã sẵn sàng`)
    return bundled.path
  }

  progress?.(0, `Đang tải Java ${version} (Azul Zulu)...`)

  const appData = await this.getAppData()
  const javaDir = path.join(appData, 'runtime')
  await fs.mkdir(javaDir, { recursive: true })

  const url = AZUL_ZULU_DOWNLOADS[version]
  const zipName = `zulu-jdk-${version}-win_x64.zip`
  const zipPath = path.join(javaDir, zipName)
  const request = net.request({ url, method: 'GET', headers: { 'User-Agent': 'VoxelX Launcher/1.0' } })

  await new Promise<void>((resolve, reject) => {
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Tải Java thất bại: HTTP ${response.statusCode}`))
      }

      const total = Number(response.headers['content-length']?.[0]) || 180_000_000
      let received = 0

      fs.open(zipPath, 'w').then(file => {
        const writer = file.createWriteStream()

        response.on('data', (chunk: Buffer) => {
          received += chunk.length
          writer.write(chunk)
          progress?.(
            Math.min(90, Math.round((received / total) * 90)),
            `Tải Java ${version}... (${(received / 1024 / 1024).toFixed(1)} MB)`
          )
        })

        response.on('end', async () => {
          await writer.close()
          await file.close()
          resolve()
        })

        response.on('error', async (err) => {
          try { await writer.close() } catch {}
          try { await file.close() } catch {}
          reject(err)
        })
      }).catch(reject)
    })

    request.on('error', reject)
    request.end()
  })

  progress?.(92, 'Đang giải nén Java...')
  const { exec } = await import('child_process')
  await new Promise<void>((resolve, reject) => {
    exec(
      `powershell -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${javaDir.replace(/'/g, "''")}' -Force"`,
      (err) => err ? reject(err) : resolve()
    )
  })
  const items = await fs.readdir(javaDir)
  let extractedRoot = ''

  for (const item of items) {
    const fullPath = path.join(javaDir, item)
    const stat = await fs.stat(fullPath).catch(() => null)
    if (!stat?.isDirectory()) continue

    const lower = item.toLowerCase()
    if (lower.includes('zulu') || lower.includes('jdk')) {
      if (await fileExists(path.join(fullPath, 'bin', 'javaw.exe'))) {
        extractedRoot = fullPath
        break
      }

      const subItems = await fs.readdir(fullPath).catch(() => [])
      for (const s of subItems) {
        const subPath = path.join(fullPath, s)
        if ((await fs.stat(subPath).catch(() => null))?.isDirectory() &&
            (s.toLowerCase().includes('zulu') || s.toLowerCase().includes('jdk')) &&
            await fileExists(path.join(subPath, 'bin', 'javaw.exe'))) {
          extractedRoot = subPath
          break
        }
      }
      if (extractedRoot) break
    }
  }

  if (!extractedRoot || !(await fileExists(path.join(extractedRoot, 'bin', 'javaw.exe')))) {
    throw new Error(`Không tìm thấy javaw.exe sau khi giải nén Java ${version}`)
  }
  const finalTarget = path.join(javaDir, `jdk-${version}`)

  if (await fileExists(finalTarget)) {
    await fs.cp(extractedRoot, finalTarget, { recursive: true, force: true })
    await fs.rm(extractedRoot, { recursive: true, force: true })
    console.log(`[JavaManager] Đã cập nhật Java ${version} (ghi đè)`)
  } else {
    try {
      await fs.rename(extractedRoot, finalTarget)
    } catch (err) {
      await fs.cp(extractedRoot, finalTarget, { recursive: true })
      await fs.rm(extractedRoot, { recursive: true, force: true })
    }
    console.log(`[JavaManager] Đã cài đặt Java ${version} mới`)
  }
  await fs.rm(zipPath, { force: true })

  progress?.(100, `Java ${version} đã sẵn sàng!`)
  return path.join(finalTarget, 'bin', 'javaw.exe')
}

  async listAvailableJavas(): Promise<{ version: number; path: string; exists: boolean }[]> {
    const appData = await this.getAppData()
    const runtimeDir = path.join(appData, 'runtime')

    const versions: (8 | 11 | 17 | 21)[] = [8, 11, 17, 21]
    const result = []

    for (const ver of versions) {
      const folder = path.join(runtimeDir, `jdk-${ver}`)
      const exe = path.join(folder, 'bin', 'javaw.exe')
      result.push({
        version: ver,
        path: exe,
        exists: await fileExists(exe)
      })
    }

    return result
  }

  async setCustomJava(javaPath: string): Promise<JavaInfo> {
    if (!await fileExists(javaPath)) throw new Error('File Java không tồn tại')

    const appData = await this.getAppData()
    const customDir = path.join(appData, 'java', 'custom')
    await fs.mkdir(customDir, { recursive: true })

    const target = path.join(customDir, 'javaw.exe')
    await fs.copyFile(javaPath, target)

    return { path: target, version: 99, source: 'custom' }
  }

  async getCustomJava(): Promise<JavaInfo | null> {
    const appData = await this.getAppData()
    const exe = path.join(appData, 'java', 'custom', 'javaw.exe')
    if (await fileExists(exe)) {
      return { path: exe, version: 99, source: 'custom' }
    }
    return null
  }
}

export const javaManager = new JavaManager()