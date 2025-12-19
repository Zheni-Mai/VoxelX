// src/renderer/profiles/modals/ImportModpackModal.tsx
import { motion } from 'framer-motion'
import { MotionDiv } from '../../utils/motion'
import { X, Upload, Archive } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ImportModpackModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null

  return (
    <>
      <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 backdrop-blur-sm z-50" />
      <MotionDiv
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900/95 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-3xl w-full max-w-lg p-10 text-center">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center">
              <Archive size={64} className="text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-black text-purple-400 mb-4">Import Modpack</h2>
          <p className="text-gray-400 mb-8">Kéo thả file .zip modpack (CurseForge, Modrinth) vào đây</p>
          
          <button className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold text-xl transition flex items-center gap-3 mx-auto">
            <Upload size={28} />
            Chọn file modpack
          </button>

          <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition">
            <X size={32} />
          </button>
        </div>
      </MotionDiv>
    </>
  )
}