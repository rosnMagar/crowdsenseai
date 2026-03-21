import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wwrsqzacdonvaqzwkpua.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cnNxemFjZG9udmFxendrcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTYzOTUsImV4cCI6MjA4OTY5MjM5NX0.NprOO-a1y8_gAfgkBq0lI_73W9o0JWj1G4iiaGEejaI'

const BOUNDS = {
  west: -92.586164,
  south: 40.179033,
  east: -92.576637,
  north: 40.190088
}

const ROWS = 12
const COLS = 8

const HOTSPOT_QUADRANTS = ['Q_3_3', 'Q_3_4', 'Q_4_3', 'Q_4_4', 'Q_5_3', 'Q_5_4', 'Q_4_5', 'Q_5_5', 'Q_6_4']

const DENSITY_BY_HOUR = {
  0: 0.1, 1: 0.05, 2: 0.03, 3: 0.02, 4: 0.05, 5: 0.1,
  6: 0.25, 7: 0.5, 8: 0.75, 9: 0.9, 10: 0.95, 11: 0.9,
  12: 0.85, 13: 0.8, 14: 0.85, 15: 0.9, 16: 0.95, 17: 0.9,
  18: 0.7, 19: 0.55, 20: 0.45, 21: 0.35, 22: 0.25, 23: 0.15
}

const WEEKEND_DENSITY = {
  0: 0.15, 1: 0.1, 2: 0.05, 3: 0.03, 4: 0.02, 5: 0.05,
  6: 0.1, 7: 0.2, 8: 0.35, 9: 0.5, 10: 0.7, 11: 0.85,
  12: 0.95, 13: 1.0, 14: 0.95, 15: 0.9, 16: 0.85, 17: 0.75,
  18: 0.6, 19: 0.5, 20: 0.4, 21: 0.35, 22: 0.25, 23: 0.2
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min
}

function quadrantIndexToLatLon(row, col) {
  const latStep = (BOUNDS.north - BOUNDS.south) / ROWS
  const lonStep = (BOUNDS.east - BOUNDS.west) / COLS
  return {
    lat: BOUNDS.south + row * latStep + randomInRange(latStep * 0.1, latStep * 0.9),
    lon: BOUNDS.west + col * lonStep + randomInRange(lonStep * 0.1, lonStep * 0.9)
  }
}

function getDensityForHour(hour, dayOfWeek) {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const baseDensity = isWeekend ? WEEKEND_DENSITY[hour] : DENSITY_BY_HOUR[hour]
  return baseDensity
}

async function clearOldSampleData() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const { error } = await supabase
    .from('quadrant_data')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  
  if (error) {
    console.log('Warning: Could not clear old data:', error.message)
  } else {
    console.log('Cleared old sample data')
  }
}

async function generateRealisticData() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log('Generating realistic sample data...')
  
  await clearOldSampleData()
  
  const allData = []
  const daysToGenerate = [16, 17, 18, 19, 20, 21]
  
  for (const dayOffset of daysToGenerate) {
    const baseDate = new Date('2026-03-21T00:00:00')
    baseDate.setDate(baseDate.getDate() - dayOffset)
    const dayOfWeek = baseDate.getDay()
    
    console.log(`Generating data for ${baseDate.toISOString().split('T')[0]} (day ${dayOffset} ago, weekday: ${dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Weekday'})`)
    
    for (let hour = 0; hour < 24; hour++) {
      const hourDensity = getDensityForHour(hour, dayOfWeek)
      
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const qId = `Q_${row}_${col}`
          const isHotspot = HOTSPOT_QUADRANTS.includes(qId)
          
          const adjustedDensity = isHotspot 
            ? Math.min(1, hourDensity * 1.5) 
            : hourDensity * randomInRange(0.7, 1.0)
          
          const numPoints = Math.floor(adjustedDensity * 20)
          
          for (let i = 0; i < numPoints; i++) {
            const minute = Math.floor(Math.random() * 60)
            const timestamp = new Date(baseDate)
            timestamp.setHours(hour, minute, Math.floor(Math.random() * 60), 0)
            
            const { lat, lon } = quadrantIndexToLatLon(row, col)
            
            let densityLevel
            if (numPoints < 5) densityLevel = 1
            else if (numPoints < 12) densityLevel = 2
            else densityLevel = 3
            
            allData.push({
              quadrant_id: qId,
              latitude: lat,
              longitude: lon,
              density: densityLevel,
              hour_of_day: hour,
              day_of_week: dayOfWeek,
              session_id: null,
              timestamp: timestamp.toISOString(),
              is_prediction: false
            })
          }
        }
      }
    }
  }
  
  console.log(`Generated ${allData.length} total data points`)
  
  const batchSize = 500
  let inserted = 0
  
  for (let i = 0; i < allData.length; i += batchSize) {
    const batch = allData.slice(i, i + batchSize)
    const { error } = await supabase.from('quadrant_data').insert(batch)
    
    if (error) {
      console.error(`Error inserting batch:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`\rInserted ${inserted}/${allData.length}`)
    }
  }
  
  console.log(`\nInserted ${inserted} records`)
  
  const { count } = await supabase
    .from('quadrant_data')
    .select('*', { count: 'exact', head: true })
  
  console.log(`Total records in database: ${count}`)
  
  const { data: stats } = await supabase
    .from('quadrant_data')
    .select('hour_of_day, quadrant_id, density')
    .gte('timestamp', '2026-03-17T00:00:00')
    .limit(100)
  
  console.log('\nSample data by hour:')
  const byHour = {}
  for (const r of stats) {
    if (!byHour[r.hour_of_day]) byHour[r.hour_of_day] = 0
    byHour[r.hour_of_day]++
  }
  console.log(byHour)
}

generateRealisticData().catch(console.error)
