// src/main/launcher/loader/liteloader.ts
import fs from 'fs/promises'
import path from 'path'
import { fileExists } from '../utils.js'

export async function installLiteLoader(
  mcVersion: string,
  loaderVersion: string,
  gameDir: string,
  signal: AbortSignal
): Promise<string> {
  const versionsJsonUrl = 'https://dl.liteloader.com/versions/versions.json'
  const res = await fetch(versionsJsonUrl, { signal })
  if (!res.ok) throw new Error('Không tải được LiteLoader versions.json')

  const data: any = await res.json()
  const versionData = data.versions?.[mcVersion]
  if (!versionData) throw new Error(`Không hỗ trợ LiteLoader cho Minecraft ${mcVersion}`)
  const getLiteLoaderSection = (): any => {
    if (versionData.artefacts?.['com.mumfrey:liteloader']) {
      return versionData.artefacts['com.mumfrey:liteloader']
    }
    if (versionData.snapshots?.['com.mumfrey:liteloader']) {
      return versionData.snapshots['com.mumfrey:liteloader']
    }
    return null
  }

  const liteloaderSection = getLiteLoaderSection()
  if (!liteloaderSection) throw new Error('Không tìm thấy LiteLoader artefact/snapshot cho phiên bản này')
  let selected = liteloaderSection.latest
  if (loaderVersion) {
    let found = false
    for (const key in liteloaderSection) {
      if (key === 'latest') continue
      const item = liteloaderSection[key]
      if (item?.version === loaderVersion) {
        selected = item
        found = true
        break
      }
    }
    if (!found) {
      throw new Error(`Không tìm thấy LiteLoader version "${loaderVersion}" cho Minecraft ${mcVersion}`)
    }
  }

  if (!selected || !selected.tweakClass) {
    throw new Error('Thông tin LiteLoader không hợp lệ (thiếu tweakClass)')
  }

  const tweakClass = selected.tweakClass
  const libraries = selected.libraries || []
  const versionId = `${mcVersion}-liteloader-${selected.version.replace(/[^a-zA-Z0-9_.-]/g, '')}`

  const jsonPath = path.join(gameDir, 'versions', versionId, `${versionId}.json`)
  if (await fileExists(jsonPath)) {
    console.log(`[LiteLoader] Đã tồn tại version JSON: ${versionId}`)
    return versionId
  }

  const liteJson = {
    id: versionId,
    inheritsFrom: mcVersion,
    time: new Date().toISOString(),
    releaseTime: new Date().toISOString(),
    type: 'release',
    arguments: {
      game: [],
      jvm: [
        `-Djava.library.path=${path.join(gameDir, 'natives')}`,
        '--tweakClass',
        tweakClass
      ]
    },
    libraries: libraries.map((lib: any) => ({
      name: lib.name,
      url: lib.url 
    })),
    mainClass: 'net.minecraft.launchwrapper.Launch',
    minecraftArguments: '--username ${auth_player_name} --version ${version_name} --gameDir ${game_directory} --assetsDir ${assets_root} --assetIndex ${assets_index_name} --uuid ${auth_uuid} --accessToken ${auth_access_token} --userType ${user_type} --versionType LiteLoader'
  }

  await fs.mkdir(path.dirname(jsonPath), { recursive: true })
  await fs.writeFile(jsonPath, JSON.stringify(liteJson, null, 2))

  console.log(`[LiteLoader] Đã tạo version JSON thành công: ${versionId}`)
  return versionId
}