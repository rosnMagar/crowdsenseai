import { useState, useEffect, useCallback, useRef } from 'react'
import MapView from './components/MapView'
import LocationPanel from './components/LocationPanel'
import StatusBar from './components/StatusBar'
import TimeSlider from './components/TimeSlider'
import { HeatmapLegend } from './components/HeatmapOverlay'
import { useLocation } from './hooks/useLocation'
import { useAIPredictions } from './hooks/useAIPredictions'
import type { LocationData, Session, SessionMetadata, QuadrantDensity } from './types'
import { createSession, addLocationToSession } from './services/supabase'

declare global {
  interface Window {
    electronAPI: {
      getLocation: () => Promise<LocationData>
      log: (level: string, message: string) => void
    }
  }
}

function App() {
  const { location, error, isTracking, startTracking, stopTracking, refreshLocation } = useLocation()
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([])
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const {
    quadrants,
    isLoading: isAILoading,
    isTraining,
    confidence,
    updatePredictions,
    getHeatmapAt,
    trainingCountdown,
    lastUpdated,
    realTimeUsers,
    error: aiError
  } = useAIPredictions()

  const [showHeatmap, setShowHeatmap] = useState(false)
  const [timeOffset, setTimeOffset] = useState(0)
  const [heatmapQuadrants, setHeatmapQuadrants] = useState<QuadrantDensity[]>([])
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (location) {
      setLocationHistory(prev => [...prev.slice(-99), location])

      if (sessionIdRef.current) {
        addLocationToSession(sessionIdRef.current, location)
      }
    }
  }, [location])

  useEffect(() => {
    if (showHeatmap && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      updatePredictions()
    }
  }, [showHeatmap, updatePredictions])

  useEffect(() => {
    if (!showHeatmap) {
      setHeatmapQuadrants([])
      return
    }

    if (quadrants.length === 0) return

    if (timeOffset === 0) {
      setHeatmapQuadrants(quadrants)
      return
    }

    const targetHeatmap = getHeatmapAt(timeOffset)
    const updatedQuadrants = quadrants.map(q => ({
      ...q,
      density: targetHeatmap.get(q.quadrantId) ?? 0
    }))
    setHeatmapQuadrants(updatedQuadrants)
  }, [quadrants, showHeatmap, timeOffset, getHeatmapAt])

  const startNewSession = useCallback(async (metadata?: SessionMetadata) => {
    const session = await createSession(metadata)
    if (session) {
      sessionIdRef.current = session.id
      setCurrentSession(session)
    }
    return session
  }, [])

  const handleStartTracking = useCallback(async () => {
    if (!currentSession) {
      const metadata: SessionMetadata = {
        appVersion: '0.1.0',
        userAgent: navigator.userAgent,
        device: navigator.platform
      }
      await startNewSession(metadata)
    }
    startTracking()
  }, [currentSession, startNewSession, startTracking])

  const handleStopTracking = useCallback(() => {
    stopTracking()
  }, [stopTracking])

  const handleToggleTracking = useCallback(() => {
    if (isTracking) {
      handleStopTracking()
    } else {
      handleStartTracking()
    }
  }, [isTracking, handleStartTracking, handleStopTracking])

  const handleRefreshPredictions = useCallback(() => {
    updatePredictions()
  }, [updatePredictions])

  const formatCountdown = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return 'Never'
    return date.toLocaleTimeString()
  }

  const totalUsers = Array.from(realTimeUsers.values()).reduce((sum, count) => sum + count, 0)
  const activeQuadrants = realTimeUsers.size

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <StatusBar 
        isTracking={isTracking} 
        onToggleTracking={handleToggleTracking}
        locationCount={locationHistory.length}
        sessionId={currentSession?.id || null}
      />
      
      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <MapView 
            currentLocation={location}
            locationHistory={locationHistory}
            heatmapQuadrants={showHeatmap ? heatmapQuadrants : []}
            showHeatmap={showHeatmap}
            heatmapOpacity={0.6}
          />
          
          {showHeatmap && (
            <>
              <HeatmapLegend />
              
              <div className="absolute bottom-4 right-4 w-64">
                <TimeSlider
                  value={timeOffset}
                  onChange={setTimeOffset}
                  min={0}
                  max={60}
                  step={5}
                />
              </div>
              
              <div className="absolute top-4 left-4 bg-slate-800/90 rounded-lg p-3 backdrop-blur-sm min-w-52">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">
                    {timeOffset === 0 ? 'Live Data' : 'AI Prediction'}
                  </span>
                  <button
                    onClick={handleRefreshPredictions}
                    disabled={isAILoading}
                    className="text-[10px] text-sky-400 hover:text-sky-300 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
                
                {timeOffset === 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-sm text-emerald-400 font-medium">
                        {totalUsers} {totalUsers === 1 ? 'user' : 'users'} online
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {activeQuadrants} active quadrant{activeQuadrants !== 1 ? 's' : ''} (last 5 min)
                    </div>
                    {totalUsers === 0 && (
                      <div className="text-[10px] text-amber-400 mt-1">
                        Start tracking to see live data
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-sky-400 rounded-full" />
                      <span className="text-xs text-sky-400">
                        +{timeOffset} min prediction
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      AI confidence: {Math.round(confidence * 100)}%
                    </div>
                  </div>
                )}
                
                <div className="mt-3 pt-2 border-t border-slate-700">
                  <div className="text-[10px] text-slate-500">
                    Next AI training: {formatCountdown(trainingCountdown)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Updated: {formatLastUpdated(lastUpdated)}
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${showHeatmap 
                  ? 'bg-sky-500 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
            >
              {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
            </button>
          </div>
        </div>
        
        <LocationPanel
          location={location}
          history={locationHistory}
          error={error}
          onRefresh={refreshLocation}
        />
      </div>
    </div>
  )
}

export default App
