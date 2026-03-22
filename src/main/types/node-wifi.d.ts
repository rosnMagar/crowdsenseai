declare module 'node-wifi' {
  export interface WifiOptions {
    iface: string | null
  }

  export interface Network {
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

  export interface NodeWifi {
    init(options: WifiOptions): Promise<void>
    scan(): Promise<Network[]>
    getCurrentConnections(): Promise<Network[]>
  }

  const wifi: NodeWifi
  export default wifi
}
