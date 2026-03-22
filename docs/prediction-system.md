# Prediction System Architecture

This document describes how CrowdSenseAI processes data from raw sensor input to visual predictions.

## End-to-End Flow

### 1. Data Collection (Passive/Active)
- The app uses `useWifi` to scan for nearby BSSIDs.
- Each scan is timestamped and geotagged.
- Data is stored locally in the session and uploaded to a central Supabase database for historical reference.

### 2. Gaussian Process Training
- The `ai.ts` service pulls historical signal data points.
- The `GaussianProcessRegressor` is trained on these `(Latitude, Longitude) -> (Signal Strength)` pairs.
- Unlike simple interpolation, GPR handles noise and provides confidence intervals.

### 3. Spatial Interpolation (Kriging)
- To create a continuous heatmap, the app divides the visible map area into a grid.
- For each grid cell, the trained GPR model predicts the most likely signal strength.
- The `HeatmapContext` aggregates these grid predictions.

### 4. Temporal Shifting
- The `TimeSlider` component provides a `minutesAhead` offset.
- Although the current version uses a spatial model, the infrastructure is ready for spatio-temporal GPR where time is the 3rd dimension: `(Lat, Lon, Time) -> Signal`.

### 5. Visualization
- `MapView` receives the grid data and renders it using a `PolygonLayer` or standard `HeatmapLayer`.
- Colors are mapped from weak (white/cream) to strong (vibrant orange).
- Confident predictions are rendered more opaquely, while uncertain areas fade out.

## Why Gaussian Processes?
We chose GPR over simpler methods like Inverse Distance Weighting (IDW) because:
1. **Confidence intervals**: We can visually signal where data is thin.
2. **Kernel flexibility**: We can model different signal propagation environments by swapping kernels.
3. **Probabilistic**: It naturally handles the fluctuating nature of WiFi signals.
