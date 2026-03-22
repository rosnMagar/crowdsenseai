import { QuadrantBounds } from '../types'

export interface HeatmapPoint {
  quadrantId: string
  value: number
  bounds: QuadrantBounds
  metadata?: Record<string, unknown>
}

export type ColorRange = [number, number, number, number][]

export interface HeatmapSource {
  id: string
  name: string
  description: string
  colorScheme: ColorRange
  icon?: string
  getData: () => HeatmapPoint[]
  refresh?: () => Promise<void>
}

export interface HeatmapLayerConfig {
  radiusPixels: number
  intensity: number
  threshold: number
  opacity: number
}

export const DEFAULT_LAYER_CONFIG: HeatmapLayerConfig = {
  radiusPixels: 120,
  intensity: 1,
  threshold: 0.03,
  opacity: 0.6
}

export const DENSITY_COLOR_SCHEME: ColorRange = [
  [50, 50, 50, 255],
  [56, 189, 248, 255],
  [251, 191, 36, 255],
  [239, 68, 68, 255]
]

export const WIFI_COLOR_SCHEME: ColorRange = [
  [50, 50, 50, 255],
  [34, 197, 94, 255],
  [132, 204, 22, 255],
  [251, 191, 36, 255]
]

export const DANGER_COLOR_SCHEME: ColorRange = [
  [50, 50, 50, 255],
  [239, 68, 68, 255],
  [251, 191, 36, 255],
  [34, 197, 94, 255]
]
