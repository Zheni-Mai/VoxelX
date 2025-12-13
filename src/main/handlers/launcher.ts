
//main/handlers/launcher.ts
import {ipcMain, net, BrowserWindow } from 'electron'
import { CustomMinecraftLauncher } from '../launcher.js'
import { Account } from '../types'
let launcher: CustomMinecraftLauncher | null = null

export function registerLauncherHandlers(mainWindow: BrowserWindow) {

    
    if (!launcher) {
        launcher = new CustomMinecraftLauncher(mainWindow)
        console.log('CustomMinecraftLauncher đã được khởi tạo!')
    }

    ipcMain.handle('getMinecraftVersions', async () => {
        const response = await net.fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json')
        const data = await response.json()
        return data.versions.map((v: any) => ({
            id: v.id,
            type: v.type,
            releaseTime: v.releaseTime
        }))
    })

    ipcMain.handle('getFabricVersions', async (_event, gameVersion: string) => {
        try {
            const res = await net.fetch(`https://meta.fabricmc.net/v2/versions/loader/${gameVersion}`)
            const data = await res.json()
            return data.map((v: any) => v.loader.version)
        } catch {
            return []
        }
    })

    ipcMain.handle('launcher.launchProfile', async (event, payload: any) => {
      if (!launcher || !mainWindow) {
        mainWindow?.webContents.send('launch-status', {
          type: 'error',
          message: 'Launcher chưa sẵn sàng!'
        })
        return
      }
    
      let profileName: string = ''
      let selectedAccount: Account | null = null
    
      if (typeof payload === 'string') {
        profileName = payload
      } else if (payload && typeof payload === 'object') {
        profileName = payload.profileName || ''
        selectedAccount = payload.account || null
      }
    
      if (!profileName) {
        mainWindow.webContents.send('launch-status', { type: 'error', message: 'Chưa chọn profile!' })
        return
      }
      let username = selectedAccount?.name || 'Player'
      if (!username || username.trim().length < 3) {
        try {
          const last = await launcher.getLastUsername()
          if (last && last.trim().length >= 3) {
            username = last.trim()
          } else {
            throw new Error()
          }
        } catch {
          username = `Player${Math.floor(Math.random() * 9999)}`
        }
      }
    
      console.log(`[Main] Khởi động profile: "${profileName}" | Người chơi: ${username} | Premium: ${!!selectedAccount?.refreshToken}`)
    
      try {
        await launcher.launchProfile(profileName, username, selectedAccount)
        console.log('[Main] Đã gửi lệnh khởi động thành công!')
      } catch (err: any) {
        console.error('[Main] Lỗi:', err)
        mainWindow.webContents.send('launch-status', {
          type: 'error',
          message: `Không thể khởi động:\n${err.message || err}`
        })
      }
    })
    
    ipcMain.handle('launcher.getLastUsername', async () => {
      if (!launcher) return 'Player'
      try {
        return await launcher.getLastUsername()
      } catch {
        return 'Player'
      }
    })

    ipcMain.on('log-window-ready', () => {
      console.log('Log window đã sẵn sàng!')
    })

ipcMain.handle('upload-to-mclogs', async (_event, content: string) => {
  if (!content?.trim()) return null

  try {
    const formData = new FormData()
    formData.append('content', content)

    const response = await net.fetch('https://api.mclo.gs/1/log', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('mclo.gs HTTP error:', response.status, text)
      return null
    }

    const json = await response.json()

    if (json?.url) {
      return json.url
    }

    console.error('mclo.gs không trả về URL:', json)
    return null
  } catch (err: any) {
    console.error('Upload mclo.gs thất bại:', err.message)
    return null
  }
})

}