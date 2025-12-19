// src/main/launcher/neoforge.ts
import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { fileExists } from '../utils.js'

const NEOFORGE_MAVEN = 'https://maven.neoforged.net/releases/net/neoforged/neoforge'

export async function installNeoForge(
  neoforgeVersion: string, 
  gameDir: string,
  javaPath: string,
  signal: AbortSignal
): Promise<string> {
  const id = `neoforge-${neoforgeVersion}`
  const versionDir = path.join(gameDir, 'versions', id)
  const jsonPath = path.join(versionDir, `${id}.json`)

  if (await fileExists(jsonPath)) {
    console.log('[NeoForge] NeoForge đã được cài trước đó')
    return id
  }
  const launcherProfilesPath = path.join(gameDir, 'launcher_profiles.json')
  const fakeProfiles = {
    profiles: {
      [id]: {
        name: `NeoForge ${neoforgeVersion}`,
        type: 'custom',
        lastVersionId: id,
        gameDir: gameDir
      }
    },
    clientToken: '00000000-0000-0000-0000-000000000000', 
    authenticationDatabase: {},
    selectedUser: {
      id: '00000000-0000-0000-0000-000000000000',
      profileId: '00000000-0000-0000-0000-000000000000'
    }
  }

  try {
    await fs.writeFile(launcherProfilesPath, JSON.stringify(fakeProfiles, null, 2))
    console.log('[NeoForge] Đã tạo launcher_profiles.json giả')
  } catch (err) {
    console.warn('[NeoForge] Không thể tạo launcher_profiles.json giả:', err)
  }
  const installerUrl = `${NEOFORGE_MAVEN}/${neoforgeVersion}/neoforge-${neoforgeVersion}-installer.jar`
  const installerPath = path.join(gameDir, 'installers', `neoforge-${neoforgeVersion}-installer.jar`)

  await fs.mkdir(path.dirname(installerPath), { recursive: true })

  console.log(`[NeoForge] Đang tải installer từ: ${installerUrl}`)

  const installerRes = await fetch(installerUrl, { signal })
  if (!installerRes.ok) {
    throw new Error(
      `Không tải được NeoForge installer (HTTP ${installerRes.status}): ${installerUrl}\n` +
      `Kiểm tra phiên bản có tồn tại không tại https://neoforged.net`
    )
  }

  const buffer = await installerRes.arrayBuffer()
  await fs.writeFile(installerPath, Buffer.from(buffer))
  console.log('[NeoForge] Tải installer thành công')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(javaPath, ['-jar', installerPath, '--installClient', gameDir], {
      cwd: gameDir,
      stdio: 'pipe',
      signal
    })

    let output = ''
    proc.stdout?.on('data', (d) => {
      const text = d.toString()
      output += text
      process.stdout.write(text)
    })
    proc.stderr?.on('data', (d) => {
      const text = d.toString()
      output += text
      process.stderr.write(text)
    })

    proc.on('close', (code) => {
      console.log('[NeoForge Installer Full Output]:\n' + output)

      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`NeoForge installer thất bại (exit code ${code})`))
      }
    })

    proc.on('error', (err) => {
      if (err.name === 'AbortError') {
        reject(new Error('Đã hủy cài đặt NeoForge'))
      } else {
        reject(err)
      }
    })
  })

  await new Promise(r => setTimeout(r, 3000))
  let found = await fileExists(jsonPath)
  let attempts = 0
  while (!found && attempts < 20) {
    await new Promise(r => setTimeout(r, 1500))
    found = await fileExists(jsonPath)
    attempts++
    console.log(`[NeoForge] Đang kiểm tra lại version JSON... (${attempts}/20)`)
  }

  if (!found) {
    console.error('[NeoForge] Không tìm thấy version JSON sau khi cài!')
    try {
      const versionsDir = path.join(gameDir, 'versions')
      if (await fileExists(versionsDir)) {
        const versions = await fs.readdir(versionsDir)
        console.log('[NeoForge] Các thư mục version hiện có:', versions)
      }
    } catch {}
    throw new Error('Cài đặt NeoForge thất bại: không tìm thấy file version JSON')
  }

  console.log('[NeoForge] Cài đặt NeoForge thành công!', id)
  await fs.unlink(installerPath).catch(() => {})
  return id 
}