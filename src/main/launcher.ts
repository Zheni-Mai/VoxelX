// src/main/CustomMinecraftLauncher.ts
import { app } from 'electron'
import { watch } from 'fs'
import path from 'path'
import fs from 'fs/promises'
import { spawn } from 'child_process'
import { Account } from './types/account.js'
import { installFabric } from './launcher/loader/fabric.js'
import { resolveFullVersion } from './launcher/loader/fabric.js'
import { ensureVanillaVersion } from './launcher/loader/vanilla.js'
import { installQuilt } from './launcher/loader/quilt.js'
import { installForge } from './launcher/loader/forge.js'
import { installNeoForge } from './launcher/loader/neoforge.js'
import { downloadLibraries, extractNatives, buildClasspath } from './launcher/libraries.js'
import { downloadAssets } from './launcher/assets.js'
import { ensureAuthlib } from './launcher/authlib.js'
import { javaManager } from './launcher/javaManager.js'
import { fileExists } from './launcher/utils.js'
import { startYggdrasilServer, stopYggdrasilServer } from './launcher/yggdrasilServer.js'
import { BrowserWindow } from 'electron'
import { Profile } from '../main/types/profile.js'
import { setCurrentInstance, clearCurrentInstance } from './handlers/instances'
import { injectCustomSkinLoader } from './launcher/customSkinLoader.js'
import { injectFeatherUI } from './launcher/featherUI.js'
import { refreshMicrosoftToken } from './handlers/account.js';
import { installLiteLoader } from './launcher/loader/liteloader.js'
import { installOptiFine } from './launcher/loader/optifine.js'
import { AntiCheatReporter } from './antiCheatReporter.js'
import { OnlineTimeReporter } from './onlineTimeReporter'

export class CustomMinecraftLauncher {
  private mainWindow: Electron.BrowserWindow
  private abortController = new AbortController()
  private logWindow?: Electron.BrowserWindow | null = null
  private screenshotWatcher: any = null
  private currentJoinedServer: string | null = null;
  private currentPlayerName: string = '';
  private currentPlayerUuid: string = '';
  private currentModsDir: string = '';

  constructor(mainWindow: Electron.BrowserWindow) {
    this.mainWindow = mainWindow
  }

  setLogWindow(window: BrowserWindow | null) {
    this.logWindow = window
    console.log('[Launcher] Log window đã được gán:', !!window)
  }

private send(channel: string, data: any) {
  if (this.mainWindow && !this.mainWindow.isDestroyed()) {
    this.mainWindow.webContents.send(channel, data)
  }
  if (this.logWindow && !this.logWindow.isDestroyed()) {
    this.logWindow.webContents.send(channel, data)
  }

  BrowserWindow.getAllWindows().forEach(win => {
    if (win !== this.mainWindow && !win.isDestroyed()) {
      try {
        win.webContents.send(channel, data)
      } catch (e) {
      }
    }
  })
}

