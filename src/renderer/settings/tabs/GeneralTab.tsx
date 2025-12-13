// src/renderer/settings/tabs/GeneralTab.tsx
import React, { useState } from 'react'
import { Globe, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { presetThemes } from '../../themes'
import bg1 from '@/assets/backgrounds/1.png'
import bg2 from '@/assets/backgrounds/2.png'
import bg3 from '@/assets/backgrounds/3.png'
import bg4 from '@/assets/backgrounds/4.png'
import bg5 from '@/assets/backgrounds/5.png'
import bg6 from '@/assets/backgrounds/6.png'
import bg7 from '@/assets/backgrounds/7.png'
import bg8 from '@/assets/backgrounds/8.png'
import bg9 from '@/assets/backgrounds/9.png'
import bg10 from '@/assets/backgrounds/10.png'
import bg11 from '@/assets/backgrounds/11.png'
import bg12 from '@/assets/backgrounds/12.png'
import bg13 from '@/assets/backgrounds/13.png'
import bg14 from '@/assets/backgrounds/14.png'
import bg15 from '@/assets/backgrounds/15.png'
import bg16 from '@/assets/backgrounds/16.png'
import bg17 from '@/assets/backgrounds/17.png'
import bg18 from '@/assets/backgrounds/18.png'
import bg19 from '@/assets/backgrounds/19.png'
import bg20 from '@/assets/backgrounds/20.png'
import bg21 from '@/assets/backgrounds/21.png'
import bg22 from '@/assets/backgrounds/22.png'

const accentColors = [
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#22c55e', '#ef4444', '#f97316', '#a855f7',
  '#14b8a6', '#06d6a0', '#00d9ff', '#ff006e', '#ff9500',
  '#7c3aed', '#db2777', '#dc2626', '#facc15', '#84cc16',
] as const

const builtinBackgrounds = [
  bg1, bg2, bg3, bg4, bg5, bg6, bg7, bg8, bg9, bg10, bg11, bg12, bg13, bg14, bg15, bg16, bg17, bg18, bg19, bg20, bg21, bg22
] as const

interface Theme {
  name: string
  background: { type: 'gradient' | 'color' | 'image'; color?: string; image?: string }
  accentColor: string
}

interface GeneralTabProps {
  currentTheme: Theme
  setCurrentTheme: React.Dispatch<React.SetStateAction<Theme>>
  applyPresetTheme: (theme: typeof presetThemes[number]) => void
  saveTheme: () => Promise<void>
}

export default function GeneralTab({
  currentTheme,
  setCurrentTheme,
  applyPresetTheme,
  saveTheme,
}: GeneralTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'colors' | 'wallpapers'>('colors')
  const [wallpaperIndex, setWallpaperIndex] = useState(0)

  const setBackground = (type: 'gradient' | 'color' | 'image', value?: string) => {
    setCurrentTheme(prev => ({
      ...prev,
      background: {
        type,
        ...(type === 'image' ? { image: value } : {}),
        ...(type === 'color' ? { color: value || '#0f172a' } : {}),
      } as any
    }))
  }

  const setAccentColor = (color: string) => {
    setCurrentTheme(prev => ({ ...prev, accentColor: color }))
    document.documentElement.style.setProperty('--accent-color', color)
  }

  const selectBackgroundImage = async () => {
    const img = await window.electronAPI.themeAPI.selectBackgroundImage()
    if (img) setBackground('image', img)
  }

  const nextWallpaper = () => setWallpaperIndex((prev) => (prev + 1) % builtinBackgrounds.length)
  const prevWallpaper = () => setWallpaperIndex((prev) => (prev - 1 + builtinBackgrounds.length) % builtinBackgrounds.length)

  return (
    <div className="space-y-10">
      <h3 className="text-2xl font-bold flex items-center gap-3 mb-8">
        <Globe className="text-cyan-400" /> Giao diện & Tuỳ biến
      </h3>
      <div className="flex gap-6 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveSubTab('colors')}
          className={`px-6 py-3 rounded-t-xl font-medium transition-all ${
            activeSubTab === 'colors'
              ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Màu sắc & Chủ đề
        </button>
        <button
          onClick={() => setActiveSubTab('wallpapers')}
          className={`px-6 py-3 rounded-t-xl font-medium transition-all ${
            activeSubTab === 'wallpapers'
              ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Ảnh nền có sẵn ({builtinBackgrounds.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'colors' && (
          <motion.div
            key="colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="bg-black/40 rounded-2xl p-8 border border-white/10">
              <h4 className="text-xl font-bold mb-6">Chủ đề có sẵn</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {presetThemes.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => applyPresetTheme(theme)}
                    className="group relative overflow-hidden rounded-2xl border-2 border-white/20 hover:border-accent transition-all duration-300"
                  >
                    <div className="h-32 relative flex flex-col justify-end p-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
                      <div
                        className="absolute inset-0 opacity-90"
                        style={{
                          background:
                            theme.background.type === 'gradient'
                              ? 'linear-gradient(135deg, #0f172a, #1e293b)'
                              : theme.background.type === 'color' && theme.background.color
                              ? theme.background.color
                              : 'linear-gradient(135deg, #0f172a, #1e293b)',
                        }}
                      />
                      <div className="relative z-10">
                        <p className="text-white font-bold text-lg">{theme.name}</p>
                        <div
                          className="mt-2 w-10 h-10 rounded-lg shadow-lg ring-2 ring-white/50"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-black/40 rounded-2xl p-8 border border-white/10">
              <h4 className="text-xl font-bold mb-6">Nền giao diện</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <button
                  onClick={() => setBackground('gradient')}
                  className={`h-24 rounded-2xl bg-gradient-to-br from-blue-900 to-purple-900 border-2 transition-all ${
                    currentTheme.background.type === 'gradient' ? 'border-cyan-400 ring-4 ring-cyan-400/50' : 'border-white/20'
                  }`}
                >
                  <span className="sr-only">Gradient</span>
                </button>

                <button
                  onClick={() => setBackground('color', '#0f172a')}
                  className={`h-24 rounded-2xl bg-slate-900 border-2 transition-all ${
                    currentTheme.background.type === 'color' && currentTheme.background.color === '#0f172a'
                      ? 'border-cyan-400 ring-4 ring-cyan-400/50'
                      : 'border-white/20'
                  }`}
                >
                  <span className="sr-only">Đen tuyền</span>
                </button>

                <button
                  onClick={() => setBackground('color', '#1a1a2e')}
                  className={`h-24 rounded-2xl bg-[#1a1a2e] border-2 transition-all ${
                    currentTheme.background.type === 'color' && currentTheme.background.color === '#1a1a2e'
                      ? 'border-cyan-400 ring-4 ring-cyan-400/50'
                      : 'border-white/20'
                  }`}
                >
                  <span className="sr-only">Xám xanh</span>
                </button>

                <button
                  onClick={selectBackgroundImage}
                  className="h-24 rounded-2xl bg-gray-800 border-2 border-dashed border-gray-500 flex flex-col items-center justify-center text-gray-400 hover:border-cyan-400 hover:text-cyan-400 transition group"
                >
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-sm font-medium">Ảnh từ máy</span>
                </button>
              </div>

              {currentTheme.background.type === 'image' && currentTheme.background.image && (
                <div className="mt-6 text-center">
                  <p className="text-gray-400 mb-3">Ảnh nền hiện tại:</p>
                  <img
                    key={currentTheme.background.image}
                    src={currentTheme.background.image}
                    alt="Ảnh nền tùy chỉnh"
                    className="max-h-64 mx-auto rounded-xl shadow-2xl border border-white/20 object-cover"
                  />
                </div>
              )}
            </div>
            <div className="bg-black/40 rounded-2xl p-8 border border-white/10">
              <h4 className="text-xl font-bold mb-6">Màu nhấn (Accent Color)</h4>
              <div className="grid grid-cols-8 gap-4">
                {accentColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setAccentColor(color)}
                    className={`w-14 h-14 rounded-2xl transition-all hover:scale-110 shadow-lg ${
                      currentTheme.accentColor === color ? 'ring-4 ring-white ring-offset-4 ring-offset-black scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {currentTheme.accentColor === color && (
                      <svg className="w-8 h-8 mx-auto text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
                <div className="flex items-center justify-center">
                  <input
                    type="color"
                    value={currentTheme.accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-14 h-14 rounded-2xl cursor-pointer border-2 border-white/30"
                    title="Chọn màu tự do"
                  />
                </div>
              </div>
            </div>

            <div className="text-center pt-6">
              <button
                onClick={saveTheme}
                className="px-12 py-5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xl font-bold rounded-2xl hover:scale-105 transition-all shadow-2xl"
              >
                Áp dụng & Lưu Theme
              </button>
            </div>
          </motion.div>
        )}
        {activeSubTab === 'wallpapers' && (
          <motion.div
            key="wallpapers"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="bg-black/40 rounded-3xl p-10 border border-white/10">
              <h4 className="text-2xl font-bold text-center mb-10 text-cyan-400">
                Chọn ảnh nền yêu thích
              </h4>

              <div className="relative max-w-5xl mx-auto">
                <div className="relative h-96 overflow-hidden rounded-3xl bg-black/60 backdrop-blur-sm border border-white/10">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={wallpaperIndex}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <motion.img
                        src={builtinBackgrounds[wallpaperIndex]}
                        alt={`Wallpaper ${wallpaperIndex + 1}`}
                        className="w-full h-full object-cover rounded-3xl cursor-pointer shadow-2xl"
                        whileHover={{ scale: 1.03 }}
                        onClick={() => setBackground('image', builtinBackgrounds[wallpaperIndex])}
                      />
                    </motion.div>
                  </AnimatePresence>

                  <button
                    onClick={prevWallpaper}
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-md transition-all hover:scale-110"
                  >
                    <ChevronLeft size={32} className="text-white" />
                  </button>
                  <button
                    onClick={nextWallpaper}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-md transition-all hover:scale-110"
                  >
                    <ChevronRight size={32} className="text-white" />
                  </button>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 px-6 py-3 rounded-full backdrop-blur-md">
                    <span className="text-white font-medium">
                      {wallpaperIndex + 1} / {builtinBackgrounds.length}
                    </span>
                  </div>
                </div>

                <p className="text-center mt-8 text-gray-300 text-lg">
                  Nhấn vào ảnh để chọn làm nền • Dùng nút <ChevronLeft className="inline mx-1" size={20} /> <ChevronRight className="inline mx-1" size={20} /> để chuyển
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}