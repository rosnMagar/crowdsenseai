import { HeatmapPoint, HeatmapSource, WIFI_COLOR_SCHEME } from '../types/heatmap'
import { GaussianProcessRegressor } from './ai'
import { WifiObservation, getWifiObservations } from './wifiTracker'

export interface WifiScanResult {
  bssid: string
  ssid: string
  signal: number
  channel?: number
  frequency?: number
  quality?: number
  security?: string
  quadrantId: string
}

let wifiDataStore: WifiScanResult[] = []

export function registerWifiData(data: WifiScanResult[]) {
  wifiDataStore = data
}

export interface MapBounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

const DEFAULT_BOUNDS: MapBounds = {
  minLat: 40.1795,
  maxLat: 40.1895,
  minLon: -92.5864,
  maxLon: -92.5764
}

export function getWifiHeatmapPoints(
  observations: WifiObservation[],
  bounds: MapBounds = DEFAULT_BOUNDS,
  gridSize: number = 15
): HeatmapPoint[] {
  if (observations.length === 0) {
    return []
  }

  const gpr = new GaussianProcessRegressor({
    lengthScale: 0.002,
    variance: 1.0,
    noise: 0.5
  })

  observations.forEach(obs => {
    gpr.addTrainingPoint([obs.latitude, obs.longitude], obs.signalStrength)
  })

  const predictions: HeatmapPoint[] = []
  const latStep = (bounds.maxLat - bounds.minLat) / gridSize
  const lonStep = (bounds.maxLon - bounds.minLon) / gridSize

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = bounds.minLat + i * latStep
      const lon = bounds.minLon + j * lonStep
      const result = gpr.predict([[lat, lon]])
      const prediction = result.predictions[0]

      const normalized = Math.min(1, Math.max(0, (prediction + 100) / 70))

      predictions.push({
        quadrantId: `wifi_${i}_${j}`,
        value: normalized,
        bounds: {
          minLat: lat,
          maxLat: lat + latStep,
          minLon: lon,
          maxLon: lon + lonStep,
          centerLat: lat + latStep / 2,
          centerLon: lon + lonStep / 2
        },
        metadata: { signal: prediction }
      })
    }
  }

  return predictions
}

export function getWifiIntensityHeatmapSource(): HeatmapSource {
  return {
    id: 'wifi-intensity',
    name: 'WiFi Signal',
    description: 'WiFi signal strength from node-wifi scans',
    colorScheme: WIFI_COLOR_SCHEME,
    icon: 'wifi',
    getData: () => {
      const observations = getWifiObservations()
      return getWifiHeatmapPoints(observations)
    }
  }
}
