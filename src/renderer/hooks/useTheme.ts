// src/hooks/useTheme.ts 
import { useEffect, useState } from 'react'
import { startElectronParticles, stopElectronParticles } from '../themes/electronParticles'


export type Theme = {
  name: string
  background: {
    type: 'gradient' | 'color' | 'image'
    color?: string
    image?: string
  }
  accentColor: string
  backgroundClass?: string
}

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>({
    name: 'Dark',
    background: { type: 'gradient' },
    accentColor: '#06b6d4',
  })

  const applyTheme = (t: Theme) => {
    console.log('Áp dụng theme:', t)
    document.documentElement.style.setProperty('--accent-color', t.accentColor)

    document.body.className = ''
    document.body.classList.remove(
      'cyberpunk-animated', 'ocean-waves', 'ocean-abyss',
      'sunset-animated', 'forest-breathe', 'light-mode'
    )

    if (t.backgroundClass) {
      document.body.classList.add(t.backgroundClass)
    }
  }
  
  useEffect(() => {
    stopElectronParticles()

    if (theme.backgroundClass === 'electron-network-animated') {
      startElectronParticles()
    }
    return () => {
      stopElectronParticles()
    }
  }, [theme.backgroundClass])

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await window.electronAPI.themeAPI.loadTheme()
        if (saved) {
          console.log('Load theme thành công:', saved)
          setTheme(saved)
          applyTheme(saved)
        }
      } catch (err) {
        console.log('Không có theme → dùng mặc định')
      }
    }
    load()

    const handler = (e: any) => {
      const newTheme: Theme = e.detail
      console.log('Theme cập nhật:', newTheme)
      setTheme(newTheme)
      applyTheme(newTheme)
    }

    window.addEventListener('theme-updated', handler)
    return () => window.removeEventListener('theme-updated', handler)
  }, [])

  return { theme }
}