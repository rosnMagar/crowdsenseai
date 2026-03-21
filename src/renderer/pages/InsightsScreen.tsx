import Header from '../components/Header'
import { useTheme } from '../contexts/ThemeContext'

export default function InsightsScreen() {
  const { theme } = useTheme()

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Signal Insights" />
      
      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full pb-24 md:pb-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-headline font-medium tracking-tight mb-1">
              Live Analytics
            </h2>
            <p className="text-air-force-blue dark:text-tea-green font-body">
              Real-time network node performance metrics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
            theme === 'dark'
              ? 'bg-dark-teal border-air-force-blue/10'
              : 'bg-beige border-tea-green/10'
          }`}>
            <span className="material-symbols-outlined text-4xl text-bronze mb-4">cell_tower</span>
            <h3 className="font-headline font-bold text-lg">Density</h3>
            <p className="text-3xl font-black mt-2 text-bronze dark:text-ash-grey">High</p>
          </div>

          <div className={`p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
            theme === 'dark'
              ? 'bg-dark-teal border-air-force-blue/10'
              : 'bg-beige border-tea-green/10'
          }`}>
            <span className="material-symbols-outlined text-4xl text-dark-teal mb-4">speed</span>
            <h3 className="font-headline font-bold text-lg">Avg Throughput</h3>
            <p className="text-3xl font-black mt-2 text-bronze dark:text-ash-grey">142 Mbps</p>
          </div>

          <div className={`p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
            theme === 'dark'
              ? 'bg-dark-teal border-air-force-blue/10'
              : 'bg-beige border-tea-green/10'
          }`}>
            <span className="material-symbols-outlined text-4xl text-air-force-blue mb-4">radar</span>
            <h3 className="font-headline font-bold text-lg">Blindspots</h3>
            <p className="text-3xl font-black mt-2 text-bronze dark:text-ash-grey">3 Detected</p>
          </div>
        </div>
      </main>
    </div>
  )
}
