import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
  console.error('Please set these in your .env file or environment')
  process.exit(1)
}

const BOUNDS = {
  west: -92.586164,
  south: 40.179033,
  east: -92.576637,
  north: 40.190088
}

const ROWS = 24
const COLS = 16

const CLASSROOM_ROWS = [10, 12, 14, 16, 18]
const CLASSROOM_COL = 3

// Dorms: Q_14_11 through Q_22_11 (rows 14-22, column 11)
const DORM_ROWS = [14, 15, 16, 17, 18, 19, 20, 21, 22]
const DORM_COL = 11

// Food locations: Q_14_11 and Q_20_11
const FOOD_QUADRANTS = ['Q_14_11', 'Q_20_11']

// Quad locations: column 8-9, rows 19-21
const QUAD_ROWS = [19, 20, 21]
const QUAD_COLS = [8, 9]

// Gathering spots: column 7, rows 12, 13, 17, 20, 22
const GATHERING_ROWS = [12, 13, 17, 20, 22]
const GATHERING_COL = 7

function isClassroom(row, col) {
  return CLASSROOM_ROWS.includes(row) && col === CLASSROOM_COL
}

function isDorm(row, col) {
  return DORM_ROWS.includes(row) && col === DORM_COL
}

function isFood(row, col) {
  const qId = `Q_${row}_${col}`
  return FOOD_QUADRANTS.includes(qId)
}

function isQuad(row, col) {
  return QUAD_ROWS.includes(row) && QUAD_COLS.includes(col)
}

function isGathering(row, col) {
  return GATHERING_ROWS.includes(row) && col === GATHERING_COL
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min
}

function quadrantIndexToLatLon(row, col) {
  const latStep = (BOUNDS.north - BOUNDS.south) / ROWS
  const lonStep = (BOUNDS.east - BOUNDS.west) / COLS
  return {
    lat: BOUNDS.south + row * latStep + randomInRange(latStep * 0.2, latStep * 0.8),
    lon: BOUNDS.west + col * lonStep + randomInRange(lonStep * 0.2, lonStep * 0.8)
  }
}

// Weekday base density patterns (0-23 hours)
const BASE_WEEKDAY = [
  0.03, 0.02, 0.01, 0.01, 0.01, 0.03,  // 0-5: Deep night
  0.08, 0.25, 0.55, 0.70, 0.75, 0.70,   // 6-11: Morning surge
  0.65, 0.60, 0.65, 0.70, 0.60, 0.50,   // 12-17: Afternoon
  0.45, 0.50, 0.55, 0.45, 0.30, 0.15     // 18-23: Evening decline
]

// Weekend base density patterns
const BASE_WEEKEND = [
  0.05, 0.03, 0.02, 0.01, 0.01, 0.01,  // 0-5: Slightly more night activity
  0.02, 0.03, 0.08, 0.20, 0.40, 0.60,   // 6-11: Late mornings
  0.70, 0.75, 0.70, 0.65, 0.55, 0.45,   // 12-17: Afternoon
  0.40, 0.45, 0.50, 0.55, 0.45, 0.30    // 18-23: Social evening
]

// Dorm activity: High at night (10pm-2am), moderate morning, low during day
const DORM_PATTERN = [
  0.60, 0.70, 0.75, 0.80, 0.75, 0.65,   // 0-5: Sleeping/tight
  0.50, 0.35, 0.25, 0.20, 0.20, 0.25,   // 6-11: Morning out
  0.30, 0.25, 0.25, 0.30, 0.35, 0.45,   // 12-17: Afternoon
  0.50, 0.55, 0.60, 0.65, 0.70, 0.65    // 18-23: Evening return, peak at 10pm
]

// Classroom patterns: High during class hours (8-5), near zero at night
const CLASSROOM_PATTERN = [
  0.01, 0.01, 0.01, 0.01, 0.01, 0.02,   // 0-5: Closed
  0.05, 0.15, 0.60, 0.85, 0.90, 0.85,   // 6-11: Morning classes peak
  0.80, 0.75, 0.80, 0.85, 0.75, 0.55,   // 12-17: Afternoon classes
  0.20, 0.10, 0.08, 0.05, 0.03, 0.02    // 18-23: Evening, some night classes
]

// Food/dining patterns: Peak at meal times (7-9am, 11am-1pm, 5-7pm)
const FOOD_PATTERN = [
  0.02, 0.01, 0.01, 0.01, 0.01, 0.02,   // 0-5
  0.05, 0.40, 0.70, 0.40, 0.30, 0.35,   // 6-11: Breakfast peak
  0.75, 0.65, 0.55, 0.50, 0.45, 0.50,   // 12-17: Lunch, afternoon
  0.60, 0.75, 0.65, 0.40, 0.25, 0.15    // 18-23: Dinner peak 7-8pm
]

// Quad patterns: Activity throughout the day, peaks during class breaks and lunch
const QUAD_PATTERN = [
  0.01, 0.01, 0.01, 0.01, 0.01, 0.02,   // 0-5: Near empty
  0.10, 0.30, 0.50, 0.60, 0.65, 0.60,   // 6-11: Morning classes, breaks
  0.75, 0.70, 0.65, 0.70, 0.75, 0.60,   // 12-17: Lunch peak, afternoon
  0.50, 0.45, 0.40, 0.30, 0.20, 0.10    // 18-23: Evening decline
]

