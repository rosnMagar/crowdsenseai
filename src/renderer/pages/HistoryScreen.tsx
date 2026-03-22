import Header from '../components/Header'
import { useTheme } from '../contexts/ThemeContext'
import { LocationData } from '../types'

interface HistoryScreenProps {
  history: LocationData[]
  onNavigate?: (page: string) => void
}

export default function HistoryScreen({ history, onNavigate }: HistoryScreenProps) {
  const { theme } = useTheme()

  const mockData = [
    {
      location: '5th Avenue, NYC',
      coordinates: '40.7851° N, 73.9683° W',
      strength: -65,
      accessPoint: 'Starbucks_Free',
      mac: 'AC:4E:91:88:22:10',
      status: 'Verified'
    },
    {
      location: 'Shibuya Crossing, Tokyo',
      coordinates: '35.6595° N, 139.7004° E',
      strength: -52,
      accessPoint: 'JR_East_Free',
      mac: 'D4:61:9D:11:AA:FF',
      status: 'Verified'
    },
    {
      location: 'Oxford Street, London',
      coordinates: '51.5074° N, 0.1278° W',
      strength: -71,
      accessPoint: 'BT_Free',
      mac: '00:1A:2B:3C:4D:5E',
      status: 'Pending'
    }
  ]

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Signal History" onNavigate={onNavigate} />
      
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 overflow-y-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-headline font-medium tracking-tight mb-1">
              Signal History
            </h2>
            <p className="text-air-force-blue dark:text-tea-green font-body">
              Reviewing {history.length || mockData.length} global signal measurements recorded.
            </p>
          </div>
          <div className="flex gap-2">
            <button className={`px-4 py-2 rounded text-xs font-label font-bold uppercase tracking-wider transition-colors ${
              theme === 'dark'
                ? 'bg-dark-teal hover:bg-dark-teal/80 text-light-beige'
                : 'bg-beige hover:bg-beige/80 text-ink-black'
            }`}>
              Export CSV
            </button>
            <button className="bg-bronze text-cornsilk px-4 py-2 rounded text-xs font-label font-bold uppercase tracking-wider shadow-sm transition-transform active:scale-95">
              New Discovery
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4 overflow-x-auto">
            <div className={`rounded-lg p-1 min-w-[600px] ${
              theme === 'dark' ? 'bg-dark-teal/30' : 'bg-papaya-whip/50'
            }`}>
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left font-label text-[10px] uppercase tracking-widest text-air-force-blue dark:text-tea-green">
                    <th className="px-6 py-2 font-semibold">Location</th>
                    <th className="px-4 py-2 font-semibold">Strength</th>
                  </tr>
                </thead>
                <tbody className="font-body text-sm">
                  {(history.length > 0 ? history.slice(-10).reverse().map((loc, i) => ({
                    location: 'Recorded Location',
                    coordinates: `${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° W`,
                    strength: loc.accuracy,
                    accessPoint: 'GPS',
                    mac: 'N/A',
                    status: 'Verified'
                  })) : mockData).map((item, i) => (
                    <tr 
                      key={i} 
                      className={`transition-colors cursor-pointer group ${
                        theme === 'dark'
                          ? 'bg-ink-black hover:bg-dark-teal/50'
                          : 'bg-cornsilk hover:bg-beige'
                      } ${i === 1 ? `border-l-2 border-bronze ${theme === 'dark' ? '' : ''}` : ''}`}
                    >
                      <td className="px-6 py-4 rounded-l-lg">
                        <div className="flex flex-col">
                          <span className="font-semibold">{item.location}</span>
                          <span className="text-xs opacity-70">{item.coordinates}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-bronze"></div>
                          <span className="font-medium text-bronze">{item.strength} dBm</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="lg:col-span-4 space-y-6">
            <div className={`p-4 rounded-lg shadow-sm border ${
              theme === 'dark'
                ? 'bg-dark-teal border-air-force-blue/10'
                : 'bg-beige border-tea-green/10'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-label text-[10px] font-bold uppercase tracking-widest text-air-force-blue dark:text-tea-green">
                  Spatial Context
                </h3>
                <span className="material-symbols-outlined text-sm text-bronze">open_in_full</span>
              </div>
              <div className={`aspect-video w-full rounded overflow-hidden relative mb-4 ${
                theme === 'dark' ? 'bg-ink-black' : 'bg-cornsilk'
              }`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-bronze/20 flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-bronze border-2 border-cornsilk"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs opacity-70">Selected Node</span>
                  <span className="text-xs font-semibold">View on Map</span>
                </div>
                <button className={`w-full mt-2 border-[1.5px] py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  theme === 'dark'
                    ? 'border-air-force-blue text-air-force-blue hover:bg-air-force-blue/10'
                    : 'border-dark-teal text-dark-teal hover:bg-dark-teal/5'
                }`}>
                  View Full Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
