import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import log from 'electron-log/main.js'
import wifi from 'node-wifi'

app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-setuid-sandbox')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.disableHardwareAcceleration()

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

interface WifiAccessPoint {
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
    const networks: WifiAccessPoint[] = await wifi.scan()
    log.info(`WiFi scan complete: ${networks.length} networks found`)
    
    return networks.map(network => ({
      bssid: network.bssid,
      ssid: network.ssid,
      signal: network.signal_level,
      channel: network.channel,
      frequency: network.frequency,
      quality: network.quality,
      security: network.security
    }))
  } catch (error) {
    log.error('WiFi scan failed:', error)
    throw error
  }
})

ipcMain.handle('wifi:getCurrentConnections', async (): Promise<WifiScanResult[]> => {
  try {
    const connections: WifiAccessPoint[] = await wifi.getCurrentConnections()
    return connections.map(conn => ({
      bssid: conn.bssid,
      ssid: conn.ssid,
      signal: conn.signal_level,
      channel: conn.channel,
      frequency: conn.frequency,
      quality: conn.quality,
      security: conn.security
    }))
  } catch (error) {
    log.error('Failed to get current connections:', error)
    throw error
  }
})

ipcMain.handle('wifi:getSignalStrength', async (): Promise<number> => {
  try {
    const connections: WifiAccessPoint[] = await wifi.getCurrentConnections()
    if (connections.length > 0) {
      return connections[0].signal_level
    }
    return -100
  } catch (error) {
    log.error('Failed to get signal strength:', error)
    return -100
  }
})
