import { useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'

/**
 * Props for the TimeSlider component.
 */
interface TimeSliderProps {
  /** Current value in minutes ahead of the present time. */
  value: number
  /** Callback function triggered when the slider value changes. */
  onChange: (minutes: number) => void
  /** Minimum value allowed (default: 0). */
  min?: number
  /** Maximum value allowed (default: 180, representing 3 hours). */
  max?: number
  /** Increment step for the slider (default: 5). */
  step?: number
  /** Layout orientation of the slider. */
  orientation?: 'horizontal' | 'vertical'
}

/**
 * A specialized range input component for selecting futuristic time offsets.
 * Primarily used to control Gaussian Process signal strength predictions.
 */
export default function TimeSlider({
  value,
  onChange,
  min = 0,
  max = 180,
  step = 5,
  orientation = 'horizontal'
}: TimeSliderProps) {
  const { theme } = useTheme()

  /**
   * Handles the input change event and propagates the numeric value.
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10))
  }, [onChange])

  /**
   * Formats the numeric minute value into a human-readable string (e.g., "Now", "+45m", "+2h 30m").
   */
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return 'Now'
    if (minutes < 60) return `+${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins === 0 ? `+${hours}h` : `+${hours}h ${mins}m`
  }

  // Dynamic styling based on the current theme
  const containerClass = theme === 'dark' ? 'bg-ink-black/80 border border-white/10' : 'bg-papaya-whip/90 border border-black/5'
  const accentColor = theme === 'dark' ? '#D4A373' : '#2D5A4A'

  if (orientation === 'vertical') {
    return (
      <div className={`${containerClass} rounded-2xl p-2.5 backdrop-blur-xl flex flex-col items-center gap-3 shadow-2xl w-14`}>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 leading-none">Ahead</span>
          <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 leading-none">
            {formatTime(value)}
          </span>
        </div>
        
        <div className="relative h-40 flex items-center justify-center py-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            className="h-full w-1.5 appearance-none cursor-pointer bg-black/10 dark:bg-white/10 rounded-full"
            style={{
              writingMode: 'vertical-lr' as any,
              WebkitAppearance: 'slider-vertical' as any,
            } as any}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: ${accentColor};
              border: 2px solid ${theme === 'dark' ? '#0F172A' : '#FFFFFF'};
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            }
          `}</style>
        </div>

        <div className="flex flex-col items-center justify-between h-40 absolute pointer-events-none py-4 opacity-20 text-[8px] font-bold">
          <span>3h</span>
          <span>Now</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${containerClass} rounded-lg p-4 backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs opacity-60">Time Ahead</span>
        <span className="text-sm font-medium">
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
          className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${accentColor};
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            margin-top: -6px;
          }
          input[type="range"]::-webkit-slider-runnable-track {
            height: 4px;
            border-radius: 2px;
          }
        `}</style>
        
        <div className="flex justify-between mt-1 px-1 opacity-40 text-[10px]">
          <span>Now</span>
          <span>+1h</span>
          <span>+2h</span>
          <span>+3h</span>
        </div>
      </div>
    </div>
  )
}
