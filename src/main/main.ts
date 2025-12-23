// main.ts
import path from 'path'
import { basename, dirname, extname, join } from 'path'
import fsPromises from 'fs/promises'
import { existsSync, createReadStream, statSync } from 'fs'
import { Account } from './types'
import { promisify } from 'util'
import { exec } from 'child_process'
import { createServer } from 'http'
import { v4 as uuidv4 } from 'uuid'
import { autoUpdater } from "electron-updater"
import { getAppDataPath } from './utils'
import { registerLauncherHandlers } from './handlers/launcher'
import { CustomMinecraftLauncher } from './launcher'
import { javaManager } from './launcher/javaManager'
import { Tray, net, Menu, nativeImage } from 'electron'
import { registerInstanceHandlers } from './handlers/instances'
import { registerUpdateHandlers, setUpdaterWindows } from './handlers/update'
import { resolveSafePath, getSafeRoot } from './safePath'
import * as DiscordRPC from 'discord-rpc'
import { Server } from 'socket.io';

const execAsync = promisify(exec)
const {
  mkdir,
  readFile,
  unlink,
  readdir,
  writeFile,
  copyFile,
  access,
} = fsPromises

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { registerGlobalHandlers } from './handlers'
import { registerAccountHandlers } from './handlers/account'
import { createRoom, joinRoom, dissolveRoom, handleWebRTCSignaling, activeProxies, getCurrentRoomId, getRoomParticipants } from './webrtc-tcp-proxy';

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let logWindow: BrowserWindow | null = null
let clientUUID: string | null = null
let launcher: CustomMinecraftLauncher | null = null
let updateWindow: BrowserWindow | null = null
let createUpdateWindowFromUpdater: () => BrowserWindow
let tray: Tray | null = null
let musicServerPort: number = 0;

const DISCORD_CLIENT_ID = '1441334202518999091'
const ONLINE_TRACKING_API='https://api.foxstudio.site/online.php'
const ONLINE_API_KEY='day_la_mot_chuoi_bi_mat_rat_dai_va_kho_doan_abc123XYZ789!'

let rpc: DiscordRPC.Client | null = null
let rpcReady = false

const initDiscordRPC = async () => {
  if (!DISCORD_CLIENT_ID) {
    console.log('Discord RPC bị tắt vì chưa cấu hình DISCORD_CLIENT_ID trong .env')
    return
  }

  try {
    rpc = new DiscordRPC.Client({ transport: 'ipc' })

    rpc.on('ready', () => {
      console.log('Discord Rich Presence đã kết nối thành công!')
      rpcReady = true

      rpc?.setActivity({
        details: 'Đang sử dụng VoxelX Launcher',
        state: 'Tham gia ngay',
        largeImageKey: 'logo',
        largeImageText: 'VoxelX - Next Gen Minecraft Launcher',
        smallImageKey: 'play',
        smallImageText: 'Đang trực tuyến',
        startTimestamp: Date.now(),
        instance: false,
        buttons: [
          {
            label: 'Tải VoxelX',
            url: 'https://foxstudio.site'
          }
        ]
      })
    })

    await rpc.login({ clientId: DISCORD_CLIENT_ID })
  } catch (err) {
    console.warn('Không thể kết nối Discord RPC (Discord chưa mở hoặc lỗi?):', err)
  }
}

const destroyRPC = () => {
  if (rpc) {
    rpc.destroy().catch(() => {})
    rpc = null
  }
  rpcReady = false
}
//autoUpdater.forceDevUpdateConfig = false

ipcMain.handle('getAppDataPath', async () => {
  const appData = app.getPath('appData')
  const dir = path.join(appData, '.VoxelX')

  await mkdir(dir, { recursive: true })
  console.log('AppDataPath trả về:', dir)
  return dir
})

const getClientUUID = async (): Promise<string> => {
  if (clientUUID) return clientUUID

  const appDataPath = await getAppDataPath()
  const uuidFile = path.join(appDataPath, 'client.uuid')

  try {
    const data = await readFile(uuidFile, 'utf-8')
    if (data.trim() && data.match(/^[0-9a-f]{8}-/i)) {
      clientUUID = data.trim()
      console.log('Tải UUID cũ:', clientUUID)
      return clientUUID
    }
  } catch {}

  clientUUID = uuidv4()
  await writeFile(uuidFile, clientUUID)
  console.log('Tạo UUID mới:', clientUUID)
  return clientUUID
}
let onlineInterval: NodeJS.Timeout | null = null

