// src/main/launcher/customSkinLoaderManager.ts
import path from 'path'
import fs from 'fs/promises'
import { getAppDataPath } from '../utils'

const CSL_USER_CONFIG = {
  loadlist: [
    {
      name: "LocalSkin",
      type: "Legacy",
      checkPNG: false,
      skin: "LocalSkin/skins/{USERNAME}.png",
      model: "auto",
      cape: "LocalSkin/capes/{USERNAME}.png",
      elytra: "LocalSkin/elytras/{USERNAME}.png"
    },
    {
      name: "MinecraftCapes",
      type: "MinecraftCapesAPI",
      root: "https://api.minecraftcapes.net/profile/"
    },
    {
      name: "GameProfile",
      type: "GameProfile"
    },
    {
      name: "Mojang",
      type: "MojangAPI",
      apiRoot: "https://api.mojang.com/",
      sessionRoot: "https://sessionserver.mojang.com/"
    },
    {
      name: "LittleSkin",
      type: "CustomSkinAPI",
      root: "https://littleskin.cn/csl/"
    },
    {
      name: "BlessingSkin",
      type: "CustomSkinAPI",
      root: "https://skin.prinzeugen.net/"
    },
    {
      name: "ElyBy",
      type: "ElyByAPI",
      root: "http://skinsystem.ely.by/textures/"
    },
    {
      name: "SkinMe",
      type: "UniSkinAPI",
      root: "http://www.skinme.cc/uniskin/"
    },
    {
      name: "TLauncher",
      type: "ElyByAPI",
      root: "https://auth.tlauncher.org/skin/profile/texture/login/"
    },
    {
      name: "GlitchlessGames",
      type: "GlitchlessAPI",
      root: "https://games.glitchless.ru/api/minecraft/users/profiles/textures/?nickname="
    },
    {
      name: "OptiFine",
      type: "Legacy",
      checkPNG: false,
      model: "auto",
      cape: "https://optifine.net/capes/{USERNAME}.png"
    },
    {
      name: "Wynntils",
      type: "WynntilsAPI",
      root: "https://athena.wynntils.com/user/getInfo"
    },
    {
      name: "CloakPlus",
      type: "Legacy",
      checkPNG: false,
      model: "auto",
      cape: "http://161.35.130.99/capes/{USERNAME}.png"
    },
    {
      name: "Cosmetica",
      type: "Legacy",
      checkPNG: false,
      model: "auto",
      cape: "https://api.cosmetica.cc/get/cloak?username={USERNAME}&uuid={STANDARD_UUID}&nothirdparty"
    }
  ],
  enableDynamicSkull: true,
  enableTransparentSkin: true,
  forceLoadAllTextures: true,
  enableCape: true,
  threadPoolSize: 8,
  enableLogStdOut: false,
  cacheExpiry: 30,
  forceUpdateSkull: false,
  enableLocalProfileCache: false,
  enableCacheAutoClean: false,
  forceDisableCache: false
}

async function updateCSLConfig(gameDir: string) {
  const cslDir = path.join(gameDir, 'CustomSkinLoader')
  const configPath = path.join(cslDir, 'CustomSkinLoader.json')

  let currentConfig: any = {}
  try {
    const raw = await fs.readFile(configPath, 'utf-8')
    currentConfig = JSON.parse(raw)
    console.log('[CSL] Đã đọc config hiện tại, giữ nguyên version:', currentConfig.version || 'không có')
  } catch (err: any) {
    if (err.code !== 'ENOENT') console.warn('[CSL] Lỗi đọc config hiện tại:', err)
    currentConfig = { version: "14.26.1", buildNumber: 36 }
  }

  const finalConfig = {
    ...currentConfig,
    ...CSL_USER_CONFIG 
  }

  await fs.writeFile(configPath, JSON.stringify(finalConfig, null, 2), 'utf-8')
  console.log('[CSL] Đã cập nhật CustomSkinLoader.json')
}

export async function applySkinToCustomSkinLoader(
  gameDir: string,
  username: string,
  skinFilePath: string
): Promise<boolean> {
  try {
    const cslDir = path.join(gameDir, 'CustomSkinLoader')
    const localSkinsDir = path.join(cslDir, 'LocalSkin', 'skins') 
    await fs.mkdir(localSkinsDir, { recursive: true })
    await fs.copyFile(skinFilePath, path.join(localSkinsDir, `${username}.png`))
    console.log(`[CSL] Đã lưu skin: ${username}.png → CustomSkinLoader/LocalSkin/skins/`)

    const appDataPath = await getAppDataPath();
    const globalSkinDir = path.join(appDataPath, 'skins');
    await fs.mkdir(globalSkinDir, { recursive: true });
    await fs.copyFile(skinFilePath, path.join(globalSkinDir, `${username}.png`));
    console.log(`[CSL] Đã lưu skin: ${username}.png → ${globalSkinDir}`);

    await updateCSLConfig(gameDir)

    return true
  } catch (err: any) {
    console.error('[CSL] Lỗi khi áp dụng skin:', err)
    return false
  }
}

export async function applyCapeToCustomSkinLoader(
  gameDir: string,
  username: string,
  filePath: string
): Promise<boolean> {
  try {
    const cslDir = path.join(gameDir, 'CustomSkinLoader')
    const localCapesDir = path.join(cslDir, 'LocalSkin', 'capes') 
    await fs.mkdir(localCapesDir, { recursive: true })
    await fs.copyFile(filePath, path.join(localCapesDir, `${username}.png`))
    console.log(`[CSL] Đã lưu cape: ${username}.png → CustomSkinLoader/LocalSkin/capes/`)

    const appDataPath = await getAppDataPath();
    const globalCapeDir = path.join(appDataPath, 'capes');
    await fs.mkdir(globalCapeDir, { recursive: true });
    await fs.copyFile(filePath, path.join(globalCapeDir, `${username}.png`));
    console.log(`[CSL] Đã lưu cape: ${username}.png → ${globalCapeDir}`);

    await updateCSLConfig(gameDir)

    return true
  } catch (err: any) {
    console.error('[CSL] Lỗi khi áp dụng cape:', err)
    return false
  }
}

export async function applyElytraToCustomSkinLoader(
  gameDir: string,
  username: string,
  filePath: string
): Promise<boolean> {
  try {
    const cslDir = path.join(gameDir, 'CustomSkinLoader')
    const localElytrasDir = path.join(cslDir, 'LocalSkin', 'elytras') 
    await fs.mkdir(localElytrasDir, { recursive: true })
    await fs.copyFile(filePath, path.join(localElytrasDir, `${username}.png`))
    console.log(`[CSL] Đã lưu elytra: ${username}.png → CustomSkinLoader/LocalSkin/elytras/`)

    const appDataPath = await getAppDataPath();
    const globalElytraDir = path.join(appDataPath, 'elytras');
    await fs.mkdir(globalElytraDir, { recursive: true });
    await fs.copyFile(filePath, path.join(globalElytraDir, `${username}.png`));
    console.log(`[CSL] Đã lưu elytra: ${username}.png → ${globalElytraDir}`);

    await updateCSLConfig(gameDir)

    return true
  } catch (err: any) {
    console.error('[CSL] Lỗi khi áp dụng elytra:', err)
    return false
  }
}