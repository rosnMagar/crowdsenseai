import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, PathLayer, PolygonLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { Map } from 'react-map-gl/maplibre'
import { LocationData, QuadrantDensity, DensityLevel } from '../types'
import { WifiObservation } from '../services/wifiTracker'
import { useTheme } from '../contexts/ThemeContext'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapViewProps {
  currentLocation: LocationData | null
  locationHistory: LocationData[]
  heatmapQuadrants?: QuadrantDensity[]
  showHeatmap?: boolean
  heatmapOpacity?: number
  heatmapMode?: 'polygon' | 'heatmap'
  wifiObservations?: WifiObservation[]
}

const DENSITY_COLORS: Record<number, { fill: [number, number, number, number]; stroke: [number, number, number, number] }> = {
  0: { fill: [34, 197, 94, 20], stroke: [34, 197, 94, 40] },
  1: { fill: [34, 197, 94, 120], stroke: [34, 197, 94, 180] },
  2: { fill: [234, 179, 8, 160], stroke: [234, 179, 8, 200] },
  3: { fill: [239, 68, 68, 200], stroke: [239, 68, 68, 255] }
}

const INITIAL_VIEW_STATE = {
  longitude: -92.5805,
  latitude: 40.1882,
  zoom: 15.5,
  pitch: 45,
  bearing: 0
}

