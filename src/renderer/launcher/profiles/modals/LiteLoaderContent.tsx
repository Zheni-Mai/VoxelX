// src/renderer/profiles/modals/LiteLoaderContent.tsx
import { useState } from 'react'
import { Search, Loader2, Check } from 'lucide-react'

interface MinecraftVersion {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
}

interface LiteLoaderVersionItem {
  version: string
  type?: 'latest' | 'common'  
  date?: string
}

interface Props {
  minecraftVersions: MinecraftVersion[]
  loaderVersions: (string | LiteLoaderVersionItem)[]
  loadingVersions: boolean
  selectedVersion: string
  setSelectedVersion: (version: string) => void
  selectedLoaderVersion: string
  setSelectedLoaderVersion: (version: string) => void
}

export default function LiteLoaderContent({
  minecraftVersions,
  loaderVersions,
  loadingVersions,
  selectedVersion,
  setSelectedVersion,
  selectedLoaderVersion,
  setSelectedLoaderVersion,
}: Props) {
  const [showStep, setShowStep] = useState<'game' | 'loader'>('game')
  const [versionFilter, setVersionFilter] = useState('')
  const [versionTypeFilter, setVersionTypeFilter] = useState<'release' | 'snapshot' | 'old_beta' | 'old_alpha' | null>(null)
  const supportedVersions = minecraftVersions.filter(v => {
    const num = parseFloat(v.id)
    return !isNaN(num) && num <= 1.12
  })

  const filteredVersions = supportedVersions.filter((v) => {
    if (versionTypeFilter && v.type !== versionTypeFilter) return false
    if (versionFilter && !v.id.toLowerCase().includes(versionFilter.toLowerCase())) return false
    return true
  })

  return (
    <div className="h-full flex flex-col">
      <div className="pb-4 border-b border-white/10">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-2xl font-bold text-white-400 whitespace-nowrap">Chọn LiteLoader</h3>

          <button
            onClick={() => setShowStep('game')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              showStep === 'game' ? 'bg-cyan-500 text-white' : 'bg-white/10'
            }`}
          >
            Game Version
          </button>
          <button
            onClick={() => setShowStep('loader')}
            disabled={!selectedVersion}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              showStep === 'loader' ? 'bg-white-500 text-white' : 'bg-white/10'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            LiteLoader Version
          </button>

          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm phiên bản..."
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white-400 text-base"
            />
          </div>
        </div>

        {showStep === 'game' && (
          <div className="flex flex-wrap gap-2">
            {(['all', 'release', 'snapshot', 'old_beta', 'old_alpha'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setVersionTypeFilter(type === 'all' ? null : type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  versionTypeFilter === (type === 'all' ? null : type)
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {type === 'all' ? 'Tất cả' : type.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto pt-4">
        {showStep === 'game' ? (
          <div className="space-y-3">
            {loadingVersions ? (
              <div className="flex flex-col items-center justify-center py-16 text-white-400">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p>Đang tải phiên bản...</p>
              </div>
            ) : filteredVersions.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-2">Không tìm thấy phiên bản nào</p>
                <p className="text-xs text-gray-600">
                  LiteLoader chỉ hỗ trợ Minecraft từ 1.5.2 đến 1.12.2
                </p>
              </div>
            ) : (
              filteredVersions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVersion(v.id)
                    setShowStep('loader')
                  }}
                  className={`w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl text-left transition-all flex items-center justify-between ${
                    selectedVersion === v.id ? 'border-2 border-white-400' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium">{v.id}</p>
                    <p className="text-sm text-gray-400 capitalize">{v.type.replace('_', ' ')}</p>
                  </div>
                  {selectedVersion === v.id && <Check size={20} className="text-white-400" />}
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {loaderVersions.length === 0 ? (
              <p className="text-center text-gray-500 py-16">
                Không có LiteLoader cho phiên bản Minecraft {selectedVersion}
              </p>
            ) : (
              loaderVersions.map((item) => {
                const version = typeof item === 'string' ? item : item.version
                const type = typeof item === 'object' ? item.type : undefined

                const isLatest = type === 'latest'

                return (
                  <button
                    key={version}
                    onClick={() => setSelectedLoaderVersion(version)}
                    className={`w-full p-4 rounded-xl text-left transition-all relative overflow-hidden ${
                      selectedLoaderVersion === version
                        ? 'bg-white-500/30 border-2 border-white-400'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">LiteLoader {version}</p>
                        <p className="text-sm text-gray-400">cho Minecraft {selectedVersion}</p>
                      </div>

                      {isLatest && (
                        <span className="px-3 py-1 text-xs font-bold bg-green-600 text-white rounded-full shadow">
                          LATEST
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}