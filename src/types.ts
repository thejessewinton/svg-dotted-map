/** @internal */
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

/** @internal */
export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][];
}
/** @internal */
export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
}

/** @internal */
export type Geometry = PolygonGeometry | MultiPolygonGeometry;

/** @internal */
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

/** @internal */
export type Coordinate = [number, number];

export type Point = {
  x: number;
  y: number;
};

/** @internal */
export type MapPointsResult = {
  points: Float64Array;
  X_MIN: number;
  Y_MAX: number;
  X_RANGE: number;
  Y_RANGE: number;
  height: number;
  width: number;
};
