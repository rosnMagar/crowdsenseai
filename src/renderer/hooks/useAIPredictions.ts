import { useState, useCallback, useEffect, useRef } from 'react'
import type { QuadrantDensity, DensityLevel } from '../types'
import { fetchPredictions, fetchRealTimeUsers } from '../services/api'
import { quadrantToLatLon, getAllQuadrantIds } from '../services/grid'

interface UseAIPredictionsReturn {
  quadrants: QuadrantDensity[]
  isLoading: boolean
  isTraining: boolean
  error: string | null
  confidence: number
  updatePredictions: () => Promise<void>
  getHeatmapAt: (minutesAhead: number) => Map<string, DensityLevel>
  trainingCountdown: number
  lastUpdated: Date | null
  realTimeUsers: Map<string, number>
}

const PREDICTION_INTERVAL = 5 * 60 * 1000

export function useAIPredictions(): UseAIPredictionsReturn {
  const [quadrants, setQuadrants] = useState<QuadrantDensity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [trainingCountdown, setTrainingCountdown] = useState(24 * 60 * 60)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [realTimeUsers, setRealTimeUsers] = useState<Map<string, number>>(new Map())
  
  const heatmapsRef = useRef<Map<number, Map<string, DensityLevel>>>(new Map())
  const realtimeDataRef = useRef<{ quadrantId: string; userCount: number }[]>([])

  const updatePredictions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const realData = await fetchRealTimeUsers(5)
      
      const userMap = new Map<string, number>()
      const snapshotData = realData.map(entry => {
        userMap.set(entry.quadrantId, entry.userCount)
        return { quadrantId: entry.quadrantId, userCount: entry.userCount }
      })
      
      setRealTimeUsers(userMap)
      realtimeDataRef.current = snapshotData
      
      const response = await fetchPredictions(snapshotData, 180)

      if (!response || !response.success) {
        setError(response?.error || 'Failed to fetch predictions')
        setIsLoading(false)
        return
      }

      heatmapsRef.current.clear()
      
      let totalCurrentWeight = 0
      
      for (const heatmap of response.heatmaps) {
        const quadrantMap = new Map<string, DensityLevel>()
        for (const q of heatmap.quadrants) {
          quadrantMap.set(q.id, q.densityLevel as DensityLevel)
        }
        heatmapsRef.current.set(heatmap.minutesAhead, quadrantMap)
        
        if (heatmap.minutesAhead === 0) {
          totalCurrentWeight = heatmap.blendInfo.current
        }
      }

      if (response.heatmaps.length > 0) {
        const currentHeatmap = response.heatmaps[0]
        const qDensities: QuadrantDensity[] = currentHeatmap.quadrants.map(q => ({
          quadrantId: q.id,
          density: q.densityLevel as DensityLevel,
          bounds: quadrantToLatLon(q.id)!,
          count: userMap.get(q.id) || 0
        }))
        setQuadrants(qDensities)
      }

      setConfidence(totalCurrentWeight > 0 ? 0.85 : 0.7)
      setLastUpdated(new Date(response.currentTime))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate predictions')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const initQuadrants = () => {
      const qIds = getAllQuadrantIds()
      const initQ = qIds.map(qId => {
        const bounds = quadrantToLatLon(qId)
        if (!bounds) return null
        return {
          quadrantId: qId,
          density: 0 as DensityLevel,
          bounds,
          count: 0
        }
      }).filter(Boolean) as QuadrantDensity[]
      
      setQuadrants(initQ)
    }

    initQuadrants()
    updatePredictions()
  }, [updatePredictions])

  useEffect(() => {
    const interval = setInterval(() => {
      updatePredictions()
    }, PREDICTION_INTERVAL)

    return () => clearInterval(interval)
  }, [updatePredictions])

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      setTrainingCountdown(Math.floor((midnight.getTime() - now.getTime()) / 1000))
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)
    return () => clearInterval(interval)
  }, [])

  const getHeatmapAt = useCallback((minutesAhead: number): Map<string, DensityLevel> => {
    if (minutesAhead === 0) {
      const heatmap = new Map<string, DensityLevel>()
      for (const q of quadrants) {
        heatmap.set(q.quadrantId, q.density)
      }
      return heatmap
    }

    return heatmapsRef.current.get(minutesAhead) || new Map()
  }, [quadrants])

  return {
    quadrants,
    isLoading,
    isTraining,
    error,
    confidence,
    updatePredictions,
    getHeatmapAt,
    trainingCountdown,
    lastUpdated,
    realTimeUsers
  }
}
