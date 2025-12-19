// src/main/launcher/quilt.ts
import fs from 'fs/promises'
import path from 'path'
import { fileExists } from '../utils.js'

const QUILT_META = 'https://meta.quiltmc.org/v3'

export async function installQuilt(
  mcVersion: string,
  loaderVersion: string,
  gameDir: string,
  signal: AbortSignal
): Promise<string> {
  let url = `${QUILT_META}/versions/loader/${mcVersion}/${loaderVersion || 'latest'}/profile/json`
  if (!loaderVersion || loaderVersion === 'latest') {
    const loaders = await fetch(`${QUILT_META}/versions/loader/${mcVersion}`, { signal })
      .then(r => {
        if (!r.ok) throw new Error(`Không tải được danh sách Quilt loader cho ${mcVersion}`)
        return r.json()
      })

    if (!loaders?.length) throw new Error(`Không có Quilt loader nào cho Minecraft ${mcVersion}`)
    const latest = loaders[0].loader.version
    url = `${QUILT_META}/versions/loader/${mcVersion}/${latest}/profile/json`
  }

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Không thể tải Quilt profile: ${res.status} ${res.statusText}`)
  const profile = await res.json()
  const id = profile.id
  const jsonPath = path.join(gameDir, 'versions', id, `${id}.json`)

  await fs.mkdir(path.dirname(jsonPath), { recursive: true })
  await fs.writeFile(jsonPath, JSON.stringify(profile, null, 2))

  return id
}