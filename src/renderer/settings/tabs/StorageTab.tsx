// src/renderer/settings/tabs/StorageTab.tsx
import React from 'react'
import { HardDrive } from 'lucide-react'
import DriveList from '../components/DriveList'

interface StorageTabProps {
  gameDirectory: string
  onDirectoryChange: (path: string) => void
}

export default function StorageTab({ gameDirectory, onDirectoryChange }: StorageTabProps) {
  const selectGameDirectory = async () => {
    const dir = await window.electronAPI.selectGameDirectory?.()
    if (dir) onDirectoryChange(dir)
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-2xl font-bold flex items-center gap-3 mb-8">
          <HardDrive className="text-yellow-400" /> Ổ đĩa & Dung lượng
        </h3>

        <DriveList />

        <div className="mt-10 bg-black/40 rounded-2xl p-8 border border-white/10">
          <h4 className="text-xl font-bold text-gray-100 mb-6">Thư mục game (.minecraft)</h4>
          <p className="text-gray-400 mb-6 break-all text-sm font-mono">
            {gameDirectory || 'Chưa chọn thư mục nào'}
          </p>
          <button
            onClick={selectGameDirectory}
            className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl font-bold hover:scale-105 transition shadow-lg"
          >
            Chọn thư mục game
          </button>
        </div>
      </section>
    </div>
  )
}