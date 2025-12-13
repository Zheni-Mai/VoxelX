// src/renderer/changelog/ChangelogPage.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, Copy, Server, Globe, Clock, X, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Account } from '../../main/types/account'
import PlayCard from '../components/PlayCard'
import ModsListModal from '../launcher/modals/ModsListModal'

interface ChangelogEntry {
  version: string
  type: 'release' | 'snapshot'
  date: string
  description: string
  url: string
}

interface Profile {
  name: string
  version: string
  loader: 'vanilla' | 'fabric'
  gameDirectory: string
  loaderVersion?: string
  installed: boolean
  isDefault: boolean
}

interface ServerInfo {
  ip: string
  name: string
  players: { online: number; max: number }
  version?: string
  favicon?: string | undefined
  ping?: number
}

interface ChangelogPageProps {
  currentAccount: Account | null
  skinVersion: number
}

export default function ChangelogPage({ 
  currentAccount, 
  skinVersion 
}: ChangelogPageProps) {
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([])
  const [recentProfiles, setRecentProfiles] = useState<Profile[]>([])
  const [servers, setServers] = useState<ServerInfo[]>([])
  const [isDropupOpen, setIsDropupOpen] = useState(false)
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null)
  const [modsModalProfile, setModsModalProfile] = useState<any>(null)
  
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
    const loadData = async () => {
      try {
        const manifestRes = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json')
        const manifest = await manifestRes.json()
        const versions = manifest.versions.slice(0, 30)

        const logs: ChangelogEntry[] = await Promise.all(
          versions.map(async (v: any) => {
            try {
              const infoRes = await fetch(v.url)
              const info = await infoRes.json()
              return {
                version: v.id,
                type: v.type,
                date: new Date(v.releaseTime).toLocaleDateString('vi-VN'),
                description: info.description || 'Cập nhật mới cho Minecraft',
                url: info.url || `https://www.minecraft.net/en-us/article/minecraft-${v.id.replace(/\./g, '-')}-released`
              }
            } catch {
              return {
                version: v.id,
                type: v.type,
                date: new Date(v.releaseTime).toLocaleDateString('vi-VN'),
                description: 'Cập nhật mới',
                url: '#'
              }
            }
          })
        )
        setChangelogs(logs)

        const path = await window.electronAPI.profileAPI.getAppDataPath()
        const profiles = await window.electronAPI.profileAPI.listProfiles(path)
        setRecentProfiles(profiles.slice(0, 6))

        const serverList = [
          'aemine.vn',
          'sgp.kingmc.vn',
          'play.cubecraft.net',
          'play.mineahihi.net',
          "mp.mc-complex.com",
          'mp.earthmc.net',
          "aquamc.site",
          'play.mineland.net',
          'liemvn.com',
        ]

        const serverData = await Promise.all(
          serverList.map(async (address): Promise<ServerInfo> => {
            try {
              const [mcsrvRes, mcstatusRes] = await Promise.all([
                fetch(`https://api.mcsrvstat.us/3/${address}`),
                fetch(`https://api.mcstatus.io/v2/status/java/${address}`)
              ])

              const mcsrv = mcsrvRes.ok ? await mcsrvRes.json() : null
              const mcstatus = mcstatusRes.ok ? await mcstatusRes.json() : null

              if (!mcsrv?.online && !mcstatus?.online) {
                return { ip: address, name: address, players: { online: 0, max: 0 }, version: 'Offline', ping: 999 }
              }

              return {
                ip: address,
                name: mcsrv?.motd?.clean?.join(' ') || mcsrv?.hostname || mcstatus?.motd?.clean?.join(' ') || address,
                players: {
                  online: mcsrv?.players?.online ?? mcstatus?.players?.online ?? 0,
                  max: mcsrv?.players?.max ?? mcstatus?.players?.max ?? 0
                },
                version: mcsrv?.version || mcstatus?.version?.name_clean || 'Unknown',
                favicon: mcsrv?.icon ? `https://api.mcsrvstat.us/icon/${address}` : undefined,
                ping: Math.round(mcstatus?.latency ?? 999)
              }
            } catch {
              return { ip: address, name: address, players: { online: 0, max: 0 }, version: 'Offline', ping: 999 }
            }
          })
        )
        setServers(serverData.filter(s => s.players.online > 0))
      } catch (err) {
        console.error('Lỗi load dữ liệu:', err)
      }
    }

    loadData()
  }, [])

  const latestLog = changelogs[0]

  return (
    <div className="relative w-full min-h-screen text-white overflow-hidden">
      {servers.length > 0 && <ServerTicker servers={servers} />}

      <main className="pt-20 px-10 pb-32">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 items-start">
            <div className="xl:col-span-2">
              {latestLog ? (
                <motion.div
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full"
                >
                  <div className="relative bg-white/6 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden h-full p-10 lg:p-14">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/15 via-purple-600/15 to-pink-600/15 rounded-3xl" />
                    <div className="relative space-y-10">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                        <div>
                          <p className="text-sm uppercase tracking-widest text-cyan-300 font-bold opacity-90">
                            Phiên bản mới nhất
                          </p>
                          <h2 className="text-6xl lg:text-7xl font-black text-white mt-3 leading-none">
                            {latestLog.version}
                          </h2>
                          <p className="text-xl lg:text-2xl text-gray-300 mt-3 font-medium">
                            {latestLog.date}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`px-8 py-4 rounded-full text-white font-bold text-2xl shadow-xl whitespace-nowrap
                            ${latestLog.type === 'release'
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                              : 'bg-gradient-to-r from-purple-500 to-pink-500'
                            }`}>
                            {latestLog.type === 'release' ? 'Bản chính thức' : 'Snapshot'}
                          </span>
                        </div>
                      </div>
                      <p className="text-lg lg:text-xl text-gray-100 leading-relaxed max-w-4xl">
                        {latestLog.description || 'Cập nhật mới dành cho Minecraft'}
                      </p>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
                        <a
                          href={latestLog.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-lg transition-all text-lg font-bold border border-white/20 hover:border-cyan-400 shadow-lg group"
                        >
                          <Globe size={28} className="group-hover:scale-110 transition" />
                          Xem chi tiết trên Minecraft.net
                        </a>

                        <button
                          onClick={() => setIsDropupOpen(true)}
                          className="inline-flex items-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-sm transition-all group shadow-lg border border-white/20 hover:border-cyan-400"
                        >
                          <ChevronUp size={32} className="text-cyan-400 group-hover:scale-110 transition" />
                          <span className="font-medium text-gray-200">Xem lịch sử cập nhật</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white/6 backdrop-blur-3xl rounded-3xl border border-white/10 p-10 lg:p-14 animate-pulse space-y-8">
                  <div className="h-12 bg-white/10 rounded-2xl w-64" />
                  <div className="h-20 lg:h-28 bg-white/15 rounded-2xl w-96" />
                  <div className="h-6 bg-white/10 rounded-full w-48" />
                  <div className="space-y-4">
                    <div className="h-5 bg-white/10 rounded w-full" />
                    <div className="h-5 bg-white/10 rounded w-11/12" />
                    <div className="h-5 bg-white/10 rounded w-10/12" />
                  </div>
                  <div className="flex gap-6 pt-6">
                    <div className="h-14 bg-white/10 rounded-2xl w-64" />
                    <div className="h-14 bg-white/10 rounded-2xl w-56" />
                  </div>
                </div>
              )}
            </div>
            <div className="xl:col-span-1">
              <PlayCard 
                currentAccount={currentAccount} 
                skinVersion={skinVersion} 
              />
            </div>
          </div>

        </div>
      </main>

      <AnimatePresence>
        {isDropupOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDropupOpen(false)}
              className="fixed inset-0 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="bg-gray-900/95 backdrop-blur-3xl rounded-3xl border border-cyan-500/40 shadow-2xl 
                          w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative flex items-center justify-center px-8 pt-6 pb-4 flex-shrink-0">
                  <div className="absolute left-1/2 -translate-x-1/2 top-3 w-12 h-1.5 bg-white/30 rounded-full md:hidden" />
                  
                  <h3 className="text-3xl font-black text-cyan-400">Lịch sử cập nhật</h3>
                  
                  <button
                    onClick={() => setIsDropupOpen(false)}
                    className="absolute top-6 right-6 p-3 hover:bg-white/10 rounded-2xl transition group"
                    aria-label="Đóng"
                  >
                    <X size={36} className="text-gray-400 group-hover:text-white transition" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4">
                  {changelogs.map((log, index) => (
                    <motion.a
                      key={log.version}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      href={log.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-6 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 
                                hover:border-cyan-400/60 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-bold text-white group-hover:text-cyan-300 transition">
                          {log.version}
                        </span>
                        <span
                          className={`px-5 py-2 text-sm font-bold rounded-full ${
                            log.type === 'release'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {log.type === 'release' ? 'Release' : 'Snapshot'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{log.date}</p>
                      <p className="text-gray-300 leading-relaxed">{log.description}</p>
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}

const ServerTicker = ({ servers }: { servers: ServerInfo[] }) => {
  const [hovered] = useState(false)
  const tickerItems = [...servers, ...servers]
  const parseMotd = (motd: string): string => {
    if (!motd) return motd || ''
    return motd.replace(/§[0-9a-fk-or]/g, '')
  }
  
  return (
    <div className="fixed top-11 left-20 right-0 h-16 bg-black/70 backdrop-blur-3xl border-b border-white/8 z-40 overflow-hidden select-none"
    >
      <div className="h-full flex items-center px-6">
        <div className="flex items-center gap-3 flex-shrink-0 mr-10">
          <Server size={20} className="text-cyan-400" />
          <span className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
            Server Live
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <motion.div
            animate={{ x: hovered ? 0 : [0, -1000] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: hovered ? 0 : 35,
                ease: "linear"
              }
            }}
            className="flex items-center gap-10"
          >
            {tickerItems.map((s, i) => (
              <div
                key={`${s.ip}-${i}`}
                className="flex items-center gap-4 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all duration-300 cursor-pointer whitespace-nowrap flex-shrink-0 group"
                onClick={() => navigator.clipboard.writeText(s.ip)}
                title={`Click để copy: ${s.ip}`}
              >
                {s.favicon ? (
                  <img
                    src={s.favicon}
                    alt={s.name}
                    className="w-9 h-9 rounded-md shadow-lg border border-white/20"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement
                      img.style.display = 'none'
                      const fallback = img.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div className={`${s.favicon ? 'hidden' : 'flex'} w-9 h-9 bg-gray-800 rounded-md items-center justify-center border border-white/10`}>
                  <Server size={18} className="text-gray-500" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white max-w-48 truncate">
                    {parseMotd(s.name) || s.ip}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${s.players.online > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs font-bold text-emerald-400">
                      {s.players.online.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">/</span>
                    <span className="text-xs text-gray-400">
                      {s.players.max.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      
    </div>
  )
}
