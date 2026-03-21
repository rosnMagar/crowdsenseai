import { useState, useEffect, useCallback, useRef } from 'react'
import MapView from './components/MapView'
import LocationPanel from './components/LocationPanel'
import StatusBar from './components/StatusBar'
import { useLocation } from './hooks/useLocation'
import { LocationData, Session, SessionMetadata } from './types'
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

  useEffect(() => {
    if (location) {
      setLocationHistory(prev => [...prev.slice(-99), location])

      if (sessionIdRef.current) {
        addLocationToSession(sessionIdRef.current, location)
      }
    }
  }, [location])

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
          />
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
