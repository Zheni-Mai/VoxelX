// src/main/launcher/java.ts
import { javaManager } from './javaManager.js'

export async function findJava(mcVersion: string = '1.20.1'): Promise<string> {
  const java = await javaManager.findBestJavaForVersion(mcVersion)
  return java.path
}

export async function ensureRequiredJava(mcVersion: string, progress?: (p: number, msg: string) => void) {
  const ver = parseFloat(mcVersion.split('.')[1] || '0')
  const needed = ver >= 20.5 ? 21 : ver >= 17 ? 17 : 8
  if (needed >= 17) {
    return await javaManager.ensureJava(needed === 21 ? 21 : 17, progress)
  }
  return 'javaw.exe'
}