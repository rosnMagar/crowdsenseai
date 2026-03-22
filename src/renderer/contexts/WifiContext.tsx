import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface WifiContextType {
  currentSignal: number
  strongestNetwork: WifiNetwork | null
  isScanning: boolean
  scanNow: () => Promise<void>
}

interface WifiNetwork {
  ssid: string
  bssid: string
  signal: number
  channel: number
  frequency: number
  quality: number
  security: string
}

const WifiContext = createContext<WifiContextType | undefined>(undefined)

const SCAN_INTERVAL = 5000

export function WifiProvider({ children }: { children: ReactNode }) {
  const [currentSignal, setCurrentSignal] = useState(-100)
  const [strongestNetwork, setStrongestNetwork] = useState<WifiNetwork | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const scan = useCallback(async () => {
    if (!window.electronAPI?.wifi) return

    setIsScanning(true)
    try {
      const connected = await window.electronAPI.wifi.getCurrentConnections()
      if (connected.length > 0) {
        setCurrentSignal(connected[0].signal)
        // log entire array
        console.log(connected)
        setStrongestNetwork({
          ssid: connected[0].ssid || 'Unknown Network',
          bssid: connected[0].bssid,
          signal: connected[0].signal,
          channel: connected[0].channel,
          frequency: connected[0].frequency,
          quality: connected[0].quality,
          security: connected[0].security
        })
      }
    } catch (err) {
      console.error('WiFi scan failed:', err)
    } finally {
      setIsScanning(false)
    }
  }, [])

  useEffect(() => {
    scan()
    const interval = setInterval(scan, SCAN_INTERVAL)
    return () => clearInterval(interval)
  }, [scan])

  return (
    <WifiContext.Provider value={{ currentSignal, strongestNetwork, isScanning, scanNow: scan }}>
      {children}
    </WifiContext.Provider>
  )
}

export function useWifiSignal() {
  const context = useContext(WifiContext)
  if (context === undefined) {
    throw new Error('useWifiSignal must be used within a WifiProvider')
  }
  return context
}
