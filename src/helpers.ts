import geojsonWorld from './countries.geo.json'

import type {
  Coordinate,
  CreateMapOptions,
  GeoJSON,
  GeoJsonFeature,
  Region,
} from './types'

const MERC_MAX = 20037508.34
const MERC_FACTOR = MERC_MAX / 180
const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

/** @internal */
export const DEFAULT_WORLD_REGION: Region = {
  lat: { min: -56, max: 71 },
  lng: { min: -179, max: 179 },
}

/** @internal */
export const toWebMercator = (lng: number, lat: number): [number, number] => {
  const x = lng * MERC_FACTOR
  const y =
    Math.log(Math.tan((90 + lat) * DEG_TO_RAD * 0.5)) * RAD_TO_DEG * MERC_FACTOR
  return [x, y]
}

const fromWebMercator = (mx: number, my: number): [number, number] => {
  const lng = mx / MERC_FACTOR
  const lat =
    Math.atan(Math.exp((my / MERC_FACTOR) * DEG_TO_RAD)) * RAD_TO_DEG * 2 - 90
  return [lng, lat]
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
    const mx = lng * MERC_FACTOR
    const my =
      Math.log(Math.tan((90 + lat) * DEG_TO_RAD * 0.5)) *
      RAD_TO_DEG *
      MERC_FACTOR
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

let geomCacheFeatures: GeoJsonFeature[] | null = null
let geomCacheValue: PreparedGeometry | null = null

const getCachedPreparedGeometry = (geojson: GeoJSON): PreparedGeometry => {
  const features = geojson.features
  if (geomCacheFeatures && features.length === geomCacheFeatures.length) {
    let match = true
    for (let i = 0; i < features.length; i++) {
      if (features[i] !== geomCacheFeatures[i]) {
        match = false
        break
      }
    }
    if (match) return geomCacheValue!
  }
  const prepared = prepareGeometry(geojson)
  geomCacheFeatures = features
  geomCacheValue = prepared
  return prepared
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
  grid?: 'vertical' | 'diagonal'
}

/** @internal */
export const getMapPoints = ({
  height = 0,
  width = 0,
  countries = [],
  rows,
  columns,
  region,
  radius = 0.3,
  grid = 'vertical',
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
  }

  const prepared = getCachedPreparedGeometry(geojson)

  if (!region) {
    if (countries.length > 0) {
      const [lngMin, latMin] = fromWebMercator(prepared.minX, prepared.minY)
      const [lngMax, latMax] = fromWebMercator(prepared.maxX, prepared.maxY)
      region = {
        lat: { min: latMin, max: latMax },
        lng: { min: lngMin, max: lngMax },
      }
    } else {
      region = DEFAULT_WORLD_REGION
    }
  }

  const clampedRegion = {
    lat: {
      min: Math.max(region.lat.min, -85),
      max: Math.min(region.lat.max, 85),
    },
    lng: region.lng,
  }

  const [X_MIN, Y_MIN_MERC] = toWebMercator(
    clampedRegion.lng.min,
    clampedRegion.lat.min,
  )
  const [X_MAX, Y_MAX] = toWebMercator(
    clampedRegion.lng.max,
    clampedRegion.lat.max,
  )
  const X_RANGE = X_MAX - X_MIN
  const Y_RANGE = Y_MAX - Y_MIN_MERC

  if (width <= 0) {
    width = Math.round((height * X_RANGE) / Y_RANGE)
  } else if (height <= 0) {
    height = Math.round((width * Y_RANGE) / X_RANGE)
  }

  const margin = radius * 1.25
  const widthRange = width - 2 * margin
  const heightRange = height - 2 * margin

  const maxPoints = rows * columns
  const pointsXY = new Float64Array(maxPoints * 2)
  let pointCount = 0

  const colScale = widthRange / (columns - 1)
  const rowScale = heightRange / (rows - 1)
  const xScaleInv = X_RANGE / width
  const yScaleInv = Y_RANGE / height

  for (let row = 0; row < rows; row++) {
    const gridY = margin + row * rowScale
    const my = Y_MAX - gridY * yScaleInv

    for (let col = 0; col < columns; col++) {
      let gridX = margin + col * colScale
      if (grid === 'diagonal' && row % 2 === 0) {
        gridX += colScale / 2
      }
      if (gridX > width - margin) continue
      const mx = gridX * xScaleInv + X_MIN

      if (insideMercator(mx, my, prepared)) {
        pointsXY[pointCount * 2] = gridX
        pointsXY[pointCount * 2 + 1] = gridY
        pointCount++
      }
    }
  }

  return {
    points: pointsXY.subarray(0, pointCount * 2),
    X_MIN,
    Y_MAX,
    X_RANGE,
    Y_RANGE,
    height,
    width,
  }
}
