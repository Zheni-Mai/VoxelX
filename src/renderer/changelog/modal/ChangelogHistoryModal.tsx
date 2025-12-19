// src/renderer/changelog/ChangelogHistoryModal.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { MotionDiv } from '../../utils/motion'

interface ChangelogEntry {
  version: string
  type: 'release' | 'snapshot'
  date: string
  description: string
  url: string
}

interface ChangelogHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  changelogs: ChangelogEntry[]
}

export default function ChangelogHistoryModal({ 
  isOpen, 
  onClose, 
  changelogs 
}: ChangelogHistoryModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-sm z-50"
          />
          <MotionDiv
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-black/70 backdrop-blur-3xl rounded-2xl border border-gray-500/40 shadow-2xl 
                        w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative text-gray-400 flex items-center justify-center px-8 pt-6 pb-4 flex-shrink-0">
                <div className="absolute left-1/2 -translate-x-1/2 top-3 w-12 h-1.5 bg-white/30 rounded-full md:hidden" />
                
                <h3 className="text-3xl font-black text-cyan-400">Lịch sử cập nhật</h3>
                
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 p-3 hover:bg-white/10 rounded-2xl transition group"
                  aria-label="Đóng"
                >
                  <X size={36} className="text-gray-400 group-hover:text-white transition" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4">
                {changelogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Đang tải lịch sử cập nhật...
                  </div>
                ) : (
                  changelogs.map((log, index) => (
                    <motion.a
                      key={log.version}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      href={log.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-6 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 
                                hover:border-cyan-400/60 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-bold text-white group-hover:text-cyan-300 transition">
                          {log.version}
                        </span>
                        <span
                          className={`px-5 py-2 text-sm font-bold rounded-full ${
                            log.type === 'release'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {log.type === 'release' ? 'Release' : 'Snapshot'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{log.date}</p>
                      <p className="text-gray-300 leading-relaxed">{log.description}</p>
                    </motion.a>
                  ))
                )}
              </div>
            </div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  )
}