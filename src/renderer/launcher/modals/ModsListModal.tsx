// src/renderer/components/modals/ModsListModal.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, FolderOpen, Loader2, Trash2, Package } from 'lucide-react'
import { MotionDiv } from '../../utils/motion'

interface Mod {
  filename: string
  enabled: boolean
  title?: string
  description?: string
  authors?: string[]
  iconUrl?: string | null
  version?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  profile: {
    name: string
    gameDirectory: string
    version: string
    loader: string
  }
}

export default function ModsListModal({ isOpen, onClose, profile }: Props) {
  const [mods, setMods] = useState<Mod[]>([])
  const [loading, setLoading] = useState(true)

  const loadMods = async () => {
    if (!profile?.gameDirectory) return
    setLoading(true)
    try {
      const list = await window.electronAPI.profileAPI.getModList(profile.gameDirectory)
      setMods(list || [])
    } catch (err) {
      window.toast.error('Không thể tải danh sách mod', 'Lỗi')
      console.error(err)
      setMods([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) loadMods()
  }, [isOpen, profile?.gameDirectory])

  const handleAddFromFolder = async () => {
    const result = await window.electronAPI.profileAPI.addModsFromFolder({ gameDirectory: profile.gameDirectory })
    if (result.success) {
      loadMods()
    } else if (result.message !== 'Đã hủy') {
      window.toast.error('Lỗi: ' + result.message, 'Lỗi')
    }
  }

  const toggleMod = async (filename: string, current: boolean) => {
    const success = await window.electronAPI.profileAPI.toggleMod({
      gameDirectory: profile.gameDirectory,
      filename,
      enable: !current
    })
    if (success) {
      setMods(mods => mods.map(m => 
        m.filename === filename ? { ...m, enabled: !current } : m
      ))
    }
  }

  const deleteMod = async (filename: string, title: string) => {
    if (!confirm(`Xóa mod "${title || filename}" vĩnh viễn?`)) return
    const success = await window.electronAPI.profileAPI.deleteMod({ 
      gameDirectory: profile.gameDirectory, 
      filename 
    })
    if (success) {
      setMods(mods => mods.filter(m => m.filename !== filename))
    }
  }

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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className=" bg-black/70 backdrop-blur-1xl rounded-3xl border border-white/20 shadow-3xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <Package size={36} className="text-cyan-400" />
              <div>
                <h2 className="text-3xl font-black text-white">Quản lý Mods</h2>
                <p className="text-lg text-cyan-300">{profile.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition">
              <X size={32} />
            </button>
          </div>
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">
              Danh sách Mod ({mods.length})
            </h3>
            <button
              onClick={handleAddFromFolder}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-xl font-bold text-white flex items-center gap-3 transition shadow-lg"
            >
              <FolderOpen size={22} />
              Thêm từ thư mục
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="animate-spin text-cyan-400" size={64} />
                <p className="mt-4 text-gray-400">Đang tải danh sách mod...</p>
              </div>
            ) : mods.length === 0 ? (
              <div className="text-center py-20">
                <Package size={80} className="mx-auto mb-6 text-gray-600" />
                <p className="text-2xl font-medium text-gray-400">Chưa có mod nào</p>
                <p className="text-gray-500 mt-2">Nhấn nút trên để thêm mod từ thư mục</p>
              </div>
            ) : (
              mods.map(mod => (
                <MotionDiv
                  key={mod.filename}
                  layout
                  className="bg-gray-800/60 hover:bg-gray-700/90 rounded-2xl p-5 flex items-center gap-5 border border-white/10 transition-all group"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/10">
                    {mod.iconUrl ? (
                      <img src={mod.iconUrl} alt={mod.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold text-white">
                        {(mod.title || mod.filename)[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="font-bold text-white text-lg">{mod.title || mod.filename}</h4>
                    <p className="text-sm text-gray-400">
                      {mod.authors?.join(', ') || 'Không rõ'} • {mod.version || 'Unknown'}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                  <label className="flex items-center gap-4 cursor-pointer select-none">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleMod(mod.filename, mod.enabled)
                        }}
                        className={`relative w-16 h-9 rounded-full transition-all duration-300 shadow-inner ${
                          mod.enabled
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/50'
                            : 'bg-gray-700'
                        }`}
                      >
                        <motion.div
                          className="absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-md"
                          animate={{ x: mod.enabled ? 28 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    <div className="text-left">
                      <div className="font-bold text-lg leading-none">
                        {mod.enabled ? (
                          <span className="text-emerald-400">Bật</span>
                        ) : (
                          <span className="text-red-400">Tắt</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Trạng thái mod</div>
                    </div>
                  </label>
                  <button
                    onClick={() => deleteMod(mod.filename, mod.title || mod.filename)}
                    className="p-3 hover:bg-red-500/20 rounded-xl text-red-400 transition opacity-0 group-hover:opacity-100"
                    title="Xóa mod vĩnh viễn"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
                </MotionDiv>
              ))
            )}
          </div>
        </div>
      </MotionDiv>
    </>
  )
}