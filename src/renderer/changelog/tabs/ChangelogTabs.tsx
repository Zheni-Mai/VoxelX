// src/renderer/changelog/tabs/ChangelogTabs.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { MotionDiv } from '../../utils/motion'
import LatestMinecraftTab from '../card/LatestMinecraftTab'
import VoxelXGitHubTab from '../card/VoxelXGitHubTab'
import VoxelXReleaseDetailModal from '../modal/VoxelXReleaseDetailModal'

interface ChangelogEntry {
  version: string
  type: 'release' | 'snapshot'
  date: string
  description: string
  url: string
}

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string
  html_url: string
  prerelease: boolean
}

interface ChangelogTabsProps {
  latestLog?: ChangelogEntry
  allChangelogs: ChangelogEntry[]
  isLoading?: boolean
  onOpenHistory: () => void
}

export default function ChangelogTabs({ 
  latestLog, 
  allChangelogs, 
  isLoading = false, 
  onOpenHistory 
}: ChangelogTabsProps) {
  const [activeTab, setActiveTab] = useState<'minecraft' | 'voxelx'>('minecraft')
  const [selectedRelease, setSelectedRelease] = useState<GitHubRelease | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const openDetail = (release: GitHubRelease) => {
    setSelectedRelease(release)
    setIsDetailOpen(true)
  }

  return (
    <>
      <MotionDiv
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full"
      >
        {/* Giới hạn chiều cao tối đa ~80% màn hình, scroll nếu cần */}
        <div className="bg-white/6 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl h-full max-h-[80vh] flex flex-col overflow-hidden">
          {/* Tab buttons - cố định ở trên */}
          <div className="flex justify-center p-8 pb-4 flex-shrink-0">
            <div className="inline-flex bg-white/5 rounded-2xl p-1 border border-white/10">
              <button
                onClick={() => setActiveTab('minecraft')}
                className={`px-10 py-4 rounded-xl font-bold text-lg transition-all ${
                  activeTab === 'minecraft'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Minecraft Chính Thức
              </button>
              <button
                onClick={() => setActiveTab('voxelx')}
                className={`px-10 py-4 rounded-xl font-bold text-lg transition-all ml-2 ${
                  activeTab === 'voxelx'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                VoxelX (GitHub)
              </button>
            </div>
          </div>

          {/* Nội dung tab - chiếm hết phần còn lại và scroll nếu cần */}
          <div className="flex-1 overflow-y-auto px-10 pb-10">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="h-full"
            >
              {activeTab === 'minecraft' ? (
                <LatestMinecraftTab
                  latestLog={latestLog}
                  onOpenHistory={onOpenHistory}
                  isLoading={isLoading}
                />
              ) : (
                <VoxelXGitHubTab onOpenDetail={openDetail} />
              )}
            </motion.div>
          </div>
        </div>
      </MotionDiv>

      <VoxelXReleaseDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        release={selectedRelease}
      />
    </>
  )
}