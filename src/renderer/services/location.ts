import { LocationData, AccessPoint } from '../types'

export interface LocationServiceConfig {
  pollInterval: number
  enableHighAccuracy: boolean
}

export class LocationService {
  private watchId: number | null = null
  private config: LocationServiceConfig

  constructor(config: Partial<LocationServiceConfig> = {}) {
    this.config = {
      pollInterval: config.pollInterval || 5000,
      enableHighAccuracy: config.enableHighAccuracy ?? true
    }
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
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
          reject(new Error(this.getGeolocationErrorMessage(error.code)))
        },
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  watchLocation(callback: (location: LocationData) => void): void {
    if (this.watchId !== null) {
      this.stopWatching()
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        })
      },
      (error) => {
        console.error('Watch location error:', this.getGeolocationErrorMessage(error.code))
      },
      {
        enableHighAccuracy: this.config.enableHighAccuracy,
        timeout: 10000,
        maximumAge: this.config.pollInterval
      }
    )
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  private getGeolocationErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Location permission denied'
      case 2:
        return 'Location unavailable'
      case 3:
        return 'Location request timed out'
      default:
        return 'Unknown location error'
    }
  }
}

export async function getAccessPoints(): Promise<AccessPoint[]> {
  if ('network' in navigator && 'getNetworkAddresses' in navigator.network) {
    try {
      const networks = await navigator.network.getNetworkAddresses()
      return networks.map((network: { bssid: string; ssid?: string; signalStrength?: number }) => ({
        bssid: network.bssid,
        ssid: network.ssid || 'Unknown',
        signalStrength: network.signalStrength
      }))
    } catch {
      console.warn('Failed to get access points')
      return []
    }
  }
  
  console.warn('Network API not available')
  return []
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export function interpolateLocation(
  start: LocationData,
  end: LocationData,
  t: number
): LocationData {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * t,
    longitude: start.longitude + (end.longitude - start.longitude) * t,
    accuracy: start.accuracy + (end.accuracy - start.accuracy) * t,
    timestamp: start.timestamp + (end.timestamp - start.timestamp) * t
  }
}
