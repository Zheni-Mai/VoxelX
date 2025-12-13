// src/main/launcher/assets.ts
import fs from 'fs/promises'
import path from 'path'
import { fileExists } from './utils.js'
import { SafeParallelDownloader } from './downloader.js'

const MIRRORS = [
  'https://resources.download.minecraft.net',
  'https://mc-resources.fastmirror.org',           
  'https://launcher.mojang.com',
  'https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@assets'
]

function getAssetUrls(hash: string): string[] {
  const prefix = hash.slice(0, 2)
  return MIRRORS.map(m => m.includes('jsdelivr')
    ? `${m}/${prefix}/${hash}`
    : `${m}/${prefix}/${hash}`
  )
}

export async function downloadAssets(
  index: any,
  gameDir: string,
  signal: AbortSignal,
  log: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void,
  onProgress: (percent: number, msg: string) => void
) {
  const assetsDir = path.join(gameDir, 'assets')
  const indexPath = path.join(assetsDir, 'indexes', `${index.id}.json`)

  if (!await fileExists(indexPath)) {
    await fs.mkdir(path.dirname(indexPath), { recursive: true })
    log('Tải Assets Index...')
    const res = await fetch(index.url, { signal })
    if (!res.ok) throw new Error('Không tải được asset index')
    await fs.writeFile(indexPath, await res.text())
  }

  const idx = JSON.parse(await fs.readFile(indexPath, 'utf-8'))
  const tasks: any[] = []

  for (const [key, obj] of Object.entries(idx.objects as Record<string, any>)) {
    const hash = obj.hash
    const file = path.join(assetsDir, 'objects', hash.slice(0, 2), hash)
    if (await fileExists(file)) continue

    tasks.push({
      urls: getAssetUrls(hash),
      dest: file,
      name: key.split('/').pop() || hash.slice(0, 8),
      size: obj.size,
      hash: obj.hash,
      hashType: 'sha1'
    })
  }

  if (tasks.length === 0) {
    log('Tất cả assets đã sẵn sàng!', 'success')
    return
  }

  log(`Tải ${tasks.length}file assets`)

  const downloader = new SafeParallelDownloader(24, signal, onProgress, log)
  await downloader.download(tasks)

  log('Hoàn tất tải assets – 100% đầy đủ!', 'success')
}