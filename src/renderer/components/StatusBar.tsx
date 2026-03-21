import { supabase } from '../services/supabase'

interface StatusBarProps {
  isTracking: boolean
  onToggleTracking: () => void
  locationCount: number
  sessionId: string | null
}

export default function StatusBar({ isTracking, onToggleTracking, locationCount, sessionId }: StatusBarProps) {
  const isConnected = supabase !== null

  return (
    <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold text-primary-400">CrowdSenseAI</h1>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-sm text-slate-400">
            {isTracking ? 'Tracking Active' : 'Tracking Paused'}
          </span>
        </div>
        {sessionId && (
          <div className="text-xs text-slate-500 font-mono">
            Session: {sessionId.slice(0, 8)}...
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-500' : 'bg-yellow-500'}`} />
          <span className="text-xs text-slate-500">
            {isConnected ? 'Supabase Connected' : 'Local Mode'}
          </span>
        </div>
        <div className="text-sm text-slate-400">
          <span className="text-slate-300 font-medium">{locationCount}</span> points
        </div>
        
        <button
          onClick={onToggleTracking}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            isTracking
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50'
          }`}
        >
          {isTracking ? 'Stop' : 'Start'} Tracking
        </button>
      </div>
    </div>
  )
}
