//launcher/utils.ts
import fs from 'fs/promises'

export const fileExists = async (p: string): Promise<boolean> => {
  return fs.access(p).then(() => true).catch(() => false)
}

export const mavenNameToPath = (name: string): string => {
  const parts = name.split(':')
  if (parts.length < 3) throw new Error('Invalid library name: ' + name)
  const [groupId, artifactId, version] = parts
  const packaged = groupId.replace(/\./g, '/')
  const fileName = `${artifactId}-${version}${parts[3] ? '-' + parts[3] : ''}.jar`
  return `${packaged}/${artifactId}/${version}/${fileName}`
}

export const isAllowed = (lib: any): boolean => {
  if (!lib.rules) return true
  let allow = false
  for (const rule of lib.rules) {
    const osOk = !rule.os || rule.os.name === (
      process.platform === 'darwin' ? 'osx' :
      process.platform === 'win32' ? 'windows' : 'linux'
    )
    if (rule.action === 'allow' && osOk) allow = true
    if (rule.action === 'disallow' && osOk) allow = false
  }
  return allow
}

export const nativeId = (): string => {
  return process.platform === 'win32' ? 'natives-windows' :
         process.platform === 'darwin' ? 'natives-osx' : 'natives-linux'
}