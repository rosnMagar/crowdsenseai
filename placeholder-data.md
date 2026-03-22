# Placeholder Data Tracking

This document tracks all placeholder/mock data that will need to be replaced with real data.

---

## HistoryScreen.tsx

**Lines 12-37** - Mock data array for signal history when no real history exists:

```typescript
const mockData = [
  {
    location: '5th Avenue, NYC',
    coordinates: '40.7851° N, 73.9683° W',
    strength: -65,
    accessPoint: 'Starbucks_Free',
    mac: 'AC:4E:91:88:22:10',
    status: 'Verified'
  },
  {
    location: 'Shibuya Crossing, Tokyo',
    coordinates: '35.6595° N, 139.7004° E',
    strength: -52,
    accessPoint: 'JR_East_Free',
    mac: 'D4:61:9D:11:AA:FF',
    status: 'Verified'
  },
  {
    location: 'Oxford Street, London',
    coordinates: '51.5074° N, 0.1278° W',
    strength: -71,
    accessPoint: 'BT_Free',
    mac: '00:1A:2B:3C:4D:5E',
    status: 'Pending'
  }
]
```

**TODO:**
- [ ] Replace with data from Supabase database
- [ ] Update display logic to show real history data

---

## SettingsScreen.tsx

**Lines 21-57** - Hardcoded user profile data:

| Field | Current Placeholder |
|-------|---------------------|
| Avatar Image | Unsplash URL (photo-1472099645785-5658abf4ff4e) |
| User Name | "Adrian Sterling" |
| Email | "adrian.s@crowdsense.ai" |
| Rank | "Network Cartographer Rank IV" |
| Contributions | "1.2k" |
| Badge | "Elite Mapper" |
| Active Nodes | 14 |
| Uptime Rate | 99.4% |

**TODO:**
- [ ] Replace with authenticated user data from Supabase Auth
- [ ] Replace avatar with user-uploaded image or initials fallback

---

## InsightsScreen.tsx

**Lines 30-51** - Static placeholder metrics:

| Metric | Current Value |
|--------|---------------|
| Density | "High" (hardcoded) |
| Avg Throughput | "142 Mbps" (hardcoded) |
| Blindspots | "3 Detected" (hardcoded) |

**TODO:**
- [ ] Calculate density from real location data
- [ ] Calculate average throughput from actual network measurements
- [ ] Detect blindspots algorithmically from coverage gaps

---

## Header.tsx

**Lines 38-43** - Hardcoded user avatar image:

```tsx
<img
  alt="User profile"
  className="w-full h-full object-cover"
  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
/>
```

**TODO:**
- [ ] Replace with authenticated user's avatar or initials
