// src/main/handlers/updater.ts
import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import path from 'path'

let updateWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

export const setUpdaterWindows = (
  main: BrowserWindow | null,
  splash: BrowserWindow | null,
  update: BrowserWindow | null
) => {
  mainWindow = main
  splashWindow = splash
  updateWindow = update
}

const createUpdateWindow = (): BrowserWindow => {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.focus()
    return updateWindow
  }

  updateWindow = new BrowserWindow({
    width: 500,
    height: 720,
    maximizable: true,
    fullscreenable: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const url = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173?mode=update'
    : `file://${path.join(__dirname, '../../renderer/index.html')}?mode=update`

  updateWindow.loadURL(url)

  updateWindow.once('ready-to-show', () => {
    updateWindow?.show()
    updateWindow?.focus()
    updateWindow?.webContents.send('updater:checking')
  })

  updateWindow.on('closed', () => {
    updateWindow = null
  })

  return updateWindow
}

const sendUpdateEvent = (channel: string, ...args: any[]) => {
  const target = updateWindow || splashWindow || mainWindow
  if (target && !target.isDestroyed()) {
    target.webContents.send(channel, ...args)
  }
}

export function registerUpdateHandlers() {
  autoUpdater.logger = require('electron-log')
  ;(autoUpdater.logger as any).transports.file.level = 'info'

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Đang kiểm tra cập nhật...')
    sendUpdateEvent('updater:checking')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Có bản mới:', info.version)
    sendUpdateEvent('updater:update-available', { version: info.version })
    createUpdateWindow()
    autoUpdater.downloadUpdate()
    mainWindow?.webContents.send('play-sound', 'update')
    mainWindow?.webContents.send('show-toast', {
      title: 'Cập nhật mới!',
      message: `Phiên bản ${info.version} đã sẵn sàng tải xuống`,
      type: 'info',
      duration: 8000,
    })
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] Đã là phiên bản mới nhất')
    sendUpdateEvent('updater:latest')
  })

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent)
    console.log(`[Updater] Đang tải: ${percent}%`)
    if (updateWindow && !updateWindow.isDestroyed()) {
      updateWindow.webContents.send('updater:download-progress', percent)
    }
    sendUpdateEvent('updater:download-progress', percent)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] TẢI XONG! Sẵn sàng cài đặt phiên bản:', info.version)

    updateWindow?.webContents.send('updater:update-downloaded')

    mainWindow?.webContents.send('show-toast', {
      title: 'Cập nhật đã tải xong!',
      message: `Khởi động lại để cài đặt v${info.version}`,
      type: 'success',
      duration: 10000,
    })
    setTimeout(() => {
      console.log('[Updater] Thoát app để cài đặt bản mới...')
      autoUpdater.quitAndInstall()
    }, 3000)
  })

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Lỗi:', err.message)
    sendUpdateEvent('updater:error', err.message)
    updateWindow?.webContents.send('updater:error', err.message)
  })
  ipcMain.on('updater:check', () => {
    console.log('[Updater] Người dùng yêu cầu kiểm tra cập nhật...')
    autoUpdater.checkForUpdates()
      .then((result) => {
        if (!result) {
          sendUpdateEvent('updater:latest')
        }
      })
      .catch((err) => {
        console.error('[Updater] Lỗi check update:', err)
        sendUpdateEvent('updater:error', err.message)
        sendUpdateEvent('updater:latest')
      })
  })

  ipcMain.on('updater:start-download', () => {
    console.log('[Updater] Bắt đầu tải cập nhật...')
    autoUpdater.downloadUpdate()
  })

  ipcMain.on('updater:quit-and-install', () => {
    autoUpdater.quitAndInstall()
  })

  return {
    checkForUpdates: () => autoUpdater.checkForUpdates(),
    createUpdateWindow,
  }
}