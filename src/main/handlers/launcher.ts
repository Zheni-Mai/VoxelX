
//main/handlers/launcher.ts
import {ipcMain, net, BrowserWindow } from 'electron'
import { Account } from '../types'

declare global {
  var launcher: any 
}

let launcher: any = null

export function registerLauncherHandlers(mainWindow: BrowserWindow) {

    
    launcher = (global as any).launcher

  if (!launcher) {
    console.error('Launcher chưa được khởi tạo ở main.ts!')
    return
  }

  console.log('Launcher handlers đã được đăng ký với clientId:', launcher.currentClientId || 'unknown')

    ipcMain.handle('getMinecraftVersions', async () => {
        const response = await net.fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json')
        const data = await response.json()
        return data.versions.map((v: any) => ({
            id: v.id,
            type: v.type,
            releaseTime: v.releaseTime
        }))
    })

    ipcMain.handle('getFabricVersions', async (_event, gameVersion: string) => {
      try {
        const res = await net.fetch(`https://meta.fabricmc.net/v2/versions/loader/${gameVersion}`)
        if (!res.ok) return []

        const data: any[] = await res.json()

        const versions = data.map((v: any, index: number) => ({
          version: v.loader.version,
          type: index === 0 ? 'latest' : (index === 1 ? 'recommended' : 'common'),
        }))

        return versions
      } catch (err) {
        console.error('[Fabric] Lỗi tải versions:', err)
        return []
      }
    })

    ipcMain.handle('getForgeVersions', async (_event, gameVersion: string) => {
      try {
        const bmclUrl = `https://bmclapi2.bangbang93.com/forge/minecraft/${gameVersion}`
        let res = await net.fetch(bmclUrl)

        if (!res.ok) {
          console.warn('[Forge] BMCLAPI không khả dụng, fallback sang official promotions')
          const promoRes = await net.fetch('https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json')
          if (!promoRes.ok) return []

          const promoData = await promoRes.json()

          const latestKey = `${gameVersion}-latest`
          const recommendedKey = `${gameVersion}-recommended`

          const latest = promoData.promos[latestKey]
          const recommended = promoData.promos[recommendedKey]

          const versions = []

          if (latest) {
            versions.push({
              version: latest,
              type: 'latest',
              displayVersion: latest,
              date: new Date().toISOString(),
              build: null
            })
          }

          if (recommended && recommended !== latest) {
            versions.push({
              version: recommended,
              type: 'recommended',
              displayVersion: recommended,
              date: new Date().toISOString(),
              build: null
            })
          }

          return versions
        }
        const data: any[] = await res.json()
        const sorted = data.sort((a, b) => b.build - a.build)

        const versions = sorted.map((item, index) => ({
          version: item.version, 
          type: index === 0 ? 'latest' : (index <= 2 ? 'recommended' : 'common'),
          displayVersion: `${item.version} (build ${item.build})`,
          date: item.modified,
          build: item.build
        }))

        return versions
      } catch (err) {
        console.error('[Forge] Lỗi tải danh sách Forge versions:', err)
        return []
      }
    })
        
    ipcMain.handle('getQuiltVersions', async (_event, gameVersion: string) => {
      try {
        const res = await net.fetch(`https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(gameVersion)}`)
        if (!res.ok) return []

        const data: any[] = await res.json()

        const versions = data.map((v: any, index: number) => ({
          version: v.loader.version,
          type: index === 0 
            ? 'latest' 
            : v.loader.stable === true 
              ? 'recommended' 
              : 'common',
        }))

        return versions.sort((a: any, b: any) => {
          if (a.type === 'recommended') return -1
          if (b.type === 'recommended') return 1
          if (a.type === 'latest' && b.type !== 'recommended') return -1
          if (b.type === 'latest' && a.type !== 'recommended') return 1
          return 0
        })
      } catch (err) {
        console.error('Lỗi tải Quilt versions:', err)
        return []
      }
    })
    
    ipcMain.handle('getNeoForgeVersions', async (_event, gameVersion: string) => {
      try {
        const metaRes = await net.fetch('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml')
        if (!metaRes.ok) return []

        const xml = await metaRes.text()
        const versionRegex = /<version>([\d\.\-beta]+)<\/version>/g
        const allVersions: string[] = []
        let match
        while ((match = versionRegex.exec(xml)) !== null) {
          allVersions.push(match[1])
        }

        if (allVersions.length === 0) return []
        const mcMinor = gameVersion.startsWith('1.') ? gameVersion.slice(2) : gameVersion 
        const prefixParts = mcMinor.split('.').slice(0, 2)
        const prefix = prefixParts.join('.') 
        const compatible = allVersions.filter(v => {
          const vParts = v.split('.').slice(0, 2).join('.')
          return vParts.startsWith(prefix)
        })

        if (compatible.length === 0) return []
        compatible.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
        let recommendedIndex = 0
        if (compatible[0].includes('-beta')) {
          const firstStable = compatible.findIndex(v => !v.includes('-beta'))
          if (firstStable !== -1) recommendedIndex = firstStable
        }

        return compatible.map((v, i) => ({
          version: v,
          type: i === 0 ? 'latest' : i === recommendedIndex ? 'recommended' : 'common',
        }))
      } catch (err) {
        console.error('Lỗi tải NeoForge versions:', err)
        return []
      }
    })

    ipcMain.handle('getLiteLoaderVersions', async (_event, gameVersion: string) => {
      try {
        const mcNum = parseFloat(gameVersion);
        if (isNaN(mcNum) || mcNum > 1.12) {
          return [] 
        }

        const res = await net.fetch('https://dl.liteloader.com/versions/versions.json')
        if (!res.ok) return []
        const data: any = await res.json()
        const versionData = data.versions?.[gameVersion]
        if (!versionData) return []
        const versions: { version: string; type: 'latest' | 'common' }[] = []
        const extractVersions = (section: any) => {
          const liteloader = section?.['com.mumfrey:liteloader']
          if (!liteloader) return
          if (liteloader.latest?.version) {
            versions.push({ version: liteloader.latest.version, type: 'latest' })
          }
          for (const key in liteloader) {
            if (key === 'latest') continue
            const item = liteloader[key]
            if (item?.version && (!liteloader.latest || item.version !== liteloader.latest.version)) {
              versions.push({ version: item.version, type: 'common' })
            }
          }
        }
        if (versionData.artefacts) {
          extractVersions(versionData.artefacts)
        }
        if (versions.length === 0 && versionData.snapshots) {
          extractVersions(versionData.snapshots)
        }
        if (versions.length === 0) return []
        return versions.sort((a, b) => (a.type === 'latest' ? -1 : 1))
      } catch (err) {
        console.error('[LiteLoader] Lỗi tải versions:', err)
        return []
      }
    })

    ipcMain.handle('getOptiFineVersions', async (_event, gameVersion: string) => {
      try {
        const res = await net.fetch(`https://bmclapi2.bangbang93.com/optifine/${gameVersion}`)
        if (!res.ok) return []
        const data: any[] = await res.json()
        if (data.length === 0) return []
        const sorted = data.sort((a, b) => {
          if (a.type.includes('pre') && !b.type.includes('pre')) return -1
          if (!a.type.includes('pre') && b.type.includes('pre')) return 1
          return b.patch.localeCompare(a.patch, undefined, { numeric: true })
        })

        const versions = sorted.map((item, index) => ({
          version: `${item.type}_${item.patch}`,
          type: index === 0 ? 'latest' : (item.type.includes('pre') ? 'preview' : 'common'),
          displayVersion: `OptiFine ${item.type} ${item.patch}`,
          forge: item.forge || null
        }))

        return versions
      } catch (err) {
        console.error('[OptiFine] Lỗi tải versions:', err)
        return []
      }
    })

    ipcMain.handle('launcher.launchProfile', async (event, payload: any) => {
      if (!launcher || !mainWindow) {
        mainWindow?.webContents.send('launch-status', {
          type: 'error',
          message: 'Launcher chưa sẵn sàng!'
        })
        return
      }
    
      let profileName: string = ''
      let selectedAccount: Account | null = null
    
      if (typeof payload === 'string') {
        profileName = payload
      } else if (payload && typeof payload === 'object') {
        profileName = payload.profileName || ''
        selectedAccount = payload.account || null
      }
    
      if (!profileName) {
        mainWindow.webContents.send('launch-status', { type: 'error', message: 'Chưa chọn profile!' })
        return
      }
      let username = selectedAccount?.name || 'Player'
      if (!username || username.trim().length < 3) {
        try {
          const last = await launcher.getLastUsername()
          if (last && last.trim().length >= 3) {
            username = last.trim()
          } else {
            throw new Error()
          }
        } catch {
          username = `Player${Math.floor(Math.random() * 9999)}`
        }
      }
    
      console.log(`[Main] Khởi động profile: "${profileName}" | Người chơi: ${username} | Premium: ${!!selectedAccount?.refreshToken}`)
    
      try {
        await launcher.launchProfile(profileName, username, selectedAccount)
        console.log('[Main] Đã gửi lệnh khởi động thành công!')
      } catch (err: any) {
        console.error('[Main] Lỗi:', err)
        mainWindow.webContents.send('launch-status', {
          type: 'error',
          message: `Không thể khởi động:\n${err.message || err}`
        })
      }
    })
    
    ipcMain.handle('launcher.getLastUsername', async () => {
      if (!launcher) return 'Player'
      try {
        return await launcher.getLastUsername()
      } catch {
        return 'Player'
      }
    })

    ipcMain.on('log-window-ready', () => {
      console.log('Log window đã sẵn sàng!')
    })

    ipcMain.handle('upload-to-mclogs', async (_event, content: string) => {
      if (!content?.trim()) return null

      try {
        const formData = new FormData()
        formData.append('content', content)

        const response = await net.fetch('https://api.mclo.gs/1/log', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const text = await response.text()
          console.error('mclo.gs HTTP error:', response.status, text)
          return null
        }

        const json = await response.json()

        if (json?.url) {
          return json.url
        }

        console.error('mclo.gs không trả về URL:', json)
        return null
      } catch (err: any) {
        console.error('Upload mclo.gs thất bại:', err.message)
        return null
      }
    })

}