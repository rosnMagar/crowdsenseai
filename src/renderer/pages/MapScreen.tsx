import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import ImageUploader from '../components/ImageUploader'
import { fetchGeotaggedImages, GeotaggedImage } from '../services/api'

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
  
  const [isUploaderOpen, setIsUploaderOpen] = useState(false)
  const [selectedImageGroup, setSelectedImageGroup] = useState<GeotaggedImage[] | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [imageGroups, setImageGroups] = useState<GeotaggedImage[][]>([])
  const [isLegendOpen, setIsLegendOpen] = useState(true)
  const [isSwitchingMode, setIsSwitchingMode] = useState(false)

  const loadImages = useCallback(async () => {
    const images = await fetchGeotaggedImages()
    const groups: Record<string, GeotaggedImage[]> = {}
    for (const img of images) {
      const key = `${img.latitude.toFixed(5)},${img.longitude.toFixed(5)}`
      if (!groups[key]) groups[key] = []
      groups[key].push(img)
    }
    setImageGroups(Object.values(groups))
  }, [])

  useEffect(() => {
    loadImages()
    const interval = setInterval(loadImages, 30000)
    return () => clearInterval(interval)
  }, [loadImages])

  const handleModeChange = useCallback((mode: MapMode) => {
    if (mode === currentMode) return;
    
    setIsSwitchingMode(true);
    
    // Give the UI a moment to show the loader before the heavy lift
    setTimeout(() => {
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
      
      // Simulation of work or just letting the map component catch up
      setTimeout(() => setIsSwitchingMode(false), 900);
    }, 100);
  }, [currentMode, setCurrentSource, addWifiObs, wifiObservations.length])

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
            imageGroups={imageGroups}
            onGroupClick={(group) => {
              setCarouselIndex(0)
              setSelectedImageGroup(group)
            }}
          />
        </div>

        <AnimatePresence>
          {isSwitchingMode && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl"
            >
              <div className="relative w-20 h-20 mb-6">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-teal-500/20 border-t-teal-500 rounded-full"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 border-2 border-bronze/20 border-t-bronze rounded-full"
                />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-teal-400 font-headline font-black tracking-[0.3em] uppercase text-xs mb-2">Analyzing Grid</p>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full border border-white/5 bg-white/5">
                  {currentMode === 'activity' ? 'Switching to Signal Intensity' : 'Loading Crowd Activity'}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isUploaderOpen && (
            <ImageUploader 
              currentLocation={location}
              onClose={() => setIsUploaderOpen(false)}
              onSuccess={() => {
                setIsUploaderOpen(false)
                loadImages()
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedImageGroup && selectedImageGroup.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" 
              onClick={() => setSelectedImageGroup(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative max-w-6xl w-full max-h-[90vh] flex flex-col items-center justify-center p-4" 
                onClick={e => e.stopPropagation()}
              >
              <button 
                onClick={() => setSelectedImageGroup(null)}
                className="absolute -top-4 -right-4 md:top-4 md:right-4 text-white/70 hover:text-white bg-black/50 hover:bg-black/90 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 active:scale-90 focus:outline-none z-[110] shadow-2xl border border-white/10"
                title="Close Image"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
              
              <div className="relative flex items-center justify-center w-full">
                {selectedImageGroup.length > 1 && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setCarouselIndex(i => i === 0 ? selectedImageGroup.length - 1 : i - 1); 
                    }}
                    className="absolute left-0 md:left-4 z-20 text-white hover:text-teal-400 bg-black/60 hover:bg-black/90 p-3 rounded-full transition-all duration-300 hover:scale-110 hover:-translate-x-1 active:scale-90 shadow-xl"
                  >
                    <span className="material-symbols-outlined text-3xl">chevron_left</span>
                  </button>
                )}
                
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={selectedImageGroup[carouselIndex].id || carouselIndex}
                    src={selectedImageGroup[carouselIndex].image_url} 
                    alt={selectedImageGroup[carouselIndex].description} 
                    initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-full max-h-[60vh] md:max-h-[70vh] object-contain rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20" 
                  />
                </AnimatePresence>

                {selectedImageGroup.length > 1 && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setCarouselIndex(i => (i + 1) % selectedImageGroup.length); 
                    }}
                    className="absolute right-0 md:right-4 z-20 text-white hover:text-teal-400 bg-black/60 hover:bg-black/90 p-3 rounded-full transition-all duration-300 hover:scale-110 hover:translate-x-1 active:scale-90 shadow-xl"
                  >
                    <span className="material-symbols-outlined text-3xl">chevron_right</span>
                  </button>
                )}
              </div>

              {selectedImageGroup.length > 1 && (
                <div className="flex gap-3 mt-5">
                  {selectedImageGroup.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCarouselIndex(i)}
                      className={`w-3 h-3 rounded-full transition-all ${i === carouselIndex ? 'bg-teal-400 scale-125' : 'bg-white/30 hover:bg-white/60'}`} 
                    />
                  ))}
                </div>
              )}
              
              <div className="mt-5 p-4 md:p-6 bg-black/60 rounded-xl backdrop-blur-lg text-white text-center w-full max-w-3xl border border-white/10 shadow-2xl">
                <p className="text-base md:text-lg font-medium leading-relaxed">{selectedImageGroup[carouselIndex].description}</p>
                <div className="text-xs text-white/50 mt-3 font-medium uppercase tracking-widest flex items-center justify-center gap-2">
                  {selectedImageGroup.length > 1 && (
                    <span className="bg-teal-500/20 text-teal-400 px-2 py-1 rounded">Photo {carouselIndex + 1} of {selectedImageGroup.length}</span>
                  )}
                  {selectedImageGroup[carouselIndex].created_at && (
                    <span>• {new Date(selectedImageGroup[carouselIndex].created_at!).toLocaleString()}</span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

        {currentMode === "activity" && (
          <div className="absolute top-4 left-4 z-20 max-w-[calc(100vw-2rem)] md:max-w-xs">
            <motion.div
              layout
              className={`backdrop-blur-2xl border p-3 shadow-2xl rounded-2xl ${
                theme === "dark"
                  ? "bg-ink-black/90 border-air-force-blue/10"
                  : "bg-cornsilk/90 border-tea-green/10"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-air-force-blue dark:text-tea-green">
                    Activity Map
                  </span>
                  {isAILoading ? (
                    <span className="text-[10px] text-amber-400 animate-pulse">Loading...</span>
                  ) : (
                    <span className="text-[10px] text-green-400">Live</span>
                  )}
                </div>
                <button 
                  onClick={() => setIsLegendOpen(!isLegendOpen)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isLegendOpen ? 'rotate-180' : ''}`}>
                    keyboard_arrow_down
                  </span>
                </button>
              </div>

              <AnimatePresence initial={false}>
                {isLegendOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5 mb-2 pt-1 border-t border-black/5 dark:border-white/5 mt-2">
                      {([0, 1, 2, 3] as DensityLevel[]).map((level) => (
                        <div key={level} className="flex items-center gap-2 text-[10px] md:text-xs">
                          <div
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: DENSITY_COLORS[level] }}
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
                      <div className="text-[10px] text-air-force-blue/50 dark:text-air-force-blue/40">
                        {lastUpdated.toLocaleTimeString()}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {currentMode === "wifi" && (
          <div className="absolute top-4 left-4 z-20 max-w-[calc(100vw-2rem)] md:max-w-xs">
            <motion.div
              layout
              className={`backdrop-blur-2xl border p-3 shadow-2xl rounded-2xl ${
                theme === "dark"
                  ? "bg-ink-black/90 border-air-force-blue/10"
                  : "bg-cornsilk/90 border-tea-green/10"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-air-force-blue dark:text-tea-green">
                    WiFi Signal Map
                  </span>
                  {isScanning ? (
                    <span className="text-[10px] text-amber-400 animate-pulse">Scanning...</span>
                  ) : (
                    <span className="text-[10px] text-teal-400">Live</span>
                  )}
                </div>
                <button 
                  onClick={() => setIsLegendOpen(!isLegendOpen)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isLegendOpen ? 'rotate-180' : ''}`}>
                    keyboard_arrow_down
                  </span>
                </button>
              </div>

              <AnimatePresence initial={false}>
                {isLegendOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5 mb-2 pt-1 border-t border-black/5 dark:border-white/5 mt-2">
                      <div className="flex items-center gap-2 text-[10px] md:text-xs">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#FF6B35' }} />
                        <span className="text-bronze dark:text-bronze">Strong</span>
                        <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">-40 dBm</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] md:text-xs">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#CC7722' }} />
                        <span className="text-bronze dark:text-bronze">Good</span>
                        <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">-50 dBm</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] md:text-xs">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#D4A373' }} />
                        <span className="text-bronze dark:text-bronze">Medium</span>
                        <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">-60 dBm</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] md:text-xs">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#FFE4C4' }} />
                        <span className="text-bronze dark:text-bronze">Weak</span>
                        <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">-70 dBm</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] md:text-xs">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#FFFEF0' }} />
                        <span className="text-bronze dark:text-bronze">Very Weak</span>
                        <span className="text-air-force-blue/50 dark:text-air-force-blue/40 ml-auto">-80 dBm</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-air-force-blue/50 dark:text-air-force-blue/40">
                      {wifiObservations.length} observations
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {currentMode === "activity" && setTimeOffset && (
          <>
            {/* Desktop: Top-Right Horizontal */}
            <div className="hidden md:block absolute top-8 right-4 z-20 w-64">
              <TimeSlider
                value={timeOffset}
                onChange={setTimeOffset}
                min={0}
                max={180}
                step={5}
                orientation="horizontal"
              />
            </div>

            {/* Mobile: Left-Side Vertical */}
            <div className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 z-20 w-auto">
              <TimeSlider
                value={timeOffset}
                onChange={setTimeOffset}
                min={0}
                max={180}
                step={5}
                orientation="vertical"
              />
            </div>
          </>
        )}

        <div className="absolute bottom-32 md:bottom-24 left-4 right-4 md:left-6 z-10 w-auto max-w-sm md:w-80 mx-auto md:mx-0">
          <div
            className={`backdrop-blur-2xl border p-3 md:p-4 shadow-2xl rounded-2xl ${
              theme === "dark"
                ? "bg-ink-black/90 border-air-force-blue/10"
                : "bg-cornsilk/90 border-tea-green/10"
            }`}
          >
            <div className="flex justify-between items-start mb-2 md:mb-3">
              <div className="overflow-hidden">
                <p className="text-[9px] md:text-[10px] font-semibold uppercase tracking-widest mb-0.5 text-air-force-blue dark:text-tea-green">
                  Current Sector
                </p>
                <h2 className="text-base md:text-lg font-headline font-bold tracking-tight truncate">
                  {location ? "Active Zone" : "Finding GPS..."}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 bg-dark-teal/10 dark:bg-dark-teal/20 px-2 py-1 rounded-full border border-dark-teal/10">
                <span className={`w-1.5 h-1.5 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[9px] font-black uppercase tracking-tighter">
                  {isTracking ? "Live" : "Paused"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2 rounded-xl ${theme === "dark" ? "bg-white/5" : "bg-black/5"}`}>
                <p className="text-[9px] uppercase mb-0.5 opacity-50 font-bold">Signal</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg md:text-xl font-black text-teal-600 dark:text-teal-400">
                    {currentSignal !== -100 ? currentSignal : "--"}
                  </span>
                  <span className="text-[9px] font-bold opacity-40">dBm</span>
                </div>
              </div>
              <div className={`p-2 rounded-xl ${theme === "dark" ? "bg-white/5" : "bg-black/5"}`}>
                <p className="text-[9px] uppercase mb-0.5 opacity-50 font-bold">Accuracy</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg md:text-xl font-black text-amber-600 dark:text-amber-400">
                    High
                  </span>
                  <span className="text-[9px] font-bold opacity-40">GPS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`absolute bottom-20 md:bottom-0 left-0 right-0 backdrop-blur-xl border-t px-4 md:px-6 py-3 flex flex-col md:flex-row items-center justify-between z-20 gap-3 md:gap-0 ${
            theme === "dark"
              ? "bg-ink-black/90 border-air-force-blue/10 text-light-beige"
              : "bg-cornsilk/90 border-tea-green/10 text-ink-black"
          }`}
        >
          <div className="hidden md:flex items-center gap-6">
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

          <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-2 md:gap-4">
            <div className="flex items-center gap-2 flex-1 md:flex-none">
              <button
                 onClick={() => setIsUploaderOpen(true)}
                 className="w-10 h-10 flex items-center justify-center rounded-full bg-teal-500 text-white shadow-lg hover:shadow-teal-500/50 transition-all duration-300 hover:scale-110 active:scale-95"
                 title="Add Geotagged Photo"
              >
                <span className="material-symbols-outlined text-sm">add_a_photo</span>
              </button>
              
              <div className="flex items-center rounded-full overflow-hidden border border-dark-teal/40 bg-black/30 backdrop-blur-md p-1 gap-1 shadow-inner flex-1 md:flex-none justify-center">
                <button
                  onClick={() => handleModeChange("activity")}
                  className={`flex-1 md:flex-none py-1.5 px-3 md:px-5 text-[10px] md:text-xs font-bold transition-all duration-400 rounded-full ${
                    currentMode === "activity"
                      ? "bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                      : "text-air-force-blue hover:text-white opacity-60 hover:opacity-100"
                  }`}
                >
                  Activity
                </button>
                <button
                  onClick={() => handleModeChange("wifi")}
                  className={`flex-1 md:flex-none py-1.5 px-3 md:px-5 text-[10px] md:text-xs font-bold transition-all duration-400 rounded-full ${
                    currentMode === "wifi"
                      ? "bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                      : "text-air-force-blue hover:text-white opacity-60 hover:opacity-100"
                  }`}
                >
                  Signal
                </button>
              </div>
            </div>

            <button
              onClick={handleStartTracking}
              className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${
                isTracking
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "bg-green-500/20 text-green-400 border border-green-500/40"
              }`}
            >
              {isTracking ? "Stop" : "Start"} Tracking
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
