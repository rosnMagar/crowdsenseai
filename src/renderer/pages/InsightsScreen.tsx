import { useEffect } from 'react'
import Header from '../components/Header'
import { useTheme } from '../contexts/ThemeContext'
import { useWifi, getSignalBars, formatFrequency } from '../hooks/useWifi'

interface InsightsScreenProps {
  onNavigate?: (page: string) => void;
}

export default function InsightsScreen({ onNavigate }: InsightsScreenProps) {
  const { theme } = useTheme()
  const { 
    networks, 
    isScanning, 
    isSupported, 
    error, 
    lastScanTime, 
    scan, 
    startAutoScan, 
    stopAutoScan, 
    stats 
  } = useWifi()

  useEffect(() => {
    startAutoScan()
    return () => stopAutoScan()
  }, [startAutoScan, stopAutoScan])

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-400'
      case 'good': return 'text-teal-400'
      case 'fair': return 'text-yellow-400'
      case 'poor': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const SignalBars = ({ signal }: { signal: number }) => {
    const bars = getSignalBars(signal)
    return (
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`w-1 rounded-sm ${
              i <= bars
                ? signal >= -50 
                  ? 'bg-green-400' 
                  : signal >= -60 
                    ? 'bg-teal-400' 
                    : signal >= -70 
                      ? 'bg-yellow-400' 
                      : 'bg-red-400'
                : 'bg-gray-600'
            }`}
            style={{ height: `${i * 25}%` }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Signal Insights" onNavigate={onNavigate} />
      
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 overflow-y-auto">
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-headline font-medium tracking-tight mb-1">
              WiFi Analytics
            </h2>
            <p className="text-air-force-blue dark:text-tea-green font-body text-sm">
              Real-time wireless network scanning and signal analysis.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastScanTime && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last scan: {lastScanTime.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={scan}
              disabled={isScanning}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                isScanning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              {isScanning ? 'Scanning...' : 'Scan Now'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!isSupported ? (
          <div className="p-8 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
            <span className="material-symbols-outlined text-4xl text-yellow-500 mb-2">warning</span>
            <p className="text-yellow-400">WiFi scanning is not supported on this platform.</p>
            <p className="text-sm text-yellow-400/60 mt-1">Try running the app on Windows, Linux, or macOS.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
              <div className={`p-4 md:p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
                theme === 'dark'
                  ? 'bg-dark-teal border-air-force-blue/10'
                  : 'bg-beige border-tea-green/10'
              }`}>
                <span className="material-symbols-outlined text-3xl md:text-4xl text-teal-400 mb-2">wifi</span>
                <h3 className="font-headline font-bold text-xs md:text-sm">Networks</h3>
                <p className="text-2xl md:text-3xl font-black mt-2 text-bronze dark:text-ash-grey">
                  {stats.networkCount}
                </p>
              </div>

              <div className={`p-4 md:p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
                theme === 'dark'
                  ? 'bg-dark-teal border-air-force-blue/10'
                  : 'bg-beige border-tea-green/10'
              }`}>
                <span className="material-symbols-outlined text-3xl md:text-4xl text-teal-400 mb-2">signal_cellular_alt</span>
                <h3 className="font-headline font-bold text-xs md:text-sm">Avg Signal</h3>
                <p className={`text-2xl md:text-3xl font-black mt-2 ${getQualityColor(stats.signalQuality)}`}>
                  {stats.averageSignal} dBm
                </p>
              </div>

              <div className={`p-4 md:p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
                theme === 'dark'
                  ? 'bg-dark-teal border-air-force-blue/10'
                  : 'bg-beige border-tea-green/10'
              }`}>
                <span className="material-symbols-outlined text-3xl md:text-4xl text-teal-400 mb-2">speed</span>
                <h3 className="font-headline font-bold text-xs md:text-sm">Quality</h3>
                <p className={`text-2xl md:text-3xl font-black mt-2 capitalize ${getQualityColor(stats.signalQuality)}`}>
                  {stats.signalQuality}
                </p>
              </div>

              <div className={`p-4 md:p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
                theme === 'dark'
                  ? 'bg-dark-teal border-air-force-blue/10'
                  : 'bg-beige border-tea-green/10'
              }`}>
                <span className="material-symbols-outlined text-3xl md:text-4xl text-teal-400 mb-2">radar</span>
                <h3 className="font-headline font-bold text-xs md:text-sm">2.4 / 5 GHz</h3>
                <p className="text-2xl md:text-3xl font-black mt-2 text-bronze dark:text-ash-grey">
                  {stats.bands['2.4GHz']}/{stats.bands['5GHz']}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-headline font-bold mb-4">Detected Networks</h3>
              <div className="space-y-2">
                {networks.length === 0 ? (
                  <div className={`p-8 rounded-lg text-center ${
                    theme === 'dark' ? 'bg-dark-teal' : 'bg-beige'
                  }`}>
                    <p className="text-gray-500">No networks detected. Click "Scan Now" to search.</p>
                  </div>
                ) : (
                  networks
                    .sort((a, b) => b.signal - a.signal)
                    .map((network, index) => (
                      <div
                        key={network.bssid || index}
                        className={`p-4 rounded-lg border flex items-center justify-between gap-4 ${
                          theme === 'dark'
                            ? 'bg-dark-teal/50 border-air-force-blue/20'
                            : 'bg-beige/50 border-tea-green/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <SignalBars signal={network.signal} />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{network.ssid}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {network.bssid} • Ch {network.channel} • {formatFrequency(network.frequency)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {network.security && network.security !== 'none' && (
                            <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 16 }}>
                              lock
                            </span>
                          )}
                          <span className={`font-mono ${
                            network.signal >= -50 ? 'text-green-400' :
                            network.signal >= -60 ? 'text-teal-400' :
                            network.signal >= -70 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {network.signal} dBm
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
