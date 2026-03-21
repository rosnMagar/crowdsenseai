import { useMemo } from 'react'
import { PolygonLayer } from '@deck.gl/layers'
import type { DensityLevel, QuadrantDensity, QuadrantBounds } from '../types'
import { GRID_CONFIG } from '../services/grid'

interface HeatmapOverlayProps {
  quadrants: QuadrantDensity[]
  opacity?: number
}

const DENSITY_COLORS: Record<DensityLevel, [number, number, number]> = {
  0: [50, 50, 50],
  1: [56, 189, 248],
  2: [251, 191, 36],
  3: [239, 68, 68]
}

const DENSITY_ALPHA: Record<DensityLevel, number> = {
  0: 30,
  1: 120,
  2: 160,
  3: 200
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

export function HeatmapLegend() {
  const levels: { level: DensityLevel; label: string; color: string }[] = [
    { level: 0, label: 'None', color: `rgb(${DENSITY_COLORS[0].join(',')})` },
    { level: 1, label: 'Few', color: `rgb(${DENSITY_COLORS[1].join(',')})` },
    { level: 2, label: 'Some', color: `rgb(${DENSITY_COLORS[2].join(',')})` },
    { level: 3, label: 'Many', color: `rgb(${DENSITY_COLORS[3].join(',')})` }
  ]

  return (
    <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg p-3 backdrop-blur-sm">
      <div className="text-xs text-slate-400 mb-2 font-medium">Population Density</div>
      <div className="space-y-1.5">
        {levels.map(({ level, label, color }) => (
          <div key={level} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-slate-300">{label}</span>
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
