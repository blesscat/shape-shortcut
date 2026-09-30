import type { PathPolygon } from './svg-path'

/**
 * Side-view screw pictogram contours on the shared 16-unit icon grid,
 * centered on the icon origin so the glyph scales consistently: a small ring
 * on the left, one smooth solid rectangular shaft, and a fixed rectangular
 * head block at the shaft's far end (no thread teeth, no pointed corners).
 * Pure math so both the gallery SVG paths and the extruded kernel geometry
 * derive from the same definition. Contours are even-odd grouped downstream,
 * so the ring's inner circle becomes a hole and the shaft joins the head
 * block as one closed step contour.
 */

export type ScrewPoint = [number, number]

const RING = {
  centerX: 2,
  outerRadius: 2,
  innerRadius: 1,
} as const

const SHAFT = {
  startX: 4.3,
  halfHeight: 0.8,
} as const

const HEAD_BLOCK = {
  width: 3,
  halfHeight: 1.7,
} as const

function circlePolygon(
  cx: number,
  cy: number,
  radius: number,
  segments: number,
): ScrewPoint[] {
  const points: ScrewPoint[] = []
  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)])
  }
  return points
}

/**
 * Pictogram contours for the given shaft length in grid units measured from
 * the shaft start: the ring outer circle, the ring inner hole, and the
 * closed shaft+head-block step contour, with the combined bounding box
 * centered on the icon origin. The shaft length must stay positive so the
 * step contour keeps distinct vertices.
 */
export function screwOutlineContours16(shaftLength: number): PathPolygon[] {
  const blockLeft = SHAFT.startX + Math.max(0, shaftLength)
  const blockRight = blockLeft + HEAD_BLOCK.width

  const step: ScrewPoint[] = [
    [SHAFT.startX, -SHAFT.halfHeight],
    [blockLeft, -SHAFT.halfHeight],
    [blockLeft, -HEAD_BLOCK.halfHeight],
    [blockRight, -HEAD_BLOCK.halfHeight],
    [blockRight, HEAD_BLOCK.halfHeight],
    [blockLeft, HEAD_BLOCK.halfHeight],
    [blockLeft, SHAFT.halfHeight],
    [SHAFT.startX, SHAFT.halfHeight],
  ]
  const contours: ScrewPoint[][] = [
    circlePolygon(RING.centerX, 0, RING.outerRadius, 24),
    circlePolygon(RING.centerX, 0, RING.innerRadius, 20),
    step,
  ]

  // Center the pictogram on the icon origin like every static icon.
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const contour of contours) {
    for (const [x, y] of contour) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  const offsetX = (minX + maxX) / 2
  const offsetY = (minY + maxY) / 2
  return contours.map((contour) =>
    contour.map(([x, y]) => [x - offsetX, y - offsetY] as ScrewPoint),
  )
}

/**
 * SVG path `d` string for the gallery, one subpath per contour. Gallery SVGs
 * use a y-down 0..16 viewBox while the contours are y-up centered, so flip y
 * and shift into the viewBox; fill with even-odd so the ring hole stays open.
 */
export function screwOutlineSvgPath(shaftLength: number): string {
  return screwOutlineContours16(shaftLength)
    .map(
      (contour) =>
        contour
          .map(
            ([x, y], index) =>
              `${index === 0 ? 'M' : 'L'}${(x + 8).toFixed(3)} ${(
                8 - y
              ).toFixed(3)}`,
          )
          .join(' ') + ' Z',
    )
    .join(' ')
}
