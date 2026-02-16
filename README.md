# piri

A lightweight utility to create beautiful, dotted SVG maps with a bring-your-own-styles mentality. Heavily based on the [Dotted Map](https://github.com/NTag/dotted-map/tree/main) library, with more customization.

![a dotted map on an abstract background](https://raw.githubusercontent.com/thejessewinton/piri/refs/heads/main/image.jpeg "SVG Dotted Map")

---

## Installation

```bash
pnpm install piri
```

## Quick Start

```tsx
import { createMap } from "piri";

const { points, addMarkers } = createMap({
  width: 150,
  height: 75,
});
```

`createMap` returns:

- **`points`** — an array of `{ x, y }` coordinates representing land masses, snapped to a dot grid
- **`addMarkers`** — a function to convert lat/lng markers into the same coordinate space

## API Reference

### `createMap(options)`

Creates a dot grid representing the world (or a subset of it) and returns the grid points along with a marker projection function.

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | **required** | Width of the SVG viewBox in px. |
| `height` | `number` | **required** | Height of the SVG viewBox in px. |
| `mapSamples` | `number` | `6000` | Total number of grid cells sampled. Higher values produce denser, more detailed maps at the cost of more points to render. |
| `radius` | `number` | `0.3` | The base dot radius in viewBox units. Controls the margin/padding around the edges of the map (`margin = radius * 1.25`). |
| `countries` | `CountryCode[]` | `undefined` | ISO 3166-1 alpha-3 country codes to render (e.g. `["USA", "CAN"]`). When provided, only the specified countries are drawn and the region auto-fits to their bounding box. |
| `region` | `Region` | auto | A custom lat/lng bounding box to control which part of the world is visible. Overrides the auto-fit behavior when `countries` is set. |

#### Region

```typescript
interface Region {
  lat: { min: number; max: number };
  lng: { min: number; max: number };
}
```

Latitudes are clamped to `[-85, 85]` internally (the limit of the Web Mercator projection).

#### Return Value

```typescript
{
  points: Point[];          // { x: number; y: number }[]
  addMarkers: <MarkerData>(markers: Marker<MarkerData>[]) => (Point & MarkerData)[];
}
```

### `addMarkers<MarkerData>(markers)`

Projects an array of lat/lng markers into the map's coordinate space. Each marker is snapped to the nearest grid position so it aligns with the dot grid.

#### Marker

```typescript
type Marker<MarkerData = void> = {
  lat: number;
  lng: number;
  size?: number;
} & MarkerData;
```

- `lat` / `lng` — geographic coordinates
- `size` — **pass-through only**. Not used internally; it's returned as-is for your renderer to consume.
- Any additional properties from `MarkerData` are preserved in the output.

#### Generic Custom Data

`addMarkers` accepts a generic type parameter, giving you full type safety on custom marker properties:

```typescript
const markers = addMarkers<{ label: string; visited: boolean }>([
  { 
    lat: 40.7128, 
    lng: -74.006, 
    label: "New York", 
    visited: true 
  },
  { lat: 51.5074, 
    lng: -0.1278, 
    label: "London", 
    visited: false 
  },
]);
```

## Usage Examples

### World Map

```tsx
import { createMap } from "piri";

const { points, addMarkers } = createMap({
  width: 150,
  height: 75,
  mapSamples: 4500,
});

const markers = addMarkers([
  { lat: 40.7128, lng: -74.006, size: 0.5 },   // New York
  { lat: 34.0522, lng: -118.2437, size: 0.5 },  // Los Angeles
  { lat: 51.5074, lng: -0.1278, size: 0.5 },    // London
  { lat: -33.8688, lng: 151.2093, size: 0.5 },  // Sydney
]);
```

### Single Country

When `countries` is provided, the map automatically zooms to fit those countries:

```typescript
const { points, addMarkers } = createMap({
  width: 200,
  height: 100,
  countries: ["USA"],
});
```

### Multiple Countries

```typescript
const { points, addMarkers } = createMap({
  width: 200,
  height: 100,
  countries: ["USA", "CAN", "MEX"],
});
```

### Custom Region

Override the viewport with a specific lat/lng bounding box:

```typescript
const { points } = createMap({
  width: 200,
  height: 100,
  region: {
    lat: { min: 35, max: 72 },
    lng: { min: -25, max: 45 },
  },
});
```

### Controlling Density

`mapSamples` controls the total grid cells tested. More samples = more dots = more detail:

```typescript
// Sparse — fast, lightweight
const sparse = createMap({ width: 200, height: 100, mapSamples: 500 });

// Dense — detailed, more points to render
const dense = createMap({ width: 200, height: 100, mapSamples: 10000 });
```

### Rendering

After creating a map, render it as an SVG, with whatever customizations you'd like. This example uses React:

```tsx
export const DottedMap = () => {
  const { points, addMarkers } = createMap({
    width: 150,
    height: 75,
  });

  const markers = addMarkers<{ visited: boolean }>([
    { lat: 40.7128, lng: -74.006, size: 0.5, visited: true },
    { lat: 51.5074, lng: -0.1278, size: 0.5, visited: false },
  ]);

  return (
    <svg viewBox="0 0 150 75" style={{ width: "100%", height: "100%" }}>
      {points.map((point) => (
        <circle
          cx={point.x}
          cy={point.y}
          r={0.25}
          fill="#ccc"
          key={`${point.x}-${point.y}`}
        />
      ))}
      {markers.map((marker) => (
        <circle
          cx={marker.x}
          cy={marker.y}
          r={marker.size ?? 0.25}
          fill={marker.visited ? "#4A0404" : "#999"}
          key={`${marker.x}-${marker.y}`}
        />
      ))}
    </svg>
  );
};
```

## Caching

Point calculations are cached automatically. Calling `createMap` with identical options returns the same points without recalculating. The cache invalidates when any option changes (dimensions, countries, region, radius, or sample count).
