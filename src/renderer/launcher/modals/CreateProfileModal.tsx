// src/renderer/launhcer/modals/CreateProfileModal.tsx
import { X, Loader2, FolderOpen } from 'lucide-react'
import { useState, useEffect } from 'react'
import VanillaContent from '../profiles/modals/VanillaContent'
import FabricContent from '../profiles/modals/FabricContent'
import ForgeContent from '../profiles/modals/ForgeContent'
import QuiltContent from '../profiles/modals/QuiltContent'
import NeoForgeContent from '../profiles/modals/NeoForgeContent'
import LiteLoaderContent from '../profiles/modals/LiteLoaderContent'
import OptiFineContent from '../profiles/modals/OptifineContent'
import { MotionDiv } from '../../utils/motion'
import Fabric from '@/assets/loader/fabric.png'
import Forge from '@/assets/loader/forge.png'
import Quilt from '@/assets/loader/quilt.png'
import Vanilla from '@/assets/loader/vanilla.png'
import NeoForge from '@/assets/loader/neoforge.png'
import LiteLoader from '@/assets/loader/liteloader.png'
import Optifine from '@/assets/loader/optifine.png'


type LoaderType = 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge' | 'liteloader' | 'optifine'

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
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [creatingProfile, setCreatingProfile] = useState(false)
  const [fabricVersions, setFabricVersions] = useState<(string | { version: string; type?: 'recommended' | 'latest' | 'common' })[]>([])
  const [forgeVersions, setForgeVersions] = useState<(string | { version: string; type?: 'recommended' | 'latest' | 'common' })[]>([])
  const [quiltVersions, setQuiltVersions] = useState<(string | { version: string; type?: 'recommended' | 'latest' | 'common' })[]>([])
  const [liteVersions, setLiteVersions] = useState<(string | { version: string; type?: 'latest' | 'common' })[]>([])
  const [neoForgeVersions, setNeoForgeVersions] = useState<(string | { version: string; type?: 'recommended' | 'latest' | 'common' })[]>([])
  const [OptiFineVersions, setOptiFineVersions] = useState<(string | { version: string; type?: 'latest' | 'common' })[]>([])

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
    if (selectedVersion) {
      if (loader === 'fabric') {
        loadFabricVersions(selectedVersion)
      } else if (loader === 'forge') {
        loadForgeVersions(selectedVersion)
      } else if (loader === 'quilt') {
        loadQuiltVersions(selectedVersion)
      } else if (loader === 'neoforge') {
        loadNeoForgeVersions(selectedVersion)
      } else if (loader === 'liteloader') {
        loadLiteLoaderVersions(selectedVersion)
      } else if (loader === 'optifine') {
        loadOptiFineVersions(selectedVersion) 
      }
    } else {
      setFabricVersions([])
      setForgeVersions([])
      setQuiltVersions([])
      setNeoForgeVersions([])
      setLiteVersions([])
      setOptiFineVersions([]) 
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
        const first = versions[0]
        const ver = typeof first === 'string' ? first : (first as any).version ?? first
        setSelectedLoaderVersion(ver)
      }
    } catch (err) {
      console.error('Lỗi tải Fabric loader:', err)
    }
  }

  const loadForgeVersions = async (gameVersion: string) => {
    try {
      const versions = await window.electronAPI.profileAPI.getForgeVersions(gameVersion)
      setForgeVersions(versions)
      let defaultVer: string | undefined
      const recommended = versions.find((v: any) => v && typeof v === 'object' && v.type === 'recommended')
      if (recommended) {
        defaultVer = (recommended as any).version
      }
      else {
        const latest = versions.find((v: any) => v && typeof v === 'object' && v.type === 'latest')
        if (latest) {
          defaultVer = (latest as any).version
        }
      }
      if (!defaultVer && versions.length > 0) {
        const first = versions[0]
        defaultVer = typeof first === 'string' ? first : (first as any).version ?? first
      }

      if (defaultVer) {
        setSelectedLoaderVersion(defaultVer)
      }
    } catch (err) {
      console.error('Lỗi tải Forge versions:', err)
      window.toast.error('Không thể tải danh sách Forge', 'Lỗi')
    }
  }

  const loadQuiltVersions = async (gameVersion: string) => {
    try {
      const versions = await window.electronAPI.profileAPI.getQuiltVersions(gameVersion)
      setQuiltVersions(versions)

      let defaultVer: string | undefined

      const recommended = versions.find((v: any) => v && typeof v === 'object' && v.type === 'recommended')
      if (recommended) {
        defaultVer = (recommended as any).version
      } else {
        const latest = versions.find((v: any) => v && typeof v === 'object' && v.type === 'latest')
        if (latest) {
          defaultVer = (latest as any).version
        }
      }

      if (!defaultVer && versions.length > 0) {
        const first = versions[0]
        defaultVer = typeof first === 'string' ? first : (first as any).version ?? first
      }

      if (defaultVer) {
        setSelectedLoaderVersion(defaultVer)
      }
    } catch (err) {
      console.error('Lỗi tải Quilt versions:', err)
      window.toast.error('Không thể tải danh sách Quilt', 'Lỗi')
    }
  }

  const loadNeoForgeVersions = async (gameVersion: string) => {
    try {
      const versions = await window.electronAPI.profileAPI.getNeoForgeVersions(gameVersion)
      setNeoForgeVersions(versions)

      let defaultVer: string | undefined

      const recommended = versions.find((v: any) => v && typeof v === 'object' && v.type === 'recommended')
      if (recommended) {
        defaultVer = (recommended as any).version
      } else {
        const latest = versions.find((v: any) => v && typeof v === 'object' && v.type === 'latest')
        if (latest) {
          defaultVer = (latest as any).version
        }
      }

      if (!defaultVer && versions.length > 0) {
        const first = versions[0]
        defaultVer = typeof first === 'string' ? first : (first as any).version ?? first
      }

      if (defaultVer) {
        setSelectedLoaderVersion(defaultVer)
      }
    } catch (err) {
      console.error('Lỗi tải NeoForge versions:', err)
      window.toast.error('Không thể tải danh sách NeoForge', 'Lỗi')
    }
  }

  const loadLiteLoaderVersions = async (gameVersion: string) => {
    try {
      const versions = await window.electronAPI.profileAPI.getLiteLoaderVersions(gameVersion)
      setLiteVersions(versions)

      if (versions.length > 0) {
        const first = versions[0]
        const ver = typeof first === 'string' ? first : (first as any).version
        setSelectedLoaderVersion(ver)
      }
    } catch (err) {
      console.error('Lỗi tải LiteLoader versions:', err)
      window.toast.error('Không thể tải danh sách LiteLoader', 'Lỗi')
    }
  }

  const loadOptiFineVersions = async (gameVersion: string) => {
    try {
      const versions = await window.electronAPI.profileAPI.getOptiFineVersions(gameVersion)
      setOptiFineVersions(versions) 

      if (versions.length > 0) {
        const first = versions[0]
        const ver = typeof first === 'string' ? first : (first as any).version
        setSelectedLoaderVersion(ver)
      }
    } catch (err) {
      console.error('Lỗi tải OptiFine versions:', err)
      window.toast.error('Không thể tải danh sách OptiFine', 'Lỗi')
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
      loaderVersion: loader !== 'vanilla' ? selectedLoaderVersion : undefined,
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
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <MotionDiv
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-black/80 rounded-2xl shadow-2xl border border-white/10 w-full max-w-5xl h-[90vh] max-h-[850px] mx-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-1 border-b border-white/10">
          <h2 className="text-2xl font-bold text-cyan-400">Create Profile</h2>
              
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <X size={28} className="text-gray-400" />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-25 bg-black rounded-2xl border-r border-white/10 p-8 flex flex-col items-center gap-8">
            <button
              onClick={() => setLoader('vanilla')}
              className={`w-16 h-16 rounded-xl transition-all overflow-hidden shadow-xl ${
                loader === 'vanilla'
                  ? 'ring-2 ring-cyan-400 scale-110'
                  : 'hover:scale-105 opacity-80'
              }`}
            >
              <img src={Vanilla} alt="Vanilla" className="w-full h-full object-contain" />
            </button>
            <button
              onClick={() => setLoader('fabric')}
              className={`w-16 h-16 rounded-xl transition-all overflow-hidden shadow-xl ${
                loader === 'fabric'
                  ? 'ring-2 ring-purple-400 scale-110'
                  : 'hover:scale-105 opacity-80'
              }`}
            >
              <img src={Fabric} alt="Fabric" className="w-full h-full object-contain" />
            </button>
            <button
              onClick={() => setLoader('forge')}
              className={`w-16 h-16 rounded-xl transition-all overflow-hidden shadow-xl ${
                loader === 'forge'
                  ? 'ring-2 ring-orange-500 scale-110'
                  : 'hover:scale-105 opacity-80'
              }`}
            >
              <img src={Forge} alt="Forge" className="w-full h-full object-contain" />
            </button>
            <button
              onClick={() => setLoader('quilt')}
              className={`w-16 h-16 rounded-xl transition-all overflow-hidden shadow-xl ${
                loader === 'quilt'
                  ? 'ring-2 ring-pink-500 scale-110'
                  : 'hover:scale-105 opacity-80'
              }`}
            >
              <img src={Quilt} alt="Quilt" className="w-full h-full object-contain" />
            </button>
            <button
              onClick={() => setLoader('neoforge')}
              className={`w-16 h-16 rounded-xl transition-all overflow-hidden shadow-xl ${
                loader === 'neoforge'
                  ? 'ring-2 ring-lime-500 scale-110'  
                  : 'hover:scale-105 opacity-80'
              }`}
            >
              <img src={NeoForge} alt="NeoForge" className="w-full h-full object-contain" />
            </button>
            <button
              onClick={() => setLoader('liteloader')}
              className={`w-16 h-16 rounded-xl transition-all overflow-hidden shadow-xl ${
                loader === 'liteloader'
                  ? 'ring-2 ring-white-400 scale-110'
                  : 'hover:scale-105 opacity-80'
              }`}
            >
              <img src={LiteLoader} alt="LiteLoader" className="w-full h-full object-contain" />
            </button>
            <button
              onClick={() => setLoader('optifine')}
              className={`w-16 h-16 rounded-xl transition-all overflow-hidden shadow-xl ${
                loader === 'optifine'
                  ? 'ring-2 ring-red-400 scale-110'
                  : 'hover:scale-105 opacity-80'
              }`}
            >
              <img src={Optifine} alt="Optifine" className="w-full h-full object-contain" />
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
              ) : loader === 'fabric' ? (
                <FabricContent
                  minecraftVersions={minecraftVersions}
                  loaderVersions={fabricVersions}
                  loadingVersions={loadingVersions}
                  selectedVersion={selectedVersion}
                  setSelectedVersion={setSelectedVersion}
                  selectedLoaderVersion={selectedLoaderVersion}
                  setSelectedLoaderVersion={setSelectedLoaderVersion}
                />
              ) : loader === 'forge' ? (
                <ForgeContent
                  minecraftVersions={minecraftVersions}
                  loaderVersions={forgeVersions}
                  loadingVersions={loadingVersions}
                  selectedVersion={selectedVersion}
                  setSelectedVersion={setSelectedVersion}
                  selectedLoaderVersion={selectedLoaderVersion}
                  setSelectedLoaderVersion={setSelectedLoaderVersion}
                />
              ) : loader === 'quilt' ? (
                <QuiltContent
                  minecraftVersions={minecraftVersions}
                  loaderVersions={quiltVersions}
                  loadingVersions={loadingVersions}
                  selectedVersion={selectedVersion}
                  setSelectedVersion={setSelectedVersion}
                  selectedLoaderVersion={selectedLoaderVersion}
                  setSelectedLoaderVersion={setSelectedLoaderVersion}
                />
              ) : loader === 'neoforge' ? (
                <NeoForgeContent
                  minecraftVersions={minecraftVersions}
                  loaderVersions={neoForgeVersions}
                  loadingVersions={loadingVersions}
                  selectedVersion={selectedVersion}
                  setSelectedVersion={setSelectedVersion}
                  selectedLoaderVersion={selectedLoaderVersion}
                  setSelectedLoaderVersion={setSelectedLoaderVersion}
                />
              ) : loader === 'liteloader' ? (
                <LiteLoaderContent
                  minecraftVersions={minecraftVersions}
                  loaderVersions={liteVersions}
                  loadingVersions={loadingVersions}
                  selectedVersion={selectedVersion}
                  setSelectedVersion={setSelectedVersion}
                  selectedLoaderVersion={selectedLoaderVersion}
                  setSelectedLoaderVersion={setSelectedLoaderVersion}
                />
              ) : loader === 'optifine' ? (
                <OptiFineContent
                  minecraftVersions={minecraftVersions}
                  loaderVersions={OptiFineVersions}
                  loadingVersions={loadingVersions}
                  selectedVersion={selectedVersion}
                  setSelectedVersion={setSelectedVersion}
                  selectedLoaderVersion={selectedLoaderVersion}
                  setSelectedLoaderVersion={setSelectedLoaderVersion}
                />
              ) : null}
            </div>
            <div className="p-2 border-t border-white/10">
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
      </MotionDiv>
    </MotionDiv>
  )
}