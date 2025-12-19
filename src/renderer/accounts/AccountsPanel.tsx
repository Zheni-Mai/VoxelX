// src/renderer/accounts/AccountsPanel.tsx

import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, LogIn, Trash2, RefreshCw, Upload, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import Player3D from '../components/Player3D'
import PlayerHead from '../components/PlayerHead'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { Account } from '../../main/types/account'
import CustomizeModal from './CustomizeModal'
import { MotionDiv } from '../utils/motion'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentPlayer: Account | null
  setCurrentPlayer: (acc: Account | null) => void
}

export default function AccountsPanel({ isOpen, onClose, currentPlayer, setCurrentPlayer }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showForm, setShowForm] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [skinVersion, setSkinVersion] = useState(0)
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false)
  const [showElybyLogin, setShowElybyLogin] = useState(false)
  const [elybyUsername, setElybyUsername] = useState('')
  const [elybyPassword, setElybyPassword] = useState('')
  const [elybyLoading, setElybyLoading] = useState(false)

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      await createOffline()
    }
  }

  useEffect(() => {
    const unsubscribeElybySuccess = window.electronAPI.on('elyby-login-success', (acc: Account) => {
      setCurrentPlayer(acc)
      loadAccounts()
      window.toast.success(`Chào ${acc.name}! Đăng nhập Ely.by thành công!`, 'Thành công')
    })

    const unsubscribeElybyFailed = window.electronAPI.on('elyby-login-failed', (msg: string) => {
      window.toast.error('Lỗi đăng nhập Ely.by: ' + msg, 'Lỗi')
    })

    return () => {
      unsubscribeElybySuccess()
      unsubscribeElybyFailed()
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadAccounts()
    }
  }, [isOpen])

  useEffect(() => {
    const unsubscribeMicrosoftSuccess = window.electronAPI.on('microsoft-login-success', async (account: Account) => {
      const newAcc: Account = {
        ...account,
        lastUsed: Date.now(),
        type: 'microsoft',
      }
      const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
      const currentList = await window.electronAPI.accountAPI.getAccounts(appDataPath)
      const updated = currentList.filter((a: Account) => a.id !== newAcc.id)
      updated.unshift(newAcc)
      await window.electronAPI.accountAPI.saveAccounts({ appDataPath, accounts: updated })
      setAccounts(updated)
      setCurrentPlayer(newAcc)
      window.toast.success(`Đăng nhập thành công! Chào ${newAcc.name}!`, 'Thành công')
    })

    const unsubscribeMicrosoftFailed = window.electronAPI.on('microsoft-login-failed', (error: string) => {
      window.toast.error('Đăng nhập Microsoft thất bại: ' + error, 'Lỗi')
    })

    return () => {
      unsubscribeMicrosoftSuccess()
      unsubscribeMicrosoftFailed()
    }
  }, [])

  const loadAccounts = async () => {
    try {
      const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
      const list = await window.electronAPI.accountAPI.getAccounts(appDataPath)
      const sorted = (list || []).sort((a: Account, b: Account) =>
        (b.lastUsed || 0) - (a.lastUsed || 0)
      )
      setAccounts(sorted)
    } catch (err) {
      console.error('Lỗi tải danh sách tài khoản:', err)
      setAccounts([])
    }
  }

  const handleElybyLogin = async () => {
    if (!elybyUsername.trim() || !elybyPassword.trim()) return

    setElybyLoading(true)

    try {
        const response = await fetch('https://authserver.ely.by/auth/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: elybyUsername,
            password: elybyPassword,
            requestUser: true,
        }),
        })

        const data = await response.json()

        if (response.ok && data.accessToken) {
        const profile = data.selectedProfile || data.availableProfiles?.[0]

        if (!profile) {
            window.toast.warning('Không tìm thấy profile Minecraft nào trong tài khoản Ely.by này.', 'Cảnh báo')
            return
        }

        const newAcc: Account = {
            id: `elyby-${profile.id}`,
            name: profile.name,
            uuid: profile.id,
            type: 'elyby' as const, 
            lastUsed: new Date().getTime(),
            authProvider: 'elyby',
            refreshToken: data.accessToken,
            clientToken: data.clientToken,
        }

        const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
        const updated = [newAcc, ...accounts.filter(a => a.id !== newAcc.id)]
        await window.electronAPI.accountAPI.saveAccounts({ appDataPath, accounts: updated })

        setAccounts(updated)
        setCurrentPlayer(newAcc)
        window.toast.success(`Đăng nhập thành công! Chào ${profile.name}!`, 'Thành công')
        setShowElybyLogin(false)
        setElybyUsername('')
        setElybyPassword('')
        } else {
        window.toast.error(data.errorMessage || 'Đăng nhập thất bại. Kiểm tra lại tài khoản/mật khẩu.', 'Lỗi')
        }
    } catch (err) {
        console.error(err)
        window.toast.error('Lỗi kết nối đến Ely.by. Vui lòng thử lại.', 'Lỗi')
    } finally {
        setElybyLoading(false)
    }
    }

  const createOffline = async () => {
    if (!nameInput.trim()) return
    if (accounts.some(a => a.name.toLowerCase() === nameInput.trim().toLowerCase())) {
      window.toast.warning('Tên này đã tồn tại!', 'Cảnh báo')
      return
    }

    const uuid = crypto.randomUUID().replace(/-/g, '')
    const newAcc: Account = {
      id: Date.now().toString(),
      name: nameInput.trim(),
      uuid,
      type: 'offline',
      lastUsed: Date.now()
    }

    const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
    const currentList = await window.electronAPI.accountAPI.getAccounts(appDataPath)
    const updated = [newAcc, ...currentList.filter(a => a.id !== newAcc.id)]

    await window.electronAPI.accountAPI.saveAccounts({ appDataPath, accounts: updated })
    setAccounts(updated)
    setCurrentPlayer(newAcc)
    setNameInput('')
    setShowForm(false)
  }

  const selectAccount = async (acc: Account) => {
    const updatedAccounts = accounts.map(a => ({
        ...a,
        lastUsed: a.id === acc.id ? Date.now() : a.lastUsed
    }))

    setAccounts(updatedAccounts)
    setCurrentPlayer(acc)
    const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
    await window.electronAPI.accountAPI.saveAccounts({ 
        appDataPath, 
        accounts: updatedAccounts 
    })
    }

  const deleteAccount = async (acc: Account) => {
  if (!confirm(`Xóa tài khoản "${acc.name}"?\n\nHành động này không thể hoàn tác.`)) return

  const appDataPath = await window.electronAPI.profileAPI.getAppDataPath()
  const currentList = await window.electronAPI.accountAPI.getAccounts(appDataPath)
  const updated = currentList.filter(a => a.id !== acc.id)

  await window.electronAPI.accountAPI.saveAccounts({ appDataPath, accounts: updated })
  await loadAccounts()

  if (currentPlayer?.id === acc.id) {
    setCurrentPlayer(updated[0] || null)
  }
}

  const handleChangeSkin = async () => {
    if (!currentPlayer) return

    const filePath = await window.electronAPI.selectSkinFile()
    if (!filePath) return

    const currentProfile = await window.electronAPI.profileAPI.getCurrentProfile()
    if (!currentProfile?.gameDirectory) {
      window.toast.error('Không tìm thấy profile đang chọn!')
      return
    }
    const gameDir = currentProfile.gameDirectory

    const success = await window.electronAPI.changeSkin({
      username: currentPlayer.name,
      filePath,
      gameDir
    })

    if (success) {
      window.toast.success(`Đã đổi skin cho ${currentPlayer.name}!`)
      setSkinVersion(prev => prev + 1)
    } else {
      window.toast.error('Lỗi khi đổi skin!')
    }
  }

  const handleChangeCape = async () => {
    if (!currentPlayer) return

    const filePath = await window.electronAPI.selectSkinFile() 
    if (!filePath) return

    const currentProfile = await window.electronAPI.profileAPI.getCurrentProfile()
    if (!currentProfile?.gameDirectory) {
      window.toast.error('Không tìm thấy profile đang chọn!')
      return
    }
    const gameDir = currentProfile.gameDirectory

    const success = await window.electronAPI.changeCape({
      username: currentPlayer.name,
      filePath,
      gameDir
    })

    if (success) {
      window.toast.success(`Đã đổi cape cho ${currentPlayer.name}!`)
      setSkinVersion(prev => prev + 1)
    } else {
      window.toast.error('Lỗi khi đổi cape!')
    }
  }

  const handleChangeElytra = async () => {
    if (!currentPlayer) return

    const filePath = await window.electronAPI.selectSkinFile()
    if (!filePath) return

    const currentProfile = await window.electronAPI.profileAPI.getCurrentProfile()
    if (!currentProfile?.gameDirectory) {
      window.toast.error('Không tìm thấy profile đang chọn!')
      return
    }
    const gameDir = currentProfile.gameDirectory

    const success = await window.electronAPI.changeElytra({
      username: currentPlayer.name,
      filePath,
      gameDir
    })

    if (success) {
      window.toast.success(`Đã đổi elytra cho ${currentPlayer.name}!`)
      setSkinVersion(prev => prev + 1)
    } else {
      window.toast.error('Lỗi khi đổi elytra!')
    }
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
          />
          <MotionDiv
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed right-0 top-12 h-[calc(100vh-3rem)] w-full max-w-6xl bg-black/70 backdrop-blur-2xl border border-white/20 rounded-2xl rounded-r-none overflow-hidden shadow-2xl z-50 flex"                  
            style={{
                borderTopLeftRadius: '0.5rem',
                borderBottomLeftRadius: '0.5rem',
                
            }}
            >
            <div className="w-96 bg-black/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-cyan-400">Tài khoản</h2>
                <div className="flex gap-2">
                  <button
                    onClick={loadAccounts}
                    aria-label="Làm mới danh sách tài khoản"
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                    title="Làm mới"
                  >
                    <RefreshCw size={20} className="text-gray-400" />
                  </button>
                  <button
                    onClick={onClose}
                    aria-label="Đóng panel tài khoản"
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                    title="Đóng"
                  >
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl font-bold hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Plus size={20} /> Thêm Offline
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <LogIn size={20} /> Đăng nhập Premium 
                    <ChevronDown size={18} className={`ml-auto transition-transform ${isAuthMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                <AnimatePresence>
                  {isAuthMenuOpen && (
                    <MotionDiv
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-2xl z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          setIsAuthMenuOpen(false)
                          await window.electronAPI.accountAPI.openMicrosoftLogin()
                        }}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/10 transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <span className="text-2xl">M</span>
                          </div>
                          <div>
                            <p className="font-semibold">Microsoft Account</p>
                            <p className="text-xs text-gray-400">Đăng nhập chính thức Mojang</p>
                          </div>
                        </div>
                      </button>

                      <div className="h-px bg-white/10 mx-4" />
                      <button
                        type="button"
                        onClick={async () => {
                          setIsAuthMenuOpen(false)
                          try {
                            await window.electronAPI.elybyLogin()
                          } catch (err: any) {
                            window.toast.warning('Đăng nhập Ely.by bị hủy hoặc lỗi: ' + err.message, 'Cảnh báo')
                          }
                        }}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/10 transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                            E
                          </div>
                          <div>
                            <p className="font-semibold">Ely.by Account (OAuth2)</p>
                            <p className="text-xs text-gray-400">An toàn, không cần mật khẩu</p>
                          </div>
                        </div>
                      </button>

                      <div className="h-px bg-white/10 mx-4" />
                      <button
                        type="button"
                        onClick={() => window.open('https://ely.by/register', '_blank')}
                        className="w-full px-5 py-3.5 flex items-center justify-center gap-2 hover:bg-white/10 transition text-cyan-400"
                      >
                        <ExternalLink size={16} /> Đăng ký tài khoản Ely.by
                      </button>
                    </MotionDiv>
                  )}
                </AnimatePresence>
            </div>
              </div>
              <AnimatePresence>
                {showForm && (
                  <MotionDiv
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 p-4 bg-white/5 rounded-xl border border-white/10"
                  >
                    <input
                      autoFocus
                      type="text"
                      placeholder="Tên nhân vật..."
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-4 py-3 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <div className="flex gap-2 mt-3">
                      <button onClick={createOffline} className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg">Tạo</button>
                      <button onClick={() => { setShowForm(false); setNameInput('') }} className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-lg">Hủy</button>
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <AnimatePresence>
                  {accounts.map(acc => (
                    <MotionDiv
                      key={acc.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative group mb-3"
                    >
                      <button
                        onClick={() => selectAccount(acc)}
                        className={`w-full p-4 rounded-xl text-left transition-all ${
                          currentPlayer?.id === acc.id
                            ? 'bg-cyan-500/20 border border-cyan-400 shadow-lg shadow-cyan-500/20'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                            <PlayerHead
                                uuid={acc.uuid}
                                username={acc.name}
                                size={36}
                               key={`${acc.name}-${skinVersion}`}
                                className="ring-2 ring-white/20 group-hover:ring-cyan-400/50 transition-all duration-300 shadow-md"
                            />
                            <div className="flex-1">
                                <p className="font-bold">{acc.name}</p>
                                <p className="text-xs text-gray-400">
                                  {acc.type === 'microsoft' ? 'Premium (Microsoft)' : 
                                  acc.type === 'elyby' ? 'Premium (Ely.by)' : 
                                  'Offline'}
                                </p>
                            </div>
                            {currentPlayer?.id === acc.id && (
                                <span className="text-cyan-400 text-xs font-bold px-2 py-1 bg-cyan-500/20 rounded">Đang dùng</span>
                            )}
                        </div>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            deleteAccount(acc) 
                          }}
                          aria-label={`Xóa tài khoản ${acc.name}`}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                          title="Xóa tài khoản"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </button>
                    </MotionDiv>
                  ))}
                </AnimatePresence>
                {accounts.length === 0 && (
                  <p className="text-center text-gray-500 mt-10">Chưa có tài khoản nào</p>
                )}
              </div>
            </div>
            <AnimatePresence>
            {showElybyLogin && (
                <MotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
                onClick={() => setShowElybyLogin(false)}
                >
                <MotionDiv
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gray-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
                >
                    <h2 className="text-2xl font-bold text-cyan-400 mb-6 text-center">Đăng nhập Ely.by</h2>

                    <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Tên đăng nhập hoặc email"
                        value={elybyUsername}
                        onChange={(e) => setElybyUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        autoFocus
                    />
                    <input
                        type="password"
                        placeholder="Mật khẩu"
                        value={elybyPassword}
                        onChange={(e) => setElybyPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleElybyLogin()}
                        className="w-full px-4 py-3 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    </div>

                    <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleElybyLogin}
                        disabled={elybyLoading || !elybyUsername || !elybyPassword}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {elybyLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                    <button
                        onClick={() => {
                        setShowElybyLogin(false)
                        setElybyUsername('')
                        setElybyPassword('')
                        }}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl"
                    >
                        Hủy
                    </button>
                    </div>

                    <p className="text-center text-xs text-gray-400 mt-4">
                    Không có tài khoản?{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); window.open('https://ely.by/register', '_blank'); }} className="text-cyan-400 hover:underline">
                        Đăng ký ngay
                    </a>
                    </p>
                </MotionDiv>
                </MotionDiv>
            )}
            </AnimatePresence>
            <div className="flex-1 flex flex flex-col bg-gradient-to-b from-gray-900/50 to-transparent">
              <div className="p-8 pb-4">
                <h3 className="text-xl font-bold text-cyan-300 mb-6">Xem trước</h3>
                <div className="relative mx-auto w-80 h-96 mb-8">
                  {currentPlayer ? (
                    <Player3D 
                        key={`${currentPlayer.name}-${skinVersion}`}
                        uuid={currentPlayer.uuid}
                        username={currentPlayer.name}
                        defaultSkin="steve"
                        width={320}
                        height={384}
                        scale={1}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-600 flex items-center justify-center">
                      <p className="text-gray-500 text-lg">Chọn một tài khoản</p>
                    </div>
                  )}
                </div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white">
                    {currentPlayer?.name || 'Guest'}
                  </h2>
                  <p className="text-gray-400 mt-1">
                    {currentPlayer?.type === 'microsoft' ? 'Premium Account' : 'Offline Mode'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <button 
                    onClick={handleChangeSkin}
                    disabled={!currentPlayer}
                    className="py-4 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl backdrop-blur transition-all hover:scale-105 flex flex-col items-center gap-2 group"
                  >
                    <Upload size={28} className="text-cyan-400 group-hover:text-white" />
                    <span className="font-medium">Đổi Skin</span>
                  </button>
                  <button 
                    onClick={() => currentPlayer && setShowCustomizeModal(true)}
                    disabled={!currentPlayer}
                    className="py-4 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl backdrop-blur transition-all hover:scale-105 flex flex-col items-center gap-2 group"
                  >
                    <Settings size={28} className="text-purple-400 group-hover:text-white" />
                    <span className="font-medium">Tùy chỉnh</span>
                  </button>
                </div>

                {currentPlayer?.type === 'offline' && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => deleteAccount(currentPlayer)}
                      className="text-red-400 hover:text-red-300 text-sm underline opacity-70 hover:opacity-100 transition"
                    >
                      Xóa tài khoản này
                    </button>
                  </div>
                )}
              </div>
            </div>
          </MotionDiv>
        </>
      )}
      <CustomizeModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        player={currentPlayer!}
        skinVersion={skinVersion}
        onChangeSkin={handleChangeSkin}
        onChangeCape={handleChangeCape}
        onChangeElytra={handleChangeElytra}
      />
    </AnimatePresence>
  )
}