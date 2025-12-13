// src/renderer/components/WelcomeCarouselModal.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'

import slide1 from '@/assets/new/1.png'
import slide2 from '@/assets/new/2.png'
import slide3 from '@/assets/new/3.png'
import slide4 from '@/assets/new/4.png'
import slide5 from '@/assets/new/5.png'

interface Slide {
  image: string
  title: string
  description: string
}

const slides: Slide[] = [
  {
    image: slide1,
    title: 'Chào mừng đến với VoxelX 2.0!',
    description: 'Giao diện hiện đại, hiệu suất vượt trội và trải nghiệm mượt mà hơn bao giờ hết.'
  },
  {
    image: slide2,
    title: 'Hỗ trợ Feather Client UI chính thức',
    description: 'Trải nghiệm giao diện Feather Client đẹp lung linh, nhẹ nhàng và đầy tính năng.'
  },
  {
    image: slide3,
    title: 'Quản lý Mod thông minh từ Modrinth',
    description: 'Tìm kiếm, tải và bật/tắt mod dễ dàng.'
  },
  {
    image: slide4,
    title: 'Tự động tải và chọn Java phù hợp',
    description: 'Không cần lo về Java nữa – launcher sẽ tự động tải đúng phiên bản cho từng Minecraft.'
  },
  {
    image: slide5,
    title: 'Hỗ trợ Offline & Ely.by Skin/Cape',
    description: 'Hiển thị skin và cape đẹp mắt ngay cả khi chơi offline hoặc dùng tài khoản Ely.by.'
  },
]

interface WelcomeCarouselModalProps {
  isOpen: boolean
  onClose: () => void
  currentVersion: string
}

export default function WelcomeCarouselModal({ isOpen, onClose, currentVersion }: WelcomeCarouselModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)

const nextSlide = () => {
  setCurrentSlide((prev) => (prev + 1) % slides.length)
}

const prevSlide = () => {
  setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
}

  const handleClose = async () => {
    if (dontShowAgain) {
      try {
        const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
        await window.electronAPI.fileAPI.writeFile(
          appDataPath,
          'welcome_seen.json',
          JSON.stringify({ version: currentVersion })
        )
      } catch (err) {
        console.error('Không lưu được trạng thái welcome modal:', err)
      }
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-xl"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden w-full max-w-5xl h-[90vh] max-h-[800px] mx-8 flex flex-col lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 z-50 p-3 rounded-xl hover:bg-white/10 transition"
        >
          <X size={28} className="text-gray-400" />
        </button>
          <div className="relative w-full lg:w-3/5 h-2/5 lg:h-full overflow-hidden rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none">
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={currentSlide}
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  opacity: { duration: 0.6, ease: "easeInOut" }
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden pointer-events-none rounded-t-3xl" />
          </div>
        <div className="relative w-full lg:w-2/5 flex flex-col justify-between p-10 lg:p-16">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${currentSlide}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-lg lg:text-xl text-gray-300 leading-relaxed">
                  {slides[currentSlide].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="space-y-10">
            <div className="flex gap-3 justify-center lg:justify-start">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-3 rounded-full transition-all duration-300 ${
                    i === currentSlide
                      ? 'bg-cyan-400 w-12'
                      : 'bg-white/30 w-3 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
            <div className="space-y-6">
              <label className="flex items-center gap-4 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition ${
                    dontShowAgain
                      ? 'bg-cyan-500 border-cyan-500'
                      : 'bg-transparent border-white/30'
                  }`}>
                    {dontShowAgain && <CheckCircle size={20} className="text-white" />}
                  </div>
                </div>
                <span className="text-gray-300 text-lg">
                  Không hiển thị lại ở phiên bản này
                </span>
              </label>

              <button
                onClick={handleClose}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-xl shadow-lg transition transform hover:scale-105"
              >
                Bắt đầu trải nghiệm!
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={prevSlide}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-black/50 hover:bg-black/70 transition hidden lg:block"
        >
          <ChevronLeft size={36} className="text-white" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-black/50 hover:bg-black/70 transition hidden lg:block"
        >
          <ChevronRight size={36} className="text-white" />
        </button>
      </motion.div>
    </motion.div>
  )
}