import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import log from 'electron-log/main.js'
import wifi from 'node-wifi'

app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-setuid-sandbox')
app.commandLine.appendSwitch('disable-gpu-sandbox')

log.initialize()
log.info('Application starting...')

let mainWindow: BrowserWindow | null = null

wifi.init({
  iface: null
})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    backgroundColor: '#0f172a'
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    log.info('Main window shown')
  })

  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  log.info('App ready, creating window')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('log-message', (_event, level: string, message: string) => {
  switch (level) {
    case 'info':
      log.info(message)
      break
    case 'warn':
      log.warn(message)
      break
    case 'error':
      log.error(message)
      break
    default:
      log.debug(message)
  }
})

interface WifiNetwork {
  bssid: string
  ssid: string
  mac: string
  channel: number
  frequency: number
  signal_level: number
  quality: number
  security: string
  security_flags: string
}

interface WifiScanResult {
  bssid: string
  ssid: string
  signal: number
  channel: number
  frequency: number
  quality: number
  security: string
}

ipcMain.handle('wifi:scan', async (): Promise<WifiScanResult[]> => {
  try {
    log.info('Starting WiFi scan...')
    const networks: WifiNetwork[] = await wifi.scan()
    log.info(`WiFi scan complete: ${networks.length} networks found`)
    
    return networks.map(network => {
      let signal = typeof network.signal_level === 'number' && !isNaN(network.signal_level) ? network.signal_level : -100
      let ssid = network.ssid || ''
      let bssid = network.bssid || ''
      let channel = typeof network.channel === 'number' && network.channel > 0 && network.channel <= 165 ? network.channel : 0
      let frequency = typeof network.frequency === 'number' && !isNaN(network.frequency) ? network.frequency : 2400
      let quality = typeof network.quality === 'number' && !isNaN(network.quality) ? network.quality : 0
      let security = network.security || 'unknown'

      if (channel === 0 && typeof network.channel === 'number') {
        if (network.channel > 0) {
          channel = network.channel
        }
      }

      return {
        bssid,
        ssid,
        signal,
        channel,
        frequency,
        quality,
        security
      }
    })
  } catch (error) {
    log.error('WiFi scan failed:', error)
    throw error
  }
})

ipcMain.handle('wifi:getCurrentConnections', async (): Promise<WifiScanResult[]> => {
  try {
    const connections: WifiNetwork[] = await wifi.getCurrentConnections()
    const scanResults: WifiNetwork[] = await wifi.scan()
    
    log.info(`getCurrentConnections returned ${connections.length} networks`)
    log.info(`Scan results: ${scanResults.length} networks found`)

    let scanSignal = -100
    if (scanResults.length > 0) {
      scanSignal = typeof scanResults[0].signal_level === 'number' && !isNaN(scanResults[0].signal_level) 
        ? scanResults[0].signal_level 
        : -100
    }

    return connections.map(conn => {
      let ssid = conn.ssid || ''
      let bssid = conn.bssid || ''
      
      let signal = typeof conn.signal_level === 'number' && !isNaN(conn.signal_level) ? conn.signal_level : -100
      
      if (signal === -100 || signal === -50) {
        signal = scanSignal
      }
      
      let channel = typeof conn.channel === 'number' && conn.channel > 0 && conn.channel <= 165 ? conn.channel : 0
      let frequency = typeof conn.frequency === 'number' && !isNaN(conn.frequency) ? conn.frequency : 2400
      let quality = typeof conn.quality === 'number' && !isNaN(conn.quality) ? conn.quality : 0
      let security = conn.security || 'unknown'

      log.info(`Network: ssid="${ssid}", bssid="${bssid}", signal=${signal}`)

      if (security === '112') {
        security = 'WPA2'
      }

      return {
        bssid,
        ssid: ssid || 'Unknown Network',
        signal,
        channel,
        frequency,
        quality,
        security
      }
    })
  } catch (error) {
    log.error('Failed to get current connections:', error)
    throw error
  }
})

ipcMain.handle('wifi:getSignalStrength', async (): Promise<number> => {
  try {
    const connections: WifiNetwork[] = await wifi.getCurrentConnections()
    const scanResults: WifiNetwork[] = await wifi.scan()
    
    if (connections.length > 0) {
      const signal = connections[0].signal_level
      if (typeof signal === 'number' && !isNaN(signal) && signal !== -100 && signal !== -50) {
        return signal
      }
    }
    
    if (scanResults.length > 0) {
      const scanSignal = scanResults[0].signal_level
      if (typeof scanSignal === 'number' && !isNaN(scanSignal)) {
        return scanSignal
      }
    }
    
    return -100
  } catch (error) {
    log.error('Failed to get signal strength:', error)
    return -100
  }
})
