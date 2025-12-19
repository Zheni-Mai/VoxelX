// src/renderer/accounts/CustomizeModal.tsx

import { motion } from 'framer-motion'
import { Shirt, Wind, Feather, X } from 'lucide-react'
import Player3D from '../components/Player3D'
import { Account } from '../../main/types/account'
import Cape3DPreview from '../components/Cape3DPreview'
import Elytra3DPreview from '../components/Elytra3DPreview'
import { MotionDiv } from '../utils/motion'

interface CustomizeModalProps {
  isOpen: boolean
  onClose: () => void
  player: Account
  skinVersion: number
  onChangeSkin: () => Promise<void>
  onChangeCape: () => Promise<void>
  onChangeElytra: () => Promise<void>
}

export default function CustomizeModal({
  isOpen,
  onClose,
  player,
  skinVersion,
  onChangeSkin,
  onChangeCape,
  onChangeElytra,
}: CustomizeModalProps) {
  if (!isOpen) return null

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <MotionDiv
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative border border-white/20 bg-black/70 rounded-3xl shadow-2xl w-full max-w-5xl h-[80vh] mx-8 overflow-hidden flex"
      >
        <div className="w-72 bg-black/30 border-r border-white/10 flex flex-col">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-cyan-400">Tùy chỉnh</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 space-y-4">
            <button
              onClick={onChangeSkin}
              className="group flex items-center gap-4 py-4 px-5 bg-white/5 hover:bg-white/10 rounded-xl transition-all hover:scale-105"
            >
              <div className="p-3 bg-cyan-600/20 rounded-lg group-hover:bg-cyan-600/30 transition">
                <Shirt size={24} className="text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="text-lg font-semibold">Đổi Skin</p>
                <p className="text-xs text-gray-400">Thay đổi ngoại hình</p>
              </div>
            </button>

            <button
              onClick={onChangeCape}
              className="group flex items-center gap-4 py-4 px-5 bg-white/5 hover:bg-white/10 rounded-xl transition-all hover:scale-105"
            >
              <div className="p-3 bg-purple-600/20 rounded-lg group-hover:bg-purple-600/30 transition">
                <Wind size={24} className="text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-lg font-semibold">Đổi Cape</p>
                <p className="text-xs text-gray-400">Áo choàng phía sau</p>
              </div>
            </button>

            <button
              onClick={onChangeElytra}
              className="group flex items-center gap-4 py-4 px-5 bg-white/5 hover:bg-white/10 rounded-xl transition-all hover:scale-105"
            >
              <div className="p-3 bg-emerald-600/20 rounded-lg group-hover:bg-emerald-600/30 transition">
                <Feather size={24} className="text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-lg font-semibold">Đổi Elytra</p>
                <p className="text-xs text-gray-400">Cánh khi bay</p>
              </div>
            </button>
          </div>

          <div className="p-5 border-t border-white/10">
            <p className="text-center text-xl font-bold text-white">{player.name}</p>
            <p className="text-center text-sm text-gray-400 mt-1">
              {player.type === 'microsoft' ? 'Premium (Microsoft)' :
               player.type === 'elyby' ? 'Premium (Ely.by)' :
               'Offline'}
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900/30 to-transparent p-6">
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-center">
                <p className="text-lg font-medium text-purple-300 mb-3">Cape</p>
                <Cape3DPreview username={player.name} skinVersion={skinVersion} width={180} height={260} />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-xl font-bold text-cyan-300 mb-4">Nhân vật</p>
              <div className="w-64 h-80 bg-black/30 rounded-2xl border border-cyan-500/30 p-4 shadow-xl">
                <Player3D
                  key={`${player.name}-${skinVersion}-main`}
                  uuid={player.uuid}
                  username={player.name}
                  width={240}
                  height={320}
                  scale={1}
                />
              </div>
            </div>
            <div className="flex flex-col items-center">
                <p className="text-lg font-medium text-emerald-300 mb-3">Elytra</p>
                <Elytra3DPreview username={player.name} skinVersion={skinVersion} width={180} height={260} />
            </div>
          </div>
        </div>
      </MotionDiv>
    </MotionDiv>
  )
}