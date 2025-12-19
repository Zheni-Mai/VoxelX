// src/renderer/launcher/modals/SettingProfileModal.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, FolderOpen, Trash2, Download, AlertCircle, Save, Loader2, SettingsIcon, Terminal, CheckCircle, LucideMemoryStick, ScreenShareIcon, Shield, Feather } from 'lucide-react'
import type { Profile } from '../../../main/types/profile'
import { MotionDiv } from '../../utils/motion'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: Profile
  appDataPath: string
  onUpdate: (updatedProfiles: Profile[]) => void
}

type Tab = 'general' | 'advanced' | 'launch'

export default function EditProfileModal({ isOpen, onClose, profile, appDataPath, onUpdate }: EditProfileModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [name, setName] = useState(profile.name)
  const [iconPreview, setIconPreview] = useState(profile.icon || '')
  const [resolution, setResolution] = useState({
    width: profile.resolution?.width || 854,
    height: profile.resolution?.height || 480
  })
  const [memory, setMemory] = useState({
    min: profile.memory?.min || '2G',
    max: profile.memory?.max || '6G'
  })
  const [jvmArgs, setJvmArgs] = useState(profile.jvmArgs || '')
  const [folderSize, setFolderSize] = useState<string>('Đang tính...')
  const [saving, setSaving] = useState(false)
  const [showLaunchLog, setShowLaunchLog] = useState(profile.showLaunchLog ?? false)
  const [javaList, setJavaList] = useState<{ version: number; exists: boolean }[]>([])
  const [useAuthlibInjector, setUseAuthlibInjector] = useState(profile.useAuthlibInjector ?? false)
    const [forceDedicatedGPU, setForceDedicatedGPU] = useState(profile.forceDedicatedGPU !== false)
    const [enableFeatherUI, setEnableFeatherUI] = useState(profile.enableFeatherUI ?? false)

  useEffect(() => {
    if (!isOpen) return
    const refreshJavaList = async () => {
      const list = await window.electronAPI.java.listAvailable()
      setJavaList(list)
    }
    
    refreshJavaList()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    window.electronAPI.java.listAvailable().then(setJavaList)
  }, [isOpen])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const realAppDataPath = await window.electronAPI.profileAPI.getAppDataPath()

      const updatedProfile: Profile = {
        ...profile,
        name: name.trim() || profile.name,
        icon: iconPreview || undefined,
        resolution: { width: resolution.width, height: resolution.height },
        memory: { min: memory.min, max: memory.max },
        jvmArgs: jvmArgs.trim() || undefined,
        showLaunchLog: showLaunchLog,
        javaVersion: profile.javaVersion,
        useAuthlibInjector: useAuthlibInjector,
        forceDedicatedGPU: forceDedicatedGPU,
        enableFeatherUI: enableFeatherUI,
      }

      await window.electronAPI.profileAPI.saveProfile({ 
        appDataPath: realAppDataPath, 
        profile: updatedProfile 
      })

      window.dispatchEvent(new CustomEvent('profile-updated', { 
        detail: { profile: updatedProfile } 
      }))

      const updated = await window.electronAPI.profileAPI.listProfiles(realAppDataPath)
      onUpdate(updated)
      onClose()
    } catch (err) {
      console.error('Lỗi lưu profile:', err)
      window.toast.error('Lỗi lưu profile!', 'Lỗi')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const calculateSize = async () => {
      try {
        const size = await window.electronAPI.profileAPI.getFolderSize(profile.gameDirectory)
        setFolderSize(size)
      } catch {
        setFolderSize('Không thể tính')
      }
    }
    calculateSize()
  }, [isOpen, profile.gameDirectory])

  if (!isOpen) return null

  return (
    <>
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <MotionDiv
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 400 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-black/70 backdrop-blur-sm rounded-3xl border border-white/10 shadow-2xl w-full max-w-6xl h-full max-h-[92vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <SettingsIcon size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Cài đặt</h2>
                <p className="text-sm text-cyan-400 font-medium">{profile.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-64 border-r border-white/10 p-5">
              <nav className="space-y-2">
                {([
                  { id: 'general', label: 'chung', icon: 'Info' },
                  { id: 'advanced', label: 'Nâng cao', icon: 'Settings' },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium text-left transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-500/20'
                        : 'text-gray-400 hover:bg-white/10 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-lg">{tab.id === 'general' ? 'ℹ️' : tab.id === 'advanced' ? '⚙️': null}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-8">
                {activeTab === 'general' && (
                  <>
                    <div>
                      <label className="text-sm font-semibold text-gray-300 mb-3 block">Tên Profile</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-5 py-4 bg-black/5 backdrop-blur-sm border border-white/20 rounded-2xl focus:border-cyan-400 focus:outline-none text-white text-lg transition"
                        placeholder="Nhập tên profile..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-300 mb-3 block">Thư mục game</label>
                      <div className="flex items-center justify-between px-5 py-4 bg-black/5 backdrop-blur-sm border border-white/20 rounded-2xl">
                        <span className="text-gray-300 truncate pr-4">{profile.gameDirectory}</span>
                        <button
                          onClick={() => window.electronAPI.profileAPI.openGameDirectory(profile.gameDirectory)}
                          className="p-3 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-xl transition-all"
                        >
                          <FolderOpen size={22} className="text-cyan-400" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-8">
                      <div className="space-y-8 w-full px-5 py-4 bg-black/5 backdrop-blur-sm border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-2xl font-mono">
                      <div className="text-lg font-bold mb-6 text-center flex items-center justify-center gap-3">
                        <LucideMemoryStick className="text-purple-400" size={28} />
                        <span>Phiên bản Java</span>
                      </div>
                        <div className="grid grid-cols-2 gap-4">
                        {[8, 11, 17, 21].map((ver) => {
                          const info = javaList.find(j => j.version === ver)
                          const isReady = info?.exists ?? false
                          const isSelected = profile.javaVersion === ver

                          return (
                            <button
                              key={ver}
                              onClick={() => {
                                profile.javaVersion = ver as any
                                setJavaList([...javaList])
                              }}
                              className={`p-6 rounded-2xl border-2 transition-all relative overflow-hidden group ${
                                isSelected
                                  ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/30'
                                  : 'border-white/20 hover:border-white/40 bg-gray-800/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-left">
                                  <div className="text-xl font-bold">Java {ver}</div>
                                  <div className="text-sm text-gray-400">Azul Zulu</div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  {isSelected && (
                                    <CheckCircle className="text-cyan-400" size={28} />
                                  )}
                                </div>
                              </div>
                              {!isSelected && (
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      </div>
                    </div>
                    <div className="my-8 p-6 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 rounded-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                            <div className="p-3 bg-cyan-500/20 rounded-xl">
                                <Terminal size={28} className="text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Hiển thị cửa sổ log khi chơi</h3>
                                <p className="text-sm text-gray-400">Xem chi tiết quá trình tải & chạy game </p>
                            </div>
                            </div>

                            <button
                            onClick={() => setShowLaunchLog(!showLaunchLog)}
                            className={`relative w-16 h-9 rounded-full transition-all duration-300 ${
                                showLaunchLog 
                                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/50' 
                                : 'bg-gray-700'
                            }`}
                            >
                            <motion.div
                                className="absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-md"
                                animate={{ x: showLaunchLog ? 28 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="space-y-8 w-full px-5 py-4 bg-black/5 backdrop-blur-sm border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-2xl font-mono">
                          <div className="text-lg font-bold mb-6 text-center flex items-center justify-center gap-3">
                            <ScreenShareIcon className="text-purple-400" size={28} />
                            <span>Tuỳ chỉnh cấu hình game</span>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-semibold text-gray-300 mb-3 block">Chiều rộng (px)</label>
                                <input
                                type="number"
                                value={resolution.width}
                                onChange={(e) => setResolution({ ...resolution, width: +e.target.value })}
                                className="w-full px-5 py-4 bg-black/5 backdrop-blur-sm border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-2xl font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-300 mb-3 block">Chiều cao (px)</label>
                                <input
                                type="number"
                                value={resolution.height}
                                onChange={(e) => setResolution({ ...resolution, height: +e.target.value })}
                                className="w-full px-5 py-4 bg-black/5 backdrop-blur-sm border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-2xl font-mono"
                                />
                            </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-semibold text-gray-300 mb-3 block">RAM tối thiểu</label>
                                <input
                                type="text"
                                value={memory.min}
                                onChange={(e) => setMemory({ ...memory, min: e.target.value })}
                                className="w-full px-5 py-4 bg-black/5 backdrop-blur-sm border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-xl font-mono"
                                placeholder="2G"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-300 mb-3 block">RAM tối đa</label>
                                <input
                                type="text"
                                value={memory.max}
                                onChange={(e) => setMemory({ ...memory, max: e.target.value })}
                                className="w-full px-5 py-4 bg-black/5 backdrop-blur-sm border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-xl font-mono"
                                placeholder="6G"
                                />
                            </div>
                            </div>

                            <div>
                            <label className="text-sm font-semibold text-gray-300 mb-3 block">JVM Arguments</label>
                            <textarea
                                rows={5}
                                value={jvmArgs}
                                onChange={(e) => setJvmArgs(e.target.value)}
                                className="w-full px-5 py-4 bg-black/5 backdrop-blur-sm border border-white/20 rounded-2xl focus:border-cyan-400 text-white font-mono text-sm resize-none"
                                placeholder="-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions ..."
                            />
                            </div>
                        </div>
                    </div>
                    
                  </>
                )}
                {activeTab === 'advanced' && (
                  <div className="space-y-8">
                    <div className="space-y-8 w-full px-5 py-4 border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-1xl font-mono">
                      <div className="my-8 p-6 bg-gradient-to-r from-purple-500/10 to-indigo-600/10 border border border-purple-500/30 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                              <Feather size={28} className="text-purple-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-lg">Bật Feather Client UI</h3>
                              <p className="text-sm text-gray-400">
                                Giao diện Feather Client chính thức
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setEnableFeatherUI(!enableFeatherUI)}
                            className={`relative w-16 h-9 rounded-full transition-all duration-300 ${
                              enableFeatherUI 
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/50' 
                                : 'bg-gray-700'
                            }`}
                          >
                            <motion.div
                              className="absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-md"
                              animate={{ x: enableFeatherUI ? 28 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                      </div>
                      <div className="my-8 p-6 bg-gradient-to-r from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                              <Shield size={28} className="text-purple-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-lg">Bật authlib-injector</h3>
                              <p className="text-sm text-gray-400">
                                Cho phép hiển thị skin/cape khi chơi Ely.by
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setUseAuthlibInjector(!useAuthlibInjector)}
                            className={`relative w-16 h-9 rounded-full transition-all duration-300 ${
                              useAuthlibInjector 
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50' 
                                : 'bg-gray-700'
                            }`}
                          >
                            <motion.div
                              className="absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-md"
                              animate={{ x: useAuthlibInjector ? 28 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="my-8 p-6 bg-gradient-to-r from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/20 rounded-xl">
                              <ScreenShareIcon size={28} className="text-green-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-lg">Ép sử dụng GPU rời (Card màn hình)</h3>
                              <p className="text-sm text-gray-400">
                                Tăng FPS cực mạnh trên laptop có card rời (RTX, GTX, RX...)
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              profile.forceDedicatedGPU = !(profile.forceDedicatedGPU ?? true)
                              setForceDedicatedGPU && setForceDedicatedGPU(profile.forceDedicatedGPU)
                            }}
                            className={`relative w-16 h-9 rounded-full transition-all duration-300 ${
                              profile.forceDedicatedGPU !== false
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/50'
                                : 'bg-gray-700'
                            }`}
                          >
                            <motion.div
                              className="absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-md"
                              animate={{ x: profile.forceDedicatedGPU !== false ? 28 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-8 w-full px-5 py-4 border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-1xl font-mono">
                      <div className="p-6 bg-yellow-500/10 border border-yellow-500/40 rounded-2xl flex items-start gap-4">
                      <AlertCircle className="text-yellow-400 mt-1 flex-shrink-0" size={28} />
                      <div>
                        <p className="font-bold text-yellow-300 text-lg">Cảnh báo khu vực nguy hiểm</p>
                        <p className="text-gray-400 mt-1">Các thao tác ở đây có thể xóa hoặc làm hỏng dữ liệu profile!</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        onClick={async () => {
                        const result = await window.electronAPI.profileAPI.exportProfile({
                            gameDirectory: profile.gameDirectory,
                            profileName: profile.name
                        })
                        if (result.success) {
                            window.toast.success(`Đã xuất thành công!\n${result.filePath}`, 'Thành công')
                            window.electronAPI.shell.showItemInFolder(result.filePath!)
                        } else {
                            window.toast.error('Lỗi: ' + result.message, 'Lỗi')
                        }
                        }}
                        className="group relative overflow-hidden p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl hover:scale-105 transition-all duration-300 shadow-xl flex items-center justify-center gap-5"
                    >
                        <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-opacity" />
                        
                        <div className="relative z-10 flex items-center gap-4">
                        <Download size={36} className="drop-shadow-lg" />
                        <div className="text-left">
                            <div className="text-lg font-bold">Xuất Profile</div>
                            <div className="text-sm opacity-90">.vxpacks</div>
                        </div>
                        </div>
                    </button>
                    <button
                        disabled
                        className="group relative overflow-hidden p-6 bg-gradient-to-br from-red-500/70 to-pink-600/70 rounded-2xl flex items-center justify-center gap-5 cursor-not-allowed shadow-xl opacity-80"
                    >
                        <div className="absolute inset-0 bg-black/20" />
                        
                        <div className="relative z-10 flex items-center gap-4">
                        <Trash2 size={36} className="drop-shadow-lg" />
                        <div className="text-left">
                            <div className="text-lg font-bold">Xóa dữ liệu</div>
                            <div className="text-sm opacity-75">Sắp ra mắt</div>
                        </div>
                        </div>
                    </button>
                    </div>

                    <div className="text-center py-10 bg-gray-800/50 rounded-3xl border border-white/10">
                      <p className="text-gray-400 text-lg">Dung lượng thư mục game</p>
                      <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mt-3">
                        {folderSize}
                      </p>
                    </div>
                    </div>

                    
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-white/10">
            <div className="flex justify-end gap-4">
              <button
                onClick={onClose}
                className="px-8 py-3.5 bg-white/10 hover:bg-white/20 rounded-2xl font-semibold text-gray-300 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-10 py-3.5 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-white flex items-center gap-3 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={22} />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={22} />
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </MotionDiv>
    </>
  )
}