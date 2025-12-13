// src/renderer/profiles/modals/FabricContent.tsx
import { useState } from 'react'
import { Search, Loader2, Check } from 'lucide-react'

interface MinecraftVersion {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
}

interface Props {
  minecraftVersions: MinecraftVersion[]
  fabricVersions: string[]
  loadingVersions: boolean
  selectedVersion: string
  setSelectedVersion: (version: string) => void
  selectedLoaderVersion: string
  setSelectedLoaderVersion: (version: string) => void
}

export default function FabricContent({
  minecraftVersions,
  fabricVersions,
  loadingVersions,
  selectedVersion,
  setSelectedVersion,
  selectedLoaderVersion,
  setSelectedLoaderVersion,
}: Props) {
  const [showFabricStep, setShowFabricStep] = useState<'game' | 'loader'>('game')
  const [versionFilter, setVersionFilter] = useState('')
  const [versionTypeFilter, setVersionTypeFilter] = useState<'release' | 'snapshot' | 'old_beta' | 'old_alpha' | null>(null)

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-purple-400">Chọn Fabric Loader</h3>

      {/* Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowFabricStep('game')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            showFabricStep === 'game' ? 'bg-cyan-500 text-white' : 'bg-white/10'
          }`}
        >
          Game Version
        </button>
        <button
          onClick={() => setShowFabricStep('loader')}
          disabled={!selectedVersion}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            showFabricStep === 'loader' ? 'bg-purple-500 text-white' : 'bg-white/10'
          } disabled:opacity-50`}
        >
          Fabric Loader
        </button>
      </div>

      {showFabricStep === 'game' ? (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-purple-400 text-base"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'release', 'snapshot', 'old_beta', 'old_alpha'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setVersionTypeFilter(type === 'all' ? null : type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  versionTypeFilter === (type === 'all' ? null : type)
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {type === 'all' ? 'Tất cả' : type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {loadingVersions ? (
              <div className="flex flex-col items-center justify-center py-16 text-purple-400">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p>Đang tải phiên bản...</p>
              </div>
            ) : (
              minecraftVersions
                .filter((v) => {
                  if (versionTypeFilter && v.type !== versionTypeFilter) return false
                  if (versionFilter && !v.id.toLowerCase().includes(versionFilter.toLowerCase())) return false
                  return true
                })
                .map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVersion(v.id)
                      setShowFabricStep('loader')
                    }}
                    className={`w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl text-left transition-all flex items-center justify-between ${
                      selectedVersion === v.id ? 'border-2 border-purple-400' : ''
                    }`}
                  >
                    <div>
                      <p className="font-medium">{v.id}</p>
                      <p className="text-sm text-gray-400 capitalize">{v.type.replace('_', ' ')}</p>
                    </div>
                    {selectedVersion === v.id && <Check size={20} className="text-purple-400" />}
                  </button>
                ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {fabricVersions.length === 0 ? (
            <p className="text-center text-gray-500 py-16">Không có Fabric loader cho phiên bản này</p>
          ) : (
            fabricVersions.map((ver) => (
              <button
                key={ver}
                onClick={() => setSelectedLoaderVersion(ver)}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  selectedLoaderVersion === ver
                    ? 'bg-purple-500/30 border-2 border-purple-400'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <p className="font-medium">Fabric Loader {ver}</p>
                <p className="text-sm text-gray-400">cho Minecraft {selectedVersion}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}