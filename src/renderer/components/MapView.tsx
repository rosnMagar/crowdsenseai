import { useState, useMemo } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, PathLayer, PolygonLayer } from '@deck.gl/layers'
import { Map } from 'react-map-gl/maplibre'
import { LocationData, QuadrantDensity, DensityLevel } from '../types'
import { createHeatmapLayer } from './HeatmapOverlay'
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
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)

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
          getColor: [56, 189, 248, 180],
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
          getFillColor: [14, 165, 233, 255],
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
            return [100, 116, 139, alpha]
          },
          getRadius: 50,
          radiusMinPixels: 3,
          radiusMaxPixels: 8,
          pickable: false
        })
      )
    }

    return layerList
  }, [currentLocation, locationHistory, heatmapQuadrants, showHeatmap, heatmapOpacity])

  useMemo(() => {
    if (currentLocation && locationHistory.length === 1) {
      setViewState(prev => ({
        ...prev,
        longitude: currentLocation.longitude,
        latitude: currentLocation.latitude
      }))
    }
  }, [currentLocation, locationHistory.length])

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState }) => setViewState(viewState as typeof INITIAL_VIEW_STATE)}
      controller={true}
      layers={layers}
      getCursor={({ isHovering }) => isHovering ? 'pointer' : 'grab'}
    >
      <Map
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        attributionControl={false}
      />
    </DeckGL>
  )
}
