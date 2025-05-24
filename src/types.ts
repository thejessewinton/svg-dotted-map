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

export type Marker<MarkerData> = {
  lat: number;
  lng: number;
  size?: number;
} & MarkerData;

export interface CreateMapOptions<T = void> {
  height: number;
  width: number;
  countries?: string[];
  mapSamples?: number;
  region?: Region;
  markers: Marker<T>[];
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
