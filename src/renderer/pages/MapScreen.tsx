import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import MapView from '../components/MapView'
import Header from '../components/Header'
import TimeSlider from '../components/TimeSlider'
import { useTheme } from '../contexts/ThemeContext'
import { useHeatmap } from '../contexts/HeatmapContext'
import { useWifiSignal } from '../contexts/WifiContext'
import { LocationData, QuadrantDensity, DensityLevel } from '../types'
import { quadrantToLatLon } from '../services/grid'
import { addWifiObservation, WifiObservation } from '../services/wifiTracker'
import { generateDummyWifiObservations } from '../services/dummyData'

type MapMode = "activity" | "wifi";

interface MapScreenProps {
  location: LocationData | null;
  locationHistory: LocationData[];
  isTracking: boolean;
  onToggleTracking: () => void;
  onNavigate?: (page: "map" | "insights" | "history" | "settings") => void;
  quadrants?: QuadrantDensity[];
  showHeatmap?: boolean;
  setShowHeatmap?: (show: boolean) => void;
  timeOffset?: number;
  setTimeOffset?: (offset: number) => void;
  getHeatmapAt?: (offset: number) => Map<string, DensityLevel>;
  isAILoading?: boolean;
  confidence?: number;
  trainingCountdown?: number;
  lastUpdated?: Date | null;
  realTimeUsers?: Map<string, number>;
}

const DENSITY_COLORS: Record<DensityLevel, string> = {
  0: "rgba(34, 197, 94, 0.2)",
  1: "rgba(34, 197, 94, 0.5)",
  2: "rgba(234, 179, 8, 0.65)",
  3: "rgba(239, 68, 68, 0.8)",
};

const DENSITY_TEXT: Record<DensityLevel, string> = {
  0: "text-green-500 dark:text-green-400",
  1: "text-green-500 dark:text-green-400",
  2: "text-yellow-500 dark:text-yellow-400",
  3: "text-red-500 dark:text-red-400",
};

const DENSITY_LABELS: Record<DensityLevel, string> = {
  0: "Low",
  1: "Moderate",
  2: "High",
  3: "Very High",
};

