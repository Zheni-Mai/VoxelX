// src/renderer/changelog/card/LatestVersionCard.tsx
import { motion } from 'framer-motion'
import { ChevronUp, Globe } from 'lucide-react'
import { MotionDiv } from '../../utils/motion'

interface ChangelogEntry {
  version: string
  type: 'release' | 'snapshot'
  date: string
  description: string
  url: string
}

interface LatestVersionCardProps {
  latestLog: ChangelogEntry | undefined
  onOpenHistory: () => void
  isLoading?: boolean
}

export default function LatestVersionCard({ 
  latestLog, 
  onOpenHistory,
  isLoading = false 
}: LatestVersionCardProps) {
  if (isLoading || !latestLog) {
    return (
      <div className="bg-white/6 backdrop-blur-3xl rounded-3xl border border-white/10 p-10 lg:p-14 animate-pulse space-y-8">
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
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="relative bg-white/6 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl overflow-hidden h-full p-10 lg:p-14">
        <div className="absolute inset-0 rounded-3xl" />
        <div className="relative space-y-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div>
              <p className="text-sm uppercase tracking-widest text-cyan-300 font-bold opacity-90">
                Phiên bản mới nhất
              </p>
              <h2 className="text-6xl lg:text-7xl font-black text-white mt-3 leading-none">
                {latestLog.version}
              </h2>
              <p className="text-xl lg:text-2xl text-gray-300 mt-3 font-medium">
                {latestLog.date}
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className={`px-8 py-2 rounded-2xl text-white font-bold text-2xl shadow-xl whitespace-nowrap
                ${latestLog.type === 'release'
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}>
                {latestLog.type === 'release' ? 'Bản chính thức' : 'Snapshot'}
              </span>
            </div>
          </div>

          <p className="text-lg lg:text-xl text-gray-100 leading-relaxed max-w-4xl">
            {latestLog.description || 'Cập nhật mới dành cho Minecraft'}
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
            <a
              href={latestLog.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-lg transition-all text-lg font-bold border border-white/20 hover:border-cyan-400 shadow-lg group"
            >
              <Globe size={28} className="group-hover:scale-110 transition" />
              Xem chi tiết trên Minecraft.net
            </a>

            <button
              onClick={onOpenHistory}
              className="inline-flex items-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-sm transition-all group shadow-lg border border-white/20 hover:border-cyan-400"
            >
              <ChevronUp size={32} className="text-cyan-400 group-hover:scale-110 transition" />
              <span className="font-medium text-gray-200">Xem lịch sử cập nhật</span>
            </button>
          </div>
        </div>
      </div>
    </MotionDiv>
  )
}