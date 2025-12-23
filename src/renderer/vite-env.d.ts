// src/renderer/vite-env.d.ts
/// <reference types="vite/client" />

import type { Account } from '../main/types/account'

export interface Profile {
  name: string
  version: string
  loader: 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge' | 'liteloader' | 'optifine'
  gameDirectory: string
  loaderVersion?: string
  optifine?: boolean | string
  installed: boolean
  isDefault?: boolean
  isSelected?: boolean
  icon?: string
  resolution?: { width: number; height: number }
  memory?: { min: string; max: string }
  jvmArgs?: string
  gameArgs?: string
  showLaunchLog?: boolean
  javaVersion?: 8 | 11 | 17 | 21 | 25
  useAuthlibInjector?: boolean
  forceDedicatedGPU?: boolean | null
  enableFeatherUI?: boolean
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
      versions: {
        node: () => string
        chrome: () => string
        electron: () => string
      }
      ping: () => Promise<string>
      getAppVersion: () => Promise<string>
      getSystemRam: () => Promise<{ total: number; free: number }>
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

      invoke: (channel: string, ...args: any[]) => Promise<any>
      getOnlineApiUrl: () => string
      getOnlineCount: () => Promise<string>,

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

      getMojangUUID: (username: string) => Promise<string>;

      profileAPI: {
        getCurrentProfile: () => Promise<Profile | null>
        setCurrentProfile: (profileName: string) => Promise<void>
        getAppDataPath: () => Promise<string>
        listProfiles: (path: string) => Promise<Profile[]>
        saveProfile: (data: any) => Promise<void>
        setDefaultProfile: (data: any) => Promise<any>
        getMinecraftVersions: () => Promise<any[]>
        getFabricVersions: (gameVersion: string) => Promise<string[]>
        getForgeVersions: (gameVersion: string) => Promise<string[]>
        getQuiltVersions: (gameVersion: string) => Promise<string[]>
        getLiteLoaderVersions: (gameVersion: string) => Promise<string[]>
        getNeoForgeVersions: (gameVersion: string) => Promise<string[]>
        getOptiFineVersions: (gameVersion: string) => Promise<string[]>
        selectGameDirectory: () => Promise<string | null>
        openGameDirectory: (path: string) => Promise<boolean>
        getWorldDetails: (gameDirectory: string) => Promise<Array<{
          folderName: string
          name: string
          lastPlayed: number
          size: string
          icon?: string
          levelDatBuffer: number[] | null
        }>>
        deleteWorld: (data: { gameDirectory: string; folderName: string }) => Promise<boolean>
        openSavesFolder: (gameDirectory: string) => Promise<boolean>
        getModList: (gameDirectory: string) => Promise<Array<{
          filename: string
          enabled: boolean
          title?: string
          description?: string
          authors?: string[]
          iconUrl?: string | null
          version?: string
          projectId?: string | null
          fileId?: string | null}>>
        updateProfile: (data: { 
          name: string; 
          updates: Partial<Profile> 
        }) => Promise<{ success: boolean; message?: string }>,
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
        searchModrinth: (
          query: string,
          gameVersion?: string,
          loader?: string,
          limit?: number,
          offset?: number,
          projectType?: 'mod' | 'modpack' | 'resourcepack' | 'datapack' | 'shader'
        ) => Promise<{ hits: ModrinthProject[]; total_hits: number }>
        getModrinthProject: (id: string) => Promise<ModrinthProjectDetails | null>
        getWorldList: (gameDirectory: string) => Promise<string[]>,
        readFile: (filePath: string) => Promise<Uint8Array>,
        stat: (filePath: string) => Promise<{
          isDirectory: boolean
          size: number
          mtime: number
        }>,
        rmdir: (dir: string, options?: { recursive?: boolean }) => Promise<boolean>,
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
          },
          subFolder?: 'mods' | 'shaderpacks' | 'resourcepacks' | 'datapacks',
          worldName?: string 
        ) => Promise<boolean>,
        createTempWorldDatapackCopy: (worldName: string, filename: string) => Promise<string | null>,
        exportProfile: (data: { gameDirectory: string; profileName: string }) => Promise<{ success: boolean; filePath?: string; message?: string }>
        importPack: (filePath: string) => Promise<{ success: boolean; profile?: Profile; message?: string }>
        installModpack: (
          mrpackUrl: string,
          suggestedName?: string
        ) => Promise<{ success: boolean; profile?: Profile; message?: string }>
        addModsFromFolder: (data: { gameDirectory: string }) => Promise<{
          success: boolean
          copied?: string[]
          failed?: string[]
          message: string
        }>

        getScreenshots: (gameDirectory: string) => Promise<Array<{
          filename: string
          title: string
          dataUrl: string
          fullPath: string
        }>>
        openScreenshotsFolder: (gameDirectory: string) => Promise<boolean>
        deleteScreenshot: (fullPath: string) => Promise<boolean>

        recognizeMod: (data: { filePath: string }) => Promise<{
          title: string
          description: string
          authors: string[]
          iconUrl: string | null
          version: string
          projectId: string | null
          fileId: string | null
        } | null>

        getResourcePackList: (gameDirectory: string) => Promise<Array<{
          filename: string
          enabled: boolean
          title: string
          iconUrl: string | null
        }>>
        toggleResourcePack: (data: { gameDirectory: string; filename: string; enable: boolean }) => Promise<boolean>
        deleteResourcePack: (data: { gameDirectory: string; filename: string }) => Promise<boolean>
        addResourcePacksFromFolder: (data: { gameDirectory: string }) => Promise<{
          success: boolean
          copied?: string[]
          failed?: string[]
          message: string
        }>
        
        getShaderPackList: (gameDirectory: string) => Promise<Array<{
          filename: string
          enabled: boolean
          title: string
          iconUrl: string | null
        }>>
        toggleShaderPack: (data: { gameDirectory: string; filename: string; enable: boolean }) => Promise<boolean>
        deleteShaderPack: (data: { gameDirectory: string; filename: string }) => Promise<boolean>
        addShaderPacksFromFolder: (data: { gameDirectory: string }) => Promise<{
          success: boolean
          copied?: string[]
          failed?: string[]
          message: string
        }>
        
        readdir: (dir: string) => Promise<string[]>
        unlink: (filePath: string) => Promise<boolean>

        // Data Packs
        getDataPackList: (gameDirectory: string) => Promise<Array<{
          filename: string
          enabled: boolean
          title: string
          iconUrl: string | null
        }>>
        toggleDataPack: (data: { gameDirectory: string; filename: string; enable: boolean }) => Promise<boolean>
        deleteDataPack: (data: { gameDirectory: string; filename: string }) => Promise<boolean>
        addDataPacksFromFolder: (data: { gameDirectory: string }) => Promise<{
          success: boolean
          copied?: string[]
          failed?: string[]
          message: string
        }>
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
        openExternal: (url: string) => Promise<boolean>
      }

      fileAPI: {
        readFile: (filePath: string) => Promise<string>
        writeFile: (dir: string, filename: string, content: string) => Promise<void>
        ensureDir: (dir: string) => Promise<void>
        
      }

      java: {
        ensureJava: (version: 8 | 11 | 17 | 21) => Promise<boolean>,
        listAvailable: () => Promise<Array<{ version: number; exists: boolean }>>
      },


      getLocalCapeBase64: (username: string) => Promise<string | null>,
      getLocalElytraBase64: (username: string) => Promise<string | null>,

      getCustomSkinLoaderSkin: (data: { gameDir: string; username: string }) => Promise<string | null>,
      getCustomSkinLoaderCape: (data: { gameDir: string; username: string }) => Promise<string | null>,
      getCustomSkinLoaderElytra: (data: { gameDir: string; username: string }) => Promise<string | null>,

      getDrives: () => Promise<any[]>, 

      uploadToMclogs: (content: string) => Promise<string | null>,

      changeCape: (data: {
        username: string
        filePath: string
        gameDir: string
      }) => Promise<boolean>

      changeElytra: (data: {
        username: string
        filePath: string
        gameDir: string
      }) => Promise<boolean>

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