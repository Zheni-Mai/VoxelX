// src/components/Sidebar.tsx
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { MotionDiv } from '../utils/motion'

type Page = 'home' | 'profile' | 'settings' | 'about';

const menuItems = [
  { id: 'home' as Page, label: 'Home', icon: Home },
  { id: 'profile' as Page, label: 'Profiles', icon: Folder },
  { id: 'settings' as Page, label: 'Settings', icon: Settings },
  { id: 'about' as Page, label: 'About', icon: Info },
] as const;

import { Home, Folder, Settings, Info } from 'lucide-react';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  setShowSettings: (open: boolean) => void;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  currentLauncherVersion: string;
}

export default function Sidebar({
  activePage,
  setActivePage,
  setShowSettings,
  hovered,
  setHovered,
  currentLauncherVersion,
}: SidebarProps) {
  return (
    <div className="fixed left-0 top-11 bottom-0 w-20 bg-black/40 backdrop-blur-2xl border-r border-white/10 flex flex-col items-center py-6 z-40">
      <nav className="space-y-4 flex-1 w-full flex flex-col items-center">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          const isSettingsActive = item.id === 'settings' && activePage === 'settings';

          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => {
                  if (item.id === 'settings') {
                    setShowSettings(true);
                  } else {
                    setActivePage(item.id);
                  }
                }}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                className={`relative p-4 rounded-2xl transition-all duration-300 group ${
                  isSettingsActive
                    ? 'bg-gradient-to-br from-purple-500/40 to-cyan-500/40 border border-purple-400 shadow-xl shadow-purple-500/30'
                    : isActive
                    ? 'bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-500/50 shadow-xl'
                    : 'hover:bg-white/10'
                }`}
              >
                <Icon
                  size={28}
                  className={
                    isSettingsActive
                      ? 'text-purple-300'
                      : isActive
                      ? 'text-emerald-400'
                      : 'text-gray-500 group-hover:text-white'
                  }
                />
                {(isActive || isSettingsActive) && (
                  <MotionDiv
                    layoutId="activeIndicator"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 -z-10"
                  />
                )}
              </button>

              {hovered === item.id && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/90 backdrop-blur-xl rounded-lg text-sm whitespace-nowrap pointer-events-none z-50">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button
        onClick={() => window.close()}
        aria-label="Thoát VoxelX"
        className="p-4 rounded-2xl hover:bg-red-500/20 transition-all group mb-8"
      >
        <LogOut size={28} className="text-gray-500 group-hover:text-red-400 transition-colors" />
      </button>
      <div className="mt-1 mb-1 text-center">
        <p className="text-xs opacity-70">v{currentLauncherVersion}</p>
      </div>
    </div>
  );
}