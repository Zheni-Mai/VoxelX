import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Archive, CheckCircle, XCircle } from 'lucide-react'

export default function ExportProgressToast() {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'preparing' | 'exporting' | 'success' | 'error'>('preparing')
  const [message, setMessage] = useState('Đang chuẩn bị xuất profile...')
  const unsubscribes = useRef<(() => void)[]>([])

  useEffect(() => {
    unsubscribes.current.forEach(fn => fn())
    unsubscribes.current = []

    const start = () => { 
      setVisible(true)
      setStatus('preparing')
      setProgress(0)
      setMessage('Đang chuẩn bị xuất profile...')
    }

    const update = (data: any) => {
      console.log('Toast nhận progress:', data)
      if (!data) return
      setStatus('exporting')
      setProgress(data.percent ?? 0)
      setMessage(`Đang nén: ${data.currentFile} (${data.filesProcessed} files)`)
    }

    const complete = (data: any) => { 
      if (!data) {
        setStatus('error')
        setMessage('Lỗi không xác định')
        setTimeout(() => setVisible(false), 5000)
        return
      }

      if (data.success) {
        setStatus('success')
        setProgress(100)
        setMessage('Xuất profile thành công!')
        setTimeout(() => setVisible(false), 3000)
      } else {
        setStatus('error')
        setMessage(data.message || 'Xuất profile thất bại!')
        setTimeout(() => setVisible(false), 5000)
      }
    }

    unsubscribes.current.push(
      window.electronAPI.on('profile:export-start', start),
      window.electronAPI.on('profile:export-progress', update),
      window.electronAPI.on('profile:export-complete', complete)
    )
    return () => {
      unsubscribes.current.forEach(fn => fn())
      unsubscribes.current = []
    }
  }, []) 

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-8 right-8 z-[99999]"
      >
        <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-3xl p-6 min-w-96">
          <div className="flex items-center gap-4 mb-4">
            {status === 'success' && <CheckCircle className="text-green-400" size={32} />}
            {status === 'error' && <XCircle className="text-red-400" size={32} />}
            {status !== 'success' && status !== 'error' && <Archive className="text-cyan-400 animate-pulse" size={32} />}
            <div>
              <h3 className="text-xl font-bold text-white">Đang xuất profile</h3>
              <p className="text-gray-400 text-sm">{message}</p>
            </div>
          </div>

          {(status === 'exporting' || status === 'success') && (
            <div className="mt-4">
              <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <p className="text-right text-sm text-gray-400 mt-2">{progress}%</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}