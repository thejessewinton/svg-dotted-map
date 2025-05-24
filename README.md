# svg-dotted-map

A lightweight utility to create beautiful, stylized SVG maps. Heavily based on the [Dotted Map](https://github.com/NTag/dotted-map/tree/main) library, with more customization.

---

## Installation

First, install `svg-dotted-map`.

```bash
pnpm install @tinylight-ui/dotted-map
```

Then, import it into your app:

```tsx
import { createMap } from "svg-dotted-map";
```

## Usage

Create a map using the `createMap` function.

```typescript
const { points, markers } = createMap({
  width: 150,
  height: 75,
  markers: [
    {
      lat: 40.7128,
      lng: -74.006,
      size: 8,
    }, // New York
    {

      lat: 34.0522,
      lng: -118.2437,
    }, // Los Angeles
    {
      lat: 51.5074,
      lng: -0.1278,
    }, // London
    {
      lat: -33.8688,
      lng: 151.2093,
    }, // Sydney
  ],
  mapSamples: 4500,
});
```

After creating a map, render it as an SVG however you'd like. This example is using React:

```tsx
export const DottedMap = () => {
  return (
    <svg viewBox={`0 0 150 75`} style={{ width: '100%', height: '100%' }}>
      {points.map((point) => {
        return (
          <circle
            cx={point.x}
            cy={point.y}
            r={0.25}
            fill="#eee"
          />
        );
      })}
      {markers.map((marker) => {
        return (
          <circle
            cx={marker.x}
            cy={marker.y}
            r={marker.size ?? 0.25}
            fill="#000"
          />
        );
      })}
    </svg>
  );
};
```