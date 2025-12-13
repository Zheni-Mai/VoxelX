// src/renderer/components/SplashScreen.tsx
import { motion } from 'framer-motion'
import Logo from '@/assets/icons/logo.png'
import SplashVideo from '@/assets/video/splash.mp4'
import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onReady: () => void
}

export default function SplashScreen({ onReady }: SplashScreenProps) {
  const [videoEnded, setVideoEnded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Đang khởi động...')
  const [version] = useState('0.0.7')

  useEffect(() => {
    if (!videoEnded) return

    let currentProgress = 0
    let step = 0

    const steps = [
      { text: 'Kiểm tra cập nhật launcher...', delay: 1500 },
      { text: 'Tải danh sách profile...', delay: 1200 },
      { text: 'Khôi phục phiên đăng nhập...', delay: 1000 },
      { text: 'Tối ưu hóa bộ nhớ đệm...', delay: 900 },
      { text: 'Hoàn tất! Chào mừng trở lại', delay: 800 },
    ]
    const checkUpdate = async () => {
      try {
        window.electronAPI.updater.check()
        setStatus('Đang kiểm tra cập nhật...')
      } catch (err) {
        console.warn('Updater check failed:', err)
      }
    }
    const loadProfiles = async () => {
      try {
        const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
        await window.electronAPI.profileAPI.listProfiles(appDataPath)
        setStatus('Đã tải profile')
      } catch (err) {
        console.warn('Load profiles failed:', err)
      }
    }
    const autoLogin = async () => {
      try {
        const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
        const accounts = await window.electronAPI.accountAPI.getAccounts(appDataPath)
        const lastUsed = accounts?.[0]
        if (lastUsed) {
          window.electronAPI.ipcRenderer.send('select-account', lastUsed)
          setStatus(`Chào ${lastUsed.name}!`)
        }
      } catch (err) {
        console.warn('Auto login failed:', err)
      }
    }

    const run = async () => {
      await checkUpdate()
      animateProgress(20)
      await new Promise(r => setTimeout(r, 800))
      await loadProfiles()
      animateProgress(50)
      await new Promise(r => setTimeout(r, 600))
      await autoLogin()
      animateProgress(80)
      await new Promise(r => setTimeout(r, 1000))
      animateProgress(100)

      setTimeout(onReady, 800)
    }

    const animateProgress = (target: number) => {
      const start = currentProgress
      const duration = 800
      const startTime = Date.now()

      const tick = () => {
        const elapsed = Date.now() - startTime
        const ratio = Math.min(elapsed / duration, 1)
        const ease = 1 - Math.pow(1 - ratio, 3)
        currentProgress = Math.round(start + (target - start) * ease)
        setProgress(currentProgress)

        if (ratio < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    run()
    const unsubs = [
      window.electronAPI.updater.on('updater:update-available', (info: any) => {
        setStatus(`Đã phát hiện bản mới v${info.version}`)
      }),
      window.electronAPI.updater.on('updater:download-progress', (p: number) => {
        setStatus(`Đang tải cập nhật... ${p}%`)
        setProgress(Math.max(progress, p))
      }),
      window.electronAPI.updater.on('updater:update-downloaded', () => {
        setStatus('Cập nhật đã sẵn sàng! Khởi động lại để cài đặt')
      }),
    ]

    return () => unsubs.forEach(fn => fn())
  }, [videoEnded, onReady])

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {!videoEnded && (
        <motion.video
          src={SplashVideo}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          onEnded={() => setVideoEnded(true)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: videoEnded ? 1 : 0 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-cyan-900/40" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          className="relative mb-10"
        >
          <img src={Logo} alt="VoxelX" className="w-60 h-60 drop-shadow-2xl" />
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 blur-3xl bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full scale-150"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1.2 }}
          className="mt-24 w-full max-w-3xl px-12"
        >
          <div className="text-center mb-6 text-white text-lg tracking-wider">
            {status}
          </div>

          <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-xl border border-white/20">
            <motion.div
              className="h-full relative bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full"
              style={{ width: `${progress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 15 }}
            >
              <div className="absolute inset-0 bg-white/40 animate-shine" />
            </motion.div>
          </div>

          <div className="text-right mt-5 text-3xl font-bold text-cyan-400 font-mono">
            {progress}%
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-12 text-gray-500 text-sm tracking-widest"
        >
          VERSION {version} • © 2025 VOXELX STUDIO
        </motion.div>
      </motion.div>
    </div>
  )
}