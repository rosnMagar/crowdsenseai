import { useState } from "react";
import Header from "../components/Header";
import { useTheme } from "../contexts/ThemeContext";
import { LocationData } from "../types";

interface HistoryScreenProps {
  history: LocationData[];
  onNavigate?: (page: string) => void;
}

interface HistoryItem {
  location: string;
  coordinates: string;
  strength: number;
  accessPoint: string;
  mac: string;
  status: string;
}

const ITEMS_PER_PAGE = 10;

const MOCK_DATA: HistoryItem[] = [
  {
    location: "5th Avenue, NYC",
    coordinates: "40.7851° N, 73.9683° W",
    strength: -65,
    accessPoint: "Starbucks_Free",
    mac: "AC:4E:91:88:22:10",
    status: "Verified",
  },
  {
    location: "Shibuya Crossing, Tokyo",
    coordinates: "35.6595° N, 139.7004° E",
    strength: -52,
    accessPoint: "JR_East_Free",
    mac: "D4:61:9D:11:AA:FF",
    status: "Verified",
  },
  {
    location: "Oxford Street, London",
    coordinates: "51.5074° N, 0.1278° W",
    strength: -71,
    accessPoint: "BT_Free",
    mac: "00:1A:2B:3C:4D:5E",
    status: "Pending",
  },
  {
    location: "Champs-Élysées, Paris",
    coordinates: "48.8698° N, 2.3078° E",
    strength: -68,
    accessPoint: "Paris_WiFi",
    mac: "B3:22:44:55:66:77",
    status: "Verified",
  },
  {
    location: "Rodeo Drive, LA",
    coordinates: "34.0690° N, 118.3995° W",
    strength: -59,
    accessPoint: "LA_FreeNet",
    mac: "C4:33:55:66:77:88",
    status: "Verified",
  },
  {
    location: "Orchard Road, Singapore",
    coordinates: "1.3048° N, 103.8318° E",
    strength: -63,
    accessPoint: "SGov_Free",
    mac: "D5:44:66:77:88:99",
    status: "Verified",
  },
  {
    location: "Königsallee, Düsseldorf",
    coordinates: "51.2277° N, 6.7735° E",
    strength: -74,
    accessPoint: "Ddorf_Net",
    mac: "E6:55:77:88:99:00",
    status: "Pending",
  },
  {
    location: "Las Vegas Strip, NV",
    coordinates: "36.1147° N, 115.1728° W",
    strength: -56,
    accessPoint: "Vegas_WiFi",
    mac: "F7:66:88:99:00:11",
    status: "Verified",
  },
  {
    location: "Avenue des Champs-Élysées, Paris",
    coordinates: "48.8716° N, 2.2950° E",
    strength: -67,
    accessPoint: "Paris_Free",
    mac: "A8:77:99:00:11:22",
    status: "Verified",
  },
  {
    location: "Michigan Avenue, Chicago",
    coordinates: "41.8756° N, 87.6244° W",
    strength: -62,
    accessPoint: "ChiCity_WiFi",
    mac: "B9:88:00:11:22:33",
    status: "Verified",
  },
  {
    location: "Pike Place Market, Seattle",
    coordinates: "47.6097° N, 122.3421° W",
    strength: -58,
    accessPoint: "Seattle_Free",
    mac: "C0:99:11:22:33:44",
    status: "Verified",
  },
  {
    location: "Melbourne CBD, Australia",
    coordinates: "37.8136° S, 144.9631° E",
    strength: -70,
    accessPoint: "Melb_WiFi",
    mac: "D1:00:22:33:44:55",
    status: "Pending",
  },
];

export default function HistoryScreen({
  history,
  onNavigate,
}: HistoryScreenProps) {
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);

  const displayItems: HistoryItem[] =
    history.length > 0
      ? history.map((loc) => ({
          location: "Recorded Location",
          coordinates: `${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° W`,
          strength: loc.accuracy,
          accessPoint: "GPS",
          mac: "N/A",
          status: "Verified",
        }))
      : MOCK_DATA;

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
          {/*<h2 className="text-3xl font-headline font-medium tracking-tight mb-1">
            History
          </h2>*/}
          <p className="text-air-force-blue dark:text-tea-green font-body">
            Showing {totalItems > 0 ? showingFrom : 0}–{showingTo} of{" "}
            {totalItems} signal measurements recorded.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div
            className={`rounded-lg p-1 min-w-[600px] ${
              theme === "dark" ? "bg-dark-teal/30" : "bg-papaya-whip/50"
            }`}
          >
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left font-label text-[10px] uppercase tracking-widest text-air-force-blue dark:text-tea-green">
                  <th className="px-6 py-2 font-semibold">Location</th>
                  <th className="px-4 py-2 font-semibold">Strength</th>
                </tr>
              </thead>
              <tbody className="font-body text-sm">
                {pageData.map((item, i) => (
                  <tr
                    key={i}
                    className={`transition-colors cursor-pointer group ${
                      theme === "dark"
                        ? "bg-ink-black hover:bg-dark-teal/50"
                        : "bg-cornsilk hover:bg-beige"
                    }`}
                  >
                    <td className="px-6 py-4 rounded-l-lg">
                      <div className="flex flex-col">
                        <span className="font-semibold">{item.location}</span>
                        <span className="text-xs opacity-70">
                          {item.coordinates}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-bronze"></div>
                        <span className="font-medium text-bronze">
                          {item.strength} dBm
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
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
