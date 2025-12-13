// src/renderer/profiles/modals/ModrinthBrowserModal.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Download, Check, AlertCircle, Loader2, ChevronDown, ArrowLeft, Package } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import ModrinthLogo from '@/assets/loader/modrinth.svg'

interface Props {
  isOpen: boolean
  onClose: () => void
  profiles: any[]
  currentProfile?: string
}

interface ModrinthProject {
  id: string
  slug: string
  title: string
  description: string
  icon_url?: string
  downloads: number
  author: string
  project_type: 'mod' | 'modpack'
  versions: string[]
  client_side: string
  server_side: string
  follower_count: number
}

interface ModrinthVersion {
  id: string
  name: string
  version_number: string
  files: { url: string; filename: string; primary: boolean }[]
  game_versions: string[]
  loaders: string[]
  date_published: string
}

function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler()
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

export default function ModrinthBrowserModal({ isOpen, onClose, profiles, currentProfile }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gameVersions, setGameVersions] = useState<string[]>([])
  const [selectedGameVersion, setSelectedGameVersion] = useState<string>('')
  const [results, setResults] = useState<ModrinthProject[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ModrinthProject | null>(null)
  const [projectDetails, setProjectDetails] = useState<{ project: any; versions: ModrinthVersion[] } | null>(null)
  const [selectedFile, setSelectedFile] = useState<ModrinthVersion | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installStatus, setInstallStatus] = useState<'success' | 'error' | null>(null)
  const [targetProfile, setTargetProfile] = useState(currentProfile || profiles[0]?.name || '')
  const [selectedLoader, setSelectedLoader] = useState<'fabric' | 'forge' | 'quilt' | 'all'>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [totalHits, setTotalHits] = useState(0)
  const LIMIT = 100

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = useRef(false)

  const searchMods = async (isLoadMore = false) => {
    if (!selectedGameVersion) return

    if (!isLoadMore) {
      setLoading(true)
      setResults([])
      setOffset(0)
      setHasMore(true)
      setTotalHits(0)
    } else {
      setLoadingMore(true)
    }

    isLoadingMoreRef.current = isLoadMore

    try {
      const response = await window.electronAPI.profileAPI.searchModrinth(
        searchQuery,
        selectedGameVersion,
        selectedLoader,
        LIMIT,
        isLoadMore ? offset : 0
      )

      const newHits = response.hits || []
      const newTotal = response.total_hits || 0

      if (isLoadMore) {
        setResults(prev => [...prev, ...newHits])
      } else {
        setResults(newHits)
      }

      setTotalHits(newTotal)
      const loadedCount = isLoadMore ? results.length + newHits.length : newHits.length
      setHasMore(newHits.length === LIMIT && loadedCount < newTotal)
      setOffset(prev => prev + newHits.length)

    } catch (err) {
      console.error('Lỗi tìm kiếm:', err)
      if (!isLoadMore) setResults([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
      isLoadingMoreRef.current = false
    }
  }

  useClickOutside(dropdownRef, () => setDropdownOpen(false))
  useEffect(() => {
    if (!selectedGameVersion) return
    searchMods(false)
  }, [searchQuery, selectedGameVersion, selectedLoader])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let ticking = false

    const handleScroll = () => {
      if (ticking || loading || loadingMore || !hasMore || isLoadingMoreRef.current) return

      const { scrollTop, scrollHeight, clientHeight } = container
      const threshold = 1200

      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        ticking = true
        requestAnimationFrame(() => {
          searchMods(true)
          ticking = false
        })
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [loading, loadingMore, hasMore, selectedGameVersion, selectedLoader, searchQuery])
  useEffect(() => {
    const loadVersions = async () => {
      try {
        setLoadingVersions(true)
        const versions = await window.electronAPI.profileAPI.getMinecraftVersions()
        const releases = versions
          .filter((v: any) => v.type === 'release')
          .sort((a: any, b: any) => b.releaseTime.localeCompare(a.releaseTime))
          .map((v: any) => v.id)
        setGameVersions(releases)
        if (releases.length > 0) setSelectedGameVersion(releases[0])
      } catch (err) {
        console.error('Lỗi tải phiên bản:', err)
      } finally {
        setLoadingVersions(false)
      }
    }
    loadVersions()
  }, [])

  const loadProjectDetails = async (project: ModrinthProject) => {
    setSelectedProject(project)
    setProjectDetails(null)
    setSelectedFile(null)
    try {
      const data = await window.electronAPI.profileAPI.getModrinthProject(project.slug || project.id)
      if (data) setProjectDetails(data)
    } catch (err) {
      console.error('Lỗi tải chi tiết:', err)
    }
  }

  const installMod = async () => {
    if (!selectedFile || !targetProfile) return
    setInstalling(true)
    setInstallStatus(null)

    const file = selectedFile.files.find(f => f.primary) || selectedFile.files[0]
    const profile = profiles.find(p => p.name === targetProfile)
    if (!profile || !file) {
      setInstallStatus('error')
      setInstalling(false)
      return
    }
    const success = await window.electronAPI.profileAPI.downloadModrinthFile(
      file.url,
      file.filename,
      profile.gameDirectory,
      selectedProject ? {
        title: selectedProject.title,
        description: selectedProject.description,
        authors: [selectedProject.author],
        iconUrl: selectedProject.icon_url,
        version: selectedFile.version_number,
        projectId: selectedProject.id,
        fileId: selectedFile.id
      } : undefined
    )
    setInstallStatus(success ? 'success' : 'error')
    setInstalling(false)

    if (success) {
      setTimeout(() => {
        setSelectedProject(null)
        setProjectDetails(null)
        setSelectedFile(null)
      }, 2000)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              onClick={(e) => e.stopPropagation()}
            >
        <div className="bg-gray-900/95 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-3xl w-full max-w-7xl h-full max-h-[95vh] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gray-900/80 backdrop-blur">
            <div className="flex items-center gap-4">
              {selectedProject && (
                <button
                  onClick={() => {
                    setSelectedProject(null)
                    setProjectDetails(null)
                    setSelectedFile(null)
                  }}
                  className="p-3 hover:bg-white/10 rounded-full transition"
                >
                  <ArrowLeft size={28} />
                </button>
              )}
              <img src={ModrinthLogo} alt="Modrinth" className="w-10 h-10 object-cover" />
              <h2 className="text-3xl font-black text-green-400">
                {selectedProject ? selectedProject.title : 'Modrinth Browser'}
              </h2>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition">
              <X size={32} />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="w-80 bg-gray-800/60 border-r border-white/10 p-6 space-y-6 flex flex-col">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
                <input
                  type="text"
                  placeholder="Tìm mod, modpack..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-800/80 border border-white/20 rounded-2xl focus:outline-none focus:border-green-400 transition text-white placeholder-gray-500 text-lg"
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Loader</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['all', 'fabric', 'forge', 'quilt'] as const).map((loader) => (
                    <button
                      key={loader}
                      onClick={() => setSelectedLoader(loader)}
                      className={`px-4 py-3 rounded-xl font-medium transition-all ${
                        selectedLoader === loader
                          ? 'bg-green-500/20 border-2 border-green-400 text-green-400 shadow-lg shadow-green-500/30'
                          : 'bg-gray-800/80 border-2 border-white/10 text-gray-400 hover:border-white/30'
                      }`}
                    >
                      {loader === 'all' ? 'Tất cả' : loader.charAt(0).toUpperCase() + loader.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <motion.div ref={dropdownRef}>
                  <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full px-5 py-4 bg-gray-800/80 border border-white/20 rounded-2xl focus:outline-none focus:border-green-400 cursor-pointer pr-12 text-white font-medium text-lg text-left flex items-center justify-between hover:bg-gray-700/50 transition"
                >
                  <span>{selectedGameVersion || 'Chọn phiên bản...'}</span>
                  <ChevronDown className={`transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} size={22} />
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className=" max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                        {gameVersions.length === 0 ? (
                          <div className="px-5 py-8 text-center text-gray-400">
                            Đang tải phiên bản...
                          </div>
                        ) : (
                          gameVersions.map((version) => (
                            <button
                              key={version}
                              onClick={() => {
                                setSelectedGameVersion(version)
                                setDropdownOpen(false)
                              }}
                              className={`w-full px-5 py-3 text-left hover:bg-green-500/20 transition-colors border-l-4 ${
                                selectedGameVersion === version
                                  ? 'bg-green-500/15 border-green-400 text-green-300 font-semibold'
                                  : 'border-transparent text-gray-300 hover:text-white'
                              }`}
                            >
                              {version}
                              {selectedGameVersion === version && <Check className="inline ml-3" size={16} />}
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </motion.div>
              <div className="flex-1" />
            </div>
            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-900/95 to-gray-800/50" ref={scrollContainerRef}>
              {!selectedProject ? (
                <div className="p-8">
                  {loading && results.length === 0 ? (
                    <div className="flex justify-center items-center h-96">
                      <Loader2 className="animate-spin text-green-400" size={64} />
                    </div>
                  ) : results.length === 0 ? (
                    <div className="text-center py-32 text-gray-500">
                      <Package size={80} className="mx-auto mb-6 opacity-30" />
                      <p className="text-2xl">Không tìm thấy kết quả</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {results.map((project) => (
                          <motion.button
                            key={project.id}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => loadProjectDetails(project)}
                            className="bg-gray-800/70 hover:bg-gray-700/90 rounded-3xl p-6 text-left transition-all border border-white/10 hover:border-green-400/50 shadow-xl hover:shadow-2xl hover:shadow-green-500/20"
                          >
                            <div className="flex items-start gap-5">
                              <div className="w-20 h-20 rounded-2xl bg-gray-700 overflow-hidden border border-white/10 flex-shrink-0">
                                {project.icon_url ? (
                                  <img src={project.icon_url} alt={project.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-xl truncate">{project.title}</h3>
                                <p className="text-sm text-gray-400 truncate">by {project.author}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                                  <span>{(project.downloads ?? 0).toLocaleString()} tải</span>
                                  <span>•</span>
                                  <span>{(project.follower_count ?? 0).toLocaleString()} theo dõi</span>
                                </div>
                                <span className="inline-block mt-3 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium capitalize">
                                  {project.project_type}
                                </span>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                      {loadingMore && (
                        <div className="flex justify-center items-center py-12">
                          <Loader2 className="animate-spin text-green-400" size={48} />
                          <span className="ml-4 text-white text-lg font-medium">
                            Đang tải thêm... ({results.length.toLocaleString()} / {totalHits.toLocaleString()})
                          </span>
                        </div>
                      )}
                      {!hasMore && results.length > 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>Đã hiển thị tất cả {results.length.toLocaleString()} mod</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="p-10 space-y-10 pb-32">
                  <div className="flex gap-10">
                    <div className="w-64 h-64 rounded-3xl bg-gray-800 overflow-hidden border-4 border-white/20 shadow-2xl flex-shrink-0">
                      {selectedProject.icon_url ? (
                        <img src={selectedProject.icon_url} alt={selectedProject.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-6xl font-bold text-white">
                          {selectedProject.title[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h1 className="text-5xl font-black text-white mb-6">{selectedProject.title}</h1>
                      <p className="text-xl text-gray-300 leading-relaxed mb-8">{selectedProject.description || 'Không có mô tả'}</p>
                      <div className="grid grid-cols-2 gap-8 text-lg">
                        <div><span className="text-gray-500">Tác giả:</span> <span className="text-green-400 font-bold ml-3">{selectedProject.author}</span></div>
                        <div><span className="text-gray-500">Loại:</span> <span className="text-cyan-400 font-bold capitalize ml-3">{selectedProject.project_type}</span></div>
                        <div><span className="text-gray-500">Tải xuống:</span> <span className="text-yellow-400 font-bold ml-3">{(selectedProject?.downloads ?? 0).toLocaleString()}</span></div>
                        <div><span className="text-gray-500">Theo dõi:</span> <span className="text-pink-400 font-bold ml-3">{(selectedProject?.follower_count ?? 0).toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>

                  {projectDetails ? (
                    <div className="bg-gray-800/60 rounded-3xl p-10 border border-white/10">
                      <h3 className="text-3xl font-bold text-white mb-8">Chọn phiên bản</h3>

                      {projectDetails.versions.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">Không có phiên bản nào cho game version này</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {projectDetails.versions
                            .filter((v: ModrinthVersion) => 
                              v.game_versions.includes(selectedGameVersion) &&
                              (selectedLoader === 'all' || v.loaders.includes(selectedLoader))
                            )
                            .slice(0, 20)
                            .map((version) => (
                              <button
                                key={version.id}
                                onClick={() => setSelectedFile(version)}
                                className={`p-8 rounded-2xl text-left transition-all border-2 ${
                                  selectedFile?.id === version.id
                                    ? 'border-green-400 bg-green-400/10 shadow-2xl shadow-green-400/30'
                                    : 'border-white/10 hover:border-white/30 bg-gray-800/50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-bold text-white text-2xl">{version.version_number}</p>
                                    <p className="text-gray-400 mt-2 text-sm">
                                      {version.files.find(f => f.primary)?.filename || version.files[0]?.filename}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                      {version.loaders.map(l => (
                                        <span key={l} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                                          {l}
                                        </span>
                                      ))}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-3">
                                      {new Date(version.date_published).toLocaleDateString('vi-VN')}
                                    </p>
                                  </div>
                                  {selectedFile?.id === version.id && <Check size={36} className="text-green-400" />}
                                </div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="animate-spin text-green-400" size={64} />
                      <p className="text-xl text-gray-400 mt-6">Đang tải chi tiết mod...</p>
                    </div>
                  )}
                  {selectedFile && (
                    <motion.div
                      key="install-bar"
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 80, opacity: 0 }}
                      transition={{ type: "spring", damping: 32, stiffness: 400 }}
                      className="sticky bottom-0 left-0 right-0 z-40 pointer-events-none"
                    >
                      <div className="p-4 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent pointer-events-none">
                        <div className="pointer-events-auto max-w-6xl mx-auto">
                          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border-2 border-green-400/60 shadow-2xl shadow-green-500/40">
                            <div className="flex items-center gap-8">
                              <div className="flex-1">
                                <p className="text-lg font-bold text-white mb-3 opacity-90">
                                  Cài vào profile:
                                </p>
                                <select
                                  value={targetProfile}
                                  onChange={(e) => setTargetProfile(e.target.value)}
                                  className="w-full px-6 py-4 bg-gray-800/90 border-2 border-green-400/50 rounded-xl focus:outline-none focus:border-green-300 text-white text-lg font-medium transition-all"
                                >
                                  {profiles.map(p => (
                                    <option key={p.name} value={p.name} className="bg-gray-800 text-white py-3">
                                      {p.name} ({p.version} - {p.loader})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                onClick={installMod}
                                disabled={installing}
                                className="relative px-12 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-xl font-bold text-2xl text-white transition-all duration-300 flex items-center gap-4 disabled:opacity-60 shadow-xl shadow-green-600/50 group overflow-hidden"
                              >
                                <span className="relative z-10 flex items-center gap-4">
                                  {installing ? (
                                    <>Đang cài <Loader2 className="animate-spin" size={32} /></>
                                  ) : installStatus === 'success' ? (
                                    <>Đã cài! <Check size={32} /></>
                                  ) : installStatus === 'error' ? (
                                    <>Lỗi <AlertCircle size={32} /></>
                                  ) : (
                                    <>Cài đặt <Download size={32} /></>
                                  )}
                                </span>
                                <div className="absolute inset-0 bg-white/25 translate-x-[-150%] group-hover:translate-x-full transition-transform duration-800" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}