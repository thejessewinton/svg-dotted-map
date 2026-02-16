import type { MapPointsResult, Region } from './types'

interface CacheEntry {
  height: number
  width: number
  countries: string[] | undefined
  region: Region | undefined
  rows: number
  columns: number
  radius: number
  value: MapPointsResult
}

let cached: CacheEntry | null = null

const arraysEqual = (
  a: string[] | undefined,
  b: string[] | undefined,
): boolean => {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const regionsEqual = (
  a: Region | undefined,
  b: Region | undefined,
): boolean => {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.lat.min === b.lat.min &&
    a.lat.max === b.lat.max &&
    a.lng.min === b.lng.min &&
    a.lng.max === b.lng.max
  )
}

export const pointsCache = {
  get(
    height: number,
    width: number,
    countries: string[] | undefined,
    region: Region | undefined,
    rows: number,
    columns: number,
    radius: number,
  ): MapPointsResult | undefined {
    if (!cached) return undefined
    if (
      cached.height === height &&
      cached.width === width &&
      cached.rows === rows &&
      cached.columns === columns &&
      cached.radius === radius &&
      arraysEqual(cached.countries, countries) &&
      regionsEqual(cached.region, region)
    ) {
      return cached.value
    }
    return undefined
  },

  set(
    height: number,
    width: number,
    countries: string[] | undefined,
    region: Region | undefined,
    rows: number,
    columns: number,
    radius: number,
    value: MapPointsResult,
  ): void {
    cached = { height, width, countries, region, rows, columns, radius, value }
  },
}
