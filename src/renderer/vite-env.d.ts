// src/renderer/vite-env.d.ts
/// <reference types="vite/client" />

import type { Account } from '../main/types/account'

interface Profile {
  name: string
  version: string
  loader: 'vanilla' | 'fabric'
  gameDirectory: string
  loaderVersion?: string
  installed: boolean
  isDefault: boolean
}

interface ModrinthProject {
  id: string
  slug: string
  title: string
  description: string
  icon_url?: string
  downloads: number
  author: string
  project_type: 'mod' | 'modpack'
  versions: string[]
  client_side: string
  server_side: string
  follower_count: number
}

interface ModrinthProjectDetails {
  project: any
  versions: any[]
}

interface MinecraftInstance {
  id: string
  name: string
  version: string
  pid: number
  playerName: string
  gameDir: string
  launchedAt: number
}

declare global {
  interface Window {
    electronAPI: {
      [x: string]: any
      versions: {
        node: () => string
        chrome: () => string
        electron: () => string
      }
      ping: () => Promise<string>
      getAppVersion: () => Promise<string>
      on: (channel: string, listener: (...args: any[]) => void) => () => void
      off: (channel: string, listener: (...args: any[]) => void) => void
      removeAllListeners: (channel: string) => void
      windowAPI: {
        minimize: () => void
        maximize: () => void
        unmaximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
      }

      toast: {
        success: (message: string, title?: string) => void
        error: (message: string, title?: string) => void
        warning: (message: string, title?: string) => void
        info: (message: string, title?: string) => void
      }

      onToast: (callback: (toast: {
        id: number
        title?: string
        message: string
        type: 'success' | 'error' | 'warning' | 'info'
      }) => void) => () => void

      removeToast: (id: number) => void

      dialog: {
        showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
        showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
        showMessageBox: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>
      }

      updater: {
        check: () => void
        startDownload: () => void
        quitAndInstall: () => void
        on: (channel: 'updater:checking' | 'updater:latest' | 'updater:update-available' | 'updater:download-progress' | 'updater:update-downloaded' | 'updater:error', callback: (data?: any) => void) => () => void
      }

      instances: {
        getRunning: () => Promise<MinecraftInstance[]>
        kill: (pid: number) => Promise<boolean> 
      }

      logWindow: {
        ready: () => void
      }

      profileAPI: {
        getCurrentProfile: () => Promise<Profile | null>
        setCurrentProfile: (profileName: string) => Promise<void>
        getAppDataPath: () => Promise<string>
        listProfiles: (path: string) => Promise<Profile[]>
        saveProfile: (data: any) => Promise<void>
        setDefaultProfile: (data: any) => Promise<any>
        getMinecraftVersions: () => Promise<any[]>
        getFabricVersions: (gameVersion: string) => Promise<string[]>
        selectGameDirectory: () => Promise<string | null>
        openGameDirectory: (path: string) => Promise<boolean>
        getModList: (gameDirectory: string) => Promise<Array<{
          filename: string
          enabled: boolean
          title?: string
          description?: string
          authors?: string[]
          iconUrl?: string | null
          version?: string
          projectId?: string | null
          fileId?: string | null
        }>>

        toggleMod: (data: { 
          gameDirectory: string
          filename: string
          enable: boolean 
        }) => Promise<boolean>

        deleteMod: (data: { 
          gameDirectory: string
          filename: string 
        }) => Promise<boolean>
        deleteProfile: (data: { appDataPath: string; profileName: string }) => Promise<boolean>
        getFolderSize: (dir: string) => Promise<string>
        searchModrinth: (query: string, gameVersion?: string, loader?: 'fabric' | 'forge' | 'quilt' | 'all', limit?: number, offset?: number) => Promise<{ hits: ModrinthProject[]; total_hits: number }>
        getModrinthProject: (id: string) => Promise<ModrinthProjectDetails | null>
        downloadModrinthFile: (
          fileUrl: string,
          fileName: string,
          profilePath: string,
          metadata?: {
            title?: string
            description?: string
            authors?: string[]
            iconUrl?: string
            version?: string
            projectId?: string
            fileId?: string
          }
        ) => Promise<boolean>
        exportProfile: (data: { gameDirectory: string; profileName: string }) => Promise<{ success: boolean; filePath?: string; message?: string }>
        importPack: (filePath: string) => Promise<{ success: boolean; profile?: Profile; message?: string }>
        addModsFromFolder: (data: { gameDirectory: string }) => Promise<{
          success: boolean
          copied?: string[]
          failed?: string[]
          message: string
        }>

        recognizeMod: (data: { filePath: string }) => Promise<{
          title: string
          description: string
          authors: string[]
          iconUrl: string | null
          version: string
          projectId: string | null
          fileId: string | null
        } | null>
      }

      accountAPI: {
        getAccounts: (path: string) => Promise<any[]>
        saveAccounts: (data: any) => Promise<boolean>
        openMicrosoftLogin: () => Promise<void>
      }

      launcher: {
        launchProfile: (payload: { profileName: string; account: Account | null }) => Promise<void>
        getLastUsername?: () => Promise<string>
      }

      themeAPI: {
        saveTheme: (data: any) => Promise<boolean>
        loadTheme: () => Promise<any>
        selectBackgroundImage: () => Promise<string | null>
      }

      shell: {
        showItemInFolder: (path: string) => Promise<boolean>
        openPath: (path: string) => Promise<string>
      }

      fileAPI: {
        readFile: (filePath: string) => Promise<string>
        writeFile: (dir: string, filename: string, content: string) => Promise<void>
        ensureDir: (dir: string) => Promise<void>
      }

      selectSkinFile: () => Promise<string | null>
      changeSkin: (data: {
        username: string
        filePath: string
        gameDir: string
      }) => Promise<boolean>
      getLocalSkinBase64: (username: string) => Promise<string | null>

      elybyLogin: () => Promise<void>
      elybyCallback: (code: string, state: string) => void

      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>
        send: (channel: string, ...args: any[]) => void
        on: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => void
        off: (channel: string, listener: (...args: any[]) => void) => void
        removeAllListeners: (channel: string) => void
      }

      
    }

    toast: {
      success: (message: string, title?: string) => void
      error: (message: string, title?: string) => void
      warning: (message: string, title?: string) => void
      info: (message: string, title?: string) => void
    }
  }

  interface Toast {
    id: number
    title?: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration?: number
  }
}

export {}