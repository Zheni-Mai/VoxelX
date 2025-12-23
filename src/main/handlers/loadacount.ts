//main/handlers/account.ts
import path from 'path'
import fsPromises from 'fs/promises'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'
import { Account } from '../types'
import { Auth } from 'msmc'
import { exec } from 'child_process'
import { getAppDataPath } from '../utils'
import {app, ipcMain, dialog, BrowserWindow } from 'electron'

const execAsync = promisify(exec)
const {
  mkdir,
  readFile,
  writeFile,
  copyFile,
  rm,
  unlink,
  access,
} = fsPromises

const ELYBY_CLIENT_ID = 'voxelxs'
const ELYBY_CLIENT_SECRET = 'x57aFP2velPTM_iPgQsAXR8pE-P8ZEAVkGyEMruNl4muSFSmaBTAMlTqhAn6xYgn'
const ELYBY_REDIRECT_URI = 'https://foxstudio.site/api/elyby-callback.html'

export function loadAccountHandlers(mainWindow: BrowserWindow) {

    ipcMain.handle('openMicrosoftLogin', async () => {
      try {
        const auth = new Auth("select_account");
        const xbox = await auth.launch("raw");
        const mc = await xbox.getMinecraft();
        const entitlementRes = await fetch('https://api.minecraftservices.com/entitlements/mcstore', {
          headers: { Authorization: `Bearer ${mc.mcToken}` }
        });
        const entitlements = await entitlementRes.json();
        if (!entitlements?.items?.length) {
          throw new Error("Tài khoản Microsoft này chưa sở hữu Minecraft Java Edition!");
        }
        const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
          headers: { Authorization: `Bearer ${mc.mcToken}` }
        });
        if (!profileRes.ok) throw new Error("Không thể lấy thông tin profile!");
        const profile = await profileRes.json();
    
        const uuid = profile.id.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
        const rawXbox: any = xbox;
        const msRefreshToken = rawXbox.rawToken?.refresh_token;
    
        const newAccount: Account = {
          id: `ms-${profile.id}`,
          name: profile.name,
          uuid,
          type: 'microsoft',
          lastUsed: Date.now(),
          accessToken: mc.mcToken,
          refreshToken: mc.mcToken,
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
    
        console.log('Đăng nhập Microsoft thành công:', profile.name);
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
    
    ipcMain.handle('changeSkin', async (_event, { username, filePath }: { username: string; filePath: string }) => {
      try {
        const appDataPath = app.getPath('appData')
        const voxelDir = path.join(appDataPath, '.VoxelX')
        
        const skinDir = path.join(voxelDir, 'skins')
        await mkdir(skinDir, { recursive: true })
    
        const destPath = path.join(skinDir, `${username}.png`)
        await copyFile(filePath, destPath)
    
        return true
      } catch (err) {
        console.error('Lỗi đổi skin:', err)
        return false
      }
    })
    
    ipcMain.handle('getLocalSkinBase64', async (_event, username: string) => {
      try {
        const appDataPath = app.getPath('appData')
        const voxelDir = path.join(appDataPath, '.VoxelX')
    
        const skinPath = path.join(voxelDir, 'skins', `${username}.png`)
        const buffer = await readFile(skinPath)
        return `data:image/png;base64,${buffer.toString('base64')}`
      } catch (err) {
        return null
      }
    })
    
    ipcMain.handle('checkSkinExists', async (_event, username: string) => {
      try {
        const appDataPath = app.getPath('appData')
        const voxelDir = path.join(appDataPath, '.VoxelX')
    
        const skinPath = path.join(voxelDir, 'skins', `${username}.png`)
        await access(skinPath)
        return true
      } catch {
        return false
      }
    })
    
}