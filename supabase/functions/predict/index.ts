import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOUNDS = {
  west: -92.586164,
  south: 40.179033,
  east: -92.576637,
  north: 40.190088
}

const ROWS = 12
const COLS = 8

const HOTSPOT_QUADRANTS = ['Q_3_3', 'Q_3_4', 'Q_4_3', 'Q_4_4', 'Q_5_3', 'Q_5_4', 'Q_4_5', 'Q_5_5']

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

function getHistoricalDensity(qId: string, hour: number): number {
  const isHotspot = HOTSPOT_QUADRANTS.includes(qId)
  
  let baseDensity = 0.1
  
  if (hour >= 6 && hour <= 7) baseDensity = 0.2
  else if (hour >= 8 && hour <= 10) baseDensity = 0.4
  else if (hour >= 11 && hour <= 14) baseDensity = 0.55
  else if (hour >= 15 && hour <= 17) baseDensity = 0.5
  else if (hour >= 18 && hour <= 19) baseDensity = 0.35
  else if (hour >= 20 && hour <= 22) baseDensity = 0.25
  else if (hour >= 23 || hour <= 5) baseDensity = 0.1
  
  if (isHotspot) {
    baseDensity = Math.min(0.65, baseDensity * 1.6)
  }
  
  return baseDensity
}

function getBlendWeight(minutesAhead: number): { current: number; historical: number } {
  if (minutesAhead <= 0) return { current: 1.0, historical: 0.0 }
  if (minutesAhead >= 60) return { current: 0.0, historical: 1.0 }
  
  const t = minutesAhead / 60
  
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

    for (let t = 0; t <= 60; t += 5) {
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
        
        const blendedDensity = (currentDensity * blend.current) + (historicalDensity * blend.historical)
        
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
