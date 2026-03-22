import { useState, useMemo } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, PathLayer, PolygonLayer } from '@deck.gl/layers'
import { Map } from 'react-map-gl/maplibre'
import { LocationData, QuadrantDensity, DensityLevel } from '../types'
import { useTheme } from '../contexts/ThemeContext'
import 'maplibre-gl/dist/maplibre-gl.css'

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

interface MapViewProps {
  currentLocation: LocationData | null
  locationHistory: LocationData[]
  heatmapQuadrants?: QuadrantDensity[]
  showHeatmap?: boolean
  heatmapOpacity?: number
}

const INITIAL_VIEW_STATE = {
  longitude: -92.5814,
  latitude: 40.1845,
  zoom: 15,
  pitch: 45,
  bearing: 0
}

export default function MapView({ 
  currentLocation, 
  locationHistory,
  heatmapQuadrants = [],
  showHeatmap = false,
  heatmapOpacity = 0.6
}: MapViewProps) {
  const { theme } = useTheme()
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)

  const pathColor = theme === 'dark' 
    ? [174, 195, 176, 180] as [number, number, number, number]
    : [212, 163, 115, 180] as [number, number, number, number]
  
  const currentColor = theme === 'dark'
    ? [174, 195, 176, 255] as [number, number, number, number]
    : [212, 163, 115, 255] as [number, number, number, number]
  
  const historyColor = theme === 'dark'
    ? [88, 131, 146, 180] as [number, number, number, number]
    : [125, 180, 160, 180] as [number, number, number, number]

  const layers = useMemo(() => {
    const layerList = []

    if (showHeatmap && heatmapQuadrants.length > 0) {
      layerList.push(
        new PolygonLayer({
          id: 'heatmap-layer',
          data: heatmapQuadrants,
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
            const alpha = Math.round(DENSITY_ALPHA[d.density] * heatmapOpacity)
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
      )
    }

    if (locationHistory.length > 1) {
      layerList.push(
        new PathLayer({
          id: 'path-layer',
          data: [{ path: locationHistory.map(loc => [loc.longitude, loc.latitude]) }],
          getPath: d => d.path,
          getColor: pathColor,
          getWidth: 4,
          widthMinPixels: 2,
          capRounded: true,
          jointRounded: true
        })
      )
    }

    if (currentLocation) {
      layerList.push(
        new ScatterplotLayer({
          id: 'current-location',
          data: [currentLocation],
          getPosition: d => [d.longitude, d.latitude],
          getFillColor: currentColor,
          getRadius: 100,
          radiusMinPixels: 10,
          radiusMaxPixels: 30,
          pickable: true
        })
      )
    }

    if (locationHistory.length > 0) {
      layerList.push(
        new ScatterplotLayer({
          id: 'location-history',
          data: locationHistory,
          getPosition: d => [d.longitude, d.latitude],
          getFillColor: d => {
            const age = Date.now() - d.timestamp
            const alpha = Math.max(80, 200 - age / 100)
            return [...historyColor.slice(0, 3) as [number, number, number], alpha] as [number, number, number, number]
          },
          getRadius: 50,
          radiusMinPixels: 3,
          radiusMaxPixels: 8,
          pickable: false
        })
      )
    }

    return layerList
  }, [currentLocation, locationHistory, heatmapQuadrants, showHeatmap, heatmapOpacity, theme])

  useMemo(() => {
    if (currentLocation && locationHistory.length === 1) {
      setViewState(prev => ({
        ...prev,
        longitude: currentLocation.longitude,
        latitude: currentLocation.latitude
      }))
    }
  }, [currentLocation, locationHistory.length])

  const mapStyle = theme === 'dark'
    ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState }) => setViewState(viewState as typeof INITIAL_VIEW_STATE)}
      controller={true}
      layers={layers}
      getCursor={({ isHovering }) => isHovering ? 'pointer' : 'grab'}
    >
      <Map
        mapStyle={mapStyle}
        attributionControl={false}
      />
    </DeckGL>
  )
}
