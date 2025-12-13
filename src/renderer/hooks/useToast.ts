// src/renderer/hooks/useToast.ts
import { useState, useEffect, useCallback } from 'react'

interface Toast {
  id: number
  title?: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const listeners: ((toasts: Toast[]) => void)[] = []
let toastCounter = 0

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (newToasts: Toast[]) => setToasts(newToasts)
    listeners.push(handler)
    return () => {
      const index = listeners.indexOf(handler)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  const addToast = useCallback((
    message: string,
    options: { title?: string; type?: Toast['type']; duration?: number } = {}
  ) => {
    const id = ++toastCounter
    const toast: Toast = {
      id,
      message,
      type: options.type || 'info',
      title: options.title,
      duration: options.duration ?? 4000,
    }

    const newToasts = [...toasts, toast]
    listeners.forEach(l => l(newToasts))

    setTimeout(() => removeToast(id), toast.duration)
  }, [toasts])

  const removeToast = useCallback((id: number) => {
    const newToasts = toasts.filter(t => t.id !== id)
    listeners.forEach(l => l(newToasts))
  }, [toasts])

  const success = (msg: string, title?: string) => addToast(msg, { type: 'success', title })
  const error = (msg: string, title?: string) => addToast(msg, { type: 'error', title })
  const warning = (msg: string, title?: string) => addToast(msg, { type: 'warning', title })
  const info = (msg: string, title?: string) => addToast(msg, { type: 'info', title })

  return { success, error, warning, info, toasts, removeToast }
}