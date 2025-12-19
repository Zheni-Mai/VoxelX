import fs from 'fs/promises'
import path from 'path'
import { fileExists } from '../utils.js'
import { spawn } from 'child_process'

const MAVEN_BASE = 'https://maven.minecraftforge.net/net/minecraftforge/forge'

export async function installForge(
  mcVersion: string,
  forgeVersion: string, 
  gameDir: string,
  javaPath: string,
  signal: AbortSignal
): Promise<string> {
  let fullVersion: string

  if (forgeVersion === 'latest' || forgeVersion === 'recommended') {
    const promoUrl = `https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json`
    const promoRes = await fetch(promoUrl, { signal })
    if (!promoRes.ok) throw new Error('Không tải được danh sách promo Forge')

    const promoData = await promoRes.json()
    const key = forgeVersion === 'latest' ? 'latest' : 'recommended'
    const promoVersion = promoData.promos[`${mcVersion}-${key}`]

    if (!promoVersion) {
      throw new Error(`Không tìm thấy Forge ${forgeVersion} cho Minecraft ${mcVersion}. Kiểm tra phiên bản MC có hỗ trợ Forge không.`)
    }

    fullVersion = `${mcVersion}-${promoVersion}`
    console.log(`[Forge] Tự động chọn ${forgeVersion}: ${promoVersion} → full version: ${fullVersion}`)
  } else {
    fullVersion = `${mcVersion}-${forgeVersion}`
  }
  const forgeLibDir = path.join(gameDir, 'libraries', 'net', 'minecraftforge', 'forge', fullVersion)
  const possibleJars = [
    path.join(forgeLibDir, `forge-${fullVersion}-client.jar`),
    path.join(forgeLibDir, `forge-${fullVersion}-universal.jar`),
    path.join(forgeLibDir, `forge-${fullVersion}.jar`)
  ]

  for (const jar of possibleJars) {
    if (await fileExists(jar)) {
      console.log('[Forge] Forge đã được cài trước đó')
      return fullVersion
    }
  }

  const launcherProfilesPath = path.join(gameDir, 'launcher_profiles.json')
  const fakeProfiles = {
    profiles: {
      [fullVersion]: {
        name: `Forge ${fullVersion}`,
        type: 'custom',
        lastVersionId: fullVersion,
        gameDir: gameDir
      }
    }
  }

  try {
    await fs.writeFile(launcherProfilesPath, JSON.stringify(fakeProfiles, null, 2))
  } catch (err) {
    console.warn('[Forge] Không thể tạo launcher_profiles.json giả:', err)
  }

  const installerUrl = `${MAVEN_BASE}/${fullVersion}/forge-${fullVersion}-installer.jar`
  const installerPath = path.join(gameDir, 'installers', `forge-${fullVersion}-installer.jar`)
  await fs.mkdir(path.dirname(installerPath), { recursive: true })
  console.log(`[Forge] Đang tải installer từ: ${installerUrl}`)
  const installerRes = await fetch(installerUrl, { signal })
  if (!installerRes.ok) {
    throw new Error(`Không tải được installer (HTTP ${installerRes.status}): ${installerUrl}\nKiểm tra phiên bản Forge có tồn tại không tại https://files.minecraftforge.net`)
  }

  const buffer = await installerRes.arrayBuffer()
  await fs.writeFile(installerPath, Buffer.from(buffer))
  console.log('[Forge] Tải installer thành công')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(javaPath, ['-jar', installerPath, '--installClient', gameDir], {
      cwd: gameDir,
      stdio: 'pipe'
    })

    let output = ''
    proc.stdout?.on('data', d => { output += d.toString(); process.stdout.write(d) })
    proc.stderr?.on('data', d => { output += d.toString(); process.stderr.write(d) })

    proc.on('close', code => {
      console.log('[Forge Installer Full Output]:\n' + output)

      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Installer thất bại (exit code ${code})`))
      }
    })

    proc.on('error', reject)
  })

  await new Promise(r => setTimeout(r, 3000))

  let found = false
  for (const jar of possibleJars) {
    if (await fileExists(jar)) {
      found = true
      break
    }
  }

  let attempts = 0
  while (!found && attempts < 20) {
    await new Promise(r => setTimeout(r, 1500))
    for (const jar of possibleJars) {
      if (await fileExists(jar)) {
        found = true
        break
      }
    }
    attempts++
    console.log(`[Forge] Đang kiểm tra lại file JAR... (${attempts}/20)`)
  }

  if (!found) {
    console.error('[Forge] Không tìm thấy Forge JAR sau khi cài!')
    try {
      const parentDir = path.join(gameDir, 'libraries', 'net', 'minecraftforge', 'forge')
      if (await fileExists(parentDir)) {
        const versions = await fs.readdir(parentDir)
        console.log('[Forge] Các thư mục version hiện có:', versions)
      }
    } catch {}
    throw new Error('Cài đặt Forge thất bại: không tìm thấy file forge JAR trong libraries')
  }

  console.log('[Forge] Cài đặt Forge thành công!', fullVersion)

  return fullVersion 
}