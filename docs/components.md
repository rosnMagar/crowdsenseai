# UI Components Documentation

## TimeSlider

The `TimeSlider` component allows users to select a temporal offset for signal strength predictions.

### Properties

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | Required | Current value in minutes ahead |
| `onChange` | `(mins: number) => void` | Required | Callback when value changes |
| `min` | `number` | `0` | Minimum minutes (Now) |
| `max` | `number` | `180` | Maximum minutes (3 hours ahead) |
| `step` | `number` | `5` | Increment step |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout orientation |

### Usage

```tsx
<TimeSlider 
  value={predictionTime} 
  onChange={setPredictionTime} 
  max={180}
/>
```

### Styling
- Uses `ThemeContext` for light/dark mode support.
- Custom Webkit slider thumb styling for a premium feel.
- Vertical mode optimized for sidebar placement.

---

## MapView

Primary visualization component using `deck.gl` and `MapLibre GL`.

### Key Features
- **Layers**: 
  - `PathLayer`: Displays user movement history.
  - `ScatterplotLayer`: Shows real-time location and accuracy.
  - `HeatmapLayer`/`GridLayer`: (Integrated via `ai.ts`) Shows predicted signal intensity.
- **Interactions**: Standard map panning, zooming, and tilting.
- **Theme Sync**: Automatically switches map tile styles based on the application theme.

---

## Navigation

### BottomNav (Mobile)
- Optimized for thumb reach.
- Transparent backdrop with blur effect.
- Active state indicators using theme accent colors.

### Sidebar (Desktop)
- Collapsible design.
- Integrated `TimeSlider` for quick prediction adjustments.
- High-contrast icons for accessibility.
