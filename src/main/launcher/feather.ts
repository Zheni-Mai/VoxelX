// src/main/launcher/feather.ts
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fileExists } from './utils.js'

const FEATHER_INDEX_URL = 'https://feather-loader.feathermc.com/index.json'
const FEATHER_DIR_NAME = 'feather-loader'
const LIBS_DIR = 'libs'

interface LoaderIndex {
  libraries: Array<{
    name: string
    url: string
    sha1: string
    classpath?: boolean
  }>
  fabricLoader: Array<{
    name: string
    url: string
    sha1: string
    minimumVersion: string
  }>
  chainLoader?: {
    version: string
    url: string
    openUrl: string
  }
}

export async function installFeatherUI(
  gameDir: string,
  fabricVersion: string,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void = console.log,
  progress?: (percent: number, msg: string) => void
) {
  const featherDir = path.join(gameDir, FEATHER_DIR_NAME)
  const libsDir = path.join(featherDir, LIBS_DIR)

  try {
    log('Đang tải Feather Client UI...', 'info')

    // Tải index.json
    const indexRes = await fetch(FEATHER_INDEX_URL)
    if (!indexRes.ok) throw new Error('Không thể tải index.json từ Feather')
    const index: LoaderIndex = await indexRes.json()

    await fs.mkdir(libsDir, { recursive: true })

    let downloadedCount = 0
    const totalFiles = index.libraries.length + index.fabricLoader.length
    const updateProgress = () => {
      if (progress) {
        const percent = Math.round(downloadedCount / totalFiles) * 15 + 80 // 80-95%
        progress(percent, `Tải Feather UI... (${downloadedCount}/${totalFiles})`)
      }
    }
    const downloadWithHash = async (url: string, dest: string, expectedSha1: string, name: string) => {
      const exists = await fileExists(dest)
      if (exists) {
        const data = await fs.readFile(dest)
        const hash = crypto.createHash('sha1').update(data).digest('hex')
        if (hash === expectedSha1.toLowerCase()) {
          log(`Đã có sẵn: ${name}`)
          downloadedCount++
          updateProgress()
          return
        }
      }

      log(`Tải: ${name}`)
      const res = await fetch(url)
      if (!res.ok || !res.body) throw new Error(`Tải thất bại: ${name}`)

      const buffer = Buffer.from(await res.arrayBuffer())
      const actualHash = crypto.createHash('sha1').update(buffer).digest('hex')
      if (actualHash !== expectedSha1.toLowerCase()) {
        throw new Error(`SHA1 không khớp: ${name} (từ ${url})`)
      }

      await fs.writeFile(dest, buffer)
      log(`Hoàn tất: ${name}`, 'success')
      downloadedCount++
      updateProgress()
    }
    for (const lib of index.libraries) {
      if (!lib.classpath && lib.classpath !== undefined) continue 
      const fileName = lib.name
      const dest = path.join(libsDir, fileName)
      await downloadWithHash(lib.url, dest, lib.sha1, `Library ${fileName}`)
    }
    const suitableLoader = index.fabricLoader
      .sort((a, b) => compareVersion(b.minimumVersion, a.minimumVersion))
      .find(loader => !isVersionSmaller(fabricVersion, loader.minimumVersion))

    if (!suitableLoader) {
      throw new Error(`Không tìm thấy Fabric Loader tương thích với phiên bản ${fabricVersion}`)
    }

    const loaderDest = path.join(libsDir, suitableLoader.name)
    await downloadWithHash(suitableLoader.url, loaderDest, suitableLoader.sha1, `Fabric Loader (${suitableLoader.name})`)

    log('Feather Client UI đã được cài đặt thành công!', 'success')
    if (progress) progress(95, 'Feather UI sẵn sàng')
    const extraClasspath = [
      ...index.libraries
        .filter(lib => lib.classpath !== false)
        .map(lib => path.join(libsDir, lib.name)),
      loaderDest
    ]

    return extraClasspath

  } catch (err: any) {
    log(`Lỗi khi cài Feather UI: ${err.message}`, 'error')
    throw err
  }
}

export async function getFeatherChainLoaderClasspath(
  gameDir: string,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void = console.log
): Promise<string | null> {
  const featherDir = path.join(gameDir, FEATHER_DIR_NAME)
  const chainFile = path.join(featherDir, 'feather-standalone-0.2.4.jar')

  try {
    const DIRECT_URL = 'https://feather-loader.feathermc.com/libraries/feather-standalone-0.2.4.jar'

    if (await fileExists(chainFile)) {
      const stats = await fs.stat(chainFile)
      if (stats.size > 2_500_000) {
        log(`Đã có sẵn Feather Chain Loader (${(stats.size/1024/1024).toFixed(2)} MB)`, 'info')
        return chainFile
      }
      await fs.unlink(chainFile).catch(() => {})
    }

    log('Đang tải Feather Chain Loader từ server chính thức...', 'info')

    const res = await fetch(DIRECT_URL, {
      headers: {
        'User-Agent': 'Feather Loader/0.2',
        'Accept': '*/*'
      }
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${res.statusText}`)
    }

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text') || contentType.includes('html')) {
      const text = await res.text()
      log(`Server trả về HTML thay vì JAR:\n${text.slice(0, 300)}`, 'error')
      throw new Error('Server trả HTML – dùng VPN thử lại hoặc tải thủ công')
    }

    if (!res.body) {
      throw new Error('Response body là null')
    }

    await fs.mkdir(featherDir, { recursive: true })
    const fileHandle = await fs.open(chainFile, 'w')
    const writer = fileHandle.createWriteStream()

    let received = 0
    const total = Number(res.headers.get('content-length')) || 0

    for await (const chunk of res.body) {
      received += chunk.length
      writer.write(chunk)
      if (total > 0 && received % 800_000 === 0) {
        const percent = Math.round((received / total) * 100)
        log(`Tải Feather Chain Loader: ${percent}%`, 'info')
      }
    }

    await writer.close()
    await fileHandle.close()

    const stats = await fs.stat(chainFile)
    if (stats.size < 2_500_000) {
      await fs.unlink(chainFile).catch(() => {})
      throw new Error(`File tải về quá nhỏ: ${stats.size} bytes`)
    }

    const header = Buffer.from(await fs.readFile(chainFile).then(b => b.slice(0, 4))).toString('hex')
    if (header !== '504b0304') {
      await fs.unlink(chainFile).catch(() => {})
      throw new Error('File không phải JAR hợp lệ')
    }

    log(`Feather Chain Loader tải thành công! (${(stats.size/1024/1024).toFixed(2)} MB)`, 'success')
    return chainFile

  } catch (err: any) {
    log(`Lỗi tải Feather Chain Loader: ${err.message}`, 'error')
    await fs.unlink(chainFile).catch(() => {})
    return null
  }
}
function isVersionSmaller(v1: string, v2: string): boolean {
  const a = v1.split('.').map(Number)
  const b = v2.split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const n1 = a[i] || 0
    const n2 = b[i] || 0
    if (n1 < n2) return true
    if (n1 > n2) return false
  }
  return false
}

function compareVersion(v1: string, v2: string): number {
  if (isVersionSmaller(v1, v2)) return -1
  if (isVersionSmaller(v2, v1)) return 1
  return 0
}