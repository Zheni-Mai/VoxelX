// src/renderer/components/PlayCard.tsx

import { useState, useEffect } from 'react'
import { Play, HardDrive, Settings, Loader2, Settings2, Boxes, ChevronDown, Plus, Check, Trash2, Gamepad2, MenuIcon, Network } from 'lucide-react'
import { Account } from '../../main/types/account'
import PlayerHead from './PlayerHead'
import type { Profile } from '../../main/types/profile'
import { MotionDiv } from '../utils/motion'
import { AnimatePresence } from 'framer-motion'

// Import icon loader
import Vanilla from '@/assets/loader/vanilla.png'
import Fabric from '@/assets/loader/fabric.png'
import Quilt from '@/assets/loader/quilt.png'
import Forge from '@/assets/loader/forge.png'
import NeoForge from '@/assets/loader/neoforge.png'
import LiteLoader from '@/assets/loader/liteloader.png'
import Optifine from '@/assets/loader/optifine.png'
import Bedrock from '@/assets/loader/bedrock.png'

interface PlayCardProps {
  currentAccount: Account | null
  skinVersion?: number
}

const getLoaderIcon = (loader: string) => {
  switch (loader) {
    case 'vanilla': return Vanilla
    case 'fabric': return Fabric
    case 'quilt': return Quilt
    case 'forge': return Forge
    case 'neoforge': return NeoForge
    case 'liteloader': return LiteLoader
    case 'optifine': return Optifine
    default: return Vanilla
  }
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
  liteloader: 'text-gray-400',
  optifine: 'text-red-400',
}

