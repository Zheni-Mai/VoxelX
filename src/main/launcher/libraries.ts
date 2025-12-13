// src/main/launcher/libraries.ts
import path from 'path'
import fs from 'fs/promises'
import { createReadStream, createWriteStream } from 'fs'
import unzipper from 'unzipper'
import { fileExists, mavenNameToPath, isAllowed, nativeId } from './utils.js'
import { SafeParallelDownloader } from './downloader.js'

function resolveLibraryUrls(lib: any): string[] {
  const primary = lib.downloads?.artifact?.url || lib.downloads?.classifiers?.[nativeId()]?.url
  if (primary) return [primary]

  if (lib.name) {
    const mavenPath = mavenNameToPath(lib.name)
    const bases = [
      'https://libraries.minecraft.net',
      'https://maven.aliyun.com/repository/public',
      'https://repo1.maven.org/maven2',
      'https://maven.fabricmc.net'
    ]
    return bases.map(b => `${b.replace(/\/+$/, '')}/${mavenPath}`)
  }
  return []
}

export async function downloadLibraries(
  v: any,
  gameDir: string,
  signal: AbortSignal,
  log: (msg: string, level?: 'info' | 'warn' | 'error') => void,
  onProgress: (percent: number, msg: string) => void
) {
  const libsDir = path.join(gameDir, 'libraries')
  await fs.mkdir(libsDir, { recursive: true })

  const tasks: any[] = []

  for (const lib of v.libraries) {
    if (!isAllowed(lib)) continue

    const urls = resolveLibraryUrls(lib)
    if (urls.length === 0) continue

    const artifactPath = lib.downloads?.artifact?.path ||
                        lib.downloads?.classifiers?.[nativeId()]?.path ||
                        mavenNameToPath(lib.name)

    const libPath = path.join(libsDir, artifactPath)
    if (await fileExists(libPath)) continue

    tasks.push({
      urls,
      dest: libPath,
      name: lib.name?.split(':').pop() || path.basename(libPath),
      size: lib.downloads?.artifact?.size || lib.downloads?.classifiers?.[nativeId()]?.size,
      hash: lib.downloads?.artifact?.sha1 || lib.downloads?.classifiers?.[nativeId()]?.sha1,
      hashType: 'sha1'
    })
  }

  if (tasks.length === 0) {
    return
  }

  log(`Tải ${tasks.length} thư viện`)

  const downloader = new SafeParallelDownloader(16, signal, onProgress)
  await downloader.download(tasks)

}

export async function extractNatives(
  v: any,
  gameDir: string,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
) {
  const nativesDir = path.join(gameDir, 'natives')
  await fs.rm(nativesDir, { recursive: true, force: true })
  await fs.mkdir(nativesDir, { recursive: true })

  const native = nativeId()
  let extractedCount = 0

  for (const lib of v.libraries) {
    if (!isAllowed(lib)) continue
    if (!lib.downloads?.classifiers?.[native]) continue

    const classifier = lib.downloads.classifiers[native]
    const jarPath = path.join(gameDir, 'libraries', classifier.path)

    if (!await fileExists(jarPath)) {
      log(`Thiếu native jar: ${classifier.path}`, 'warn')
      continue
    }

    log(`Giải nén natives từ ${path.basename(jarPath)}...`)

    try {
      await new Promise<void>((resolve, reject) => {
        createReadStream(jarPath)
          .pipe(unzipper.Parse())
          .on('entry', async (entry: any) => {
            const entryPath: string = entry.path
            if (entry.type !== 'File' || entryPath.includes('META-INF')) {
              entry.autodrain()
              return
            }

            const outPath = path.join(nativesDir, entryPath)
            try {
              await fs.mkdir(path.dirname(outPath), { recursive: true })
              entry.pipe(createWriteStream(outPath)).on('finish', () => entry.autodrain())
            } catch (err) {
              entry.autodrain()
              reject(err)
            }
          })
          .on('close', () => {
            extractedCount++
            resolve()
          })
          .on('error', reject)
      })
    } catch (err: any) {
      log(`Lỗi giải nén ${path.basename(jarPath)}: ${err.message}`, 'error')
    }
  }

  log(`Đã giải nén ${extractedCount} native libraries`, 'success')
}

export async function buildClasspath(v: any, gameDir: string, clientJar: string): Promise<string> {
  const libsDir = path.join(gameDir, 'libraries')
  const entries: string[] = []

  for (const lib of v.libraries) {
    if (!isAllowed(lib)) continue

    let libPath: string | null = null

    if (lib.downloads?.artifact?.path) {
      libPath = path.join(libsDir, lib.downloads.artifact.path)
    } else if (lib.name) {
      try {
        const mavenPath = mavenNameToPath(lib.name)
        const candidatePath = path.join(libsDir, mavenPath)
        if (await fileExists(candidatePath)) {
          libPath = candidatePath
        }
      } catch {}
    }

    if (libPath && await fileExists(libPath)) {
      entries.push(libPath)
    }
  }

  entries.push(clientJar)
  return entries.join(process.platform === 'win32' ? ';' : ':')
}