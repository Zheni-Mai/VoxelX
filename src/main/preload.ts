// src/main/preload.js
import { contextBridge, ipcRenderer } from 'electron'

const allowedListenerChannels = [
  'launch-start',
  'launch-status',
  'minecraft-data',
  'microsoft-login-success',
  'microsoft-login-failed',
  'updater:download-progress',
  'updater:download-complete',
  'updater:download-error',
  'updater:check',
  'updater:start-download',
  'updater:quit-and-install',
  'show-update-complete-notification',
  'online-tracking:update-username',
  'profile:export-start',
  'profile:export-progress',
  'profile:export-complete',
  'elyby-login-success',
  'elyby-login-failed',
  'select-account',
  'launch-closed',
  'open-log-window',
  'minecraft-data',      
  'launch-closed',
  'game-will-launch',
  'game-closed',
  'minecraft-instance-started',
  'minecraft-instance-closed',
  
]

const allowedSendChannels = [
  'log-window',
  'window-minimize',
  'window-maximize',
  'window-unmaximize',
  'window-close',
  'splash-ready',
  'updater:check',
  'updater:start-download',
  'updater:quit-and-install',
  'open-log-window',
  'game-will-launch',    
  'game-closed',      
]

contextBridge.exposeInMainWorld('electronAPI', {
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
  },

  ping: () => ipcRenderer.invoke('ping'),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  selectSkinFile: () => ipcRenderer.invoke('selectSkinFile'),
  changeSkin: (data: { username: string; filePath: string }) =>
    ipcRenderer.invoke('changeSkin', data),
  getLocalSkinBase64: (username: string) =>
    ipcRenderer.invoke('getLocalSkinBase64', username),
  getSystemRam: () => ipcRenderer.invoke('get-system-ram'),
  getDrives: () => ipcRenderer.invoke('get-drives'),

  shell: {
    showItemInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path),
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
  },
  
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  java: {
    ensureJava: (version: 8 | 11 | 17 | 21) => ipcRenderer.invoke('java:ensure', version),
    listAvailable: () => ipcRenderer.invoke('java:list'),
  },

  uploadToMclogs: (content: string): Promise<string | null> => 
    ipcRenderer.invoke('upload-to-mclogs', content),
  
  updater: {
    check: () => ipcRenderer.send('updater:check'),
    startDownload: () => ipcRenderer.send('updater:start-download'),
    quitAndInstall: () => ipcRenderer.send('updater:quit-and-install'), 
    on: (channel: string, callback: Function) => {
      const validChannels = [
        'updater:checking',
        'updater:latest',
        'updater:update-available',
        'updater:download-progress',
        'updater:update-downloaded',
        'updater:error'
      ]
      if (validChannels.includes(channel)) {
        const handler = (_: any, ...args: any[]) => callback(...args)
        ipcRenderer.on(channel, handler)
        return () => ipcRenderer.removeListener(channel, handler)
      }
      return () => {}
    },
  },
  createLogWindow: () => ipcRenderer.send('log-window'),
  logWindow: {
    ready: () => ipcRenderer.send('log-window-ready')
  },
  profileAPI: {
    getAppDataPath: () => ipcRenderer.invoke('getAppDataPath'),
    listProfiles: (path: string) => ipcRenderer.invoke('listProfiles', path),
    saveProfile: (data: any) => ipcRenderer.invoke('saveProfile', data),
    setDefaultProfile: (data: any) => ipcRenderer.invoke('setDefaultProfile', data),
    getMinecraftVersions: () => ipcRenderer.invoke('getMinecraftVersions'),
    getFabricVersions: (gameVersion: string) => ipcRenderer.invoke('getFabricVersions', gameVersion),
    selectGameDirectory: () => ipcRenderer.invoke('selectGameDirectory'),
    openGameDirectory: (path: string) => ipcRenderer.invoke('openGameDirectory', path),
    getModList: (gameDirectory: string) => ipcRenderer.invoke('profile:getModList', gameDirectory),
    toggleMod: (data: { gameDirectory: string; filename: string; enable: boolean }) => ipcRenderer.invoke('profile:toggleMod', data),
    deleteMod: (data: { gameDirectory: string; filename: string }) => ipcRenderer.invoke('profile:deleteMod', data),
    deleteProfile: (data: { appDataPath: string; profileName: string }) => ipcRenderer.invoke('profile:delete', data),
    getFolderSize: (dir: string) => ipcRenderer.invoke('profile:getFolderSize', dir),
    importPack: (filePath: string) => ipcRenderer.invoke('profile:import-pack', filePath),
    searchModrinth: ( query: string, gameVersion?: string, loader?: 'fabric' | 'forge' | 'quilt' | 'all', limit?: number, offset?: number ) => ipcRenderer.invoke('modrinth:search', query, gameVersion, loader, limit, offset),
    getModrinthProject: (id: string) => ipcRenderer.invoke('modrinth:project', id),
    downloadModrinthFile: (fileUrl: string,fileName: string,profilePath: string,metadata?: any) => ipcRenderer.invoke('modrinth:download-file', fileUrl, fileName, profilePath, metadata),
    exportProfile: (data: { gameDirectory: string; profileName: string }) => ipcRenderer.invoke('profile:export', data),
    addModsFromFolder: (data: { gameDirectory: string }) => ipcRenderer.invoke('profile:addModsFromFolder', data),
    recognizeMod: (data: { filePath: string }) => ipcRenderer.invoke('profile:recognizeMod', data),
    setSelectedProfile: (name: string) => ipcRenderer.invoke('profile:setSelected', name),
    getCurrentProfile: () => ipcRenderer.invoke('getCurrentProfile'),
  },

    onToast: (callback: (toast: { id: number; title?: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, toast: any) => callback(toast)
      ipcRenderer.on('show-toast', handler)
      return () => ipcRenderer.removeListener('show-toast', handler)
    },
    removeToast: (id: number) => {
      ipcRenderer.send('hide-toast', id)
    },
  getCustomSkinLoaderSkin: (data: { gameDir: string; username: string }) =>
    ipcRenderer.invoke('getCustomSkinLoaderSkin', data),
  elybyLogin: () => ipcRenderer.invoke('elyby-login'),
  elybyCallback: (code: string, state: string) => ipcRenderer.send('elyby-callback', code, state),

  dialog: {
    showOpenDialog: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke('dialog:showSaveDialog', options),
    showMessageBox: (options: Electron.MessageBoxOptions) =>
      ipcRenderer.invoke('dialog:showMessageBox', options),
  },
  themeAPI: {
    saveTheme: (data: any) => ipcRenderer.invoke('save-theme', data),
    loadTheme: () => ipcRenderer.invoke('load-theme'),
    selectBackgroundImage: () => ipcRenderer.invoke('select-background-image'),
  },
  launcher: {
    launchProfile: (payload: { profileName: string; account: any }) =>
      ipcRenderer.invoke('launcher.launchProfile', payload),
    getLastUsername: () => ipcRenderer.invoke('launcher.getLastUsername'),
  },
  instances: {
    getRunning: () => ipcRenderer.invoke('instances:get-running'),
    kill: (pid: number) => ipcRenderer.invoke('instances:kill', pid),
  },
  accountAPI: {
    getAccounts: (path: string) => ipcRenderer.invoke('getAccounts', path),
    saveAccounts: (data: any) => ipcRenderer.invoke('saveAccounts', data),
    openMicrosoftLogin: () => ipcRenderer.invoke('openMicrosoftLogin'),
  },
  fileAPI: {
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (dir: string, filename: string, content: string) =>
      ipcRenderer.invoke('write-file', dir, filename, content),
    ensureDir: (dir: string) => ipcRenderer.invoke('ensure-dir', dir),
  },
  windowAPI: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    unmaximize: () => ipcRenderer.send('window-unmaximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  },
  on(channel: string, listener: (...args: any[]) => void): () => void {
    if (allowedListenerChannels.includes(channel)) {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: any[]) =>
        listener(...args)
      ipcRenderer.on(channel, subscription)
      return () => ipcRenderer.removeListener(channel, subscription)
    }
    return () => {}
  },
  off(channel: string, listener: (...args: any[]) => void): void {
    if (allowedListenerChannels.includes(channel)) {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: any[]) =>
        listener(...args)
      ipcRenderer.removeListener(channel, subscription)
    }
  },
  removeAllListeners(channel: string) {
    ipcRenderer.removeAllListeners(channel)
  },
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    send: (channel: string, ...args: any[]) => {
      if (allowedSendChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args)
      } else {
        console.warn(`Blocked send on disallowed channel: ${channel}`)
      }
    },
  },
})