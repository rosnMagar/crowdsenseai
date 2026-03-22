import { useState, useCallback, useEffect, useRef } from 'react'
import { useHeatmap } from '../contexts/HeatmapContext'
import { registerWifiData, getWifiIntensityHeatmapSource, WifiScanResult } from '../services/heatmapSources'

export interface WifiAccessPoint {
  bssid: string
  ssid: string
  signal: number
  channel: number
  frequency: number
  quality: number
  security: string
}

export interface WifiStats {
  averageSignal: number
  networkCount: number
  signalQuality: 'excellent' | 'good' | 'fair' | 'poor'
  dominantChannel: number | null
  bands: { '2.4GHz': number; '5GHz': number }
}

declare global {
  interface Window {
    electronAPI: {
      getLocation: () => Promise<unknown>
      log: (level: string, message: string) => void
      onLocationUpdate: (callback: (location: unknown) => void) => void
      wifi: {
        scan: () => Promise<WifiScanResult[]>
        getCurrentConnections: () => Promise<WifiScanResult[]>
        getSignalStrength: () => Promise<number>
      }
    }
  }
}

const SCAN_INTERVAL = 10000

export function useWifi() {
  const [networks, setNetworks] = useState<WifiAccessPoint[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { registerSource } = useHeatmap()

  const calculateStats = useCallback((aps: WifiAccessPoint[]): WifiStats => {
    if (aps.length === 0) {
      return {
        averageSignal: -100,
        networkCount: 0,
        signalQuality: 'poor',
        dominantChannel: null,
        bands: { '2.4GHz': 0, '5GHz': 0 }
      }
    }

    const avgSignal = Math.round(aps.reduce((sum, ap) => sum + ap.signal, 0) / aps.length)
    const quality = getSignalQuality(avgSignal)
    
    const channelCounts = new Map<number, number>()
    let count24GHz = 0
    let count5GHz = 0

    aps.forEach(ap => {
      channelCounts.set(ap.channel, (channelCounts.get(ap.channel) || 0) + 1)
      if (ap.frequency < 3000) count24GHz++
      else count5GHz++
    })

    let dominantChannel: number | null = null
    let maxCount = 0
    channelCounts.forEach((count, channel) => {
      if (count > maxCount) {
        maxCount = count
        dominantChannel = channel
      }
    })

    return {
      averageSignal: avgSignal,
      networkCount: aps.length,
      signalQuality: quality,
      dominantChannel,
      bands: { '2.4GHz': count24GHz, '5GHz': count5GHz }
    }
  }, [])

  const scan = useCallback(async () => {
    if (!window.electronAPI?.wifi) {
      setError('WiFi API not available')
      setIsSupported(false)
      return []
    }

    setIsScanning(true)
    setError(null)

    try {
      const results = await window.electronAPI.wifi.scan()
      
      const formattedNetworks: WifiAccessPoint[] = results.map(r => ({
        bssid: r.bssid,
        ssid: r.ssid || 'Hidden Network',
        signal: r.signal,
        channel: r.channel ?? 0,
        frequency: r.frequency ?? 2400,
        quality: r.quality ?? 0,
        security: r.security ?? 'unknown'
      }))

      setNetworks(formattedNetworks)
      setLastScanTime(new Date())

      const wifiResults: WifiScanResult[] = formattedNetworks.map(n => ({
        bssid: n.bssid,
        ssid: n.ssid,
        signal: n.signal,
        quadrantId: `q_${n.channel}` 
      }))
      registerWifiData(wifiResults)

      return formattedNetworks
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed'
      setError(message)
      window.electronAPI.log('error', `WiFi scan failed: ${message}`)
      return []
    } finally {
      setIsScanning(false)
    }
  }, [])

  const startAutoScan = useCallback(() => {
    if (intervalRef.current) return
    
    scan()
    intervalRef.current = setInterval(scan, SCAN_INTERVAL)
  }, [scan])

  const stopAutoScan = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    registerSource(getWifiIntensityHeatmapSource())
  }, [registerSource])

  useEffect(() => {
    return () => {
      stopAutoScan()
    }
  }, [stopAutoScan])

  return {
    networks,
    isScanning,
    isSupported,
    error,
    lastScanTime,
    scan,
    startAutoScan,
    stopAutoScan,
    stats: calculateStats(networks)
  }
}

function getSignalQuality(signal: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (signal >= -50) return 'excellent'
  if (signal >= -60) return 'good'
  if (signal >= -70) return 'fair'
  return 'poor'
}

export function getSignalBars(signal: number): number {
  if (signal >= -50) return 4
  if (signal >= -60) return 3
  if (signal >= -70) return 2
  if (signal >= -80) return 1
  return 0
}

export function formatFrequency(frequency: number): string {
  if (frequency < 3000) return '2.4 GHz'
  if (frequency < 6000) return '5 GHz'
  return '6 GHz'
}
