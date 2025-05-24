import { getMapPoints, toWebMercator } from './helpers';
import type { CreateMapOptions } from './types';

export const createMap = <MarkerData>({
  height,
  width,
  countries,
  region,
  markers,
  radius = 0.3,
  mapSamples = 6000,
}: CreateMapOptions<MarkerData>) => {
  const aspect = width / height;
  const rows = Math.round(Math.sqrt(mapSamples / aspect));
  const columns = Math.round(rows * aspect);

  const { points, X_MIN, Y_MAX, X_RANGE, Y_RANGE } = getMapPoints({
    height,
    width,
    countries,
    region,
    rows,
    columns,
    radius,
  });

  const margin = radius * 1.25;
  const widthRange = width - 2 * margin;
  const heightRange = height - 2 * margin;

  const markerPoints = markers.map((marker) => {
    const { lat, lng, size, ...markerData } = marker;
    const [googleX, googleY] = toWebMercator(lng, lat);

    const normalizedX = (googleX - X_MIN) / X_RANGE;
    const normalizedY = (Y_MAX - googleY) / Y_RANGE;

    const col = Math.round(normalizedX * (columns - 1));
    const row = Math.round(normalizedY * (rows - 1));

    const localx = margin + (col / (columns - 1)) * widthRange;
    const localy = margin + (row / (rows - 1)) * heightRange;

    const key = `${Math.round(localx)};${Math.round(localy)}`;
    if (!points[key]) {
      points[key] = { x: localx, y: localy };
    }

    return {
      x: localx,
      y: localy,
      ...markerData,
    };
  });

  return {
    points: Object.values(points),
    markers: markerPoints,
  };
};
