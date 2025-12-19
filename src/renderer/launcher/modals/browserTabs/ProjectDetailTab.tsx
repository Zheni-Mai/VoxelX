// src/renderer/profiles/modals/browserTabs/ProjectDetailTab.tsx
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Check,
  ChevronLeft,
  ExternalLink,
  Calendar,
  Download,
  AlertCircle,
  Package,
  Users,
  Heart,
  Link2,
  Bug,
  Code,
  HelpCircle,
  Layers,
} from 'lucide-react'
import { useState } from 'react'
import { ModrinthProject, ModrinthVersion } from '../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import type { Components } from 'react-markdown'

interface Props {
  project: ModrinthProject
  projectDetails: { project: any; versions: ModrinthVersion[] } | null
  selectedFile: ModrinthVersion | null
  onFileSelect: (version: ModrinthVersion) => void
  selectedGameVersion: string
  selectedLoader: 'fabric' | 'forge' | 'quilt' | 'neoforge' | 'all'
  activeTab: 'modpack' | 'mod' | 'shader' | 'resourcepack' | 'datapack'
}

export default function ProjectDetailTab({
  project,
  projectDetails,
  selectedFile,
  onFileSelect,
  selectedGameVersion,
  selectedLoader,
  activeTab,
}: Props) {
  const [versionPanelOpen, setVersionPanelOpen] = useState(false)
  const [linksPanelOpen, setLinksPanelOpen] = useState(false)
  const [dependenciesPanelOpen, setDependenciesPanelOpen] = useState(false)

  const detailedProject = projectDetails?.project
  const versions = projectDetails?.versions || []

  const filteredVersions = versions
    .filter((v) => Array.isArray(v.game_versions) && v.game_versions.includes(selectedGameVersion))
    .filter((v) => {
      if ((activeTab === 'mod' || activeTab === 'modpack') && selectedLoader !== 'all') {
        return Array.isArray(v.loaders) && v.loaders.includes(selectedLoader)
      }
      return true
    })
    .sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime())

  const currentVersion = selectedFile || filteredVersions[0] || null

  const togglePanel = (panel: 'version' | 'links' | 'dependencies') => {
    if (panel === 'version') {
      setVersionPanelOpen((prev) => {
        if (prev) return false
        setLinksPanelOpen(false)
        setDependenciesPanelOpen(false)
        return true
      })
    } else if (panel === 'links') {
      setLinksPanelOpen((prev) => {
        if (prev) return false
        setVersionPanelOpen(false)
        setDependenciesPanelOpen(false)
        return true
      })
    } else if (panel === 'dependencies') {
      setDependenciesPanelOpen((prev) => {
        if (prev) return false
        setVersionPanelOpen(false)
        setLinksPanelOpen(false)
        return true
      })
    }
  }

  if (!projectDetails || !detailedProject) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="animate-spin text-green-400" size={64} />
        <p className="text-xl text-gray-400 mt-6">Đang tải chi tiết dự án...</p>
      </div>
    )
  }

  if (filteredVersions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-400">
          Không có phiên bản nào phù hợp với phiên bản game hoặc loader đã chọn
        </p>
      </div>
    )
  }
