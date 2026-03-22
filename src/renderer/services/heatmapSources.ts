import { HeatmapPoint, HeatmapSource, WIFI_COLOR_SCHEME } from '../types/heatmap'
import { WifiKriging, SignalReading } from './wifi-kriging'
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

const METERS_PER_DEGREE_LAT = 111320

function latLonToMeters(lat: number, lon: number, refLat: number, refLon: number): { x: number; y: number } {
  const latDiff = lat - refLat
  const lonDiff = lon - refLon
  const y = latDiff * METERS_PER_DEGREE_LAT
  const x = lonDiff * METERS_PER_DEGREE_LAT * Math.cos(refLat * Math.PI / 180)
  return { x, y }
}

function metersToLatLon(x: number, y: number, refLat: number, refLon: number): { lat: number; lon: number } {
  const lat = refLat + y / METERS_PER_DEGREE_LAT
  const lon = refLon + x / (METERS_PER_DEGREE_LAT * Math.cos(refLat * Math.PI / 180))
  return { lat, lon }
}

function observationsToReadings(observations: WifiObservation[], refLat: number, refLon: number): SignalReading[] {
  return observations.map(obs => {
    const { x, y } = latLonToMeters(obs.latitude, obs.longitude, refLat, refLon)
    const signalNormalized = Math.min(100, Math.max(0, obs.signalStrength + 100))
    return { x, y, signal: signalNormalized }
  })
}

export function getWifiHeatmapPoints(
  observations: WifiObservation[],
  bounds: MapBounds = DEFAULT_BOUNDS,
  gridSize: number = 100
): HeatmapPoint[] {
  if (observations.length === 0) {
    return []
  }

  const centerLat = (bounds.minLat + bounds.maxLat) / 2
  const centerLon = (bounds.minLon + bounds.maxLon) / 2

  const readings = observationsToReadings(observations, centerLat, centerLon)

  const kriging = new WifiKriging({
    lengthScale: 80,
    noiseVariance: 0.01
  })

  kriging.setReadings(readings)

  const predictions: HeatmapPoint[] = []
  const latStep = (bounds.maxLat - bounds.minLat) / gridSize
  const lonStep = (bounds.maxLon - bounds.minLon) / gridSize

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = bounds.minLat + i * latStep
      const lon = bounds.minLon + j * lonStep

      const { x, y } = latLonToMeters(lat, lon, centerLat, centerLon)
      const prediction = kriging.predict(x, y)

      const normalized = Math.min(1, Math.max(0, prediction / 100))

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
