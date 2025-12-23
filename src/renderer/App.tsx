//app.tsx
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import PlayerHead from './components/PlayerHead'
import Logo from '@/assets/icons/logo.png'
import UpdateSound from '@/assets/sounds/update.mp3'
import { useTheme, type Theme } from './hooks/useTheme'
import InstancesModal from './components/InstancesModal'
import LaunchModal from './components/LaunchModal'
import ExportProgressToast from './components/ExportProgressToast'
import SplashScreen from './SplashScreen'
import ModsListModal from './launcher/modals/ModsListModal'
import SettingProfileModal from './launcher/modals/SettingsProfileModal'
import type { Profile } from '../main/types/profile'
import ToastContainer from './components/ToastContainer'
import { useToast } from './hooks/useToast'
import WelcomeCarouselModal from './components/WelcomeCarouselModal'
import MusicPlayerBar from './components/MusicPlayerBar'
import AboutPage from './about/AboutPage'
import Sidebar from './components/Sidebar';
import { AnimationProvider } from './context/AnimationContext'
import { MotionDiv } from './utils/motion'
import CreateProfileModal from './launcher/modals/CreateProfileModal'
import ImportModpackModal from './launcher/modals/ImportModpackModal'
import UniversalBrowserModal from './launcher/modals/ResourceBrowserModal'
import RoomModal from './components/RoomModal';

import { 
  Home, 
  Gamepad2,
  Settings, 
  Info,
  LogOut,
  Folder
} from 'lucide-react'
import ProfilesPage from './launcher/ProfilesPage'
import AccountsPanel from './accounts/AccountsPanel'
import ChangelogPage from './changelog/ChangelogPage'
import { Account } from '../main/types/account'
import SettingsPanel from './settings/SettingsPanel'
import LogConsole from './LogConsole'
import UpdateScreen from './UpdateScreen'
import MusicPlaylistModal from './components/MusicPlaylistModal'
import ResourceManagerModal from './launcher/modals/ResourceManagerModal'

type Page = 'home' | 'profile' | 'settings' | 'about'

const sounds = {
  update: new Audio(UpdateSound)
  //success: new Audio(SuccessSound),
  //error: new Audio(ErrorSound),
  //login: new Audio(LoginSound),
}

Object.values(sounds).forEach(sound => {
  sound.volume = 0.4
})


