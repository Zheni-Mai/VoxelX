//launhcer/authlib.ts
import path from 'path'
import { fileExists } from './utils.js'

export async function ensureAuthlib(
  gameDir: string,
  downloadFile: (url: string, dest: string, name: string, signal: AbortSignal) => Promise<void>,
  signal: AbortSignal,
  log: (msg: string) => void
): Promise<string> {
  const p = path.join(gameDir, 'voxelx-authlib.jar')
  if (await fileExists(p)) return p

  log('Tải authlib-injector...')
  const url = 'https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.6/authlib-injector-1.2.6.jar'
  await downloadFile(url, p, 'authlib-injector', signal)
  return p
}