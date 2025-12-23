// src/renderer/changelog/modal/VoxelXReleaseDetailModal.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink } from 'lucide-react'

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string
  html_url: string
  prerelease: boolean
}

interface VoxelXReleaseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  release: GitHubRelease | null
}

// Hàm format markdown đơn giản như bạn muốn
const formatMarkdownPreview = (body: string): string => {
  return body
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-white/10 text-purple-300 px-2 py-1 rounded font-mono text-sm">$1</code>')
    .replace(/^- (.*)$/gm, '<span class="text-gray-200">• $1</span><br/>')
    .replace(/^### (.*)$/gm, '<div class="text-purple-300 font-bold text-xl mt-6 mb-3">$1</div>')
    .replace(/^## (.*)$/gm, '<div class="text-purple-300 font-bold text-2xl mt-8 mb-4">$1</div>')
    .replace(/^# (.*)$/gm, '<div class="text-purple-400 font-black text-3xl mt-10 mb-5">$1</div>')
    .replace(/\n/g, '<br/>')
}

export default function VoxelXReleaseDetailModal({
  isOpen,
  onClose,
  release,
}: VoxelXReleaseDetailModalProps) {
  if (!release) return null

  const formattedBody = release.body ? formatMarkdownPreview(release.body) : null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-black/70 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-2xl
                          w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative flex items-center justify-center px-10 pt-10 pb-8 flex-shrink-0 border-b border-white/10">
                <div className="absolute left-1/2 -translate-x-1/2 top-4 w-16 h-1.5 bg-white/30 rounded-full md:hidden" />

                <h3 className="text-4xl lg:text-5xl font-black text-purple-400 text-center">
                  {release.tag_name}
                  {release.prerelease && (
                    <span className="ml-4 text-2xl lg:text-3xl text-orange-400">
                      (Pre-release)
                    </span>
                  )}
                </h3>

                <button
                  onClick={onClose}
                  className="absolute top-10 right-10 p-4 hover:bg-white/10 rounded-2xl transition group"
                  aria-label="Đóng"
                >
                  <X size={40} className="text-gray-400 group-hover:text-white transition" />
                </button>
              </div>

              {/* Content – scrollable */}
              <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                <div className="space-y-8 max-w-none">
                  {/* Title & Date */}
                  <div>
                    <p className="text-3xl font-bold text-white">
                      {release.name || 'Cập nhật VoxelX'}
                    </p>
                    <p className="text-xl text-gray-400 mt-3">
                      Phát hành:{' '}
                      {new Date(release.published_at).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Changelog – dùng dangerouslySetInnerHTML với format thủ công */}
                  <div className="text-lg leading-relaxed text-gray-200">
                    {formattedBody ? (
                      <div dangerouslySetInnerHTML={{ __html: formattedBody }} />
                    ) : (
                      <p className="italic text-gray-500 text-center py-16 text-xl">
                        Không có mô tả chi tiết cho phiên bản này.
                      </p>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="pt-8 border-t border-white/10">
                    <a
                      href={release.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-4 px-10 py-6 bg-gradient-to-r from-purple-500 to-pink-500 
                                 hover:from-purple-600 hover:to-pink-600 rounded-2xl text-xl font-bold shadow-2xl 
                                 transition-all duration-300 group"
                    >
                      <ExternalLink size={32} className="group-hover:scale-110 transition" />
                      Xem đầy đủ trên GitHub
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}