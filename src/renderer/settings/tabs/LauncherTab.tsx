// src/renderer/settings/tabs/LauncherTab.tsx

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Languages, Type, Sparkles } from 'lucide-react';
import { MotionDiv } from '../../utils/motion'

interface LauncherSettings {
  language: 'vi' | 'en';
  animationsEnabled: boolean;
}

interface LauncherTabProps {
  settings?: LauncherSettings;
  update: <K extends keyof LauncherSettings>(key: K, value: LauncherSettings[K]) => void;
}

const defaultLauncherSettings: LauncherSettings = {
  language: 'vi',
  animationsEnabled: true,
};

const languages = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
];


const fonts = [
  { value: 'sans-serif', label: 'Sans Serif (Mặc định)', tailwind: 'font-sans' },
  { value: 'monospace', label: 'Monospace', tailwind: 'font-mono' },
  { value: 'serif', label: 'Serif', tailwind: 'font-serif' },
  { value: '"Inter", sans-serif', label: 'Inter', tailwind: 'font-sans' },
  { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono', tailwind: 'font-mono' },
  { value: '"Poppins", sans-serif', label: 'Poppins', tailwind: 'font-sans' },
  { value: '"Roboto", sans-serif', label: 'Roboto', tailwind: 'font-sans' },
];

  export default function LauncherTab({ settings, update }: LauncherTabProps) {
    const [localSettings, setLocalSettings] = useState<LauncherSettings>(
      settings ?? defaultLauncherSettings
    );
    useEffect(() => {
      if (settings) {
        setLocalSettings(settings);
      }
    }, [settings]);

    const handleChange = <K extends keyof LauncherSettings>(
    key: K,
    value: LauncherSettings[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    update(key, value);

  };

  if (!localSettings) {
    return <div className="text-gray-500">Đang tải cài đặt...</div>;
  }

  return (
    <div className="space-y-12">
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <h3 className="text-2xl font-bold text-cyan-400 flex items-center gap-3">
          <Sparkles size={28} />
          Cài đặt Launcher
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-lg font-medium text-gray-300">
            <Languages size={22} className="text-cyan-400" />
            Ngôn ngữ
          </label>
          <select
            value={localSettings.language}
            onChange={(e) => handleChange('language', e.target.value as 'vi' | 'en')}
            className="w-full max-w-md px-5 py-3 bg-black/50 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-2">
            Thay đổi ngôn ngữ sẽ áp dụng sau khi khởi động lại launcher.
          </p>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-lg font-medium text-gray-300">
            <Sparkles size={22} className="text-cyan-400" />
            Hiệu ứng hoạt ảnh
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleChange('animationsEnabled', !localSettings.animationsEnabled)}
              className={`relative w-16 h-9 rounded-full transition-all ${
                localSettings.animationsEnabled
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                  : 'bg-gray-700'
              }`}
            >
              <motion.div
                className="absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-lg"
                animate={{
                  x: localSettings.animationsEnabled ? 28 : 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className="text-white font-medium">
              {localSettings.animationsEnabled ? 'Bật' : 'Tắt'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Tắt hiệu ứng để tăng hiệu suất trên máy cấu hình thấp.
          </p>
        </div>
      </MotionDiv>
    </div>
  );
}