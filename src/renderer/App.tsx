import { useState, useCallback, useRef, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import MapScreen from './pages/MapScreen'
import InsightsScreen from './pages/InsightsScreen'
import HistoryScreen from './pages/HistoryScreen'
import SettingsScreen from './pages/SettingsScreen'
import { useLocation } from './hooks/useLocation'
import { LocationData, Session, SessionMetadata } from './types'
import { createSession, addLocationToSession } from './services/supabase'

type Page = 'map' | 'insights' | 'history' | 'settings'

function App() {
  const { location, isTracking, startTracking, stopTracking } = useLocation()
  const [currentPage, setCurrentPage] = useState<Page>('map')
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

  const handleToggleTracking = useCallback(async () => {
    if (isTracking) {
      stopTracking()
    } else {
      if (!currentSession) {
        const metadata: SessionMetadata = {
          appVersion: '0.1.0',
          userAgent: navigator.userAgent,
          device: navigator.platform
        }
        await startNewSession(metadata)
      }
      startTracking()
    }
  }, [isTracking, currentSession, startNewSession, startTracking, stopTracking])

  const renderPage = () => {
    switch (currentPage) {
      case 'map':
        return (
          <MapScreen
            location={location}
            locationHistory={locationHistory}
            isTracking={isTracking}
            onToggleTracking={handleToggleTracking}
          />
        )
      case 'insights':
        return <InsightsScreen />
      case 'history':
        return <HistoryScreen history={locationHistory} />
      case 'settings':
        return <SettingsScreen />
      default:
        return <MapScreen
          location={location}
          locationHistory={locationHistory}
          isTracking={isTracking}
          onToggleTracking={handleToggleTracking}
        />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={(page) => setCurrentPage(page as Page)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderPage()}
      </div>
      <BottomNav currentPage={currentPage} onNavigate={(page) => setCurrentPage(page as Page)} />
    </div>
  )
}

export default App
