import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const BOUNDS = {
  west: -92.586164,
  south: 40.179033,
  east: -92.576637,
  north: 40.190088
}

const QUADRANT_SIZE_DEG_LAT = (BOUNDS.north - BOUNDS.south) / 12
const QUADRANT_SIZE_DEG_LON = (BOUNDS.east - BOUNDS.west) / 8

const DENSITY_PATTERNS: Record<string, Record<number, number>> = {
  weekday: {
    0: 0.1, 1: 0.05, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.15,
    6: 0.4, 7: 0.7, 8: 0.95, 9: 1.0, 10: 0.95, 11: 0.8,
    12: 0.9, 13: 0.85, 14: 0.9, 15: 0.85, 16: 0.8, 17: 0.7,
    18: 0.5, 19: 0.4, 20: 0.35, 21: 0.3, 22: 0.2, 23: 0.15
  },
  weekend: {
    0: 0.15, 1: 0.1, 2: 0.05, 3: 0.03, 4: 0.02, 5: 0.05,
    6: 0.1, 7: 0.2, 8: 0.35, 9: 0.5, 10: 0.7, 11: 0.85,
    12: 0.95, 13: 1.0, 14: 0.95, 15: 0.9, 16: 0.85, 17: 0.75,
    18: 0.6, 19: 0.5, 20: 0.4, 21: 0.35, 22: 0.25, 23: 0.2
  }
}

const HOTSPOT_QUADRANTS = ['Q_3_3', 'Q_4_4', 'Q_5_5', 'Q_3_4', 'Q_4_3', 'Q_6_4']
const COLD_QUADRANTS = ['Q_0_0', 'Q_0_7', 'Q_11_0', 'Q_11_7']

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function getQuadrantDensity(row: number, col: number, hour: number, dayOfWeek: number): number {
  const qId = `Q_${row}_${col}`
  const isHotspot = HOTSPOT_QUADRANTS.includes(qId)
  const isCold = COLD_QUADRANTS.includes(qId)
  
  const patterns = dayOfWeek === 0 || dayOfWeek === 6 ? DENSITY_PATTERNS.weekend : DENSITY_PATTERNS.weekday
  let baseDensity = patterns[hour]
  
  if (isHotspot) {
    baseDensity = Math.min(1, baseDensity * 1.5)
  } else if (isCold) {
    baseDensity = baseDensity * 0.3
  }
  
  return baseDensity
}

function latLonToQuadrantIndex(lat: number, lon: number): { row: number; col: number } {
  const row = Math.floor((lat - BOUNDS.south) / QUADRANT_SIZE_DEG_LAT)
  const col = Math.floor((lon - BOUNDS.west) / QUADRANT_SIZE_DEG_LON)
  return {
    row: Math.max(0, Math.min(11, row)),
    col: Math.max(0, Math.min(7, col))
  }
}

function quadrantIndexToLatLon(row: number, col: number): { lat: number; lon: number } {
  return {
    lat: BOUNDS.south + row * QUADRANT_SIZE_DEG_LAT + randomInRange(0, QUADRANT_SIZE_DEG_LAT),
    lon: BOUNDS.west + col * QUADRANT_SIZE_DEG_LON + randomInRange(0, QUADRANT_SIZE_DEG_LON)
  }
}

async function generateDummyData(daysBack: number = 7, pointsPerDay: number = 100) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log('Generating dummy data...')
  console.log(`Bounds: ${JSON.stringify(BOUNDS)}`)
  console.log(`Days back: ${daysBack}`)
  console.log(`Points per day: ${pointsPerDay}`)
  
  const allData: any[] = []
  
  for (let dayOffset = daysBack; dayOffset >= 0; dayOffset--) {
    const date = new Date()
    date.setDate(date.getDate() - dayOffset)
    const dayOfWeek = date.getDay()
    
    for (let point = 0; point < pointsPerDay; point++) {
      const hour = Math.floor(Math.random() * 24)
      const minute = Math.floor(Math.random() * 60)
      const timestamp = new Date(date)
      timestamp.setHours(hour, minute, 0, 0)
      
      let attempts = 0
      while (attempts < 10) {
        const row = Math.floor(Math.random() * 12)
        const col = Math.floor(Math.random() * 8)
        const density = getQuadrantDensity(row, col, hour, dayOfWeek)
        
        if (Math.random() < density) {
          const { lat, lon } = quadrantIndexToLatLon(row, col)
          const qId = `Q_${row}_${col}`
          
          allData.push({
            quadrant_id: qId,
            latitude: lat,
            longitude: lon,
            density: density > 0.7 ? 3 : density > 0.4 ? 2 : density > 0.15 ? 1 : 0,
            hour_of_day: hour,
            day_of_week: dayOfWeek,
            session_id: null,
            timestamp: timestamp.toISOString(),
            is_prediction: false
          })
          break
        }
        attempts++
      }
    }
    
    if ((daysBack - dayOffset) % 2 === 0) {
      console.log(`  Day ${daysBack - dayOffset}/${daysBack} completed (${allData.length} points)`)
    }
  }
  
  console.log(`\nTotal data points: ${allData.length}`)
  console.log('Inserting into Supabase...')
  
  const batchSize = 500
  let inserted = 0
  
  for (let i = 0; i < allData.length; i += batchSize) {
    const batch = allData.slice(i, i + batchSize)
    const { error } = await supabase.from('quadrant_data').insert(batch)
    
    if (error) {
      console.error(`Error inserting batch ${i}:`, error.message)
    } else {
      inserted += batch.length
      console.log(`  Inserted ${inserted}/${allData.length}`)
    }
  }
  
  console.log(`\nDone! Inserted ${inserted} records.`)
  
  const { count } = await supabase
    .from('quadrant_data')
    .select('*', { count: 'exact', head: true })
  
  console.log(`Total records in quadrant_data: ${count}`)
}

generateDummyData(7, 200).catch(console.error)
