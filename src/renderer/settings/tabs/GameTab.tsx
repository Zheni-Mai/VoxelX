// src/renderer/settings/tabs/GameTab.tsx
import React from 'react'
import { Cpu, Monitor } from 'lucide-react'
import MemorySlider from '../components/MemorySlider'

interface GameSettings {
  allocatedMemory: number
  width: number
  height: number
  fullscreen: boolean
  lockAspectRatio: boolean
  launcherVisibility: 'hide' | 'keep-open'
}

interface GameTabProps {
  settings: GameSettings
  totalRam: number
  freeRam: number
  update: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void
}

export default function GameTab({ settings, totalRam, freeRam, update }: GameTabProps) {
  return (
    <div className="space-y-12">
      <section>
        <h3 className="text-2xl font-bold flex items-center gap-3 mb-8">
          <Cpu className="text-emerald-400" aria-hidden="true" /> Bộ nhớ RAM cấp phát
        </h3>
        <div className="bg-black/40 rounded-2xl p-8 border border-white/10">
          <MemorySlider
            totalRam={totalRam}
            freeRam={freeRam}
            allocatedMemory={settings.allocatedMemory}
            onChange={(value) => update('allocatedMemory', value)}
          />
          <p className="text-center text-sm text-gray-500 mt-4">
            Khuyến nghị: 4096–8192 MB cho Minecraft có mod
          </p>
        </div>
      </section>
      <section>
        <h3 className="text-2xl font-bold flex items-center gap-3 mb-8">
          <Monitor className="text-purple-400" aria-hidden="true" /> Độ phân giải game
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg">
          <div>
            <label htmlFor="width" className="block text-sm font-medium text-gray-300 mb-2">
              Chiều rộng (Width)
            </label>
            <input
              id="width"
              type="number"
              min="640"
              max="7680"
              value={settings.width}
              onChange={(e) => update('width', Number(e.target.value) || 854)}
              className="w-full px-4 py-3 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="854"
              aria-label="Chiều rộng cửa sổ game"
            />
          </div>
          <div>
            <label htmlFor="height" className="block text-sm font-medium text-gray-300 mb-2">
              Chiều cao (Height)
            </label>
            <input
              id="height"
              type="number"
              min="480"
              max="4320"
              value={settings.height}
              onChange={(e) => update('height', Number(e.target.value) || 480)}
              className="w-full px-4 py-3 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="480"
              aria-label="Chiều cao cửa sổ game"
            />
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <label className="flex items-center gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.fullscreen}
              onChange={(e) => update('fullscreen', e.target.checked)}
              className="w-5 h-5 text-cyan-400 rounded focus:ring-cyan-400"
              aria-label="Bật chế độ toàn màn hình"
            />
            <span className="text-lg">Toàn màn hình (Fullscreen)</span>
          </label>

          <label className="flex items-center gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.lockAspectRatio}
              onChange={(e) => update('lockAspectRatio', e.target.checked)}
              className="w-5 h-5 text-cyan-400 rounded focus:ring-cyan-400"
              aria-label="Giữ tỉ lệ khung hình gốc"
            />
            <span className="text-lg">Giữ tỉ lệ khung hình</span>
          </label>
        </div>
      </section>
      <section>
        <h3 className="text-2xl font-bold mb-6">Hành vi launcher khi chơi</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-4 cursor-pointer">
            <input
              type="radio"
              name="launcher-visibility"
              checked={settings.launcherVisibility === 'hide'}
              onChange={() => update('launcherVisibility', 'hide')}
              className="text-cyan-400"
              aria-label="Ẩn launcher khi chơi game"
            />
            <span className="text-lg">Ẩn launcher</span>
          </label>
          <label className="flex items-center gap-4 cursor-pointer">
            <input
              type="radio"
              name="launcher-visibility"
              checked={settings.launcherVisibility === 'keep-open'}
              onChange={() => update('launcherVisibility', 'keep-open')}
              className="text-cyan-400"
              aria-label="Giữ launcher mở khi chơi game"
            />
            <span className="text-lg">Giữ launcher mở</span>
          </label>
        </div>
      </section>
    </div>
  )
}