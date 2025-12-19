// src/renderer/settings/SettingsPanel.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gamepad2, Globe, HardDrive, Bell, Shield, Save, RefreshCw, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { presetThemes } from '../themes'
import GameTab from './tabs/GameTab'
import GeneralTab from './tabs/GeneralTab'
import StorageTab from './tabs/StorageTab'
import PrivacyTab from './tabs/PrivacyTab'
import { playSound } from '../utils/playSound'
import UpdaterTab from './tabs/UpdaterTab'
import LauncherTab from './tabs/LauncherTab';
import { MotionDiv } from '../utils/motion'

interface Settings {
  game: {
    allocatedMemory: number
    width: number
    height: number
    fullscreen: boolean
    lockAspectRatio: boolean
    launcherVisibility: 'hide' | 'keep-open'
  }
  general: {
    theme: 'dark' | 'light'
    language: 'vi' | 'en'
  }
  storage: {
    gameDirectory: string
  }
  notifications: {
    launchSuccess: boolean
    updateAvailable: boolean
  }
  privacy: {
    sendAnalytics: boolean
  }
  updater: {
    autoCheckOnStartup: boolean  
  }
  launcher: {
    language: 'vi' | 'en';
    animationsEnabled: boolean;
  };
}

const defaultSettings: Settings = {
  game: {
    allocatedMemory: 4096,
    width: 854,
    height: 480,
    fullscreen: false,
    lockAspectRatio: true,
    launcherVisibility: 'hide'
  },
  general: { theme: 'dark', language: 'vi' },
  storage: { gameDirectory: '' },
  notifications: { launchSuccess: true, updateAvailable: true },
  privacy: { sendAnalytics: false },
  updater: {
    autoCheckOnStartup: true 
  },
  launcher: {
    language: 'vi',
    animationsEnabled: true,
  },
}

type Tab = 'game' | 'general' | 'launcher' | 'updater' | 'storage' | 'privacy'

