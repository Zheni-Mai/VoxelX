//main/handlers/account.ts
import path from 'path'
import fsPromises from 'fs/promises'
import { existsSync } from 'fs'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'
import { Account } from '../types'
import { exec } from 'child_process'
import { getAppDataPath } from '../utils'
import {app, ipcMain, dialog, BrowserWindow } from 'electron'
import { applyCapeToCustomSkinLoader, applyElytraToCustomSkinLoader, applySkinToCustomSkinLoader } from '../launcher/customSkinLoaderManager.js'
import { resolveSafePath } from '../safePath'


const execAsync = promisify(exec)
const {
  mkdir,
  readFile,
  writeFile,
  unlink,
  access,
} = fsPromises



function createRedirectServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = require('http').createServer();
    server.listen(LOGIN_PORT, '127.0.0.1');
    server.on('request', (req: any, res: any) => {
      const url = new URL(req.url, `http://127.0.0.1:${LOGIN_PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      if (error || !code) {
        reject(new Error(error || 'Không nhận được code'));
      } else {
        resolve(code);
      }
      res.end('<script>window.close()</script>');
      server.close();
    });
    setTimeout(() => {
      server.close();
      reject(new Error('Hết thời gian chờ redirect'));
    }, 5 * 60 * 1000);
  });
}

async function getMicrosoftTokens(code: string) {
  const res = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: 'XboxLive.signin offline_access',
    }),
  });
  if (!res.ok) throw new Error(`Lỗi lấy MS token: ${await res.text()}`);
  return await res.json();
}

async function getMinecraftProfile(msAccessToken: string) {
  const xblRes = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${msAccessToken}` },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
    }),
  });
  const xbl = await xblRes.json();
  if (!xbl.Token) throw new Error('Lỗi Xbox Live auth');

  const xstsRes = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Properties: { SandboxId: 'RETAIL', UserTokens: [xbl.Token] },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT',
    }),
  });
  const xsts = await xstsRes.json();
  if (!xsts.Token) throw new Error('Lỗi XSTS');

  const mcRes = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${xsts.DisplayClaims.xui[0].uhs};${xsts.Token}`,
    }),
  });
  const mc = await mcRes.json();
  if (!mc.access_token) throw new Error('Lỗi lấy MC token');

  const entitlementRes = await fetch('https://api.minecraftservices.com/entitlements/mcstore', {
    headers: { Authorization: `Bearer ${mc.access_token}` },
  });
  const entitlements = await entitlementRes.json();
  if (!entitlements?.items?.length) throw new Error('Tài khoản chưa sở hữu Minecraft Java Edition!');

  const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: `Bearer ${mc.access_token}` },
  });
  if (!profileRes.ok) throw new Error('Không lấy được profile');
  const profile = await profileRes.json();

  return {
    accessToken: mc.access_token,
    refreshToken: '',
    uuid: profile.id.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5'),
    name: profile.name,
  };
}

export function registerAccountHandlers(mainWindow: BrowserWindow) {

    ipcMain.handle('openMicrosoftLogin', async () => {
      try {
       const authUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?` +
        new URLSearchParams({
          client_id: CLIENT_ID,
          response_type: 'code',
          redirect_uri: REDIRECT_URI,
          scope: 'XboxLive.signin offline_access',
          prompt: 'select_account',
        }).toString();

        const codePromise = createRedirectServer();

        const authWindow = new BrowserWindow({ width: 600, height: 800, title: 'Đăng nhập Microsoft' });
    authWindow.loadURL(authUrl);

    const code = await codePromise;
    authWindow.close();

    const msTokens = await getMicrosoftTokens(code);
    const mcProfile = await getMinecraftProfile(msTokens.access_token);

    const newAccount: Account = {
      id: `ms-${mcProfile.uuid.replace(/-/g, '')}`,
      name: mcProfile.name,
      uuid: mcProfile.uuid.replace(/-/g, ''),
      type: 'microsoft',
      lastUsed: Date.now(),
      accessToken: mcProfile.accessToken,
      refreshToken: msTokens.refresh_token,
    };
        const appDataPath = await getAppDataPath();
        const filePath = path.join(appDataPath, 'accounts.json');
        let accounts: Account[] = [];
    
        try {
          accounts = JSON.parse(await readFile(filePath, 'utf-8'));
        } catch {}
    
        accounts = accounts.filter(a => a.id !== newAccount.id);
        accounts.unshift(newAccount);
        await writeFile(filePath, JSON.stringify(accounts, null, 2));
    
        mainWindow?.webContents.send('microsoft-login-success', newAccount);
    
        return { success: true, account: newAccount };
    
      } catch (err: any) {
        console.error('Microsoft login failed:', err);
        const msg = err.message?.includes('sở hữu') || err.message?.includes('404')
          ? 'Tài khoản này chưa mua Minecraft Java Edition!'
          : err.message || 'Đăng nhập thất bại';
    
        mainWindow?.webContents.send('microsoft-login-failed', msg);
        return { success: false, error: msg };
      }
    });

    async function isSafeGameDir(gameDir: string): Promise<boolean> {
      if (typeof gameDir !== 'string' || gameDir.trim() === '') return false

      if (!path.isAbsolute(gameDir)) return false

      const resolved = path.resolve(gameDir)
      const hasMinecraft = existsSync(path.join(resolved, '.minecraft')) ||
                          existsSync(path.join(resolved, 'gameDir')) ||
                          resolved.includes('instances') 

      const lower = resolved.toLowerCase()
      if (lower.startsWith(process.env.WINDIR?.toLowerCase() || 'c:\\windows') ||
          lower.startsWith('c:\\program files') ||
          lower.startsWith('c:\\program files (x86)')) {
        return false
      }

      return hasMinecraft
    }
    
    ipcMain.handle('getAccounts', async (_event, appDataPath: string) => {
      const filePath = path.join(appDataPath, 'accounts.json')
      try {
        const data = await readFile(filePath, 'utf-8')
        return JSON.parse(data)
      } catch (err: any) {
        if (err.code === 'ENOENT') return []
        console.error('Lỗi đọc accounts.json:', err)
        return []
      }
    })

    ipcMain.handle('saveAccounts', async (_event, data: { appDataPath: string; accounts: any[] }) => {
      const { appDataPath, accounts } = data
      const filePath = path.join(appDataPath, 'accounts.json')
    
      try {
        await mkdir(appDataPath, { recursive: true })
        await writeFile(filePath, JSON.stringify(accounts, null, 2))
        console.log(`ĐÃ LƯU ${accounts.length} TÀI KHOẢN vào:`, filePath)
        return true
      } catch (err) {
        console.error('Lỗi lưu accounts.json:', err)
        return false
      }
    })

    ipcMain.handle('elyby-login', async () => {
      return new Promise<void>((resolve, reject) => {
        const state = uuidv4()
    
        const authUrl = `https://account.ely.by/oauth2/v1?${new URLSearchParams({
          client_id: ELYBY_CLIENT_ID,
          redirect_uri: ELYBY_REDIRECT_URI,
          response_type: 'code',
          scope: 'account_info offline_access minecraft_server_session',
          state,
          prompt: 'select_account'
        })}`
    
        const authWindow = new BrowserWindow({
          width: 520,
          height: 780,
          show: true,
          resizable: false,
          title: 'Đăng nhập Ely.by – VoxelX',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        })
        const handleRedirect = (url: string) => {
          try {
            const urlObj = new URL(url)
            if (urlObj.origin + urlObj.pathname === new URL(ELYBY_REDIRECT_URI).origin + new URL(ELYBY_REDIRECT_URI).pathname) {
              const code = urlObj.searchParams.get('code')
              const error = urlObj.searchParams.get('error')
              const returnedState = urlObj.searchParams.get('state')
    
              authWindow.close()
    
              if (error) {
                reject(new Error(error === 'access_denied' ? 'Bạn đã từ chối cấp quyền' : error))
                return
              }
              if (!code) {
                reject(new Error('Không nhận được code từ Ely.by'))
                return
              }
              if (returnedState !== state) {
                reject(new Error('State không khớp – có thể bị tấn công CSRF'))
                return
              }
              handleElybyCode(code)
              resolve()
            }
          } catch (e) {
          }
        }
    
        authWindow.webContents.on('will-redirect', (event, url) => {
          event.preventDefault()
          handleRedirect(url)
        })
    
        authWindow.webContents.on('will-navigate', (event, url) => {
          event.preventDefault()
          handleRedirect(url)
        })
    
        authWindow.webContents.on('did-navigate', (event, url) => {
          handleRedirect(url)
        })
        const timeout = setTimeout(() => {
          authWindow.close()
          reject(new Error('Hết thời gian đăng nhập'))
        }, 5 * 60 * 1000)
    
        authWindow.on('closed', () => {
          clearTimeout(timeout)
          if (!authWindow.isDestroyed()) authWindow.destroy()
          reject(new Error('Đóng cửa sổ'))
        })
    
        authWindow.loadURL(authUrl)
      })
    })

    async function handleElybyCode(code: string) {
      try {
        const tokenRes = await fetch('https://account.ely.by/api/oauth2/v1/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: ELYBY_CLIENT_ID,
            client_secret: ELYBY_CLIENT_SECRET,
            redirect_uri: ELYBY_REDIRECT_URI,
            grant_type: 'authorization_code',
            code,
          }),
        });
    
        if (!tokenRes.ok) {
          const text = await tokenRes.text();
          throw new Error(`Ely.by trả lỗi: ${tokenRes.status} – ${text}`);
        }
        const tokenData = await tokenRes.json();
        const userRes = await fetch('https://account.ely.by/api/account/v1/info', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (!userRes.ok) throw new Error('Không lấy được thông tin tài khoản');
        const userData = await userRes.json();
    
        console.log('Đăng nhập Ely.by thành công:', userData.username);
    
        let skinBase64: string | null = null;
        let capeBase64: string | null = null;
        let isSlim = false;
        try {
          const texturesUrl = `https://skinsystem.ely.by/textures/${userData.username}`;
          const texRes = await fetch(texturesUrl, {
            headers: {
              'User-Agent': 'VoxelX/1.0',
              'Accept': 'application/json',
            },
          });
    
          if (texRes.status === 204) {
            console.log('Không có skin/cape (204 No Content)');
          } else if (texRes.ok) {
            const contentType = texRes.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const info = await texRes.json();
    
              if (info.SKIN?.url) {
                skinBase64 = await downloadTextureAsBase64(info.SKIN.url);
                isSlim = info.SKIN.metadata?.model === 'slim';
                console.log('Tải skin từ JSON:', info.SKIN.url, isSlim ? '(slim)' : '');
              }
              if (info.CAPE?.url) {
                capeBase64 = await downloadTextureAsBase64(info.CAPE.url);
                console.log('Tải cape từ JSON:', info.CAPE.url);
              }
            } else {
              console.warn('Server trả PNG thay vì JSON → dùng fallback');
              const buffer = Buffer.from(await texRes.arrayBuffer());
              if (buffer.byteLength > 1000) {
                skinBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
              }
            }
          }
        } catch (err: any) {
          console.warn('Lỗi khi dùng /textures → chuyển sang fallback:', err.message);
        }
        if (!skinBase64) {
          skinBase64 = await downloadTextureAsBase64(
            `https://skinsystem.ely.by/skins/${userData.username}.png`
          );
          if (skinBase64) console.log('Tải skin từ fallback /skins/');
        }
    
        if (!capeBase64) {
          capeBase64 = await downloadTextureAsBase64(
            `https://skinsystem.ely.by/cloaks/${userData.username}.png`
          );
          if (capeBase64) console.log('Tải cape từ fallback /cloaks/');
        }
        const appDataPath = await getAppDataPath();
        const skinDir = path.join(appDataPath, 'skins');
        await mkdir(skinDir, { recursive: true });
    
        if (skinBase64) {
          const buffer = Buffer.from(skinBase64.split(',')[1], 'base64');
          await writeFile(path.join(skinDir, `${userData.username}.png`), buffer);
          if (isSlim) {
            await writeFile(
              path.join(skinDir, `${userData.username}.png.meta`),
              JSON.stringify({ model: 'slim' }, null, 2)
            );
          }
          console.log('Đã lưu skin:', userData.username, isSlim ? '(slim)' : '');
        }
    
        if (capeBase64) {
          const buffer = Buffer.from(capeBase64.split(',')[1], 'base64');
          await writeFile(path.join(skinDir, `${userData.username}_cape.png`), buffer);
          console.log('Đã lưu cape:', userData.username);
        }
        const account: Account = {
          id: `elyby-${userData.uuid.replace(/-/g, '')}`,
          name: userData.username,
          uuid: userData.uuid.replace(/-/g, ''),
          type: 'elyby',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          clientToken: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex'),
          lastUsed: Date.now(),
          authProvider: 'elyby',
        };
    
        const filePath = path.join(appDataPath, 'accounts.json');
        let accounts: Account[] = [];
        try {
          accounts = JSON.parse(await readFile(filePath, 'utf-8'));
        } catch {}
        accounts = accounts.filter(a => a.id !== account.id);
        accounts.unshift(account);
        await writeFile(filePath, JSON.stringify(accounts, null, 2));
        mainWindow?.webContents.send('elyby-login-success', account);
      } catch (err: any) {
        console.error('Ely.by login thất bại:', err);
        mainWindow?.webContents.send('elyby-login-failed', err.message || 'Đăng nhập thất bại');
      }
    }

    async function downloadTextureAsBase64(url: string): Promise<string | null> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
    
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'VoxelX/1.0',
            'Accept': 'image/png,image/*;q=0.9,*/*;q=0.8',
          },
        });
    
        clearTimeout(timeout);
    
        if (res.status === 404) return null;
        if (!res.ok) {
          console.warn(`HTTP ${res.status} khi tải texture:`, url);
          return null;
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.byteLength >= 8 && buffer.toString('hex', 0, 8) === '89504e470d0a1a0a') {
          return `data:image/png;base64,${buffer.toString('base64')}`;
        }
        console.warn('File không phải PNG hợp lệ:', url);
        return null;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Lỗi tải texture:', url, err.message);
        }
        return null;
      }
    }

    ipcMain.handle('selectSkinFile', async () => {
      try {
        const result = await dialog.showOpenDialog(mainWindow!, {
          properties: ['openFile'],
          title: 'Chọn file skin (.png)',
          buttonLabel: 'Chọn Skin',
          filters: [
            { name: 'Skin Minecraft', extensions: ['png'] },
            { name: 'Tất cả file', extensions: ['*'] }
          ]
        }) as any
    
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
          console.log('Người dùng hủy chọn skin')
          return null
        }
    
        const selectedPath = result.filePaths[0]
        console.log('Đã chọn skin:', selectedPath)
        return selectedPath
      } catch (err) {
        console.error('Lỗi mở dialog chọn skin:', err)
        return null
      }
    })
    
    ipcMain.handle('changeSkin', async (_event, { username, filePath, gameDir }: { username: string; filePath: string; gameDir: string }) => {
      if (!gameDir || !/^[a-zA-Z0-9_]{3,16}$/.test(username)) return false
      if (!await isSafeGameDir(gameDir)) return false

      try {
        const success = await applySkinToCustomSkinLoader(gameDir, username, filePath)
        return success
      } catch (err) {
        console.error('Lỗi đổi skin:', err)
        return false
      }
    })
    
    ipcMain.handle('getLocalSkinBase64', async (_event, username: string) => {
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
        return null // Username không hợp lệ theo chuẩn Minecraft
      }

      try {
        const safePath = await resolveSafePath(path.join('skins', `${username}.png`))
        if (!safePath) return null

        const buffer = await readFile(safePath)
        return `data:image/png;base64,${buffer.toString('base64')}`
      } catch (err) {
        return null
      }
    })
    
    ipcMain.handle('checkSkinExists', async (_event, username: string) => {
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
        return false
      }

      try {
        const safePath = await resolveSafePath(path.join('skins', `${username}.png`))
        if (!safePath) return false
        await access(safePath)
        return true
      } catch {
        return false
      }
    })
    
    ipcMain.handle('getCustomSkinLoaderSkin', async (_event, { gameDir, username }: { gameDir: string; username: string }) => {
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) return null
      if (!await isSafeGameDir(gameDir)) return null

      try {
        const skinPath = path.join(gameDir, 'CustomSkinLoader', 'LocalSkin', 'skins', `${username}.png`)
        const resolved = path.resolve(skinPath)
        if (!resolved.startsWith(path.resolve(gameDir))) return null

        const exists = await access(skinPath).then(() => true).catch(() => false)
        if (!exists) return null

        const buffer = await readFile(skinPath)
        return `data:image/png;base64,${buffer.toString('base64')}`
      } catch (err) {
        return null
      }
    })

    ipcMain.handle('changeCape', async (_event, { username, filePath, gameDir }: { username: string; filePath: string; gameDir: string }) => {
      if (!gameDir || !/^[a-zA-Z0-9_]{3,16}$/.test(username)) return false
      if (!await isSafeGameDir(gameDir)) return false

      try {
        const success = await applyCapeToCustomSkinLoader(gameDir, username, filePath)
        return success
      } catch (err) {
        console.error('Lỗi đổi cape:', err)
        return false
      }
    })

    ipcMain.handle('changeElytra', async (_event, { username, filePath, gameDir }: { username: string; filePath: string; gameDir: string }) => {
      if (!gameDir || !/^[a-zA-Z0-9_]{3,16}$/.test(username)) return false
      if (!await isSafeGameDir(gameDir)) return false

      try {
        const success = await applyElytraToCustomSkinLoader(gameDir, username, filePath)
        return success
      } catch (err) {
        console.error('Lỗi đổi elytra:', err)
        return false
      }
    })

    ipcMain.handle('getLocalCapeBase64', async (_event, username: string) => {
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
        return null
      }

      try {
        const safePath = await resolveSafePath(path.join('skins', `${username}_cape.png`))
        if (!safePath) return null

        const buffer = await readFile(safePath)
        return `data:image/png;base64,${buffer.toString('base64')}`
      } catch (err) {
        return null
      }
    })

    ipcMain.handle('getLocalElytraBase64', async (_event, username: string) => {
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
        return null
      }

      try {
        const safePath = await resolveSafePath(path.join('elytras', `${username}.png`))
        if (!safePath) return null

        const buffer = await readFile(safePath)
        return `data:image/png;base64,${buffer.toString('base64')}`
      } catch (err) {
        return null
      }
    })

    ipcMain.handle('getCustomSkinLoaderCape', async (_event, { gameDir, username }: { gameDir: string; username: string }) => {
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) return null
      if (!await isSafeGameDir(gameDir)) return null

      try {
        const capePath = path.join(gameDir, 'CustomSkinLoader', 'LocalSkin', 'capes', `${username}.png`)
        const resolved = path.resolve(capePath)
        if (!resolved.startsWith(path.resolve(gameDir))) return null

        const exists = await access(capePath).then(() => true).catch(() => false)
        if (!exists) return null

        const buffer = await readFile(capePath)
        return `data:image/png;base64,${buffer.toString('base64')}`
      } catch (err) {
        return null
      }
    })

    ipcMain.handle('getCustomSkinLoaderElytra', async (_event, { gameDir, username }: { gameDir: string; username: string }) => {
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) return null
      if (!await isSafeGameDir(gameDir)) return null

      try {
        const elytraPath = path.join(gameDir, 'CustomSkinLoader', 'LocalSkin', 'elytras', `${username}.png`)
        const resolved = path.resolve(elytraPath)
        if (!resolved.startsWith(path.resolve(gameDir))) return null

        const exists = await access(elytraPath).then(() => true).catch(() => false)
        if (!exists) return null

        const buffer = await readFile(elytraPath)
        return `data:image/png;base64,${buffer.toString('base64')}`
      } catch (err) {
        return null
      }
    })

    async function getMojangUUID(username: string): Promise<string | null> {
      try {
        const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
        
        if (res.status === 204 || res.status === 404) {
          return generateOfflineUUID(username);
        }
        
        if (!res.ok) {
          console.warn(`Lỗi khi lấy UUID từ Mojang: ${res.status}`);
          return generateOfflineUUID(username);
        }

        const data = await res.json();
        if (!data.id) return generateOfflineUUID(username);
        return data.id;
      } catch (err) {
        console.error('Lỗi kết nối Mojang API:', err);
        return generateOfflineUUID(username);
      }
    }

    function generateOfflineUUID(username: string): string {
      const namespace = '2581d6f0-4b5e-11e9-8f44-0800200c9a66'; 
      const name = `OfflinePlayer:${username}`;
      
      const crypto = require('crypto');
      const hash = crypto.createHash('md5');
      hash.update(Buffer.from(namespace.replace(/-/g, ''), 'hex'));
      hash.update(Buffer.from(name, 'utf-8'));
      const bytes = hash.digest();
      bytes[6] = (bytes[6] & 0x0f) | 0x30; 
      bytes[8] = (bytes[8] & 0x3f) | 0x80; 
      
      return bytes.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
    }

    ipcMain.handle('get-mojang-uuid', async (_event, username: string) => {
      return await getMojangUUID(username);
    });
}



export async function refreshMicrosoftToken(account: Account): Promise<Account> {
  if (!account.refreshToken) throw new Error('Không có refresh token');

  try {
    const msRes = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token',
        scope: 'XboxLive.signin offline_access',
      }),
    });
    const msTokens = await msRes.json();
    if (!msTokens.access_token) throw new Error('Refresh MS token fail');
    const mcProfile = await getMinecraftProfile(msTokens.access_token);

    return {
      ...account,
      accessToken: mcProfile.accessToken,
      refreshToken: msTokens.refresh_token || account.refreshToken,
      uuid: mcProfile.uuid.replace(/-/g, ''),
      name: mcProfile.name,
      lastUsed: Date.now(),
    };
  } catch (err: any) {
    throw new Error('Refresh thất bại, vui lòng đăng nhập lại: ' + err.message);
  }

  
}
