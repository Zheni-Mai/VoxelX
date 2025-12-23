// src/renderer/profiles/ProfilesPage.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, FolderOpen, Archive, Trash2, Box } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MotionDiv } from '../utils/motion'

import Forge from '@/assets/loader/forge.png'
import Quilt from '@/assets/loader/quilt.png'
import NeoForge from '@/assets/loader/neoforge.png'
import Fabric from '@/assets/loader/fabric.png'
import Vanilla from '@/assets/loader/vanilla.png'
import Optifine from '@/assets/loader/optifine.png'
import LiteLoader from '@/assets/loader/liteloader.png'
import ModrinthLogo from '@/assets/loader/modrinth.svg'
import CreateProfileModal from './modals/CreateProfileModal'
import ImportModpackModal from './modals/ImportModpackModal'
import EditProfileModal from './modals/EditProfileModal'
import type { Profile } from '../../main/types/profile'
import UniversalBrowserModal from './modals/ResourceBrowserModal'

type MinecraftVersion = {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [showVersionPicker, setShowVersionPicker] = useState(false)

  const [profileName, setProfileName] = useState('')
  const [gameDir, setGameDir] = useState('')
  const [loader, setLoader] = useState<'vanilla' | 'fabric'>('vanilla')
  const [selectedVersion, setSelectedVersion] = useState('')
  const [selectedLoaderVersion, setSelectedLoaderVersion] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)

  const [versionFilter, setVersionFilter] = useState('')
  const [appDataPath, setAppDataPath] = useState('')
  const [showFabricStep, setShowFabricStep] = useState<'game' | 'loader'>('game')
  const [versionTypeFilter, setVersionTypeFilter] = useState<
    'release' | 'snapshot' | 'old_beta' | 'old_alpha' | null
  >(null)
  const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersion[]>([])
  const [fabricVersions, setFabricVersions] = useState<string[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [creatingProfile, setCreatingProfile] = useState(false)
  const [universalOpen, setUniversalOpen] = useState(false)

  const [fabOpen, setFabOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [modrinthOpen, setModrinthOpen] = useState(false)
  const LOADER_DISPLAY: Record<Profile['loader'], string> = {
    vanilla: 'Vanilla',
    fabric: 'Fabric',
    quilt: 'Quilt',
    forge: 'Forge',
    neoforge: 'NeoForge',
    liteloader: 'LiteLoader',
    optifine: 'Optifine',
  }

  const LOADER_COLOR: Record<Profile['loader'], string> = {
    vanilla: 'text-cyan-400',
    fabric: 'text-purple-400',
    quilt: 'text-pink-400',
    forge: 'text-orange-400',
    neoforge: 'text-lime-400',
    liteloader: 'text-gray-400',
    optifine: 'text-red-400',
  }

  const importProfile = async () => {
    const result = await window.electronAPI.dialog.showOpenDialog({
      title: 'Nhập Profile / Modpack',
      buttonLabel: 'Nhập',
      filters: [
        { name: 'VoxelX & Modpacks', extensions: ['vxpacks', 'mrpack', 'zip'] },
        { name: 'Tất cả file', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || !result.filePaths?.length) return

    const filePath = result.filePaths[0]

    try {
      const res = await window.electronAPI.profileAPI.importPack(filePath) as {
        success: boolean
        profile?: Profile
        message?: string
      }

      if (res.success && res.profile) {
        const path = await window.electronAPI.profileAPI.getAppDataPath()
        const updated = await window.electronAPI.profileAPI.listProfiles(path)
        setProfiles(updated)

        window.toast.success(`Đã nhập thành công!\n${res.profile.name}`, 'Thành công')
      } else {
        window.toast.error('Nhập thất bại!\n' + (res.message || 'Không rõ lỗi'), 'Lỗi')
      }
    } catch (err: any) {
      window.toast.error('Lỗi: ' + (err?.message || 'Không thể kết nối đến main process'), 'Lỗi')
    }
  }

  useEffect(() => {
    const handleProfilesUpdated = async () => {
      if (!appDataPath) {
        try {
          const path = await window.electronAPI.profileAPI.getAppDataPath()
          setAppDataPath(path)
          const list = await window.electronAPI.profileAPI.listProfiles(path)
          setProfiles(list)
        } catch (err) {
          console.error('Lỗi reload profiles sau update:', err)
        }
      } else {
        try {
          const list = await window.electronAPI.profileAPI.listProfiles(appDataPath)
          setProfiles(list)
        } catch (err) {
          console.error('Lỗi reload profiles:', err)
        }
      }
    }
    window.electronAPI.on('profiles-updated', handleProfilesUpdated)
    return () => {
      window.electronAPI.off('profiles-updated', handleProfilesUpdated)
    }
  }, [appDataPath])

  useEffect(() => {
    const init = async () => {
      try {
        const path = await window.electronAPI.profileAPI.getAppDataPath()
        setAppDataPath(path)
        const list = await window.electronAPI.profileAPI.listProfiles(path)
        setProfiles(list)
      } catch (err) {
        console.error('Failed to init profiles:', err)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (isCreateOpen && minecraftVersions.length === 0) {
      loadMinecraftVersions()
    }
  }, [isCreateOpen])
  useEffect(() => {
    if (loader === 'fabric' && selectedVersion) {
      loadFabricVersions(selectedVersion)
    } else {
      setFabricVersions([])
      setSelectedLoaderVersion('')
    }
  }, [loader, selectedVersion])

  const loadMinecraftVersions = async () => {
    setLoadingVersions(true)
    try {
      const versions = await window.electronAPI.profileAPI.getMinecraftVersions()
      setMinecraftVersions(versions)
    } catch (err) {
      console.error('Lỗi tải phiên bản Minecraft:', err)
      window.toast.error('Không thể tải danh sách phiên bản Minecraft.', 'Lỗi')
    } finally {
      setLoadingVersions(false)
    }
  }

  const loadFabricVersions = async (gameVersion: string) => {
    try {
      const versions = await window.electronAPI.profileAPI.getFabricVersions(gameVersion)
      setFabricVersions(versions)
      if (versions.length > 0) {
        setSelectedLoaderVersion(versions[0])
      }
    } catch (err) {
      console.error('Lỗi tải Fabric loader:', err)
    }
  }
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)

  const saveProfile = async () => {
    if (!selectedVersion || !appDataPath) return

    setCreatingProfile(true)
    const name = profileName.trim() || 'New Profile'
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_')
    const defaultDir = `${appDataPath}/instances/${safeName}`

    console.log('AppDataPath:', appDataPath)
    const profile: Profile = {
      name: safeName,
      version: selectedVersion,
      loader,
      gameDirectory: gameDir || defaultDir,
      loaderVersion: loader === 'fabric' ? selectedLoaderVersion : undefined,
      installed: false,
      isDefault: profiles.length === 0
    }

    try {
      await window.electronAPI.profileAPI.saveProfile({ appDataPath, profile })
      console.log('Lưu thành công!')
      const updated = await window.electronAPI.profileAPI.listProfiles(appDataPath)
      setProfiles(updated)

      setIsCreateOpen(false)
      resetForm()
      console.log('Đang lưu profile:', profile)
    } catch (err) {
      console.error('Lỗi lưu profile:', err)
      window.toast.error('Không thể tạo profile!', 'Lỗi')
    } finally {
      setCreatingProfile(false)
    }
  }

  const resetForm = () => {
    setProfileName('')
    setGameDir('')
    setLoader('vanilla')
    setSelectedVersion('')
    setSelectedLoaderVersion('')
    setVersionFilter('')
    setVersionTypeFilter(null)       
    setShowVersionPicker(false)
    setShowFabricStep('game')
  }

  return (
    <div className="relative w-full min-h-screen text-white overflow-hidden">
      <div className="pt-10 px-10 pb-32 ">
        {profiles.length === 0 ? (
          <div className="text-center mt-32 text-gray-500">
            <p className="text-3xl mb-4">Không có hồ sơ cài đặt</p>
            <p>Ấn nút + để tạo profile đầu tiên</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {profiles.map((p) => (
                <MotionDiv
                  key={p.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className={`relative bg-white/5 backdrop-blur-2xl rounded-2xl border cursor-pointer shadow-md transition-all duration-300 group
                    ${p.isDefault 
                      ? 'border-cyan-cyan-400/70 shadow-xl shadow-cyan-500/30 ring-2 ring-cyan-400/50' 
                      : 'border-white/10 hover:border-white/20 hover:shadow-xl'
                    }`}
                  onClick={() => {
                    if (!p.isDefault) {
                      window.electronAPI.profileAPI.setDefaultProfile({ appDataPath, profileName: p.name })
                        .then(updated => updated && setProfiles(updated))
                    }
                  }}
                >
                  <div className="p-5 flex items-start gap-4">
                    <div className="flex-shrink-0 relative">
                      <div className="w-14 h-14 rounded-xl border-2 border-white/20 bg-black/30 flex items-center justify-center">
                        <img 
                          src={
                            p.loader === 'vanilla' ? Vanilla :
                            p.loader === 'fabric' ? Fabric :
                            p.loader === 'quilt' ? Quilt :
                            p.loader === 'forge' ? Forge :
                            p.loader === 'liteloader' ? LiteLoader :
                            p.loader === 'optifine' ? Optifine :
                            NeoForge
                          } 
                          alt={p.loader} 
                          className="w-10 h-10 object-contain" 
                        />
                      </div>
                      <button
                          onClick={async () => {
                            if (!confirm(`Xóa profile "${p.name}"?\n\nThư mục game sẽ KHÔNG bị xóa.`)) return

                            try {
                              const success = await window.electronAPI.profileAPI.deleteProfile({
                                appDataPath,
                                profileName: p.name
                              })

                              if (success) {
                                setProfiles(prev => prev.filter(pr => pr.name !== p.name))
                                console.log(`Đã xóa profile: ${p.name}`)
                              } else {
                                window.toast.error('Lỗi khi xóa profile!', 'Lỗi')
                              }
                            } catch (err) {
                              console.error('Lỗi xóa profile:', err)
                              window.toast.error('Không thể xóa profile!', 'Lỗi')
                            } finally {
                              setMenuOpenFor(null)
                            }
                          }}
                          className="w-full px-5 py-3.5 text-left hover:bg-red-500/20 transition flex items-center gap-3 text-red-400 border-t border-white/10"
                        >
                          <Trash2 size={18} />
                        </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-white truncate pr-2">{p.name}</h3>
                        {p.isDefault && (
                          <span className="text-xs px-3 py-1 bg-cyan-500/30 text-cyan-300 rounded-full border border-cyan-400/70 font-medium">
                            Default
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Phiên bản:</span>
                          <span className="text-cyan-300 font-medium ml-1">{p.version}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Loader:</span>
                          <span className={LOADER_COLOR[p.loader] || 'text-gray-400'}>
                            {LOADER_DISPLAY[p.loader] || p.loader}
                            {p.loaderVersion && <span className="text-gray-500 text-xs ml-1">v{p.loaderVersion}</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 group/items">
                          <span className="text-gray-400 flex-shrink-0">Thư mục:</span>
                          <span className="text-gray-500 text-xs truncate flex-1">
                            {p.gameDirectory.split('/').pop() || 'instances'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.electronAPI.profileAPI.openGameDirectory(p.gameDirectory)
                            }}
                            aria-label="Mở thư mục game"
                            className="opacity-0 group-hover/items:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                          >
                            <FolderOpen size={14} className="text-cyan-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {p.isDefault && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent" />
                    </div>
                  )}
                </MotionDiv>
              ))}
          </div>
        )}
      </div>
      <div className="fixed bottom-10 right-10 z-50">
        <div
          className="relative"
          onMouseEnter={() => setFabOpen(true)}
          onMouseLeave={() => setFabOpen(false)}
        >
          <AnimatePresence>
            {fabOpen && (
              <div className="absolute bottom-24 right-2 flex flex-col items-center gap-4">
                <div className="mb-2 text-xs text-gray-300 font-medium">Tạo mới</div>
                <div className="relative group">
                  <motion.button
                    initial={{ opacity: 0, y: 20, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.6 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      importProfile()
                    }}
                    className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-600 rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20 backdrop-blur-sm"
                    aria-label="Nhập Profile hoặc Modpack"
                  >
                    <Archive size={32} className="text-white drop-shadow-lg" />
                  </motion.button>

                  <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap bg-black/90 text-white text-sm font-medium px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 backdrop-blur-sm border border-white/10 shadow-xl">
                    Nhập Profile / Modpack (.vxpacks, .mrpack, .zip)
                    <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-black/90 border-y-8 border-y-transparent" />
                  </span>
                </div>
                <div className="relative group">
                  <motion.button
                    initial={{ opacity: 0, y: 20, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.6 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setUniversalOpen(true)
                    }}
                    className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20 backdrop-blur-sm"
                    aria-label="Duyệt tất cả nội dung Modrinth"
                  >
                    <img src={ModrinthLogo} alt="Modrinth" className="w-full h-full object-cover" />
                    <Box size={32} className="text-white drop-shadow-lg" />
                  </motion.button>  
                  <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap bg-black/90 text-white text-sm font-medium px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 backdrop-blur-sm border border-white/10 shadow-xl">
                    Modrinth
                    <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-black/90 border-y-8 border-y-transparent" />
                  </span>
                </div>
                <div className="relative group">
                  <motion.button
                    initial={{ opacity: 0, y: 20, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.6 }}
                    transition={{ delay: 0.05 }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setCreateOpen(true)
                    }}
                    className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20 backdrop-blur-sm"
                    aria-label="Tạo Profile Mới"
                  >
                    <Plus size={32} className="text-white drop-shadow-lg" />
                  </motion.button>

                  <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap bg-black/90 text-white text-sm font-medium px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 backdrop-blur-sm border border-white/10 shadow-xl">
                    Tạo Profile Mới
                    <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-black/90 border-y-8 border-y-transparent" />
                  </span>
                </div>
                <div className="w-1 h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent rounded-full" />
              </div>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-full shadow-2xl flex items-center justify-center border-4 border-white/30 backdrop-blur-md"
            aria-label="Mở menu tạo profile"
          >
            <MotionDiv
              animate={{ rotate: fabOpen ? 135 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Plus size={40} className="text-white drop-shadow-lg" />
            </MotionDiv>
            <MotionDiv
              className="absolute inset-0 rounded-full bg-white/20"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: fabOpen ? 1.4 : 0.8, opacity: fabOpen ? 0.4 : 0 }}
              transition={{ duration: 0.4 }}
            />
          </motion.button>
        </div>
      </div>

      {createOpen && ( <CreateProfileModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreate={async () => { try { const updatedProfiles = await window.electronAPI.profileAPI.listProfiles(appDataPath); setProfiles(updatedProfiles) } catch (err) { console.error('Lỗi reload profiles sau khi tạo:', err)}}}/>)}
      {importOpen && <ImportModpackModal isOpen={importOpen} onClose={() => setImportOpen(false)} />}
      {editModalOpen && editingProfile && (<EditProfileModal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false)
      setEditingProfile(null)}}profile={editingProfile}appDataPath={appDataPath}onUpdate={setProfiles}/>)}
      {universalOpen && (
        <UniversalBrowserModal
          isOpen={universalOpen}
          onClose={() => setUniversalOpen(false)}
          profiles={profiles}
          currentProfile={profiles.find(p => p.isDefault)?.name}
        />
      )}
    </div>
  )
}