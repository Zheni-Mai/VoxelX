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

  if (!lib.name) return []

  const mavenPath = mavenNameToPath(lib.name)
  const bases = [
    'https://libraries.minecraft.net',
    'https://maven.aliyun.com/repository/public',
    'https://repo1.maven.org/maven2',
    'https://maven.fabricmc.net',
    'https://maven.quiltmc.org/repository/release',
    'https://maven.neoforged.net/releases',
    'https://bmclapi2.bangbang93.com/maven',
  ]

  return bases.map(base => `${base.replace(/\/+$/, '')}/${mavenPath}`)
}

export async function downloadLibraries(
  v: any,
  gameDir: string,
  signal: AbortSignal,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void,
  onProgress: (percent: number, msg: string) => void
) {
  const libsDir = path.join(gameDir, 'libraries')
  await fs.mkdir(libsDir, { recursive: true })

  const tasks: any[] = []

  for (const lib of v.libraries) {
    if (!isAllowed(lib)) continue

    const urls = resolveLibraryUrls(lib)
    if (urls.length === 0) continue

    const artifactPath =
      lib.downloads?.artifact?.path ||
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
    log('Tất cả thư viện đã sẵn sàng', 'success')
    return
  }

  log(`Đang tải ${tasks.length} thư viện...`)
  const downloader = new SafeParallelDownloader(16, signal, onProgress, log)
  await downloader.download(tasks)
  log('Hoàn tất tải thư viện', 'success')
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

async function findLoaderJar(gameDir: string): Promise<string | null> {
  const libsDir = path.join(gameDir, 'libraries')

  const candidates = [
    'org/quiltmc/quilt-loader',
    'net/fabricmc/fabric-loader'
  ]

  try {
    const items = await fs.readdir(libsDir, { withFileTypes: true })
    for (const item of items) {
      if (!item.isDirectory()) continue
      const orgPath = path.join(libsDir, item.name)
      const subItems = await fs.readdir(orgPath, { withFileTypes: true })
      for (const sub of subItems) {
        if (!sub.isDirectory() || !candidates.some(c => item.name + '/' + sub.name === c)) continue
        const artifactPath = path.join(orgPath, sub.name)
        const versions = await fs.readdir(artifactPath, { withFileTypes: true })
        for (const ver of versions) {
          if (!ver.isDirectory()) continue
          const jarName = `${sub.name}-${ver.name}.jar`
          const jarPath = path.join(artifactPath, ver.name, jarName)
          if (await fileExists(jarPath)) {
            return jarPath
          }
        }
      }
    }
  } catch {
  }

  return null
}


export async function buildClasspath(v: any, gameDir: string, clientJar: string, profile?: any): Promise<string> {
  const entries: string[] = []
  if (v.id?.includes('fabric-loader') || v.id?.includes('quilt-loader') || v.id?.includes('forge') || v.id?.includes('neoforge') || v.id?.includes('liteloader') || v.id?.includes('optifine')) {
    const loaderJar = await findLoaderJar(gameDir)
    if (loaderJar) entries.push(loaderJar)
  }
  if (v.libraries) {
    for (const lib of v.libraries) {
      if (!isAllowed(lib)) continue

      let libPath: string | null = null
      if (lib.downloads?.artifact?.path) {
        libPath = path.join(gameDir, 'libraries', lib.downloads.artifact.path)
      } else if (lib.name) {
        const mavenPath = mavenNameToPath(lib.name)
        libPath = path.join(gameDir, 'libraries', mavenPath)
      }

      if (libPath && await fileExists(libPath)) {
        entries.push(libPath)
      }
    }
  }
  if (await fileExists(clientJar)) {
    entries.push(clientJar)
  }

  return entries.join(process.platform === 'win32' ? ';' : ':')
}