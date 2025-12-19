// src/renderer/profiles/modals/UniversalBrowserModal.tsx
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Search,
  Download,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Package,
  Box,
  Image,
  FileText,
  Sparkles,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import ModrinthLogo from '@/assets/loader/modrinth.svg'
import { MotionDiv } from '../../utils/motion'

import SearchResultsTab from './browserTabs/SearchResultsTab'
import ProjectDetailTab from './browserTabs/ProjectDetailTab'
import { TabType, ModrinthProjectType, ModrinthProject, ModrinthVersion } from './types'
import { SmartDropdown } from '../../components/SmartDropdown'

interface Props {
  isOpen: boolean
  onClose: () => void
  profiles: any[]
  currentProfile?: string
}

const TAB_CONFIG: Record<TabType, { label: string; icon: any; projectType: ModrinthProjectType }> = {
  modpack: { label: 'Modpack', icon: Box, projectType: 'modpack' },
  mod: { label: 'Mod', icon: Package, projectType: 'mod' },
  shader: { label: 'Shader', icon: Sparkles, projectType: 'shader' },
  resourcepack: { label: 'Resource Pack', icon: Image, projectType: 'resourcepack' },
  datapack: { label: 'Data Pack', icon: FileText, projectType: 'datapack' },
}

const RESOURCE_CATEGORIES = [
  'all', '16x', '32x', '64x', '128x', '256x', '512x+', 'Animated', 'Audio', 'Combat',
  'Decoration', 'Font', 'GUI', 'Modded', 'Realistic', 'Simplistic', 'Themed', 'Tweaks',
  'Utility', 'Vanilla-like',
] as const

const DATAPACK_CATEGORIES = [
  'all', 'Adventure', 'Cursed', 'Decoration', 'Economy', 'Equipment', 'Food',
  'Game Mechanics', 'Library', 'Magic', 'Management', 'Minigame', 'Mobs',
  'Optimization', 'Social', 'Storage', 'Technology', 'Transportation', 'Utility',
  'World Generation',
] as const

const MODPACK_CATEGORIES = [
  'all', 'Adventure', 'Challenging', 'Combat', 'Kitchen Sink', 'Lightweight',
  'Magic', 'Multiplayer', 'Optimization', 'Quests', 'Technology',
] as const

const MOD_CATEGORIES = [
  'all', 'Adventure', 'Cursed', 'Decoration', 'Economy', 'Equipment', 'Food',
  'Game Mechanics', 'Library', 'Magic', 'Management', 'Minigame', 'Mobs',
  'Optimization', 'Social', 'Storage', 'Technology', 'Transportation', 'Utility',
  'World Generation',
] as const

