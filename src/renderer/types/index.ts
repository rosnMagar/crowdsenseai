export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
  wifiSignal?: number
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

export interface QuadrantBounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
  centerLat: number
  centerLon: number
}

export interface GridConfig {
  bounds: {
    west: number
    south: number
    east: number
    north: number
  }
  quadrantSizeMeters: number
  cols: number
  rows: number
  totalQuadrants: number
}

export type DensityLevel = 0 | 1 | 2 | 3

export interface QuadrantData {
  id: string
  quadrantId: string
  latitude: number
  longitude: number
  density: DensityLevel
  hourOfDay: number
  dayOfWeek: number
  sessionId?: string
  timestamp: string
  isPrediction: boolean
}

export interface QuadrantDensity {
  quadrantId: string
  density: DensityLevel
  bounds: QuadrantBounds
  count: number
}

export interface DensityHeatmap {
  timestamp: string
  quadrants: Map<string, DensityLevel>
}

export interface AILayerConfig {
  inputSize: number
  hiddenSizes: number[]
  outputSize: number
}

export interface AIWeights {
  id: string
  name: string
  updatedAt: string
  weights: number[][][]
  layerConfig: AILayerConfig
  accuracyScore?: number
  trainingCount: number
  isActive: boolean
}

export interface DailyComparison {
  id: string
  date: string
  quadrantId: string
  predictedDensity: number[]
  actualDensity?: DensityLevel
  errorScore?: number
}

export interface TrainingData {
  inputs: number[][]
  outputs: number[][]
}

export interface PredictionResult {
  quadrants: QuadrantDensity[]
  heatmaps: DensityHeatmap[]
  confidence: number
}
