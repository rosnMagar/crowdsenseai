export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export interface AccessPoint {
  bssid: string
  ssid: string
  signalStrength?: number
  timestamp?: number
}

export interface PredictionPoint {
  location: LocationData
  signalStrength?: number
  confidence?: number
}

export interface SessionMetadata {
  device?: string
  userAgent?: string
  appVersion?: string
}

export interface Session {
  id: string
  createdAt: string
  metadata: SessionMetadata
  locations: LocationData[]
  accessPoints: AccessPoint[]
  predictions: PredictionPoint[]
}

export interface AppState {
  currentLocation: LocationData | null
  locationHistory: LocationData[]
  isTracking: boolean
  accessPoints: AccessPoint[]
  predictions: PredictionPoint[]
  currentSession: Session | null
}
