// src/renderer/components/PlayerHead.tsx
import { useEffect, useState } from 'react'

interface PlayerHeadProps {
  uuid: string
  username?: string
  size?: number
  className?: string
}

export default function PlayerHead({
  uuid,
  username,
  size = 64,
  className = '',
}: PlayerHeadProps) {
  const [headUrl, setHeadUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  const loadHead = async () => {
    setIsLoading(true)
    setHeadUrl('')

    let finalUrl = ''

      if (!finalUrl && username) {
        try {
          const base64 = await window.electronAPI.getLocalSkinBase64(username)
          if (base64) {
            finalUrl = await createHeadFromSkin(base64, size)
          }
        } catch (err) {
          console.log('Không có skin local cũ cho:', username)
        }
      }

    if (!finalUrl && (uuid.length === 32 || uuid.length === 36)) {
      try {
        const response = await fetch(`http://ely.by/storage/skin/${username}`)
        if (response.ok) {
          const data = await response.json()
          if (data.textures?.SKIN?.url) {
            finalUrl = await createHeadFromUrl(data.textures.SKIN.url, size)
          }
        }
      } catch (err) {
        console.log('Lỗi lấy skin Ely.by cho head')
      }
    }

    if (!finalUrl && uuid.includes('-')) {
      try {
        const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid.replace(/-/g, '')}`)
        if (res.ok) {
          const data = await res.json()
          const skin = data.properties?.find((p: any) => p.name === 'textures')
          if (skin) {
            const textures = JSON.parse(atob(skin.value))
            if (textures.textures.SKIN?.url) {
              finalUrl = await createHeadFromUrl(textures.textures.SKIN.url, size)
            }
          }
        }
      } catch (err) {
        console.log('Lỗi lấy skin Mojang cho head')
      }
    }

    if (!finalUrl && username) {
      finalUrl = `https://minotar.net/helm/${username}/${size}.png`
    }

    if (!finalUrl) {
      const scale = Math.max(8, Math.round(size / 8))
      finalUrl = `https://api.mineatar.io/face/${uuid}?scale=${scale}&overlay`
    }

    setHeadUrl(finalUrl)
    setIsLoading(false)
  }

  loadHead()
}, [username, uuid, size])

const createHeadFromUrl = (skinUrl: string, targetSize: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = skinUrl

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = targetSize
      canvas.height = targetSize
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(`https://minotar.net/helm/${username || uuid}/${targetSize}.png`)
        return
      }

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, targetSize, targetSize)  
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, targetSize, targetSize)

      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = () => {
      resolve(`https://minotar.net/helm/${username || uuid}/${targetSize}.png`)
    }
  })
}

  const createHeadFromSkin = (base64: string, targetSize: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = base64
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = targetSize
        canvas.height = targetSize
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(`https://minotar.net/helm/${username || uuid}/${targetSize}.png`)
          return
        }
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 8, 8, 8, 8, 0, 0, targetSize, targetSize)
        ctx.drawImage(img, 40, 8, 8, 8, 0, 0, targetSize, targetSize)
        resolve(canvas.toDataURL('image/png'))
      }

      img.onerror = () => {
        resolve(`https://minotar.net/helm/${username || uuid}/${targetSize}.png`)
      }
    })
  }

  if (isLoading || !headUrl) {
    return (
      <div
        className={`bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <img
      src={headUrl}
      alt={username || 'Player'}
      width={size}
      height={size}
      className={`rounded-xl object-cover ${className}`}
      style={{ imageRendering: 'pixelated' }}
      key={headUrl}
    />
  )
}