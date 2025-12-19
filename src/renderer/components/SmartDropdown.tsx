// src/renderer/components/SmartDropdown.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'

interface SmartDropdownProps<T extends string> {
  title?: string
  options: readonly T[]
  selected: T
  onSelect: (value: T) => void
  displayValue?: (value: T) => string
  isOpen: boolean
  onToggle: () => void
}

export function SmartDropdown<T extends string>({
  title,
  options,
  selected,
  onSelect,
  displayValue = (v) => v,
  isOpen,
  onToggle,
}: SmartDropdownProps<T>) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isDropUp, setIsDropUp] = useState(false)

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    setIsDropUp(spaceBelow < 280 && spaceAbove > spaceBelow)
  }, [isOpen])

  return (
    <div className="relative">
      {title && (
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {title}
        </p>
      )}
      <button
        ref={buttonRef}
        onClick={onToggle}
        className="w-full px-4 py-3 border border-white/20 rounded-xl pr-10 text-left flex items-center justify-between hover:bg-white/5 transition font-medium text-base bg-black/50"
      >
        <span className="truncate">{displayValue(selected)}</span>
        <ChevronDown
          className={`transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          size={18}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: isDropUp ? 8 : -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isDropUp ? 8 : -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 right-0 mt-1 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto ${
              isDropUp ? 'bottom-full mb-1' : 'top-full'
            }`}
          >
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onSelect(option)
                  onToggle()
                }}
                className={`w-full px-4 py-2.5 text-left hover:bg-green-500/15 transition text-base ${
                  selected === option
                    ? 'bg-green-500/20 text-green-300 font-semibold border-l-4 border-green-400'
                    : 'text-gray-300'
                }`}
              >
                <span className="truncate block">{displayValue(option)}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}