ipcMain.handle('get-client-uuid', async () => {
  return await getClientUUID()
})

async function getOnlineCount(): Promise<string> {
  const apiUrl = ONLINE_TRACKING_API
  
  try {
    const request = net.request({
      method: 'GET',
      url: apiUrl + '?t=' + Date.now(),
    })

    return new Promise((resolve, reject) => {
      request.on('response', (response) => {
        let data = ''
        response.on('data', (chunk) => {
          data += chunk
        })
        response.on('end', () => {
          if (response.statusCode !== 200) {
            resolve('Offline')
            return
          }
          try {
            const json = JSON.parse(data)
            if (json.formatted) {
              resolve(json.formatted)
            } else if (json.online !== undefined) {
              const count = json.online
              const formatted = count >= 1000 
                ? (count / 1000).toFixed(1).replace('.0', '') + 'k'
                : count.toString()
              resolve(formatted + ' Play with VoxelX')
            } else {
              resolve('Offline')
            }
          } catch {
            resolve('Offline')
          }
        })
      })

      request.on('error', () => {
        resolve('Offline')
      })

      request.end()
    })
  } catch {
    return 'Offline'
  }
}

ipcMain.handle('get-online-count', async () => {
  return await getOnlineCount()
})

const startOnlineTracking = async (username: string = 'Player') => {
  const uuid = await getClientUUID()
  const apiUrl = ONLINE_TRACKING_API
  const apiKey = ONLINE_API_KEY
  if (!apiUrl) {
    return
  }

  if (!apiKey) {
  }

  const sendHeartbeat = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (apiKey) {
        headers['X-API-Key'] = apiKey
      }

      await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ uuid, username })
      })
    } catch (err) {
      console.warn('Không gửi được heartbeat:', err)
    }
  }

  await sendHeartbeat()
  if (onlineInterval) clearInterval(onlineInterval)
  onlineInterval = setInterval(sendHeartbeat, 30_000)
}

const stopOnlineTracking = () => {
  if (onlineInterval) {
    clearInterval(onlineInterval)
    onlineInterval = null
  }
}

ipcMain.handle('get-system-ram', () => {
  const os = require('os')
  return {
    total: os.totalmem(),
    free: os.freemem()
  }
})