const tabs = [
  { id: 'game', label: 'Game Settings', icon: Gamepad2 },
  { id: 'general', label: 'Giao diện', icon: Globe },
  { id: 'launcher', label: 'Launcher', icon: Sparkles },
  { id: 'updater', label: 'Cập nhật', icon: RefreshCw },
  { id: 'storage', label: 'Lưu trữ', icon: HardDrive },
  { id: 'privacy', label: 'Quyền riêng tư', icon: Shield },
] as const;

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsPanel({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('game')
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [freeRam, setFreeRam] = useState(0)
  const [totalRam, setTotalRam] = useState(0)

  const [currentTheme, setCurrentTheme] = useState({
    name: 'Dark',
    background: { type: 'gradient' } as { type: 'gradient' | 'color' | 'image'; color?: string; image?: string },
    accentColor: '#06b6d4',
  })

  const applyPresetTheme = (theme: typeof presetThemes[number]) => {
    setCurrentTheme(theme)

    window.dispatchEvent(new CustomEvent('theme-updated', { detail: theme }))
  }
  useEffect(() => {
    if (!isOpen) return

    const loadTheme = async () => {
      try {
        const saved = await window.electronAPI.themeAPI.loadTheme()
        if (saved) {
          setCurrentTheme(saved)
          applyThemeToDOM(saved)
        }
      } catch (err) {
        console.log('Dùng theme mặc định')
      }
    }

    loadTheme()
  }, [isOpen])

  const applyThemeToDOM = (theme: typeof currentTheme) => {
    document.documentElement.style.setProperty('--accent-color', theme.accentColor)

    if (theme.background.type === 'gradient') {
      document.body.style.background = 'linear-gradient(135deg, #0f172a, #1e293b)'
    } else if (theme.background.type === 'color') {
      document.body.style.background = theme.background.color || '#0f172a'
    } else if (theme.background.type === 'image' && theme.background.image) {
      document.body.style.background = `url('file://${theme.background.image}') center/cover no-repeat fixed`
    }
  }

  const saveTheme = async () => {
    try {
      await window.electronAPI.themeAPI.saveTheme(currentTheme)
      window.dispatchEvent(new CustomEvent('theme-updated', { detail: currentTheme }))
      window.toast.success('Đã lưu ảnh nền thành công!', 'Thành công')
      playSound('success')
      
    } catch (err) {
      window.toast.error('Lỗi khi lưu theme!', 'Lỗi')
    }
  }

  

  useEffect(() => {
    if (!isOpen) return

    let intervalId: NodeJS.Timeout | null = null

    const load = async () => {
        try {
        const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
        const settingsPath = `${appDataPath}/settings/settings.json`

        await window.electronAPI.fileAPI.ensureDir(`${appDataPath}/settings`)

        const data = await window.electronAPI.fileAPI.readFile(settingsPath)
        if (data !== null) {
        try {
            const saved = JSON.parse(data)
            setSettings(prev => ({ ...prev, ...saved }))
        } catch (e) {
            console.error('File settings bị lỗi định dạng, dùng mặc định')
        }
        } else {
        console.log('Chưa có file settings → dùng cài đặt mặc định')
        }
        updateRam()
        } catch (err) {
        console.error('Lỗi load settings:', err)
        }
    }

    const updateRam = async () => {
        try {
        const ram = await window.electronAPI.getSystemRam()
        if (ram) {
            setTotalRam(Math.floor(ram.total / 1024 / 1024))
            setFreeRam(Math.floor(ram.free / 1024 / 1024))
        }
        } catch (err) {
        console.error('Lỗi lấy RAM:', err)
        }
    }
    load()
    intervalId = setInterval(updateRam, 3000)
    return () => {
        if (intervalId) clearInterval(intervalId)
    }
    }, [isOpen])

  const save = async () => {
    try {
        const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
        const dir = `${appDataPath}/settings`
        await window.electronAPI.fileAPI.writeFile(dir, 'settings.json', JSON.stringify(settings, null, 2))
        window.toast.success('Đã lưu cài đặt thành công!', 'Thành công')
        playSound('success')
        window.dispatchEvent(new CustomEvent('settings-updated', { 
        detail: settings 
      }))
    } catch (err) {
        console.error('Lỗi lưu cài đặt:', err)
        window.toast.error('Lỗi lưu cài đặt!', 'Lỗi')
    }
  }

  const update = <T extends keyof Settings, K extends keyof Settings[T]>(
    cat: T,
    key: K,
    val: Settings[T][K]
  ) => {
    setSettings(p => ({ ...p, [cat]: { ...p[cat], [key]: val } }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-sm z-50"
            aria-hidden="true"
          />

          <MotionDiv
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed right-0 top-12 h-[calc(100vh-3rem)] w-full max-w-6xl 
                      bg-black/70 backdrop-blur-1xl border border-white/20 
                      rounded-3xl rounded-r-none overflow-hidden shadow-2xl z-50 flex 
                      font-mono text-white"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
          
            <div className="w-80 bg-black/50 border-r border-white/10 flex flex-col font-mono">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 id="settings-title" className="text-2xl font-bold text-cyan-400">Cài đặt</h2>
                <button
                  onClick={onClose}
                  aria-label="Đóng cài đặt"
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all text-left ${
                        active
                          ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-400 text-cyan-300 shadow-lg'
                          : 'hover:bg-white/10 text-gray-400'
                      }`}
                    >
                      <Icon size={22} aria-hidden="true" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="p-6 border-t border-white/10">
                <button
                  onClick={save}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl font-bold hover:scale-105 transition flex items-center justify-center gap-2"
                  aria-label="Lưu tất cả cài đặt"
                >
                  <Save size={20} aria-hidden="true" /> Lưu cài đặt
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10">
              <AnimatePresence mode="wait">
                
                {activeTab === 'game' && (
                  <MotionDiv
                    key="game"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-12"
                  >
                    <GameTab
                      settings={settings.game}
                      totalRam={totalRam}
                      freeRam={freeRam}
                      update={(key, value) => update('game', key, value)}
                    />
                  </MotionDiv>
                )}

                {activeTab === 'general' && (
                  <MotionDiv
                    key="game"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-12"
                  >
                    <GeneralTab
                      currentTheme={currentTheme}
                      setCurrentTheme={setCurrentTheme}
                      applyPresetTheme={applyPresetTheme}
                      saveTheme={saveTheme}
                    />
                  </MotionDiv>
                )}

                {activeTab === 'launcher' && (
                  <MotionDiv
                    key="launcher"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-12"
                  >
                    <LauncherTab
                      settings={settings.launcher}
                      update={(key, value) => update('launcher', key, value)}
                    />
                  </MotionDiv>
                )}

                {activeTab === 'updater' && (
                  <MotionDiv
                    key="updater"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-12"
                  >
                    <UpdaterTab
                      settings={settings.updater}
                      update={(key, value) => update('updater', key, value)}
                    />
                  </MotionDiv>
                )}

                {activeTab === 'storage' && (
                  <MotionDiv
                    key="game"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-12"
                  >
                    <StorageTab
                      gameDirectory={settings.storage.gameDirectory}
                      onDirectoryChange={(dir) => update('storage', 'gameDirectory', dir)}
                    />
                  </MotionDiv>
                )}

                {activeTab === 'privacy' && (
                  <MotionDiv
                    key="game"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-12"
                  >
                    <PrivacyTab
                      settings={settings.privacy}
                      update={(key, value) => update('privacy', key, value)}
                    />
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  )
}