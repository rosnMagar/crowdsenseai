import { useState, useMemo } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, PathLayer, PolygonLayer } from '@deck.gl/layers'
import { Map } from 'react-map-gl/maplibre'
import { LocationData, QuadrantDensity, DensityLevel } from '../types'
import { useTheme } from '../contexts/ThemeContext'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapViewProps {
  currentLocation: LocationData | null
  locationHistory: LocationData[]
  heatmapQuadrants?: QuadrantDensity[]
  showHeatmap?: boolean
  heatmapOpacity?: number
}

const DENSITY_COLORS: Record<number, { fill: [number, number, number, number]; stroke: [number, number, number, number] }> = {
  0: { fill: [34, 197, 94, 20], stroke: [34, 197, 94, 40] },
  1: { fill: [34, 197, 94, 120], stroke: [34, 197, 94, 180] },
  2: { fill: [234, 179, 8, 160], stroke: [234, 179, 8, 200] },
  3: { fill: [239, 68, 68, 200], stroke: [239, 68, 68, 255] }
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

  const getQuadrantPolygon = (q: QuadrantDensity) => {
    return [
      [q.bounds.minLon, q.bounds.minLat],
      [q.bounds.maxLon, q.bounds.minLat],
      [q.bounds.maxLon, q.bounds.maxLat],
      [q.bounds.minLon, q.bounds.maxLat],
      [q.bounds.minLon, q.bounds.minLat]
    ]
  }

  const quadrantPolygons = heatmapQuadrants.map(q => ({
    polygon: getQuadrantPolygon(q),
    density: q.density,
    quadrantId: q.quadrantId
  }))

  const layers = useMemo(() => {
    const layerList = []

    if (showHeatmap && quadrantPolygons.length > 0) {
      layerList.push(
        new PolygonLayer({
          id: 'quadrant-layer',
          data: quadrantPolygons,
          pickable: true,
          stroked: true,
          filled: true,
          wireframe: false,
          lineWidthMinPixels: 1,
          getPolygon: (d: typeof quadrantPolygons[0]) => d.polygon,
          getFillColor: (d: typeof quadrantPolygons[0]) => DENSITY_COLORS[d.density as DensityLevel].fill,
          getLineColor: (d: typeof quadrantPolygons[0]) => DENSITY_COLORS[d.density as DensityLevel].stroke,
          getLineWidth: 1,
          opacity: heatmapOpacity
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
          getRadius: 30,
          radiusMinPixels: 4,
          radiusMaxPixels: 10,
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
  }, [currentLocation, locationHistory, quadrantPolygons, showHeatmap, heatmapOpacity, theme])

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
