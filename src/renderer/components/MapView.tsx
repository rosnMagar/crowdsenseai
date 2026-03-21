import { useState, useMemo } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers'
import { Map } from 'react-map-gl/maplibre'
import { LocationData } from '../types'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapViewProps {
  currentLocation: LocationData | null
  locationHistory: LocationData[]
}

const INITIAL_VIEW_STATE = {
  longitude: -79.3832,
  latitude: 43.6532,
  zoom: 14,
  pitch: 45,
  bearing: 0
}

export default function MapView({ currentLocation, locationHistory }: MapViewProps) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)

  const layers = useMemo(() => {
    const layerList = []

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
  }, [currentLocation, locationHistory])

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
