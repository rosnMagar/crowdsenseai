import { contextBridge, ipcRenderer } from 'electron'

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export interface ElectronAPI {
  getLocation: () => Promise<LocationData>
  log: (level: string, message: string) => void
  onLocationUpdate: (callback: (location: LocationData) => void) => void
}

const electronAPI: ElectronAPI = {
  getLocation: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          })
        },
        (error) => {
          reject(new Error(error.message))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  },
  log: (level, message) => ipcRenderer.invoke('log-message', level, message),
  onLocationUpdate: (callback) => {
    ipcRenderer.on('location-update', (_event, location) => callback(location))
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
