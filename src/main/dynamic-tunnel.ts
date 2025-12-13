// main/dynamic-tunnel.ts
import { exec } from 'child_process'
import { BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs/promises'

let tunnelProcess: any = null
let currentSubdomain = ''

const TUNNEL_TOKEN = '943ea1fb-8575-4c24-bb50-c55e1fc2fbf7'
const ZONE_ID = '22c84809379ed8402c6683302be75de9'    
const CLOUDFLARE_API_TOKEN = '2PTqVatA7HnZvh2VrJU6clNJmPStD9d4xrYhdlmf'

export async function startDynamicTunnel(localPort: number, mainWindow: BrowserWindow) {
  if (tunnelProcess) stopDynamicTunnel()
  currentSubdomain = generateSubdomain()
  const publicUrl = `${currentSubdomain}.foxstudio.site`

  try {
    await createDnsRecord(currentSubdomain)
    const cloudflaredPath = await ensureCloudflared()
    tunnelProcess = exec(
      `"${cloudflaredPath}" tunnel run --token ${TUNNEL_TOKEN} --url tcp://localhost:${localPort}`,
      { windowsHide: true }
    )
    mainWindow.webContents.send('dynamic-tunnel-success', {
      subdomain: currentSubdomain,
      fullUrl: publicUrl,
      port: localPort
    })

    console.log(`Tunnel tạo thành công: ${publicUrl} → localhost:${localPort}`)
  } catch (err: any) {
    mainWindow.webContents.send('dynamic-tunnel-error', err.message)
  }
}

export function stopDynamicTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill()
    tunnelProcess = null
    if (currentSubdomain) {
      deleteDnsRecord(currentSubdomain)
      currentSubdomain = ''
    }
  }
}

function generateSubdomain() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result + '-' + Date.now().toString(36)
}
async function createDnsRecord(subdomain: string) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'CNAME',
      name: `${subdomain}.foxstudio.site`,
      content: 'your-tunnel-id.cfargotunnel.com', 
      ttl: 120,
      proxied: true
    })
  })

  if (!response.ok) throw new Error('Lỗi tạo DNS')
}

async function deleteDnsRecord(subdomain: string) {
}
async function ensureCloudflared() {
  const appData = require('electron').app.getPath('userData')
  const binPath = path.join(appData, 'cloudflared.exe')

  if (await fs.access(binPath).then(() => true).catch(() => false)) {
    return binPath
  }

  const url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
  const response = await fetch(url)
  const buffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(binPath, buffer)
  return binPath
}