// src/renderer/components/MusicPlayerBar.tsx
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MotionDiv } from '../utils/motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Volume2,
  X,
  Plus,
  Trash2
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

const openPlaylist = () => {
  window.dispatchEvent(new CustomEvent('open-music-playlist'))
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

        const musicServerUrl = await window.electronAPI.ipcRenderer.invoke('music:get-server-url')
        const realMusicDir = await window.electronAPI.ipcRenderer.invoke('music:get-dir')
        await window.electronAPI.fileAPI.ensureDir(realMusicDir)

        let userTracks: Track[] = []
        try {
          const files = await window.electronAPI.ipcRenderer.invoke('readdir', realMusicDir)
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
    window.dispatchEvent(new CustomEvent('music-state-update', {
      detail: {
        tracks,
        currentTrack,
        isPlaying
      }
    }))
  }, [tracks, currentTrack, isPlaying])

  useEffect(() => {
    const handlePlayTrack = (e: Event) => {
      const track = (e as CustomEvent).detail
      if (track && track.id) {
        playTrack(track)
      }
    }

    const handleAddMusic = () => {
      addMusic()
    }

    const handleDeleteTrack = async (e: Event) => {
      const track = (e as CustomEvent).detail
      if (track && track.id) {
        await deleteTrack(track)
      }
    }

    window.addEventListener('music-play-track', handlePlayTrack)
    window.addEventListener('music-add', handleAddMusic)
    window.addEventListener('music-delete-track', handleDeleteTrack)

    return () => {
      window.removeEventListener('music-play-track', handlePlayTrack)
      window.removeEventListener('music-add', handleAddMusic)
      window.removeEventListener('music-delete-track', handleDeleteTrack)
    }
  }, [tracks, currentTrack, isPlaying])

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
      const realMusicDir = await window.electronAPI.ipcRenderer.invoke('music:get-dir')
      const musicServerUrl = await window.electronAPI.ipcRenderer.invoke('music:get-server-url')
      const copyResults = await window.electronAPI.ipcRenderer.invoke('music:add-files', result.filePaths, realMusicDir)

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
      const result = await window.electronAPI.ipcRenderer.invoke('music:delete-file', track.dir, track.filename)
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
      <div className="relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-xl hover:bg-white/10 transition-all group"
        >
          <Music size={19} className="text-gray-400 group-hover:text-cyan-400 transition" />
          {currentTrack && (
            <span className="text-sm text-gray-200 truncate max-w-40">
              {currentTrack.name}
            </span>
          )}
          {isPlaying && (
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -12, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="absolute right-0 top-11 w-96 bg-black/85 backdrop-blur-2xl rounded-2xl rounded-tr-none border border-white/10 shadow-2xl overflow-hidden z-50"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-semibold text-white truncate pr-6">
                    {currentTrack?.name || 'VoxelX Music'}
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition"
                  >
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>

                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'linear' }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={prevTrack} className="p-2 hover:bg-white/10 rounded-lg transition">
                      <SkipBack size={20} className="text-gray-300" />
                    </button>
                    <button
                      onClick={togglePlayPause}
                      className="p-3.5 bg-cyan-500/30 hover:bg-cyan-500/50 rounded-full transition"
                    >
                      {isPlaying ? <Pause size={26} className="text-white" /> : <Play size={26} className="text-white ml-0.5" />}
                    </button>
                    <button onClick={nextTrack} className="p-2 hover:bg-white/10 rounded-lg transition">
                      <SkipForward size={20} className="text-gray-300" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Volume2 size={18} className="text-gray-400" />
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
                    <button onClick={() => window.dispatchEvent(new CustomEvent('open-music-playlist'))}>
                      <Music size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}