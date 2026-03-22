import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { useTheme } from '../contexts/ThemeContext'
import { useHeatmap } from '../contexts/HeatmapContext'
import { WifiAccessPoint } from '../hooks/useWifi'

interface InsightsScreenProps {
  onNavigate?: (page: string) => void
}

export default function InsightsScreen({ onNavigate }: InsightsScreenProps) {
  const { theme } = useTheme()
  const { registerSource } = useHeatmap()
  const [connection, setConnection] = useState<WifiAccessPoint | null>(null)
  const [networks, setNetworks] = useState<WifiAccessPoint[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null)

  const scanNetworks = async () => {
    if (!window.electronAPI?.wifi) {
      setError('WiFi API not available')
      return
    }

    setIsScanning(true)
    setError(null)

    try {
      const results = await window.electronAPI.wifi.scan()
      const mapped = results.map(r => ({
        ssid: r.ssid || 'Hidden Network',
        bssid: r.bssid || '',
        signal: typeof r.signal === 'number' && !isNaN(r.signal) ? r.signal : -100,
        channel: typeof r.channel === 'number' ? r.channel : 0,
        frequency: typeof r.frequency === 'number' ? r.frequency : 2400,
        quality: typeof r.quality === 'number' ? r.quality : 0,
        security: r.security || 'unknown'
      }))
      setNetworks(mapped)
      setLastScanTime(new Date())
      
      if (mapped.length > 0) {
        const strongest = mapped.reduce((prev, curr) => 
          (curr.signal > prev.signal) ? curr : prev
        )
        setConnection(strongest)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setIsScanning(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await scanNetworks()
      setIsLoading(false)
    }
    init()

    const interval = setInterval(scanNetworks, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatFrequency = (freq: number) => {
    if (freq < 3000) return '2.4 GHz'
    if (freq < 6000) return '5 GHz'
    return '6 GHz'
  }

  const getSignalQuality = (signal: number) => {
    if (signal >= -50) return { label: 'Excellent', color: 'text-green-400', bars: 4 }
    if (signal >= -60) return { label: 'Good', color: 'text-teal-400', bars: 3 }
    if (signal >= -70) return { label: 'Fair', color: 'text-yellow-400', bars: 2 }
    return { label: 'Poor', color: 'text-red-400', bars: 1 }
  }

  const SignalBars = ({ signal }: { signal: number }) => {
    const { bars } = getSignalQuality(signal)
    return (
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`w-1.5 rounded-sm transition-colors ${
              i <= bars ? getSignalQuality(signal).color.replace('text-', 'bg-') : 'bg-gray-600'
            }`}
            style={{ height: `${i * 25}%` }}
          />
        ))}
      </div>
    )
  }

  const currentQuality = connection ? getSignalQuality(connection.signal) : null

  const formatSignal = (signal: number | undefined | null) => {
    if (signal == null || isNaN(signal)) return '--'
    return `${signal}`
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
              Real-time wireless network analysis.
            </p>
          </div>
          <button
            onClick={scanNetworks}
            disabled={isScanning}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              isScanning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-500 text-white'
            }`}
          >
            {isScanning ? 'Scanning...' : 'Scan Networks'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-teal-400">Loading WiFi information...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              <div className={`p-4 md:p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
                theme === 'dark'
                  ? 'bg-dark-teal border-air-force-blue/10'
                  : 'bg-beige border-tea-green/10'
              }`}>
                <span className="material-symbols-outlined text-3xl md:text-4xl text-teal-400 mb-2">wifi</span>
                <h3 className="font-headline font-bold text-xs md:text-sm">Network</h3>
                <p className="text-lg md:text-xl font-black mt-2 text-bronze dark:text-ash-grey truncate max-w-full">
                  {connection?.ssid || 'Not Connected'}
                </p>
              </div>

              <div className={`p-4 md:p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
                theme === 'dark'
                  ? 'bg-dark-teal border-air-force-blue/10'
                  : 'bg-beige border-tea-green/10'
              }`}>
                <span className="material-symbols-outlined text-3xl md:text-4xl text-teal-400 mb-2">signal_cellular_alt</span>
                <h3 className="font-headline font-bold text-xs md:text-sm">Signal Strength</h3>
                <p className={`text-2xl md:text-3xl font-black mt-2 ${currentQuality?.color || 'text-gray-400'}`}>
                  {connection ? `${formatSignal(connection.signal)} dBm` : '-- dBm'}
                </p>
              </div>

              <div className={`p-4 md:p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
                theme === 'dark'
                  ? 'bg-dark-teal border-air-force-blue/10'
                  : 'bg-beige border-tea-green/10'
              }`}>
                <span className="material-symbols-outlined text-3xl md:text-4xl text-teal-400 mb-2">speed</span>
                <h3 className="font-headline font-bold text-xs md:text-sm">Quality</h3>
                <p className={`text-2xl md:text-3xl font-black mt-2 capitalize ${currentQuality?.color || 'text-gray-400'}`}>
                  {currentQuality?.label || 'N/A'}
                </p>
              </div>
            </div>

            {connection && (
              <div className="mb-8">
                <h3 className="text-lg font-headline font-bold mb-4">Current Connection</h3>
                <div className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-dark-teal border-air-force-blue/20'
                    : 'bg-beige border-tea-green/20'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <SignalBars signal={connection.signal} />
                      <div>
                        <h4 className="text-xl font-bold">{connection.ssid}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{connection.bssid}</p>
                      </div>
                    </div>
                    {connection.security !== 'none' && (
                      <span className="material-symbols-outlined text-teal-400">lock</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Channel</p>
                      <p className="font-bold">{connection.channel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Frequency</p>
                      <p className="font-bold">{formatFrequency(connection.frequency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Signal</p>
                      <p className="font-bold">{formatSignal(connection.signal)} dBm</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Security</p>
                      <p className="font-bold text-sm">{connection.security}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-headline font-bold">Nearby Networks</h3>
                {lastScanTime && (
                  <span className="text-xs text-gray-500">
                    Last scan: {lastScanTime.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {networks.length === 0 ? (
                  <div className={`p-8 rounded-lg text-center ${
                    theme === 'dark' ? 'bg-dark-teal' : 'bg-beige'
                  }`}>
                    <p className="text-gray-500">No networks detected.</p>
                  </div>
                ) : (
                  networks
                    .sort((a, b) => b.signal - a.signal)
                    .map((network, index) => {
                      const quality = getSignalQuality(network.signal)
                      return (
                        <div
                          key={network.bssid || index}
                          className={`p-4 rounded-lg border flex items-center justify-between gap-4 ${
                            network.bssid === connection?.bssid
                              ? theme === 'dark'
                                ? 'bg-teal-900/30 border-teal-500/50'
                                : 'bg-teal-50 border-teal-500/50'
                              : theme === 'dark'
                                ? 'bg-dark-teal/50 border-air-force-blue/20'
                                : 'bg-beige/50 border-tea-green/20'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <SignalBars signal={network.signal} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{network.ssid}</p>
                                {network.bssid === connection?.bssid && (
                                  <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded">Connected</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Ch {network.channel} • {formatFrequency(network.frequency)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            {network.security !== 'none' && (
                              <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 16 }}>
                                lock
                              </span>
                            )}
                            <span className={`font-mono ${quality.color}`}>
                              {formatSignal(network.signal)} dBm
                            </span>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
