import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { HeatmapSource, HeatmapPoint, HeatmapLayerConfig, DEFAULT_LAYER_CONFIG, DENSITY_COLOR_SCHEME } from '../types/heatmap'
import { useAIPredictions } from '../hooks/useAIPredictions'
import { WifiObservation } from '../services/wifiTracker'
import { getWifiHeatmapPoints } from '../services/heatmapSources'
import { fetchWifiData } from '../services/api'

interface HeatmapContextValue {
  currentSourceId: string | null
  sources: HeatmapSource[]
  setCurrentSource: (id: string) => void
  registerSource: (source: HeatmapSource) => void
  unregisterSource: (id: string) => void
  heatmapData: HeatmapPoint[]
  layerConfig: HeatmapLayerConfig
  setLayerConfig: (config: Partial<HeatmapLayerConfig>) => void
  getCurrentSource: () => HeatmapSource | null
  wifiObservations: WifiObservation[]
  addWifiObservation: (obs: WifiObservation) => void
  clearWifiObservations: () => void
  wifiHeatmapData: HeatmapPoint[]
}

const HeatmapContext = createContext<HeatmapContextValue | null>(null)

export function useHeatmap(): HeatmapContextValue {
  const context = useContext(HeatmapContext)
  if (!context) {
    throw new Error('useHeatmap must be used within a HeatmapProvider')
  }
  return context
}

interface HeatmapProviderProps {
  children: React.ReactNode
}

/**
 * Context provider for managing multiple heatmap sources (e.g., WiFi intensity, Crowd density).
 * Handles data fetching, aggregation, and active source switching.
 */
export function HeatmapProvider({ children }: HeatmapProviderProps) {
  const [sources, setSources] = useState<Map<string, HeatmapSource>>(new Map())
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null)
  const [layerConfig, setLayerConfigState] = useState<HeatmapLayerConfig>(DEFAULT_LAYER_CONFIG)
  const [wifiObservations, setWifiObservations] = useState<WifiObservation[]>([])
  const { quadrants } = useAIPredictions()

  const registeredSources = useMemo(() => Array.from(sources.values()), [sources])

  /**
   * Returns the currently active heatmap source object.
   */
  const currentSource = useMemo(() => {
    return currentSourceId ? sources.get(currentSourceId) || null : null
  }, [sources, currentSourceId])

  /**
   * Aggregates AI-predicted quadrant density into displayable heatmap points.
   */
  const densityHeatmapData = useMemo<HeatmapPoint[]>(() => {
    return quadrants
      .filter(q => q.density > 0)
      .map(q => ({
        quadrantId: q.quadrantId,
        value: q.density / 3,
        bounds: q.bounds,
        metadata: { count: q.count }
      }))
  }, [quadrants])

  /**
   * Generates heatmap points from raw WiFi signal observations if the source is active.
   */
  const wifiHeatmapData = useMemo<HeatmapPoint[]>(() => {
    if (currentSourceId === 'wifi-intensity' && wifiObservations.length > 0) {
      return getWifiHeatmapPoints(wifiObservations)
    }
    return []
  }, [currentSourceId, wifiObservations])

  /**
   * Final data set for the map visualization, depending on the active source.
   */
  const heatmapData = useMemo<HeatmapPoint[]>(() => {
    if (!currentSource) return densityHeatmapData
    
    if (currentSource.id === 'density') {
      return densityHeatmapData
    }
    
    if (currentSource.id === 'wifi-intensity') {
      return wifiHeatmapData
    }
    
    return currentSource.getData()
  }, [currentSource, densityHeatmapData, wifiHeatmapData])

  /**
   * Registers a new data source for the heatmap system.
   */
  const registerSource = useCallback((source: HeatmapSource) => {
    setSources(prev => {
      const next = new Map(prev)
      next.set(source.id, source)
      return next
    })
    
    if (!currentSourceId) {
      setCurrentSourceId(source.id)
    }
  }, [currentSourceId])

  const unregisterSource = useCallback((id: string) => {
    setSources(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    
    if (currentSourceId === id) {
      const remaining = Array.from(sources.keys()).filter(k => k !== id)
      setCurrentSourceId(remaining[0] || null)
    }
  }, [currentSourceId, sources])

  const setCurrentSource = useCallback((id: string) => {
    if (sources.has(id)) {
      setCurrentSourceId(id)
    }
  }, [sources])

  const setLayerConfig = useCallback((config: Partial<HeatmapLayerConfig>) => {
    setLayerConfigState(prev => ({ ...prev, ...config }))
  }, [])

  const getCurrentSource = useCallback(() => currentSource, [currentSource])

  const addWifiObservation = useCallback((obs: WifiObservation) => {
    setWifiObservations(prev => {
      const updated = [...prev, obs]
      if (updated.length > 100) {
        return updated.slice(-100)
      }
      return updated
    })
  }, [])

  const clearWifiObservations = useCallback(() => {
    setWifiObservations([])
  }, [])

  useEffect(() => {
    if (sources.size === 0) {
      const defaultDensitySource: HeatmapSource = {
        id: 'density',
        name: 'Crowd Density',
        description: 'AI-predicted crowd density based on historical patterns',
        colorScheme: DENSITY_COLOR_SCHEME,
        icon: 'users',
        getData: () => densityHeatmapData
      }
      
      const wifiSource: HeatmapSource = {
        id: 'wifi-intensity',
        name: 'WiFi Signal',
        description: 'WiFi signal strength from nearby networks',
        colorScheme: DENSITY_COLOR_SCHEME,
        icon: 'wifi',
        getData: () => []
      }
      
      registerSource(defaultDensitySource)
      registerSource(wifiSource)
    }
  }, [sources.size, registerSource, densityHeatmapData])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    
    const loadRealWifiData = async () => {
      try {
        const data = await fetchWifiData(0) // 0 means fetch ALL historical data
        if (data.length > 0) {
          const formattedObs: WifiObservation[] = data.map((d, i) => ({
            id: `db_${i}`,
            latitude: d.latitude,
            longitude: d.longitude,
            signalStrength: d.signal,
            ssid: d.ssid,
            bssid: d.bssid,
            frequency: 2400,
            timestamp: Date.now()
          }))
          // Limit to a higher number so we show the full historical map
          setWifiObservations(formattedObs.slice(-5000))
        }
      } catch (err) {
        console.error('Failed to fetch wifi data from DB', err)
      }
    }

    if (currentSourceId === 'wifi-intensity') {
      loadRealWifiData()
      interval = setInterval(loadRealWifiData, 10000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentSourceId])

  const value: HeatmapContextValue = {
    currentSourceId,
    sources: registeredSources,
    setCurrentSource,
    registerSource,
    unregisterSource,
    heatmapData,
    layerConfig,
    setLayerConfig,
    getCurrentSource,
    wifiObservations,
    addWifiObservation,
    clearWifiObservations,
    wifiHeatmapData
  }

  return (
    <HeatmapContext.Provider value={value}>
      {children}
    </HeatmapContext.Provider>
  )
}
