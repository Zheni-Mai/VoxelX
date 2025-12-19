// src/main/antiCheatReporter.ts
import fs from 'fs/promises'
import { app } from 'electron'

export interface MonitoredServer {
  ip: string
  port: number
  name?: string
}

export class AntiCheatReporter {
  public static readonly MONITORED_SERVERS: MonitoredServer[] = [
    { ip: 'voxelX.enderman.cloud',     port: 50021, name: 'VoxelX Main' },
    { ip: 'mc.voxelx.net',      port: 8080, name: 'VoxelX Hub' },
    { ip: 'hub.voxelx.gg',      port: 8080, name: 'VoxelX Lobby' },
  ]

  private static readonly BANNED_MOD_KEYWORDS = [
    'wurst', 'impact', 'aristois', 'meteor', 'future', 'inertia',
    'bleachhack', 'liquidbounce', 'phobos', 'sigma', 'jex',
    'rise', 'salhack', 'kambrik', 'cheataware', 'xenon',
    'xray', 'x-ray', 'oreesp', 'cavefinder', 'fullbright',
    'freecam', 'fly', 'killaura', 'kill aura', 'jesus', 'noclip',
    'esp', 'tracers', 'aimbot', 'autototem', 'scaffold', 'baritone'
  ].map(k => k.toLowerCase())

  static async scanMods(modsDir: string): Promise<string[]> {
    try {
      const files = await fs.readdir(modsDir)
      const banned: string[] = []

      for (const file of files) {
        if (!file.endsWith('.jar')) continue
        const lowerName = file.toLowerCase()

        if (this.BANNED_MOD_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
          banned.push(file)
        }
      }

      return banned
    } catch (err) {
      console.warn('[AntiCheat] Không thể quét thư mục mods:', err)
      return []
    }
  }

  static async reportToServer(
    playerName: string,
    uuid: string,
    serverIp: string,
    bannedMods: string[]
  ): Promise<boolean> {
    if (bannedMods.length === 0) return true

    const server = this.MONITORED_SERVERS.find(s => 
      s.ip.toLowerCase() === serverIp.toLowerCase() || 
      s.ip.toLowerCase().endsWith('.' + serverIp.toLowerCase())
    )

    if (!server) {
      console.log(`[AntiCheat] Server ${serverIp} không nằm trong danh sách giám sát`)
      return false
    }

    const payload = {
      playerName,
      uuid: uuid.replace(/-/g, ''),
      server: server.name || server.ip,
      launcherVersion: app.getVersion(),
      timestamp: Date.now(),
      bannedMods
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000) // timeout 5s

      const res = await fetch(`http://${server.ip}:${server.port}/anticheat/report`, {
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
        console.log(`[AntiCheat] Đã báo cáo ${bannedMods.length} mod cấm đến ${server.ip}:${server.port}`)
        return true
      } else {
        console.warn(`[AntiCheat] Server trả về lỗi: ${res.status}`)
        return false
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('[AntiCheat] Timeout khi gửi báo cáo')
      } else {
        console.warn('[AntiCheat] Không thể kết nối đến server plugin:', err.message)
      }
      return false
    }
  }

  static isMonitoredServer(ip: string): boolean {
    return this.MONITORED_SERVERS.some(s => 
      s.ip.toLowerCase() === ip.toLowerCase() ||
      s.ip.toLowerCase().endsWith('.' + ip.toLowerCase())
    )
  }

  static getServerConfig(ip: string): MonitoredServer | undefined {
    return this.MONITORED_SERVERS.find(s => 
      s.ip.toLowerCase() === ip.toLowerCase() ||
      s.ip.toLowerCase().endsWith('.' + ip.toLowerCase())
    )
  }
}