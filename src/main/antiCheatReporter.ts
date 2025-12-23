// src/main/antiCheatReporter.ts
import fs from 'fs/promises'
import { app } from 'electron'
import { getMonitoredServers, MonitoredServer } from './serverList';


export class AntiCheatReporter {
  private static monitoredServers: MonitoredServer[] = [];

  static async loadServers() {
    this.monitoredServers = await getMonitoredServers();
  }

  static get MONITORED_SERVERS(): MonitoredServer[] {
    return this.monitoredServers;
  }

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
      const timeout = setTimeout(() => controller.abort(), 5000)

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
    const lowerIp = ip.toLowerCase();
    return this.MONITORED_SERVERS.some(s => {
      const lowerS = s.ip.toLowerCase();
      return lowerS === lowerIp || 
            lowerIp.endsWith('.' + lowerS) || 
            lowerS.endsWith('.' + lowerIp); 
    });
  }

  static getServerConfig(ip: string): MonitoredServer | undefined {
    const lowerIp = ip.toLowerCase();
    return this.MONITORED_SERVERS.find(s => {
      const lowerS = s.ip.toLowerCase();
      return lowerS === lowerIp || 
            lowerIp.endsWith('.' + lowerS) || 
            lowerS.endsWith('.' + lowerIp);
    });
  }
}