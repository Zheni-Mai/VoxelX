// src/renderer/components/ToastContainer.tsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

interface Toast {
  id: number
  title?: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastContainerProps {
  toasts: Toast[]
  removeToast: (id: number) => void
}

const icons = {
  success: <CheckCircle className="w-6 h-6" />,
  error: <AlertCircle className="w-6 h-6" />,
  warning: <AlertTriangle className="w-6 h-6" />,
  info: <Info className="w-6 h-6" />,
}

const colors = {
  success: 'from-emerald-500 to-cyan-600',
  error: 'from-red-500 to-rose-600',
  warning: 'from-yellow-500 to-orange-600',
  info: 'from-blue-500 to-cyan-600',
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] space-y-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="pointer-events-auto w-96 max-w-full"
            onClick={() => removeToast(toast.id)}
          >
            <div className={`relative overflow-hidden rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/20 shadow-2xl`}>
              <div className="p-6 flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[toast.type]} text-white shadow-lg`}>
                  {icons[toast.type]}
                </div>

                <div className="flex-1">
                  {toast.title && (
                    <h3 className="font-bold text-lg text-white">{toast.title}</h3>
                  )}
                  <p className="text-gray-300 mt-1 leading-relaxed">{toast.message}</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeToast(toast.id)
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <motion.div
                className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${colors[toast.type]}`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: (toast.duration || 4000) / 1000, ease: 'linear' }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}