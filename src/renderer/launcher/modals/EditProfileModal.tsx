// src/renderer/profiles/modals/EditProfileModal.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Image, FolderOpen, Trash2, Download, AlertCircle, Save, Loader2, HardDrive } from 'lucide-react'
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
  const [gameArgs, setGameArgs] = useState(profile.gameArgs || '')
  const [folderSize, setFolderSize] = useState<string>('Đang tính...')
  const [saving, setSaving] = useState(false)

  const selectIcon = async () => {
    const result = await window.electronAPI.selectSkinFile()
    if (!result) return
    try {
      const buffer = await window.electronAPI.fileAPI.readFile(result)
      const base64 = `data:image/png;base64,${btoa(
        String.fromCharCode(...new TextEncoder().encode(buffer))
      )}`
      setIconPreview(base64)
    } catch {
      window.toast.error('Lỗi đọc file ảnh!', 'Lỗi')
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const updatedProfile: Profile = {
        ...profile,
        name: name.trim() || profile.name,
        icon: iconPreview || undefined,
        resolution: { width: resolution.width, height: resolution.height },
        memory: { min: memory.min, max: memory.max },
        jvmArgs: jvmArgs.trim() || undefined,
        gameArgs: gameArgs.trim() || undefined,
      }
      await window.electronAPI.profileAPI.saveProfile({ appDataPath, profile: updatedProfile })
      const updated = await window.electronAPI.profileAPI.listProfiles(appDataPath)
      onUpdate(updated)
      onClose()
    } catch {
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
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
        <div className="bg-black/70 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl w-full max-w-6xl h-full max-h-[92vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <HardDrive size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Chỉnh sửa Profile</h2>
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
            <div className="w-64 bg-gray-800/60 border-r border-white/10 p-5">
              <nav className="space-y-2">
                {([
                  { id: 'general', label: 'Thông tin chung', icon: 'Info' },
                  { id: 'advanced', label: 'Nâng cao', icon: 'Settings' },
                  { id: 'launch', label: 'Cấu hình chạy', icon: 'Rocket' },
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
                    <span className="text-lg">{tab.id === 'general' ? 'ℹ️' : tab.id === 'advanced' ? '⚙️' : '🚀'}</span>
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
                        className="w-full px-5 py-4 bg-gray-800/70 border border-white/20 rounded-2xl focus:border-cyan-400 focus:outline-none text-white text-lg transition"
                        placeholder="Nhập tên profile..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-300 mb-3 block">Icon Profile</label>
                      <div className="flex items-center gap-6">
                        <div className="w-28 h-28 rounded-2xl bg-gray-800 border-2 border-dashed border-white/30 overflow-hidden shadow-xl">
                          {iconPreview ? (
                            <img src={iconPreview} alt="icon" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                              <Image size={48} className="text-white/60" />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={selectIcon}
                          className="px-8 py-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 rounded-2xl font-semibold flex items-center gap-3 transition-all hover:scale-105"
                        >
                          <Image size={20} />
                          Chọn ảnh mới
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-300 mb-3 block">Thư mục game</label>
                      <div className="flex items-center justify-between px-5 py-4 bg-gray-800/70 border border-white/20 rounded-2xl">
                        <span className="text-gray-300 truncate pr-4">{profile.gameDirectory}</span>
                        <button
                          onClick={() => window.electronAPI.profileAPI.openGameDirectory(profile.gameDirectory)}
                          className="p-3 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-xl transition-all"
                        >
                          <FolderOpen size={22} className="text-cyan-400" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {activeTab === 'advanced' && (
                  <div className="space-y-8">
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
                        className="group relative overflow-hidden p-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl hover:scale-105 transition-all duration-300 shadow-xl shadow-2xl flex flex-col items-center gap-4"
                      >
                        <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition"></div>
                        <Download size={48} className="relative z-10" />
                        <span className="relative z-10 text-lg font-bold">Xuất Profile (.vxpacks)</span>
                      </button>

                      <button
                        disabled
                        className="group relative overflow-hidden p-10 bg-gradient-to-br from-red-500/80 to-pink-600/80 rounded-3xl flex flex-col items-center gap-4 cursor-not-allowed shadow-2xl"
                      >
                        <Trash2 size={48} />
                        <span className="text-lg font-bold">Xóa dữ liệu game</span>
                        <span className="text-sm opacity-80">Sắp ra mắt</span>
                      </button>
                    </div>

                    <div className="text-center py-10 bg-gray-800/50 rounded-3xl border border-white/10">
                      <p className="text-gray-400 text-lg">Dung lượng thư mục game</p>
                      <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mt-3">
                        {folderSize}
                      </p>
                    </div>
                  </div>
                )}
                {activeTab === 'launch' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-semibold text-gray-300 mb-3 block">Chiều rộng (px)</label>
                        <input
                          type="number"
                          value={resolution.width}
                          onChange={(e) => setResolution({ ...resolution, width: +e.target.value })}
                          className="w-full px-5 py-4 bg-gray-800/70 border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-2xl font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-300 mb-3 block">Chiều cao (px)</label>
                        <input
                          type="number"
                          value={resolution.height}
                          onChange={(e) => setResolution({ ...resolution, height: +e.target.value })}
                          className="w-full px-5 py-4 bg-gray-800/70 border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-2xl font-mono"
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
                          className="w-full px-5 py-4 bg-gray-800/70 border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-xl font-mono"
                          placeholder="2G"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-300 mb-3 block">RAM tối đa</label>
                        <input
                          type="text"
                          value={memory.max}
                          onChange={(e) => setMemory({ ...memory, max: e.target.value })}
                          className="w-full px-5 py-4 bg-gray-800/70 border border-white/20 rounded-2xl focus:border-cyan-400 text-white text-center text-xl font-mono"
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
                        className="w-full px-5 py-4 bg-gray-800/70 border border-white/20 rounded-2xl focus:border-cyan-400 text-white font-mono text-sm resize-none"
                        placeholder="-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions ..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-white/10 bg-gray-900/80 backdrop-blur-xl">
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
                className="px-10 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-2xl font-bold text-white flex items-center gap-3 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
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