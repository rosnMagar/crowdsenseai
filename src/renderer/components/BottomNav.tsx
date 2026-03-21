interface NavItem {
  id: string
  icon: string
  label: string
}

interface BottomNavProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export default function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const navItems: NavItem[] = [
    { id: 'map', icon: 'map', label: 'Map' },
    { id: 'insights', icon: 'wifi_find', label: 'Insights' },
    { id: 'history', icon: 'history', label: 'History' },
    { id: 'settings', icon: 'settings', label: 'Settings' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-cornsilk/90 dark:bg-ink-black/90 backdrop-blur-xl md:hidden z-50 border-t border-tea-green/15 dark:border-air-force-blue/15 shadow-[0_-4px_24px_rgba(1,22,30,0.05)]">
      {navItems.map(item => {
        const isActive = currentPage === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center transition-transform active:scale-90 ${
              isActive
                ? 'bg-beige dark:bg-dark-teal text-bronze dark:text-ash-grey rounded py-1 px-3'
                : 'text-ink-black/50 dark:text-light-beige/50'
            }`}
          >
            <span 
              className="material-symbols-outlined mb-1"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="font-label text-[10px] font-semibold uppercase tracking-tighter">
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
