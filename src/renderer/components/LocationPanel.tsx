import { LocationData } from '../types'

interface LocationPanelProps {
  location: LocationData | null
  history: LocationData[]
  error: string | null
  onRefresh: () => void
}

export default function LocationPanel({ location, history, error, onRefresh }: LocationPanelProps) {
  const formatCoordinate = (value: number, type: 'lat' | 'lon'): string => {
    const direction = type === 'lat'
      ? (value >= 0 ? 'N' : 'S')
      : (value >= 0 ? 'E' : 'W')
    return `${Math.abs(value).toFixed(6)}° ${direction}`
  }

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatAccuracy = (meters: number): string => {
    if (meters < 1000) {
      return `±${Math.round(meters)}m`
    }
    return `±${(meters / 1000).toFixed(1)}km`
  }

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-primary-400">Location Info</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-700/50 rounded-lg p-3">
          <h3 className="text-sm text-slate-400 mb-2">Current Location</h3>
          {location ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Latitude:</span>
                <span>{formatCoordinate(location.latitude, 'lat')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Longitude:</span>
                <span>{formatCoordinate(location.longitude, 'lon')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Accuracy:</span>
                <span>{formatAccuracy(location.accuracy)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time:</span>
                <span>{formatTime(location.timestamp)}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No location data</p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm text-slate-400">Location History</h3>
            <span className="text-xs text-slate-500">{history.length} points</span>
          </div>
          
          {history.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {history.slice(-10).reverse().map((loc, index) => (
                <div 
                  key={loc.timestamp}
                  className="text-xs flex justify-between py-1 border-b border-slate-600/50 last:border-0"
                >
                  <span className="text-slate-400">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </span>
                  <span className="text-slate-500">
                    {formatTime(loc.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Start tracking to record locations</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onRefresh}
          className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Refresh Location
        </button>
      </div>
    </div>
  )
}