export default function App() {
  const { theme } = useTheme()
  const [activePage, setActivePage] = useState<Page>('home')
  const [hovered, setHovered] = useState<string | null>(null)
  const [showAccounts, setShowAccounts] = useState(false)
  const [currentPlayer, setCurrentPlayer] = useState<Account | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showInstances, setShowInstances] = useState(false)
  const [activeTab, setActiveTab] = useState<'instances' | 'updates'>('instances')
  const [onlineCount, setOnlineCount] = useState<string>('...')
  const [isLoadingOnline, setIsLoadingOnline] = useState(true)
  const [skinVersion, setSkinVersion] = useState(0)
  const [profilesVersion, setProfilesVersion] = useState(0)
  const [modsModalProfile, setModsModalProfile] = useState<any>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [appDataPath, setAppDataPath] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const { success, error, warning, info, toasts, removeToast } = useToast()
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [currentLauncherVersion, setCurrentLauncherVersion] = useState('0.0.11')
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [showMusicPlaylist, setShowMusicPlaylist] = useState(false)
  const [musicTracks, setMusicTracks] = useState<any[]>([])
  const [currentMusicTrack, setCurrentMusicTrack] = useState<any>(null)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [isResourceManagerOpen, setIsResourceManagerOpen] = useState(false)
  const [resourceManagerProfile, setResourceManagerProfile] = useState<Profile | null>(null)
  const [createProfileOpen, setCreateProfileOpen] = useState(false)
  const [importModpackOpen, setImportModpackOpen] = useState(false)
  const [universalBrowserOpen, setUniversalBrowserOpen] = useState(false)
  const [roomModalOpen, setRoomModalOpen] = useState(false);

  const urlParams = new URLSearchParams(window.location.search)
  const isSplash = urlParams.get('mode') === 'splash'
  const isLog = urlParams.get('mode') === 'log'
  const isUpdate = urlParams.get('mode') === 'update'
 
  if (isSplash) {
    return <SplashScreen onReady={() => {
      window.electronAPI.ipcRenderer.send('splash-ready')
    }} />
  }

  if (isLog) {
    return <LogConsole/>
  }  

  if (isUpdate) {
    return <UpdateScreen/>
  } 

  const handleSkinChange = () => {
    setSkinVersion(prev => prev + 1)
  }

  const handleProfileCreated = () => {
    setProfilesVersion(prev => prev + 1)
  }

  useEffect(() => {
    const handleOpenLanModal = () => setRoomModalOpen(true);
    window.addEventListener('open-lan-play-modal', handleOpenLanModal);
    return () => window.removeEventListener('open-lan-play-modal', handleOpenLanModal);
  }, []);

  useEffect(() => {
    const handleOpenCreateProfile = () => {
      setCreateProfileOpen(true)
    }

    window.addEventListener('open-create-profile-modal', handleOpenCreateProfile)
    return () => window.removeEventListener('open-create-profile-modal', handleOpenCreateProfile)
  }, [])

  useEffect(() => {
    const handleOpenImport = () => setImportModpackOpen(true)
    const handleOpenUniversal = () => setUniversalBrowserOpen(true)

    window.addEventListener('open-import-modpack-modal', handleOpenImport)
    window.addEventListener('open-universal-browser-modal', handleOpenUniversal)

    return () => {
      window.removeEventListener('open-import-modpack-modal', handleOpenImport)
      window.removeEventListener('open-universal-browser-modal', handleOpenUniversal)
    }
  }, [])
  
  useEffect(() => {
    const handleOpenResourceManager = (e: Event) => {
      const event = e as CustomEvent
      setResourceManagerProfile(event.detail.profile)
      setIsResourceManagerOpen(true)
    }

    window.addEventListener('open-resource-manager-modal', handleOpenResourceManager)

    return () => {
      window.removeEventListener('open-resource-manager-modal', handleOpenResourceManager)
    }
  }, [])

  useEffect(() => {
    const handleOpenPlaylist = () => {
      setShowMusicPlaylist(true)
    }

    window.addEventListener('open-music-playlist', handleOpenPlaylist)

    return () => {
      window.removeEventListener('open-music-playlist', handleOpenPlaylist)
    }
  }, [])

  useEffect(() => {
    const updateMusicState = (e: Event) => {
      const event = e as CustomEvent
      setMusicTracks(event.detail.tracks || [])
      setCurrentMusicTrack(event.detail.currentTrack || null)
      setIsMusicPlaying(event.detail.isPlaying || false)
    }

    window.addEventListener('music-state-update', updateMusicState)

    return () => window.removeEventListener('music-state-update', updateMusicState)
  }, [])

  useEffect(() => {
    const unsubscribe = window.electronAPI.onToast((toast) => {
      success(toast.message, toast.title)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const version = await window.electronAPI.getAppVersion()
        setCurrentLauncherVersion(version)
      } catch (err) {
        console.error('Lỗi lấy phiên bản:', err)
        setCurrentLauncherVersion('Unknown')
      }
    }

    loadVersion()
  }, [])

  useEffect(() => {
    const unsubscribe = window.electronAPI.on('play-sound', (soundName: string) => {
      const audio = sounds[soundName as keyof typeof sounds]
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(() => console.log('Không phát được âm thanh:', soundName))
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.toast = { success, error, warning, info }
    }
  }, [success, error, warning, info])
  
  useEffect(() => {
    const handleOpenEditProfileModal = (e: Event) => {
      const customEvent = e as CustomEvent
      const profileToEdit = customEvent.detail.profile
      setEditingProfile(profileToEdit)
      setEditModalOpen(true)
    }

    window.addEventListener('open-edit-profile-modal', handleOpenEditProfileModal)

    return () => {
      window.removeEventListener('open-edit-profile-modal', handleOpenEditProfileModal)
    }
  }, [])
  
  useEffect(() => {
    const initCurrentPlayer = async () => {
      try {
        const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
        const accounts: Account[] = await window.electronAPI.accountAPI.getAccounts(appDataPath)

        if (!accounts || accounts.length === 0) {
          console.log('Chưa có tài khoản nào')
          setCurrentPlayer(null)
          window.electronAPI.ipcRenderer.send('online-tracking:update-username', 'Player')
          return
        }
        const sorted = [...accounts].sort((a, b) => 
          (b.lastUsed || 0) - (a.lastUsed || 0)
        )
        const lastUsedAccount = sorted[0]
        setCurrentPlayer(lastUsedAccount)
        window.electronAPI.ipcRenderer.send('online-tracking:update-username', lastUsedAccount.name)

        console.log('Tự động đăng nhập:', lastUsedAccount.name)
      } catch (err) {
        console.error('Lỗi khi tự động load tài khoản:', err)
        setCurrentPlayer(null)
        window.electronAPI.ipcRenderer.send('online-tracking:update-username', 'Player')
      }
    }

    initCurrentPlayer()
  }, [])

  useEffect(() => {
    const handleOpenModsModal = (e: Event) => {
      const customEvent = e as CustomEvent
      setModsModalProfile(customEvent.detail.profile)
    }

    window.addEventListener('open-mods-modal', handleOpenModsModal)

    return () => {
      window.removeEventListener('open-mods-modal', handleOpenModsModal)
    }
  }, [])

  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        setIsLoadingOnline(true)
        const count = await window.electronAPI.getOnlineCount()
        setOnlineCount(count)
      } catch (err) {
        console.warn('Không lấy được số người online:', err)
        setOnlineCount('Offline')
      } finally {
        setIsLoadingOnline(false)
      }
    }

    fetchOnlineCount()
    const interval = setInterval(fetchOnlineCount, 45_000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const initCurrentPlayer = async () => {
      try {
        const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
        const accounts: Account[] = await window.electronAPI.accountAPI.getAccounts(appDataPath)

        if (!accounts || accounts.length === 0) {
          console.log('Chưa có tài khoản nào')
          setCurrentPlayer(null)
          return
        }
        const sorted = [...accounts].sort((a, b) => 
          (b.lastUsed || 0) - (a.lastUsed || 0)
        )

        const lastUsedAccount = sorted[0]
        setCurrentPlayer(lastUsedAccount)

        console.log('Tự động đăng nhập:', lastUsedAccount.name, `(lastUsed: ${new Date(lastUsedAccount.lastUsed!).toLocaleString()})`)
      } catch (err) {
        console.error('Lỗi khi tự động load tài khoản:', err)
        setCurrentPlayer(null)
      }
    }

    initCurrentPlayer()
  }, [])

  useEffect(() => {
    const checkWelcomeModal = async () => {
      try {
        const version = await window.electronAPI.getAppVersion()
        setCurrentLauncherVersion(version)

        const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
        const seenFile = `${appDataPath}/welcome_seen.json`

        try {
          const data = await window.electronAPI.fileAPI.readFile(seenFile)
          if (data) {
            const seen = JSON.parse(data)
            if (seen.version === version) {
              return
            }
          }
        } catch {
        }
        setTimeout(() => {
          setShowWelcomeModal(true)
        }, 2000)
      } catch (err) {
        console.error('Lỗi kiểm tra welcome modal:', err)
      }
    }
    if (!isSplash && !isLog && !isUpdate) {
      checkWelcomeModal()
    }
  }, [isSplash, isLog, isUpdate])

  useEffect(() => {
    const loadAnimationSetting = async () => {
      try {
        const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
        const settingsPath = `${appDataPath}/settings/settings.json`
        
        const data = await window.electronAPI.fileAPI.readFile(settingsPath)
        if (data) {
          const saved = JSON.parse(data)
          if (saved.launcher?.animationsEnabled !== undefined) {
            setAnimationsEnabled(saved.launcher.animationsEnabled)
          }
        }
      } catch (err) {
        console.log('Không load được animation setting, dùng mặc định')
      }
    }

    loadAnimationSetting()

    const handleSettingsUpdate = (e: Event) => {
      const event = e as CustomEvent
      if (event.detail?.launcher?.animationsEnabled !== undefined) {
        setAnimationsEnabled(event.detail.launcher.animationsEnabled)
      }
    }

    window.addEventListener('settings-updated', handleSettingsUpdate)
    return () => window.removeEventListener('settings-updated', handleSettingsUpdate)
  }, [])

  useEffect(() => {
    const handler = () => {
      window.toast.success('Ảnh đã được copy tự động khi nhấn F2!')
    }
    window.electronAPI.on('screenshot-copied', handler)
    return () => window.electronAPI.off('screenshot-copied', handler)
  }, [])

  const v = window.electronAPI.versions

  const renderContent = () => {
    if (activePage === 'home') {
      return <ChangelogPage currentAccount={currentPlayer} skinVersion={skinVersion} />
    }
    if (activePage === 'profile') {
      return <ProfilesPage key={profilesVersion} />
      //<ProfilesPage profilesVersion={profilesVersion} />
    }
    if (activePage === 'about') {
      return <AboutPage />
    }
    return null
  }

  return (

    <AnimationProvider animationsEnabled={animationsEnabled}>
<>
    <div 
      className="fixed inset-0 -z-50"
      style={{
        background: theme.background.type === 'image' && theme.background.image
          ? `url('${theme.background.image}') center/cover no-repeat fixed`
          : theme.background.type === 'color' && theme.background.color
          ? theme.background.color
          : 'linear-gradient(135deg, #0f172a, #1e293b)'
      }}
    />
    {theme.background.type === 'image' && (
      <div className="fixed inset-0 -z-40 bg-black/60" />
    )}

    <div className="relative h-screen w-screen overflow-hidden text-white flex flex-col select-none">

      {theme.backgroundClass === 'sunset-animated' && (
        <div className="clouds" />
      )}

      {theme.backgroundClass === 'ocean-abyss' && (
        <>
          <div className="deep-glow" />
          <div className="water-flow" />
        </>
      )}
      
        <div  
          className="fixed inset-x-0 top-0 h-11 bg-black/70 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-4 z-50 select-none"
          style={{ ["WebkitAppRegion"]: "drag" } as React.CSSProperties}>
          <div className="flex items-center gap-3">
            <img src={Logo} alt="VoxelX" className="w-7 h-7 rounded-lg" />
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-white">VoxelX</h1>
              <div className="flex items-center gap-2 text-[10px] text-white -mt-0.5">
                <span>Next Gen Voxel Engine Launcher</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                {isLoadingOnline ? (
                  <span className="animate-pulse text-emerald-400 text-xs font-medium">Đang tải...</span>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400 font-medium text-xs">{onlineCount}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-gray-400 uppercase tracking-wider">
            {activePage === 'home' && 'Dashboard'}
            {activePage === 'profile' && 'Profiles'}
            {activePage === 'settings' && 'Settings'}
            {activePage === 'about' && 'About'}
          </div>
          <div className="flex items-center gap-2" style={{ ["WebkitAppRegion"]: "no-drag" } as React.CSSProperties}>

            <MusicPlayerBar />
            <button
              onClick={() => setShowAccounts(true)}
              className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-white/10 transition-all group"
            >
              <div className="relative">
                {currentPlayer ? (
                  <PlayerHead username={currentPlayer.name} uuid={currentPlayer.uuid} size={32} className="rounded-lg" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                    <span className="text-xs">G</span>
                  </div>
                )}
                {currentPlayer && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-black animate-pulse" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{currentPlayer?.name || 'Guest'}</p>
                <p className="text-[10px] text-gray-500">
                  {currentPlayer?.type === 'microsoft' ? 'Microsoft' : 'Offline'}
                </p>
              </div>
            </button>
            <button
              onClick={() => setShowInstances(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/10 transition-all group mr-4"
              title="Quản lý Instance & Cập nhật"
            >
              <Gamepad2 size={20} className="text-gray-400 group-hover:text-cyan-400 transition" />
              <span className="text-sm font-medium">Instances</span>
            </button>

            <div className="flex items-center ml-4">
              <button
                onClick={() => window.electronAPI.windowAPI.minimize()}
                className="w-10 h-9 hover:bg-white/10 rounded transition flex items-center justify-center"
                title="Thu nhỏ"
              >
                <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 14H4v-2h16v2z" />
                </svg>
              </button>
              
              <button
                onClick={() => window.electronAPI.windowAPI.close()}
                className="w-10 h-9 hover:bg-red-500/80 rounded transition flex items-center justify-center"
                title="Đóng"
              >
                <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          setShowSettings={setShowSettings}
          hovered={hovered}
          setHovered={setHovered}
          currentLauncherVersion={currentLauncherVersion}
        />
        <div className="fixed inset-0 top-11 left-20 right-0 overflow-y-auto scrollbar-hide">
          <div className="min-h-full">
            <AnimatePresence mode="wait">
              <MotionDiv
                key={activePage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25 }}
              >
                {renderContent()}
              </MotionDiv>
            </AnimatePresence>
          </div>
        </div>
      <AccountsPanel
        isOpen={showAccounts}
        onClose={() => setShowAccounts(false)}
        currentPlayer={currentPlayer}
        setCurrentPlayer={setCurrentPlayer}
      />
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false)
        }}
      />
      <InstancesModal
        isOpen={showInstances}
        onClose={() => setShowInstances(false)}
      />
      <ExportProgressToast />
      <ToastContainer 
        toasts={toasts} 
        removeToast={removeToast} 
      />
      <LaunchModal />
      <WelcomeCarouselModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        currentVersion={currentLauncherVersion}
      />
      <ModsListModal
        isOpen={!!modsModalProfile}
        onClose={() => setModsModalProfile(null)}
        profile={modsModalProfile}
      />

      {isResourceManagerOpen && resourceManagerProfile && (
        <ResourceManagerModal
          isOpen={isResourceManagerOpen}
          onClose={() => setIsResourceManagerOpen(false)}
          profile={resourceManagerProfile}
        />
      )}

      <CreateProfileModal 
        isOpen={createProfileOpen} 
        onClose={() => setCreateProfileOpen(false)}
        onCreate={async () => {
          // Reload profiles sau khi tạo xong
          try {
            const path = await window.electronAPI.profileAPI.getAppDataPath()
            const updated = await window.electronAPI.profileAPI.listProfiles(path)
            setProfiles(updated) // nếu bạn có state profiles ở App
          } catch (err) {
            console.error('Lỗi reload profiles sau tạo:', err)
          }
        }}
      />

      <ImportModpackModal 
        isOpen={importModpackOpen} 
        onClose={() => setImportModpackOpen(false)} 
      />

      {universalBrowserOpen && (
        <UniversalBrowserModal
          isOpen={universalBrowserOpen}
          onClose={() => setUniversalBrowserOpen(false)}
          profiles={profiles}
          currentProfile={profiles.find(p => p.isDefault)?.name}
        />
      )}

      <MusicPlaylistModal
        isOpen={showMusicPlaylist}
        onClose={() => setShowMusicPlaylist(false)}
        tracks={musicTracks}
        currentTrack={currentMusicTrack}
        isPlaying={isMusicPlaying}
        onPlayTrack={(track) => {
          window.dispatchEvent(new CustomEvent('music-play-track', { detail: track }))
        }}
        onAddMusic={() => {
          window.dispatchEvent(new CustomEvent('music-add'))
        }}
        onDeleteTrack={async (track) => {
          window.dispatchEvent(new CustomEvent('music-delete-track', { detail: track }))
        }}
      />
      {roomModalOpen && (
        <RoomModal
          open={roomModalOpen}
          onClose={() => setRoomModalOpen(false)}
          onRoomCreated={(roomId) => {
            console.log('Room created:', roomId);
            // Có thể thêm toast: window.toast.success(`Phòng ${roomId} đã tạo!`)
          }}
          onRoomJoined={(roomId) => {
            console.log('Joined room:', roomId);
            // Có thể thêm toast
          }}
        />
      )}
      {editModalOpen && editingProfile && (
        <SettingProfileModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditingProfile(null)
        }}
          profile={editingProfile}
          appDataPath={appDataPath}
          onUpdate={setProfiles}
        />
      )}
    </div>
  </>
    </AnimationProvider>
    
  )
}