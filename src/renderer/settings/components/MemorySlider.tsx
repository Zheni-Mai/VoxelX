// src/renderer/settings/components/MemorySlider.tsx
import React from 'react'

interface MemorySliderProps {
  totalRam: number
  freeRam: number
  allocatedMemory: number 
  onChange: (value: number) => void
}

export default function MemorySlider({
  totalRam,
  freeRam,
  allocatedMemory,
  onChange,
}: MemorySliderProps) {
  const totalGB = Number((totalRam / 1024).toFixed(1))
  const freeGB = Number((freeRam / 1024).toFixed(1))
  const usedGB = Number((totalGB - freeGB).toFixed(1))
  const usedPercent = Math.round(((totalRam - freeRam) / totalRam) * 100)

  const minMemory = 2048
  const maxMemory = Math.floor(totalRam * 0.85)
  const value = Math.max(minMemory, Math.min(maxMemory, allocatedMemory))

  const systemRamGradient = `linear-gradient(to right, 
    #10b981 0%, 
    #10b981 ${usedPercent}%, 
    #374151 ${usedPercent}%, 
    #374151 100%)`

  return (
    <div className="space-y-6">
      <div className="bg-black/50 rounded-2xl p-6 border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold text-gray-200">RAM hệ thống</span>
          <span className="text-2xl font-bold text-cyan-400">{totalGB} GB</span>
        </div>

        <div className="relative h-10 bg-gray-800 rounded-xl overflow-hidden">
          <div
            className="absolute inset-0 transition-all duration-1000"
            style={{ background: systemRamGradient }}
          />
          <div className="absolute font-mono inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white drop-shadow-lg">
              Đã dùng: {usedGB} GB • Còn trống: {freeGB} GB
            </span>
          </div>
        </div>

        <div className="mt-3 flex justify-between text-xs text-gray-500">
          <span>0 GB</span>
          <span>{usedGB} GB đang dùng</span>
          <span>{totalGB} GB tổng</span>
        </div>
      </div>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="text-xl font-bold text-gray-100">Cấp phát RAM cho Minecraft</h4>
          <span className="text-3xl font-bold text-cyan-400 tabular-nums">
            {value} MB <span className="text-xl text-cyan-300">≈ {(value / 1024).toFixed(1)} GB</span>
          </span>
        </div>

        <div className="relative">
          <label htmlFor="minecraft-ram-slider" className="sr-only">
            Cấp phát RAM cho Minecraft từ {minMemory} MB đến {maxMemory} MB
          </label>

          <input
            id="minecraft-ram-slider"
            type="range"
            min={minMemory}
            max={maxMemory}
            step={512}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-4 bg-gray-800 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
            style={{
              background: `linear-gradient(to right,
                #ef4444 0%,
                #ef4444 15%,
                #f59e0b 15%,
                #f59e0b 50%,
                #10b981 50%,
                #10b981 100%
              )`,
            }}
            aria-valuemin={minMemory}
            aria-valuemax={maxMemory}
            aria-valuenow={value}
            aria-valuetext={`${value} MB (${(value / 1024).toFixed(1)} GB)`}
            aria-label="Cấp phát RAM cho Minecraft"
            title={`RAM cấp phát: ${value} MB`}
          />
          <div className="flex justify-between mt-5 text-xs px-1">
            <div className="text-center -ml-2">
              <div className="text-red-400 font-bold text-sm">Tối thiểu</div>
              <div className="text-red-300">2 GB</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-400 font-bold text-sm">Khuyến nghị</div>
              <div className="text-yellow-300">4–8 GB</div>
            </div>
            <div className="text-center -mr-2">
              <div className="text-green-400 font-bold text-sm">Tối đa</div>
              <div className="text-green-300">{(maxMemory / 1024).toFixed(1)} GB</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="text-center bg-black/40 rounded-xl py-4 border border-red-500/30">
            <p className="text-gray-500 text-sm">Tối thiểu</p>
            <p className="text-2xl font-bold text-red-400">2048 MB</p>
          </div>

          <div className="text-center bg-gradient-to-br from-cyan-600/30 via-cyan-500/20 to-emerald-600/30 rounded-xl py-5 border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/30 transform scale-105">
            <p className="text-gray-300 text-sm">Đang chọn</p>
            <p className="text-5xl font-bold text-cyan-300 tabular-nums leading-none">{value}</p>
            <p className="text-cyan-400 font-semibold text-lg">MB</p>
          </div>

          <div className="text-center bg-black/40 rounded-xl py-4 border border-green-500/30">
            <p className="text-gray-500 text-sm">Tối đa cho phép</p>
            <p className="text-2xl font-bold text-green-400">{maxMemory} MB</p>
          </div>
        </div>
        {value > totalRam * 0.8 && (
          <div className="mt-6 p-5 bg-red-900/30 border border-red-500/50 rounded-xl text-center">
            <p className="text-red-300 font-bold text-lg">
              Cảnh báo: Bạn đang cấp hơn 80% RAM hệ thống!
            </p>
            <p className="text-red-200 text-sm mt-2">
              Có thể gây lag máy, giật, hoặc crash hệ thống khi chơi game khác.
            </p>
          </div>
        )}

        <p className="text-center text-sm text-gray-400 bg-black/30 rounded-lg py-4 px-6 border border-white/5">
          <strong className="text-yellow-400">Mẹo:</strong> Với modpack nặng (300+ mod), hãy dùng{' '}
          <strong className="text-yellow-300">8192 MB (8 GB)</strong> trở lên để chơi mượt.
        </p>
      </div>
    </div>
  )
}