import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { LocationData } from '../types'

interface TrackingContextType {
  location: LocationData | null
  error: string | null
  isTracking: boolean
  startTracking: () => void
  stopTracking: () => void
  refreshLocation: () => Promise<void>
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined)

const DEFAULT_POLL_INTERVAL = 300000

interface TrackingProviderProps {
  children: ReactNode
}

export function TrackingProvider({ children }: TrackingProviderProps) {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLocation = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getLocation()
        setLocation(data)
        setError(null)
      } else {
        setError('Electron API not available')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location')
    }
  }, [])

  const startTracking = useCallback(() => {
    setIsTracking(true)
    fetchLocation()

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(fetchLocation, DEFAULT_POLL_INTERVAL)
  }, [fetchLocation])

  const stopTracking = useCallback(() => {
    setIsTracking(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const refreshLocation = useCallback(async () => {
    await fetchLocation()
  }, [fetchLocation])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <TrackingContext.Provider value={{ location, error, isTracking, startTracking, stopTracking, refreshLocation }}>
      {children}
    </TrackingContext.Provider>
  )
}

export function useTrackingContext() {
  const context = useContext(TrackingContext)
  if (context === undefined) {
    throw new Error('useTrackingContext must be used within a TrackingProvider')
  }
  return context
}