export default function UniversalBrowserModal({ isOpen, onClose, profiles, currentProfile }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('modpack')
  const [searchQuery, setSearchQuery] = useState('')
  const [gameVersions, setGameVersions] = useState<string[]>([])
  const [selectedGameVersion, setSelectedGameVersion] = useState<string>('')
  const [results, setResults] = useState<ModrinthProject[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ModrinthProject | null>(null)
  const [projectDetails, setProjectDetails] = useState<{ project: any; versions: ModrinthVersion[] } | null>(null)
  const [selectedFile, setSelectedFile] = useState<ModrinthVersion | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installStatus, setInstallStatus] = useState<'success' | 'error' | null>(null)
  const [targetProfile, setTargetProfile] = useState(currentProfile || profiles[0]?.name || '')

  const [selectedLoader, setSelectedLoader] = useState<'fabric' | 'forge' | 'quilt' | 'neoforge' | 'all'>('all')
  const [selectedShaderLoader, setSelectedShaderLoader] = useState<'iris' | 'optifine' | 'all'>('all')

  const [selectedResourceCategory, setSelectedResourceCategory] = useState<typeof RESOURCE_CATEGORIES[number]>('all')
  const [selectedDatapackCategory, setSelectedDatapackCategory] = useState<typeof DATAPACK_CATEGORIES[number]>('all')
  const [selectedModpackCategory, setSelectedModpackCategory] = useState<typeof MODPACK_CATEGORIES[number]>('all')
  const [selectedModCategory, setSelectedModCategory] = useState<typeof MOD_CATEGORIES[number]>('all')

  const [selectedModpackEnvironment, setSelectedModpackEnvironment] = useState<'client' | 'server' | 'all'>('all')
  const [selectedModEnvironment, setSelectedModEnvironment] = useState<'client' | 'server' | 'all'>('all')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const [availableWorlds, setAvailableWorlds] = useState<string[]>([])
  const [selectedWorld, setSelectedWorld] = useState<string>('')

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [totalHits, setTotalHits] = useState(0)
  const LIMIT = 100
  const isLoadingMoreRef = useRef(false)

  const getSearchLoader = (): string | undefined => {
    if (activeTab === 'shader') return selectedShaderLoader === 'all' ? undefined : selectedShaderLoader
    if (activeTab === 'resourcepack') return selectedResourceCategory === 'all' ? undefined : selectedResourceCategory
    if (activeTab === 'datapack') return selectedDatapackCategory === 'all' ? undefined : selectedDatapackCategory

    if (activeTab === 'modpack') {
      if (selectedModpackEnvironment === 'client') return 'client_side:required'
      if (selectedModpackEnvironment === 'server') return 'server_side:required'
      return selectedModpackCategory === 'all' ? undefined : selectedModpackCategory
    }

    if (activeTab === 'mod') {
      if (selectedModEnvironment === 'client') return 'client_side:required'
      if (selectedModEnvironment === 'server') return 'server_side:required'
      if (selectedModCategory !== 'all') return selectedModCategory
      return selectedLoader === 'all' ? undefined : selectedLoader
    }

    return undefined
  }

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
      const loaderParam = getSearchLoader()
      const projectTypeParam = TAB_CONFIG[activeTab].projectType

      const response = await window.electronAPI.profileAPI.searchModrinth(
        searchQuery,
        selectedGameVersion,
        loaderParam,
        LIMIT,
        isLoadMore ? offset : 0,
        projectTypeParam
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

  useEffect(() => {
    if (!selectedGameVersion) return
    searchMods(false)
  }, [
    searchQuery,
    selectedGameVersion,
    selectedLoader,
    selectedShaderLoader,
    selectedResourceCategory,
    selectedDatapackCategory,
    selectedModpackCategory,
    selectedModpackEnvironment,
    selectedModCategory,
    selectedModEnvironment,
    activeTab,
  ])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => {
      if (loading || loadingMore || !hasMore || isLoadingMoreRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollTop + clientHeight >= scrollHeight - 1200) {
        searchMods(true)
      }
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [loading, loadingMore, hasMore, selectedGameVersion, selectedLoader, searchQuery, activeTab])

  useEffect(() => {
    const loadVersions = async () => {
      try {
        const versions = await window.electronAPI.profileAPI.getMinecraftVersions()
        const releases = versions
          .filter((v: any) => v.type === 'release')
          .sort((a: any, b: any) => b.releaseTime.localeCompare(a.releaseTime))
          .map((v: any) => v.id)
        setGameVersions(releases)
        if (releases.length > 0) setSelectedGameVersion(releases[0])
      } catch (err) {
        console.error('Lỗi tải phiên bản:', err)
      }
    }
    if (isOpen) loadVersions()
  }, [isOpen])

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

  const installModpack = async () => {
    if (!selectedFile || !selectedProject) return

    setInstalling(true)
    setInstallStatus(null)

    try {
      const primaryFile = selectedFile.files.find(f => f.primary) || selectedFile.files[0]
      if (!primaryFile) throw new Error('Không tìm thấy file tải')

      const success = await window.electronAPI.profileAPI.installModpack(
        primaryFile.url,
        selectedProject.title
      )

      setInstallStatus(success ? 'success' : 'error')

      if (success) {
        setTimeout(() => {
          setSelectedProject(null)
          setProjectDetails(null)
          setSelectedFile(null)
          setInstallStatus(null)
        }, 3000)
      }
    } catch (err) {
      console.error('Lỗi cài modpack:', err)
      setInstallStatus('error')
    } finally {
      setInstalling(false)
    }
  }

  const installMod = async () => {
    if (activeTab === 'modpack') {
      return installModpack()
    }

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

    let subFolder: 'mods' | 'shaderpacks' | 'resourcepacks' | 'datapacks' = 'mods'

    if (activeTab === 'shader') subFolder = 'shaderpacks'
    else if (activeTab === 'resourcepack') subFolder = 'resourcepacks'
    else if (activeTab === 'datapack') subFolder = 'datapacks'
    if (activeTab === 'datapack' && !selectedWorld) {
      setInstallStatus('error')
      setInstalling(false)
      return
    }

    try {
      const success = await window.electronAPI.profileAPI.downloadModrinthFile(
        file.url,
        file.filename,
        profile.gameDirectory,
        selectedProject
          ? {
              title: selectedProject.title,
              description: selectedProject.description,
              authors: [selectedProject.author],
              iconUrl: selectedProject.icon_url,
              version: selectedFile.version_number,
              projectId: selectedProject.id,
              fileId: selectedFile.id,
            }
          : undefined,
        subFolder,
        activeTab === 'datapack' ? selectedWorld : undefined 
      )
      if (success && activeTab === 'datapack' && selectedWorld) {
        try {
          await window.electronAPI.profileAPI.createTempWorldDatapackCopy(
            selectedWorld,
            file.filename
          )
        } catch (err) {
          console.warn('Không thể sao chép datapack vào temp world:', err)
        }
      }

      setInstallStatus(success ? 'success' : 'error')

      if (success) {
        setTimeout(() => {
          setSelectedProject(null)
          setProjectDetails(null)
          setSelectedFile(null)
          setInstallStatus(null)
        }, 2000)
      }
    } catch (err) {
      console.error('Lỗi cài đặt:', err)
      setInstallStatus('error')
    } finally {
      setInstalling(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'datapack' || !targetProfile) {
      setAvailableWorlds([])
      setSelectedWorld('')
      return
    }

    const profile = profiles.find(p => p.name === targetProfile)
    if (!profile) return

    const loadWorlds = async () => {
      try {
        const worlds = await window.electronAPI.profileAPI.getWorldList(profile.gameDirectory)
        setAvailableWorlds(worlds)
        if (worlds.length > 0 && !selectedWorld) {
          setSelectedWorld(worlds[0])
        }
      } catch (err) {
        console.error('Lỗi tải danh sách world:', err)
        setAvailableWorlds([])
      }
    }

    loadWorlds()
  }, [targetProfile, activeTab, profiles])

  if (!isOpen) return null

  return (
    <>
      <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 backdrop-blur-sm z-50" />
      <MotionDiv
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
      >
        <div className="bg-black/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-3xl w-full max-w-7xl h-full max-h-[95vh] flex flex-col overflow-hidden">
          <div className="py-3 px-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedProject && (
                <button
                  onClick={() => {
                    setSelectedProject(null)
                    setProjectDetails(null)
                    setSelectedFile(null)
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                >
                  <ArrowLeft size={24} />
                </button>
              )}
              <img src={ModrinthLogo} alt="Modrinth" className="w-8 h-8" />
              <h2 className="text-xl font-black text-green-400 truncate max-w-md">
                {selectedProject ? selectedProject.title : 'Modrinth'}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X size={28} />
            </button>
          </div>
          {!selectedProject && (
            <div className="flex border-b border-white/10">
              {Object.entries(TAB_CONFIG).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as TabType)}
                    className={`flex-1 px-6 py-4 flex items-center justify-center gap-3 text-lg font-medium transition-all ${
                      activeTab === key
                        ? 'text-green-400 border-b-4 border-green-400 bg-green-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={22} />
                    {config.label}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex-1 flex overflow-hidden">
            <div className="w-80 border-r border-white/10 p-6 space-y-6 flex flex-col">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={22} />
                <input
                  type="text"
                  placeholder={`Tìm ${TAB_CONFIG[activeTab].label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-black/70 border border-white/20 rounded-2xl focus:outline-none focus:border-green-400 transition text-white placeholder-gray-500 text-sm"
                />
              </div>
              <SmartDropdown
                title="Phiên bản game"
                options={gameVersions}
                selected={selectedGameVersion || 'Chọn phiên bản...'}
                onSelect={setSelectedGameVersion}
                displayValue={(v) => v || 'Chọn phiên bản...'}
                isOpen={openDropdown === 'gameVersion'}
                onToggle={() => setOpenDropdown(openDropdown === 'gameVersion' ? null : 'gameVersion')}
              />
              {(activeTab === 'mod' || activeTab === 'modpack') && (
                <SmartDropdown
                  title="Loader"
                  options={['all', 'fabric', 'forge', 'quilt', 'neoforge'] as const}
                  selected={selectedLoader}
                  onSelect={setSelectedLoader}
                  displayValue={(v) => (v === 'all' ? 'Tất cả Loader' : v.charAt(0).toUpperCase() + v.slice(1))}
                  isOpen={openDropdown === 'loader'}
                  onToggle={() => setOpenDropdown(openDropdown === 'loader' ? null : 'loader')}
                />
              )}
              {activeTab === 'modpack' && (
                <>
                  <SmartDropdown
                    title="Loại Modpack"
                    options={MODPACK_CATEGORIES}
                    selected={selectedModpackCategory}
                    onSelect={setSelectedModpackCategory}
                    displayValue={(v) => (v === 'all' ? 'Tất cả loại' : v)}
                    isOpen={openDropdown === 'modpackCategory'}
                    onToggle={() => setOpenDropdown(openDropdown === 'modpackCategory' ? null : 'modpackCategory')}
                  />
                  <SmartDropdown
                    title="Môi trường"
                    options={['all', 'client', 'server'] as const}
                    selected={selectedModpackEnvironment}
                    onSelect={setSelectedModpackEnvironment}
                    displayValue={(v) =>
                      v === 'all' ? 'Mọi môi trường' : v === 'client' ? 'Chỉ Client' : 'Hỗ trợ Server'
                    }
                    isOpen={openDropdown === 'modpackEnv'}
                    onToggle={() => setOpenDropdown(openDropdown === 'modpackEnv' ? null : 'modpackEnv')}
                  />
                </>
              )}
              {activeTab === 'shader' && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Hỗ trợ</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['all', 'iris', 'optifine'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSelectedShaderLoader(opt)}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                          selectedShaderLoader === opt
                            ? 'bg-green-500/20 border-2 border-green-400 text-green-400 shadow-lg'
                            : 'bg-black/70 border-2 border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                      >
                        {opt === 'all' ? 'Tất cả' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'resourcepack' && (
                <SmartDropdown
                  title="Loại Resource Pack"
                  options={RESOURCE_CATEGORIES}
                  selected={selectedResourceCategory}
                  onSelect={setSelectedResourceCategory}
                  displayValue={(v) => (v === 'all' ? 'Tất cả loại' : v.toUpperCase())}
                  isOpen={openDropdown === 'resourceCategory'}
                  onToggle={() => setOpenDropdown(openDropdown === 'resourceCategory' ? null : 'resourceCategory')}
                />
              )}
              {activeTab === 'datapack' && (
                <SmartDropdown
                  title="Loại Data Pack"
                  options={DATAPACK_CATEGORIES}
                  selected={selectedDatapackCategory}
                  onSelect={setSelectedDatapackCategory}
                  displayValue={(v) => (v === 'all' ? 'Tất cả loại' : v)}
                  isOpen={openDropdown === 'datapackCategory'}
                  onToggle={() => setOpenDropdown(openDropdown === 'datapackCategory' ? null : 'datapackCategory')}
                />
              )}
              {activeTab === 'mod' && (
                <>
                  <SmartDropdown
                    title="Loại Mod"
                    options={MOD_CATEGORIES}
                    selected={selectedModCategory}
                    onSelect={setSelectedModCategory}
                    displayValue={(v) => (v === 'all' ? 'Tất cả loại' : v)}
                    isOpen={openDropdown === 'modCategory'}
                    onToggle={() => setOpenDropdown(openDropdown === 'modCategory' ? null : 'modCategory')}
                  />
                  <SmartDropdown
                    title="Môi trường"
                    options={['all', 'client', 'server'] as const}
                    selected={selectedModEnvironment}
                    onSelect={setSelectedModEnvironment}
                    displayValue={(v) =>
                      v === 'all' ? 'Mọi môi trường' : v === 'client' ? 'Chỉ Client' : 'Hỗ trợ Server'
                    }
                    isOpen={openDropdown === 'modEnv'}
                    onToggle={() => setOpenDropdown(openDropdown === 'modEnv' ? null : 'modEnv')}
                  />
                </>
              )}

              <div className="flex-1" />
            </div>
            <div className="flex-1 overflow-y-auto bg-gradient-to-br via-gray-900/95 to-gray-800/50" ref={scrollContainerRef}>
              <div className="p-8">
                {!selectedProject ? (
                  <SearchResultsTab
                    results={results}
                    loading={loading}
                    loadingMore={loadingMore}
                    totalHits={totalHits}
                    hasMore={hasMore}
                    onProjectClick={loadProjectDetails}
                  />
                ) : (
                  <>
                    <ProjectDetailTab
                      project={selectedProject}
                      projectDetails={projectDetails}
                      selectedFile={selectedFile}
                      onFileSelect={setSelectedFile}
                      selectedGameVersion={selectedGameVersion}
                      selectedLoader={selectedLoader}
                      activeTab={activeTab}
                    />
                    {selectedFile && activeTab !== 'modpack' && (
                      <MotionDiv
                        key="install-bar"
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
                      >
                        <div className="p-6 bg-gradient-to-t from-black/90 to-transparent">
                          <div className="pointer-events-auto max-w-4xl mx-auto">
                            <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl p-5 border border-green-500/50 shadow-2xl shadow-green-500/30">
                              <div className="flex items-center justify-between gap-6">
                                <div className="flex-1 space-y-4">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                      Cài vào profile
                                    </p>
                                    <SmartDropdown
                                      options={profiles.map(p => p.name)}
                                      selected={targetProfile || ''}
                                      onSelect={(value) => setTargetProfile(value)}
                                      displayValue={(name) => {
                                        const profile = profiles.find(p => p.name === name)
                                        return profile ? `${name} (${profile.version} - ${profile.loader})` : name
                                      }}
                                      isOpen={openDropdown === 'targetProfile'}
                                      onToggle={() => setOpenDropdown(openDropdown === 'targetProfile' ? null : 'targetProfile')}
                                    />
                                  </div>
                                  {activeTab === 'datapack' && availableWorlds.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Chọn world
                                      </p>
                                      <SmartDropdown
                                        options={availableWorlds}
                                        selected={selectedWorld}
                                        onSelect={setSelectedWorld}
                                        displayValue={(world) => world}
                                        isOpen={openDropdown === 'selectedWorld'}
                                        onToggle={() => setOpenDropdown(openDropdown === 'selectedWorld' ? null : 'selectedWorld')}
                                      />
                                    </div>
                                  )}

                                  {activeTab === 'datapack' && availableWorlds.length === 0 && selectedFile && (
                                    <div className="text-yellow-400 text-sm bg-yellow-500/10 px-4 py-2 rounded-lg">
                                      Không tìm thấy world nào trong profile này
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={installMod}
                                  disabled={installing}
                                  className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-xl font-bold text-xl text-white flex items-center gap-3 disabled:opacity-60 shadow-lg shadow-green-600/40 transition-all"
                                >
                                  <span className="flex items-center gap-3">
                                    {installing ? (
                                      <>Đang cài <Loader2 className="animate-spin" size={28} /></>
                                    ) : installStatus === 'success' ? (
                                      <>Đã cài! <Check size={28} /></>
                                    ) : installStatus === 'error' ? (
                                      <>Lỗi <AlertCircle size={28} /></>
                                    ) : (
                                      <>Cài đặt <Download size={28} /></>
                                    )}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </MotionDiv>
                    )}
                    {selectedFile && activeTab === 'modpack' && (
                      <MotionDiv
                        key="modpack-install-bar"
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed inset-x-0 bottom-0 z-50 pointer-events-none pb-8"
                      >
                        <div className="px-6">
                          <div className="pointer-events-auto max-w-3xl mx-auto text-center">
                            <div className="inline-block bg-gray-900/90 backdrop-blur-xl rounded-2xl px-10 py-8 border-2 border-green-500/60 shadow-2xl shadow-green-500/50">
                              <button
                                onClick={installMod}
                                disabled={installing}
                                className="px-14 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-xl font-bold text-2xl text-white flex items-center gap-5 mx-auto disabled:opacity-60 shadow-xl shadow-green-600/60 transition-all"
                              >
                                <span className="flex items-center gap-5">
                                  {installing ? (
                                    <>Đang cài modpack... <Loader2 className="animate-spin" size={36} /></>
                                  ) : installStatus === 'success' ? (
                                    <>Thành công! <Check size={36} /></>
                                  ) : installStatus === 'error' ? (
                                    <>Lỗi cài đặt <AlertCircle size={36} /></>
                                  ) : (
                                    <>Cài đặt Modpack <Box size={36} /></>
                                  )}
                                </span>
                              </button>

                              <p className="mt-5 text-gray-300 text-lg font-medium">
                                "{selectedProject?.title}" sẽ được tạo thành một profile mới
                              </p>
                            </div>
                          </div>
                        </div>
                      </MotionDiv>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </MotionDiv>
    </>
  )
}