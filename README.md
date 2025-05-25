# svg-dotted-map

A lightweight utility to create beautiful, SVG maps, with a bring your own styles mentality. Heavily based on the [Dotted Map](https://github.com/NTag/dotted-map/tree/main) library, with more customization.

---

## Installation

First, install `svg-dotted-map`.

```bash
pnpm install svg-dotted-map
```

Then, import it into your app:

```tsx
import { createMap } from "svg-dotted-map";
```

## Usage

Create a map using the `createMap` function.

```typescript
const { points, addMarkers } = createMap({
  width: 150,
  height: 75,
  mapSamples: 4500,
});
```

`createMap` returns the `points`, which are cached coordinates of the basic points, and an `addMarkers` function that you pass your markers into.

```typescript
const markers = addMarkers(
  [
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
  ]
);
```

After creating a map, render it as an SVG, with whatever customizations you'd like. This example uses React:

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
            fill="#ccc"
            key={point.x}
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
            key={marker.x}
          />
        );
      })}
    </svg>
  );
};
```

## Example

![a dotted map on an abstract background](https://raw.githubusercontent.com/thejessewinton/svg-dotted-map/refs/heads/main/image.jpeg "SVG Dotted Map")

