import Header from "../components/Header";
import { useTheme } from "../contexts/ThemeContext";
import { useLocationConsent } from "../contexts/LocationContext";
import { useLocation } from "../hooks/useLocation";
import { motion } from "framer-motion";

interface SettingsScreenProps {
  onNavigate?: (page: string) => void;
}

const ToggleSwitch = ({ checked, onChange, activeColor }: { checked: boolean, onChange: () => void, activeColor: string }) => (
  <button 
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onChange();
    }}
    className={`relative w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-400 ease-in-out shadow-inner ${
      checked ? activeColor : 'bg-black/20 dark:bg-white/10'
    }`}
  >
    <motion.div
      animate={{ x: checked ? 24 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`w-6 h-6 bg-white rounded-full shadow-md z-10`}
    />
  </button>
);

export default function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const { locationSharing, setLocationSharing } = useLocationConsent();
  const { isTracking, stopTracking } = useLocation();

  const handleToggleLocationSharing = (value: boolean) => {
    setLocationSharing(value);
    if (!value && isTracking) {
      stopTracking();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(4px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto w-full">
      <Header title="Preferences" onNavigate={onNavigate} />

      <main className="flex-1 p-6 md:p-12 max-w-4xl mx-auto w-full pb-24 md:pb-12">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-12"
        >
          {/* Appearance Section */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center gap-4 mb-6">
              <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                Display & Interface
              </h3>
              <div className={`h-[1px] flex-1 ${theme === "dark" ? "bg-white/10" : "bg-black/10"}`}></div>
            </div>

            <div className={`p-1 rounded-2xl ${theme === "dark" ? "bg-white/5 border border-white/5" : "bg-black/5 border border-black/5"} shadow-sm`}>
              <div className="flex justify-between items-center p-5 rounded-xl transition-all duration-300 hover:bg-black/5 dark:hover:bg-white/5 group" onClick={toggleTheme}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-2xl">{theme === "dark" ? "dark_mode" : "light_mode"}</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-lg mb-1">Dark Mode</h4>
                    <p className="text-sm opacity-60">Reduce glare and eye strain in low-light environments.</p>
                  </div>
                </div>
                <ToggleSwitch 
                  checked={theme === "dark"} 
                  onChange={toggleTheme} 
                  activeColor="bg-teal-500" 
                />
              </div>
            </div>
          </motion.section>

          {/* Privacy & Location Section */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center gap-4 mb-6">
              <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-red-500 dark:text-red-400">
                Privacy & Data
              </h3>
              <div className={`h-[1px] flex-1 ${theme === "dark" ? "bg-white/10" : "bg-black/10"}`}></div>
            </div>

            <div className={`p-1 rounded-2xl ${theme === "dark" ? "bg-white/5 border border-white/5" : "bg-black/5 border border-black/5"} shadow-sm space-y-1`}>
              <div className="flex justify-between items-center p-5 rounded-xl transition-all duration-300 hover:bg-black/5 dark:hover:bg-white/5 group cursor-pointer" onClick={() => handleToggleLocationSharing(!locationSharing)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-2xl">my_location</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-lg mb-1">Location Tracking</h4>
                    <p className="text-sm opacity-60">Actively log your GPS coordinates to the local device registry.</p>
                  </div>
                </div>
                <ToggleSwitch 
                  checked={locationSharing === true} 
                  onChange={() => handleToggleLocationSharing(!locationSharing)} 
                  activeColor="bg-red-500" 
                />
              </div>

              <div className={`h-[1px] mx-4 ${theme === "dark" ? "bg-white/5" : "bg-black/5"}`}></div>

              <div className="flex justify-between items-center p-5 rounded-xl transition-all duration-300 hover:bg-black/5 dark:hover:bg-white/5 group opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <span className="material-symbols-outlined text-2xl">cloud_sync</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-lg mb-1 flex items-center gap-2">
                       Cloud Telemetry
                       <span className="text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Coming Soon</span>
                    </h4>
                    <p className="text-sm">Upload anonymized data logs to remote mapping servers reliably.</p>
                  </div>
                </div>
                <ToggleSwitch 
                  checked={false} 
                  onChange={() => {}} 
                  activeColor="bg-amber-500" 
                />
              </div>
            </div>
          </motion.section>

          {/* About Section */}
          <motion.section variants={itemVariants}>
             <div className="flex justify-center mt-12 opacity-40 hover:opacity-100 transition-opacity duration-500 cursor-default">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl mb-2 hover:animate-pulse text-teal-500">radar</span>
                  <p className="font-headline font-bold text-sm tracking-widest uppercase">CrowdSense AI</p>
                  <p className="text-xs mt-1 font-mono">Version 1.0.4-beta • Build 8021</p>
                </div>
             </div>
          </motion.section>

        </motion.div>
      </main>
    </div>
  );
}