ipcMain.handle('write-file', async (_event, relativeDir: string, filename: string, content: string) => {
  if (
    typeof filename !== 'string' ||
    filename.trim() === '' ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    filename.includes('\0') ||
    filename.startsWith('.')
  ) {
    throw new Error('Tên file không hợp lệ');
  }

  let safeDir: string;
  if (relativeDir === '' || relativeDir.trim() === '') {
    safeDir = await getSafeRoot();
  } else {
    const resolved = await resolveSafePath(relativeDir);
    if (!resolved) {
      throw new Error('Thư mục không hợp lệ hoặc truy cập bị từ chối');
    }
    safeDir = resolved;
  }

  const fullPath = path.join(safeDir, filename.trim());

  const root = await getSafeRoot();
  const resolvedRoot = path.resolve(root);
  if (!path.resolve(fullPath).startsWith(resolvedRoot + path.sep)) {
    throw new Error('Truy cập bị từ chối');
  }

  try {
    await mkdir(safeDir, { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error('Lỗi ghi file:', err);
    throw new Error('Không thể ghi file');
  }
});

ipcMain.handle('read-file', async (_event, relativePath: string) => {
  const safePath = await resolveSafePath(relativePath)
  if (!safePath) {
    throw new Error('Truy cập file bị từ chối')
  }

  try {
    return await readFile(safePath, 'utf-8')
  } catch (err: any) {
    if (err.code === 'ENOENT') return null
    throw err
  }
})

ipcMain.handle('ensure-dir', async (_event, relativeDir: string) => {
  const safeDir = await resolveSafePath(relativeDir)
  if (!safeDir) throw new Error('Truy cập bị từ chối')
  await mkdir(safeDir, { recursive: true })
})

ipcMain.handle('get-drives', async () => {
  const { exec } = require('child_process')
  const util = require('util')
  const execPromise = util.promisify(exec)

  try {
    const { stdout } = await execPromise(
      `powershell -Command "Get-WmiObject Win32_LogicalDisk -Filter 'DriveType=3' | Select DeviceID, Size, FreeSpace, VolumeName | ConvertTo-Json"`,
      { windowsHide: true }
    )

    const drives = JSON.parse(stdout)
    const drivesArray = Array.isArray(drives) ? drives : [drives]

    return drivesArray.map((d: any) => ({
      device: d.DeviceID,
      mountpoint: d.DeviceID + '\\',
      description: d.VolumeName ? `${d.VolumeName} (${d.DeviceID})` : `Local Disk (${d.DeviceID})`,
      total: Number(d.Size || 0),
      free: Number(d.FreeSpace || 0),
      used: Number(d.Size || 0) - Number(d.FreeSpace || 0),
      percent: d.Size ? Math.round(((d.Size - d.FreeSpace) / d.Size) * 100) : 0,
    }))
  } catch (err) {
    console.error('Lỗi lấy thông tin ổ đĩa:', err)
    return []
  }
})

ipcMain.handle('save-theme', async (_event, themeData: any) => {
  try {
    const appDataPath = await getAppDataPath()
    const themeDir = path.join(appDataPath, 'themes')
    await mkdir(themeDir, { recursive: true })
    await writeFile(path.join(themeDir, 'current.json'), JSON.stringify(themeData, null, 2))
    return true
  } catch (err) {
    console.error('Lỗi lưu theme:', err)
    return false
  }
})

ipcMain.handle('load-theme', async () => {
  try {
    const appDataPath = await getAppDataPath()
    const themePath = path.join(appDataPath, 'themes', 'current.json')
    const bgPath = path.join(appDataPath, 'themes', 'background.jpg')

    let theme = {
      name: 'Dark',
      background: { type: 'gradient' } as any,
      accentColor: '#06b6d4',
    }

    try {
      const data = await readFile(themePath, 'utf-8')
      const saved = JSON.parse(data)
      if (saved && saved.background && saved.background.type) {
        theme = saved
      }
    } catch {}
    if (theme.background.type === 'image' && theme.background.image?.startsWith('data:')) {
      return theme
    }
    if (theme.background.type === 'image' && await access(bgPath).then(() => true).catch(() => false)) {
      const fileUrl = 'file:///' + bgPath.replace(/\\/g, '/')
      theme.background.image = fileUrl
    }

    return theme
  } catch (err) {
    return { name: 'Dark', background: { type: 'gradient' }, accentColor: '#06b6d4' }
  }
})

ipcMain.handle('select-background-image', async (): Promise<string | null> => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      title: 'Chọn ảnh nền',
      buttonLabel: 'Chọn ảnh',
      filters: [
        { name: 'Hình ảnh', extensions: ['jpg','jpeg','png','gif','bmp','webp'] },
        { name: 'Tất cả file', extensions: ['*'] },
      ],
      defaultPath: app.getPath('pictures'),
    }) as unknown as { canceled: boolean; filePaths: string[] }

    if (result.canceled || result.filePaths.length === 0) return null

    const source = result.filePaths[0]
    const ext = path.extname(source).toLowerCase()
    if (!['.jpg','.jpeg','.png','.gif','.bmp','.webp'].includes(ext)) return null

    const appDataPath = await getAppDataPath()
    const destFile = path.join(appDataPath, 'themes', 'background.jpg')

    await mkdir(path.dirname(destFile), { recursive: true })
    await copyFile(source, destFile)
    const buffer = await readFile(destFile)
    const mimeType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
    }[ext] || 'image/jpeg'

    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
    return dataUrl
  } catch (err) {
    console.error('Lỗi chọn ảnh:', err)
    return null
  }
})

ipcMain.handle('app:get-version', () => {
  return app.getVersion()
})

ipcMain.handle('dialog:showOpenDialog', async (_event, options: Electron.OpenDialogOptions) => {
  if (!mainWindow) return { canceled: true }
  return await dialog.showOpenDialog(mainWindow, options)
})

ipcMain.handle('dialog:showSaveDialog', async (_event, options: Electron.SaveDialogOptions) => {
  if (!mainWindow) return { canceled: true }
  return await dialog.showSaveDialog(mainWindow, options)
})

ipcMain.handle('shell:showItemInFolder', async (_event, relativePath: string) => {
  const safePath = await resolveSafePath(relativePath)
  if (!safePath) return false
  return shell.showItemInFolder(safePath)
})

