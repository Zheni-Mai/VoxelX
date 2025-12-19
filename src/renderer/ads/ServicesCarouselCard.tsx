// src/renderer/ads/ServicesCarouselCard.tsx
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ExternalLink, Info } from 'lucide-react'
import { MotionDiv } from '../utils/motion'
import { useState } from 'react'
import { vinaHostService } from './services/vinaHost'
import { bumbooHostService } from './services/bumbooHost'
import { noService } from './services/nosevices'
import { asakaCloudService } from './services/asakaCloud'

// import { vietnixService } from './services/vietnix'

import ServiceDetailModal from './ServiceDetailModal'

interface Service {
  id: string
  name: string
  slogan: string
  description: string
  price: string
  url: string
  icon: any
  gradient: string
  details?: {
    title: string
    points: { icon: any; text: string }[]
    description: string
  }
}

const services: Service[] = [
  noService,
  //vinaHostService,
  //bumbooHostService,
  //axCloudService,
  //asakaCloudService,
  // vietnixService,
]

interface ServicesCarouselCardProps {
  isLoading?: boolean
}

export default function ServicesCarouselCard({ isLoading = false }: ServicesCarouselCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const currentService = services[currentIndex]

  const prevService = () => setCurrentIndex((prev) => (prev === 0 ? services.length - 1 : prev - 1))
  const nextService = () => setCurrentIndex((prev) => (prev === services.length - 1 ? 0 : prev + 1))

  if (isLoading || services.length === 0) {
    return (
      <div className="bg-white/6 backdrop-blur-3xl rounded-2xl border border-white/10 p-10 lg:p-14 animate-pulse space-y-8">
        <div className="h-12 bg-white/10 rounded-2xl w-64" />
        <div className="h-20 lg:h-28 bg-white/15 rounded-2xl w-96" />
        <div className="h-6 bg-white/10 rounded-full w-48" />
        <div className="space-y-4">
          <div className="h-5 bg-white/10 rounded w-full" />
          <div className="h-5 bg-white/10 rounded w-11/12" />
          <div className="h-5 bg-white/10 rounded w-10/12" />
        </div>
        <div className="flex gap-6 pt-6">
          <div className="h-14 bg-white/10 rounded-2xl w-64" />
          <div className="h-14 bg-white/10 rounded-2xl w-56" />
        </div>
      </div>
    )
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="h-full"
    >
      <div className="relative bg-white/6 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl overflow-hidden h-full p-10 lg:p-14">
        <div className="absolute inset-0 rounded-2xl" />
        <div className="relative space-y-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div>
              <p className="text-sm uppercase tracking-widest text-cyan-300 font-bold opacity-90">
                Dịch vụ
              </p>
              <h2 className="text-5xl lg:text-6xl font-black text-white mt-3 leading-none">
                {currentService.name}
              </h2>
              <p className="text-xl lg:text-2xl text-gray-300 mt-3 font-medium">
                {currentService.slogan}
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className={`px-8 py-4 rounded-full text-white font-bold text-2xl shadow-xl whitespace-nowrap bg-gradient-to-r ${currentService.gradient}`}>
                {currentService.price}
              </span>
            </div>
          </div>

          <p className="text-lg lg:text-xl text-gray-100 leading-relaxed max-w-4xl">
            {currentService.description}
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
            <a
              href={currentService.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-lg transition-all text-lg font-bold border border-white/20 hover:border-cyan-400 shadow-lg group"
            >
              <ExternalLink size={28} className="group-hover:scale-110 transition" />
              Truy cập ngay
            </a>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-sm transition-all group shadow-lg border border-white/20 hover:border-cyan-400"
            >
              <Info size={28} className="text-cyan-400 group-hover:scale-110 transition" />
              <span className="font-medium text-gray-200">Chi tiết dịch vụ</span>
            </button>
          </div>
          {services.length > 1 && (
            <div className="absolute bottom-10 right-10 flex gap-4">
              <button
                onClick={prevService}
                className="p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 shadow-lg transition-all hover:scale-110"
              >
                <ChevronLeft size={28} className="text-white" />
              </button>
              <button
                onClick={nextService}
                className="p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 shadow-lg transition-all hover:scale-110"
              >
                <ChevronRight size={28} className="text-white" />
              </button>
            </div>
          )}
        </div>
      </div>
      <ServiceDetailModal
        service={currentService}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </MotionDiv>
  )
}