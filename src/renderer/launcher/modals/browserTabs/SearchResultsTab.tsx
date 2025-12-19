// src/renderer/profiles/modals/browserTabs/SearchResultsTab.tsx
import { motion } from 'framer-motion'
import { Loader2, Package } from 'lucide-react'
import { ModrinthProject } from '../types'

interface Props {
  results: ModrinthProject[]
  loading: boolean
  loadingMore: boolean
  totalHits: number
  hasMore: boolean
  onProjectClick: (project: ModrinthProject) => void
}

export default function SearchResultsTab({
  results,
  loading,
  loadingMore,
  totalHits,
  hasMore,
  onProjectClick,
}: Props) {
  if (loading && results.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-green-400" size={64} />
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-32 text-gray-500">
        <Package size={80} className="mx-auto mb-6 opacity-30" />
        <p className="text-2xl font-medium">Không tìm thấy kết quả</p>
        <p className="text-lg mt-4">Thử thay đổi từ khóa hoặc phiên bản game</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {results.map((project) => (
          <motion.button
            key={project.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onProjectClick(project)}
            className="bg-gray-800/70 hover:bg-gray-700/90 rounded-3xl p-6 text-left transition-all border border-white/10 hover:border-green-400/50 shadow-xl hover:shadow-2xl hover:shadow-green-500/20"
          >
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gray-700 overflow-hidden border border-white/10 flex-shrink-0">
                {project.icon_url ? (
                  <img src={project.icon_url} alt={project.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold text-white">
                    {project.title[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-xl truncate">{project.title}</h3>
                <p className="text-sm text-gray-400 truncate mt-1">by {project.author || 'Không rõ'}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                  <span>{(project.downloads ?? 0).toLocaleString()} tải</span>
                  <span>•</span>
                  <span>{(project.follower_count ?? 0).toLocaleString()} theo dõi</span>
                </div>
                <span className="inline-block mt-4 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium capitalize">
                  {project.project_type}
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {loadingMore && (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin text-green-400" size={48} />
          <span className="ml-4 text-white text-lg font-medium">
            Đang tải thêm... ({results.length.toLocaleString()} / {totalHits.toLocaleString()})
          </span>
        </div>
      )}

      {!loadingMore && hasMore === false && results.length > 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Đã hiển thị tất cả {results.length.toLocaleString()} kết quả</p>
        </div>
      )}
    </>
  )
}