export default function MapScreen({
  location,
  locationHistory,
  isTracking,
  onToggleTracking,
  onNavigate,
  quadrants = [],
  showHeatmap,
  setShowHeatmap,
  timeOffset = 0,
  setTimeOffset,
  getHeatmapAt,
  isAILoading = false,
  confidence,
  trainingCountdown,
  lastUpdated,
  realTimeUsers,
}: MapScreenProps) {
  const { theme } = useTheme()
  const { setCurrentSource, currentSourceId, addWifiObservation: addWifiObs, wifiObservations, wifiHeatmapData } = useHeatmap()
  const { currentSignal } = useWifiSignal()
  const [currentMode, setCurrentMode] = useState<MapMode>("activity")
  const [isScanning, setIsScanning] = useState(false)
  const lastScanRef = useRef<number>(0)

  const handleModeChange = useCallback((mode: MapMode) => {
    setCurrentMode(mode)
    if (mode === 'activity') {
      setCurrentSource('density')
    } else if (mode === 'wifi') {
      setCurrentSource('wifi-intensity')
      if (wifiObservations.length === 0) {
        const dummyData = generateDummyWifiObservations(25)
        dummyData.forEach(obs => addWifiObs(obs))
      }
    }
  }, [setCurrentSource, addWifiObs, wifiObservations.length])

  const scanWifi = useCallback(async (loc: LocationData) => {
    if (!window.electronAPI?.wifi) return
    if (isScanning) return
    
    const now = Date.now()
    if (now - lastScanRef.current < 3000) return
    
    setIsScanning(true)
    lastScanRef.current = now
    
    try {
      const results = await window.electronAPI.wifi.scan()
      
      if (results && results.length > 0) {
        results.forEach(network => {
          if (typeof network.signal === 'number' && !isNaN(network.signal)) {
            const obs: WifiObservation = {
              id: `wifi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              latitude: loc.latitude,
              longitude: loc.longitude,
              signalStrength: network.signal,
              ssid: network.ssid || 'Unknown',
              bssid: network.bssid || '',
              frequency: network.frequency || 2400,
              timestamp: now
            }
            addWifiObs(obs)
          }
        })
      }
    } catch (err) {
      console.error('WiFi scan failed:', err)
    } finally {
      setIsScanning(false)
    }
  }, [isScanning, addWifiObs])

  useEffect(() => {
    if (currentMode === 'wifi' && location) {
      scanWifi(location)
    }
  }, [location, currentMode, scanWifi])

  useEffect(() => {
    if (currentMode === 'wifi' && location && !isScanning) {
      const interval = setInterval(() => {
        scanWifi(location)
      }, 300000)
      return () => clearInterval(interval)
    }
  }, [currentMode, location, isScanning, scanWifi])

  const handleStartTracking = useCallback(() => {
    onToggleTracking();
  }, [onToggleTracking]);

  const displayQuadrants = useMemo(() => {
    if (!getHeatmapAt) return quadrants;

    const densityMap = getHeatmapAt(timeOffset);
    const qDensities: QuadrantDensity[] = [];

    densityMap.forEach((density, quadrantId) => {
      const bounds = quadrantToLatLon(quadrantId);
      if (bounds) {
        qDensities.push({
          quadrantId,
          density,
          bounds,
          count: 0,
        });
      }
    });

    return qDensities;
  }, [getHeatmapAt, timeOffset, quadrants]);

  const densityCounts = useMemo(() => {
    const counts: Record<DensityLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    displayQuadrants.forEach((q) => {
      counts[q.density]++;
    });
    return counts;
  }, [displayQuadrants]);

  const formatCountdown = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getModeButtonStyle = (mode: MapMode) => {
    const isActive = currentMode === mode;
    return isActive
      ? "bg-teal-500/30 text-tea-green border border-teal-500/50"
      : "bg-dark-teal/20 text-air-force-blue border border-dark-teal/30 hover:bg-dark-teal/30";
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header title="Map" onNavigate={onNavigate} />

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <MapView
            currentLocation={location}
            locationHistory={locationHistory}
            heatmapQuadrants={displayQuadrants}
            showHeatmap={true}
            heatmapOpacity={0.6}
            heatmapMode={currentMode === 'wifi' ? 'heatmap' : 'polygon'}
            wifiObservations={wifiObservations}
            wifiHeatmapData={wifiHeatmapData}
          />
        </div>

        {currentMode === "activity" && (
          <div className="absolute top-4 left-4 z-20">
            <div
              className={`backdrop-blur-2xl border p-3 shadow-2xl rounded-lg ${
                theme === "dark"
                  ? "bg-ink-black/90 border-air-force-blue/10"
                  : "bg-cornsilk/90 border-tea-green/10"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-air-force-blue dark:text-tea-green">
                  Activity Map
                </span>
                {isAILoading ? (
                  <span className="text-xs text-amber-400 animate-pulse">
                    Loading...
                  </span>
                ) : (
                  <span className="text-xs text-green-400">Live</span>
                )}
              </div>

              <div className="space-y-1 mb-3">
                {([0, 1, 2, 3] as DensityLevel[]).map((level) => (
                  <div key={level} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded"
                      style={{
                        backgroundColor: DENSITY_COLORS[level],
                      }}
                    />
                    <span className={DENSITY_TEXT[level]}>
                      {DENSITY_LABELS[level]}
                    </span>
                    <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">
                      {densityCounts[level]} cells
                    </span>
                  </div>
                ))}
              </div>

              {lastUpdated && (
                <div className="text-xs text-air-force-blue/50 dark:text-air-force-blue/40 mt-1">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}

              {trainingCountdown !== undefined && trainingCountdown > 0 && (
                <div className="text-xs text-amber-400/70 mt-1">
                  Next training: {formatCountdown(trainingCountdown)}
                </div>
              )}
            </div>
          </div>
        )}

        {currentMode === "wifi" && (
          <div className="absolute top-4 left-4 z-20">
            <div
              className={`backdrop-blur-2xl border p-3 shadow-2xl rounded-lg ${
                theme === "dark"
                  ? "bg-ink-black/90 border-air-force-blue/10"
                  : "bg-cornsilk/90 border-tea-green/10"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-air-force-blue dark:text-tea-green">
                  WiFi Signal Map
                </span>
                {isScanning ? (
                  <span className="text-xs text-amber-400 animate-pulse">Scanning...</span>
                ) : (
                  <span className="text-xs text-teal-400">Live</span>
                )}
              </div>

              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FF6B35' }} />
                  <span className="text-bronze dark:text-bronze">Strong</span>
                  <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">-40 dBm</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#CC7722' }} />
                  <span className="text-bronze dark:text-bronze">Good</span>
                  <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">-50 dBm</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#D4A373' }} />
                  <span className="text-bronze dark:text-bronze">Medium</span>
                  <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">-60 dBm</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FFE4C4' }} />
                  <span className="text-bronze dark:text-bronze">Weak</span>
                  <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">-70 dBm</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FFFEF0' }} />
                  <span className="text-bronze dark:text-bronze">Very Weak</span>
                  <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">-80 dBm</span>
                </div>
              </div>

              <div className="text-xs text-air-force-blue/50 dark:text-air-force-blue/40">
                {wifiObservations.length} observations
              </div>
            </div>
          </div>
        )}

        {currentMode === "activity" && setTimeOffset && (
          <div className="absolute top-4 right-4 z-20 w-64">
            <TimeSlider
              value={timeOffset}
              onChange={setTimeOffset}
              min={0}
              max={180}
              step={5}
            />
          </div>
        )}

        <div className="absolute bottom-32 left-4 right-4 z-10 w-72 mx-auto md:w-80 md:left-6 md:bottom-24">
          <div
            className={`backdrop-blur-2xl border p-3 shadow-2xl ${
              theme === "dark"
                ? "bg-ink-black/90 border-air-force-blue/10"
                : "bg-cornsilk/90 border-tea-green/10"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 text-air-force-blue dark:text-tea-green">
                  Current Sector
                </p>
                <h2 className="text-lg font-headline font-bold tracking-tight">
                  {location ? "Your Location" : "Waiting for GPS..."}
                </h2>
              </div>
              <div className="flex items-center gap-1 bg-dark-teal/20 px-2 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-dark-teal"></span>
                <span className="text-[10px] font-bold uppercase">
                  {isTracking ? "Active" : "Paused"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-2 ${theme === "dark" ? "bg-dark-teal/50" : "bg-papaya-whip"}`}
              >
                <p className="text-[10px] uppercase mb-1 text-air-force-blue dark:text-tea-green">
                  Signal
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-bold text-bronze dark:text-ash-grey">
                    {currentSignal !== -100 ? currentSignal : "--"}
                  </span>
                  <span className="text-[10px] mb-1 text-air-force-blue dark:text-tea-green">
                    dBm
                  </span>
                </div>
              </div>
              <div
                className={`p-2 ${theme === "dark" ? "bg-dark-teal/50" : "bg-papaya-whip"}`}
              >
                <p className="text-[10px] uppercase mb-1 text-air-force-blue dark:text-tea-green">
                  Points
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-bold text-bronze dark:text-ash-grey">
                    {locationHistory.length}
                  </span>
                  <span className="text-[10px] mb-1 text-air-force-blue dark:text-tea-green">
                    logged
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`absolute bottom-20 md:bottom-0 left-0 right-0 backdrop-blur-xl border-t px-6 py-3 flex items-center justify-between z-20 ${
            theme === "dark"
              ? "bg-ink-black/90 border-air-force-blue/10 text-light-beige"
              : "bg-cornsilk/90 border-tea-green/10 text-ink-black"
          }`}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-bronze text-sm">
                location_on
              </span>
              <span className="text-xs font-bold uppercase tracking-tight">
                {location
                  ? `${location.latitude.toFixed(4)}° N, ${location.longitude.toFixed(4)}° W`
                  : "Acquiring location..."}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full overflow-hidden border border-dark-teal/30">
              <button
                onClick={() => handleModeChange("activity")}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${getModeButtonStyle("activity")}`}
              >
                Activity
              </button>
              <button
                onClick={() => handleModeChange("wifi")}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${getModeButtonStyle("wifi")}`}
              >
                Signal
              </button>
            </div>

            <button
              onClick={handleStartTracking}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                isTracking
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50"
                  : "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50"
              }`}
            >
              {isTracking ? "Stop Tracking" : "Start Tracking"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
