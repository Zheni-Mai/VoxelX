// src/renderer/components/PlayCard.tsx

import { useState, useEffect } from 'react'
import { Play, HardDrive, Settings, Loader2, Settings2, Boxes } from 'lucide-react'
import { Account } from '../../main/types/account'
import PlayerHead from './PlayerHead'
import type { Profile } from '../../main/types/profile'
import { MotionDiv } from '../utils/motion'

interface PlayCardProps {
  currentAccount: Account | null
  skinVersion?: number 
}

export default function PlayCard({ currentAccount, skinVersion = 0 }: PlayCardProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [launching, setLaunching] = useState(false)

  const openModsModal = () => {
    if (!profile) return
    window.dispatchEvent(new CustomEvent('open-mods-modal', { 
      detail: { profile } 
    }))
  }

  const LOADER_DISPLAY: Record<string, string> = {
    vanilla: 'Vanilla',
    fabric: 'Fabric',
    quilt: 'Quilt',
    forge: 'Forge',
    neoforge: 'NeoForge',
    liteloader: 'LiteLoader',
    optifine: 'OptiFine',
  }

  const LOADER_COLOR: Record<string, string> = {
    vanilla: 'text-cyan-400',
    fabric: 'text-purple-400',
    quilt: 'text-pink-400',
    forge: 'text-orange-400',
    neoforge: 'text-lime-400',
    liteloader: 'text-white-400',
    optifine: 'text-red-400',
  }

  useEffect(() => {
    const load = async () => {
      try {
        const path = await window.electronAPI.profileAPI.getAppDataPath()
        const profiles = await window.electronAPI.profileAPI.listProfiles(path)
        const defaultProfile = profiles.find((p: any) => p.isDefault) || profiles[0]
        setProfile(defaultProfile)
      } catch (err) {
        console.error('Lỗi load profile:', err)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const event = e as CustomEvent
      const updatedProfile = event.detail.profile as Profile
      if (profile && updatedProfile.gameDirectory === profile.gameDirectory) {
        setProfile(updatedProfile)
        console.log('PlayCard: Profile cập nhật realtime!', updatedProfile.name)
      }
    }

    window.addEventListener('profile-updated', handleProfileUpdate)

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
    }
  }, [profile])

  useEffect(() => {
    const handleGameLaunch = () => {
      window.electronAPI.ipcRenderer.send('game-will-launch')
    }

    window.electronAPI.on('game-will-launch', handleGameLaunch)

    return () => {
      window.electronAPI.off('game-will-launch', handleGameLaunch)
    }
  }, [])

  const handlePlay = async () => {
    if (!profile || launching || !currentAccount) return
    setLaunching(true)

    try {

      if (profile.showLaunchLog !== false) {
        window.electronAPI.ipcRenderer.send('open-log-window')
      }
      await window.electronAPI.launcher.launchProfile({
        profileName: profile.name,
        account: currentAccount
      })
      console.log('Đã gửi lệnh khởi động Minecraft!')
    } catch (err: any) {
      window.toast.error('Không thể khởi động Minecraft!\n' + (err.message || err), 'Lỗi')
      console.error('Lỗi khởi động:', err)
    } finally {
      setLaunching(false)
    }
  }

  if (!profile) {
    return (
      <MotionDiv
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-[400px] mx-auto bg-gradient-to-b from-cyan-900/20 to-purple-900/20 backdrop-blur-sm rounded-2xl border border-cyan-500/30 shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center gap-5 mb-8">
            <div className="relative">
              {currentAccount ? (
                <PlayerHead
                  uuid={currentAccount.uuid}
                  username={currentAccount.name}
                  size={80}
                  className="rounded-2xl shadow-2xl ring-4 ring-white/20"
                  key={`${currentAccount.uuid}-${currentAccount.name}-${skinVersion}`}
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex-center text-4xl font-black text-white shadow-xl">
                  P
                </div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-400">
                Chưa có profile nào
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Hãy tạo profile để bắt đầu chơi
              </p>
              {currentAccount && (
                <p className="text-sm text-cyan-300 mt-3">
                  Tài khoản: {currentAccount.name} (Sẵn sàng)
                </p>
              )}
            </div>
          </div>
          <div className="space-y-4 mb-10 opacity-50 pointer-events-none">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="flex justify-between">
                <span className="text-gray-400">Profile</span>
                <span className="font-bold text-gray-600">—</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                <HardDrive size={20} className="text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Phiên bản</p>
                  <p className="font-bold text-gray-600">—</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                <Settings size={20} className="text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Mod Loader</p>
                  <p className="font-bold text-gray-600">—</p>
                </div>
              </div>

              <button className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-1 opacity-50">
                <Boxes size={20} className="text-gray-600" />
                Tài nguyên
              </button>

              <button className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3 opacity-50">
                <Settings2 size={20} className="text-gray-600" />
                Cài đặt
              </button>
            </div>
          </div>
          <button
            disabled={true}
            className="relative w-full py-5 px-10 bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl font-black text-3xl tracking-wider text-gray-400 shadow-2xl cursor-not-allowed flex items-center justify-center gap-4 opacity-60"
          >
            <Play size={42} />
            <span>PLAY</span>
          </button>
        </div>
      </MotionDiv>
    )
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-[400px] mx-auto bg-gradient-to-b from-cyan-900/20 to-purple-900/20 backdrop-blur-sm rounded-2xl border border-cyan-500/30 shadow-2xl overflow-hidden"
    >
      <div className="p-8">
        <div className="flex items-center gap-5 mb-8">
          <div className="relative">
            {currentAccount ? (
              <PlayerHead
                uuid={currentAccount.uuid}
                username={currentAccount.name}
                size={80}
                className="rounded-2xl shadow-2xl ring-4 ring-white/20"
                key={`${currentAccount.uuid}-${currentAccount.name}-${skinVersion}`}
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex-center text-4xl font-black text-white shadow-xl">
                P
              </div>
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white">
              {currentAccount?.name || 'Player'}
            </h3>
            <p className="text-sm text-cyan-300">
              {currentAccount ? 'Sẵn sàng chơi' : 'Chưa chọn tài khoản'}
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-10">
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="flex justify-between">
              <span className="text-gray-400">Profile</span>
              <span className="font-bold text-cyan-300 truncate max-w-56">{profile.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <HardDrive size={20} className="text-emerald-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Phiên bản</p>
                <p className="font-bold text-white truncate">{profile.version}</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col">
              <div className="flex items-center gap-3">
                <Settings size={20} className={LOADER_COLOR[profile.loader] || 'text-gray-400'} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Mod Loader</p>
                  <p className="font-bold text-white truncate">
                    {LOADER_DISPLAY[profile.loader] || profile.loader.charAt(0).toUpperCase() + profile.loader.slice(1)}
                  </p>
                  {profile.loaderVersion && (
                    <p className="text-sm text-gray-400 truncate">
                      v{profile.loaderVersion}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!profile) return
                window.dispatchEvent(new CustomEvent('open-resource-manager-modal', { 
                  detail: { profile } 
                }))
              }}
              className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-1"
            >
              <Boxes size={20} className="text-blue-400" />
              Tài nguyên
            </button>

            <button
              onClick={() => {
                if (!profile) return
                window.dispatchEvent(new CustomEvent('open-edit-profile-modal', { 
                  detail: { profile } 
                }))
              }}
              className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <Settings2 size={20} className="text-yellow-400" />
              Cài đặt
            </button>
          </div>
        </div>

        <button
          onClick={handlePlay}
          disabled={launching || !currentAccount}
          className="relative w-full py-5 px-10 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-3xl tracking-wider text-white shadow-2xl transition-all flex items-center justify-center gap-4 group overflow-hidden"
        >
          <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />

          {launching ? (
            <>
              <Loader2 className="animate-spin" size={36} />
              <span className="text-xl">Đang khởi động...</span>
            </>
          ) : (
            <>
              <Play size={42} className="group-hover:scale-110 group-hover:-rotate-3 transition-transform" />
              <span>PLAY</span>
            </>
          )}
        </button>
      </div>
    </MotionDiv>
    
  )
  
}