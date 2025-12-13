// src/renderer/LogConsole.tsx
import { useEffect, useRef, useState } from 'react'
import { X, Copy, Upload, Terminal, CheckCircle } from 'lucide-react'

interface LaunchLog {
  message: string
  level: 'info' | 'warn' | 'error' | 'success'
  timestamp: number
}

export default function LogConsole() {
  const [logs, setLogs] = useState<LaunchLog[]>([])
  const [fullLog, setFullLog] = useState('')
  const [status, setStatus] = useState('Đang chờ khởi động...')
  const [progress, setProgress] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const log: LaunchLog = { message, level, timestamp: Date.now() }
    setLogs(prev => [...prev, log])
    setFullLog(prev => prev + message + '\n')
  }

useEffect(() => {
  window.electronAPI.logWindow.ready()

  addLog('Cửa sổ log đã sẵn sàng. Chờ dữ liệu từ launcher...', 'info')

  const handleStatus = (_: any, data: any) => {
    if (data.type === 'progress') {
      setProgress(data.progress || 0)
      setStatus(data.message || 'Đang tải...')
    } else if (data.type === 'launch-complete') {
      setIsCompleted(true)
      setStatus('Minecraft đã khởi động thành công!')
      addLog('Minecraft đã chạy thành công!', 'success')
    } else if (data.type === 'error') {
      addLog(`Lỗi: ${data.message}`, 'error')
    } else if (data.type === 'log') {
      addLog(data.message, data.level || 'info')
    }
  }

  const handleGameLog = (line: string) => {
    if (!line?.trim()) return
    const msg = line.trim()
    let level: 'info' | 'warn' | 'error' | 'success' = 'info'

    if (msg.includes('ERROR') || msg.includes('Exception')) level = 'error'
    else if (msg.includes('WARN')) level = 'warn'
    if (msg.includes('OpenGL') || msg.includes('Loaded')) level = 'success'

    addLog(msg, level)
  }

  window.electronAPI.on('launch-status', handleStatus)
  window.electronAPI.on('minecraft-data', handleGameLog)

  const debugHandler = () => addLog('LogConsole đã nhận event launch-start!', 'success')
  window.electronAPI.on('launch-start', debugHandler)
  return () => {
    window.electronAPI.off('launch-status', handleStatus)
    window.electronAPI.off('minecraft-data', handleGameLog)
    window.electronAPI.off('launch-start', debugHandler)
  }
}, [])

  const copyLog = () => {
    if (!fullLog.trim()) {
      addLog('Log trống, không có gì để copy!', 'warn')
      return
    }

    navigator.clipboard.writeText(fullLog)
    addLog('Đã copy toàn bộ log vào clipboard!', 'success')
  }

  const uploadLog = async () => {
    if (!fullLog.trim()) {
      addLog('Log trống, không có gì để upload!' , 'warn')
      return
    }

    const btn = document.activeElement as HTMLButtonElement
    const originalHtml = btn.innerHTML
    btn.innerHTML = '<span className="animate-spin">↻</span> Đang upload...'
    btn.disabled = true

    try {
      const url = await window.electronAPI.uploadToMclogs(fullLog)

      if (url) {
        await navigator.clipboard.writeText(url)
        addLog(`Upload thành công!\nLink đã copy vào clipboard:\n${url}`, 'success')
      } else {
        addLog('Upload thất bại! Vui lòng thử lại hoặc copy log thủ công.' , 'success')
      }
    } catch (err) {
      console.error(err)
      addLog('Lỗi không xác định khi upload log' , 'error')
    } finally {
      btn.innerHTML = originalHtml
      btn.disabled = false
    }
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <div 
        className="h-11 bg-black/70 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-4 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <Terminal size={24} className="text-cyan-400" />
          <div>
            <h1 className="text-sm font-bold">Cửa sổ Log - VoxelX</h1>
            <p className="text-xs text-gray-400 -mt-0.5">{status}</p>
          </div>
        </div>

        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {isCompleted && <CheckCircle className="text-emerald-400 mr-2" size={22} />}
          
          <button onClick={copyLog} className="p-2 hover:bg-white/10 rounded-lg transition">
            <Copy size={18} />
          </button>
          <button onClick={uploadLog} className="p-2 hover:bg-white/10 rounded-lg transition">
            <Upload size={18} />
          </button>
          <button 
            onClick={() => window.close()}
            className="p-2 hover:bg-red-500/80 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div ref={logRef} className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-gray-950/50">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`mb-1 leading-tight ${
              log.level === 'error' ? 'text-red-400 font-bold' :
              log.level === 'warn' ? 'text-yellow-400' :
              log.level === 'success' ? 'text-emerald-400' :
              'text-gray-300'
            }`}
          >
            {log.message}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-white/10 text-xs text-gray-500 text-center bg-black/30 backdrop-blur">
        {logs.length} dòng log • VoxelX Launcher
      </div>
    </div>
  )
}