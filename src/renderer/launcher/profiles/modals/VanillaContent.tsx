// src/renderer/profiles/modals/VanillaContent.tsx
import { useState } from 'react'
import { Search, Loader2, Check } from 'lucide-react'

interface MinecraftVersion {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
}

interface Props {
  minecraftVersions: MinecraftVersion[]
  loadingVersions: boolean
  selectedVersion: string
  setSelectedVersion: (version: string) => void
}

export default function VanillaContent({
  minecraftVersions,
  loadingVersions,
  selectedVersion,
  setSelectedVersion,
}: Props) {
  const [versionFilter, setVersionFilter] = useState('')
  const [versionTypeFilter, setVersionTypeFilter] = useState<'release' | 'snapshot' | 'old_beta' | 'old_alpha' | null>(null)

  const filteredVersions = minecraftVersions.filter((v) => {
    if (versionTypeFilter && v.type !== versionTypeFilter) return false
    if (versionFilter && !v.id.toLowerCase().includes(versionFilter.toLowerCase())) return false
    return true
  })

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-2xl font-bold text-purple-400 whitespace-nowrap">Chọn Minecraft Version</h3>
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm phiên bản..."
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-purple-400 text-base"
            />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-wrap gap-2 items-center">
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
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pt-4 space-y-3">
        {loadingVersions ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-cyan-400">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p>Đang tải phiên bản...</p>
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>Không tìm thấy phiên bản nào</p>
          </div>
        ) : (
          filteredVersions.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVersion(v.id)}
              className={`w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl text-left transition-all flex items-center justify-between ${
                selectedVersion === v.id ? 'border-2 border-cyan-400' : ''
              }`}
            >
              <div>
                <p className="font-medium">{v.id}</p>
                <p className="text-sm text-gray-400 capitalize">{v.type.replace('_', ' ')}</p>
              </div>
              {selectedVersion === v.id && <Check size={20} className="text-cyan-400" />}
            </button>
          ))
        )}
      </div>
    </div>
  )
}