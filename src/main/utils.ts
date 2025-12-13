// src/main/utils.ts
import { app, BrowserWindow } from 'electron'
import path from 'path'
import fsPromises from 'fs/promises'
import { promisify } from 'util'
import { exec } from 'child_process'

const execAsync = promisify(exec)
const {
  mkdir,
} = fsPromises

export async function getAppDataPath(): Promise<string> {
  const appData = app.getPath('appData')
    const dir = process.env.NODE_ENV === 'development'
      ? 'C:/VoxelX-test'
      : path.join(appData, '.VoxelX')
  
    await mkdir(dir, { recursive: true })
    console.log('AppDataPath trả về:', dir)
    return dir
}