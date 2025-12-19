// src/renderer/components/modals/ResourceManagerModal.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Package, Image, FileArchive, FileBox, Camera } from 'lucide-react'
import { MotionDiv } from '../../utils/motion'
import ModsTab from './tabs/ModsTab'
import ResourcePacksTab from './tabs/ResourcePacksTab'
import DataPacksTab from './tabs/DataPacksTab'
import ShaderPacksTab from './tabs/ShaderPacksTab'
import ScreenshotsTab from './tabs/ScreenshotsTab'

interface Props {
  isOpen: boolean
  onClose: () => void
  profile: {
    name: string
    gameDirectory: string
    version: string
    loader: string
    optifine?: boolean | string
  }
}

type TabType = 'mods' | 'resourcepacks' | 'shaderpacks' | 'datapacks' | 'screenshots'

export default function ResourceManagerModal({ isOpen, onClose, profile: initialProfile }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('mods')
  const [profile, setProfile] = useState(initialProfile)

  const tabs = [
    { id: 'mods' as TabType, label: 'Mods', icon: Package },
    { id: 'resourcepacks' as TabType, label: 'Resource Packs', icon: Image },
    { id: 'shaderpacks' as TabType, label: 'Shader Packs', icon: FileBox},
    { id: 'datapacks' as TabType, label: 'Data Packs', icon: FileArchive },
    { id: 'screenshots' as TabType, label: 'Screenshots', icon: Camera },
  ]

  useEffect(() => {
    if (isOpen) {
      setProfile(initialProfile)
    }
  }, [isOpen, initialProfile])

  const refreshProfile = async () => {
    try {
      const current = await window.electronAPI.profileAPI.getCurrentProfile()
      if (current?.name === initialProfile.name) {
        setProfile(current)
      }
    } catch (err) {
      console.error('Không thể reload profile:', err)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      <MotionDiv
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-black/70 backdrop-blur-sm rounded-3xl border border-white/20 shadow-3xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <Package size={36} className="text-cyan-400" />
              <div>
                <h2 className="text-1xl font-black text-white">Quản lý Tài nguyên</h2>
                <p className="text-sm text-cyan-300">{profile.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition">
              <X size={32} />
            </button>
          </div>
          <div className="flex border-b border-white/10">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-3 py-5 px-6 font-bold text-sm transition-all relative
                    ${activeTab === tab.id 
                      ? 'text-cyan-400 bg-white/5' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon size={24} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-purple-600"
                    />
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex-1 overflow-hidden">
            {activeTab === 'mods' && <ModsTab 
              profile={profile} 
              onProfileUpdate={refreshProfile}
            />}
            {activeTab === 'resourcepacks' && <ResourcePacksTab profile={profile} />}
            {activeTab === 'shaderpacks' && <ShaderPacksTab profile={profile} />}
            {activeTab === 'datapacks' && <DataPacksTab profile={profile} />}
            {activeTab === 'screenshots' && <ScreenshotsTab profile={profile} />}
          </div>
        </div>
      </MotionDiv>
    </>
  )
}