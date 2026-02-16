import { describe, expect, it } from 'vitest'
import { createMap } from './index'
import { toWebMercator, DEFAULT_WORLD_REGION, getMapPoints } from './helpers'

describe('toWebMercator', () => {
  it('converts origin (0, 0) to (0, 0)', () => {
    const [x, y] = toWebMercator(0, 0)
    expect(x).toBe(0)
    expect(y).toBeCloseTo(0, 5)
  })

  it('converts known coordinates correctly', () => {
    // London: ~51.5°N, ~-0.1°W
    const [x, y] = toWebMercator(-0.1, 51.5)
    expect(x).toBeCloseTo(-11131.95, 0)
    expect(y).toBeGreaterThan(0) // Northern hemisphere = positive y
  })

  it('handles extreme latitudes', () => {
    const [, yNorth] = toWebMercator(0, 85)
    const [, ySouth] = toWebMercator(0, -85)
    expect(yNorth).toBeGreaterThan(0)
    expect(ySouth).toBeLessThan(0)
    expect(yNorth).toBeCloseTo(-ySouth, 0)
  })

  it('handles longitude extremes', () => {
    const [xWest] = toWebMercator(-180, 0)
    const [xEast] = toWebMercator(180, 0)
    expect(xWest).toBeCloseTo(-20037508.34, 0)
    expect(xEast).toBeCloseTo(20037508.34, 0)
  })
})

describe('createMap', () => {
  it('returns points and addMarkers', () => {
    const result = createMap({ width: 100, height: 50 })
    expect(result).toHaveProperty('points')
    expect(result).toHaveProperty('addMarkers')
    expect(Array.isArray(result.points)).toBe(true)
    expect(typeof result.addMarkers).toBe('function')
  })

  it('returns points with x and y coordinates', () => {
    const { points } = createMap({ width: 100, height: 50 })
    expect(points.length).toBeGreaterThan(0)
    for (const point of points) {
      expect(point).toHaveProperty('x')
      expect(point).toHaveProperty('y')
      expect(typeof point.x).toBe('number')
      expect(typeof point.y).toBe('number')
    }
  })

  it('generates points within the map dimensions', () => {
    const width = 200
    const height = 100
    const { points } = createMap({ width, height })
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(width)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(height)
    }
  })

  it('respects mapSamples — more samples means more points', () => {
    const low = createMap({ width: 200, height: 100, mapSamples: 500 })
    const high = createMap({ width: 200, height: 100, mapSamples: 10000 })
    expect(high.points.length).toBeGreaterThan(low.points.length)
  })

  it('produces consistent results on repeated calls', () => {
    const opts = { width: 100, height: 50, mapSamples: 1000 } as const
    const a = createMap(opts)
    const b = createMap(opts)
    expect(a.points).toEqual(b.points)
  })

  it('returns different points for different dimensions', () => {
    const a = createMap({ width: 100, height: 50 })
    const b = createMap({ width: 200, height: 100 })
    // Different dimensions should produce different point counts or positions
    const sameLength = a.points.length === b.points.length
    const sameFirst =
      sameLength &&
      a.points[0]?.x === b.points[0]?.x &&
      a.points[0]?.y === b.points[0]?.y
    expect(sameFirst).toBe(false)
  })
})

describe('createMap with countries', () => {
  it('filters to a single country', () => {
    const world = createMap({ width: 200, height: 100 })
    const us = createMap({ width: 200, height: 100, countries: ['USA'] })
    expect(us.points.length).toBeGreaterThan(0)
    expect(us.points.length).toBeLessThan(world.points.length)
  })

  it('returns no points for an invalid country code', () => {
    const { points } = createMap({
      width: 200,
      height: 100,
      countries: ['ZZZZZ'],
    })
    expect(points.length).toBe(0)
  })

  it('handles multiple countries', () => {
    const single = createMap({
      width: 200,
      height: 100,
      countries: ['USA'],
    })
    const multiple = createMap({
      width: 200,
      height: 100,
      countries: ['USA', 'CAN'],
    })
    expect(multiple.points.length).toBeGreaterThan(single.points.length)
  })
})

describe('createMap with custom region', () => {
  it('accepts a custom region', () => {
    const region = {
      lat: { min: 25, max: 50 },
      lng: { min: -130, max: -60 },
    }
    const { points } = createMap({ width: 200, height: 100, region })
    expect(points.length).toBeGreaterThan(0)
  })

  it('clamps latitude to [-85, 85]', () => {
    const region = {
      lat: { min: -90, max: 90 },
      lng: { min: -180, max: 180 },
    }
    // Should not throw — latitudes get clamped internally
    const { points } = createMap({ width: 200, height: 100, region })
    expect(points.length).toBeGreaterThan(0)
  })
})

