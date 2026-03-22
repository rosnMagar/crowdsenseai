import { useState } from "react";
import Header from "../components/Header";
import { useTheme } from "../contexts/ThemeContext";
import { LocationDataWifi } from "../hooks/useWifi";

interface HistoryScreenProps {
  history: LocationDataWifi[];
  onNavigate?: (page: string) => void;
}

interface HistoryItem {
  location: string;
  coordinates: string;
  wifiSignal: number;
  accuracy: number;
}

const ITEMS_PER_PAGE = 10;

export default function HistoryScreen({
  history,
  onNavigate,
}: HistoryScreenProps) {
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);

  const hasData = history.length > 0;

  const displayItems: HistoryItem[] = hasData
    ? history.map((loc) => ({
        location: "Recorded Location",
        coordinates: `${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° W`,
        wifiSignal: loc.wifiSignal ?? -100,
        accuracy: loc.accuracy,
      }))
    : [];

  const totalItems = displayItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const reversed = [...displayItems].reverse();
  const pageStart = currentPage * ITEMS_PER_PAGE;
  const pageEnd = Math.min(pageStart + ITEMS_PER_PAGE, totalItems);
  const pageData = reversed.slice(pageStart, pageEnd);
  const showingFrom = totalItems - pageEnd + 1;
  const showingTo = totalItems - pageStart;

  const prevPage = () => setCurrentPage((p) => Math.max(0, p - 1));
  const nextPage = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="History" onNavigate={onNavigate} />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 overflow-y-auto">
        <div className="mb-10">
          <p className="text-air-force-blue dark:text-tea-green font-body">
            {hasData
              ? `Showing ${showingFrom}–${showingTo} of ${totalItems} signal measurements recorded.`
              : "No data yet"}
          </p>
        </div>

        {!hasData ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-lg ${
            theme === "dark" ? "bg-dark-teal/20" : "bg-papaya-whip/50"
          }`}>
            <span className="material-symbols-outlined text-6xl text-air-force-blue/30 dark:text-tea-green/30 mb-4">
              history
            </span>
            <p className={`text-lg font-body ${theme === "dark" ? "text-air-force-blue/50" : "text-dark-teal/50"}`}>
              No data yet
            </p>
            <p className={`text-sm font-body mt-2 ${theme === "dark" ? "text-air-force-blue/30" : "text-dark-teal/30"}`}>
              Start tracking to record your location history
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto pb-4">
          <div
            className={`rounded-2xl p-1 min-w-[500px] md:min-w-full ${
              theme === "dark" ? "bg-dark-teal/20" : "bg-papaya-whip/30"
            }`}
          >
            <table className="w-full border-separate border-spacing-y-1 md:border-spacing-y-2">
              <thead>
                <tr className="text-left font-label text-[9px] md:text-[10px] uppercase tracking-widest text-air-force-blue/60 dark:text-tea-green/60 px-4">
                  <th className="px-4 py-2 font-black">Location Details</th>
                  <th className="px-4 py-2 font-black text-right">Intensity</th>
                </tr>
              </thead>
              <tbody className="font-body text-xs md:text-sm">
                {pageData.map((item, i) => (
                  <tr
                    key={i}
                    className={`transition-all group ${
                      theme === "dark"
                        ? "bg-ink-black/40 hover:bg-dark-teal/40"
                        : "bg-white hover:bg-beige/40"
                    }`}
                  >
                    <td className="px-4 py-3 rounded-l-xl">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm md:text-base mb-0.5">{item.location}</span>
                        <span className="text-[10px] md:text-xs opacity-50 font-mono">
                          {item.coordinates}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 rounded-r-xl text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-black text-teal-600 dark:text-teal-400">
                          {item.wifiSignal}
                        </span>
                        <span className="text-[9px] md:text-[10px] opacity-40 font-bold uppercase tracking-tighter">dBm</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {hasData && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              className={`px-4 py-2 rounded text-xs font-label font-bold uppercase tracking-wider transition-colors ${
                currentPage === 0
                  ? "opacity-30 cursor-not-allowed"
                  : theme === "dark"
                    ? "bg-dark-teal hover:bg-dark-teal/80 text-light-beige"
                    : "bg-beige hover:bg-beige/80 text-ink-black"
              }`}
            >
              Prev
            </button>
            <span
              className={`text-xs font-body ${
                theme === "dark" ? "text-air-force-blue" : "text-dark-teal"
              }`}
            >
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages - 1}
              className={`px-4 py-2 rounded text-xs font-label font-bold uppercase tracking-wider transition-colors ${
                currentPage >= totalPages - 1
                  ? "opacity-30 cursor-not-allowed"
                  : theme === "dark"
                    ? "bg-dark-teal hover:bg-dark-teal/80 text-light-beige"
                    : "bg-beige hover:bg-beige/80 text-ink-black"
              }`}
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
