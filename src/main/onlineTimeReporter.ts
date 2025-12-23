// src/main/onlineTimeReporter.ts

import { app } from 'electron'
import { AntiCheatReporter } from './antiCheatReporter'
import { MonitoredServer } from './serverList';

export class OnlineTimeReporter {
  private static readonly REPORT_INTERVAL = 30_000 

  private static intervalId: NodeJS.Timeout | null = null
  private static startTime: number = 0
  private static currentServer: MonitoredServer | null = null
  static startTracking(serverIp: string, playerName: string, clientId: string) {
    const server = AntiCheatReporter.getServerConfig(serverIp)
    if (!server) return

    this.currentServer = server
    this.startTime = Date.now()

    if (this.intervalId) clearInterval(this.intervalId)

    this.intervalId = setInterval(async () => {
      await this.sendOnlineTime(playerName, clientId)
    }, this.REPORT_INTERVAL)
    this.sendOnlineTime(playerName, clientId).catch(console.warn)
  }

  static stopTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.currentServer = null
    this.startTime = 0
  }

  private static async sendOnlineTime(playerName: string, clientId: string): Promise<boolean> {
    if (!this.currentServer) return false

    const sessionTime = Math.floor((Date.now() - this.startTime) / 1000) 

    const payload = {
      playerName,
      clientId,
      sessionTime, 
      totalTime: sessionTime, 
      launcherVersion: app.getVersion(),
      timestamp: Date.now()
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const url = `http://${this.currentServer.ip}:${this.currentServer.port}/onlinetime/report`

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `VoxelX-Launcher/${app.getVersion()}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (res.ok) {
        console.log(`[OnlineTime] Gửi thành công (${sessionTime}s)`)
        return true
      } else {
        console.warn(`[OnlineTime] Server trả về lỗi HTTP: ${res.status} ${res.statusText}`)
        return false
      }
    } catch (err: any) {
      console.warn('[OnlineTime] Lỗi khi gửi online time:', err.message)
      return false
    }
  }
  static async sendLauncherAuth(playerName: string, clientId: string, serverIp: string): Promise<boolean> {
    const server = AntiCheatReporter.getServerConfig(serverIp)
    if (!server) return false

    const payload = {
        playerName,
        clientId, 
        launcher: 'VoxelX',
        version: app.getVersion(),
        timestamp: Date.now()
    }

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const res = await fetch(`http://${server.ip}:${server.port}/launcher/auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': `VoxelX-Launcher/${app.getVersion()}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal 
        })

        clearTimeout(timeoutId)

        return res.ok
    } catch (err: any) {
        console.warn('[Launcher Auth] Lỗi gửi xác thực:', err.message)
        return false
    }
  }
}