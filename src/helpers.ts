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

export const computeGeojsonBox = (
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
    } else if (geojson.type === 'Feature') {
      return computeGeojsonBox(geojson.geometry);
    } else if (geojson.type === 'MultiPolygon') {
      const coords = geojson.coordinates.flat(2);
      const latitudes = coords.map(([_, lat]) => lat);
      const longitudes = coords.map(([lng, _]) => lng);

      return {
        lat: { min: Math.min(...latitudes), max: Math.max(...latitudes) },
        lng: { min: Math.min(...longitudes), max: Math.max(...longitudes) },
      };
    } else if (geojson.type === 'Polygon') {
      const coords = geojson.coordinates.flat();
      const latitudes = coords.map(([_, lat]) => lat);
      const longitudes = coords.map(([lng, _]) => lng);

      return {
        lat: { min: Math.min(...latitudes), max: Math.max(...latitudes) },
        lng: { min: Math.min(...longitudes), max: Math.max(...longitudes) },
      };
    }
  }

  throw new Error(`Unknown or unsupported geojson structure`);
};

const countryCache = new WeakMap<GeoJSON, Record<string, GeoJsonFeature>>();

export const getGeojsonByCountry = (
  geojson: GeoJSON = geojsonWorld as GeoJSON
) => {
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
      features: countries.map((country) => countryMap[country]).filter(Boolean),
    };

    if (!region) {
      region = computeGeojsonBox(geojson);
    }
  } else if (!region) {
    region = DEFAULT_WORLD_REGION;
  }

  const poly = geojsonToMultiPolygons(geojson);

  const [X_MIN, Y_MIN] = toWebMercator(region.lng.min, region.lat.min);
  const [X_MAX, Y_MAX] = toWebMercator(region.lng.max, region.lat.max);
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

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const localx = margin + (col / (columns - 1)) * widthRange;
      const localy = margin + (row / (rows - 1)) * heightRange;

      const pointMercator = [
        (localx / width) * X_RANGE + X_MIN,
        Y_MAX - (localy / height) * Y_RANGE,
      ];

      const lng = (pointMercator[0] * 180) / 20037508.34;
      const lat =
        (Math.atan(Math.exp((pointMercator[1] * Math.PI) / 20037508.34)) *
          360) /
          Math.PI -
        90;
      const wgs84Point: [number, number] = [lng, lat];

      if (inside(wgs84Point, poly)) {
        const key = `${Math.round(localx)};${Math.round(localy)}`;
        points[key] = { x: localx, y: localy };
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

const pointInPolygon = (point: Coordinate, polygon: LinearRing): boolean => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

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
  if (!pointInPolygon(point, polygon[0])) {
    return false;
  }

  for (let i = 1; i < polygon.length; i++) {
    if (pointInPolygon(point, polygon[i])) {
      return false;
    }
  }

  return true;
};

export const inside = (point: Coordinate, feature: PolygonFeature): boolean => {
  const { geometry } = feature;

  if (geometry.type === 'Polygon') {
    return pointInPolygonWithHoles(point, geometry.coordinates as Polygon);
  } else if (geometry.type === 'MultiPolygon') {
    const multiPolygon = geometry.coordinates as MultiPolygon;
    return multiPolygon.some((polygon) =>
      pointInPolygonWithHoles(point, polygon)
    );
  }

  return false;
};
