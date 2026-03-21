import { useCallback } from 'react'

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

  return (
    <div className="bg-slate-800/90 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">Time Ahead</span>
        <span className="text-sm font-medium text-sky-400">
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
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-sky-400
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110"
        />
        
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[10px] text-slate-500">Now</span>
          <span className="text-[10px] text-slate-500">+30m</span>
          <span className="text-[10px] text-slate-500">+60m</span>
        </div>
      </div>
      
      <div className="mt-3 flex gap-1 flex-wrap justify-center">
        {[0, 15, 30, 45, 60].map(offset => (
          <button
            key={offset}
            onClick={() => onChange(offset)}
            className={`px-2 py-1 text-xs rounded transition-colors
              ${value === offset 
                ? 'bg-sky-500 text-white' 
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
          >
            {formatTime(offset)}
          </button>
        ))}
      </div>
    </div>
  )
}
