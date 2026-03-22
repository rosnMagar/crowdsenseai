import { useHeatmap } from '../contexts/HeatmapContext'
import { HeatmapLayerConfig } from '../types/heatmap'

interface HeatmapControlsProps {
  className?: string
}

export function HeatmapSelector({ className }: HeatmapControlsProps) {
  const { sources, currentSourceId, setCurrentSource, layerConfig, setLayerConfig } = useHeatmap()

  if (sources.length <= 1) return null

  return (
    <div className={className} style={styles.container}>
      <div style={styles.sourceSelector}>
        {sources.map(source => (
          <button
            key={source.id}
            onClick={() => setCurrentSource(source.id)}
            style={{
              ...styles.sourceButton,
              ...(currentSourceId === source.id ? styles.sourceButtonActive : {})
            }}
          >
            {source.icon && <span style={styles.icon}>{getIcon(source.icon)}</span>}
            <span>{source.name}</span>
          </button>
        ))}
      </div>
      <div style={styles.configPanel}>
        <label style={styles.sliderLabel}>
          Opacity: {layerConfig.opacity.toFixed(1)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={layerConfig.opacity}
            onChange={e => setLayerConfig({ opacity: parseFloat(e.target.value) })}
            style={styles.slider}
          />
        </label>
        <label style={styles.sliderLabel}>
          Intensity: {layerConfig.intensity.toFixed(1)}
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={layerConfig.intensity}
            onChange={e => setLayerConfig({ intensity: parseFloat(e.target.value) })}
            style={styles.slider}
          />
        </label>
        <label style={styles.sliderLabel}>
          Radius: {layerConfig.radiusPixels}px
          <input
            type="range"
            min="20"
            max="300"
            step="10"
            value={layerConfig.radiusPixels}
            onChange={e => setLayerConfig({ radiusPixels: parseInt(e.target.value) })}
            style={styles.slider}
          />
        </label>
      </div>
    </div>
  )
}

function getIcon(icon: string): string {
  const icons: Record<string, string> = {
    users: '👥',
    wifi: '📶',
    danger: '⚠️',
    signal: '📡'
  }
  return icons[icon] || '📍'
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  sourceSelector: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap'
  },
  sourceButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    background: 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  sourceButtonActive: {
    background: 'rgba(56, 189, 248, 0.6)',
    borderColor: 'rgba(56, 189, 248, 0.8)'
  },
  icon: {
    fontSize: '14px'
  },
  configPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '6px'
  },
  sliderLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.8)'
  },
  slider: {
    width: '100%',
    accentColor: '#38bdf8'
  }
}
