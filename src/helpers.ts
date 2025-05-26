import geojsonWorld from './countries.geo.json';

import type {
  Coordinate,
  CreateMapOptions,
  GeoJSON,
  GeoJsonFeature,
  Geometry,
  LinearRing,
  MultiPolygon,
  MultiPolygonGeometry,
  Point,
  Polygon,
  PolygonFeature,
  Region,
} from './types';

export const DEFAULT_WORLD_REGION = {
  lat: { min: -56, max: 71 },
  lng: { min: -179, max: 179 },
};

export const toWebMercator = (lng: number, lat: number): [number, number] => {
  const x = (lng * 20037508.34) / 180;
  let y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return [x, y];
};

const computeGeojsonBox = (
  geojson: GeoJSON | GeoJsonFeature | Geometry
): Region => {
  if ('type' in geojson) {
    if (geojson.type === 'FeatureCollection') {
      const boxes = geojson.features.map(computeGeojsonBox);
      return {
        lat: {
          min: Math.min(...boxes.map((box) => box.lat.min)),
          max: Math.max(...boxes.map((box) => box.lat.max)),
        },
        lng: {
          min: Math.min(...boxes.map((box) => box.lng.min)),
          max: Math.max(...boxes.map((box) => box.lng.max)),
        },
      };
    }
  }

  throw new Error('Unknown or unsupported geojson structure');
};

const countryCache = new WeakMap<GeoJSON, Record<string, GeoJsonFeature>>();

const getGeojsonByCountry = (geojson: GeoJSON = geojsonWorld as GeoJSON) => {
  if (!countryCache.has(geojson)) {
    const countries = geojson.features.reduce<Record<string, GeoJsonFeature>>(
      (acc, feature) => {
        acc[feature.id] = feature;
        return acc;
      },
      {}
    );
    countryCache.set(geojson, countries);
  }
  return countryCache.get(geojson)!;
};

export const geojsonToMultiPolygons = (geojson: GeoJSON): GeoJsonFeature => {
  const coordinates = geojson.features.reduce<
    MultiPolygonGeometry['coordinates']
  >((poly, feature) => {
    if (feature.geometry.type === 'Polygon') {
      poly.push(feature.geometry.coordinates);
    } else {
      poly.push(...feature.geometry.coordinates);
    }
    return poly;
  }, []);

  return {
    type: 'Feature',
    id: 'multipolygon',
    properties: { name: 'Combined Polygons' },
    geometry: { type: 'MultiPolygon', coordinates },
  };
};

interface GetMapPoints
  extends Omit<CreateMapOptions, 'markers' | 'mapSamples'> {
  rows: number;
  columns: number;
}

export const getMapPoints = ({
  height = 0,
  width = 0,
  countries = [],
  rows,
  columns,
  region,
  radius = 0.3,
}: GetMapPoints) => {
  let geojson: GeoJSON = geojsonWorld as GeoJSON;
  if (countries.length > 0) {
    const countryMap = getGeojsonByCountry(geojson);
    geojson = {
      type: 'FeatureCollection',
      features: countries
        .map((country) => countryMap[country])
        .filter((feature): feature is GeoJsonFeature => feature !== undefined),
    };

    if (!region) {
      region = computeGeojsonBox(geojson);
    }
  } else if (!region) {
    region = DEFAULT_WORLD_REGION;
  }

  const clampedRegion = {
    lat: {
      min: Math.max(region.lat.min, -85),
      max: Math.min(region.lat.max, 85),
    },
    lng: region.lng,
  };

  const poly = geojsonToMultiPolygons(geojson);

  const [X_MIN, Y_MIN] = toWebMercator(
    clampedRegion.lng.min,
    clampedRegion.lat.min
  );
  const [X_MAX, Y_MAX] = toWebMercator(
    clampedRegion.lng.max,
    clampedRegion.lat.max
  );
  const X_RANGE = X_MAX - X_MIN;
  const Y_RANGE = Y_MAX - Y_MIN;

  if (width <= 0) {
    width = Math.round((height * X_RANGE) / Y_RANGE);
  } else if (height <= 0) {
    height = Math.round((width * Y_RANGE) / X_RANGE);
  }

  const points: Record<string, Point> = {};
  const margin = radius * 1.25;
  const widthRange = width - 2 * margin;
  const heightRange = height - 2 * margin;

  // Increase sampling density for better coverage
  const actualRows = Math.max(rows, Math.ceil(rows * 1.5));
  const actualCols = Math.max(columns, Math.ceil(columns * 1.5));

  for (let row = 0; row < actualRows; row++) {
    for (let col = 0; col < actualCols; col++) {
      // Use the original grid for positioning but sample more densely
      const localx = margin + (col / (actualCols - 1)) * widthRange;
      const localy = margin + (row / (actualRows - 1)) * heightRange;

      const pointMercator: [number, number] = [
        (localx / width) * X_RANGE + X_MIN,
        Y_MAX - (localy / height) * Y_RANGE,
      ];

      const lng = (pointMercator[0] * 180) / 20037508.34;
      const lat =
        (Math.atan(Math.exp((pointMercator[1] * Math.PI) / 20037508.34)) *
          360) /
          Math.PI -
        90;

      // Clamp coordinates to valid ranges
      const clampedLng = Math.max(-180, Math.min(180, lng));
      const clampedLat = Math.max(-85, Math.min(85, lat));
      const wgs84Point: [number, number] = [clampedLng, clampedLat];

      if (inside(wgs84Point, poly)) {
        const gridCol = Math.round((col / actualCols) * (columns - 1));
        const gridRow = Math.round((row / actualRows) * (rows - 1));
        const gridX = margin + (gridCol / (columns - 1)) * widthRange;
        const gridY = margin + (gridRow / (rows - 1)) * heightRange;

        const key = `${Math.round(gridX)};${Math.round(gridY)}`;
        points[key] = { x: gridX, y: gridY };
      }
    }
  }

  const result = {
    points,
    X_MIN,
    Y_MAX,
    X_RANGE,
    Y_RANGE,
    height,
    width,
  };

  return result;
};

const pointInPolygon = (point: Coordinate, polygon: LinearRing) => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pointI = polygon[i];
    const pointJ = polygon[j];
    if (!pointI || !pointJ) continue;

    const [xi, yi] = pointI;
    const [xj, yj] = pointJ;

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
};

const pointInPolygonWithHoles = (
  point: Coordinate,
  polygon: Polygon
): boolean => {
  const outerRing = polygon[0];
  if (!outerRing || !pointInPolygon(point, outerRing)) {
    return false;
  }

  for (let i = 1; i < polygon.length; i++) {
    const hole = polygon[i];
    if (hole && pointInPolygon(point, hole)) {
      return false;
    }
  }

  return true;
};

const inside = (point: Coordinate, feature: PolygonFeature) => {
  const { geometry } = feature;

  const multiPolygon = geometry.coordinates as MultiPolygon;
  return multiPolygon.some((polygon) =>
    pointInPolygonWithHoles(point, polygon)
  );
};
