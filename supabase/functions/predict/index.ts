import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOUNDS = {
  west: -92.586164,
  south: 40.179033,
  east: -92.576637,
  north: 40.190088
}

const ROWS = 24
const COLS = 16

const CLASSROOM_COL = 3
const CLASSROOM_ROWS = [10, 12, 14, 16, 18]
const DORM_COL = 11
const DORM_ROWS = [14, 15, 16, 17, 18, 19, 20, 21, 22]
const FOOD_QUADRANTS = ['Q_14_11', 'Q_20_11']
const QUAD_ROWS = [19, 20, 21]
const QUAD_COLS = [8, 9]
const GATHERING_ROWS = [12, 13, 17, 20, 22]
const GATHERING_COL = 7

function isClassroom(qId: string): boolean {
  const match = qId.match(/Q_(\d+)_(\d+)/)
  if (!match) return false
  const row = parseInt(match[1])
  const col = parseInt(match[2])
  return CLASSROOM_ROWS.includes(row) && col === CLASSROOM_COL
}

function isDorm(qId: string): boolean {
  const match = qId.match(/Q_(\d+)_(\d+)/)
  if (!match) return false
  const row = parseInt(match[1])
  const col = parseInt(match[2])
  return DORM_ROWS.includes(row) && col === DORM_COL
}

function isFood(qId: string): boolean {
  return FOOD_QUADRANTS.includes(qId)
}

function isQuad(qId: string): boolean {
  const match = qId.match(/Q_(\d+)_(\d+)/)
  if (!match) return false
  const row = parseInt(match[1])
  const col = parseInt(match[2])
  return QUAD_ROWS.includes(row) && QUAD_COLS.includes(col)
}

function isGathering(qId: string): boolean {
  const match = qId.match(/Q_(\d+)_(\d+)/)
  if (!match) return false
  const row = parseInt(match[1])
  const col = parseInt(match[2])
  return GATHERING_ROWS.includes(row) && col === GATHERING_COL
}

interface QuadrantBounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
  centerLat: number
  centerLon: number
}

interface QuadrantSnapshot {
  quadrantId: string
  userCount: number
}

function getQuadrantBounds(row: number, col: number): QuadrantBounds {
  const latStep = (BOUNDS.north - BOUNDS.south) / ROWS
  const lonStep = (BOUNDS.east - BOUNDS.west) / COLS
  
  return {
    minLat: BOUNDS.south + row * latStep,
    maxLat: BOUNDS.south + (row + 1) * latStep,
    minLon: BOUNDS.west + col * lonStep,
    maxLon: BOUNDS.west + (col + 1) * lonStep,
    centerLat: BOUNDS.south + (row + 0.5) * latStep,
    centerLon: BOUNDS.west + (col + 0.5) * lonStep
  }
}

function getAllQuadrantIds(): string[] {
  const ids: string[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ids.push(`Q_${row}_${col}`)
    }
  }
  return ids
}

const BASE_WEEKDAY: Record<number, number> = {
  0: 0.03, 1: 0.02, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.03,
  6: 0.08, 7: 0.25, 8: 0.55, 9: 0.70, 10: 0.75, 11: 0.70,
  12: 0.65, 13: 0.60, 14: 0.65, 15: 0.70, 16: 0.60, 17: 0.50,
  18: 0.45, 19: 0.50, 20: 0.55, 21: 0.45, 22: 0.30, 23: 0.15
}

const BASE_WEEKEND: Record<number, number> = {
  0: 0.05, 1: 0.03, 2: 0.02, 3: 0.01, 4: 0.01, 5: 0.01,
  6: 0.02, 7: 0.03, 8: 0.08, 9: 0.20, 10: 0.40, 11: 0.60,
  12: 0.70, 13: 0.75, 14: 0.70, 15: 0.65, 16: 0.55, 17: 0.45,
  18: 0.40, 19: 0.45, 20: 0.50, 21: 0.55, 22: 0.45, 23: 0.30
}

const DORM_PATTERN: Record<number, number> = {
  0: 0.60, 1: 0.70, 2: 0.75, 3: 0.80, 4: 0.75, 5: 0.65,
  6: 0.50, 7: 0.35, 8: 0.25, 9: 0.20, 10: 0.20, 11: 0.25,
  12: 0.30, 13: 0.25, 14: 0.25, 15: 0.30, 16: 0.35, 17: 0.45,
  18: 0.50, 19: 0.55, 20: 0.60, 21: 0.65, 22: 0.70, 23: 0.65
}

const CLASSROOM_PATTERN: Record<number, number> = {
  0: 0.01, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
  6: 0.05, 7: 0.15, 8: 0.60, 9: 0.85, 10: 0.90, 11: 0.85,
  12: 0.80, 13: 0.75, 14: 0.80, 15: 0.85, 16: 0.75, 17: 0.55,
  18: 0.20, 19: 0.10, 20: 0.08, 21: 0.05, 22: 0.03, 23: 0.02
}

const FOOD_PATTERN: Record<number, number> = {
  0: 0.02, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
  6: 0.05, 7: 0.40, 8: 0.70, 9: 0.40, 10: 0.30, 11: 0.35,
  12: 0.75, 13: 0.65, 14: 0.55, 15: 0.50, 16: 0.45, 17: 0.50,
  18: 0.60, 19: 0.75, 20: 0.65, 21: 0.40, 22: 0.25, 23: 0.15
}

const QUAD_PATTERN: Record<number, number> = {
  0: 0.01, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
  6: 0.10, 7: 0.30, 8: 0.50, 9: 0.60, 10: 0.65, 11: 0.60,
  12: 0.75, 13: 0.70, 14: 0.65, 15: 0.70, 16: 0.75, 17: 0.60,
  18: 0.50, 19: 0.45, 20: 0.40, 21: 0.30, 22: 0.20, 23: 0.10
}

