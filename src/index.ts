import proj4 from 'proj4';
import { getMapPoints } from './helpers';
import type { CreateMapOptions } from './types';

export const createMap = <MarkerData>({
  height,
  width,
  countries,
  region,
  markers,
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
  });

  console.log('Points range:', {
    maxX: Math.max(...Object.values(points).map((p) => p.x)),
    maxY: Math.max(...Object.values(points).map((p) => p.y)),
    width: height * 2,
    height,
  });

  const markerPoints = markers.map((marker) => {
    const { lat, lng, size, ...markerData } = marker;
    const [googleX, googleY] = proj4('GOOGLE', [lng, lat]);

    const normalizedX = (googleX - X_MIN) / X_RANGE;
    const normalizedY = (Y_MAX - googleY) / Y_RANGE;

    const col = Math.round(normalizedX * (columns - 1));
    const row = Math.round(normalizedY * (rows - 1));

    const localx = (col / (columns - 1)) * width;
    const localy = (row / (rows - 1)) * height;

    const key = `${Math.round(localx)};${Math.round(localy)}`;
    if (!points[key]) {
      points[key] = {
        x: localx,
        y: localy,
      };
    }

    return {
      x: localx,
      y: localy,
      ...markerData,
    };
  });

  console.log('Markers range:', {
    maxX: Math.max(...markerPoints.map((m) => m.x)),
    maxY: Math.max(...markerPoints.map((m) => m.y)),
  });

  return {
    points: Object.values(points),
    markers: markerPoints,
  };
};