ipcMain.handle('shell:openPath', async (_event, relativePath: string) => {
  const safePath = await resolveSafePath(relativePath)
  if (!safePath) return false
  return shell.openPath(safePath)
})

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return false
  }
  try {
    await shell.openExternal(url)
    return true
  } catch {
    return false
  }
})

ipcMain.on('open-log-window', () => {
  if (logWindow && !logWindow.isDestroyed()) {
    if (logWindow.isMinimized()) logWindow.restore()
    logWindow.show()
    logWindow.focus()
    return
  }

  createLogWindow()
})

ipcMain.handle('java:ensure', async (_event, version: 8 | 11 | 17 | 21) => {
  return await javaManager.ensureJava(version)
})

ipcMain.handle('java:list', async () => {
  return await javaManager.listAvailableJavas()
})

ipcMain.handle('readdir', async (_event, relativePath: string) => {
  const safePath = await resolveSafePath(relativePath)
  if (!safePath) return []
  try {
    const entries = await readdir(safePath)
    return entries
  } catch {
    return []
  }
})

ipcMain.handle('music:add-files', async (_event, filePaths: string[]) => {
  const results: Array<{ success: boolean; filename: string; message?: string }> = []

  const musicDir = await resolveSafePath('music')
  if (!musicDir) {
    throw new Error('Access denied')
  }

  for (let filePath of filePaths) {
    try {
      let filename = basename(filePath)
      let destPath = join(musicDir, filename)
      let counter = 1

      while (existsSync(destPath)) {
        const ext = extname(filename)
        const nameWithoutExt = basename(filename, ext)
        filename = `${nameWithoutExt} (${counter})${ext}`
        destPath = join(musicDir, filename)
        counter++
      }

      await mkdir(dirname(destPath), { recursive: true })
      await copyFile(filePath, destPath)

      results.push({
        success: true,
        filename,
      })
    } catch (err: any) {
      results.push({
        success: false,
        filename: basename(filePath),
        message: err.message || 'Copy failed',
      })
    }
  }

  return results
})

ipcMain.handle('copy-file', async (_event, sourceRelative: string, destRelative: string) => {
  const safeSource = await resolveSafePath(sourceRelative)
  const safeDest = await resolveSafePath(destRelative)

  if (!safeSource || !safeDest) {
    throw new Error('Truy cập bị từ chối')
  }

  const root = await getSafeRoot()
  const resolvedRoot = path.resolve(root)
  const resolvedDest = path.resolve(safeDest)
  if (!resolvedDest.startsWith(resolvedRoot + path.sep)) {
    throw new Error('Đích không hợp lệ')
  }

  await mkdir(path.dirname(safeDest), { recursive: true })
  await copyFile(safeSource, safeDest)
})

ipcMain.handle('unlink', async (_event, relativePath: string) => {
  const safePath = await resolveSafePath(relativePath)
  if (!safePath) throw new Error('Truy cập bị từ chối')
  const allowedSubdirs = ['instances', 'music', 'cache', 'themes', 'mods', 'resourcepacks']
  const relative = path.relative(await getSafeRoot(), safePath)
  const firstDir = relative.split(path.sep)[0]

  if (!allowedSubdirs.includes(firstDir)) {
    throw new Error('Không được xóa file ở thư mục này')
  }

  await unlink(safePath)
})

ipcMain.handle('exists', async (_event, relativePath: string) => {
  const safePath = await resolveSafePath(relativePath)
  if (!safePath) return false
  return existsSync(safePath)
})

ipcMain.handle('create-room', async (_event, { localPort }) => {
  return await createRoom(localPort);
});

ipcMain.handle('join-room', async (_event, { roomId, remoteHost, remotePort, username }) => {
  await joinRoom(roomId, remoteHost, remotePort, username); 
});

ipcMain.handle('dissolve-room', (_event, roomId) => {
  dissolveRoom(roomId);
});

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => mainWindow?.maximize())
ipcMain.on('window-unmaximize', () => mainWindow?.unmaximize())
ipcMain.on('window-close', () => mainWindow?.close())
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)

