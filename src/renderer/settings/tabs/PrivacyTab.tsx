// src/renderer/settings/tabs/PrivacyTab.tsx
import React from 'react'

interface PrivacySettings {
  sendAnalytics: boolean
}

interface PrivacyTabProps {
  settings: PrivacySettings
  update: (key: keyof PrivacySettings, value: boolean) => void
}

export default function PrivacyTab({ settings, update }: PrivacyTabProps) {
  return (
    <div className="space-y-8">
      <label className="flex items-center justify-between text-lg cursor-pointer">
        <span>Gửi dữ liệu sử dụng ẩn danh để cải thiện launcher</span>
        <input
          type="checkbox"
          checked={settings.sendAnalytics}
          onChange={(e) => update('sendAnalytics', e.target.checked)}
          className="w-6 h-6 text-cyan-400 rounded focus:ring-cyan-400"
          aria-label="Bật gửi dữ liệu ẩn danh"
        />
      </label>

      <p className="text-sm text-gray-500 leading-relaxed">
        Không bao giờ thu thập thông tin cá nhân. Chỉ gửi số liệu chung về hiệu suất sử dụng (ví dụ: phiên bản launcher, thời gian khởi động, lỗi crash, v.v.) để giúp chúng tôi cải thiện trải nghiệm cho mọi người.
      </p>
    </div>
  )
}