  private log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
    console.log(`[CustomLauncher] ${message}`)
    this.send('launch-status', { type: 'log', message, level })
  }

  private progress(percent: number, msg: string) {
    this.send('launch-status', {
      type: 'progress',
      progress: Math.min(99, Math.round(percent)),
      message: msg
    })
  }

  private async downloadFile(url: string, dest: string, name: string, signal: AbortSignal) {
    const res = await fetch(url, { signal })
    if (!res.ok || !res.body) throw new Error(`Tải thất bại: ${url}`)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    const file = await fs.open(dest, 'w')
    const writer = file.createWriteStream()
    let received = 0
    const total = Number(res.headers.get('content-length')) || 0

    for await (const chunk of res.body) {
      received += chunk.length
      writer.write(chunk)
      if (total > 0) {
        this.progress((received / total) * 90, `Tải ${name}...`)
      }
    }
    await writer.close()
    await file.close()
  }

  

  async launchProfile(profileName: string, username: string, account: Account | null = null, accounts: Account[] = []) {
    if (!username?.trim() || username.trim().length < 3) throw new Error('Tên người chơi phải từ 3 ký tự trở lên!')
    const playerName = username.trim()

    this.log(`Khởi động profile "${profileName}" - ${account ? 'Online (Ely.by)' : 'Offline'}: ${playerName}`)
    this.send('launch-start', {})
    this.progress(0, 'Chuẩn bị...')

    this.abortController = new AbortController()
    const signal = this.abortController.signal

    try {
      const appData = await this.getAppDataPath()
      const profiles = await this.listProfiles(appData)
      const profile = profiles.find(p => p.name === profileName)
      if (!profile) throw new Error(`Không tìm thấy profile: ${profileName}`)

      const useInjector = profile.useAuthlibInjector !== false
      const gameDir = path.resolve(profile.gameDirectory)
      await fs.mkdir(gameDir, { recursive: true })
      await this.saveLastUsername(appData, playerName)
      const appDataPath = await this.getAppDataPath()
      let allAccounts: Account[] = []
      try {
        const data = await fs.readFile(path.join(appDataPath, 'accounts.json'), 'utf-8')
        allAccounts = JSON.parse(data)
      } catch {}
      let javaPath: string
      if (profile.javaVersion && [8, 11, 17, 21].includes(profile.javaVersion)) {
        const selectedVersion = profile.javaVersion as 8 | 11 | 17 | 21
        const existing = await javaManager.findBundledJava(selectedVersion)
        if (existing) {
          javaPath = existing.path
        } else {
          javaPath = await javaManager.ensureJava(selectedVersion, (p, msg) => {
            this.progress(5 + p * 0.75, msg)
          })
        }
      } 
      else {
        const minor = parseFloat(profile.version.split('.')[1] || '0')
        const requiredVersion = minor >= 20.5 ? 21 : minor >= 17 ? 17 : 8
        javaPath = await javaManager.ensureJava(requiredVersion as 8 | 11 | 17 | 21, (p, msg) => {
          this.progress(5 + p * 0.75, msg)
        })

        this.log(`Java ${requiredVersion} đã sẵn sàng!`, 'success')
      }

      let versionId = profile.version
      if (profile.loader === 'fabric') {
        const loaderVer = profile.loaderVersion || 'latest'
        versionId = await installFabric(profile.version, loaderVer, gameDir, signal)
        this.log(`Fabric đã được cài → version: ${versionId}`, 'success')
      } else if (profile.loader === 'quilt') {
        const loaderVer = profile.loaderVersion || 'latest'
        versionId = await installQuilt(profile.version, loaderVer, gameDir, signal)
        this.log(`Quilt đã được cài → version: ${versionId}`, 'success')
      } else if (profile.loader === 'forge') {
        if (!profile.loaderVersion) throw new Error('Cần chỉ định loaderVersion cho Forge')

        const forgeFullVersion = await installForge(
          profile.version,
          profile.loaderVersion,
          gameDir,
          javaPath,
          signal
        )
        const versionsDir = path.join(gameDir, 'versions');
        const versionFolders = await fs.readdir(versionsDir);
        const forgeVersionId = versionFolders.find(f => f.includes('forge') && f.startsWith(profile.version));
        if (!forgeVersionId) throw new Error('Không tìm thấy Forge version ID');
        versionId = forgeVersionId;
        this.log(`Forge đã được cài → full version: ${forgeFullVersion}`, 'success')
      } else if (profile.loader === 'neoforge') {
        if (!profile.loaderVersion) throw new Error('Cần chỉ định loaderVersion cho NeoForge')

        versionId = await installNeoForge(
          profile.loaderVersion,
          gameDir,
          javaPath,
          signal
        )

        this.log(`NeoForge đã được cài → version: ${versionId}`, 'success')
      } else if (profile.loader === 'liteloader') {
        if (!profile.loaderVersion) throw new Error('Cần chỉ định loaderVersion cho LiteLoader')

        versionId = await installLiteLoader(
          profile.version,
          profile.loaderVersion,
          gameDir,
          signal
        )

        this.log(`LiteLoader đã được cài → version: ${versionId}`, 'success')

      } else if (profile.loader === 'vanilla' && (profile.optifine === true || typeof profile.optifine === 'string')) {
        const optiVer = typeof profile.optifine === 'string' ? profile.optifine : 'latest'
        versionId = await installOptiFine(  // ← Quan trọng: gán lại versionId từ OptiFine
          profile.version,
          optiVer,
          gameDir,
          javaPath,
          signal,
          undefined,
          this.downloadFile.bind(this)
        )
        this.log(`OptiFine đã được bật → version: ${versionId}`, 'success')
      } else if (profile.loader === 'optifine') {
        if (!profile.loaderVersion) throw new Error('Cần chỉ định loaderVersion cho OptiFine')
        versionId = await installOptiFine(
          profile.version,
          profile.loaderVersion,
          gameDir,
          javaPath,
          signal,
          undefined,
          this.downloadFile.bind(this) 
        )
        this.log(`OptiFine đã được cài → version: ${versionId}`, 'success')
      }
      
      const versionJson = await resolveFullVersion(
        versionId,
        gameDir,
        signal,
        this.log.bind(this),
        ensureVanillaVersion,
        this.mergeVersionJson.bind(this),
        this.downloadFile.bind(this) 
      )

      const clientJar = path.join(gameDir, 'versions', versionId, `${versionId}.jar`)
      if (!await fileExists(clientJar)) {
        await this.downloadFile(versionJson.downloads.client.url, clientJar, 'Client JAR', signal)
      }
      await downloadLibraries(
        versionJson,
        gameDir,
        signal,
        this.log.bind(this),
        this.progress.bind(this) 
      )
      await extractNatives(versionJson, gameDir, this.log.bind(this))
      await downloadAssets(
        versionJson.assetIndex,
        gameDir,
        signal,
        this.log.bind(this),
        this.progress.bind(this) 
      )
      
      const authlibPath = await ensureAuthlib(gameDir, this.downloadFile.bind(this), signal, this.log.bind(this))

      let yggdrasilPort = 25555
      let yggdrasilStarted = false
      try {
        yggdrasilPort = await startYggdrasilServer()
      } catch (err) {
      }
      
      let cslPath: string | null = null
      if (profile.loader === 'fabric') {
        cslPath = await injectCustomSkinLoader(
          profile,
          gameDir,              
          appDataPath,         
          this.downloadFile.bind(this),
          signal,
          this.log.bind(this)
        )
      }

      let featherPath: string | null = null
      if (profile.loader === 'fabric') {
        featherPath = await injectFeatherUI(
          profile,
          gameDir,
          appDataPath,
          this.downloadFile.bind(this),
          signal,
          this.log.bind(this)
        )
      }
      let hasOptiFine = false
      if (profile.loader === 'optifine' || (profile.loader === 'vanilla' && (profile.optifine === true || typeof profile.optifine === 'string'))) {
        hasOptiFine = true
      }
      const classpath = await buildClasspath(versionJson, gameDir, clientJar, profile)
      
      const jvmArgs: string[] = [
        `-Djava.library.path=${path.join(gameDir, 'natives')}`,
        '-Dminecraft.launcher.brand=VoxelX',
        '-Dminecraft.launcher.version=1.0',
        `-Xmx${profile.memory?.max || '6G'}`,
        `-Xms${profile.memory?.min || '2G'}`,
        '-XX:+UseG1GC',
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:G1NewSizePercent=20',
        '-XX:G1ReservePercent=20',
        '-XX:MaxGCPauseMillis=50',
        ...(profile.jvmArgs || [])
      ]

      if (cslPath) {
        jvmArgs.push(`-Dfabric.addMods=${cslPath.replace(/\\/g, '\\\\')}`) 
      }

      if (featherPath) {
        jvmArgs.push(`-Dfabric.addMods=${featherPath.replace(/\\/g, '\\\\')}`)
      }

      const gameArgs: string[] = [
        '--username', playerName,
        '--version', versionJson.id,
        '--gameDir', gameDir,
        '--assetsDir', path.join(gameDir, 'assets'),
        '--assetIndex', versionJson.assetIndex.id,
        '--versionType', 'VoxelX',
        ...(profile.resolution ? ['--width', String(profile.resolution.width), '--height', String(profile.resolution.height)] : []),
        ...(profile.gameArgs || [])
      ]

      let mainClass: string = versionJson.mainClass

      const isOptiFine = profile.loader === 'optifine' || 
        (profile.loader === 'vanilla' && (profile.optifine === true || typeof profile.optifine === 'string'))

      if (isOptiFine) {
        mainClass = 'net.minecraft.launchwrapper.Launch'
        gameArgs.unshift('--tweakClass', 'optifine.OptiFineTweaker')
        jvmArgs.push(
          '-XX:+IgnoreUnrecognizedVMOptions',
          '-XX:+UseConcMarkSweepGC',
          '-XX:+CMSIncrementalMode',
          '-XX:-UseAdaptiveSizePolicy',
          '-XX:+DisableExplicitGC'
        )

        this.log('OptiFine: Đã thêm OptiFineTweaker và tối ưu JVM args', 'success')
      } else {
        mainClass = versionJson.mainClass
      }

      if (profile.loader === 'neoforge') {
        const librariesDir = path.join(gameDir, 'libraries')
        jvmArgs.push(
          '--add-opens=java.base/java.lang.invoke=ALL-UNNAMED',
          `-DlibraryDirectory=${librariesDir}`
        )
        let neoFormVersion = '20240808.144430';
        if (versionJson.neoFormVersion) {
          neoFormVersion = versionJson.neoFormVersion;
        } else if (versionJson.arguments?.game?.includes('--fml.neoFormVersion')) {
        }

        gameArgs.push(
          '--launchTarget', 'neoforgeclient',
          '--fml.neoForgeVersion', profile.loaderVersion!,
          '--fml.mcVersion', profile.version,
          '--fml.neoFormVersion', neoFormVersion
        )
      }

      if (profile.loader === 'forge') {
        gameArgs.push(
          '-Dforge.logging.console.level=DEBUG',
          '-Dfml.earlyprogresswindow=false',
          '-Dforge.forceNoStencil=true',
          '-Dminecraft.launcher.brand=VoxelX',
          '-Dforge.client=true',
          '--launchTarget', 'forge_client'
        );
      }

      if (account?.type === 'microsoft') {
        let currentAccount = account;
        let tokenValid = false;
        try {
          const res = await fetch('https://api.minecraftservices.com/minecraft/profile', {
            headers: { Authorization: `Bearer ${currentAccount.accessToken}` },
            signal
          });
          tokenValid = res.ok;
        } catch (e) {
        }

        if (!tokenValid) {
          //this.log('Token Microsoft đã hết hạn → đang tự động làm mới...', 'info');

          try {
            currentAccount = await refreshMicrosoftToken(account);
            const appDataPath = await this.getAppDataPath();
            const filePath = path.join(appDataPath, 'accounts.json');
            let accounts: Account[] = [];
            try {
              const data = await fs.readFile(filePath, 'utf-8');
              accounts = JSON.parse(data);
            } catch {}
            accounts = accounts.filter(a => a.id !== currentAccount.id);
            accounts.unshift(currentAccount);
            await fs.writeFile(filePath, JSON.stringify(accounts, null, 2));
            this.mainWindow.webContents.send('account-refreshed', currentAccount);
          } catch (err: any) {
            throw new Error(`Không thể làm mới token Microsoft. Vui lòng đăng nhập lại.\nLỗi: ${err.message}`);
          }
        }

        gameArgs.push(
          '--accessToken', currentAccount.accessToken!,
          '--uuid', currentAccount.uuid.replace(/-/g, ''),
          '--userType', 'msa'
        );
      }
      else if (account?.type === 'elyby' && account.accessToken && account.uuid) {
        gameArgs.push(
          '--accessToken', account.accessToken,
          '--clientToken', account.clientToken || '',
          '--uuid', account.uuid.replace(/-/g, ''),
          '--userType', 'legacy'
        )
        jvmArgs.unshift(`-javaagent:${authlibPath}=https://authserver.ely.by`)
      } 
      else {
        const crypto = require('crypto')
        const offlineUuid = crypto.createHash('md5')
          .update('OfflinePlayer:' + playerName, 'utf8')
          .digest('hex')
          .replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5')
        gameArgs.push(
          '--uuid', offlineUuid.replace(/-/g, ''),
          '--accessToken', '0'
        )
        this.currentPlayerUuid = offlineUuid;
      }

      if (account?.uuid) {
        this.currentPlayerUuid = account.uuid;
      }
      this.currentPlayerName = playerName;
      const modsDir = path.join(gameDir, 'mods');
      this.currentModsDir = modsDir;
      this.currentJoinedServer = null;

      this.progress(100, 'Khởi động JVM...')
      this.log('Khởi động Minecraft...', 'success')
      let env: NodeJS.ProcessEnv = { ...process.env }
      if (profile.forceDedicatedGPU !== false) {
        if (process.platform === 'win32') {
          const gpuPreference = profile.forceDedicatedGPU

          if (typeof gpuPreference === 'boolean') {
            const useDedicated = gpuPreference === true
            if (useDedicated) {
              Object.assign(env, {
                __NV_PRIME_RENDER_OFFLOAD: '1',
                __GLX_VENDOR_LIBRARY_NAME: 'nvidia',
                __VK_LAYER_NV_optimus: 'NVIDIA_only',
                VK_ICD_FILENAMES: '',
              })
            } else {
              Object.assign(env, {
                __NV_PRIME_RENDER_OFFLOAD: '0',
                __GLX_VENDOR_LIBRARY_NAME: 'mesa',
                __VK_LAYER_NV_optimus: 'DISABLED',
                DRI_PRIME: '0',
              })
            }
            try {
              const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE!, 'AppData', 'Local')
              const graphicsPath = path.join(localAppData, 'Microsoft', 'Windows', 'GraphicsSettings')
              await fs.mkdir(graphicsPath, { recursive: true })

              const exeName = 'Minecraft.exe'
              const fakeExePath = path.join(gameDir, exeName)
              await fs.writeFile(fakeExePath, '').catch(() => {})

              const appKey = `App_${Buffer.from(fakeExePath).toString('base64').replace(/=/g, '')}`
              const preference = useDedicated ? 2 : 1

              const xml = `<GraphicsSettings><ApplicationPreferences><App Key="${appKey}" Executable="${exeName}" GPUPreference="${preference}"/></ApplicationPreferences></GraphicsSettings>`

              await fs.writeFile(path.join(graphicsPath, 'GraphicsSettings.xml'), xml, { flag: 'w' })
            } catch (err) {
            }

            const openglArgs = useDedicated
              ? [
                  '-Dsun.java2d.d3d=false',
                  '-Dsun.java2d.opengl=true',
                  '-Dsun.java2d.noddraw=true',
                  '-Dorg.lwjgl.opengl.Display.allowSoftwareOpenGL=false'
                ]
              : [
                  '-Dsun.java2d.opengl=true',
                  '-Dsun.java2d.d3d=false',
                  '-Dsun.java2d.noddraw=true',
                  '-Dorg.lwjgl.opengl.libname=opengl32',
                  '-Dorg.lwjgl.opengl.Display.allowSoftwareOpenGL=false'
                ]

            jvmArgs.push(...openglArgs)
          }
        }
      }

      const mc = spawn(javaPath, [...jvmArgs, '-cp', classpath, versionJson.mainClass, ...gameArgs], {
        cwd: gameDir,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      })

      mc.unref()
      process.stdin.unref?.()

      this.startScreenshotWatcher(gameDir)
      mc.stdout?.on('data', (data) => {
        const line = data.toString()
        this.pipeLog(line)

        const joinMatch = line.match(/\[CHAT\] \[§.[^§]*§r\] §fBạn đã kết nối đến server §b(.+)§f!/)
          || line.match(/Connecting to (.+), \d+/)
          || line.match(/Connecting to (.+)/)

        if (joinMatch) {
          const serverIp = joinMatch[1].trim().toLowerCase()
          this.currentJoinedServer = serverIp
          this.log(`Phát hiện join server: ${serverIp}`, 'info')

          if (AntiCheatReporter.isMonitoredServer(serverIp)) {
            this.handleAntiCheatReport(
              this.currentPlayerName,
              this.currentPlayerUuid,
              serverIp,
              this.currentModsDir
            )
          }

          OnlineTimeReporter.startTracking(
            serverIp,
            this.currentPlayerName,
            this.currentPlayerUuid
          )

          OnlineTimeReporter.sendLauncherAuth(
            this.currentPlayerName,
            this.currentPlayerUuid,
            serverIp
          ).catch(() => {})
        }

        if (line.includes('Lost connection') || line.includes('Kicked') || line.includes('Disconnected')) {
          this.currentJoinedServer = null
          OnlineTimeReporter.stopTracking()
        }
      })

      mc.stderr?.on('data', d => this.pipeLog(d.toString(), '[ERR] '))
      mc.on('close', (code) => {
        if (yggdrasilStarted) stopYggdrasilServer()
        this.log(`Minecraft thoát (code: ${code})`, code === 0 ? 'info' : 'warn')
        clearCurrentInstance()
        this.stopScreenshotWatcher()
        OnlineTimeReporter.stopTracking()
        this.currentJoinedServer = null
        this.currentPlayerName = ''
        this.currentPlayerUuid = ''
        this.currentModsDir = ''
        const { ipcMain } = require('electron')
        ipcMain.emit('launch-closed', { sender: null }, { code })
        this.send('launch-closed', { code })
      })
      mc.on('error', err => this.log(`Spawn error: ${err.message}`, 'error'))

      this.progress(100, 'Minecraft đã khởi động!')
      this.send('launch-status', { type: 'launch-complete' })
      const runningInstance = {
        id: profileName,
        name: profileName,
        version: versionId,
        pid: mc.pid!,
        launchedAt: Date.now(),
        playerName: playerName,
        gameDir: gameDir
      }

      setCurrentInstance(runningInstance)

      this.send('minecraft-instance-started', runningInstance)
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('game-will-launch')
      }

    } catch (err: any) {
      if (signal.aborted) return this.log('Đã hủy khởi động', 'warn')
      const msg = err?.message || 'Lỗi không xác định'
      this.log(`Lỗi: ${msg}`, 'error')
      this.send('launch-status', { type: 'error', message: msg })
    }
  }

  private pipeLog(data: string, prefix = '') {
    data.split('\n').forEach(line => {
      const l = line.trim()
      if (l) this.send('minecraft-data', prefix + l)
    })
  }
  private mergeVersionJson(parent: any, child: any): any {
    const result: any = { ...parent, ...child }

    if (child.libraries && parent.libraries) {
      const childLibKeyMap = new Map<string, any>()
      for (const lib of child.libraries) {
        if (lib.name) {
          const parts = lib.name.split(':')
          if (parts.length >= 2) {
            const key = `${parts[0]}:${parts[1]}`
            childLibKeyMap.set(key, lib)
          }
        }
      }

      const finalLibs: any[] = [...child.libraries]
      for (const lib of parent.libraries) {
        if (!lib.name) {
          finalLibs.push(lib)
          continue
        }
        const parts = lib.name.split(':')
        if (parts.length < 2) {
          finalLibs.push(lib)
          continue
        }
        const key = `${parts[0]}:${parts[1]}`

        if (childLibKeyMap.has(key)) {
          if (
            key === 'org.ow2.asm:asm' ||
            key === 'org.ow2.asm:asm-analysis' ||
            key === 'org.ow2.asm:asm-commons' ||
            key === 'org.ow2.asm:asm-tree' ||
            key === 'org.ow2.asm:asm-util' ||
            key.includes('net.fabricmc') ||
            key.includes('sponge-mixin')
          ) {
            continue
          }
        }
        finalLibs.push(lib)
      }
      result.libraries = finalLibs
    }

    if (child.arguments?.jvm) {
      result.arguments = result.arguments || { jvm: [], game: [] }
      result.arguments.jvm = [...(result.arguments.jvm || []), ...child.arguments.jvm]
    }
    if (child.arguments?.game) {
      result.arguments.game = [...(result.arguments.game || []), ...child.arguments.game]
    }

    return result
  }
  private async getAppDataPath(): Promise<string> {
    const base = app.getPath('appData')
    const dir = process.env.NODE_ENV === 'development' ? 'C:/VoxelX-test' : path.join(base, '.VoxelX')
    await fs.mkdir(dir, { recursive: true })
    return dir
  }

  private async listProfiles(p: string): Promise<Profile[]> {
    try {
      return JSON.parse(await fs.readFile(path.join(p, 'profiles.json'), 'utf-8'))
    } catch {
      return []
    }
  }

  private async saveLastUsername(p: string, name: string) {
    await fs.writeFile(path.join(p, 'launcher.json'), JSON.stringify({ lastUsername: name }, null, 2)).catch(() => {})
  }

  async getLastUsername(): Promise<string> {
    try {
      const d = await fs.readFile(path.join(await this.getAppDataPath(), 'launcher.json'), 'utf-8')
      return JSON.parse(d).lastUsername || ''
    } catch {
      return ''
    }
  }

  private async handleAntiCheatReport(
    playerName: string,
    playerUuid: string,
    serverIp: string,
    modsDir: string
  ) {
    const bannedMods = await AntiCheatReporter.scanMods(modsDir)

    if (bannedMods.length === 0) {
      return
    }

    this.log(`Phát hiện ${bannedMods.length} mod cấm khi join server được giám sát: ${serverIp}`, 'warn')
    this.log(`Mod cấm: ${bannedMods.join(', ')}`, 'warn')

    const success = await AntiCheatReporter.reportToServer(
      playerName,
      playerUuid,
      serverIp,
      bannedMods
    )

    if (success) {
      this.log('Đã gửi báo cáo anti-cheat thành công!', 'success')
    } else {
      this.log('Gửi báo cáo anti-cheat thất bại', 'error')
    }
  }

  private async startScreenshotWatcher(gameDirectory: string) {
    const screenshotsDir = path.join(gameDirectory, 'screenshots')
    this.stopScreenshotWatcher()

    try {
      await fs.mkdir(screenshotsDir, { recursive: true })
      console.log('[ScreenshotWatcher] Thư mục screenshots đã sẵn sàng:', screenshotsDir)
    } catch (error) {
      console.error('[ScreenshotWatcher] Không thể tạo thư mục screenshots:', (error as Error).message)
      return
    }

    console.log('[ScreenshotWatcher] Bắt đầu theo dõi:', screenshotsDir)

    try {
      this.screenshotWatcher = watch(screenshotsDir, (eventType, filename) => {
        if (!filename || eventType !== 'rename') return
        if (!filename.toLowerCase().endsWith('.png')) return

        const fullPath = path.join(screenshotsDir, filename)

        setTimeout(async () => {
          try {
            const buffer = await fs.readFile(fullPath)
            const { clipboard, nativeImage } = require('electron')
            const image = nativeImage.createFromBuffer(buffer)
            clipboard.writeImage(image)

            console.log('[ScreenshotWatcher] Đã tự động copy ảnh vào clipboard:', filename)

            this.send('show-toast', {
              id: Date.now(),
              message: `Đã copy ảnh: ${filename}`,
              type: 'success'
            })

            this.send('screenshot-copied', { filename, fullPath })
          } catch (readError) {
            console.error('[ScreenshotWatcher] Lỗi copy ảnh:', (readError as Error).message)
          }
        }, 800)
      })

      this.screenshotWatcher.on('error', (error: NodeJS.ErrnoException) => {
        console.error('[ScreenshotWatcher] Lỗi watcher:', error.message)
        if (error.code === 'ENOENT') {
          this.stopScreenshotWatcher()
        }
      })

    } catch (watchError) {
      console.error('[ScreenshotWatcher] Không thể bắt đầu watch:', (watchError as Error).message)
    }
  }

  private stopScreenshotWatcher() {
    if (this.screenshotWatcher) {
      this.screenshotWatcher.close()
      this.screenshotWatcher = null
      console.log('[ScreenshotWatcher] Đã dừng theo dõi')
    }
  }

  abort() {
    this.abortController.abort()
    this.log('Đã hủy khởi động', 'warn')
  }
}

export default CustomMinecraftLauncher