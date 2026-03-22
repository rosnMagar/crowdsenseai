import Header from "../components/Header";
import { useTheme } from "../contexts/ThemeContext";
import { useLocationConsent } from "../contexts/LocationContext";
import { useLocation } from "../hooks/useLocation";

interface SettingsScreenProps {
  onNavigate?: (page: string) => void;
}

export default function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const { locationSharing, setLocationSharing } = useLocationConsent();
  const { isTracking, stopTracking } = useLocation();

  const handleToggleLocationSharing = (value: boolean) => {
    setLocationSharing(value)
    if (!value && isTracking) {
      stopTracking()
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Settings" onNavigate={onNavigate} />

      <main className="flex-1 p-6 md:p-12 max-w-6xl mx-auto w-full pb-24 md:pb-12 overflow-y-auto">
        {/*<h2 className="text-2xl md:text-3xl font-headline font-medium tracking-tight mb-8">
          Settings
        </h2>*/}
        <section className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`h-[1.5px] flex-1 ${theme === "dark" ? "bg-air-force-blue/20" : "bg-tea-green/20"}`}
            ></div>
            <h3 className="font-headline text-lg font-bold uppercase tracking-widest">
              Appearance
            </h3>
            <div
              className={`h-[1.5px] flex-1 ${theme === "dark" ? "bg-air-force-blue/20" : "bg-tea-green/20"}`}
            ></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              className={`p-6 transition-colors relative overflow-hidden ${
                theme === "dark"
                  ? "bg-dark-teal/50 hover:bg-dark-teal"
                  : "bg-papaya-whip hover:bg-beige"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-bronze/10 text-bronze">
                  <span className="material-symbols-outlined">dark_mode</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="relative inline-flex items-center cursor-pointer"
                >
                  <input
                    checked={theme === "dark"}
                    onChange={toggleTheme}
                    type="checkbox"
                    className="sr-only peer"
                  />
                  <div
                    className={`w-11 h-6 peer-focus:outline-none rounded-full transition-colors ${
                      theme === "dark" ? "bg-dark-teal" : "bg-beige"
                    }`}
                  >
                    <div
                      className={`absolute top-[2px] transition-all ${
                        theme === "dark"
                          ? "left-[22px] bg-light-beige"
                          : "left-[2px] bg-dark-teal"
                      } w-5 h-5 rounded-full`}
                    ></div>
                  </div>
                </button>
              </div>
              <h4 className="font-headline font-bold mb-2">Dark Mode</h4>
              <p className="text-sm opacity-70 leading-relaxed">
                Switch between light and dark themes.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`h-[1.5px] flex-1 ${theme === "dark" ? "bg-air-force-blue/20" : "bg-tea-green/20"}`}
            ></div>
            <h3 className="font-headline text-lg font-bold uppercase tracking-widest">
              Sharing Preferences
            </h3>
            <div
              className={`h-[1.5px] flex-1 ${theme === "dark" ? "bg-air-force-blue/20" : "bg-tea-green/20"}`}
            ></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              className={`p-6 transition-colors relative overflow-hidden ${
                theme === "dark"
                  ? "bg-dark-teal/50 hover:bg-dark-teal"
                  : "bg-papaya-whip hover:bg-beige"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-bronze/10 text-bronze">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={locationSharing === true}
                    onChange={(e) => handleToggleLocationSharing(e.target.checked)}
                    type="checkbox"
                    className="sr-only peer"
                  />
                  <div
                    className={`w-11 h-6 peer-focus:outline-none rounded-full transition-colors ${
                      locationSharing === true
                        ? theme === "dark"
                          ? "bg-tea-green"
                          : "bg-dark-teal"
                        : theme === "dark"
                          ? "bg-air-force-blue/30"
                          : "bg-beige"
                    }`}
                  >
                    <div
                      className={`absolute top-[2px] transition-all ${
                        locationSharing === true
                          ? theme === "dark"
                            ? "left-[22px] bg-light-beige"
                            : "left-[22px] bg-cornsilk"
                          : theme === "dark"
                            ? "left-[2px] bg-air-force-blue"
                            : "left-[2px] bg-dark-teal/50"
                      } w-5 h-5 rounded-full`}
                    ></div>
                  </div>
                </label>
              </div>
              <h4 className="font-headline font-bold mb-2">Location Sharing</h4>
              <p className="text-sm opacity-70 leading-relaxed">
                Contribute real-time GPS coordinates to help map dead zones.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
