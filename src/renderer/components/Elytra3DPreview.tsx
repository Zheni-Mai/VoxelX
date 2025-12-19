// src/renderer/components/Elytra3DPreview.tsx

import { useRef, useEffect, useState } from 'react'
import * as skin3d from 'skin3d'
import type { View } from 'skin3d'

interface Elytra3DPreviewProps {
  username: string
  width?: number
  height?: number
  skinVersion?: number
}

export default function Elytra3DPreview({ 
  username, 
  width = 200, 
  height = 300,
  skinVersion = 0
}: Elytra3DPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<View | null>(null)

  const [skinUrl, setSkinUrl] = useState<string>('')
  const [elytraUrl, setElytraUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadTextures = async () => {
      let skin = ''
      let elytra: string | null = null

      try {
        const localSkin = await window.electronAPI.getLocalSkinBase64(username)
        const localElytra = await window.electronAPI.getLocalElytraBase64(username)
        if (localSkin) skin = localSkin
        if (localElytra) elytra = localElytra
      } catch (error) {
        console.error('Error loading local textures:', error)
      }

      setSkinUrl(skin || `https://minotar.net/skin/${username}`)
      setElytraUrl(elytra)
    }

    loadTextures()
  }, [username, skinVersion])

  useEffect(() => {
    if (!containerRef.current || !skinUrl) return
    if (viewerRef.current) {
      viewerRef.current.dispose()
      viewerRef.current = null
      containerRef.current.innerHTML = ''
    }

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    containerRef.current.appendChild(canvas)

    const viewer = new skin3d.View({
      canvas,
      width,
      height,
      skin: skinUrl,
    })
    viewerRef.current = viewer
    viewer.zoom = 0.80
    viewer.fov = 10
    viewer.autoRotate = true
    viewer.autoRotateSpeed = 0.15
    viewer.playerObject.rotation.y = Math.PI
    viewer.globalLight.intensity = 2.6
    viewer.cameraLight.intensity = 1.9
    viewer.background = null
    viewer.playerObject.skin.head.visible = false
    viewer.playerObject.skin.body.visible = false
    viewer.playerObject.skin.leftArm.visible = false
    viewer.playerObject.skin.rightArm.visible = false
    viewer.playerObject.skin.leftLeg.visible = false
    viewer.playerObject.skin.rightLeg.visible = false

    if (elytraUrl) {
      viewer.loadCape(elytraUrl, { backEquipment: "elytra" })
    } else {
      viewer.loadCape(null)
    }

    return () => {
      viewer.dispose()
      if (containerRef.current?.contains(canvas)) {
        containerRef.current.removeChild(canvas)
      }
    }
  }, [skinUrl, elytraUrl, width, height])

  return (
    <div className="bg-black/40 rounded-2xl border border-emerald-500/30 p-4 shadow-xl">
      <div 
        ref={containerRef} 
        style={{ width: `${width}px`, height: `${height}px` }} 
        className="w-full h-full overflow-hidden rounded-lg"
      />
    </div>
  )
}