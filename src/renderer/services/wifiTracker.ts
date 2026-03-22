export interface WifiObservation {
  id: string
  latitude: number
  longitude: number
  signalStrength: number
  ssid: string
  bssid: string
  frequency: number
  timestamp: number
}

let wifiObservations: WifiObservation[] = []
const MAX_OBSERVATIONS = 100

export function addWifiObservation(obs: WifiObservation) {
  wifiObservations.push(obs)
  if (wifiObservations.length > MAX_OBSERVATIONS) {
    wifiObservations.shift()
  }
}

export function getWifiObservations(): WifiObservation[] {
  return wifiObservations
}

export function clearWifiObservations(): void {
  wifiObservations = []
}
