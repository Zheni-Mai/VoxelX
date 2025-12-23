// src/renderer/changelog/ChangelogPage.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, Copy, Server, Globe, Clock, X, Loader2 } from 'lucide-react'
import { MotionDiv } from '../utils/motion'
import { useState, useEffect } from 'react'
import { Account } from '../../main/types/account'
import PlayCard from '../components/PlayCard'
import ChangelogHistoryModal from './modal/ChangelogHistoryModal'
import LatestVersionCard from './card/LatestMinecraftTab'
import ChangelogTabs from './tabs/ChangelogTabs'
import ServicesCarouselCard from '../ads/ServicesCarouselCard'

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
  loader: 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge' | 'liteloader' | 'optifine'
  gameDirectory: string
  loaderVersion?: string
  optifine?: boolean | string
  installed: boolean
  isDefault?: boolean
  isSelected?: boolean
  icon?: string
  resolution?: { width: number; height: number }
  memory?: { min: string; max: string }
  jvmArgs?: string
  gameArgs?: string
  showLaunchLog?: boolean
  javaVersion?: 8 | 11 | 17 | 21 | 25
  useAuthlibInjector?: boolean
  forceDedicatedGPU?: boolean | null
  enableFeatherUI?: boolean
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  
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
        // Fetch Minecraft versions
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
                url: `https://www.minecraft.net/en-us/article/minecraft-${v.id.replace(/\./g, '-')}-released`
              }
            }
          })
        )
        setChangelogs(logs)

        // Fetch server list
        const serverList = [
          'aemine.vn', 'sgp.kingmc.vn', 'shibamc.online', 'play.cubecraft.net',
          'play.mineahihi.net', "mp.mc-complex.com", 'mp.earthmc.net',
          "aquamc.site", 'play.mineland.net', 'liemvn.com',
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

      <div className="fixed right-5 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <PlayCard 
            currentAccount={currentAccount} 
            skinVersion={skinVersion} 
          />
        </div>
      </div>

      <main className="pt-20 px-10 pb-32">
        <div className="mx-auto max-w-full">
          <div className="pr-8 lg:pr-12 xl:pr-66 2xl:pr-112">
            <div className="max-w-4xl">
              <ChangelogTabs
                latestLog={latestLog}
                allChangelogs={changelogs}
                isLoading={changelogs.length === 0}
                onOpenHistory={() => setIsHistoryModalOpen(true)}
              />
            </div>

            <div className="max-w-4xl mt-4">
              <ServicesCarouselCard
              />
            </div>
          </div>
        </div>
      </main>

      <ChangelogHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        changelogs={changelogs}
      />

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
