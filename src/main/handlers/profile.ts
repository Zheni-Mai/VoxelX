//main/handlers/profile.ts
import {ipcMain, net, dialog, shell, BrowserWindow } from 'electron'
import path from 'path'
import fsPromises from 'fs/promises'
import { readdir, stat } from 'fs/promises'
import { promisify } from 'util'
import archiver from 'archiver'
import { exec } from 'child_process'
import type { ProgressData } from 'archiver'
import { createWriteStream } from 'fs'
import { Profile } from '../types/profile'
import { getAppDataPath } from '../utils'

const execAsync = promisify(exec)
const { mkdir, readFile, writeFile, copyFile, rm, unlink, access, } = fsPromises

const PROFILES_FILE = 'profiles.json'


export async function listProfiles(appDataPath: string): Promise<Profile[]> {
  const filePath = path.join(appDataPath, PROFILES_FILE)
  try {
    const content = await readFile(filePath, 'utf-8')
    const profiles = JSON.parse(content) as Profile[]
    console.log(`ĐÃ LOAD ${profiles.length} PROFILE(S) từ:`, filePath)
    return profiles
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      console.log('Chưa có file profiles.json → trả về []')
      return []
    }
    console.error('Lỗi đọc profiles.json:', err)
    return []
  }
}

export function registerProfileHandlers(mainWindow: BrowserWindow) {

  

    const sendToRenderer = (channel: string, ...args: any[]) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, ...args)
        }
    }

    async function getFolderSize(dir: string): Promise<string> {
      let total = 0
      try {
        const files = await readdir(dir, { withFileTypes: true })
        for (const file of files) {
          const fullPath = path.join(dir, file.name)
          if (file.isDirectory()) {
            total += await getFolderSizeRecursive(fullPath)
          } else {
            const stats = await stat(fullPath)
            total += stats.size
          }
        }
      } catch (err) {
        return 'Không thể truy cập'
      }
    
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let size = total
      let unitIndex = 0
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }
      return `${size.toFixed(2)} ${units[unitIndex]}`
    }
    
    async function getFolderSizeRecursive(dir: string): Promise<number> {
      let total = 0
      try {
        const files = await readdir(dir, { withFileTypes: true })
        for (const file of files) {
          const fullPath = path.join(dir, file.name)
          if (file.isDirectory()) {
            total += await getFolderSizeRecursive(fullPath)
          } else {
            const stats = await stat(fullPath)
            total += stats.size
          }
        }
      } catch {
      }
      return total
    }
    
    const getProfilesFilePath = (appDataPath: string) => {
      return path.join(appDataPath, PROFILES_FILE)
    }

    async function getResourceList(dir: string): Promise<any[]> {
      try {
        await mkdir(dir, { recursive: true })
        const files = await readdir(dir)
        return files
          .filter(f => f.endsWith('.zip') || f.endsWith('.jar') || f.endsWith('.disabled'))
          .map(f => {
            const enabled = !f.endsWith('.disabled')
            const cleanName = enabled ? f : f.replace(/\.disabled$/, '')
            return {
              filename: cleanName,
              enabled,
              title: cleanName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
              iconUrl: null,
            }
          })
      } catch {
        return []
      }
    }

    async function toggleResource(dir: string, filename: string, enable: boolean): Promise<boolean> {
      try {
        await mkdir(dir, { recursive: true })
        const current = enable ? `${filename}.disabled` : filename
        const target = enable ? filename : `${filename}.disabled`
        const currentPath = path.join(dir, current)
        const targetPath = path.join(dir, target)
        if (await access(currentPath).then(() => true).catch(() => false)) {
          await fsPromises.rename(currentPath, targetPath)
        }
        return true
      } catch (err) {
        console.error('Lỗi toggle resource:', err)
        return false
      }
    }

    async function deleteResource(dir: string, filename: string): Promise<boolean> {
      try {
        await mkdir(dir, { recursive: true })
        const path1 = path.join(dir, filename)
        const path2 = path.join(dir, `${filename}.disabled`)
        if (await access(path1).then(() => true).catch(() => false)) await unlink(path1)
        if (await access(path2).then(() => true).catch(() => false)) await unlink(path2)
        return true
      } catch (err) {
        console.error('Lỗi xóa resource:', err)
        return false
      }
    }

    async function addResourcesFromFolder(gameDirectory: string, subDir: string, typeName: string) {
      if (!mainWindow) return { success: false, message: 'Không có cửa sổ chính' }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: `Chọn ${typeName} (.zip)`,
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: typeName, extensions: ['zip'] },
          { name: 'Tất cả file', extensions: ['*'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'Đã hủy' }
      }

      const targetDir = path.join(gameDirectory, subDir)
      await mkdir(targetDir, { recursive: true })

      const copied: string[] = []
      const failed: string[] = []

      for (const filePath of result.filePaths) {
        try {
          const filename = path.basename(filePath)
          const destPath = path.join(targetDir, filename)
          await copyFile(filePath, destPath)
          copied.push(filename)
        } catch (err) {
          failed.push(path.basename(filePath))
        }
      }

      return {
        success: true,
        copied,
        failed,
        message: `Đã thêm ${copied.length} ${typeName}${failed.length > 0 ? `, thất bại ${failed.length}` : ''}`
      }
    }

    async function importMrpackFile(
      mrpackPath: string,
      mainWindow: BrowserWindow
    ): Promise<{ success: boolean; profile?: Profile; message?: string }> {
      const fs = require('fs')
      const path = require('path')
      const AdmZip = require('adm-zip')

      const appDataPath = await getAppDataPath()
      const instancesDir = path.join(appDataPath, 'instances')
      const tempDir = path.join(appDataPath, 'temp_import', Date.now().toString())

      const safeSend = (channel: string, data: any) => {
        try {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(channel, data)
          }
        } catch (err) {
          console.warn('Không thể gửi IPC (window đã đóng):', channel)
        }
      }

      try {
        await mkdir(tempDir, { recursive: true })

        const fileName = path.basename(mrpackPath, '.mrpack')

        let profileName = fileName
        let gameVersion = '1.20.1'
        let loader: 'vanilla' | 'fabric' | 'quilt' | 'forge' = 'fabric'
        let loaderVersion: string | undefined = undefined
        let finalGameDir = ''

        safeSend('import-progress', { message: 'Đang giải nén .mrpack...', percent: 0 })

        const zip = new AdmZip(mrpackPath)
        zip.extractAllTo(tempDir, true)

        const manifestPath = path.join(tempDir, 'modrinth.index.json')
        if (!fs.existsSync(manifestPath)) {
          throw new Error('Không tìm thấy modrinth.index.json')
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        profileName = manifest.name || fileName
        gameVersion = manifest.dependencies.minecraft || '1.20.1'

        if (manifest.dependencies['quilt-loader']) {
          loader = 'quilt'
          loaderVersion = manifest.dependencies['quilt-loader']
        } else if (manifest.dependencies['fabric-loader']) {
          loader = 'fabric'
          loaderVersion = manifest.dependencies['fabric-loader']
        } else if (manifest.dependencies.forge) {
          loader = 'forge'
          loaderVersion = manifest.dependencies.forge
        }

        const safeName = profileName.replace(/[/\\?%*:|"<>]/g, '_')
        finalGameDir = path.join(instancesDir, safeName)
        await mkdir(finalGameDir, { recursive: true })
        const overridesDir = path.join(tempDir, 'overrides')
        if (fs.existsSync(overridesDir)) {
          await fs.promises.cp(overridesDir, finalGameDir, { recursive: true })
        }
        const modsDir = path.join(finalGameDir, 'mods')
        await mkdir(modsDir, { recursive: true })

        const files = manifest.files || []
        const total = files.length

        if (total > 0) {
          safeSend('import-progress', { message: 'Đang tải và nhận diện mods...', percent: 5 })

          let processed = 0
          const modpackPath = path.join(finalGameDir, 'modpack.json')
          let modpackData = { mods: [] as any[] }
          try {
            if (await access(modpackPath).then(() => true).catch(() => false)) {
              const content = await readFile(modpackPath, 'utf-8')
              modpackData = JSON.parse(content)
            }
          } catch {}

          for (const file of files) {
            const filename = path.basename(file.path)
            const url = file.downloads?.[0]
            const sha1 = file.hashes?.sha1

            if (!url || !sha1) {
              processed++
              continue
            }

            try {
              const res = await fetch(url)
              if (!res.ok || !res.body) throw new Error('Download failed')

              const filePathDest = path.join(modsDir, filename)
              const fileStream = createWriteStream(filePathDest)
              await require('util').promisify(require('stream').pipeline)(res.body, fileStream)
              let metadata: any = null
              try {
                const versionRes = await net.fetch(`https://api.modrinth.com/v2/version_file/${sha1}?algorithm=sha1`, {
                  headers: { 'User-Agent': 'VoxelX/1.0 (+https://voxelxlauncher.com)' }
                })

                if (versionRes.ok) {
                  const versionData = await versionRes.json()
                  const projectRes = await net.fetch(`https://api.modrinth.com/v2/project/${versionData.project_id}`, {
                    headers: { 'User-Agent': 'VoxelX/1.0 (+https://voxelxlauncher.com)' }
                  })

                  if (projectRes.ok) {
                    const projectData = await projectRes.json()
                    metadata = {
                      title: projectData.title,
                      description: projectData.description || 'Mod từ Modrinth modpack',
                      authors: projectData.team?.members?.map((m: any) => m.user?.username) || ['Không rõ'],
                      iconUrl: projectData.icon_url || null,
                      version: versionData.version_number,
                      projectId: versionData.project_id,
                      fileId: versionData.id,
                    }
                  }
                }
              } catch (e) {
                console.warn(`Không nhận diện được metadata cho ${filename}:`, e)
              }
              if (!modpackData.mods.some((m: any) => m.filename === filename)) {
                modpackData.mods.push({
                  filename,
                  enabled: true,
                  title: metadata?.title || filename.replace(/[-_].*\.jar$/i, '').replace(/[-_]/g, ' '),
                  description: metadata?.description || 'Mod từ modpack',
                  authors: metadata?.authors || ['Không rõ'],
                  iconUrl: metadata?.iconUrl || null,
                  version: metadata?.version || 'Unknown',
                  projectId: metadata?.projectId || null,
                  fileId: metadata?.fileId || null,
                })
              }

              processed++
              const percent = Math.round((processed / total) * 90) + 5
              safeSend('import-progress', {
                message: `Đang xử lý: ${filename}`,
                percent,
                current: processed,
                total,
              })
            } catch (err) {
              console.warn(`Lỗi tải ${filename}:`, err)
              processed++
            }
          }
          await writeFile(modpackPath, JSON.stringify(modpackData, null, 2))
        }

        safeSend('import-progress', { message: 'Hoàn tất!', percent: 100 })
        const newProfile: Profile = {
          name: safeName,
          version: gameVersion,
          loader,
          gameDirectory: finalGameDir,
          loaderVersion: loaderVersion || undefined,
          installed: true,
          isDefault: false,
        }

        const profilesPath = path.join(appDataPath, PROFILES_FILE)
        let profiles: Profile[] = []
        try {
          profiles = JSON.parse(await readFile(profilesPath, 'utf-8'))
        } catch {}
        profiles = profiles.filter(p => p.name !== newProfile.name)
        profiles.push(newProfile)
        await writeFile(profilesPath, JSON.stringify(profiles, null, 2))

        return { success: true, profile: newProfile }
      } catch (err: any) {
        console.error('Import .mrpack failed:', err)
        return { success: false, message: err.message || 'Lỗi không xác định khi nhập modpack' }
      } finally {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {})
      }
    }

    ipcMain.handle('profile:getFolderSize', async (_event, dir: string) => {
      return await getFolderSize(dir)
    })

    ipcMain.handle('listProfiles', async (_event, appDataPath: string) => {
      const filePath = getProfilesFilePath(appDataPath)
      try {
        const content = await readFile(filePath, 'utf-8')
        const profiles = JSON.parse(content)
        console.log(`ĐÃ LOAD ${profiles.length} PROFILE(S) từ:`, filePath)
        return profiles
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          console.log('Chưa có file profiles.json → trả về []')
          return []
        }
        console.error('Lỗi đọc profiles.json:', err)
        return []
      }
    })

    ipcMain.handle('setDefaultProfile', async (_event, data: { appDataPath: string; profileName: string }) => {
      const { appDataPath, profileName } = data
      const filePath = getProfilesFilePath(appDataPath)
    
      try {
        let profiles: any[] = []
        const content = await readFile(filePath, 'utf-8')
        profiles = JSON.parse(content)
        profiles = profiles.map(p => ({ ...p, isDefault: false }))
        const index = profiles.findIndex(p => p.name === profileName)
        if (index !== -1) {
          profiles[index].isDefault = true
        }
    
        await writeFile(filePath, JSON.stringify(profiles, null, 2))
        const { BrowserWindow } = require('electron')
        BrowserWindow.getAllWindows().forEach((win: BrowserWindow) => {
          if (!win.isDestroyed()) {
            win.webContents.send('profiles-updated')
          }
        })
        console.log(`ĐÃ ĐẶT PROFILE "${profileName}" LÀM MẶC ĐỊNH`)
        return profiles
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          console.log('Chưa có profile nào')
          return []
        }
        console.error('Lỗi set default profile:', err)
        return null
      }
    })
    
    ipcMain.handle('saveProfile', async (_event, data: { appDataPath: string; profile: Profile }) => {
      const { appDataPath, profile } = data
      const filePath = path.join(appDataPath, 'profiles.json')

      let profiles: Profile[] = []
      try {
        const content = await readFile(filePath, 'utf-8')
        profiles = JSON.parse(content)
      } catch (err: any) {
        if (err.code !== 'ENOENT') console.error('Lỗi đọc profiles.json:', err)
      }
      const index = profiles.findIndex(p => p.gameDirectory === profile.gameDirectory)

      if (index !== -1) {
        profiles[index] = profile
      } else {
        profiles.push(profile)
      }

      await writeFile(filePath, JSON.stringify(profiles, null, 2))
      const { BrowserWindow } = require('electron')
      BrowserWindow.getAllWindows().forEach((win: BrowserWindow) => {
        if (!win.isDestroyed()) {
          win.webContents.send('profiles-updated')
        }
      })
      console.log('ĐÃ LƯU PROFILE THÀNH CÔNG →', profile.name)
      return true
    })

    ipcMain.handle('profile:getWorldList', async (_event, gameDirectory: string) => {
      const savesDir = path.join(gameDirectory, 'saves')
      try {
        const entries = await readdir(savesDir, { withFileTypes: true })
        const worlds = entries
          .filter(entry => entry.isDirectory())
          .map(entry => entry.name)
          .sort()
        return worlds
      } catch (err) {
        console.warn('Không thể đọc thư mục saves:', err)
        return []
      }
    })

    ipcMain.handle('profile:delete', async (_event, { appDataPath, profileName }: { appDataPath: string; profileName: string }) => {
      const filePath = getProfilesFilePath(appDataPath)
    
      try {
        let profiles: Profile[] = []
        try {
          const content = await readFile(filePath, 'utf-8')
          profiles = JSON.parse(content)
        } catch (err: any) {
          if (err.code !== 'ENOENT') {
            console.error('Lỗi đọc profiles.json:', err)
          }
          return false
        }
    
        const newProfiles = profiles.filter(p => p.name !== profileName)
    
        if (profiles.some(p => p.name === profileName && p.isDefault) && newProfiles.length > 0) {
          newProfiles[0].isDefault = true
        }
    
        await writeFile(filePath, JSON.stringify(newProfiles, null, 2))
        const { BrowserWindow } = require('electron')
        BrowserWindow.getAllWindows().forEach((win: BrowserWindow) => {
          if (!win.isDestroyed()) {
            win.webContents.send('profiles-updated')
          }
        })
        console.log(`ĐÃ XÓA PROFILE "${profileName}" VĨNH VIỄN`)
        return true
    
      } catch (err) {
        console.error('Lỗi xóa profile:', err)
        return false
      }
    })

    ipcMain.handle('profile:export', async (_event, { gameDirectory, profileName }: { gameDirectory: string; profileName: string }) => {
      try {
        await access(gameDirectory)
    
        const result = await dialog.showSaveDialog(mainWindow!, {
          title: 'Xuất Profile',
          defaultPath: `${profileName.replace(/[/\\?%*:|"<>]/g, '_')}.vxpacks`,
          filters: [
            { name: 'VoxelX Profile', extensions: ['vxpacks'] },
            { name: 'Tất cả file', extensions: ['*'] }
          ],
          properties: ['createDirectory', 'showOverwriteConfirmation']
        })
    
        if (result.canceled || !result.filePath) {
          return { success: false, message: 'Đã hủy xuất profile' }
        }
    
        let outputPath = result.filePath
        if (!outputPath.toLowerCase().endsWith('.vxpacks')) {
          outputPath += '.vxpacks'
        }
    
        const output = createWriteStream(outputPath)
        const archive = archiver('zip', { zlib: { level: 9 } })
    
        let currentFile = 'Đang chuẩn bị...';
    
        archive.on('entry', () => {
          sendToRenderer('profile:export-progress', {
            percent: 0,
            currentFile,
            filesProcessed: 0,
            filesTotal: 0,
          });
        });
    
        archive.on('progress', (progress: ProgressData) => {
          let percent = 0;
          if (progress.entries.total > 0) {
            percent = Math.round((progress.entries.processed / progress.entries.total) * 100);
          }
          else if (progress.fs?.totalBytes && progress.fs.totalBytes > 0) {
            percent = Math.round((progress.fs.processedBytes / progress.fs.totalBytes) * 100);
          }
    
          percent = Math.min(100, Math.max(0, percent));
    
          sendToRenderer('profile:export-progress', {
            percent,                  
            currentFile,            
            filesProcessed: progress.entries.processed,
            filesTotal: progress.entries.total,
          });
        });
        sendToRenderer('profile:export-start', { profileName, outputPath })
    
        const finishPromise = new Promise<void>((resolve, reject) => {
          output.on('close', () => {
            console.log(`Xuất profile thành công: ${outputPath} (${archive.pointer()} bytes)`)
            resolve()
          })
          archive.on('error', (err) => {
            console.error('Lỗi khi nén:', err)
            reject(err)
          })
          archive.on('warning', (err) => console.warn('Archiver warning:', err))
        })
    
        archive.pipe(output)
        archive.directory(gameDirectory, false)
        archive.append(JSON.stringify({
          format: 'voxelx-profile',
          version: 1,
          exportedAt: new Date().toISOString(),
          profileName
        }, null, 2), { name: 'voxelx-meta.json' })
    
        await archive.finalize()
        await finishPromise
    
        shell.showItemInFolder(outputPath)
    
        sendToRenderer('profile:export-complete', { success: true, filePath: outputPath })
        return { success: true, filePath: outputPath }
    
      } catch (err: any) {
        console.error('Lỗi xuất profile:', err)
        sendToRenderer('profile:export-complete', {
          success: false,
          message: err.message || 'Lỗi không xác định khi xuất profile'
        })
        return { success: false, message: err.message || 'Lỗi không xác định' }
      }
    })

    ipcMain.handle('profile:import-pack', async (_event, filePath: string) => {
      const fs = require('fs')
      const path = require('path')
      const AdmZip = require('adm-zip')

      const appDataPath = await getAppDataPath()
      const instancesDir = path.join(appDataPath, 'instances')
      const tempDir = path.join(appDataPath, 'temp_import', Date.now().toString())

      const safeSend = (channel: string, data: any) => {
        try {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(channel, data)
          }
        } catch (err) {
          console.warn('Không thể gửi IPC (window đã đóng):', channel)
        }
      }

      try {
        await mkdir(tempDir, { recursive: true })

        const ext = path.extname(filePath).toLowerCase()
        const fileName = path.basename(filePath, ext)

        let profileName = fileName
        let gameVersion = '1.20.1'
        let loader: 'vanilla' | 'fabric' | 'quilt' | 'forge' = 'fabric'
        let loaderVersion: string | undefined = undefined
        let finalGameDir = ''

        safeSend('import-progress', { message: 'Đang giải nén pack...', percent: 0 })
        if (ext === '.mrpack') {
          return await importMrpackFile(filePath, mainWindow)
        }
        else if (ext === '.vxpacks') {
          const zip = new AdmZip(filePath)
          zip.extractAllTo(tempDir, true)

          const metaPath = path.join(tempDir, 'voxelx-meta.json')
          if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
            profileName = meta.profileName || fileName
          }

          const items = await readdir(tempDir, { withFileTypes: true })
          const rootDirEntry = items.find(d => d.isDirectory())
          if (!rootDirEntry) throw new Error('File .vxpacks không hợp lệ')

          const sourceDir = path.join(tempDir, rootDirEntry.name)
          const safeName = profileName.replace(/[/\\?%*:|"<>]/g, '_')
          finalGameDir = path.join(instancesDir, safeName)
          await fs.promises.cp(sourceDir, finalGameDir, { recursive: true })
        }
        else if (ext === '.zip') {
          const zip = new AdmZip(filePath)
          zip.extractAllTo(tempDir, true)

          const possibleManifests = ['manifest.json', 'modrinth.index.json', 'instance.cfg']
          let manifestData: any = null
          let manifestType = ''

          for (const file of possibleManifests) {
            const fullPath = path.join(tempDir, file)
            if (fs.existsSync(fullPath)) {
              manifestData = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
              manifestType = file
              break
            }
          }

          if (manifestData) {
            if (manifestType === 'modrinth.index.json') {
              throw new Error('File .zip chứa modrinth.index.json → hãy đổi tên thành .mrpack')
            }
            profileName = manifestData.name || fileName
            gameVersion = manifestData.minecraftVersion || manifestData.dependencies?.minecraft || '1.20.1'

            if (manifestData.minecraft?.modLoaders) {
              const loaderInfo = manifestData.minecraft.modLoaders.find((l: any) => l.primary)
              if (loaderInfo) {
                if (loaderInfo.id.startsWith('fabric')) loader = 'fabric'
                else if (loaderInfo.id.startsWith('quilt')) loader = 'quilt'
                else if (loaderInfo.id.startsWith('forge')) loader = 'forge'
                loaderVersion = loaderInfo.id.split('-')[1]
              }
            }
          }

          const findGameDir = (dir: string): string | null => {
            const items = fs.readdirSync(dir)
            for (const item of items) {
              const full = path.join(dir, item)
              if (fs.statSync(full).isDirectory()) {
                if (item === '.minecraft' || fs.existsSync(path.join(full, 'mods'))) {
                  return full
                }
                const found = findGameDir(full)
                if (found) return found
              }
            }
            return null
          }

          const foundDir = findGameDir(tempDir)
          if (!foundDir) throw new Error('Không tìm thấy thư mục game trong file .zip')

          const safeName = profileName.replace(/[/\\?%*:|"<>]/g, '_')
          finalGameDir = path.join(instancesDir, safeName)
          await fs.promises.cp(foundDir, finalGameDir, { recursive: true })
        }

        if (!finalGameDir) {
          throw new Error('Không xác định được thư mục game')
        }

        const newProfile: Profile = {
          name: profileName.replace(/[/\\?%*:|"<>]/g, '_'),
          version: gameVersion,
          loader,
          gameDirectory: finalGameDir,
          loaderVersion: loaderVersion || undefined,
          installed: true,
          isDefault: false,
        }

        const profilesPath = path.join(appDataPath, PROFILES_FILE)
        let profiles: Profile[] = []
        try {
          profiles = JSON.parse(await readFile(profilesPath, 'utf-8'))
        } catch {}
        profiles = profiles.filter(p => p.name !== newProfile.name)
        profiles.push(newProfile)
        await writeFile(profilesPath, JSON.stringify(profiles, null, 2))

        const { BrowserWindow } = require('electron')
        BrowserWindow.getAllWindows().forEach((win: BrowserWindow) => {
          if (!win.isDestroyed()) {
            win.webContents.send('profiles-updated')
          }
        })

        return { success: true, profile: newProfile }
      } catch (err: any) {
        console.error('Import pack failed:', err)
        return { success: false, message: err.message || 'Lỗi không xác định khi nhập pack' }
      } finally {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {})
      }
    })

    ipcMain.handle('profile:getModList', async (_event, gameDirectory: string) => {
      const modpackPath = path.join(gameDirectory, 'modpack.json')
      const modsDir = path.join(gameDirectory, 'mods')
    
      let savedMods: any[] = []
    
      try {
        if (await access(modpackPath).then(() => true).catch(() => false)) {
          const content = await readFile(modpackPath, 'utf-8')
          savedMods = JSON.parse(content).mods || []
        }
      } catch (err) {
        console.warn('Lỗi đọc modpack.json:', err)
      }
      const files = await readdir(modsDir).catch(() => [])
      const fileMap = new Map(savedMods.map(m => [m.filename, m]))
    
      for (const file of files) {
        if (!file.endsWith('.jar') && !file.endsWith('.noactive')) continue
    
        const enabled = file.endsWith('.jar')
        const cleanName = enabled ? file : file.replace(/\.noactive$/, '')
    
        if (!fileMap.has(cleanName)) {
          fileMap.set(cleanName, {
            filename: cleanName,
            enabled,
            title: cleanName.replace(/[-_].*\.jar$/, '').replace(/-/g, ' '),
            description: 'Mod chưa được nhận diện từ Modrinth',
            authors: ['Không rõ'],
            iconUrl: null,
            version: 'Unknown',
            projectId: null,
            fileId: null
          })
        } else {
          const existing = fileMap.get(cleanName)
          existing.enabled = enabled
          existing.filename = cleanName
        }
      }
    
      const finalList = Array.from(fileMap.values())
      return finalList
    })
    
    ipcMain.handle('profile:toggleMod', async (_event, { gameDirectory, filename, enable }: { gameDirectory: string; filename: string; enable: boolean }) => {
      const modsDir = path.join(gameDirectory, 'mods')
      const currentPath = path.join(modsDir, enable ? `${filename}.noactive` : filename)
      const targetPath = path.join(modsDir, enable ? filename : `${filename}.noactive`)
    
      try {
        if (await access(currentPath).then(() => true).catch(() => false)) {
          await fsPromises.rename(currentPath, targetPath)
        }
        const modpackPath = path.join(gameDirectory, 'modpack.json')
        let data = { mods: [] as any[] }
    
        try {
          if (await access(modpackPath).then(() => true).catch(() => false)) {
            data = JSON.parse(await readFile(modpackPath, 'utf-8'))
          }
        } catch {}
    
        const mod = data.mods.find((m: any) => m.filename === filename)
        if (mod) mod.enabled = enable
    
        await writeFile(modpackPath, JSON.stringify(data, null, 2))
        return true
      } catch (err) {
        console.error('Lỗi bật/tắt mod:', err)
        return false
      }
    })
    
    ipcMain.handle('profile:deleteMod', async (_event, { gameDirectory, filename }: { gameDirectory: string; filename: string }) => {
      const modsDir = path.join(gameDirectory, 'mods')
      const filePath1 = path.join(modsDir, filename)
      const filePath2 = path.join(modsDir, `${filename}.noactive`)
    
      try {
        if (await access(filePath1).then(() => true).catch(() => false)) await unlink(filePath1)
        if (await access(filePath2).then(() => true).catch(() => false)) await unlink(filePath2)
        const modpackPath = path.join(gameDirectory, 'modpack.json')
        let data = { mods: [] as any[] }
    
        try {
          if (await access(modpackPath).then(() => true).catch(() => false)) {
            data = JSON.parse(await readFile(modpackPath, 'utf-8'))
          }
        } catch {}
    
        data.mods = data.mods.filter((m: any) => m.filename !== filename)
        await writeFile(modpackPath, JSON.stringify(data, null, 2))
    
        return true
      } catch (err) {
        console.error('Lỗi xóa mod:', err)
        return false
      }
    })

    ipcMain.handle('modrinth:download-file', async (
      _event,
      fileUrl: string,
      fileName: string,
      gameDirectory: string,
      metadata?: any,
      subFolder: 'mods' | 'shaderpacks' | 'resourcepacks' | 'datapacks' = 'mods',
      worldName?: string 
    ) => {
      try {
        let targetDir = gameDirectory

        if (subFolder === 'datapacks' && worldName) {
          targetDir = path.join(gameDirectory, 'saves', worldName, 'datapacks')
        } else {
          targetDir = path.join(gameDirectory, subFolder)
        }

        await mkdir(targetDir, { recursive: true })
        const filePath = path.join(targetDir, fileName)

        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error('Download failed')

        const buffer = Buffer.from(await response.arrayBuffer())
        await writeFile(filePath, buffer)
        if (subFolder === 'mods') {
          const modpackPath = path.join(gameDirectory, 'modpack.json')
          let data = { mods: [] as any[] }
          try {
            if (await access(modpackPath).then(() => true).catch(() => false)) {
              data = JSON.parse(await readFile(modpackPath, 'utf-8'))
            }
          } catch {}

          if (!data.mods.some((m: any) => m.filename === fileName)) {
            data.mods.push({
              filename: fileName,
              enabled: true,
              title: metadata?.title || fileName,
              description: metadata?.description || 'Mod từ Modrinth',
              authors: metadata?.authors || ['Không rõ'],
              iconUrl: metadata?.iconUrl || null,
              version: metadata?.version || 'Unknown',
              projectId: metadata?.projectId || null,
              fileId: metadata?.fileId || null,
            })
            await writeFile(modpackPath, JSON.stringify(data, null, 2))
          }
        }

        return true
      } catch (err) {
        console.error('Download file failed:', err)
        return false
      }
    })

    ipcMain.handle('profile:createTempWorldDatapackCopy', async (_event, worldName: string, filename: string) => {
      try {
        const appDataPath = await getAppDataPath()
        const tempBase = path.join(appDataPath, 'Local', 'Temp')
        await mkdir(tempBase, { recursive: true })

        const randomId = crypto.randomUUID().split('-')[0]
        const tempWorldDir = path.join(tempBase, `mcworld-${randomId}`)
        await mkdir(tempWorldDir, { recursive: true })
        const tempDatapacksDir = path.join(tempWorldDir, 'datapacks')
        await mkdir(tempDatapacksDir, { recursive: true })

        console.log(`Tạo temp datapack folder: ${tempDatapacksDir} (world: ${worldName}, file: ${filename})`)
        return tempDatapacksDir
      } catch (err) {
        console.error('Lỗi tạo temp datapack copy:', err)
        return null
      }
    })

    ipcMain.handle('modrinth:install-modpack', async (_event, mrpackUrl: string, suggestedName?: string) => {
      const path = require('path')
      const { getAppDataPath } = require('../utils')

      const appDataPath = await getAppDataPath()
      const tempDir = path.join(appDataPath, 'temp_modpack', Date.now().toString())
      const tempMrpackPath = path.join(tempDir, 'modpack.mrpack')

      const safeSend = (channel: string, data: any) => {
        try {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(channel, data)
          }
        } catch {}
      }

      try {
        await mkdir(tempDir, { recursive: true })

        safeSend('modpack-install-progress', { message: 'Đang tải file .mrpack...', percent: 10 })

        const res = await fetch(mrpackUrl)
        if (!res.ok || !res.body) throw new Error('Không tải được file .mrpack')

        const fileStream = createWriteStream(tempMrpackPath)
        await require('util').promisify(require('stream').pipeline)(res.body, fileStream)
        safeSend('modpack-install-progress', { message: 'Đang xử lý modpack...', percent: 30 })
        const result = await importMrpackFile(tempMrpackPath, mainWindow)
        safeSend('modpack-install-progress', { message: 'Hoàn tất!', percent: 100 })
        if (result.success) {
          const { BrowserWindow } = require('electron')
          BrowserWindow.getAllWindows().forEach((win: BrowserWindow) => {
            if (!win.isDestroyed()) {
              win.webContents.send('profiles-updated')
            }
          })
        }
        return result
      } catch (err: any) {
        console.error('Install modpack failed:', err)
        return { success: false, message: err.message || 'Lỗi không xác định' }
      } finally {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {})
      }
    })

    ipcMain.handle('modrinth:search', async (
      _event,
      query: string,
      gameVersion?: string,
      loader?: string,
      limit = 100,
      offset = 0,
      projectType?: string
    ) => {
      try {
        const params = new URLSearchParams()
        params.set('query', query.trim() || '')
        params.set('limit', Math.min(limit, 100).toString())
        params.set('offset', offset.toString())
        params.set('index', 'downloads')

        const facets: string[][] = []

        // Project type: chỉ thêm nếu có, không mặc định mod nữa
        if (projectType) {
          facets.push([`project_type:${projectType}`])
        }

        // Game version
        if (gameVersion) {
          facets.push([`versions:${gameVersion}`])
        }

        // Loader → categories (hỗ trợ nhiều loader)
        if (loader) {
          const loaders = loader.split(' ').filter(Boolean)
          loaders.forEach(l => {
            facets.push([`categories:"${l}"`])
          })
        }

        if (facets.length > 0) {
          params.set('facets', JSON.stringify(facets))
        }

        const url = `https://api.modrinth.com/v2/search?${params.toString()}`
        console.log('Search URL:', url)

        const res = await net.fetch(url, {
          headers: { 'User-Agent': 'VoxelX/1.0 (+https://voxelxlauncher.com)' }
        })

        if (!res.ok) {
          const text = await res.text()
          console.error('Search API lỗi:', res.status, text.substring(0, 200))
          return { hits: [], total_hits: 0 }
        }

        const data = await res.json()
        return data
      } catch (err: any) {
        console.error('Search failed:', err.message || err)
        return { hits: [], total_hits: 0 }
      }
    })
    
    ipcMain.handle('modrinth:project', async (_event, id: string) => {
      try {
        console.log('Đang tải chi tiết mod ID:', id)
    
        const headers = {
          'User-Agent': 'VoxelX/1.0 (+https://voxelxlauncher.com)'
        }
    
        const [projectRes, versionsRes] = await Promise.all([
          net.fetch(`https://api.modrinth.com/v2/project/${id}`, { headers }),
          net.fetch(`https://api.modrinth.com/v2/project/${id}/version`, { headers })
        ])
        if (!projectRes.ok) {
          const text = await projectRes.text()
          console.error('Project API lỗi:', projectRes.status, text.substring(0, 200))
          return null
        }
    
        if (!versionsRes.ok) {
          const text = await versionsRes.text()
          console.error('Versions API lỗi:', versionsRes.status, text.substring(0, 200))
          return null
        }
        let project, versions
        try {
          project = await projectRes.json()
        } catch (e) {
          console.error('Lỗi parse project JSON:', e)
          return null
        }
    
        try {
          versions = await versionsRes.json()
        } catch (e) {
          console.error('Lỗi parse versions JSON:', e)
          return null
        }
    
        return { project, versions }
    
      } catch (err: any) {
        console.error('Modrinth project error:', err.message || err)
        return null
      }
    })

    ipcMain.handle('profile:recognizeMod', async (_event, { filePath }: { filePath: string }) => {
      try {
        const crypto = require('crypto')
        const fs = require('fs')

        const buffer = await fs.promises.readFile(filePath)
        const hash = crypto.createHash('sha1').update(buffer).digest('hex')

        console.log('Tính SHA1:', hash)

        const res = await net.fetch(`https://api.modrinth.com/v2/version_file/${hash}?algorithm=sha1`, {
          headers: { 'User-Agent': 'VoxelX/1.0 (+https://voxelxlauncher.com)' }
        })

        if (!res.ok) {
          console.log('Không tìm thấy trên Modrinth (SHA1 không khớp)')
          return null
        }

        const data = await res.json()
        const version = data
        const projectRes = await net.fetch(`https://api.modrinth.com/v2/project/${version.project_id}`, {
          headers: { 'User-Agent': 'VoxelX/1.0 (+https://voxelxlauncher.com)' }
        })

        if (!projectRes.ok) return null
        const project = await projectRes.json()

        return {
          title: project.title,
          description: project.description || 'Không có mô tả',
          authors: [project.team || project.author || 'Không rõ'],
          iconUrl: project.icon_url || null,
          version: version.version_number,
          projectId: version.project_id,
          fileId: version.id,
        }
      } catch (err) {
        console.warn('Lỗi nhận diện mod:', err)
        return null
      }
    })

    ipcMain.handle('selectGameDirectory', async () => {
      try {
        const result = await dialog.showOpenDialog(mainWindow!, {
          properties: ['openDirectory'],
          title: 'Chọn thư mục game',
          buttonLabel: 'Chọn thư mục'
        }) as any
    
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
          console.log('Người dùng hủy chọn thư mục game')
          return null
        }
    
        const selectedPath = result.filePaths[0]
        console.log('Đã chọn thư mục game:', selectedPath)
        return selectedPath
      } catch (err) {
        console.error('Lỗi mở dialog chọn thư mục:', err)
        return null
      }
    })
    
    ipcMain.handle('openGameDirectory', async (_event, dirPath: string) => {
      const { shell } = require('electron')
      try {
        await shell.openPath(dirPath)
        console.log('Đã mở thư mục:', dirPath)
        return true
      } catch (err) {
        console.error('Lỗi mở thư mục:', err)
        return false
      }
    })

    ipcMain.handle('profile:addModsFromFolder', async (_event, { gameDirectory }: { gameDirectory: string }) => {
      if (!mainWindow) return { success: false, message: 'Không có cửa sổ chính' }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Chọn file mod (.jar)',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Minecraft Mods', extensions: ['jar'] },
          { name: 'Tất cả file', extensions: ['*'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'Đã hủy' }
      }

      const modsDir = path.join(gameDirectory, 'mods')
      await mkdir(modsDir, { recursive: true })

      const copied: string[] = []
      const failed: string[] = []

      const modpackPath = path.join(gameDirectory, 'modpack.json')
      let data = { mods: [] as any[] }
      try {
        if (await access(modpackPath).then(() => true).catch(() => false)) {
          const content = await readFile(modpackPath, 'utf-8')
          data = JSON.parse(content)
        }
      } catch {}

      for (const filePath of result.filePaths) {
        try {
          const filename = path.basename(filePath)
          const destPath = path.join(modsDir, filename)
          await copyFile(filePath, destPath)
          copied.push(filename)
          let metadata: any = null
          try {
            const crypto = require('crypto')
            const buffer = await fsPromises.readFile(destPath)
            const hash = crypto.createHash('sha1').update(buffer).digest('hex')

            const res = await net.fetch(`https://api.modrinth.com/v2/version_file/${hash}?algorithm=sha1`, {
              headers: { 'User-Agent': 'VoxelX/1.0' }
            })

            if (res.ok) {
              const version = await res.json()
              const projectRes = await net.fetch(`https://api.modrinth.com/v2/project/${version.project_id}`)
              if (projectRes.ok) {
                const project = await projectRes.json()
                metadata = {
                  title: project.title,
                  description: project.description || 'Không có mô tả',
                  authors: project.team?.members?.map((m: any) => m.user?.username) || ['Không rõ'],
                  iconUrl: project.icon_url,
                  version: version.version_number,
                  projectId: version.project_id,
                  fileId: version.id,
                }
              }
            }
          } catch (e) {
            console.warn('Không nhận diện được:', filename)
          }

          const modEntry = {
            filename,
            enabled: true,
            title: metadata?.title || filename.replace(/[-_].*\.jar$/i, '').replace(/[-_]/g, ' '),
            description: metadata?.description || 'Mod được thêm thủ công',
            authors: metadata?.authors || ['Không rõ'],
            iconUrl: metadata?.iconUrl || null,
            version: metadata?.version || 'Unknown',
            projectId: metadata?.projectId || null,
            fileId: metadata?.fileId || null,
          }

          if (!data.mods.some((m: any) => m.filename === filename)) {
            data.mods.push(modEntry)
          }
        } catch (err) {
          failed.push(path.basename(filePath))
        }
      }

      await writeFile(modpackPath, JSON.stringify(data, null, 2))

      return {
        success: true,
        copied,
        failed,
        message: `Đã thêm ${copied.length} mod${failed.length > 0 ? `, thất bại ${failed.length}` : ''}`
      }
    })

    ipcMain.handle('getCurrentProfile', async () => {
      const appDataPath = await getAppDataPath()
      const profilesPath = path.join(appDataPath, 'profiles.json')

      try {
        const data = await readFile(profilesPath, 'utf-8')
        const profiles: Profile[] = JSON.parse(data)
        const selected = profiles.find(p => p.isSelected)
        const def = profiles.find(p => p.isDefault)
        return selected || def || profiles[0] || null
      } catch {
        return null
      }
    })

    ipcMain.handle('getDefaultProfile', async () => {
      const appDataPath = await getAppDataPath()
      const profilesPath = path.join(appDataPath, 'profiles.json')
      try {
        const data = await readFile(profilesPath, 'utf-8')
        const profiles: Profile[] = JSON.parse(data)
        return profiles.find(p => p.isDefault) || profiles[0] || null
      } catch {
        return null
      }
    })

    ipcMain.handle('profile:openScreenshotsFolder', async (_event, gameDirectory: string) => {
      const screenshotsDir = path.join(gameDirectory, 'screenshots')
      try {
        await shell.openPath(screenshotsDir)
        return true
      } catch (err) {
        console.error('Lỗi mở thư mục screenshots:', err)
        return false
      }
    })

    ipcMain.handle('profile:getScreenshots', async (_event, gameDirectory: string) => {
      const screenshotsDir = path.join(gameDirectory, 'screenshots')
      try {
        await mkdir(screenshotsDir, { recursive: true })
        const files = await readdir(screenshotsDir)
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']

        const screenshots = await Promise.all(
          files
            .filter(f => imageExtensions.some(ext => f.toLowerCase().endsWith(ext)))
            .sort((a, b) => b.localeCompare(a)) 
            .map(async (filename) => {
              const fullPath = path.join(screenshotsDir, filename)
              try {
                const buffer = await readFile(fullPath)
                const base64 = buffer.toString('base64')
                const dataUrl = `data:image/png;base64,${base64}`
                const title = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
                return { filename, title, dataUrl, fullPath }
              } catch {
                return null
              }
            })
        )

        return screenshots.filter(Boolean)
      } catch (err) {
        console.error('Lỗi đọc screenshots:', err)
        return []
      }
    })

    ipcMain.handle('profile:deleteScreenshot', async (_event, fullPath: string) => {
      try {
        await unlink(fullPath)
        return true
      } catch (err) {
        console.error('Lỗi xóa ảnh:', err)
        return false
      }
    })

    ipcMain.handle('profile:getResourcePackList', async (_event, gameDirectory: string) => {
      const packsDir = path.join(gameDirectory, 'resourcepacks')
      return await getResourceList(packsDir)
    })

    ipcMain.handle('profile:toggleResourcePack', async (_event, { gameDirectory, filename, enable }: { gameDirectory: string; filename: string; enable: boolean }) => {
      const packsDir = path.join(gameDirectory, 'resourcepacks')
      return await toggleResource(packsDir, filename, enable)
    })

    ipcMain.handle('profile:deleteResourcePack', async (_event, { gameDirectory, filename }: { gameDirectory: string; filename: string }) => {
      const packsDir = path.join(gameDirectory, 'resourcepacks')
      return await deleteResource(packsDir, filename)
    })

    ipcMain.handle('profile:addResourcePacksFromFolder', async (_event, { gameDirectory }: { gameDirectory: string }) => {
      return await addResourcesFromFolder(gameDirectory, 'resourcepacks', 'Resource Pack')
    })

    ipcMain.handle('profile:getDataPackList', async (_event, gameDirectory: string) => {
      const packsDir = path.join(gameDirectory, 'datapacks')
      return await getResourceList(packsDir)
    })

    ipcMain.handle('profile:toggleDataPack', async (_event, { gameDirectory, filename, enable }: { gameDirectory: string; filename: string; enable: boolean }) => {
      const packsDir = path.join(gameDirectory, 'datapacks')
      return await toggleResource(packsDir, filename, enable)
    })

    ipcMain.handle('profile:deleteDataPack', async (_event, { gameDirectory, filename }: { gameDirectory: string; filename: string }) => {
      const packsDir = path.join(gameDirectory, 'datapacks')
      return await deleteResource(packsDir, filename)
    })

    ipcMain.handle('profile:addDataPacksFromFolder', async (_event, { gameDirectory }: { gameDirectory: string }) => {
      return await addResourcesFromFolder(gameDirectory, 'datapacks', 'Data Pack')
    })

    ipcMain.handle('profile:getShaderPackList', async (_event, gameDirectory: string) => {
      const packsDir = path.join(gameDirectory, 'shaderpacks')
      return await getResourceList(packsDir)
    })

    ipcMain.handle('profile:toggleShaderPack', async (_event, { gameDirectory, filename, enable }: { gameDirectory: string; filename: string; enable: boolean }) => {
      const packsDir = path.join(gameDirectory, 'shaderpacks')
      return await toggleResource(packsDir, filename, enable)
    })

    ipcMain.handle('profile:deleteShaderPack', async (_event, { gameDirectory, filename }: { gameDirectory: string; filename: string }) => {
      const packsDir = path.join(gameDirectory, 'shaderpacks')
      return await deleteResource(packsDir, filename)
    })

    ipcMain.handle('profile:addShaderPacksFromFolder', async (_event, { gameDirectory }: { gameDirectory: string }) => {
      return await addResourcesFromFolder(gameDirectory, 'shaderpacks', 'Shader Pack')
    })

    ipcMain.handle('profile:update', async (_event, data: { name: string; updates: any }) => {
      try {
        const appDataPath = await getAppDataPath()
        const profilesPath = path.join(appDataPath, 'profiles.json')

        let profiles: any[] = []
        try {
          const content = await readFile(profilesPath, 'utf-8')
          profiles = JSON.parse(content)
        } catch (err) {
          return { success: false, message: 'Không đọc được profiles.json' }
        }

        const index = profiles.findIndex(p => p.name === data.name)
        if (index === -1) {
          return { success: false, message: 'Không tìm thấy profile' }
        }
        profiles[index] = { ...profiles[index], ...data.updates }

        await writeFile(profilesPath, JSON.stringify(profiles, null, 2))
        const { BrowserWindow } = require('electron')
        BrowserWindow.getAllWindows().forEach((win: Electron.BrowserWindow) => {
          win.webContents.send('profiles-updated')
        })

        return { success: true }
      } catch (err: any) {
        console.error('Lỗi cập nhật profile:', err)
        return { success: false, message: err.message || 'Lỗi không xác định' }
      }
    })
} 


