// src/renderer/components/Cape3DPreview.tsx

import { useRef, useEffect, useState } from 'react'
import { ReactSkinview3d } from 'react-skinview3d'
import type { SkinViewer } from 'skinview3d'

interface Cape3DPreviewProps {
  username: string
  width?: number
  height?: number
  skinVersion?: number
}

export default function Cape3DPreview({ 
  username, 
  width = 200, 
  height = 300,
  skinVersion = 0
}: Cape3DPreviewProps) {
  const viewerRef = useRef<SkinViewer | null>(null)

  const [skinUrl, setSkinUrl] = useState<string>('')
  const [capeUrl, setCapeUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadTextures = async () => {
      let skin = ''
      let cape = null

      if (!skin || !cape) {
        try {
          const localSkin = await window.electronAPI.getLocalSkinBase64(username)
          const localCape = await window.electronAPI.getLocalCapeBase64(username)
          if (localSkin) skin = localSkin
          if (localCape) cape = localCape
        } catch {}
      }
      try {
        const profile = await window.electronAPI.profileAPI.getCurrentProfile()
        if (profile?.gameDirectory) {
          const cslSkin = await window.electronAPI.getCustomSkinLoaderSkin({ gameDir: profile.gameDirectory, username })
          const cslCape = await window.electronAPI.getCustomSkinLoaderCape({ gameDir: profile.gameDirectory, username })
          if (cslSkin) skin = cslSkin
          if (cslCape) cape = cslCape
        }
      } catch {}
      setSkinUrl(skin || `https://minotar.net/skin/${username}`)
      setCapeUrl(cape)
    }

    loadTextures()
  }, [username, skinVersion])

  return (
    <div className="bg-black/40 rounded-2xl border border-purple-500/30 p-4 shadow-xl">
      <ReactSkinview3d
        width={width}
        height={height}
        skinUrl={skinUrl}
        capeUrl={capeUrl || undefined}
        onReady={({ viewer }) => {
          viewerRef.current = viewer
          viewer.zoom = 1.0
          viewer.fov = 50
          viewer.autoRotate = true
          viewer.autoRotateSpeed = 0.15
          //viewer.playerObject.visible = false
          viewer.playerObject.skin.head.visible = false
          viewer.playerObject.skin.body.visible = false
          viewer.playerObject.skin.leftArm.visible = false
          viewer.playerObject.skin.rightArm.visible = false
          viewer.playerObject.skin.leftLeg.visible = false
          viewer.playerObject.skin.rightLeg.visible = false
          viewer.globalLight.intensity = 2.5
          viewer.cameraLight.intensity = 1.8
          viewer.background = null
        }}
      />
    </div>
  )
}