const createSplashWindow = () => {
  splashWindow = new BrowserWindow({
    width: 1450,
    height: 800,
    minWidth: 1200,
    minHeight: 700,
    resizable: false,
    maximizable: true,
    fullscreenable: true,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const url = app.isPackaged
    ? `file://${path.join(__dirname, '../renderer/index.html')}?mode=splash`
    : 'http://localhost:5173?mode=splash'

  splashWindow.loadURL(url)
  if (!app.isPackaged) {
    //splashWindow.webContents.openDevTools({ mode: 'detach' })
  }
  splashWindow.once('ready-to-show', () => {
    splashWindow?.show()
  })
}

const createLogWindow = () => {
  logWindow = new BrowserWindow({
    width: 900,
    height: 500,
    maximizable: true,
    fullscreenable: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  launcher?.setLogWindow(logWindow)
  
  const url = app.isPackaged
    ? `file://${path.join(__dirname, '../renderer/index.html')}?mode=log`
    : 'http://localhost:5173?mode=log'

  logWindow.loadURL(url)
  if (!app.isPackaged) {
    //logWindow.webContents.openDevTools({ mode: 'detach' })
  }
  logWindow.once('ready-to-show', () => {
    logWindow?.show()
  })
}

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1450,
    height: 800,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    resizable: false,
    maximizable: true,
    fullscreenable: true,
    frame: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../renderer/logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setMenu(null)
  //registerLauncherHandlers(mainWindow)

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

function createTray() {
  if (tray) return

  const getIconPath = (): string => {
    if (!app.isPackaged) {
      const devPath = path.join(__dirname, '../../src/renderer/assets/logo.png')
      if (existsSync(devPath)) return devPath
      const devIco = path.join(__dirname, '../../src/renderer/assets/logo.ico')
      if (existsSync(devIco)) return devIco
    }
    const prodPng = path.join(process.resourcesPath, 'assets', 'logo.png')
    if (existsSync(prodPng)) return prodPng
    const prodIco = path.join(process.resourcesPath, 'assets', 'logo.ico')
    if (existsSync(prodIco)) return prodIco
    return path.join(__dirname, '../renderer/assets/logo.ico')
  }

  const iconPath = getIconPath()
  let iconImage = nativeImage.createFromPath(iconPath)
  if (iconImage.isEmpty()) {
    iconImage = nativeImage.createFromBuffer(
      Buffer.from(`
        <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="#0f172a" rx="16"/>
          <text x="32" y="44" font-family="Segoe UI, sans-serif" font-size="36" text-anchor="middle" fill="#06b6d4">V</text>
        </svg>
      `),
      { scaleFactor: 2 }
    )
  }

  const trayIcon = iconImage.resize({ width: 16, height: 16 })
  trayIcon.setTemplateImage(true)

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Hiện VoxelX Launcher', click: () => mainWindow?.show() },
    { 
      label: 'Kiểm tra cập nhật', 
      click: () => {
        if (!createUpdateWindowFromUpdater) {
          console.warn('Updater chưa sẵn sàng')
          return
        }
        const win = createUpdateWindowFromUpdater()
        win.show()
        win.focus()
        win.webContents.send('updater:checking')
        autoUpdater.checkForUpdates()
      }
    },
    { type: 'separator' },
    { label: 'Thoát', click: () => app.quit() },
  ])

  tray.setToolTip('VoxelX')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow?.show())
}

ipcMain.handle('music:delete-file', async (_event, relativeFilename: string) => {
  if (typeof relativeFilename !== 'string' || 
      relativeFilename.includes('/') || 
      relativeFilename.includes('\\') || 
      relativeFilename.includes('..')) {
    throw new Error('Tên file không hợp lệ')
  }

  const musicDir = await resolveSafePath('music')
  if (!musicDir) throw new Error('Access denied')

  const safeFilePath = path.join(musicDir, relativeFilename)

  if (!safeFilePath.startsWith(musicDir + path.sep)) {
    throw new Error('Access denied')
  }

  await unlink(safeFilePath)
  return { success: true }
})

const startMusicServer = async () => {
  const appDataPath = await getAppDataPath()
  const musicDir = path.join(appDataPath, 'music')

  const server = createServer(async (req, res) => {
    if (!req.url || !req.url.startsWith('/music/')) {
      res.writeHead(404)
      res.end()
      return
    }

    const fileName = decodeURIComponent(req.url.slice(7)) 
    const filePath = path.join(musicDir, fileName)

    try {
      const stats = statSync(filePath)
      if (!stats.isFile()) {
        res.writeHead(404)
        res.end()
        return
      }

      const ext = extname(filePath).toLowerCase()
      const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
      }

      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Content-Length': stats.size,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      })

      const stream = createReadStream(filePath)
      stream.pipe(res)
    } catch (err) {
      res.writeHead(404)
      res.end()
    }
  })

  return new Promise<number>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      musicServerPort = (server.address() as any).port;
      resolve(musicServerPort);
    });
  });
}

