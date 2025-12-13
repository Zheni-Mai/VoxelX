// src/renderer/settings/components/DriveList.tsx
import React, { useState, useEffect } from 'react'

interface Drive {
  mountpoint: string
  description: string
  total: number
  used: number
  free: number
  percent: number
}

export default function DriveList() {
  const [drives, setDrives] = useState<Drive[]>([])

  const loadDrives = async () => {
    try {
      const drives = await window.electronAPI.getDrives()
      setDrives(drives || [])
    } catch (err) {
      console.error('Lỗi lấy thông tin ổ đĩa:', err)
    }
  }

  useEffect(() => {
    loadDrives()
    const id = setInterval(loadDrives, 5000)
    return () => clearInterval(id)
  }, [])

  const getColor = (percent: number): string => {
    if (percent < 70) return 'from-green-500 to-emerald-500'
    if (percent < 90) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-rose-600'
  }

  if (drives.length === 0) {
    return <p className="text-gray-500 text-center py-10">Đang tải thông tin ổ đĩa...</p>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {drives.map((drive) => {
        const totalGB = (drive.total / 1024 / 1024 / 1024).toFixed(1)
        const usedGB = (drive.used / 1024 / 1024 / 1024).toFixed(1)
        const freeGB = (drive.free / 1024 / 1024 / 1024).toFixed(1)

        return (
          <div
            key={drive.mountpoint}
            className="bg-black/50 rounded-2xl p-6 border border-white/10 hover:border-white/30 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xl text-white">{drive.description}</h4>
                <p className="text-sm text-cyan-400 font-mono">{drive.mountpoint}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl text-cyan-300">{totalGB} GB</p>
                <p className="text-xs text-gray-500">Tổng dung lượng</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative h-10 bg-gray-800 rounded-xl overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getColor(drive.percent)} transition-all duration-1000`}
                  style={{ width: `${drive.percent}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white drop-shadow-lg">
                    {drive.percent}% đã sử dụng
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Đã dùng</p>
                  <p className="text-lg text-red-300">{usedGB} GB</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Còn trống</p>
                  <p className="text-lg text-green-300">{freeGB} GB</p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}