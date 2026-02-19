import { pointsCache } from './cache'
import { getMapPoints, toWebMercator } from './helpers'
import type { CreateMapOptions, Marker, Point } from './types'

export const createMap = ({
  height,
  width,
  countries,
  region,
  radius = 0.3,
  mapSamples = 6000,
  grid = 'vertical',
}: CreateMapOptions) => {
  const aspect = width / height
  let rows = Math.round(Math.sqrt(mapSamples / aspect))
  if (grid === 'diagonal') {
    rows = Math.round(rows * (2 / Math.sqrt(3)))
  }
  const columns = Math.round(rows * aspect)

  let pointsData = pointsCache.get(
    height,
    width,
    countries,
    region,
    rows,
    columns,
    radius,
    grid,
  )

  if (!pointsData) {
    pointsData = getMapPoints({
      height,
      width,
      countries,
      region,
      rows,
      columns,
      radius,
      grid,
    })
    pointsCache.set(
      height,
      width,
      countries,
      region,
      rows,
      columns,
      radius,
      grid,
      pointsData,
    )
  }

  const { points: pts, X_MIN, Y_MAX, X_RANGE, Y_RANGE } = pointsData

  const margin = radius * 1.25
  const widthRange = width - 2 * margin
  const heightRange = height - 2 * margin

  const pointCount = pts.length >> 1
  const points: Point[] = new Array(pointCount)
  for (let i = 0; i < pointCount; i++) {
    points[i] = { x: pts[i * 2], y: pts[i * 2 + 1] }
  }

  return {
    points,
    addMarkers: <T extends Marker>(markers: T[]) => {
      return markers.map((marker) => {
        const { lat, lng, ...markerData } = marker
        const [googleX, googleY] = toWebMercator(lng, lat)

        const normalizedX = (googleX - X_MIN) / X_RANGE
        const normalizedY = (Y_MAX - googleY) / Y_RANGE

        const col = Math.round(normalizedX * (columns - 1))
        const row = Math.round(normalizedY * (rows - 1))

        const colScale = widthRange / (columns - 1)
        let localx = margin + col * colScale
        if (grid === 'diagonal' && row % 2 === 0) {
          localx += colScale / 2
        }
        const localy = margin + (row / (rows - 1)) * heightRange

        return { x: localx, y: localy, ...markerData } as Omit<
          T,
          'lat' | 'lng'
        > &
          Point
      })
    },
  }
}
