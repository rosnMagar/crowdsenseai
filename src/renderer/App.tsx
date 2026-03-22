
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import MapScreen from './pages/MapScreen'
import InsightsScreen from './pages/InsightsScreen'
import HistoryScreen from './pages/HistoryScreen'
import SettingsScreen from './pages/SettingsScreen'
import { useLocation } from './hooks/useLocation'
import { useAIPredictions } from './hooks/useAIPredictions'
import { HeatmapProvider } from './contexts/HeatmapContext'
import { WifiProvider } from './contexts/WifiContext'
import type { LocationDataWifi } from './hooks/useWifi'
import type { Session, SessionMetadata } from './types'
import { createSession, addLocationToSession } from './services/supabase'

type Page = 'map' | 'insights' | 'history' | 'settings'

function AppContent() {
  const { location, isTracking, startTracking, stopTracking, refreshLocation, error } = useLocation()
  const [currentPage, setCurrentPage] = useState<Page>('map')
  const [locationHistory, setLocationHistory] = useState<LocationDataWifi[]>([])
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const {
    quadrants,
    isLoading: isAILoading,
    confidence,
    updatePredictions,
    getHeatmapAt,
    trainingCountdown,
    lastUpdated,
    realTimeUsers
  } = useAIPredictions()

  const [showHeatmap, setShowHeatmap] = useState(false)
  const [timeOffset, setTimeOffset] = useState(0)

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

  const handleNavigate = useCallback((page: Page) => {
    setCurrentPage(page)
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'map':
        return (
          <MapScreen
            location={location}
            locationHistory={locationHistory}
            isTracking={isTracking}
            onToggleTracking={handleToggleTracking}
            onNavigate={handleNavigate}
            quadrants={quadrants}
            showHeatmap={showHeatmap}
            setShowHeatmap={setShowHeatmap}
            timeOffset={timeOffset}
            setTimeOffset={setTimeOffset}
            getHeatmapAt={getHeatmapAt}
            isAILoading={isAILoading}
            confidence={confidence}
            trainingCountdown={trainingCountdown}
            lastUpdated={lastUpdated}
            realTimeUsers={realTimeUsers}
          />
        )
      case 'insights':
        return <InsightsScreen onNavigate={handleNavigate as any} />
      case 'history':
        return <HistoryScreen history={locationHistory} onNavigate={handleNavigate as any} />
      case 'settings':
        return <SettingsScreen onNavigate={handleNavigate as any} />
      default:
        return (
          <MapScreen
            location={location}
            locationHistory={locationHistory}
            isTracking={isTracking}
            onToggleTracking={handleToggleTracking}
            onNavigate={handleNavigate}
            quadrants={quadrants}
            showHeatmap={showHeatmap}
            setShowHeatmap={setShowHeatmap}
            timeOffset={timeOffset}
            setTimeOffset={setTimeOffset}
            getHeatmapAt={getHeatmapAt}
            isAILoading={isAILoading}
            confidence={confidence}
            trainingCountdown={trainingCountdown}
            lastUpdated={lastUpdated}
            realTimeUsers={realTimeUsers}
          />
        )
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={(page) => setCurrentPage(page as Page)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 15, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(6px)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full flex flex-col isolate"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav currentPage={currentPage} onNavigate={(page) => setCurrentPage(page as Page)} />
    </div>
  )
}

function App() {
  return (
    <HeatmapProvider>
      <WifiProvider>
        <AppContent />
      </WifiProvider>
    </HeatmapProvider>
  )
}

export default App
