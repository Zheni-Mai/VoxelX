// src/renderer/UpdateScreen.tsx
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react'
import BackgroundLogo from '@/assets/icons/logo.png' // Dùng chính logo làm nền

type UpdateState = 'checking' | 'downloading' | 'downloaded' | 'error'

export default function UpdateScreen() {
  const [state, setState] = useState<UpdateState>('checking')
  const [progress, setProgress] = useState(0)
  const [newVersion, setNewVersion] = useState('')
  const [currentVersion, setCurrentVersion] = useState('?.??')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    window.electronAPI.getAppVersion().then((v: string) => {
      setCurrentVersion(v)
    })
  }, [])

  useEffect(() => {
    const handleChecking = () => {
      setState('checking')
      window.electronAPI.updater.check?.()
    }
    window.electronAPI.updater.on('updater:checking', handleChecking)
  }, [])

  useEffect(() => {
    const cleanupFns: (() => void)[] = []

    cleanupFns.push(
      window.electronAPI.updater.on('updater:download-progress', (percent: number) => {
        setProgress(Math.round(percent))
        setState('downloading')
      })
    )

    cleanupFns.push(
      window.electronAPI.updater.on('updater:update-downloaded', () => {
        setState('downloaded')
      })
    )

    cleanupFns.push(
      window.electronAPI.updater.on('updater:error', (msg: string) => {
        setErrorMsg(msg)
        setState('error')
      })
    )

    cleanupFns.push(
      window.electronAPI.updater.on('updater:update-available', (info: { version: string }) => {
        setNewVersion(info.version)
      })
    )

    return () => cleanupFns.forEach(fn => fn())
  }, [])

  return (
  <div className="fixed inset-0 bg-black overflow-hidden flex flex-col">
    <div 
      className="absolute inset-0 -z-10"
      style={{
        backgroundImage: `url(${BackgroundLogo})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '70%',
        opacity: 0.12,
        filter: 'blur(80px)',
      }}
    />
    <div className="absolute inset-0 bg-black/70" />
    <div
      className="h-12 bg-black/80 backdrop-blur-3xl border-b border-white/10 flex items-center justify-center select-none relative z-50"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl shadow-lg">
          <Download size={20} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg">VoxelX Updater</span>
      </div>

      <button
        onClick={() => window.close()}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="absolute right-4 p-2 hover:bg-red-500/70 rounded-lg transition group"
      >
        <X size={18} className="text-gray-400 group-hover:text-white" />
      </button>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <div className="mb-12">
        <img src={BackgroundLogo} alt="VoxelX" className="w-48 h-48 drop-shadow-2xl" />
      </div>

      <div className="w-full max-w-xl text-center space-y-12">
        {state === 'checking' && (
          <div className="space-y-8">
            <RefreshCw size={48} className="text-cyan-400 mx-auto" />
            <p className="text-2xl font-medium text-gray-200">Đang kiểm tra cập nhật...</p>
          </div>
        )}
        {state === 'downloading' && (
          <div className="space-y-10">
            <Download size={72} className="text-cyan-400 mx-auto" />

            <div className="space-y-6">
              <p className="text-3xl font-semibold text-white">Đang tải bản cập nhật</p>
              <p className="text-7xl font-bold text-cyan-400">{progress}%</p>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {state === 'downloaded' && (
          <div className="space-y-10">
            <CheckCircle size={96} className="text-emerald-400 mx-auto" />

            <div>
              <p className="text-4xl font-bold text-white">Tải thành công!</p>
              <p className="text-xl text-emerald-300 mt-4">Đang khởi động lại để cài đặt...</p>
              <p className="text-lg text-gray-400 mt-8">Cửa sổ sẽ tự động đóng</p>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-10">
            <AlertCircle size={64} className="text-red-400 mx-auto" />

            <div>
              <p className="text-3xl font-bold text-red-400">Cập nhật thất bại</p>
              <p className="text-lg text-gray-300 mt-6 max-w-md mx-auto leading-relaxed">
                {errorMsg || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.'}
              </p>

              <button
                onClick={() => window.location.reload()}
                className="mt-10 px-12 py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-xl font-semibold text-white text-lg shadow-xl transition"
              >
                Thử lại ngay
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-gray-400 text-sm tracking-widest z-20">
      Phiên bản hiện tại: <span className="text-cyan-400 font-bold">v{currentVersion}</span>
      {newVersion && (
        <>
          {' → '}
          <span className="text-emerald-400 font-bold">v{newVersion}</span>
        </>
      )}
    </div>
  </div>
)
}