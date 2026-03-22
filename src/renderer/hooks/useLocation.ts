import { useTrackingContext } from '../contexts/TrackingContext'
import { LocationDataWifi } from './useWifi'

interface UseLocationReturn {
  location: LocationDataWifi | null
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