function MapView({ 
  currentLocation, 
  locationHistory,
  heatmapQuadrants = [],
  showHeatmap = false,
  heatmapOpacity = 0.6,
  heatmapMode = 'polygon',
  wifiObservations = []
}: MapViewProps) {
  const { theme } = useTheme()
  const [viewState, setViewState] = useState(() => ({ ...INITIAL_VIEW_STATE }))

  const themeColors = useMemo(() => {
    if (theme === 'dark') {
      return {
        path: [174, 195, 176, 180] as [number, number, number, number],
        current: [174, 195, 176, 255] as [number, number, number, number],
        history: [88, 131, 146, 180] as [number, number, number, number]
      }
    }
    return {
      path: [212, 163, 115, 180] as [number, number, number, number],
      current: [212, 163, 115, 255] as [number, number, number, number],
      history: [125, 180, 160, 180] as [number, number, number, number]
    }
  }, [theme])

  const mapStyle = useMemo(() => 
    theme === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    [theme]
  )

  const quadrantPolygons = useMemo(() => {
    return heatmapQuadrants.map(q => ({
      polygon: [
        [q.bounds.minLon, q.bounds.minLat],
        [q.bounds.maxLon, q.bounds.minLat],
        [q.bounds.maxLon, q.bounds.maxLat],
        [q.bounds.minLon, q.bounds.maxLat],
        [q.bounds.minLon, q.bounds.minLat]
      ] as [number, number][],
      density: q.density,
      quadrantId: q.quadrantId
    }))
  }, [heatmapQuadrants])

  const pathData = useMemo(() => {
    if (locationHistory.length > 1) {
      return [{ path: locationHistory.map(loc => [loc.longitude, loc.latitude] as [number, number]) }]
    }
    return []
  }, [locationHistory])

  const nowRef = useRef(0)
  nowRef.current = Date.now()

  const layers = useMemo(() => {
    const layerList: any[] = []

    if (showHeatmap && heatmapMode === 'polygon' && quadrantPolygons.length > 0) {
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

    if (showHeatmap && heatmapMode === 'heatmap' && wifiObservations.length > 0) {
      const strongSignals = wifiObservations.filter(d => d.signalStrength > -45)
      const mediumSignals = wifiObservations.filter(d => d.signalStrength > -60 && d.signalStrength <= -45)
      const weakSignals = wifiObservations.filter(d => d.signalStrength <= -60)
      
      if (strongSignals.length > 0) {
        layerList.push(
          new HeatmapLayer<WifiObservation>({
            id: 'wifi-heatmap-strong',
            data: strongSignals,
            pickable: true,
            getPosition: (d: WifiObservation) => [d.longitude, d.latitude],
            getWeight: (d: WifiObservation) => Math.max(0, d.signalStrength + 100),
            radiusPixels: 180,
            intensity: 2.5,
            threshold: 0.02,
            colorRange: [
              [255, 250, 240, 0],
              [255, 245, 230, 10],
              [255, 235, 200, 30],
              [255, 220, 180, 60],
              [255, 200, 150, 90],
              [255, 180, 120, 120],
              [255, 160, 100, 150]
            ]
          })
        )
      }
      
      if (mediumSignals.length > 0) {
        layerList.push(
          new HeatmapLayer<WifiObservation>({
            id: 'wifi-heatmap-medium',
            data: mediumSignals,
            pickable: true,
            getPosition: (d: WifiObservation) => [d.longitude, d.latitude],
            getWeight: (d: WifiObservation) => Math.max(0, d.signalStrength + 100),
            radiusPixels: 100,
            intensity: 2,
            threshold: 0.05,
            colorRange: [
              [230, 200, 170, 0],
              [220, 185, 150, 10],
              [212, 163, 115, 30],
              [195, 145, 100, 60],
              [175, 125, 80, 90],
              [155, 105, 60, 120],
              [140, 90, 50, 150]
            ]
          })
        )
      }
      
      if (weakSignals.length > 0) {
        layerList.push(
          new HeatmapLayer<WifiObservation>({
            id: 'wifi-heatmap-weak',
            data: weakSignals,
            pickable: true,
            getPosition: (d: WifiObservation) => [d.longitude, d.latitude],
            getWeight: (d: WifiObservation) => Math.max(0, d.signalStrength + 100),
            radiusPixels: 50,
            intensity: 1.5,
            threshold: 0.1,
            colorRange: [
              [140, 100, 70, 0],
              [130, 90, 60, 5],
              [120, 80, 50, 15],
              [110, 75, 45, 25],
              [100, 65, 40, 40],
              [90, 55, 35, 60],
              [80, 45, 30, 80]
            ]
          })
        )
      }
      
      layerList.push(
        new ScatterplotLayer<WifiObservation>({
          id: 'wifi-points',
          data: wifiObservations,
          getPosition: (d: WifiObservation) => [d.longitude, d.latitude],
          getFillColor: (d: WifiObservation) => {
            const signal = d.signalStrength
            if (signal > -45) return [255, 235, 200, 255]
            if (signal > -60) return [212, 163, 115, 255]
            return [140, 90, 60, 255]
          },
          getRadius: 4,
          radiusMinPixels: 4,
          radiusMaxPixels: 4,
          pickable: true,
          opacity: 1
        })
      )
    }

    if (pathData.length > 0) {
      layerList.push(
        new PathLayer({
          id: 'path-layer',
          data: pathData,
          getPath: d => d.path,
          getColor: themeColors.path,
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
          getFillColor: themeColors.current,
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
            const age = nowRef.current - d.timestamp
            const alpha = Math.max(80, 200 - age / 100)
            return [themeColors.history[0], themeColors.history[1], themeColors.history[2], alpha] as [number, number, number, number]
          },
          getRadius: 50,
          radiusMinPixels: 3,
          radiusMaxPixels: 8,
          pickable: false
        })
      )
    }

    return layerList
  }, [currentLocation, locationHistory, quadrantPolygons, showHeatmap, heatmapMode, wifiObservations, heatmapOpacity, themeColors, pathData])

  const onViewStateChange = useCallback((info: { viewState: Record<string, unknown> }) => {
    const vs = info.viewState as typeof INITIAL_VIEW_STATE
    if (vs.zoom !== undefined) {
      const limits = heatmapMode === 'heatmap' 
        ? { min: 17, max: 17 }
        : { min: 14, max: 19 }
      vs.zoom = Math.min(limits.max, Math.max(limits.min, vs.zoom))
    }
    setViewState(vs)
  }, [heatmapMode])

  const getCursor = useCallback(({ isHovering }: { isHovering: boolean }) => {
    return isHovering ? 'pointer' : 'grab'
  }, [])

  useEffect(() => {
    if (currentLocation && locationHistory.length === 1) {
      setViewState(prev => ({
        ...prev,
        longitude: currentLocation.longitude,
        latitude: currentLocation.latitude
      }))
    }
  }, [currentLocation?.longitude, currentLocation?.latitude, locationHistory.length])

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={onViewStateChange}
      controller={true}
      layers={layers}
      getCursor={getCursor}
    >
      <Map
        mapStyle={mapStyle}
        attributionControl={false}
      />
    </DeckGL>
  )
}

export default React.memo(MapView)