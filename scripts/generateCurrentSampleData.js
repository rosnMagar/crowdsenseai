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

const HOTSPOT_QUADRANTS = ['Q_3_3', 'Q_4_4', 'Q_5_5', 'Q_3_4', 'Q_4_3', 'Q_6_4']

const pmAfternoonDensity = {
  16: 0.8,
  17: 0.9,
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min
}

function quadrantIndexToLatLon(row, col) {
  const latStep = (BOUNDS.north - BOUNDS.south) / ROWS
  const lonStep = (BOUNDS.east - BOUNDS.west) / COLS
  return {
    lat: BOUNDS.south + row * latStep + randomInRange(0, latStep),
    lon: BOUNDS.west + col * lonStep + randomInRange(0, lonStep)
  }
}

async function generateCurrentData() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log('Generating sample data for March 21, 2026, 4:41 PM...')
  
  const allData = []
  
  const baseDate = new Date('2026-03-21T16:41:00')
  const dayOfWeek = baseDate.getDay()
  
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const qId = `Q_${row}_${col}`
      const isHotspot = HOTSPOT_QUADRANTS.includes(qId)
      
      const density = pmAfternoonDensity[16]
      const adjustedDensity = isHotspot ? Math.min(1, density * 1.5) : density
      
      const numPoints = Math.floor(adjustedDensity * 15)
      
      for (let i = 0; i < numPoints; i++) {
        const timestamp = new Date(baseDate.getTime() - Math.random() * 60 * 60 * 1000)
        const { lat, lon } = quadrantIndexToLatLon(row, col)
        
        let densityLevel
        if (numPoints < 3) densityLevel = 1
        else if (numPoints < 8) densityLevel = 2
        else densityLevel = 3
        
        allData.push({
          quadrant_id: qId,
          latitude: lat,
          longitude: lon,
          density: densityLevel,
          hour_of_day: timestamp.getHours(),
          day_of_week: timestamp.getDay(),
          session_id: null,
          timestamp: timestamp.toISOString(),
          is_prediction: false
        })
      }
    }
  }
  
  console.log(`Generated ${allData.length} sample data points`)
  
  const { error } = await supabase.from('quadrant_data').insert(allData)
  
  if (error) {
    console.error('Error inserting data:', error.message)
  } else {
    console.log('Sample data inserted successfully!')
    
    const { count } = await supabase
      .from('quadrant_data')
      .select('*', { count: 'exact', head: true })
    
    console.log(`Total records in quadrant_data: ${count}`)
  }
  
  const { data: sample } = await supabase
    .from('quadrant_data')
    .select('quadrant_id, density, hour_of_day')
    .gte('timestamp', '2026-03-21T16:00:00')
    .limit(10)
  
  console.log('\nSample of inserted data:')
  console.log(JSON.stringify(sample, null, 2))
}

generateCurrentData().catch(console.error)
