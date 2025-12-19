// src/renderer/ads/modal/ServiceDetailModal.tsx
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { MotionDiv } from '../utils/motion'

interface Service {
  name: string
  url: string
  details?: {
    title: string
    points: { icon: any; text: string }[]
    description: string
  }
}

interface ServiceDetailModalProps {
  service: Service
  isOpen: boolean
  onClose: () => void
}

export default function ServiceDetailModal({ service, isOpen, onClose }: ServiceDetailModalProps) {
  if (!isOpen) return null

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <MotionDiv
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="relative max-w-4xl w-full mx-6 bg-white/8 bg-black/70 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <X size={28} className="text-white" />
        </button>

        <div className="p-10 lg:p-14">
          <h2 className="text-3xl font-black text-white mb-8">{service.name} - Thông tin chi tiết</h2>

          {service.details ? (
            <div className="space-y-8 text-lg text-gray-200">
              <h3 className="text-3xl font-black">{service.details.title}</h3>
              <ul className="space-y-4">
                {service.details.points.map((point, idx) => (
                  <li key={idx} className="flex items-center gap-4">
                    <point.icon className="text-cyan-400 flex-shrink-0" size={28} />
                    <span>{point.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-gray-300">{service.details.description}</p>
            </div>
          ) : (
            <p className="text-gray-400">Không có thông tin chi tiết.</p>
          )}

          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-block px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl font-bold text-white hover:scale-105 transition"
          >
            Đăng ký ngay →
          </a>
        </div>
      </MotionDiv>
    </MotionDiv>
  )
}