interface NavItem {
  id: string
  icon: string
  label: string
}

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const navItems: NavItem[] = [
    { id: 'map', icon: 'map', label: 'Map' },
    { id: 'insights', icon: 'cell_tower', label: 'Signal Insights' },
    { id: 'history', icon: 'history', label: 'History' },
    { id: 'settings', icon: 'settings', label: 'Settings' }
  ]

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col left-0 top-0 sticky bg-cornsilk dark:bg-ink-black border-r border-tea-green/15 p-4 gap-2 z-40">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-black font-headline tracking-tighter text-ink-black dark:text-light-beige">
          CrowdSenseAI
        </h1>
        <p className="font-headline text-[10px] uppercase tracking-widest text-bronze/70 mt-1">
          Network Cartographer
        </p>
      </div>

      <nav className="flex-1 space-y-1 flex flex-col gap-1">
        {navItems.map(item => {
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded font-headline text-sm uppercase tracking-widest transition-all ${
                isActive
                  ? 'bg-beige dark:bg-dark-teal text-ink-black dark:text-light-beige font-semibold'
                  : 'text-ink-black/70 dark:text-light-beige/70 hover:bg-beige/50 dark:hover:bg-dark-teal/50'
              }`}
            >
              <span 
                className="material-symbols-outlined"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>


    </aside>
  )
}
