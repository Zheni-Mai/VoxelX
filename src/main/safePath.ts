// src/main/safePath.ts
import path from 'path'

let appDataRoot: string | null = null

export async function getSafeRoot(): Promise<string> {
  if (!appDataRoot) {
    const { getAppDataPath } = await import('./utils')
    appDataRoot = await getAppDataPath()
  }
  return appDataRoot
}

export async function resolveSafePath(inputPath: string): Promise<string | null> {
  if (typeof inputPath !== 'string' || inputPath.trim() === '') return null

  const root = await getSafeRoot()
  const resolvedRoot = path.resolve(root)
  let normalized: string
  if (path.isAbsolute(inputPath)) {
    const resolvedInput = path.resolve(inputPath)
    if (!resolvedInput.startsWith(resolvedRoot + path.sep)) {
      return null 
    }
    normalized = path.relative(resolvedRoot, resolvedInput) 
  } else {
    normalized = inputPath
      .replace(/\\/g, '/')
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .trim()
    if (normalized.includes('..') || normalized.includes(':') || /[\x00-\x1f]/.test(normalized)) {
      return null
    }
  }

  const fullPath = normalized === '' ? resolvedRoot : path.join(resolvedRoot, normalized)
  const finalResolved = path.resolve(fullPath)
  if (!finalResolved.startsWith(resolvedRoot + path.sep)) {
    return null
  }

  return finalResolved
}