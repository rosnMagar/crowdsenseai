import { useState, useMemo } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { Map } from 'react-map-gl/maplibre'
import { LocationData } from '../types'
import { useTheme } from '../contexts/ThemeContext'
import { useHeatmap } from '../contexts/HeatmapContext'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapViewProps {
  currentLocation: LocationData | null
  locationHistory: LocationData[]
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
  locationHistory
}: MapViewProps) {
  const { theme } = useTheme()
  const { heatmapData, layerConfig, getCurrentSource } = useHeatmap()
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)

  const currentSource = getCurrentSource()
  const colorScheme = currentSource?.colorScheme || [
    [50, 50, 50],
    [56, 189, 248],
    [251, 191, 36],
    [239, 68, 68]
  ]

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

    if (heatmapData.length > 0) {
      layerList.push(
        new HeatmapLayer({
          id: 'heatmap-layer',
          data: heatmapData,
          pickable: false,
          getPosition: d => [d[0], d[1]],
          getWeight: d => d[2],
          radiusPixels: 120,
          intensity: 1,
          threshold: 0.03,
          colorRange: [
            [212, 163, 115, 15],
            [212, 163, 115, 60],
            [212, 163, 115, 130],
            [212, 163, 115, 220]
          ],
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
  }, [currentLocation, locationHistory, heatmapData, layerConfig, colorScheme, theme, pathColor, currentColor, historyColor])

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