// Gathering spots: High activity 7am-4pm (typical campus activity hours)
const GATHERING_PATTERN = [
  0.01, 0.01, 0.01, 0.01, 0.01, 0.02,   // 0-5: Near empty
  0.05, 0.40, 0.70, 0.80, 0.85, 0.80,   // 6-11: Morning buildup, peak 9-11
  0.75, 0.70, 0.75, 0.80, 0.85, 0.80,   // 12-17: Lunch, afternoon (7am-4pm window)
  0.50, 0.30, 0.20, 0.10, 0.05, 0.02    // 18-23: Evening drop off
]

function getDensity(row, col, hour, dayOfWeek) {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const base = isWeekend ? BASE_WEEKEND[hour] : BASE_WEEKDAY[hour]
  
  // Dorms
  if (isDorm(row, col)) {
    return DORM_PATTERN[hour]
  }
  
  // Classrooms
  if (isClassroom(row, col)) {
    return CLASSROOM_PATTERN[hour]
  }
  
  // Food/dining
  if (isFood(row, col)) {
    return FOOD_PATTERN[hour]
  }
  
  // Quad (outdoor gathering area)
  if (isQuad(row, col)) {
    return QUAD_PATTERN[hour]
  }
  
  // Gathering spots (high activity during day)
  if (isGathering(row, col)) {
    return GATHERING_PATTERN[hour]
  }
  
  // Default: base campus density (low for non-specified areas)
  return base * randomInRange(0.1, 0.3)
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

async function generateData() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log('Generating university campus sample data...\n')
  console.log('Building locations (50m grid - higher resolution):')
  console.log('  Classrooms: Q_10_3, Q_12_3, Q_14_3, Q_16_3, Q_18_3 (column 3)')
  console.log('  Dorms: Q_14_11 through Q_22_11 (column 11)')
  console.log('  Food: Q_14_11, Q_20_11')
  console.log('  Quad: Q_19_8, Q_19_9, Q_20_8, Q_20_9, Q_21_8, Q_21_9')
  console.log('  Gathering spots: Q_12_7, Q_13_7, Q_17_7, Q_20_7, Q_22_7\n')
  
  await clearOldSampleData()
  
  const allData = []
  const daysToGenerate = [1, 2, 3, 4, 5, 6, 7]  // Last 7 days
  
  for (const dayOffset of daysToGenerate) {
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() - dayOffset)
    baseDate.setHours(0, 0, 0, 0)
    const dayOfWeek = baseDate.getDay()
    const dayType = dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Weekday'
    
    console.log(`Generating ${baseDate.toISOString().split('T')[0]} (${dayType})...`)
    
    for (let hour = 0; hour < 24; hour++) {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const qId = `Q_${row}_${col}`
          const density = getDensity(row, col, hour, dayOfWeek)
          
          const numPoints = Math.floor(density * 30)
          
          for (let i = 0; i < numPoints; i++) {
            const minute = Math.floor(Math.random() * 60)
            const timestamp = new Date(baseDate)
            timestamp.setHours(hour, minute, Math.floor(Math.random() * 60), 0)
            
            const { lat, lon } = quadrantIndexToLatLon(row, col)
            
            let densityLevel
            if (numPoints < 2) densityLevel = 0
            else if (numPoints < 5) densityLevel = 1
            else if (numPoints < 10) densityLevel = 2
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
  
  console.log(`\nGenerated ${allData.length.toLocaleString()} total data points`)
  
  const batchSize = 500
  let inserted = 0
  
  for (let i = 0; i < allData.length; i += batchSize) {
    const batch = allData.slice(i, i + batchSize)
    const { error } = await supabase.from('quadrant_data').insert(batch)
    
    if (error) {
      console.error(`Error inserting batch:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`\rInserted ${inserted.toLocaleString()}/${allData.length.toLocaleString()}`)
    }
  }
  
  console.log(`\n\nInserted ${inserted.toLocaleString()} records`)
  
  const { count } = await supabase
    .from('quadrant_data')
    .select('*', { count: 'exact', head: true })
  
  console.log(`Total records in database: ${count?.toLocaleString()}`)
  
  console.log('\n--- Density Patterns Summary ---\n')
  
  console.log('Dorms (Q_1_6 to Q_5_6) - High at night:')
  for (let h = 0; h < 24; h += 3) {
    const density = DORM_PATTERN[h]
    const bars = '█'.repeat(Math.round(density * 20))
    console.log(`  ${h.toString().padStart(2, '0')}:00 ${bars} (${(density * 100).toFixed(0)}%)`)
  }
  
  console.log('\nClassrooms (Q_1_4 to Q_6_4) - Peak 8am-5pm:')
  for (let h = 0; h < 24; h += 3) {
    const density = CLASSROOM_PATTERN[h]
    const bars = '█'.repeat(Math.round(density * 20))
    console.log(`  ${h.toString().padStart(2, '0')}:00 ${bars} (${(density * 100).toFixed(0)}%)`)
  }
  
  console.log('\nFood (Q_2_6, Q_5_6) - Peak at meals:')
  for (let h = 0; h < 24; h += 3) {
    const density = FOOD_PATTERN[h]
    const bars = '█'.repeat(Math.round(density * 20))
    console.log(`  ${h.toString().padStart(2, '0')}:00 ${bars} (${(density * 100).toFixed(0)}%)`)
  }
}

generateData().catch(console.error)
