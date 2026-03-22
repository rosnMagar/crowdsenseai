import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, PathLayer, PolygonLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { Map } from 'react-map-gl/maplibre'
import { LocationData, QuadrantDensity, DensityLevel } from '../types'
import { WifiObservation } from '../services/wifiTracker'
import { HeatmapPoint } from '../types/heatmap'
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
  wifiHeatmapData?: HeatmapPoint[]
}

const DENSITY_COLORS: Record<number, { fill: [number, number, number, number]; stroke: [number, number, number, number] }> = {
  0: { fill: [34, 197, 94, 20], stroke: [34, 197, 94, 40] },
  1: { fill: [34, 197, 94, 120], stroke: [34, 197, 94, 180] },
  2: { fill: [234, 179, 8, 160], stroke: [234, 179, 8, 200] },
  3: { fill: [239, 68, 68, 200], stroke: [239, 68, 68, 255] }
}

function signalToColor(signal: number): [number, number, number, number] {
  const normalized = Math.min(100, Math.max(0, signal))
  
  const colors: [number, number, number][] = [
    [255, 254, 240],  // 0   - White/Cream (Weak)
    [255, 228, 196],  // 25  - Light tan
    [212, 163, 115],  // 50  - Tan
    [204, 119, 34],   // 75  - Dark amber
    [255, 107, 53]    // 100 - Vibrant orange (Strong)
  ]
  
  const segment = normalized / 25
  const index = Math.min(4, Math.floor(segment))
  const t = segment - index
  
  const c1 = colors[index]
  const c2 = colors[Math.min(index + 1, 4)]
  
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
    180
  ]
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
  wifiObservations = [],
  wifiHeatmapData = []
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

    if (showHeatmap && heatmapMode === 'heatmap') {
      if (wifiHeatmapData.length > 0) {
        const krigingPolygons = wifiHeatmapData.map(p => ({
          polygon: [
            [p.bounds.minLon, p.bounds.minLat],
            [p.bounds.maxLon, p.bounds.minLat],
            [p.bounds.maxLon, p.bounds.maxLat],
            [p.bounds.minLon, p.bounds.maxLat],
            [p.bounds.minLon, p.bounds.minLat]
          ] as [number, number][],
          signal: p.metadata?.signal as number ?? 0
        }))

        layerList.push(
          new PolygonLayer({
            id: 'kriging-grid-layer',
            data: krigingPolygons,
            pickable: true,
            stroked: false,
            filled: true,
            getPolygon: (d: typeof krigingPolygons[0]) => d.polygon,
            getFillColor: (d: typeof krigingPolygons[0]) => signalToColor(d.signal),
            opacity: heatmapOpacity
          })
        )
      }

      if (wifiObservations.length > 0) {
        layerList.push(
          new ScatterplotLayer<WifiObservation>({
            id: 'wifi-points-input',
            data: wifiObservations,
            getPosition: (d: WifiObservation) => [d.longitude, d.latitude],
            getFillColor: [0, 255, 255, 255],
            getLineColor: [0, 180, 180, 255],
            getRadius: 6,
            radiusMinPixels: 6,
            radiusMaxPixels: 8,
            lineWidthMinPixels: 2,
            stroked: true,
            pickable: true,
            opacity: 1
          })
        )
      }
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
  }, [currentLocation, locationHistory, quadrantPolygons, showHeatmap, heatmapMode, wifiObservations, wifiHeatmapData, heatmapOpacity, themeColors, pathData])

  const onViewStateChange = useCallback((info: { viewState: Record<string, unknown> }) => {
    setViewState(info.viewState as typeof INITIAL_VIEW_STATE)
  }, [])

  const getCursor = useCallback(({ isHovering }: { isHovering: boolean }) => {
    return isHovering ? 'pointer' : 'grab'
  }, [])

  const getTooltip = useCallback(({ object }: { object?: WifiObservation | { signal: number } }) => {
    if (!object) return null
    
    if ('signalStrength' in object) {
      return {
        html: `<div style="padding: 8px; background: rgba(0,0,0,0.85); border-radius: 6px; color: white; font-family: system-ui; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          <strong style="font-size: 13px;">${object.ssid || 'Unknown Network'}</strong><br/>
          <span style="color: #FF6B35; font-size: 16px; font-weight: bold;">${object.signalStrength} dBm</span><br/>
          <span style="font-size: 10px; color: #aaa;">${object.bssid || 'N/A'}</span>
        </div>`,
        style: { backgroundColor: 'transparent', border: 'none', padding: '0' }
      }
    }
    
    if ('signal' in object) {
      return {
        html: `<div style="padding: 6px 10px; background: rgba(0,0,0,0.85); border-radius: 4px; color: white; font-family: system-ui;">
          <span style="color: #FF6B35; font-weight: bold;">${Math.round(object.signal)}</span> signal
        </div>`,
        style: { backgroundColor: 'transparent', border: 'none', padding: '0' }
      }
    }
    
    return null
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
      getTooltip={getTooltip}
    >
      <Map
        mapStyle={mapStyle}
        attributionControl={false}
      />
    </DeckGL>
  )
}

export default React.memo(MapView)