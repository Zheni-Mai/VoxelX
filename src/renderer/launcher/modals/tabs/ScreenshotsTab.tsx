import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Trash2, ImageOff, FolderOpen, Check, Copy } from 'lucide-react' // Thêm Check cho feedback

interface Screenshot {
  filename: string
  title: string
  dataUrl: string
  fullPath: string
}

interface Props {
  profile: {
    name: string
    gameDirectory: string
    version: string
    loader: string
  }
}

export default function ScreenshotsTab({ profile }: Props) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null) 

  const loadScreenshots = async () => {
    if (!profile?.gameDirectory) return
    setLoading(true)
    try {
      const list = await window.electronAPI.profileAPI.getScreenshots(profile.gameDirectory)
      setScreenshots(list || [])
    } catch (err) {
      console.error('Lỗi tải screenshots:', err)
      window.toast.error('Không thể tải ảnh chụp màn hình', 'Lỗi')
      setScreenshots([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadScreenshots()
  }, [profile?.gameDirectory])

  const copyImageToClipboard = async (dataUrl: string) => {
    try {
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const item = new ClipboardItem({ [blob.type]: blob })
      await navigator.clipboard.write([item])

      window.toast.success('Đã copy ảnh vào clipboard!')
      setCopiedId(dataUrl)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Copy ảnh thất bại:', err)
      window.toast.error('Copy ảnh thất bại. Trình duyệt có thể không hỗ trợ.')
    }
  }

  const deleteScreenshot = async (fullPath: string, filename: string) => {
    if (!confirm(`Xóa ảnh "${filename}"? Không thể khôi phục!`)) return

    const success = await window.electronAPI.profileAPI.deleteScreenshot(fullPath)
    if (success) {
      setScreenshots(prev => prev.filter(s => s.fullPath !== fullPath))
      window.toast.success('Đã xóa ảnh')
      loadScreenshots()
    } else {
      window.toast.error('Không thể xóa ảnh')
    }
  }

  const openScreenshot = (dataUrl: string) => {
    const win = window.open('')
    if (win) {
      win.document.write(`
        <html>
          <head><title>${profile.name} - Screenshot</title></head>
          <body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh;">
            <img src="${dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />
          </body>
        </html>
      `)
    }
  }

  const openFolder = async () => {
    await window.electronAPI.profileAPI.openScreenshotsFolder(profile.gameDirectory)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-sm font-bold text-white">Ảnh chụp màn hình ({screenshots.length})</h3>
        <button
          onClick={openFolder}
          className="px-6 py-3 bg-gray-800/60 hover:bg-gray-700/90 rounded-xl font-bold text-white flex items-center gap-3 transition shadow-lg"
        >
          <FolderOpen size={18} />
          Mở thư mục
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="animate-spin text-cyan-400" size={64} />
            <p className="mt-4 text-gray-400">Đang tải ảnh...</p>
          </div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-20">
            <ImageOff size={80} className="mx-auto mb-6 text-gray-600" />
            <p className="text-2xl font-medium text-gray-400">Chưa có ảnh chụp màn hình</p>
            <p className="text-gray-500 mt-2">Nhấn F2 trong game để chụp ảnh!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {screenshots.map((shot) => (
              <motion.div
                key={shot.fullPath}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gray-800/60 hover:bg-gray-700/90 rounded-2xl overflow-hidden border border-white/10 transition-all group relative"
              >
                <div
                  onClick={() => openScreenshot(shot.dataUrl)}
                  className="cursor-pointer aspect-video bg-black/50 overflow-hidden"
                >
                  <img
                    src={shot.dataUrl}
                    alt={shot.filename}
                    className="w-full h-full object-contain hover:object-cover transition-all duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>

                <div className="p-4">
                  <h4 className="font-bold text-white text-sm truncate">{shot.title}</h4>
                  <p className="text-xs text-gray-400 mt-1">{shot.filename}</p>
                </div>

                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyImageToClipboard(shot.dataUrl)
                    }}
                    className={`p-2 rounded-lg text-white backdrop-blur-sm transition ${
                      copiedId === shot.dataUrl
                        ? 'bg-green-600'
                        : 'bg-black/70 hover:bg-black/90'
                    }`}
                    title="Copy ảnh vào clipboard"
                  >
                    {copiedId === shot.dataUrl ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteScreenshot(shot.fullPath, shot.filename)
                    }}
                    className="p-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-white backdrop-blur-sm transition"
                    title="Xóa ảnh"
                  >
                    <Trash2 size={18} />
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