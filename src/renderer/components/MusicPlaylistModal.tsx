// src/renderer/components/MusicPlaylistModal.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { MotionDiv } from '../utils/motion'
import { X, Plus, Trash2 } from 'lucide-react'
import { useToast } from '../hooks/useToast'

interface Track {
  id: string
  name: string
  path: string
  url: string
  filename?: string
  dir?: string
}

interface MusicPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  tracks: Track[]
  currentTrack: Track | null
  isPlaying: boolean
  onPlayTrack: (track: Track) => void
  onAddMusic: () => void
  onDeleteTrack: (track: Track) => Promise<void>
}

export default function MusicPlaylistModal({
  isOpen,
  onClose,
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onAddMusic,
  onDeleteTrack,
}: MusicPlaylistModalProps) {
  const { error } = useToast()

  const handleDelete = (track: Track) => async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!track.filename || !track.dir) {
      error('Không thể xóa nhạc mặc định')
      return
    }
    await onDeleteTrack(track)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm"
          onClick={onClose}
        >
          <MotionDiv
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-black/70 backdrop-blur-1xl rounded-3xl border border-white/10 w-full max-w-2xl h-[80vh] max-h-[600px] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Danh sách phát ({tracks.length})</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {tracks.length === 0 ? (
                <p className="text-center text-gray-500 mt-20">Chưa có nhạc nào</p>
              ) : (
                <div className="space-y-2">
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      className={`flex items-center justify-between p-4 rounded-xl hover:bg-white/10 transition cursor-pointer group ${
                        currentTrack?.id === track.id
                          ? 'bg-cyan-500/20 border border-cyan-500/50'
                          : ''
                      }`}
                      onClick={() => onPlayTrack(track)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {currentTrack?.id === track.id && isPlaying && (
                          <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
                        )}
                        <span className="text-lg truncate">{track.name}</span>
                        {!track.filename && !track.dir && (
                          <span className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded">
                            Mặc định
                          </span>
                        )}
                      </div>
                      {track.filename && track.dir && (
                        <button
                          onClick={handleDelete(track)}
                          className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-xl transition"
                        >
                          <Trash2 size={18} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-white/10">
              <button
                onClick={onAddMusic}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-2xl font-bold flex items-center justify-center gap-3 transition transform hover:scale-105"
              >
                <Plus size={24} />
                Thêm nhạc mới
              </button>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  )
}