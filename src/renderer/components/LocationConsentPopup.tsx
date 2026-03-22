import { useLocationConsent } from '../contexts/LocationContext'
import { useTheme } from '../contexts/ThemeContext'

export default function LocationConsentPopup() {
  const { hasDecided, setLocationSharing } = useLocationConsent()
  const { theme } = useTheme()

  if (hasDecided) return null

  const handleEnable = () => setLocationSharing(true)
  const handleDecline = () => setLocationSharing(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-black/60 backdrop-blur-sm">
      <div className={`mx-4 w-full max-w-sm rounded-lg border p-6 shadow-2xl ${
        theme === 'dark'
          ? 'bg-dark-teal border-air-force-blue/20'
          : 'bg-cornsilk border-tea-green/20'
      }`}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bronze/10">
          <span className="material-symbols-outlined text-2xl text-bronze">location_on</span>
        </div>

        <h2 className="font-headline text-xl font-bold mb-2">
          Enable Location Sharing?
        </h2>
        <p className="text-sm opacity-70 leading-relaxed mb-6">
          CrowdSenseAI uses your location to identify dead zones and improve network coverage maps in your area. Your data is anonymized and never shared without your consent.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleEnable}
            className="w-full py-2.5 rounded text-sm font-label font-bold uppercase tracking-wider transition-all bg-bronze text-cornsilk hover:bg-bronze/90 active:scale-[0.98]"
          >
            Enable
          </button>
          <button
            onClick={handleDecline}
            className={`w-full py-2.5 rounded text-sm font-label font-bold uppercase tracking-wider border-[1.5px] transition-all ${
              theme === 'dark'
                ? 'border-air-force-blue/30 text-air-force-blue hover:bg-air-force-blue/10'
                : 'border-dark-teal/30 text-dark-teal hover:bg-dark-teal/5'
            }`}
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  )
}
