// main/handlers/index.ts
import { BrowserWindow } from 'electron'
import { registerProfileHandlers } from './profile'
import { registerUpdateHandlers } from './update'

let isRegistered = false

export function registerGlobalHandlers(window: BrowserWindow) {
  if (isRegistered) return

  registerProfileHandlers(window)

  isRegistered = true
  console.log('Tất cả IPC handlers đã được đăng ký')
}