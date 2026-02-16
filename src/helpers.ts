import geojsonWorld from './countries.geo.json'

import type {
  Coordinate,
  CreateMapOptions,
  GeoJSON,
  GeoJsonFeature,
  Geometry,
  Point,
  Region,
} from './types'

export const DEFAULT_WORLD_REGION = {
  lat: { min: -56, max: 71 },
  lng: { min: -179, max: 179 },
}

export const toWebMercator = (lng: number, lat: number): [number, number] => {
  const x = (lng * 20037508.34) / 180
  let y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)
  y = (y * 20037508.34) / 180
  return [x, y]
}

const computeGeojsonBox = (
  geojson: GeoJSON | GeoJsonFeature | Geometry,
): Region => {
  if ('type' in geojson) {
    if (geojson.type === 'FeatureCollection') {
      const boxes = geojson.features.map(computeGeojsonBox)
      return {
        lat: {
          min: Math.min(...boxes.map((box) => box.lat.min)),
          max: Math.max(...boxes.map((box) => box.lat.max)),
        },
        lng: {
          min: Math.min(...boxes.map((box) => box.lng.min)),
          max: Math.max(...boxes.map((box) => box.lng.max)),
        },
      }
    }

    if (geojson.type === 'Feature') {
      return computeGeojsonBox(geojson.geometry)
    }

    if (geojson.type === 'Polygon') {
      let minLat = Number.POSITIVE_INFINITY
      let maxLat = -Number.POSITIVE_INFINITY
      let minLng = Number.POSITIVE_INFINITY
      let maxLng = -Number.POSITIVE_INFINITY
      for (const ring of geojson.coordinates) {
        for (const [lng, lat] of ring) {
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
          if (lng < minLng) minLng = lng
          if (lng > maxLng) maxLng = lng
        }
      }
      return {
        lat: { min: minLat, max: maxLat },
        lng: { min: minLng, max: maxLng },
      }
    }

    if (geojson.type === 'MultiPolygon') {
      let minLat = Number.POSITIVE_INFINITY
      let maxLat = -Number.POSITIVE_INFINITY
      let minLng = Number.POSITIVE_INFINITY
      let maxLng = -Number.POSITIVE_INFINITY
      for (const polygon of geojson.coordinates) {
        for (const ring of polygon) {
          for (const [lng, lat] of ring) {
            if (lat < minLat) minLat = lat
            if (lat > maxLat) maxLat = lat
            if (lng < minLng) minLng = lng
            if (lng > maxLng) maxLng = lng
          }
        }
      }
      return {
        lat: { min: minLat, max: maxLat },
        lng: { min: minLng, max: maxLng },
      }
    }
  }

  throw new Error('Unknown or unsupported geojson structure')
}

const countryCache = new WeakMap<GeoJSON, Record<string, GeoJsonFeature>>()

const getGeojsonByCountry = (geojson: GeoJSON = geojsonWorld as GeoJSON) => {
  if (!countryCache.has(geojson)) {
    const countries = geojson.features.reduce<Record<string, GeoJsonFeature>>(
      (acc, feature) => {
        acc[feature.id] = feature
        return acc
      },
      {},
    )
    countryCache.set(geojson, countries)
  }
  return countryCache.get(geojson)!
}

interface MercatorRing {
  coords: Float64Array
  length: number
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface MercatorPolygon {
  outer: MercatorRing
  holes: MercatorRing[]
}

interface PreparedGeometry {
  polygons: MercatorPolygon[]
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const ringToMercator = (ring: Coordinate[]): MercatorRing => {
  const coords = new Float64Array(ring.length * 2)
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = -Number.POSITIVE_INFINITY
  let maxY = -Number.POSITIVE_INFINITY

  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i]
    const [mx, my] = toWebMercator(lng, lat)
    coords[i * 2] = mx
    coords[i * 2 + 1] = my
    if (mx < minX) minX = mx
    if (mx > maxX) maxX = mx
    if (my < minY) minY = my
    if (my > maxY) maxY = my
  }

  return { coords, length: ring.length, minX, minY, maxX, maxY }
}