const GATHERING_PATTERN: Record<number, number> = {
  0: 0.01, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
  6: 0.05, 7: 0.40, 8: 0.70, 9: 0.80, 10: 0.85, 11: 0.80,
  12: 0.75, 13: 0.70, 14: 0.75, 15: 0.80, 16: 0.85, 17: 0.80,
  18: 0.50, 19: 0.30, 20: 0.20, 21: 0.10, 22: 0.05, 23: 0.02
}

function getHistoricalDensity(qId: string, hour: number, dayOfWeek: number = 1): number {
  if (isDorm(qId)) {
    return DORM_PATTERN[hour]
  }
  
  if (isClassroom(qId)) {
    return CLASSROOM_PATTERN[hour]
  }
  
  if (isFood(qId)) {
    return FOOD_PATTERN[hour]
  }
  
  if (isQuad(qId)) {
    return QUAD_PATTERN[hour]
  }
  
  if (isGathering(qId)) {
    return GATHERING_PATTERN[hour]
  }
  
  return BASE_WEEKDAY[hour] * 0.2
}

function getBlendWeight(minutesAhead: number): { current: number; historical: number } {
  if (minutesAhead <= 0) return { current: 1.0, historical: 0.0 }
  if (minutesAhead >= 180) return { current: 0.0, historical: 1.0 }
  
  const t = minutesAhead / 180
  
  const currentWeight = Math.max(0, 1 - Math.pow(t, 0.5))
  const historicalWeight = 1 - currentWeight
  
  return { current: currentWeight, historical: historicalWeight }
}

function userCountToDensity(count: number): number {
  if (count === 0) return 0
  if (count <= 2) return 0.25
  if (count <= 5) return 0.5
  if (count <= 10) return 0.75
  return 1.0
}

function densityToLevel(density: number): number {
  if (density < 0.15) return 0
  if (density < 0.3) return 1
  if (density < 0.5) return 2
  return 3
}

function getPredictionTimeFeatures(
  baseHour: number,
  baseDayOfWeek: number,
  minutesAhead: number
): { hour: number; dayOfWeek: number } {
  const totalMinutes = baseHour * 60 + minutesAhead
  const newHour = Math.floor(totalMinutes / 60) % 24
  let newDay = baseDayOfWeek
  
  if (baseHour + Math.floor(minutesAhead / 60) >= 24) {
    newDay = (baseDayOfWeek + 1) % 7
  }
  
  return { hour: newHour, dayOfWeek: newDay }
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const url = new URL(req.url)
    const now = new Date()
    const baseHour = parseInt(url.searchParams.get('hour') || String(now.getHours()))
    const baseDayOfWeek = parseInt(url.searchParams.get('day') || String(now.getDay()))

    let snapshotData: QuadrantSnapshot[] = []
    try {
      const body = await req.json()
      if (body.snapshot && Array.isArray(body.snapshot)) {
        snapshotData = body.snapshot
      }
    } catch {
    }

    let historicalData: Map<string, Map<number, number>> = new Map()
    
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 30)
      
      const { data: quadrantData, error } = await supabase
        .from('quadrant_data')
        .select('quadrant_id, density, hour_of_day')
        .eq('is_prediction', false)
        .gte('timestamp', cutoffDate.toISOString())
      
      if (!error && quadrantData) {
        for (const row of quadrantData) {
          if (!historicalData.has(row.quadrant_id)) {
            historicalData.set(row.quadrant_id, new Map())
          }
          const hourMap = historicalData.get(row.quadrant_id)!
          const current = hourMap.get(row.hour_of_day) || 0
          hourMap.set(row.hour_of_day, current + 1)
        }
      }
    } catch {
    }

    const qIds = getAllQuadrantIds()
    const heatmaps: {
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
    }[] = []

    const snapshotMap = new Map<string, number>()
    for (const s of snapshotData) {
      snapshotMap.set(s.quadrantId, userCountToDensity(s.userCount))
    }

    for (let t = 0; t <= 180; t += 5) {
      const futureTime = getPredictionTimeFeatures(baseHour, baseDayOfWeek, t)
      const blend = getBlendWeight(t)
      
      const quadrants = qIds.map((qId, i) => {
        const row = Math.floor(i / COLS)
        const col = i % COLS
        
        let currentDensity = snapshotMap.get(qId) || 0
        if (currentDensity === 0 && snapshotData.length > 0) {
          currentDensity = 0.05
        }
        
        let historicalDensity = getHistoricalDensity(qId, futureTime.hour)
        
        const hourMap = historicalData.get(qId)
        if (hourMap && hourMap.has(futureTime.hour)) {
          const count = hourMap.get(futureTime.hour)!
          historicalDensity = Math.min(0.65, historicalDensity * (1 + Math.log10(count + 1) * 0.2))
        }
        
        let blendedDensity: number
        if (snapshotData.length === 0) {
          blendedDensity = historicalDensity
        } else {
          blendedDensity = (currentDensity * blend.current) + (historicalDensity * blend.historical)
        }
        
        return {
          id: qId,
          density: blendedDensity,
          densityLevel: densityToLevel(blendedDensity),
          bounds: getQuadrantBounds(row, col),
          currentDensity,
          historicalDensity
        }
      })
      
      heatmaps.push({
        timestamp: new Date(now.getTime() + t * 60000).toISOString(),
        minutesAhead: t,
        blendInfo: blend,
        quadrants
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        currentTime: now.toISOString(),
        requestedHour: baseHour,
        requestedDay: baseDayOfWeek,
        hasSnapshot: snapshotData.length > 0,
        heatmaps
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Prediction failed:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
