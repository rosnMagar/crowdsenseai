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
  onNavigate?: (page: string) => void
}

export default function MapScreen({ location, locationHistory, isTracking, onToggleTracking, onNavigate }: MapScreenProps) {
  const { theme } = useTheme()

  const handleStartTracking = useCallback(() => {
    onToggleTracking()
  }, [onToggleTracking])

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header title="Network Cartographer" onNavigate={onNavigate} />
      
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <MapView 
            currentLocation={location}
            locationHistory={locationHistory}
          />
        </div>

        <div className="absolute bottom-32 left-4 right-4 z-10 md:w-80 md:left-6 md:bottom-24">
          <div className={`backdrop-blur-2xl border p-3 shadow-2xl ${
            theme === 'dark'
              ? 'bg-ink-black/90 border-air-force-blue/10'
              : 'bg-cornsilk/90 border-tea-green/10'
          }`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 text-air-force-blue dark:text-tea-green">Current Sector</p>
                <h2 className="text-lg font-headline font-bold tracking-tight">
                  {location ? 'Your Location' : 'Waiting for GPS...'}
                </h2>
              </div>
              <div className="flex items-center gap-1 bg-dark-teal/20 px-2 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-dark-teal"></span>
                <span className="text-[10px] font-bold uppercase">{isTracking ? 'Active' : 'Paused'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2 ${theme === 'dark' ? 'bg-dark-teal/50' : 'bg-papaya-whip'}`}>
                <p className="text-[10px] uppercase mb-1 text-air-force-blue dark:text-tea-green">Signal</p>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-bold text-bronze dark:text-ash-grey">
                    {location?.accuracy ? Math.round(location.accuracy) : '--'}
                  </span>
                  <span className="text-[10px] mb-1 text-air-force-blue dark:text-tea-green">m</span>
                </div>
              </div>
              <div className={`p-2 ${theme === 'dark' ? 'bg-dark-teal/50' : 'bg-papaya-whip'}`}>
                <p className="text-[10px] uppercase mb-1 text-air-force-blue dark:text-tea-green">Points</p>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-bold text-bronze dark:text-ash-grey">{locationHistory.length}</span>
                  <span className="text-[10px] mb-1 text-air-force-blue dark:text-tea-green">logged</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`absolute bottom-20 md:bottom-0 left-0 right-0 backdrop-blur-xl border-t px-6 py-3 flex items-center justify-between z-20 ${
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
