// src/renderer/components/InstancesModal.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gamepad2, Zap, CheckCircle2, Download, ArrowDownToLine, RefreshCw, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface MinecraftInstance {
  id: string
  name: string
  version: string
  pid: number
  playerName: string
  gameDir: string
  launchedAt: number
}

interface UpdateInfo {
  version: string
  changelog?: string
}

export default function InstancesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'instances' | 'updates'>('instances')

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [status, setStatus] = useState<'checking' | 'latest' | 'available' | 'downloading' | 'ready'>('checking')
  const [instances, setInstances] = useState<MinecraftInstance[]>([])
  
  useEffect(() => {
  if (!isOpen || activeTab !== 'instances') return

  const handleUpdate = (_e: any, list: MinecraftInstance[]) => {
    setInstances(list)
  }

  window.electronAPI.on('minecraft-instances-update', handleUpdate)
  window.electronAPI.instances.getRunning().then(setInstances)

  return () => {
    window.electronAPI.off('minecraft-instances-update', handleUpdate)
  }
  }, [isOpen, activeTab])

  const closeGame = async (instance: MinecraftInstance) => {
    const success = await window.electronAPI.instances.kill(instance.pid)
    if (success) {
      window.toast.success(`Đã đóng ${instance.name}`, 'Thành công')
    } else {
      window.toast.error(`Không thể đóng ${instance.name}`, 'Lỗi')
    }
  }
  useEffect(() => {
    if (!isOpen || activeTab !== 'updates') {
      setStatus('checking')
      setUpdateInfo(null)
      setDownloadProgress(0)
      return
    }

    window.electronAPI.updater.check()

    const unsubs = [
      window.electronAPI.updater.on('updater:checking', () => setStatus('checking')),
      window.electronAPI.updater.on('updater:latest', () => setStatus('latest')),
      window.electronAPI.updater.on('updater:update-available', (info: UpdateInfo) => {
        setUpdateInfo(info)
        setStatus('available')
      }),
      window.electronAPI.updater.on('updater:download-progress', (percent: number) => {
        setDownloadProgress(percent)
        setStatus('downloading')
      }),
      window.electronAPI.updater.on('updater:update-downloaded', () => {
        setDownloadProgress(100)
        setStatus('ready')
      }),
      window.electronAPI.updater.on('updater:error', () => setStatus('latest')),
    ]

    return () => unsubs.forEach(fn => fn())
  }, [isOpen, activeTab])

  const startUpdate = () => window.electronAPI.updater.startDownload()
  const installNow = () => window.electronAPI.updater.quitAndInstall?.()

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-gray-900/95 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-cyan-500/20">
              <div className="flex items-center gap-3">
                <Zap size={28} className="text-cyan-400" />
                <h2 className="text-xl font-bold text-cyan-400">Quản Lý & Cập Nhật</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex">
              <button
                onClick={() => setActiveTab('instances')}
                className={`flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === 'instances'
                    ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Gamepad2 size={16} /> Instances
              </button>
              <button
                onClick={() => setActiveTab('updates')}
                className={`flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === 'updates'
                    ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <ArrowDownToLine size={16} /> Cập Nhật
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {activeTab === 'instances' && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {instances.length > 0 ? (
                    instances.map((inst) => (
                      <div key={inst.id} className="flex items-center gap-4 rounded-xl bg-gray-800/60 p-4 bg-gray-800/60 hover:bg-gray-700/60 transition">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 shadow-lg">
                          <Gamepad2 className="text-white" size={26} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white truncate">{inst.name}</h3>
                            <span className="text-xs text-cyan-400">{inst.version.split('-')[0]}</span>
                          </div>
                          <p className="text-xs text-cyan-500 font-mono truncate">{inst.version}</p>
                          <div className="mt-1 text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Đang chạy mượt mà
                          </div>
                        </div>

                        <button
                          onClick={() => closeGame(inst)}
                          className="shrink-0 rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-500 transition"
                        >
                          Đóng
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Gamepad2 size={56} className="mx-auto mb-3 opacity-40" />
                      Không có game đang chạy
                    </div>
                  )}
                </div>
              )}

              {/* === TAB UPDATE === */}
              {activeTab === 'updates' && (
                <div className="flex flex-col items-center py-8">
                  {status === 'checking' && (
                    <div className="text-center">
                      <RefreshCw className="w-16 h-16 mx-auto mb-4 text-cyan-400 animate-spin" />
                      <p className="text-gray-400 text-lg">Đang kiểm tra cập nhật...</p>
                    </div>
                  )}

                  {status === 'latest' && (
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl">
                        <CheckCircle2 size={56} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-green-400">Bạn đang dùng phiên bản mới nhất!</h3>
                    </div>
                  )}

                  {(status === 'available' || status === 'downloading') && (
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl">
                        <Download size={52} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-emerald-400 mb-6">
                        Cập nhật mới: v{updateInfo?.version}
                      </h3>

                      <button
                        onClick={startUpdate}
                        disabled={status === 'downloading'}
                        className="relative px-12 py-5 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 disabled:opacity-70 rounded-2xl text-white font-bold text-lg transition flex items-center gap-3 min-w-64 justify-center shadow-xl"
                      >
                        {status === 'downloading' ? (
                          <>
                            <RefreshCw size={24} className="animate-spin" />
                            Đang tải... {downloadProgress}%
                            <div className="absolute -bottom-4 left-6 right-6 h-3 bg-white/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-white transition-all duration-300"
                                style={{ width: `${downloadProgress}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <Download size={24} />
                            Tải ngay v{updateInfo?.version}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {status === 'ready' && (
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-2xl">
                        <CheckCircle2 size={56} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-purple-400 mb-2">Cập nhật đã tải xong!</h3>
                      <p className="text-gray-300 mb-6">Khởi động lại launcher để cài đặt.</p>
                      <button
                        onClick={installNow}
                        className="px-12 py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl text-white font-bold text-lg transition flex items-center gap-3 shadow-xl"
                      >
                        <RefreshCw size={24} />
                        Khởi động lại ngay
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}