const prepareGeometry = (geojson: GeoJSON): PreparedGeometry => {
  let gMinX = Number.POSITIVE_INFINITY
  let gMinY = Number.POSITIVE_INFINITY
  let gMaxX = -Number.POSITIVE_INFINITY
  let gMaxY = -Number.POSITIVE_INFINITY
  const polygons: MercatorPolygon[] = []

  for (const feature of geojson.features) {
    const geom = feature.geometry
    const polys =
      geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates

    for (const poly of polys) {
      const outerRing = poly[0]
      if (!outerRing) continue

      const outer = ringToMercator(outerRing)
      const holes: MercatorRing[] = []
      for (let i = 1; i < poly.length; i++) {
        if (poly[i]) holes.push(ringToMercator(poly[i]))
      }

      if (outer.minX < gMinX) gMinX = outer.minX
      if (outer.minY < gMinY) gMinY = outer.minY
      if (outer.maxX > gMaxX) gMaxX = outer.maxX
      if (outer.maxY > gMaxY) gMaxY = outer.maxY

      polygons.push({ outer, holes })
    }
  }

  return { polygons, minX: gMinX, minY: gMinY, maxX: gMaxX, maxY: gMaxY }
}

const pointInRing = (px: number, py: number, ring: MercatorRing): boolean => {
  if (px < ring.minX || px > ring.maxX || py < ring.minY || py > ring.maxY) {
    return false
  }

  const { coords, length } = ring
  let inside = false

  for (let i = 0, j = length - 1; i < length; j = i++) {
    const xi = coords[i * 2]
    const yi = coords[i * 2 + 1]
    const xj = coords[j * 2]
    const yj = coords[j * 2 + 1]

    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

const insideMercator = (
  px: number,
  py: number,
  prepared: PreparedGeometry,
): boolean => {
  if (
    px < prepared.minX ||
    px > prepared.maxX ||
    py < prepared.minY ||
    py > prepared.maxY
  ) {
    return false
  }

  for (const polygon of prepared.polygons) {
    if (!pointInRing(px, py, polygon.outer)) continue

    let inHole = false
    for (const hole of polygon.holes) {
      if (pointInRing(px, py, hole)) {
        inHole = true
        break
      }
    }
    if (!inHole) return true
  }

  return false
}

interface GetMapPoints
  extends Omit<CreateMapOptions, 'markers' | 'mapSamples'> {
  rows: number
  columns: number
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
  let geojson: GeoJSON = geojsonWorld as GeoJSON
  if (countries.length > 0) {
    const countryMap = getGeojsonByCountry(geojson)
    geojson = {
      type: 'FeatureCollection',
      features: countries
        .map((country) => countryMap[country])
        .filter((feature): feature is GeoJsonFeature => feature !== undefined),
    }

    if (!region) {
      region = computeGeojsonBox(geojson)
    }
  } else if (!region) {
    region = DEFAULT_WORLD_REGION
  }

  const clampedRegion = {
    lat: {
      min: Math.max(region.lat.min, -85),
      max: Math.min(region.lat.max, 85),
    },
    lng: region.lng,
  }

  const prepared = prepareGeometry(geojson)

  const [X_MIN] = toWebMercator(clampedRegion.lng.min, clampedRegion.lat.min)
  const [X_MAX, Y_MAX] = toWebMercator(
    clampedRegion.lng.max,
    clampedRegion.lat.max,
  )
  const [, Y_MIN_MERC] = toWebMercator(
    clampedRegion.lng.min,
    clampedRegion.lat.min,
  )
  const X_RANGE = X_MAX - X_MIN
  const Y_RANGE = Y_MAX - Y_MIN_MERC

  if (width <= 0) {
    width = Math.round((height * X_RANGE) / Y_RANGE)
  } else if (height <= 0) {
    height = Math.round((width * Y_RANGE) / X_RANGE)
  }

  const points: Record<string, Point> = {}
  const margin = radius * 1.25
  const widthRange = width - 2 * margin
  const heightRange = height - 2 * margin

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const gridX = margin + (col / (columns - 1)) * widthRange
      const gridY = margin + (row / (rows - 1)) * heightRange

      const mx = (gridX / width) * X_RANGE + X_MIN
      const my = Y_MAX - (gridY / height) * Y_RANGE

      if (insideMercator(mx, my, prepared)) {
        points[`${col};${row}`] = { x: gridX, y: gridY }
      }
    }
  }

  return {
    points,
    X_MIN,
    Y_MAX,
    X_RANGE,
    Y_RANGE,
    height,
    width,
  }
}
