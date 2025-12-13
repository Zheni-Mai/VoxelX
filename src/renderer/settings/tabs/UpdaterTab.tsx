// src/renderer/settings/tabs/UpdaterTab.tsx
import React from 'react'
import { RefreshCw } from 'lucide-react'

interface UpdaterSettings {
  autoCheckOnStartup: boolean
}

interface UpdaterTabProps {
  settings: UpdaterSettings
  update: (key: 'autoCheckOnStartup', value: boolean) => void
}

export default function UpdaterTab({ settings, update }: UpdaterTabProps) {
  const handleChange = (value: boolean) => {
    update('autoCheckOnStartup', value)
  }

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-cyan-400 flex items-center gap-3">
          <RefreshCw size={24} />
          Chế độ cập nhật launcher
        </h3>

        <div className="space-y-4 mt-8">
          <label className="flex items-center justify-between text-lg cursor-pointer p-4 rounded-xl hover:bg-white/5 transition">
            <div>
              <p className="font-medium text-white">Tự động cập nhật khi khởi động</p>
              <p className="text-sm text-gray-400 mt-1">Launcher sẽ tự kiểm tra và tải bản mới ngay khi mở</p>
            </div>
            <input
              type="radio"
              name="update-mode"
              checked={settings.autoCheckOnStartup}
              onChange={() => handleChange(true)}
              className="w-6 h-6 text-cyan-400 focus:ring-cyan-400"
            />
          </label>

          <label className="flex items-center justify-between text-lg cursor-pointer p-4 rounded-xl hover:bg-white/5 transition">
            <div>
              <p className="font-medium text-white">Cập nhật thủ công</p>
              <p className="text-sm text-gray-400 mt-1">Không tự động kiểm tra. Bạn tự bấm "Cập nhật" trong instance</p>
            </div>
            <input
              type="radio"
              name="update-mode"
              checked={!settings.autoCheckOnStartup}
              onChange={() => handleChange(false)}
              className="w-6 h-6 text-emerald-400 focus:ring-emerald-400"
            />
          </label>
        </div>

        <div className="mt-8 p-5 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/30 rounded-xl">
          <p className="text-sm text-cyan-300">
            {settings.autoCheckOnStartup
              ? 'Hiện tại: Launcher sẽ tự động kiểm tra cập nhật mỗi khi khởi động'
              : 'Hiện tại: Đã tắt tự động cập nhật. Bạn có thể kiểm tra thủ công từ khay hệ thống → Cập nhật'}
          </p>
        </div>
      </div>
    </div>
  )
}