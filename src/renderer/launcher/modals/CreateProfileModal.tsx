// src/renderer/launhcer/modals/CreateProfileModal.tsx
import { motion } from 'framer-motion'
import { X, Loader2, FolderOpen } from 'lucide-react'
import { useState, useEffect } from 'react'
import VanillaContent from '../../profiles/modals/VanillaContent'
import FabricContent from '../../profiles/modals/FabricContent'

type LoaderType = 'vanilla' | 'fabric'

interface MinecraftVersion {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
}

interface ProfileData {
  name: string
  version: string
  loader: LoaderType
  gameDirectory: string
  loaderVersion?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreate: (profile: ProfileData) => void
}

export default function CreateProfileModal({ isOpen, onClose, onCreate }: Props) {
  const [profileName, setProfileName] = useState('')
  const [gameDir, setGameDir] = useState('')
  const [loader, setLoader] = useState<LoaderType>('vanilla')
  const [selectedVersion, setSelectedVersion] = useState('')
  const [selectedLoaderVersion, setSelectedLoaderVersion] = useState('')

  const [appDataPath, setAppDataPath] = useState('')
  const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersion[]>([])
  const [fabricVersions, setFabricVersions] = useState<string[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [creatingProfile, setCreatingProfile] = useState(false)

  useEffect(() => {
    if (isOpen && !appDataPath) {
      window.electronAPI.profileAPI.getAppDataPath().then(setAppDataPath)
    }
  }, [isOpen, appDataPath])

  useEffect(() => {
    if (isOpen && minecraftVersions.length === 0) {
      loadMinecraftVersions()
    }
  }, [isOpen])

  useEffect(() => {
    if (loader === 'fabric' && selectedVersion) {
      loadFabricVersions(selectedVersion)
    } else if (loader === 'vanilla') {
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
      if (versions.length > 0) setSelectedLoaderVersion(versions[0])
    } catch (err) {
      console.error('Lỗi tải Fabric loader:', err)
    }
  }

  const selectDirectory = async () => {
    const dir = await window.electronAPI.profileAPI.selectGameDirectory()
    if (dir) setGameDir(dir)
  }

  const resetForm = () => {
    setProfileName('')
    setGameDir('')
    setLoader('vanilla')
    setSelectedVersion('')
    setSelectedLoaderVersion('')
  }

  const handleCreate = async () => {
    if (!selectedVersion || !appDataPath) return

    setCreatingProfile(true)
    const name = profileName.trim() || `Minecraft ${selectedVersion}`
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_')
    const defaultDir = `${appDataPath}/instances/${safeName}`

    const profile: ProfileData = {
      name: safeName,
      version: selectedVersion,
      loader,
      gameDirectory: gameDir || defaultDir,
      loaderVersion: loader === 'fabric' ? selectedLoaderVersion : undefined,
    }

    try {
      await window.electronAPI.profileAPI.saveProfile({ appDataPath, profile })
      onCreate(profile)
      onClose()
      resetForm()
    } catch (err) {
      console.error('Lỗi tạo profile:', err)
      window.toast.error('Không thể tạo profile!', 'Lỗi')
    } finally {
      setCreatingProfile(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-gray-900/95 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/10 w-full max-w-5xl h-[90vh] max-h-[850px] mx-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-3xl font-bold text-cyan-400">Create Profile</h2>
              {selectedVersion && (
                <div className="text-center py-4">
                  <p className="text-xl font-semibold text-cyan-300">
                    {selectedVersion}
                    {loader === 'fabric' && selectedLoaderVersion && ` • Fabric ${selectedLoaderVersion}`}
                  </p>
                </div>
              )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <X size={28} className="text-gray-400" />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 bg-white/5 border-r border-white/10 p-6 flex flex-col gap-4">
            <button
              onClick={() => setLoader('vanilla')}
              className={`w-full py-6 rounded-xl font-semibold text-lg transition-all ${
                loader === 'vanilla'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              Vanilla
            </button>
            <button
              onClick={() => setLoader('fabric')}
              className={`w-full py-6 rounded-xl font-semibold text-lg transition-all ${
                loader === 'fabric'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              Fabric
            </button>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-white/10 space-y-5">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Tên profile (không bắt buộc)"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 text-base bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400 transition"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Thư mục game (không bắt buộc)"
                    value={gameDir}
                    onChange={(e) => setGameDir(e.target.value)}
                    className="flex-1 px-4 py-3 text-base bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400 transition"
                  />
                  <button
                    onClick={selectDirectory}
                    className="px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition"
                  >
                    <FolderOpen size={24} />
                  </button>
                </div>
              </div>

              
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loader === 'vanilla' ? (
                <VanillaContent
                  minecraftVersions={minecraftVersions}
                  loadingVersions={loadingVersions}
                  selectedVersion={selectedVersion}
                  setSelectedVersion={setSelectedVersion}
                />
              ) : (
                <FabricContent
                  minecraftVersions={minecraftVersions}
                  fabricVersions={fabricVersions}
                  loadingVersions={loadingVersions}
                  selectedVersion={selectedVersion}
                  setSelectedVersion={setSelectedVersion}
                  selectedLoaderVersion={selectedLoaderVersion}
                  setSelectedLoaderVersion={setSelectedLoaderVersion}
                />
              )}
            </div>
            <div className="p-6 border-t border-white/10">
              <button
                onClick={handleCreate}
                disabled={!selectedVersion || creatingProfile}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3"
              >
                {creatingProfile ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    Đang tạo...
                  </>
                ) : (
                  'Tạo Profile'
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}