describe('createMap with custom radius', () => {
  it('accepts a custom radius', () => {
    const { points } = createMap({ width: 200, height: 100, radius: 1 })
    expect(points.length).toBeGreaterThan(0)
  })
})

describe('addMarkers', () => {
  it('converts lat/lng markers to x/y positions', () => {
    const { addMarkers } = createMap({ width: 200, height: 100 })
    const markers = addMarkers([
      { lat: 40.7128, lng: -74.006 }, // New York
      { lat: 51.5074, lng: -0.1278 }, // London
    ])
    expect(markers).toHaveLength(2)
    for (const marker of markers) {
      expect(typeof marker.x).toBe('number')
      expect(typeof marker.y).toBe('number')
      expect(Number.isFinite(marker.x)).toBe(true)
      expect(Number.isFinite(marker.y)).toBe(true)
    }
  })

  it('preserves extra marker data', () => {
    const { addMarkers } = createMap({ width: 200, height: 100 })
    const markers = addMarkers([
      { lat: 40.7128, lng: -74.006, label: 'NYC', size: 5 },
    ])
    expect(markers[0]).toHaveProperty('label', 'NYC')
    expect(markers[0]).toHaveProperty('size', 5)
  })

  it('places western markers to the left of eastern markers', () => {
    const { addMarkers } = createMap({ width: 200, height: 100 })
    const [ny, london] = addMarkers([
      { lat: 40.7128, lng: -74.006 }, // New York (west)
      { lat: 51.5074, lng: -0.1278 }, // London (east)
    ])
    expect(ny.x).toBeLessThan(london.x)
  })

  it('places northern markers above southern markers', () => {
    const { addMarkers } = createMap({ width: 200, height: 100 })
    const [london, capeTown] = addMarkers([
      { lat: 51.5074, lng: -0.1278 }, // London (north)
      { lat: -33.9249, lng: 18.4241 }, // Cape Town (south)
    ])
    expect(london.y).toBeLessThan(capeTown.y) // y increases downward
  })

  it('returns empty array for empty markers', () => {
    const { addMarkers } = createMap({ width: 200, height: 100 })
    expect(addMarkers([])).toEqual([])
  })
})

describe('caching', () => {
  it('returns identical results from cache', () => {
    const opts = { width: 150, height: 75, mapSamples: 2000 } as const
    const first = createMap(opts)
    const second = createMap(opts)
    expect(first.points).toEqual(second.points)
  })

  it('invalidates cache when options change', () => {
    const a = createMap({ width: 150, height: 75, mapSamples: 2000 })
    const b = createMap({ width: 150, height: 75, mapSamples: 3000 })
    expect(a.points.length).not.toBe(b.points.length)
  })

  it('invalidates cache when countries change', () => {
    const a = createMap({ width: 200, height: 100, countries: ['USA'] })
    const b = createMap({ width: 200, height: 100, countries: ['CAN'] })
    // Different country = different points
    expect(a.points).not.toEqual(b.points)
  })
})

describe('getMapPoints', () => {
  it('returns Float64Array for points', () => {
    const result = getMapPoints({
      width: 100,
      height: 50,
      rows: 20,
      columns: 40,
    })
    expect(result.points).toBeInstanceOf(Float64Array)
  })

  it('returns numeric projection bounds', () => {
    const result = getMapPoints({
      width: 100,
      height: 50,
      rows: 20,
      columns: 40,
    })
    expect(typeof result.X_MIN).toBe('number')
    expect(typeof result.Y_MAX).toBe('number')
    expect(typeof result.X_RANGE).toBe('number')
    expect(typeof result.Y_RANGE).toBe('number')
    expect(result.X_RANGE).toBeGreaterThan(0)
    expect(result.Y_RANGE).toBeGreaterThan(0)
  })

  it('points Float64Array has even length (x/y pairs)', () => {
    const result = getMapPoints({
      width: 100,
      height: 50,
      rows: 20,
      columns: 40,
    })
    expect(result.points.length % 2).toBe(0)
  })
})

describe('DEFAULT_WORLD_REGION', () => {
  it('has valid latitude bounds', () => {
    expect(DEFAULT_WORLD_REGION.lat.min).toBeLessThan(
      DEFAULT_WORLD_REGION.lat.max,
    )
    expect(DEFAULT_WORLD_REGION.lat.min).toBeGreaterThanOrEqual(-90)
    expect(DEFAULT_WORLD_REGION.lat.max).toBeLessThanOrEqual(90)
  })

  it('has valid longitude bounds', () => {
    expect(DEFAULT_WORLD_REGION.lng.min).toBeLessThan(
      DEFAULT_WORLD_REGION.lng.max,
    )
    expect(DEFAULT_WORLD_REGION.lng.min).toBeGreaterThanOrEqual(-180)
    expect(DEFAULT_WORLD_REGION.lng.max).toBeLessThanOrEqual(180)
  })
})
