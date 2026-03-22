import { useTrackingContext } from '../contexts/TrackingContext'
import { LocationData } from '../types'

interface UseLocationReturn {
  location: LocationData | null
  error: string | null
  isTracking: boolean
  startTracking: () => void
  stopTracking: () => void
  refreshLocation: () => Promise<void>
}

export function useLocation(): UseLocationReturn {
  const { location, error, isTracking, startTracking, stopTracking, refreshLocation } = useTrackingContext()
  return { location, error, isTracking, startTracking, stopTracking, refreshLocation }
}
