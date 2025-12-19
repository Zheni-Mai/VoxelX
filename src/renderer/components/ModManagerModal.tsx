// src/renderer/components/ModManagerModal.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Download, FolderOpen, Loader2, Trash2, Files } from 'lucide-react'
import { MotionDiv } from '../utils/motion'

interface ModManagerModalProps {
  isOpen: boolean
  onClose: () => void
  profileName: string
  gameDirectory: string
}

export default function ModManagerModal({ isOpen, onClose, profileName, gameDirectory }: ModManagerModalProps) {
  const [mods, setMods] = useState<any[]>([])
  const [loadingMods, setLoadingMods] = useState(true)
  useEffect(() => {
    if (!isOpen) return

    const loadMods = async () => {
      setLoadingMods(true)
      try {
        const list = await window.electronAPI.profileAPI.getModList(gameDirectory)
        setMods(list)
      } catch (err) {
        console.error('Lỗi tải danh sách mod:', err)
      } finally {
        setLoadingMods(false)
      }
    }

    loadMods()
  }, [isOpen, gameDirectory])
  const handleAddFromFolder = async () => {
    const result = await window.electronAPI.profileAPI.addModsFromFolder({ gameDirectory })
    if (result.success) {
      window.toast.success(`Đã thêm ${result.copied?.length || 0} mod!`, 'Thành công')
      const list = await window.electronAPI.profileAPI.getModList(gameDirectory)
      setMods(list)
    } else if (result.message !== 'Đã hủy') {
      window.toast.error('Lỗi khi thêm mod: ' + result.message, 'Lỗi')
    }
  }
  const toggleMod = async (filename: string, current: boolean) => {
    const success = await window.electronAPI.profileAPI.toggleMod({
      gameDirectory,
      filename,
      enable: !current
    })
    if (success) {
      setMods(mods.map(m => m.filename === filename ? { ...m, enabled: !current } : m))
    }
  }
  const deleteMod = async (filename: string, title: string) => {
    if (!confirm(`Xóa mod "${title || filename}"?`)) return
    const success = await window.electronAPI.profileAPI.deleteMod({ gameDirectory, filename })
    if (success) {
      setMods(mods.filter(m => m.filename !== filename))
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
        className="fixed inset-4 z-50 flex bg-black/70 backdrop-blur-2xl items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex-center">
                <Files size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Quản lý Mods</h2>
                <p className="text-sm text-cyan-400 font-medium">{profileName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/10 rounded-xl transition"
            >
              <X size={24} className="text-gray-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white">
                Danh sách Mods <span className="text-cyan-400">({mods.length})</span>
              </h3>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-lg text-sm font-medium flex items-center gap-2 transition">
                  <Download size={16} />
                  Từ Modrinth
                </button>
                <button
                  onClick={handleAddFromFolder}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                >
                  <FolderOpen size={16} />
                  Từ thư mục
                </button>
              </div>
            </div>

            {loadingMods ? (
              <div className="text-center py-20">
                <Loader2 className="animate-spin mx-auto mb-4" size={48} />
                <p className="text-gray-400">Đang tải danh sách mod...</p>
              </div>
            ) : mods.length === 0 ? (
              <div className="text-center py-20">
                <Files size={64} className="mx-auto mb-6 opacity-30" />
                <p className="text-xl font-medium text-gray-400">Chưa có mod nào</p>
                <p className="text-sm text-gray-500 mt-2">Nhấn nút trên để thêm mod</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mods.map((mod) => (
                  <MotionDiv
                    key={mod.filename}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group bg-gray-800/50 hover:bg-gray-800/80 rounded-xl p-4 flex items-center gap-4 border border-white/10 transition-all"
                  >
                    <div className="w-14 h-14 rounded-lg bg-gray-700 overflow-hidden border border-white/10 flex-shrink-0">
                      {mod.iconUrl ? (
                        <img src={mod.iconUrl} alt={mod.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex-center text-xl font-bold text-white">
                          {mod.title?.[0] || "M"}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">
                        {mod.title || mod.filename.replace(/\.jar$/, '')}
                      </h4>
                      <p className="text-xs text-gray-400 truncate">
                        {mod.authors?.join(', ') || 'Không rõ'} • {mod.version || 'Unknown'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mod.enabled}
                          onChange={() => toggleMod(mod.filename, mod.enabled)}
                          className="w-5 h-5 rounded text-cyan-400 focus:ring-cyan-400"
                        />
                        <span className={`text-sm ${mod.enabled ? 'text-green-400' : 'text-red-400'} font-medium`}>
                          {mod.enabled ? 'Bật' : 'Tắt'}
                        </span>
                      </label>

                      <button
                        onClick={() => deleteMod(mod.filename, mod.title || mod.filename)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </MotionDiv>
                ))}
              </div>
            )}
          </div>
        </div>
      </MotionDiv>
    </>
  )
}