import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { HeatmapSource, HeatmapPoint, HeatmapLayerConfig, DEFAULT_LAYER_CONFIG } from '../types/heatmap'
import { useAIPredictions } from '../hooks/useAIPredictions'
import { quadrantToLatLon, getAllQuadrantIds } from '../services/grid'
import type { QuadrantDensity } from '../types'

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

export function HeatmapProvider({ children }: HeatmapProviderProps) {
  const [sources, setSources] = useState<Map<string, HeatmapSource>>(new Map())
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null)
  const [layerConfig, setLayerConfigState] = useState<HeatmapLayerConfig>(DEFAULT_LAYER_CONFIG)
  const { quadrants } = useAIPredictions()

  const registeredSources = useMemo(() => Array.from(sources.values()), [sources])

  const currentSource = useMemo(() => {
    return currentSourceId ? sources.get(currentSourceId) || null : null
  }, [sources, currentSourceId])

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

  const heatmapData = useMemo<HeatmapPoint[]>(() => {
    if (!currentSource) return []
    
    if (currentSource.id === 'density') {
      return densityHeatmapData
    }
    
    return currentSource.getData()
  }, [currentSource, densityHeatmapData])

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

  useEffect(() => {
    const qIds = getAllQuadrantIds()
    const defaultDensitySource: HeatmapSource = {
      id: 'density',
      name: 'Crowd Density',
      description: 'AI-predicted crowd density based on historical patterns',
      colorScheme: [[50, 50, 50], [56, 189, 248], [251, 191, 36], [239, 68, 68]],
      icon: 'users',
      getData: () => densityHeatmapData
    }
    
    registerSource(defaultDensitySource)
  }, [registerSource, densityHeatmapData])

  const value: HeatmapContextValue = {
    currentSourceId,
    sources: registeredSources,
    setCurrentSource,
    registerSource,
    unregisterSource,
    heatmapData,
    layerConfig,
    setLayerConfig,
    getCurrentSource
  }

  return (
    <HeatmapContext.Provider value={value}>
      {children}
    </HeatmapContext.Provider>
  )
}

export function createHeatmapSource<S extends HeatmapSource = HeatmapSource>(
  config: Omit<S, 'getData'> & { getData: () => HeatmapPoint[] }
): S {
  return config as S
}
