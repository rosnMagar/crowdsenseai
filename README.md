# CrowdSenseAI

An Electron + React application for AI-powered location tracking with deck.gl visualization and signal prediction.

## Tech Stack

- **Electron** - Desktop application framework
- **React 19** - UI framework
- **deck.gl** - High-performance WebGL visualization
- **MapLibre GL** - Open-source map rendering (no API key needed)
- **Tailwind CSS** - Utility-first styling with custom color palette
- **Gaussian Process Regression** - AI/ML service for signal strength prediction
- **WiFi Scanning** - Integrated BSSID mapping and data collection
- **Supabase** - PostgreSQL with document-based JSONB storage

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd crowdsenseai
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm run dist  # Create distributable
```

## Project Structure

```
src/
├── main/           # Electron main process
│   └── index.ts
├── preload/        # Preload scripts for IPC
│   └── index.ts
└── renderer/       # React frontend
    │   ├── MapScreen.tsx      # Main map view with info cards
    │   ├── InsightsScreen.tsx  # Analytics dashboard
    │   ├── HistoryScreen.tsx  # Signal history table
    │   └── SettingsScreen.tsx  # User preferences
    ├── components/ # UI components
    │   ├── Header.tsx      # Top navigation bar
    │   ├── Sidebar.tsx     # Desktop navigation
    │   ├── BottomNav.tsx    # Mobile bottom navigation
    │   ├── MapView.tsx      # deck.gl map visualization
    │   └── TimeSlider.tsx   # Prediction time-ahead selector
    ├── hooks/      # Custom React hooks
    │   └── useLocation.ts
    ├── services/   # Business logic
    │   ├── ai.ts           # GPR/Kriging implementation
    │   ├── location.ts     # Location service
    │   └── supabase.ts     # Supabase client (document-based)
    └── types/      # TypeScript types
        └── index.ts
```

## Features

### Current Features

- **WiFi Access Point Mapping** - BSSID-based location estimation and scanning
- **Gaussian Process Regression (Kriging)** - Predictive signal strength mapping with temporal sliding
- **Interactive Time Slider** - View predicted signal strength up to 3 hours into the future
- Real-time location tracking using `navigator.geolocation`
- Interactive 3D map visualization with deck.gl
- Location history with path visualization
- Accuracy indicator
- Polling-based tracking with configurable interval
- Session-based data organization
- Document-based storage with Supabase
- **Light/Dark theme** with app-wide toggle
- **Responsive design** - Desktop sidebar, mobile bottom navigation
- **4-page navigation**: Map, Signal Insights, History, Settings
- **Custom color palette** - Warm earth tones for light mode, dark teal for dark mode

### Planned Features

- **Mapbox Integration** - Alternative map provider option
- **Offline Map Support** - Caching tiles for field use

## Theme System

The app supports light and dark themes with a warm, nature-inspired color palette.

### Color Palette

**Light Mode:**
- Cornsilk (`#fefae0`) - Main background
- Beige (`#e9edc9`) - Container backgrounds
- Papaya Whip (`#faedcd`) - Card backgrounds
- Tea Green (`#ccd5ae`) - Borders, secondary elements
- Bronze (`#d4a373`) - Primary accent

**Dark Mode:**
- Ink Black (`#01161e`) - Main background
- Dark Teal (`#124559`) - Container backgrounds
- Air Force Blue (`#598392`) - Borders, secondary elements
- Ash Grey (`#aec3b0`) - Primary accent
- Light Beige (`#eff6e0`) - Text

### Typography

- **Manrope** - Headlines (bold, modern sans-serif)
- **Inter** - Body text and labels
- **Material Symbols** - Icon library

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Location Polling

Modify the poll interval in `useLocation.ts`:

```typescript
const DEFAULT_POLL_INTERVAL = 5000 // milliseconds
```

## Platform-Specific Setup

### macOS Location Services

The app uses macOS Location Services via the browser Geolocation API. On macOS, apps need special entitlements to access location.

**Entitlements file:** `resources/crowdsenseai.entitlements`

The entitlements file is configured in `package.json` under `build.mac`:
```json
"mac": {
  "entitlements": "resources/crowdsenseai.entitlements",
  "entitlementsInherit": "resources/crowdsenseai.entitlements"
}
```

**First run:** When you launch the packaged app, macOS will prompt for location permission. Grant it in:
- System Settings → Privacy & Security → Location Services → Enable for CrowdSenseAI

**Note:** Location services may not work properly in development mode (`npm run dev`). For full functionality, use the packaged app:
```bash
npm run build && npm run dist
./dist/mac/CrowdSenseAI.app/Contents/MacOS/CrowdSenseAI
```

## Database Schema

### Document-Based Sessions

CrowdSenseAI uses a document-based model in Supabase where each session is a self-contained document containing all related data.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  locations JSONB DEFAULT '[]',
  access_points JSONB DEFAULT '[]',
  predictions JSONB DEFAULT '[]'
);
```

### Document Structure

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-03-21T12:00:00Z",
  "metadata": {
    "device": "Linux x64",
    "appVersion": "0.1.0"
  },
  "locations": [
    {
      "latitude": 43.6532,
      "longitude": -79.3832,
      "accuracy": 10.5,
      "timestamp": 1711024800000
    }
  ],
  "access_points": [
    {
      "bssid": "00:11:22:33:44:55",
      "ssid": "NetworkName",
      "signalStrength": -65,
      "timestamp": 1711024800000
    }
  ],
  "predictions": [
    {
      "location": { "latitude": 43.6532, "longitude": -79.3832 },
      "signalStrength": -70,
      "confidence": 0.85
    }
  ]
}
```

### Query Examples

```sql
-- Get all sessions
SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10;

-- Get sessions with locations
SELECT id, created_at, jsonb_array_length(locations) as location_count 
FROM sessions 
WHERE jsonb_array_length(locations) > 0;

-- Find sessions near a point
SELECT * FROM sessions, 
  jsonb_array_elements(locations) as loc
WHERE loc->>'latitude' BETWEEN 43.5 AND 43.7
  AND loc->>'longitude' BETWEEN -79.5 AND -79.3;
```

### Indexes for Performance

```sql
-- Index for time-based queries
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX idx_sessions_locations ON sessions USING GIN (locations);
CREATE INDEX idx_sessions_access_points ON sessions USING GIN (access_points);
```

## Services Integration

### AI/GPR Integration

The `services/ai.ts` file provides:
- `GaussianProcessRegressor` class for prediction
- `krigingInterpolation()` for spatial interpolation
- Ready for integration with collected location data

## License

MIT
