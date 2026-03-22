import { WifiObservation } from './wifiTracker'

export const CAMPUS_BOUNDS = {
  minLon: -92.582946,
  maxLon: -92.578391,
  minLat: 40.186611,
  maxLat: 40.189791
}

export const CAMPUS_CENTER = {
  latitude: (CAMPUS_BOUNDS.minLat + CAMPUS_BOUNDS.maxLat) / 2,
  longitude: (CAMPUS_BOUNDS.minLon + CAMPUS_BOUNDS.maxLon) / 2
}

const CAMPUS_LOCATIONS = [
  { name: 'Magruder Hall', lat: 40.1880, lon: -92.5810 },
  { name: 'Library', lat: 40.1875, lon: -92.5800 },
  { name: 'Student Union', lat: 40.1868, lon: -92.5795 },
  { name: 'Kirk Building', lat: 40.1885, lon: -92.5790 },
  { name: 'Ryle Hall', lat: 40.1892, lon: -92.5805 },
  { name: 'Administration', lat: 40.1872, lon: -92.5788 },
  { name: 'Violet Hall', lat: 40.1888, lon: -92.5815 },
  { name: 'Center Campus', lat: 40.1880, lon: -92.5800 }
]

const WIFI_NETWORKS = [
  'TrumanState_WiFi',
  'TrumanSecure',
  'eduroam',
  'TrumanGuest'
]

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function generateDummyWifiObservations(count: number = 25): WifiObservation[] {
  const observations: WifiObservation[] = []
  const baseTimestamp = Date.now()

  for (let i = 0; i < count; i++) {
    const location = CAMPUS_LOCATIONS[i % CAMPUS_LOCATIONS.length]
    
    const lat = location.lat + randomInRange(-0.0003, 0.0003)
    const lon = location.lon + randomInRange(-0.0003, 0.0003)
    
    const distanceFromCenter = Math.sqrt(
      Math.pow(lat - CAMPUS_CENTER.latitude, 2) + 
      Math.pow(lon - CAMPUS_CENTER.longitude, 2)
    )
    
    const baseSignal = -40 - distanceFromCenter * 500
    const signalStrength = Math.round(baseSignal + randomInRange(-15, 15))

    observations.push({
      id: `dummy_${i}`,
      latitude: lat,
      longitude: lon,
      signalStrength: Math.max(-100, Math.min(-30, signalStrength)),
      ssid: WIFI_NETWORKS[i % WIFI_NETWORKS.length],
      bssid: `00:00:${i.toString(16).padStart(2, '0')}:${(i * 3).toString(16).padStart(2, '0')}:${(i * 7).toString(16).padStart(2, '0')}:${(i * 11).toString(16).padStart(2, '0')}`.toUpperCase(),
      frequency: Math.random() > 0.4 ? 2437 : 5180,
      timestamp: baseTimestamp - (count - i) * 60000
    })
  }

  return observations
}