const markdownComponents: Partial<Components> = {
  a: ({ href, children }) => (
    <a
      href={href || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="text-green-400 underline hover:text-green-300 transition-colors font-medium"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="text-3xl font-bold text-white mt-8 mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-2xl font-bold text-white mt-7 mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xl font-bold text-white mt-6 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-gray-300 leading-relaxed my-4">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 my-4 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 my-4 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="ml-4">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-green-400 pl-4 py-2 my-4 italic text-gray-400">
      {children}
    </blockquote>
  ),
  code: ({ node, className, children, ...props }) => {
  const isInline = !className?.includes('language-')
  if (isInline) {
    return (
      <code className="bg-gray-800 px-2 py-1 rounded text-green-300 text-sm" {...props}>
        {children}
      </code>
    )
  }
  return (
    <pre className="my-4 rounded-lg overflow-hidden">
      <code className={`block bg-gray-800 p-4 text-sm text-gray-300 ${className || ''}`} {...props}>
        {children}
      </code>
    </pre>
  )
},
  table: ({ children }) => (
    <table className="w-full border-collapse my-6 border border-gray-700">{children}</table>
  ),
  thead: ({ children }) => <thead className="bg-gray-800">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-gray-700">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2 text-left text-green-400 font-medium border-r border-gray-700 last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-gray-300 border-r border-gray-700 last:border-r-0">{children}</td>
  ),
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt}
      className="max-w-full h-auto rounded-lg my-6 shadow-lg border border-white/10"
    />
  ),
}

  return (
    <div className="relative min-h-0">
      <div className="space-y-12 pb-32">
        <div className="flex gap-10">
          <div className="w-32 h-32 rounded-2xl bg-gray-800 overflow-hidden border-4 border-white/20 shadow-2xl flex-shrink-0">
            {project.icon_url ? (
              <img src={project.icon_url} alt={project.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-6xl font-bold text-white">
                {project.title[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-5xl font-black text-white mb-4">{project.title}</h1>
            <p className="text-xl text-gray-300 leading-relaxed mb-8">
              {project.description || 'Không có mô tả'}
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-lg">
              <div className="flex items-center gap-3">
                <Users className="text-gray-500" size={20} />
                <div>
                  <p className="text-gray-500 text-sm">Tác giả</p>
                  <p className="text-green-400 font-bold">
                    {detailedProject.team?.name || project.author || 'Không rõ'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Heart className="text-pink-400" size={20} />
                <div>
                  <p className="text-gray-500 text-sm">Theo dõi</p>
                  <p className="text-pink-400 font-bold">
                    {(project.follower_count ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Download className="text-yellow-400" size={20} />
                <div>
                  <p className="text-gray-500 text-sm">Tải xuống</p>
                  <p className="text-yellow-400 font-bold">
                    {(project.downloads ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package className="text-cyan-400" size={20} />
                <div>
                  <p className="text-gray-500 text-sm">Loại</p>
                  <p className="text-cyan-400 font-bold capitalize">{project.project_type}</p>
                </div>
              </div>
            </div>

            {detailedProject.categories && detailedProject.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {detailedProject.categories.map((cat: string) => (
                  <span
                    key={cat}
                    className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {currentVersion && (
          <div className="bg-gray-800/60 rounded-2xl p-6 border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-4">Phiên bản hiện tại</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-500 text-sm">Phiên bản</p>
                <p className="text-white text-xl font-bold">{currentVersion.version_number}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Ngày phát hành</p>
                <p className="text-white text-lg flex items-center gap-2">
                  <Calendar size={18} />
                  {new Date(currentVersion.date_published).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Tải xuống</p>
                <p className="text-white text-lg flex items-center gap-2">
                  <Download size={18} />
                  {(currentVersion.downloads ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            {currentVersion.loaders && currentVersion.loaders.length > 0 && (
              <div className="flex gap-2 mt-4">
                {currentVersion.loaders.map((l) => (
                  <span key={l} className="text-xs px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full capitalize">
                    {l}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {detailedProject.body && detailedProject.body.trim() !== '' && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Giới thiệu</h2>
            <div className="bg-gray-800/60 rounded-2xl p-8 border border-white/10 prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={markdownComponents}
              >
                {detailedProject.body}
              </ReactMarkdown>
            </div>
          </div>
        )}
        {detailedProject.gallery && detailedProject.gallery.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Hình ảnh dự án</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {detailedProject.gallery.map((img: any, i: number) => (
                <a
                  key={i}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl overflow-hidden border-2 border-white/10 hover:border-green-400/60 transition-all shadow-lg"
                >
                  <img src={img.url} alt={img.title || `Gallery ${i + 1}`} className="w-full h-72 object-cover" />
                  {img.title && <p className="p-3 text-center text-white bg-black/50">{img.title}</p>}
                </a>
              ))}
            </div>
          </div>
        )}
        {currentVersion?.gallery && currentVersion.gallery.length > 0 && (
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Hình ảnh phiên bản này</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentVersion.gallery.map((img: any, i: number) => (
                <a
                  key={i}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl overflow-hidden border border-white/10 hover:border-green-400/60 transition-all"
                >
                  <img src={img.url} alt={`Gallery ${i + 1}`} className="w-full h-64 object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
        {currentVersion?.changelog && (
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Thay đổi trong phiên bản này</h3>
            <div className="bg-gray-800/60 rounded-2xl p-8 border border-white/10 prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {currentVersion.changelog}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {versionPanelOpen && filteredVersions.length > 0 && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 w-96 flex items-center justify-end pointer-events-none z-50"
          >
            <div className="h-[60vh] w-full bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl rounded-l-2xl overflow-hidden pointer-events-auto flex flex-col">
              <div className="p-6 border-b border-white/10 flex-shrink-0">
                <h3 className="text-xl font-bold text-white">Chọn phiên bản</h3>
                <p className="text-sm text-gray-400 mt-1">{filteredVersions.length} phiên bản khả dụng</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                {filteredVersions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => {
                      onFileSelect(version)
                      setVersionPanelOpen(false)
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      currentVersion?.id === version.id
                        ? 'bg-green-500/20 border-green-400 shadow-lg'
                        : 'bg-gray-800/50 border-white/10 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{version.version_number}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(version.date_published).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      {currentVersion?.id === version.id && <Check size={20} className="text-green-400" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(detailedProject.issues_url || detailedProject.source_url || detailedProject.support_url) && linksPanelOpen && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 w-96 flex items-center justify-end pointer-events-none z-50"
          >
            <div className="h-[60vh] w-full bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl rounded-l-2xl overflow-hidden pointer-events-auto flex flex-col">
              <div className="p-6 border-b border-white/10 flex-shrink-0">
                <h3 className="text-xl font-bold text-white">Liên kết</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <a
                  href={`https://modrinth.com/${project.project_type}/${project.slug || project.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-all"
                >
                  <ExternalLink size={24} className="text-green-400" />
                  <span className="font-medium text-white">Trang dự án trên Modrinth</span>
                </a>
                {detailedProject.issues_url && (
                  <a href={detailedProject.issues_url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-4 p-4 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all">
                    <Bug size={24} className="text-red-400" />
                    <span className="font-medium text-white">Báo lỗi / Issues</span>
                  </a>
                )}
                {detailedProject.source_url && (
                  <a href={detailedProject.source_url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-4 p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-all">
                    <Code size={24} className="text-blue-400" />
                    <span className="font-medium text-white">Mã nguồn</span>
                  </a>
                )}
                {detailedProject.support_url && (
                  <a href={detailedProject.support_url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-4 p-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-all">
                    <HelpCircle size={24} className="text-purple-400" />
                    <span className="font-medium text-white">Hỗ trợ / Donate</span>
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {currentVersion?.dependencies && currentVersion.dependencies.length > 0 && dependenciesPanelOpen && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 w-96 flex items-center justify-end pointer-events-none z-50"
          >
            <div className="h-[60vh] w-full bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl rounded-l-2xl overflow-hidden pointer-events-auto flex flex-col">
              <div className="p-6 border-b border-white/10 flex-shrink-0">
                <h3 className="text-xl font-bold text-white">Phụ thuộc</h3>
                <p className="text-sm text-gray-400 mt-1">{currentVersion.dependencies.length} mục</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {currentVersion.dependencies.map((dep, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/60 rounded-xl p-4 border border-white/10 flex items-center gap-4"
                  >
                    {dep.dependency_type === 'required' && <AlertCircle className="text-red-400" size={20} />}
                    {dep.dependency_type === 'optional' && <Package className="text-yellow-400" size={20} />}
                    {dep.dependency_type === 'incompatible' && <AlertCircle className="text-orange-400" size={20} />}
                    {dep.dependency_type === 'embedded' && <Package className="text-green-400" size={20} />}
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {dep.file_name || dep.project_id || 'Unknown dependency'}
                      </p>
                      <p className="text-sm text-gray-400 capitalize">
                        {dep.dependency_type === 'required'
                          ? 'Bắt buộc'
                          : dep.dependency_type === 'optional'
                          ? 'Tùy chọn'
                          : dep.dependency_type === 'incompatible'
                          ? 'Không tương thích'
                          : 'Nhúng'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="fixed bottom-6 right-6 flex gap-4 z-50">
        <button
          onClick={() => togglePanel('version')}
          className="p-4 bg-green-500/30 hover:bg-green-500/40 rounded-full shadow-2xl transition-all backdrop-blur group"
        >
          <ChevronLeft
            size={32}
            className={`text-green-400 transition-transform ${versionPanelOpen ? 'rotate-180' : ''}`}
          />
          {filteredVersions.length > 1 && (
            <span className="absolute -top-1 -right-1 bg-green-400 text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
              {filteredVersions.length}
            </span>
          )}
        </button>

        {(detailedProject.issues_url || detailedProject.source_url || detailedProject.support_url) && (
          <button
            onClick={() => togglePanel('links')}
            className="p-4 bg-gray-700/80 hover:bg-gray-600/80 rounded-full shadow-2xl transition-all backdrop-blur"
          >
            <Link2
              size={32}
              className={`text-white transition-transform ${linksPanelOpen ? 'rotate-12' : ''}`}
            />
          </button>
        )}

        {currentVersion?.dependencies && currentVersion.dependencies.length > 0 && (
          <button
            onClick={() => togglePanel('dependencies')}
            className="p-4 bg-orange-500/30 hover:bg-orange-500/40 rounded-full shadow-2xl transition-all backdrop-blur"
          >
            <Layers
              size={32}
              className={`text-orange-400 transition-transform ${dependenciesPanelOpen ? 'rotate-12' : ''}`}
            />
          </button>
        )}
      </div>
    </div>
  )
}