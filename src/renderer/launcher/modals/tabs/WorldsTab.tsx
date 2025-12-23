// src/renderer/components/modals/tabs/WorldsTab.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Trash2, FolderOpen, AlertCircle, Globe } from 'lucide-react'
import nbt from 'nbt'

interface World {
  name: string
  folderName: string
  icon?: string
  lastPlayed: number
  size: string
}

interface Props {
  profile: {
    name: string
    gameDirectory: string
    version: string
    loader: string
  }
}

export default function WorldsTab({ profile }: Props) {
  const [worlds, setWorlds] = useState<World[]>([])
  const [loading, setLoading] = useState(true)

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const loadWorlds = async () => {
    if (!profile?.gameDirectory) {
      setWorlds([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const rawWorlds = await window.electronAPI.profileAPI.getWorldDetails(profile.gameDirectory)

      const parsedWorlds = await Promise.all(
        rawWorlds.map(async (w: any) => {
          let displayName = w.name

          if (w.levelDatBuffer && w.levelDatBuffer.length > 0) {
            try {
              const buffer = Buffer.from(w.levelDatBuffer)
              const parsed = await nbt.parse(buffer)
              if (parsed.Data?.LevelName) {
                displayName = String(parsed.Data.LevelName).trim() || w.name
              }
            } catch (err) {
              console.warn('Không parse được level.dat:', err)
            }
          }

          return {
            name: displayName,
            folderName: w.folderName,
            icon: w.icon,
            lastPlayed: w.lastPlayed,
            size: w.size,
          }
        })
      )

      setWorlds(parsedWorlds)
    } catch (err) {
      console.error('Lỗi tải worlds:', err)
      if (window.toast?.error) window.toast.error('Không thể tải danh sách world')
      setWorlds([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorlds()
  }, [profile?.gameDirectory])

  const deleteWorld = async (folderName: string) => {
    const worldName = worlds.find(w => w.folderName === folderName)?.name || folderName
    if (!confirm(`Xóa world "${worldName}"?\nThư mục sẽ bị xóa vĩnh viễn!`)) return

    try {
      const success = await window.electronAPI.profileAPI.deleteWorld({
        gameDirectory: profile.gameDirectory,
        folderName,
      })

      if (success) {
        setWorlds(prev => prev.filter(w => w.folderName !== folderName))
        if (window.toast?.success) window.toast.success(`Đã xóa world "${worldName}"`)
      } else {
        if (window.toast?.error) window.toast.error('Không thể xóa world')
      }
    } catch (err) {
      if (window.toast?.error) window.toast.error('Lỗi khi xóa world')
    }
  }

  const openSavesFolder = async () => {
    await window.electronAPI.profileAPI.openSavesFolder(profile.gameDirectory)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-sm font-bold text-white">Worlds ({worlds.length})</h3>
        <button
          onClick={openSavesFolder}
          className="px-6 py-3 bg-gray-800/60 hover:bg-gray-700/90 rounded-xl font-bold text-white flex items-center gap-3 transition shadow-lg"
        >
          <FolderOpen size={18} />
          Mở thư mục saves
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="animate-spin text-cyan-400" size={64} />
            <p className="mt-4 text-gray-400">Đang tải danh sách world...</p>
          </div>
        ) : worlds.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle size={80} className="mx-auto mb-6 text-gray-600" />
            <p className="text-2xl font-medium text-gray-400">Chưa có world nào</p>
            <p className="text-gray-500 mt-2">Vào game và tạo world mới để bắt đầu!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {worlds.map((world) => (
              <motion.div
                key={world.folderName}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gray-800/60 hover:bg-gray-700/90 rounded-2xl border border-white/10 transition-all group flex items-center gap-6 p-5 shadow-lg"
              >
                <div className="shrink-0">
                  {world.icon ? (
                    <img
                      src={world.icon}
                      alt={world.name}
                      className="w-24 h-24 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-700/50 rounded-xl flex items-center justify-center">
                      <Globe size={48} className="text-gray-500" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-xl truncate">{world.name}</h4>
                  <div className="flex items-center gap-6 mt-2 text-sm">
                    <p className="text-gray-400">
                      Chơi lần cuối: <span className="text-gray-300">{formatDate(world.lastPlayed)}</span>
                    </p>
                    <p className="text-gray-400">
                      Kích thước: <span className="text-gray-300">{world.size}</span>
                    </p>
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-3">
                  <button
                    onClick={openSavesFolder}
                    className="p-3 bg-black/70 hover:bg-black/90 rounded-xl text-white backdrop-blur-sm transition shadow-md"
                    title="Mở thư mục world"
                  >
                    <FolderOpen size={20} />
                  </button>
                  <button
                    onClick={() => deleteWorld(world.folderName)}
                    className="p-3 bg-red-600/80 hover:bg-red-600 rounded-xl text-white backdrop-blur-sm transition shadow-md"
                    title="Xóa world"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}