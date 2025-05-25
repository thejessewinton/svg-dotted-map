export interface GeoJSON {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    id: string;
    properties: {
      name: string;
    };
    geometry:
      | {
          type: 'Polygon';
          coordinates: [number, number][][];
        }
      | {
          type: 'MultiPolygon';
          coordinates: [number, number][][][];
        };
  }[];
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][];
}
export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
}

export type Geometry = PolygonGeometry | MultiPolygonGeometry;

export interface GeoJsonFeature {
  type: 'Feature';
  id: string;
  properties: {
    name: string;
  };
  geometry: Geometry;
}

export interface Region {
  lat: { min: number; max: number };
  lng: { min: number; max: number };
}

export type Marker<MarkerData = void> = {
  lat: number;
  lng: number;
  size?: number;
} & MarkerData;

export interface CreateMapOptions {
  height: number;
  width: number;
  radius?: number;
  countries?: string[];
  mapSamples?: number;
  region?: Region;
}

export interface Pin {
  lat: number;
  lng: number;
}

export type Point = {
  x: number;
  y: number;
};

export interface BoundingBox {
  lat: { min: number; max: number };
  lng: { min: number; max: number };
}

export type Coordinate = [number, number];
export type LinearRing = Coordinate[];
export type Polygon = LinearRing[];
export type MultiPolygon = Polygon[];

export interface PolygonFeature {
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: Polygon | MultiPolygon;
  };
}

export type MapPointsResult = {
  points: Record<string, Point>;
  X_MIN: number;
  Y_MAX: number;
  X_RANGE: number;
  Y_RANGE: number;
  height: number;
  width: number;
};
