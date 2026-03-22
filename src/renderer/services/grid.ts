import type { GridConfig, QuadrantBounds, DensityLevel, LocationData, QuadrantDensity } from '../types'

const BOUNDS = {
  west: -92.586164,
  south: 40.179033,
  east: -92.576637,
  north: 40.190088
}

const ROWS = 24
const COLS = 16
const QUADRANT_SIZE_METERS = 50

export const GRID_CONFIG: GridConfig = {
  bounds: BOUNDS,
  quadrantSizeMeters: QUADRANT_SIZE_METERS,
  cols: COLS,
  rows: ROWS,
  totalQuadrants: COLS * ROWS
}

export function latLonToQuadrant(lat: number, lon: number): string {
  const latStep = (BOUNDS.north - BOUNDS.south) / ROWS
  const lonStep = (BOUNDS.west - BOUNDS.east < 0 ? BOUNDS.east - BOUNDS.west : BOUNDS.west - BOUNDS.east) / COLS
  
  const row = Math.floor((lat - BOUNDS.south) / latStep)
  const col = Math.floor((lon - BOUNDS.west) / lonStep)
  
  const clampedRow = Math.max(0, Math.min(ROWS - 1, row))
  const clampedCol = Math.max(0, Math.min(COLS - 1, col))
  
  return `Q_${clampedRow}_${clampedCol}`
}

export function quadrantToLatLon(quadrantId: string): QuadrantBounds | null {
  const match = quadrantId.match(/Q_(\d+)_(\d+)/)
  if (!match) return null
  
  const row = parseInt(match[1])
  const col = parseInt(match[2])
  
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null
  
  const latStep = (BOUNDS.north - BOUNDS.south) / ROWS
  const lonStep = (BOUNDS.west - BOUNDS.east < 0 ? BOUNDS.east - BOUNDS.west : BOUNDS.west - BOUNDS.east) / COLS
  
  const minLat = BOUNDS.south + row * latStep
  const maxLat = BOUNDS.south + (row + 1) * latStep
  const minLon = BOUNDS.west + col * lonStep
  const maxLon = BOUNDS.west + (col + 1) * lonStep
  
  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    centerLat: (minLat + maxLat) / 2,
    centerLon: (minLon + maxLon) / 2
  }
}

export function getAllQuadrantIds(): string[] {
  const ids: string[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ids.push(`Q_${row}_${col}`)
    }
  }
  return ids
}

export function locationsToDensities(locations: LocationData[]): Map<string, number> {
  const counts = new Map<string, number>()
  
  for (const loc of locations) {
    if (loc.latitude >= BOUNDS.south && loc.latitude <= BOUNDS.north &&
        loc.longitude >= BOUNDS.west && loc.longitude <= BOUNDS.east) {
      const qId = latLonToQuadrant(loc.latitude, loc.longitude)
      counts.set(qId, (counts.get(qId) || 0) + 1)
    }
  }
  
  return counts
}

export function countsToDensityLevel(count: number): DensityLevel {
  if (count === 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  return 3
}

export function densitiesToHeatmap(counts: Map<string, number>): Map<string, DensityLevel> {
  const heatmap = new Map<string, DensityLevel>()
  
  for (const qId of getAllQuadrantIds()) {
    const count = counts.get(qId) || 0
    heatmap.set(qId, countsToDensityLevel(count))
  }
  
  return heatmap
}

export function heatmapToQuadrantDensities(heatmap: Map<string, DensityLevel>): QuadrantDensity[] {
  return Array.from(heatmap.entries()).map(([qId, density]) => ({
    quadrantId: qId,
    density,
    bounds: quadrantToLatLon(qId)!,
    count: density === 0 ? 0 : density * 2
  }))
}

export function isWithinBounds(lat: number, lon: number): boolean {
  return lat >= BOUNDS.south && lat <= BOUNDS.north &&
         lon >= BOUNDS.west && lon <= BOUNDS.east
}

export function getCurrentTimeFeatures(): { hour: number; dayOfWeek: number } {
  const now = new Date()
  return {
    hour: now.getHours(),
    dayOfWeek: now.getDay()
  }
}

export function getTimeFeaturesForTimestamp(timestamp: Date | number): { hour: number; dayOfWeek: number } {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp
  return {
    hour: date.getHours(),
    dayOfWeek: date.getDay()
  }
}

export function encodeTimeFeatures(hour: number, dayOfWeek: number): number[] {
  const features = new Array(GRID_CONFIG.totalQuadrants + 25).fill(0)
  
  features[hour] = 1
  
  features[24 + dayOfWeek] = 1
  
  return features
}

export function getPredictionTimeFeatures(
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
