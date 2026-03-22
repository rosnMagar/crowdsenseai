import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type ConsentState = boolean | null

interface LocationContextType {
  locationSharing: ConsentState
  hasDecided: boolean
  setLocationSharing: (value: boolean) => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

const STORAGE_KEY = 'crowdsenseai-location-consent'

declare const __RESET_CONSENT__: boolean

export function LocationProvider({ children }: { children: ReactNode }) {
  const [locationSharing, setLocationSharingState] = useState<ConsentState>(() => {
    if (typeof __RESET_CONSENT__ !== 'undefined' && __RESET_CONSENT__) return null
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
    return null
  })

  const hasDecided = locationSharing !== null

  useEffect(() => {
    if (locationSharing !== null) {
      localStorage.setItem(STORAGE_KEY, String(locationSharing))
    }
  }, [locationSharing])

  const setLocationSharing = (value: boolean) => {
    setLocationSharingState(value)
  }

  return (
    <LocationContext.Provider value={{ locationSharing, hasDecided, setLocationSharing }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocationConsent() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocationConsent must be used within a LocationProvider')
  }
  return context
}