ipcMain.handle('music:get-server-url', () => {
  if (musicServerPort === 0) return 'http://127.0.0.1:47321';
  return `http://127.0.0.1:${musicServerPort}`;
});

ipcMain.handle('music:get-dir', async () => {
  const appDataPath = await getAppDataPath()
  return path.join(appDataPath, 'music')
})

ipcMain.on('webrtc:offer', (_event, payload) => handleWebRTCSignaling('webrtc:offer', payload));
ipcMain.on('webrtc:answer', (_event, payload) => handleWebRTCSignaling('webrtc:answer', payload));
ipcMain.on('webrtc:candidate', (_event, payload) => handleWebRTCSignaling('webrtc:candidate', payload));

ipcMain.handle('webrtc:check-room', (_event, roomId: string) => {
  const proxy = activeProxies.get(roomId); 
  return proxy !== undefined && proxy.isHost;
});

ipcMain.handle('get-current-lan-room', () => {
  return getCurrentRoomId();
});

ipcMain.handle('get-room-participants', (_event, roomId: string) => {
  return getRoomParticipants(roomId);
});

app.whenReady().then(async () => {
  const updater = registerUpdateHandlers()
  createUpdateWindowFromUpdater = updater.createUpdateWindow
  await startMusicServer()

  autoUpdater.forceDevUpdateConfig = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  let hasUpdate = false
  let updateChecked = false
  let shouldAutoCheck = true
  try {
    const appDataPath = await getAppDataPath()
    const settingsPath = path.join(appDataPath, 'settings', 'settings.json')
    const data = await readFile(settingsPath, 'utf-8')
    const savedSettings = JSON.parse(data)
    shouldAutoCheck = savedSettings.updater?.autoCheckOnStartup ?? true
  } catch (err) {
  }

  const startApp = () => {
    if (hasUpdate && shouldAutoCheck) {
      createUpdateWindowFromUpdater()
      setTimeout(() => autoUpdater.downloadUpdate(), 1000)
    } else {
      createSplashWindow()
      registerGlobalHandlers(splashWindow!)

      ipcMain.once('splash-ready', async () => {
        createMainWindow()
        
        const clientId = await getClientUUID()
        launcher = new CustomMinecraftLauncher(mainWindow!, clientId)
        ;(global as any).launcher = launcher

        mainWindow!.once('ready-to-show', () => {
          splashWindow?.close()
          splashWindow = null
          initDiscordRPC()
          createTray()

          const isAutoStart = process.argv.includes('--hidden')
          if (!isAutoStart) {
            mainWindow?.show()
            mainWindow?.focus()
          }

          setUpdaterWindows(mainWindow, splashWindow, null)
          registerInstanceHandlers()
          registerAccountHandlers(mainWindow!)
          registerLauncherHandlers(mainWindow!)

          ipcMain.on('game-will-launch', () => mainWindow?.hide())
          ipcMain.on('launch-closed', () => mainWindow?.show())
        })
      })
    }

    startOnlineTracking('Player')
    ipcMain.on('online-tracking:update-username', (_e, name) => startOnlineTracking(name))
  }

  if (shouldAutoCheck && (app.isPackaged || autoUpdater.forceDevUpdateConfig)) {
    autoUpdater.once('update-available', () => {
      hasUpdate = true
      updateChecked = true
    })

    autoUpdater.once('update-not-available', () => {
      updateChecked = true
    })

    autoUpdater.once('error', (err) => {
      updateChecked = true
      console.warn('[Updater] Lỗi check update:', err.message)
    })

    console.log('[Updater] Đang kiểm tra cập nhật tự động...')
    autoUpdater.checkForUpdates()

    const timer = setTimeout(() => {
      if (!updateChecked) {
        updateChecked = true
      }
    }, 12000)

    const checkDone = () => {
      if (updateChecked) {
        clearTimeout(timer)
        startApp()
      } else {
        setTimeout(checkDone, 100)
      }
    }
    checkDone()
  } else {
    startApp()
  }
})

ipcMain.on('select-account', (_event, account: Account) => {
  mainWindow?.webContents.send('account-selected', account)
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow()
    ipcMain.once('splash-ready', createMainWindow)
  }
})

app.on('window-all-closed', () => {
  stopOnlineTracking()
  destroyRPC()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopOnlineTracking()
  destroyRPC()
})