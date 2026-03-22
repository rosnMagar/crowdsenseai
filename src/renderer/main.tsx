import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import LocationConsentPopup from './components/LocationConsentPopup'
import { ThemeProvider } from './contexts/ThemeContext'
import { LocationProvider } from './contexts/LocationContext'
import { TrackingProvider } from './contexts/TrackingContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LocationProvider>
        <TrackingProvider>
          <App />
          <LocationConsentPopup />
        </TrackingProvider>
      </LocationProvider>
    </ThemeProvider>
  </React.StrictMode>
)
