import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, Loader2, Trash2, Image } from 'lucide-react'

interface ShaderPack {
  filename: string
  enabled: boolean
  title: string
  iconUrl: string | null
}

interface Props {
  profile: {
    name: string
    gameDirectory: string
    version: string
    loader: string
  }
}

export default function ShaderPacksTab({ profile }: Props) {
  const [packs, setPacks] = useState<ShaderPack[]>([])
  const [loading, setLoading] = useState(true)

  const loadPacks = async () => {
    if (!profile?.gameDirectory) return
    setLoading(true)
    try {
      const list = await window.electronAPI.profileAPI.getShaderPackList(profile.gameDirectory)
      setPacks(list || [])
    } catch (err) {
      window.toast.error('Không thể tải danh sách shader pack', 'Lỗi')
      setPacks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPacks()
  }, [profile?.gameDirectory])

  const handleAdd = async () => {
    const result = await window.electronAPI.profileAPI.addShaderPacksFromFolder({ gameDirectory: profile.gameDirectory })
    if (result.success) {
      window.toast.success(result.message)
      loadPacks()
    } else {
      window.toast.error(result.message || 'Thêm shader pack thất bại')
    }
  }

  const toggle = async (filename: string, enabled: boolean) => {
    const success = await window.electronAPI.profileAPI.toggleShaderPack({
      gameDirectory: profile.gameDirectory,
      filename,
      enable: !enabled
    })
    if (success) {
      setPacks(p => p.map(item => item.filename === filename ? { ...item, enabled: !enabled } : item))
    }
  }

  const deletePack = async (filename: string) => {
    if (!confirm(`Xóa shader pack "${filename}"?`)) return
    const success = await window.electronAPI.profileAPI.deleteShaderPack({
      gameDirectory: profile.gameDirectory,
      filename
    })
    if (success) {
      setPacks(p => p.filter(item => item.filename !== filename))
      window.toast.success('Đã xóa shader pack')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-sm font-bold text-white">Danh sách Shader Pack ({packs.length})</h3>
        <button onClick={handleAdd} className="px-6 py-3 bg-gray-800/60 hover:bg-gray-700/90 rounded-xl font-bold text-white flex items-center gap-3 transition shadow-lg">
          <FolderOpen size={22} />
          Thêm từ thư mục
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="animate-spin text-cyan-400" size={64} />
            <p className="mt-4 text-gray-400">Đang tải...</p>
          </div>
        ) : packs.length === 0 ? (
          <div className="text-center py-20">
            <Image size={80} className="mx-auto mb-6 text-gray-600" />
            <p className="text-2xl font-medium text-gray-400">Chưa có shader pack</p>
            <p className="text-gray-500 mt-2">Thêm shader để có hiệu ứng ánh sáng đẹp hơn!</p>
          </div>
        ) : (
          packs.map(pack => (
            <motion.div
              key={pack.filename}
              layout
              className="bg-gray-800/60 hover:bg-gray-700/90 rounded-2xl p-5 flex items-center gap-5 border border-white/10 transition-all group"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold text-white">
                SH
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-white text-lg">{pack.title}</h4>
                <p className="text-sm text-gray-400">{pack.filename}</p>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-4 cursor-pointer select-none">
                  <div className="relative">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(pack.filename, pack.enabled) }}
                      className={`relative w-16 h-9 rounded-full transition-all duration-300 shadow-inner ${pack.enabled ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gray-700'}`}
                    >
                      <motion.div
                        className="absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-md"
                        animate={{ x: pack.enabled ? 28 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg leading-none">
                      {pack.enabled ? <span className="text-emerald-400">Bật</span> : <span className="text-red-400">Tắt</span>}
                    </div>
                  </div>
                </label>
                <button
                  onClick={() => deletePack(pack.filename)}
                  className="p-3 hover:bg-red-500/20 rounded-xl text-red-400 transition opacity-0 group-hover:opacity-100"
                  title="Xóa"
                >
                  <Trash2 size={22} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}