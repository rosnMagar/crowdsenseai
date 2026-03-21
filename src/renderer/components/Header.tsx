import { useTheme } from '../contexts/ThemeContext'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="bg-cornsilk/80 dark:bg-ink-black/80 backdrop-blur-md sticky top-0 z-50 border-b border-tea-green/15 dark:border-air-force-blue/15">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="hidden md:block font-headline text-xl font-bold tracking-tight">{title}</h2>
          <span className="md:hidden font-headline text-lg font-bold tracking-tighter">CrowdSenseAI</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-beige dark:hover:bg-dark-teal transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <span className="material-symbols-outlined">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>
          
          <button className="p-2 rounded-full hover:bg-beige dark:hover:bg-dark-teal transition-colors">
            <span className="material-symbols-outlined">wifi_tethering</span>
          </button>
          
          <button className="p-2 rounded-full hover:bg-beige dark:hover:bg-dark-teal transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          
          <div className="w-8 h-8 bg-papaya-whip dark:bg-dark-teal rounded overflow-hidden border border-tea-green/20">
            <img
              alt="User profile"
              className="w-full h-full object-cover"
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
