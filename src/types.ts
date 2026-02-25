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

export type CountryCode =
  | 'AFG'
  | 'AGO'
  | 'ALB'
  | 'ARE'
  | 'ARG'
  | 'ARM'
  | 'ATA'
  | 'ATF'
  | 'AUS'
  | 'AUT'
  | 'AZE'
  | 'BDI'
  | 'BEL'
  | 'BEN'
  | 'BFA'
  | 'BGD'
  | 'BGR'
  | 'BHS'
  | 'BIH'
  | 'BLR'
  | 'BLZ'
  | 'BMU'
  | 'BOL'
  | 'BRA'
  | 'BRN'
  | 'BTN'
  | 'BWA'
  | 'CAF'
  | 'CAN'
  | 'CHE'
  | 'CHL'
  | 'CHN'
  | 'CIV'
  | 'CMR'
  | 'COD'
  | 'COG'
  | 'COL'
  | 'CRI'
  | 'CUB'
  | 'CZE'
  | 'DEU'
  | 'DJI'
  | 'DNK'
  | 'DOM'
  | 'DZA'
  | 'ECU'
  | 'EGY'
  | 'ERI'
  | 'ESH'
  | 'ESP'
  | 'EST'
  | 'ETH'
  | 'FIN'
  | 'FJI'
  | 'FLK'
  | 'FRA'
  | 'GAB'
  | 'GBR'
  | 'GEO'
  | 'GHA'
  | 'GIN'
  | 'GMB'
  | 'GNB'
  | 'GNQ'
  | 'GRC'
  | 'GRL'
  | 'GTM'
  | 'GUF'
  | 'GUY'
  | 'HND'
  | 'HRV'
  | 'HTI'
  | 'HUN'
  | 'IDN'
  | 'IND'
  | 'IRL'
  | 'IRN'
  | 'IRQ'
  | 'ISL'
  | 'ISR'
  | 'ITA'
  | 'JAM'
  | 'JOR'
  | 'JPN'
  | 'KAZ'
  | 'KEN'
  | 'KGZ'
  | 'KHM'
  | 'KOR'
  | 'KWT'
  | 'LAO'
  | 'LBN'
  | 'LBR'
  | 'LBY'
  | 'LKA'
  | 'LSO'
  | 'LTU'
  | 'LUX'
  | 'LVA'
  | 'MAR'
  | 'MDA'
  | 'MDG'
  | 'MEX'
  | 'MKD'
  | 'MLI'
  | 'MLT'
  | 'MMR'
  | 'MNE'
  | 'MNG'
  | 'MOZ'
  | 'MRT'
  | 'MWI'
  | 'MYS'
  | 'NAM'
  | 'NCL'
  | 'NER'
  | 'NGA'
  | 'NIC'
  | 'NLD'
  | 'NOR'
  | 'NPL'
  | 'NZL'
  | 'OMN'
  | 'PAK'
  | 'PAN'
  | 'PER'
  | 'PHL'
  | 'PNG'
  | 'POL'
  | 'PRI'
  | 'PRK'
  | 'PRT'
  | 'PRY'
  | 'PSE'
  | 'QAT'
  | 'ROU'
  | 'RUS'
  | 'RWA'
  | 'SAU'
  | 'SDN'
  | 'SEN'
  | 'SLB'
  | 'SLE'
  | 'SLV'
  | 'SOM'
  | 'SRB'
  | 'SSD'
  | 'SUR'
  | 'SVK'
  | 'SVN'
  | 'SWE'
  | 'SWZ'
  | 'SYR'
  | 'TCD'
  | 'TGO'
  | 'THA'
  | 'TJK'
  | 'TKM'
  | 'TLS'
  | 'TTO'
  | 'TUN'
  | 'TUR'
  | 'TWN'
  | 'TZA'
  | 'UGA'
  | 'UKR'
  | 'URY'
  | 'USA'
  | 'UZB'
  | 'VEN'
  | 'VNM'
  | 'VUT'
  | 'YEM'
  | 'ZAF'
  | 'ZMB'
  | 'ZWE'

export type Marker = {
  lat: number;
  lng: number;
  size?: number;
  [key: string]: unknown;
};

export interface CreateMapOptions {
  height: number;
  width: number;
  radius?: number;
  countries?: CountryCode[];
  mapSamples?: number;
  region?: Region;
  grid?: 'vertical' | 'diagonal';
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
