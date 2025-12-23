// src/renderer/changelog/tabs/VoxelXGitHubTab.tsx
import { useEffect, useState } from 'react'
import { ExternalLink, ChevronRight } from 'lucide-react'

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string
  html_url: string
  prerelease: boolean
}

interface VoxelXGitHubTabProps {
  onOpenDetail: (release: GitHubRelease) => void
}

export default function VoxelXGitHubTab({ onOpenDetail }: VoxelXGitHubTabProps) {
  const [releases, setReleases] = useState<GitHubRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('https://api.github.com/repos/Zheni-Mai/VoxelX/releases')
      .then(res => res.json())
      .then(data => {
        setReleases(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="h-9 bg-white/10 rounded-xl w-72 mb-3" />
            <div className="h-5 bg-white/10 rounded-full w-48 mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-white/10 rounded w-full" />
              <div className="h-4 bg-white/10 rounded w-11/12" />
              <div className="h-4 bg-white/10 rounded w-9/12" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-300 text-xl py-16">
        Không thể tải changelog từ GitHub. Vui lòng thử lại sau.
      </div>
    )
  }

  if (releases.length === 0) {
    return (
      <div className="text-center text-gray-300 text-xl py-16">
        Chưa có release nào trên GitHub.
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-4">
        <div className="space-y-6 pb-6">
          {releases.map((release) => (
            <div
              key={release.tag_name}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-xl 
                         hover:shadow-2xl hover:border-purple-400/40 transition-all cursor-pointer group
                         min-h-32 max-h-56 flex flex-col justify-between relative"
              onClick={() => onOpenDetail(release)}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-4">
                    <h3 className="text-3xl font-bold text-white group-hover:text-purple-300 transition">
                      {release.tag_name}
                    </h3>
                    {release.prerelease && (
                      <span className="px-4 py-1 rounded-xl text-sm font-bold bg-orange-500/80 text-white">
                        Pre-release
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-gray-300 mt-2">
                    {new Date(release.published_at).toLocaleDateString('vi-VN')}
                    {' • '}
                    {release.name || 'Cập nhật VoxelX'}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-purple-300 group-hover:text-purple-200 transition">
                  <span className="font-medium text-lg">Xem chi tiết</span>
                  <ChevronRight size={28} className="group-hover:translate-x-2 transition" />
                </div>
              </div>

              {/* Preview ngắn */}
              {release.body && (
                <div className="mt-4 text-gray-400 text-sm leading-relaxed line-clamp-4 prose prose-invert prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: formatMarkdownPreview(release.body) }} />
                </div>
              )}

              <a
                href={release.html_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-5 right-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-300 transition"
              >
                <ExternalLink size={18} />
                GitHub
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Hàm phụ để preview markdown đẹp hơn (tùy chọn)
const formatMarkdownPreview = (body: string) => {
  return body
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 rounded">$1</code>')
    .replace(/^- (.*)$/gm, '• $1')
    .replace(/^### (.*)$/gm, '<strong class="text-purple-300">$1</strong>')
    .replace(/^## (.*)$/gm, '<strong class="text-xl text-purple-300">$1</strong>')
}