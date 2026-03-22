# Services & Logic Documentation

## GaussianProcessRegressor (`ai.ts`)

The AI engine of CrowdSenseAI uses Gaussian Process Regression (GPR) for spatial interpolation of signal strengths.

### Mathematical Approach
- **Kernel**: Uses a Radial Basis Function (RBF) kernel:
  `K(x, x') = σ² * exp(-0.5 * ||x - x'||² / ℓ²)`
- **Smoothing**: The `lengthScale` (ℓ) controls how much neighboring points influence each other. Higher values result in smoother, more "blurred" heatmaps.
- **Uncertainty**: The model provides an uncertainty estimate (standard deviation), which is used to calculate prediction confidence.

### Parameters
- `lengthScale`: Default 1.0. Tuning this is critical for balancing local vs. global signal trends.
- `variance`: Default 1.0. Prior variance of the signal.
- `noise`: Default 0.1. Estimated noise in the measurements (e.g., from sensor fluctuations).

---

## useWifi Hook (`useWifi.ts`)

Manages the lifecycle of WiFi data collection.

### Scanning Logic
1. **Trigger**: Manual `scan()` or periodic `startAutoScan()` (every 10 seconds).
2. **IPC**: Invokes `window.electronAPI.wifi.scan()` to interact with the OS network stack.
3. **Pairing**: Each scan results in a list of `WifiAccessPoint` objects, which are paired with the current `navigator.geolocation` coordinates.
4. **Persistence**: Valid coordinate-signal pairs are uploaded to Supabase via `uploadWifiData`.

### Signal Quality Mapping
- **Excellent**: ≥ -50 dBm
- **Good**: [-60, -50) dBm
- **Fair**: [-70, -60) dBm
- **Poor**: < -70 dBm

---

## HeatmapContext (`HeatmapContext.tsx`)

A React Context that centralizes the "Current View" of geospatial data.

### Source Management
- Allows different modules to "register" themselves as heatmap sources.
- **Static Sources**: "Crowd Density" (AI-predicted) and "WiFi Intensity" (Historical DB data).
- **Dynamic Sources**: Any module can call `registerSource` with a custom provider.

### Data Flow
`DB/Sensor` -> `HeatmapProvider` -> `MapView` (via `useHeatmap` hook).
