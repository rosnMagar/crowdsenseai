import { useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'

interface TimeSliderProps {
  value: number
  onChange: (minutes: number) => void
  min?: number
  max?: number
  step?: number
}

export default function TimeSlider({
  value,
  onChange,
  min = 0,
  max = 60,
  step = 5
}: TimeSliderProps) {
  const { theme } = useTheme()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10))
  }, [onChange])

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return 'Now'
    
    if (minutes < 60) {
      return `+${minutes}m`
    }
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (mins === 0) {
      return `+${hours}h`
    }
    
    return `+${hours}h ${mins}m`
  }

  const containerClass = theme === 'dark'
    ? 'bg-dark-teal/50'
    : 'bg-papaya-whip'
  const labelClass = theme === 'dark'
    ? 'text-air-force-blue'
    : 'text-dark-teal'
  const activeTimeClass = theme === 'dark'
    ? 'text-bronze'
    : 'text-dark-teal'
  const trackClass = theme === 'dark'
    ? 'bg-ink-black/30'
    : 'bg-beige'
  const thumbClass = theme === 'dark'
    ? 'bg-bronze'
    : 'bg-dark-teal'
  const tickClass = theme === 'dark'
    ? 'text-air-force-blue/50'
    : 'text-dark-teal/50'
  const quickActiveClass = theme === 'dark'
    ? 'bg-bronze text-cornsilk'
    : 'bg-dark-teal text-cornsilk'
  const quickInactiveClass = theme === 'dark'
    ? 'bg-dark-teal/30 text-air-force-blue hover:bg-dark-teal/50'
    : 'bg-beige text-dark-teal hover:bg-beige/80'

  return (
    <div className={`${containerClass} rounded-lg p-4 backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs ${labelClass}`}>Time Ahead</span>
        <span className={`text-sm font-medium ${activeTimeClass}`}>
          {formatTime(value)}
        </span>
      </div>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className={`w-full h-2 ${trackClass} rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:${thumbClass}
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110`}
        />
        
        <div className="flex justify-between mt-1 px-1">
          <span className={`text-[10px] ${tickClass}`}>Now</span>
          <span className={`text-[10px] ${tickClass}`}>+30m</span>
          <span className={`text-[10px] ${tickClass}`}>+60m</span>
        </div>
      </div>
      
      <div className="mt-3 flex gap-1 flex-wrap justify-center">
        {[0, 15, 30, 45, 60].map(offset => (
          <button
            key={offset}
            onClick={() => onChange(offset)}
            className={`px-2 py-1 text-xs rounded transition-colors
              ${value === offset 
                ? quickActiveClass
                : quickInactiveClass
              }`}
          >
            {formatTime(offset)}
          </button>
        ))}
      </div>
    </div>
  )
}
