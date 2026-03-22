import { useMemo } from 'react'
import { PolygonLayer } from '@deck.gl/layers'
import type { DensityLevel, QuadrantDensity, QuadrantBounds } from '../types'
import { GRID_CONFIG } from '../services/grid'
import { useTheme } from '../contexts/ThemeContext'

interface HeatmapOverlayProps {
  quadrants: QuadrantDensity[]
  opacity?: number
}

const DENSITY_COLORS: Record<DensityLevel, [number, number, number]> = {
  0: [212, 163, 115],
  1: [212, 163, 115],
  2: [212, 163, 115],
  3: [212, 163, 115]
}

const DENSITY_ALPHA: Record<DensityLevel, number> = {
  0: 15,
  1: 60,
  2: 130,
  3: 220
}

export function createHeatmapLayer(
  quadrants: QuadrantDensity[],
  id: string,
  opacity: number = 0.6
) {
  return new PolygonLayer({
    id,
    data: quadrants,
    getPolygon: (d: QuadrantDensity) => {
      const b = d.bounds
      return [
        [b.minLon, b.minLat],
        [b.maxLon, b.minLat],
        [b.maxLon, b.maxLat],
        [b.minLon, b.maxLat]
      ]
    },
    getFillColor: (d: QuadrantDensity) => {
      const baseColor = DENSITY_COLORS[d.density]
      const alpha = Math.round(DENSITY_ALPHA[d.density] * opacity)
      return [...baseColor, alpha] as [number, number, number, number]
    },
    getLineColor: [100, 100, 100, 50],
    getLineWidth: 1,
    lineWidthMinPixels: 1,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false
  })
}

export function ActivityLegend() {
  const { theme } = useTheme()

  const levels: { level: DensityLevel; label: string; color: string }[] = [
    { level: 0, label: 'Low', color: `rgba(${DENSITY_COLORS[0].join(',')}, ${DENSITY_ALPHA[0] / 255})` },
    { level: 1, label: 'Moderate', color: `rgba(${DENSITY_COLORS[1].join(',')}, ${DENSITY_ALPHA[1] / 255})` },
    { level: 2, label: 'High', color: `rgba(${DENSITY_COLORS[2].join(',')}, ${DENSITY_ALPHA[2] / 255})` },
    { level: 3, label: 'Very High', color: `rgba(${DENSITY_COLORS[3].join(',')}, ${DENSITY_ALPHA[3] / 255})` }
  ]

  const containerClass = theme === 'dark' ? 'bg-dark-teal/50' : 'bg-papaya-whip/90'
  const headerClass = theme === 'dark' ? 'text-air-force-blue' : 'text-dark-teal'
  const labelClass = theme === 'dark' ? 'text-light-beige' : 'text-ink-black/80'

  return (
    <div className={`absolute bottom-4 left-4 ${containerClass} rounded-lg p-3 backdrop-blur-sm`}>
      <div className={`text-xs ${headerClass} mb-2 font-medium`}>Activity</div>
      <div className="space-y-1.5">
        {levels.map(({ level, label, color }) => (
          <div key={level} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: color }}
            />
            <span className={`text-xs ${labelClass}`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function getDensityColor(density: DensityLevel): [number, number, number, number] {
  const baseColor = DENSITY_COLORS[density]
  const alpha = DENSITY_ALPHA[density]
  return [...baseColor, alpha] as [number, number, number, number]
}
