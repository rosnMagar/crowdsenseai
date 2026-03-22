import Header from "../components/Header";
import { useTheme } from "../contexts/ThemeContext";

interface InsightsScreenProps {
  onNavigate?: (page: string) => void;
}

export default function InsightsScreen({ onNavigate }: InsightsScreenProps) {
  const { theme } = useTheme();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Signal Insights" onNavigate={onNavigate} />

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            {/*<h2 className="text-2xl md:text-3xl font-headline font-medium tracking-tight mb-1">
              Signal Insights
            </h2>*/}
            <p className="text-air-force-blue dark:text-tea-green font-body text-sm">
              Real-time network node performance metrics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div
            className={`p-4 md:p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
              theme === "dark"
                ? "bg-dark-teal border-air-force-blue/10"
                : "bg-beige border-tea-green/10"
            }`}
          >
            <span className="material-symbols-outlined text-3xl md:text-4xl text-bronze mb-2 md:mb-4">
              cell_tower
            </span>
            <h3 className="font-headline font-bold text-base md:text-lg">
              Density
            </h3>
            <p className="text-2xl md:text-3xl font-black mt-2 text-bronze dark:text-ash-grey">
              High
            </p>
          </div>

          <div
            className={`p-4 md:p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
              theme === "dark"
                ? "bg-dark-teal border-air-force-blue/10"
                : "bg-beige border-tea-green/10"
            }`}
          >
            <span className="material-symbols-outlined text-3xl md:text-4xl text-dark-teal mb-2 md:mb-4">
              speed
            </span>
            <h3 className="font-headline font-bold text-base md:text-lg">
              Avg Throughput
            </h3>
            <p className="text-2xl md:text-3xl font-black mt-2 text-bronze dark:text-ash-grey">
              142 Mbps
            </p>
          </div>

          <div
            className={`p-4 md:p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${
              theme === "dark"
                ? "bg-dark-teal border-air-force-blue/10"
                : "bg-beige border-tea-green/10"
            }`}
          >
            <span className="material-symbols-outlined text-3xl md:text-4xl text-air-force-blue mb-2 md:mb-4">
              radar
            </span>
            <h3 className="font-headline font-bold text-base md:text-lg">
              Blindspots
            </h3>
            <p className="text-2xl md:text-3xl font-black mt-2 text-bronze dark:text-ash-grey">
              3 Detected
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
