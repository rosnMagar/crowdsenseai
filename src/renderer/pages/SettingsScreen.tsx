import { useState } from 'react'
import Header from '../components/Header'
import { useTheme } from '../contexts/ThemeContext'

export default function SettingsScreen() {
  const { theme, toggleTheme } = useTheme()
  const [locationSharing, setLocationSharing] = useState(true)

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="System Configuration" />
      
      <main className="flex-1 p-6 md:p-12 max-w-6xl mx-auto w-full pb-24 md:pb-12">
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`md:col-span-2 p-8 flex flex-col md:flex-row gap-8 items-center md:items-start border-l-4 ${
              theme === 'dark'
                ? 'bg-dark-teal/50 border-air-force-blue/20'
                : 'bg-papaya-whip border-bronze/20'
            }`}>
              <div className={`w-32 h-32 shrink-0 overflow-hidden shadow-sm ${
                theme === 'dark' ? 'bg-ink-black' : 'bg-beige'
              }`}>
                <img
                  alt="User avatar"
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face"
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ${
                  theme === 'dark' ? 'text-air-force-blue' : 'text-dark-teal'
                }`}>
                  Network Cartographer Rank IV
                </span>
                <h3 className="font-headline text-3xl font-bold mb-1">
                  Adrian Sterling
                </h3>
                <p className="opacity-70 text-sm mb-4">
                  adrian.s@crowdsense.ai
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-tighter ${
                    theme === 'dark'
                      ? 'bg-dark-teal text-light-beige'
                      : 'bg-beige text-ink-black'
                  }`}>
                    1.2k Contributions
                  </span>
                  <span className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-tighter ${
                    theme === 'dark'
                      ? 'bg-ink-black text-light-beige'
                      : 'bg-tea-green text-ink-black'
                  }`}>
                    Elite Mapper
                  </span>
                </div>
              </div>
              <button className={`border-[1.5px] px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all self-center md:self-start ${
                theme === 'dark'
                  ? 'border-ash-grey text-ash-grey hover:bg-ash-grey/10'
                  : 'border-bronze text-bronze hover:bg-bronze/5'
              }`}>
                Edit Profile
              </button>
            </div>

            <div className={`p-8 flex flex-col justify-center border-l-4 ${
              theme === 'dark'
                ? 'bg-dark-teal/50 border-air-force-blue/20'
                : 'bg-beige border-tea-green/20'
            }`}>
              <h4 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-6 ${
                theme === 'dark' ? 'text-light-beige/70' : 'text-ink-black/70'
              }`}>
                Device Status
              </h4>
              <div className="space-y-4">
                <div className={`flex justify-between items-end border-b pb-2 ${
                  theme === 'dark' ? 'border-air-force-blue/10' : 'border-tea-green/10'
                }`}>
                  <span className="text-xs opacity-70">Active Nodes</span>
                  <span className="font-headline text-xl font-bold">14</span>
                </div>
                <div className={`flex justify-between items-end border-b pb-2 ${
                  theme === 'dark' ? 'border-air-force-blue/10' : 'border-tea-green/10'
                }`}>
                  <span className="text-xs opacity-70">Uptime Rate</span>
                  <span className="font-headline text-xl font-bold">99.4%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className={`h-[1.5px] flex-1 ${theme === 'dark' ? 'bg-air-force-blue/20' : 'bg-tea-green/20'}`}></div>
            <h3 className="font-headline text-lg font-bold uppercase tracking-widest">
              Appearance
            </h3>
            <div className={`h-[1.5px] flex-1 ${theme === 'dark' ? 'bg-air-force-blue/20' : 'bg-tea-green/20'}`}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={`p-6 transition-colors relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-dark-teal/50 hover:bg-dark-teal'
                : 'bg-papaya-whip hover:bg-beige'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-bronze/10 text-bronze">
                  <span className="material-symbols-outlined">dark_mode</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="relative inline-flex items-center cursor-pointer"
                >
                  <input
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                    type="checkbox"
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 peer-focus:outline-none rounded-full transition-colors ${
                    theme === 'dark'
                      ? 'bg-ash-grey'
                      : 'bg-tea-green/30'
                  }`}>
                    <div className={`absolute top-[2px] transition-all ${
                      theme === 'dark'
                        ? 'left-[22px] bg-ink-black'
                        : 'left-[2px] bg-bronze'
                    } w-5 h-5 rounded-full`}></div>
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
            <div className={`h-[1.5px] flex-1 ${theme === 'dark' ? 'bg-air-force-blue/20' : 'bg-tea-green/20'}`}></div>
            <h3 className="font-headline text-lg font-bold uppercase tracking-widest">
              Sharing Preferences
            </h3>
            <div className={`h-[1.5px] flex-1 ${theme === 'dark' ? 'bg-air-force-blue/20' : 'bg-tea-green/20'}`}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={`p-6 transition-colors relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-dark-teal/50 hover:bg-dark-teal'
                : 'bg-papaya-whip hover:bg-beige'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-bronze/10 text-bronze">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={locationSharing}
                    onChange={() => setLocationSharing(!locationSharing)}
                    type="checkbox"
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 peer-focus:outline-none rounded-full transition-colors ${
                    locationSharing
                      ? 'bg-bronze'
                      : theme === 'dark' ? 'bg-air-force-blue/30' : 'bg-tea-green/30'
                  }`}>
                    <div className={`absolute top-[2px] transition-all ${
                      locationSharing
                        ? 'left-[22px] bg-cornsilk'
                        : theme === 'dark'
                          ? 'left-[2px] bg-light-beige'
                          : 'left-[2px] bg-bronze'
                    } w-5 h-5 rounded-full`}></div>
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
  )
}
