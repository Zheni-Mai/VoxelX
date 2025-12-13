//main/handlers/instances.ts
import { ipcMain, BrowserWindow } from 'electron'

export interface MinecraftInstance {
  id: string          
  name: string
  version: string
  pid: number         
  playerName: string
  gameDir: string
  launchedAt: number
}

let currentInstance: MinecraftInstance | null = null

export const setCurrentInstance = (instance: MinecraftInstance) => {
  currentInstance = instance
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('minecraft-instance-started', instance)
    }
  })
}

export const clearCurrentInstance = () => {
  if (!currentInstance) return
  currentInstance = null
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('minecraft-instance-closed')
    }
  })
}

export const getRunningInstances = (): MinecraftInstance[] => {
  if (!currentInstance) return []
  try {
    process.kill(currentInstance.pid, 0) 
    return [currentInstance]
  } catch {
    clearCurrentInstance()
    return []
  }
}

export const killInstanceByPid = (pid: number): boolean => {
  try {
    process.kill(pid, 'SIGKILL')
    if (currentInstance?.pid === pid) {
      clearCurrentInstance()
    }
    return true
  } catch (err) {
    console.error('Kill failed:', err)
    return false
  }
}

export const registerInstanceHandlers = () => {
  ipcMain.handle('instances:get-running', () => getRunningInstances())
  ipcMain.handle('instances:kill', async (_event, pid: number) => {
    return killInstanceByPid(pid)
  })
}