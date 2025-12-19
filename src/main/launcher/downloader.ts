// src/main/launcher/downloader.ts
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

interface Task {
  urls: string[]           
  dest: string
  name: string
  size?: number
  hash?: string           
  hashType?: 'sha1' | 'sha256'
}

export class SafeParallelDownloader {
  private active = 0
  private queue: Task[] = []
  private completed = 0
  private total = 0
  private downloadedBytes = 0
  private totalBytes = 0

  constructor(
    private maxConcurrent = 20,
    private signal: AbortSignal,
    private onProgress: (percent: number, msg: string) => void,
    private onLog?: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
  ) {}

  async download(tasks: Task[]) {
    if (tasks.length === 0) return

    this.total = tasks.length
    this.queue = [...tasks]
    this.totalBytes = tasks.reduce((s, t) => s + (t.size || 0), 0)

    const workers = Array(this.maxConcurrent).fill(null).map(() => this.worker())
    await Promise.all(workers)
  }

  private async worker() {
    while (this.queue.length > 0 && !this.signal.aborted) {
      if (this.active >= this.maxConcurrent) {
        await new Promise(r => setTimeout(r, 10))
        continue
      }
      const task = this.queue.shift()!
      this.active++
      try {
        await this.downloadWithRetry(task)
        this.completed++
      } catch (err: any) {
        if (!this.signal.aborted) {
          this.onLog?.(`[LỖI] ${task.name}: ${err.message}`, 'error')
        }
      } finally {
        this.active--
      }
    }
  }

  private async downloadWithRetry(task: Task, attempt = 0): Promise<void> {
    const maxAttempts = 3
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.tryOneMirror(task)
        return
      } catch (err) {
        if (i === maxAttempts - 1) throw err
        this.onLog?.(`Thử lại ${task.name} (${i + 1}/${maxAttempts})`, 'warn')
        await new Promise(r => setTimeout(r, 1500 * (i + 1)))
      }
    }
  }

  private async tryOneMirror(task: Task): Promise<void> {
    for (const url of task.urls) {
      if (this.signal.aborted) throw new Error('Aborted')

      try {
        const res = await fetch(url, { signal: this.signal })
        if (!res.ok || !res.body) continue

        await fs.mkdir(path.dirname(task.dest), { recursive: true })
        const tempPath = task.dest + '.part'
        const file = await fs.open(tempPath, 'w')
        const writer = file.createWriteStream()
        const hasher = task.hash ? crypto.createHash(task.hashType || 'sha1') : null
        let received = 0

        for await (const chunk of res.body) {
          if (this.signal.aborted) throw new Error('Aborted')
          received += chunk.length
          this.downloadedBytes += chunk.length
          writer.write(chunk)
          hasher?.update(chunk)

          const percent = this.totalBytes > 0
            ? (this.downloadedBytes / this.totalBytes) * 100
            : ((this.completed + this.active) / this.total) * 100

          this.onProgress(percent, `Tải: ${task.name}`)
        }
        await writer.close()
        await file.close()
        if (task.hash && hasher) {
          const calculated = hasher.digest('hex').toLowerCase()
          if (calculated !== task.hash.toLowerCase()) {
            await fs.unlink(tempPath).catch(() => {})
            this.onLog?.(`Hash sai: ${task.name} (tính: ${calculated})`, 'warn')
            continue
          }
        }

        await fs.rename(tempPath, task.dest)
        return
      } catch {
        continue 
      }
    }
    throw new Error(`Tất cả mirror đều thất bại: ${task.name}`)
  }
}