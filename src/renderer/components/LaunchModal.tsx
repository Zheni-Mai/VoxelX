// src/renderer/components/LaunchModal.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Upload, Loader2, Minimize2, CheckCircle } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { MotionDiv } from '../utils/motion'

interface LaunchLog {
  message: string
  level: 'info' | 'warn' | 'error' | 'success'
  timestamp: number
}

export default function LaunchModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Khởi tạo launcher...')
  const [logs, setLogs] = useState<LaunchLog[]>([])
  const [fullLog, setFullLog] = useState('')
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [currentTask, setCurrentTask] = useState('')

  useEffect(() => {
    if (logContainerRef.current && isOpen && !isMinimized) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, isOpen, isMinimized])

  useEffect(() => {
    const addLog = (message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
      const log: LaunchLog = { message, level, timestamp: Date.now() }
      setLogs(prev => [...prev, log])
      setFullLog(prev => prev + message + '\n')
    }

    const handleLaunchStart = () => {
      setIsOpen(true)
      setIsMinimized(false)
      setIsCompleted(false)
      setProgress(0)
      setStatus('Đang chuẩn bị khởi động...')
      setCurrentTask('')
      setLogs([])
      setFullLog('')
      addLog('Bắt đầu khởi động Minecraft...', 'info')
    }

    const handleLaunchStatus = (data: any) => {
      if (data.type === 'progress') {
        setProgress(data.progress || 0)
        setStatus(data.message || 'Đang tải...')

        if (data.element) setCurrentTask(data.element)

        if (data.progress >= 99 && data.phase === 'downloading') {
          setStatus('Đang khởi động Minecraft...')
        }

        if (data.phase === 'launched') {
          setStatus('Minecraft đã khởi động thành công!')
          setProgress(100)
          setIsCompleted(true)
          addLog('Minecraft đã chạy! Bạn có thể đóng cửa sổ này.', 'success')
          setTimeout(() => {
            if (isOpen && !isMinimized) setIsMinimized(true)
          }, 3000)
        }
      }
      else if (data.type === 'launch-complete') {
        setIsCompleted(true)
      }
      else if (data.type === 'error') {
        setStatus('Lỗi: ' + (data.message || 'Không xác định'))
        addLog(`Lỗi: ${data.message}`, 'error')
      }
      else if (data.type === 'log') {
        addLog(data.message, data.level || 'info')
      }
    }

    const handleGameLog = (line: string) => {
      if (!line?.trim) return
      const message = line.trim()
      let level: 'info' | 'warn' | 'error' | 'success' = 'info'

      if (message.includes('ERROR') || message.includes('Exception') || message.includes('Failed')) {
        level = 'error'
      } else if (message.includes('WARN') || message.includes('Warning')) {
        level = 'warn'
      } else if (message.includes('OpenGL') || message.includes('Loaded')) {
        level = 'success'
      }

      addLog(message, level)
    }

    const handleLaunchClosed = () => {
      addLog('Minecraft đã thoát hoàn toàn. Đóng cửa sổ log...', 'info')
      setTimeout(() => {
        setIsOpen(false)
      }, 1500)
    }

    const unsubStart = window.electronAPI.on('launch-start', handleLaunchStart)
    const unsubStatus = window.electronAPI.on('launch-status', handleLaunchStatus)
    const unsubLog = window.electronAPI.on('minecraft-data', handleGameLog)
    const unsubClosed = window.electronAPI.on('launch-closed', handleLaunchClosed)

    return () => {
      unsubStart(); unsubStatus(); unsubLog(); unsubClosed()
    }
  }, [isOpen])

  const copyLog = () => {
    navigator.clipboard.writeText(fullLog)
    window.toast.success('Đã copy toàn bộ log!', 'Thành công')
  }

  const uploadLog = async () => {
    try {
      const res = await fetch('https://api.mclo.gs/1/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fullLog })
      })
      const json = await res.json()
      if (json.url) {
        navigator.clipboard.writeText(json.url)
        window.toast.success('Upload thành công! Link đã được copy: ' + json.url, 'Thành công')
      }
    } catch {
      window.toast.error('Upload thất bại', 'Lỗi')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {!isMinimized ? (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-6"
          onClick={() => !isCompleted && setIsOpen(false)}
        >
          <MotionDiv
            initial={{ scale: 0.9, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 100 }}
            className="bg-gray-900/95 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-3xl font-black text-cyan-400 flex items-center gap-3">
                {isCompleted ? <CheckCircle className="text-emerald-400" /> : <Loader2 className="animate-spin" />}
                Khởi động Minecraft
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-3 hover:bg-white/10 rounded-xl transition"
                  title="Thu nhỏ"
                >
                  <Minimize2 size={28} className="text-gray-400" />
                </button>
                {!isCompleted && (
                  <button onClick={() => setIsOpen(false)} className="p-3 hover:bg-white/10 rounded-xl transition">
                    <X size={32} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            <div className="px-8 pt-6">
              <div className="text-xl font-medium text-white mb-3">{status}</div>
              <div className="w-full bg-white/10 rounded-xl h-12 overflow-hidden">
                <motion.div
                  className={`h-full flex items-center justify-end pr-6 text-xl font-bold ${
                    isCompleted ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                >
                  {progress > 10 && <span className="drop-shadow-lg">{Math.round(progress)}%</span>}
                </motion.div>
              </div>
              <div className="mt-3 text-sm text-gray-400 font-medium">
                {currentTask === 'assets' && 'Tải tài nguyên hình ảnh & âm thanh'}
                {currentTask === 'libraries' && 'Tải thư viện Java'}
                {currentTask === 'client' && 'Tải file game chính'}
                {currentTask === 'natives' && 'Giải nén thư viện hệ thống'}
                {currentTask === 'loader' && 'Cài đặt Fabric/Forge'}
                {progress >= 99 && !currentTask && 'Đang khởi động JVM...'}
                {isCompleted && 'Minecraft đã chạy thành công!'}
                {!currentTask && progress < 100 && 'Đang chuẩn bị...'}
              </div>
            </div>
            <div ref={logContainerRef} className="flex-1 overflow-y-auto p-8 font-mono text-sm scrollbar-thin scrollbar-thumb-white/20">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-20">
                  <Loader2 className="animate-spin mx-auto mb-4" size={48} />
                  <p>Đang chuẩn bị khởi động...</p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`mb-1 break-all ${
                      log.level === 'error' ? 'text-red-400 font-bold' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'success' ? 'text-emerald-400 font-bold' :
                      'text-gray-300'
                    }`}
                  >
                    {log.message}
                  </div>
                ))
              )}
            </div>
            <div className="p-6 border-t border-white/10 flex gap-4 flex-wrap items-center">
              <button onClick={copyLog} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-3 transition">
                <Copy size={20} /> Copy Log
              </button>
              <button onClick={uploadLog} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl flex items-center gap-3 transition">
                <Upload size={20} /> Upload mclo.gs
              </button>
              <div className="flex-1 text-right text-xs text-gray-500">
                {logs.length} dòng log
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      ) : (
        <MotionDiv
          initial={{ scale: 0, y: 100 }}
          animate={{ scale: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3"
        >
          {isCompleted && (
            <MotionDiv
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-emerald-600/95 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl border border-emerald-400/50 flex items-center gap-4 cursor-pointer"
              onClick={() => {
                setIsMinimized(false)
              }}
            >
              <CheckCircle size={32} />
              <div>
                <div className="font-bold text-lg">Minecraft đã khởi động!</div>
                <div className="text-sm opacity-90">Click để xem log</div>
              </div>
            </MotionDiv>
          )}
          {!isCompleted && (
            <motion.div
              layoutId="launch-tray"
              className="bg-gray-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-5 min-w-80 cursor-pointer"
              onClick={() => setIsMinimized(false)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin text-cyan-400" size={28} />
                  <span className="font-bold text-white">Đang khởi động...</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="text-sm text-gray-300 mb-2">{status}</div>
              <div className="w-full bg-white/10 rounded-full h-10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 flex items-center justify-end pr-4 text-sm font-bold"
                  animate={{ width: `${progress}%` }}
                >
                  {progress > 15 && `${Math.round(progress)}%`}
                </motion.div>
              </div>
            </motion.div>
          )}
        </MotionDiv>
      )}
    </AnimatePresence>
  )
}