// src/renderer/components/MusicPlayerBar.tsx
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Volume2,
  X
} from 'lucide-react'
import { useToast } from '../hooks/useToast'

interface Track {
  id: string
  name: string
  path: string 
  url: string
  filename?: string 
  dir?: string 
}

export default function MusicPlayerBar() {
  const { success, error } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const musicModules = import.meta.glob('@/assets/music/*.{mp3,wav,ogg,m4a}', { eager: true })
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const defaultTracks: Track[] = Object.entries(musicModules).map(([filePath, module]: [string, any]) => {
          const filename = filePath.split('/').pop()!
          const name = filename.replace(/\.[^.]+$/, '')
          return {
            id: `default_${filename}`,
            name,
            path: '',
            url: module.default
          }
        })
        const musicServerUrl = await window.electronAPI.invoke('music:get-server-url')
        const realMusicDir = await window.electronAPI.invoke('music:get-dir')
        await window.electronAPI.fileAPI.ensureDir(realMusicDir)

        let userTracks: Track[] = []
        try {
          const files = await window.electronAPI.invoke('readdir', realMusicDir)
          userTracks = files
          .filter((f: string) => /\.(mp3|wav|ogg|m4a)$/i.test(f))
          .map((f: string) => ({
              id: `user_${f}`,
              name: f.replace(/\.[^.]+$/, ''),
              filename: f, 
              dir: realMusicDir,
              path: '', 
              url: `${musicServerUrl}/music/${encodeURIComponent(f)}`
          }))
        } catch (err) {
          console.error('Lỗi đọc thư mục nhạc người dùng:', err)
        }

        const allTracks = [...defaultTracks, ...userTracks]
        setTracks(allTracks)

        if (allTracks.length > 0 && !currentTrack) {
          playTrack(allTracks[0])
        }
      } catch (err) {
        console.error('Lỗi load nhạc:', err)
      }
    }

    loadTracks()
  }, [])

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current?.duration) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)
        }
      }
      audioRef.current.onended = nextTrack
    }
    return () => audioRef.current?.pause()
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const playTrack = (track: Track) => {
    if (!audioRef.current) return
    audioRef.current.src = track.url
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true)
        setCurrentTrack(track)
      })
      .catch(() => error('Không thể phát nhạc này'))
  }

  const togglePlayPause = () => {
    if (!audioRef.current) return
    if (!currentTrack && tracks.length > 0) {
      playTrack(tracks[0])
      return
    }
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => error('Không thể phát'))
    }
    setIsPlaying(!isPlaying)
  }

  const prevTrack = () => {
    if (tracks.length === 0) return
    const idx = currentTrack ? tracks.findIndex(t => t.id === currentTrack.id) : 0
    const prevIdx = idx <= 0 ? tracks.length - 1 : idx - 1
    playTrack(tracks[prevIdx])
  }

  const nextTrack = () => {
    if (tracks.length === 0) return
    const idx = currentTrack ? tracks.findIndex(t => t.id === currentTrack.id) : -1
    const nextIdx = idx >= tracks.length - 1 ? 0 : idx + 1
    playTrack(tracks[nextIdx])
  }

const addMusic = async () => {
  const result = await window.electronAPI.dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }]
  })

  if (result.canceled || !result.filePaths.length) return

  try {
    const realMusicDir = await window.electronAPI.invoke('music:get-dir')
    const musicServerUrl = await window.electronAPI.invoke('music:get-server-url')

    const copyResults = await window.electronAPI.invoke('music:add-files', result.filePaths, realMusicDir)


    for (const res of copyResults) {
      if (res.success) {
        const newTrack: Track = {
            id: `user_${res.filename}`,
            name: res.filename.replace(/\.[^.]+$/, ''),
            filename: res.filename,   
            dir: realMusicDir,        
            path: '',               
            url: `${musicServerUrl}/music/${encodeURIComponent(res.filename)}`
        }
        setTracks(prev => [...prev, newTrack])
        success(`Đã thêm: ${newTrack.name}`)
      } else {
        error(`Không thể thêm: ${res.filename} - ${res.message}`)
      }
    }
  } catch (err) {
    error('Lỗi khi thêm nhạc')
    console.error(err)
  }
}

const deleteTrack = async (track: Track) => {
  if (!track.filename || !track.dir) {
    error('Không thể xóa nhạc mặc định')
    return
  }

  try {
    const result = await window.electronAPI.invoke(
      'music:delete-file',
      track.dir,
      track.filename
    )

    if (result.success) {
      setTracks(prev => prev.filter(t => t.id !== track.id))
      if (currentTrack?.id === track.id) {
        setCurrentTrack(null)
        audioRef.current?.pause()
        setIsPlaying(false)
      }
      success('Đã xóa nhạc')
    } else {
      error('Không thể xóa nhạc')
    }
  } catch (err) {
    error('Không thể xóa')
    console.error(err)
  }
}

  return (
    <>
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="fixed left-20 bottom-0 h-28 backdrop-blur-2xl border-t border-r border-white/10 rounded-tr-3xl shadow-2xl z-50 flex flex-col justify-center px-5"
        style={{
          width: isExpanded ? '420px' : '200px',
        }}
      >
        <div className="text-sm font-medium text-white truncate pr-10">
          {currentTrack?.name || 'VoxelX Music'}
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full my-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prevTrack} className="p-1.5 hover:bg-white/10 rounded-lg transition">
              <SkipBack size={18} className="text-gray-300" />
            </button>
            <button onClick={togglePlayPause} className="p-3 bg-cyan-500/30 hover:bg-cyan-500/50 rounded-full transition">
              {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="p-1.5 hover:bg-white/10 rounded-lg transition">
              <SkipForward size={18} className="text-gray-300" />
            </button>
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-4 overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  <Volume2 size={16} className="text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-24 accent-cyan-400"
                  />
                </div>
                <button
                  onClick={() => setShowPlaylistModal(true)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <Music size={20} className="text-gray-300" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition ml-auto"
          >
            {isExpanded ? (
              <ChevronRight size={20} className="text-gray-300 rotate-180" />
            ) : (
              <ChevronLeft size={20} className="text-gray-300" />
            )}
          </button>
        </div>
      </motion.div>
      <AnimatePresence>
        {showPlaylistModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md"
            onClick={() => setShowPlaylistModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900/95 backdrop-blur-2xl rounded-3xl border border-white/10 w-full max-w-2xl h-[80vh] max-h-[600px] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Danh sách phát ({tracks.length})</h2>
                <button onClick={() => setShowPlaylistModal(false)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {tracks.length === 0 ? (
                  <p className="text-center text-gray-500 mt-20">Chưa có nhạc nào</p>
                ) : (
                  <div className="space-y-2">
                    {tracks.map(track => (
                      <div
                        key={track.id}
                        className={`flex items-center justify-between p-4 rounded-xl hover:bg-white/10 transition cursor-pointer group ${
                          currentTrack?.id === track.id ? 'bg-cyan-500/20 border border-cyan-500/50' : ''
                        }`}
                        onClick={() => playTrack(track)}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {currentTrack?.id === track.id && isPlaying && (
                            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
                          )}
                          <span className="text-lg truncate">{track.name}</span>
                          {!track.filename && !track.dir && (
                            <span className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded">Mặc định</span>
                          )}
                        </div>
                        {track.filename && track.dir && (
                            <button
                                onClick={(e) => {
                                e.stopPropagation()
                                deleteTrack(track)
                                }}
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
                  onClick={addMusic}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-2xl font-bold flex items-center justify-center gap-3 transition transform hover:scale-105"
                >
                  <Plus size={24} />
                  Thêm nhạc mới
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}