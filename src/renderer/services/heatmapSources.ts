import { HeatmapPoint, HeatmapSource, DENSITY_COLOR_SCHEME, WIFI_COLOR_SCHEME } from '../types/heatmap'
import { quadrantToLatLon, getAllQuadrantIds } from '../services/grid'

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

export function getDensityHeatmapSource(): HeatmapSource {
  return {
    id: 'density',
    name: 'Crowd Density',
    description: 'AI-predicted crowd density based on historical patterns',
    colorScheme: DENSITY_COLOR_SCHEME,
    icon: 'users',
    getData: () => {
      return wifiDataStore.map(entry => {
        const bounds = quadrantToLatLon(entry.quadrantId)
        if (!bounds) return null
        
        const normalizedSignal = Math.min(1, Math.max(0, (entry.signal + 100) / 70))
        
        return {
          quadrantId: entry.quadrantId,
          value: normalizedSignal,
          bounds,
          metadata: { ssid: entry.ssid, signal: entry.signal }
        } as HeatmapPoint
      }).filter(Boolean) as HeatmapPoint[]
    }
  }
}

export function getWifiIntensityHeatmapSource(): HeatmapSource {
  return {
    id: 'wifi-intensity',
    name: 'WiFi Signal',
    description: 'WiFi signal strength distribution from node-wifi scans',
    colorScheme: WIFI_COLOR_SCHEME,
    icon: 'wifi',
    getData: () => {
      if (wifiDataStore.length === 0) {
        const qIds = getAllQuadrantIds()
        return qIds.map(qId => {
          const bounds = quadrantToLatLon(qId)
          if (!bounds) return null
          return {
            quadrantId: qId,
            value: 0,
            bounds,
            metadata: {}
          } as HeatmapPoint
        }).filter(Boolean) as HeatmapPoint[]
      }
      
      return wifiDataStore.map(entry => {
        const bounds = quadrantToLatLon(entry.quadrantId)
        if (!bounds) return null
        
        const normalizedSignal = Math.min(1, Math.max(0, (entry.signal + 100) / 70))
        
        return {
          quadrantId: entry.quadrantId,
          value: normalizedSignal,
          bounds,
          metadata: { ssid: entry.ssid, signal: entry.signal }
        } as HeatmapPoint
      }).filter(Boolean) as HeatmapPoint[]
    }
  }
}
