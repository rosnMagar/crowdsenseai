import { useCallback } from 'react'
import MapView from '../components/MapView'
import Header from '../components/Header'
import { useTheme } from '../contexts/ThemeContext'
import { LocationData } from '../types'

interface MapScreenProps {
  location: LocationData | null
  locationHistory: LocationData[]
  isTracking: boolean
  onToggleTracking: () => void
}

export default function MapScreen({ location, locationHistory, isTracking, onToggleTracking }: MapScreenProps) {
  const { theme } = useTheme()

  const handleStartTracking = useCallback(() => {
    if (!isTracking) {
      onToggleTracking()
    }
  }, [isTracking, onToggleTracking])

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header title="Network Cartographer" />
      
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <MapView 
            currentLocation={location}
            locationHistory={locationHistory}
          />
        </div>

        <div className="absolute top-6 left-6 right-6 flex items-start justify-between pointer-events-none z-10">
          <div className="flex flex-col gap-4 pointer-events-auto">
            <div className={`backdrop-blur-xl p-1 rounded-lg shadow-2xl flex items-center border ${
              theme === 'dark' 
                ? 'bg-ink-black/80 border-air-force-blue/15 text-light-beige' 
                : 'bg-cornsilk/80 border-tea-green/15 text-ink-black'
            }`}>
              <div className="flex items-center px-4 py-2 gap-3 min-w-[300px]">
                <span className="material-symbols-outlined opacity-60">search</span>
                <input 
                  className="bg-transparent border-none focus:ring-0 text-sm font-body w-full placeholder-opacity-50 outline-none" 
                  placeholder="Search coordinates or nodes..." 
                  type="text"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 pointer-events-auto">
            <button className={`w-10 h-10 backdrop-blur-xl border flex items-center justify-center transition-colors rounded-lg shadow-lg ${
              theme === 'dark'
                ? 'bg-ink-black/70 border-air-force-blue/15 text-ash-grey hover:bg-ink-black'
                : 'bg-cornsilk/70 border-tea-green/15 text-bronze hover:bg-cornsilk'
            }`}>
              <span className="material-symbols-outlined">layers</span>
            </button>
            <button className={`w-10 h-10 backdrop-blur-xl border flex items-center justify-center transition-colors rounded-lg shadow-lg ${
              theme === 'dark'
                ? 'bg-ink-black/70 border-air-force-blue/15 text-ash-grey hover:bg-ink-black'
                : 'bg-cornsilk/70 border-tea-green/15 text-bronze hover:bg-cornsilk'
            }`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>my_location</span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-24 left-4 right-4 z-10 md:w-80 md:left-6">
          <div className={`backdrop-blur-2xl border p-4 shadow-2xl ${
            theme === 'dark'
              ? 'bg-ink-black/90 border-air-force-blue/10'
              : 'bg-cornsilk/90 border-tea-green/10'
          }`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 text-air-force-blue dark:text-tea-green">Current Sector</p>
                <h2 className="text-xl font-headline font-bold tracking-tight">
                  {location ? 'Your Location' : 'Waiting for GPS...'}
                </h2>
              </div>
              <div className="flex items-center gap-1 bg-dark-teal/20 px-2 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-dark-teal"></span>
                <span className="text-[10px] font-bold uppercase">{isTracking ? 'Active' : 'Paused'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 ${theme === 'dark' ? 'bg-dark-teal/50' : 'bg-papaya-whip'}`}>
                <p className="text-[10px] uppercase mb-1 text-air-force-blue dark:text-tea-green">Signal</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold text-bronze dark:text-ash-grey">
                    {location?.accuracy ? Math.round(location.accuracy) : '--'}
                  </span>
                  <span className="text-[10px] mb-1 text-air-force-blue dark:text-tea-green">m</span>
                </div>
              </div>
              <div className={`p-3 ${theme === 'dark' ? 'bg-dark-teal/50' : 'bg-papaya-whip'}`}>
                <p className="text-[10px] uppercase mb-1 text-air-force-blue dark:text-tea-green">Points</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold text-bronze dark:text-ash-grey">{locationHistory.length}</span>
                  <span className="text-[10px] mb-1 text-air-force-blue dark:text-tea-green">logged</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`absolute bottom-0 left-0 right-0 backdrop-blur-xl border-t px-6 py-3 hidden md:flex items-center justify-between z-20 ${
          theme === 'dark'
            ? 'bg-ink-black/90 border-air-force-blue/10 text-light-beige'
            : 'bg-cornsilk/90 border-tea-green/10 text-ink-black'
        }`}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-bronze text-sm">location_on</span>
              <span className="text-xs font-bold uppercase tracking-tight">
                {location 
                  ? `${location.latitude.toFixed(4)}° N, ${location.longitude.toFixed(4)}° W`
                  : 'Acquiring location...'
                }
              </span>
            </div>
          </div>
          
          <button
            onClick={handleStartTracking}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              isTracking
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50'
            }`}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        </div>
      </main>
    </div>
  )
}
