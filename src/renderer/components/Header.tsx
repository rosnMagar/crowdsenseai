import { useTheme } from '../contexts/ThemeContext'

interface HeaderProps {
  title: string
  onNavigate?: (page: string) => void
}

export default function Header({ title, onNavigate }: HeaderProps) {
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
          
          <button 
            onClick={() => onNavigate?.('settings')}
            className="p-2 rounded-full hover:bg-beige dark:hover:bg-dark-teal transition-colors"
            title="Go to Settings"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  )
}
