import type { QuadrantBounds, DensityLevel } from '../types'
import { latLonToQuadrant, quadrantToLatLon } from './grid'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface APIQuadrant {
  id: string
  density: number
  bounds: QuadrantBounds
}

export interface APIHeatmap {
  timestamp: string
  minutesAhead: number
  quadrants: APIQuadrant[]
}

export interface PredictResponse {
  success: boolean
  currentTime: string
  requestedHour: number
  requestedDay: number
  hasSnapshot: boolean
  heatmaps: APIHeatmapFull[]
  error?: string
  code?: string
}

export interface APIHeatmapFull {
  timestamp: string
  minutesAhead: number
  blendInfo: { current: number; historical: number }
  quadrants: Array<{
    id: string
    density: number
    densityLevel: number
    bounds: QuadrantBounds
    currentDensity: number
    historicalDensity: number
  }>
}

export interface RealTimeData {
  quadrantId: string
  userCount: number
  locations?: { latitude: number; longitude: number; timestamp: number }[]
}

export async function fetchPredictions(snapshot?: RealTimeData[]): Promise<PredictResponse | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured')
    return null
  }

  try {
    const body = snapshot && snapshot.length > 0 
      ? { snapshot: snapshot.map(s => ({ quadrantId: s.quadrantId, userCount: s.userCount })) }
      : {}

    const response = await fetch(`${supabaseUrl}/functions/v1/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Prediction API error:', errorData)
      return { success: false, currentTime: '', heatmaps: [], ...errorData }
    }

    const data = await response.json()
    return data as PredictResponse
  } catch (error) {
    console.error('Failed to fetch predictions:', error)
    return null
  }
}

export async function fetchRealTimeUsers(minutesBack: number = 5): Promise<RealTimeData[]> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured')
    return []
  }

  try {
    const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000).toISOString()
    
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, locations')
      .gte('created_at', cutoffTime)

    if (error) {
      console.error('Failed to fetch real-time data:', error)
      return []
    }

    const quadrantUsers = new Map<string, RealTimeData>()

    for (const session of sessions || []) {
      if (!session.locations || !Array.isArray(session.locations)) continue

      const recentLocations = session.locations.filter((loc: any) => {
        return new Date(loc.timestamp) >= new Date(cutoffTime)
      })

      for (const loc of recentLocations) {
        const qId = latLonToQuadrant(loc.latitude, loc.longitude)
        
        if (!quadrantUsers.has(qId)) {
          const bounds = quadrantToLatLon(qId)
          quadrantUsers.set(qId, {
            quadrantId: qId,
            userCount: 0,
            locations: []
          })
        }

        const entry = quadrantUsers.get(qId)!
        entry.userCount++
        if (entry.locations) {
          entry.locations.push({
            latitude: loc.latitude,
            longitude: loc.longitude,
            timestamp: loc.timestamp
          })
        }
      }
    }

    return Array.from(quadrantUsers.values())
  } catch (error) {
    console.error('Failed to fetch real-time users:', error)
    return []
  }
}

export function userCountToDensityLevel(userCount: number): DensityLevel {
  if (userCount === 0) return 0
  if (userCount <= 2) return 1
  if (userCount <= 5) return 2
  return 3
}

export function densityToLevel(density: number): DensityLevel {
  return Math.min(3, Math.max(0, Math.floor(density))) as DensityLevel
}