export default function PlayCard({ currentAccount, skinVersion = 0 }: PlayCardProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [launching, setLaunching] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [appDataPath, setAppDataPath] = useState<string>('')
    const [showMoreMenu, setShowMoreMenu] = useState(false);

  const loadProfiles = async () => {
    try {
      const path = await window.electronAPI.profileAPI.getAppDataPath()
      setAppDataPath(path)
      const list = await window.electronAPI.profileAPI.listProfiles(path)
      const defaultProfile = list.find((p: Profile) => p.isDefault) || list[0] || null
      setProfiles(list)
      setCurrentProfile(defaultProfile)
    } catch (err) {
      console.error('Lỗi load profiles:', err)
      setProfiles([])
      setCurrentProfile(null)
    }
  }

  useEffect(() => {
    loadProfiles()

    const handleUpdate = () => {
      console.log('PlayCard: Nhận event profiles-updated → reload')
      loadProfiles()
    }
    window.addEventListener('profiles-updated', handleUpdate)
    return () => window.removeEventListener('profiles-updated', handleUpdate)
  }, [])

  const selectProfile = async (profile: Profile) => {
    if (profile.name === currentProfile?.name) {
      setIsProfileMenuOpen(false)
      return
    }

    try {
      await window.electronAPI.profileAPI.setDefaultProfile({
        appDataPath,
        profileName: profile.name,
      })
      setCurrentProfile(profile)
      setIsProfileMenuOpen(false)
      window.toast.success(`Đã chọn profile: ${profile.name}`)
    } catch (err) {
      window.toast.error('Không thể chọn profile!', 'Lỗi')
    }
  }

  const deleteProfile = async (profile: Profile, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm(`Xóa profile "${profile.name}"?\nThư mục game sẽ không bị xóa.`)) return

    try {
      const success = await window.electronAPI.profileAPI.deleteProfile({
        appDataPath,
        profileName: profile.name,
      })

      if (success) {
        window.toast.success(`Đã xóa profile: ${profile.name}`)
        setIsProfileMenuOpen(false)
        await loadProfiles()
      } else {
        window.toast.error('Lỗi khi xóa profile!')
      }
    } catch (err) {
      console.error('Lỗi xóa profile:', err)
      window.toast.error('Không thể xóa profile!')
    }
  }

  const openCreateProfile = () => {
    window.dispatchEvent(new CustomEvent('open-create-profile-modal'))
  }

  const openResourceManager = () => {
    if (!currentProfile) return
    window.dispatchEvent(new CustomEvent('open-resource-manager-modal', { detail: { profile: currentProfile } }))
  }

  const openEditProfile = () => {
    if (!currentProfile) return
    window.dispatchEvent(new CustomEvent('open-edit-profile-modal', { detail: { profile: currentProfile } }))
  }

  const handlePlay = async () => {
    if (!currentProfile || launching || !currentAccount) return

    setLaunching(true)
    try {
      if (currentProfile.showLaunchLog !== false) {
        window.electronAPI.ipcRenderer.send('open-log-window')
      }
      await window.electronAPI.launcher.launchProfile({
        profileName: currentProfile.name,
        account: currentAccount,
      })
    } catch (err: any) {
      window.toast.error('Không thể khởi động Minecraft!\n' + (err.message || err), 'Lỗi')
    } finally {
      setLaunching(false)
    }
  }

  const hasProfile = currentProfile !== null
  const canPlay = hasProfile && currentAccount && !launching

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
                key={`${currentAccount.uuid}-${skinVersion}`}
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-xl">
                P
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white">
              {currentAccount?.name || 'Player'}
            </h3>
            <p className="text-sm text-cyan-300">
              {currentAccount ? 'Sẵn sàng chơi' : 'Chưa chọn tài khoản'}
            </p>
            {!hasProfile && (
              <p className="text-sm text-gray-500 mt-2">
                Hãy tạo profile để bắt đầu chơi
              </p>
            )}
          </div>
        </div>

        <div className={`space-y-4 mb-10 ${!hasProfile ? 'opacity-50' : ''}`}>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-full bg-white/5 rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">Profile</span>
                  <span className="font-bold text-cyan-300 truncate">
                    {hasProfile ? currentProfile.name : '—'}
                  </span>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && profiles.length > 0 && (
                  <>
                    <MotionDiv
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="fixed inset-0 z-40"
                    />
                    <MotionDiv
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-50"
                    >
                      <div className="max-h-64 overflow-y-auto">
                        {profiles.map((p) => (
                          <button
                            key={p.name}
                            onClick={() => selectProfile(p)}
                            className={`w-full px-4 py-3 flex items-center justify-between hover:bg-white/10 transition-all group ${
                              p.name === currentProfile?.name ? 'bg-cyan-500/20' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <img
                                src={getLoaderIcon(p.loader)}
                                alt={p.loader}
                                className="w-8 h-8 rounded-lg object-contain"
                              />
                              <div className="text-left min-w-0">
                                <p className="font-semibold truncate">{p.name}</p>
                                <p className="text-xs text-gray-400">
                                  {p.version} • {LOADER_DISPLAY[p.loader] || p.loader}
                                  {p.loaderVersion && ` v${p.loaderVersion}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {p.name === currentProfile?.name && (
                                <Check size={18} className="text-cyan-400" />
                              )}
                              <button
                                onClick={(e) => deleteProfile(p, e)}
                                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/30 rounded transition"
                              >
                                <Trash2 size={16} className="text-red-400" />
                              </button>
                            </div>
                          </button>
                        ))}
                      </div>
                    </MotionDiv>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="relative group">
              <button
                onClick={openCreateProfile}
                className="w-full bg-white/5 rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between"
              >
                <Plus size={28} className="text-white" />
              </button>

              {/* Tooltip khi hover */}
              <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap bg-black/90 text-white text-sm font-medium px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 backdrop-blur-sm border border-white/10 shadow-xl">
                Tạo Profile Mới
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-black/90 border-y-8 border-y-transparent" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <HardDrive size={20} className={hasProfile ? 'text-emerald-400' : 'text-gray-600'} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Phiên bản</p>
                <p className={`font-bold truncate ${hasProfile ? 'text-white' : 'text-gray-600'}`}>
                  {hasProfile ? currentProfile.version : '—'}
                </p>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <Settings
                size={20}
                className={hasProfile ? LOADER_COLOR[currentProfile.loader] || 'text-gray-400' : 'text-gray-600'}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Mod Loader</p>
                <p className={`font-bold truncate ${hasProfile ? 'text-white' : 'text-gray-600'}`}>
                  {hasProfile ? LOADER_DISPLAY[currentProfile.loader] || currentProfile.loader : '—'}
                </p>
                {hasProfile && currentProfile.loaderVersion && (
                  <p className="text-sm text-gray-400 truncate">v{currentProfile.loaderVersion}</p>
                )}
              </div>
            </div>

            <button
              onClick={openResourceManager}
              disabled={!hasProfile}
              className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition disabled:cursor-not-allowed"
            >
              <Boxes size={20} className={hasProfile ? 'text-blue-400' : 'text-gray-600'} />
              <span className="text-sm">Tài nguyên</span>
            </button>

            <button
              onClick={openEditProfile}
              disabled={!hasProfile}
              className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition disabled:cursor-not-allowed"
            >
              <Settings2 size={20} className={hasProfile ? 'text-yellow-400' : 'text-gray-600'} />
              <span className="text-sm">Cài đặt</span>
            </button>
          </div>

          
        </div>

        {/* Nút PLAY chính và More Options (nếu là Microsoft) */}
        <div className="flex gap-4 items-end">
          {/* Nút PLAY chính - luôn chiếm phần lớn */}
          <button
            onClick={handlePlay}
            disabled={!canPlay}
            className={`relative flex-1 py-5 px-10 rounded-2xl font-black text-3xl tracking-wider text-white shadow-2xl transition-all flex items-center justify-center gap-4 group overflow-hidden ${
              canPlay
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 cursor-pointer'
                : 'bg-gradient-to-r from-gray-600 to-gray-700 opacity-60 cursor-not-allowed'
            }`}
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

          {/* Nút phụ bên phải - luôn cùng kích thước */}
          <div className="w-20"> {/* Fixed width để cân bằng với nút ⋮ */}
            {currentAccount?.type === 'microsoft' ? (
              /* Nút More Options cho Microsoft */
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(prev => !prev);
                  }}
                  className="w-20 h-20 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center"
                  title="Tùy chọn thêm"
                >
                  <MenuIcon size={42} className="group-hover:scale-110 group-hover:-rotate-3 transition-transform" />
                </button>

                <AnimatePresence>
                  {showMoreMenu && (
                    <>
                      <MotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowMoreMenu(false)}
                        className="fixed inset-0 z-40"
                      />

                      <MotionDiv
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-3 w-64 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden z-50"
                      >
                        {/* LAN PLAY */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMoreMenu(false);
                            if (canPlay && currentAccount) {
                              window.dispatchEvent(new CustomEvent('open-lan-play-modal'));
                            }
                          }}
                          disabled={!canPlay}
                          className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Network size={28} className="text-cyan-400" />
                          <div className="text-left">
                            <p className="font-semibold text-white">LAN PLAY</p>
                            <p className="text-xs text-gray-400">Chơi LAN qua Internet</p>
                          </div>
                        </button>

                        {/* Bedrock Edition */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMoreMenu(false);
                            (async () => {
                              try {
                                await window.electronAPI.shell.openExternal('minecraft://');
                              } catch {
                                await window.electronAPI.shell.openExternal('ms-windows-store://pdp/?productid=9NBLGGH2JHXJ');
                              }
                            })();
                          }}
                          className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/10 transition-all border-t border-white/10"
                        >
                          <img src={Bedrock} alt="Bedrock" className="w-10 h-10 rounded-lg object-contain" />
                          <div className="text-left">
                            <p className="font-semibold text-white">Bedrock Edition</p>
                            <p className="text-xs text-gray-400">Mở Minecraft Bedrock</p>
                          </div>
                        </button>
                      </MotionDiv>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Nút LAN PLAY riêng cho tài khoản thường - cùng kích thước với nút ⋮ */
              <button
                onClick={() => {
                  if (canPlay && currentAccount) {
                    window.dispatchEvent(new CustomEvent('open-lan-play-modal'));
                  }
                }}
                disabled={!canPlay}
                className={`w-20 h-20 relative bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 rounded-2xl shadow-2xl transition-all flex items-center justify-center group overflow-hidden ${
                  !canPlay ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title="LAN PLAY"
              >
                <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                <Network size={32} className="text-white group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>
    </MotionDiv>
  )
}