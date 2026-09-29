import type { PathPolygon } from './svg-path'

/**
 * Side-view screw pictogram outlines on the shared 16-unit icon grid,
 * centered on the icon origin so every head style scales consistently.
 * Pure math so both the gallery SVG paths and the extruded kernel geometry
 * derive from the same definition. The silhouette is one continuous contour
 * (head flowing into a smooth solid shaft with a flat tip), so it is safe
 * under even-odd fill and under direct polygon extrusion.
 */

export type ScrewPoint = [number, number]
export type ScrewOutline = readonly ScrewPoint[]

export type ScrewHeadStyle = 'pan' | 'hex'

const PAN = {
  radius: 2.3,
  shaftHalf: 1,
} as const

const HEX = {
  circumradius: 2.6,
  shaftHalf: 1.2,
} as const

function circleArc(
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number,
  segments: number,
): ScrewPoint[] {
  const points: ScrewPoint[] = []
  for (let index = 0; index <= segments; index += 1) {
    const angle = from + ((to - from) * index) / segments
    points.push([cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)])
  }
  return points
}

/**
 * Head traversal starting at the shaft's top join point, wrapping the head's
 * left side, and ending at the shaft's bottom join point. The pan dome sweeps
 * the circle arc between the tangent joins; the hexagon lists the vertices
 * between the joins where the shaft meets its upper-right edge.
 */
function headOutline(head: ScrewHeadStyle): {
  start: ScrewPoint[]
  shaftHalf: number
  joinX: number
} {
  if (head === 'pan') {
    const joinX = Math.sqrt(PAN.radius ** 2 - PAN.shaftHalf ** 2)
    const joinAngle = Math.asin(joinX / PAN.radius)
    const arc = circleArc(
      0,
      0,
      PAN.radius,
      Math.PI - joinAngle,
      Math.PI * 2 + joinAngle,
      14,
    )
    return { start: arc, shaftHalf: PAN.shaftHalf, joinX }
  }
  const r = HEX.circumradius
  const half = r / 2
  const halfHeight = (r * Math.sqrt(3)) / 2
  const joinX = half * (2 - HEX.shaftHalf / halfHeight)
  return {
    start: [
      [joinX, HEX.shaftHalf],
      [half, halfHeight],
      [-half, halfHeight],
      [-r, 0],
      [-half, -halfHeight],
      [half, -halfHeight],
      [joinX, -HEX.shaftHalf],
    ],
    shaftHalf: HEX.shaftHalf,
    joinX,
  }
}

/**
 * Full screw silhouette on the 16-unit grid: head on the left and a smooth
 * solid shaft extending to the right for the given length in grid units
 * measured from the head's join edge, flat tip, bounding box centered on the
 * icon origin. One closed contour; the closing edge is the shaft's top side.
 */
export function screwOutlinePolygon16(
  head: ScrewHeadStyle,
  shaftLength: number,
): PathPolygon {
  const { start, shaftHalf, joinX } = headOutline(head)
  const tipX = joinX + Math.max(0, shaftLength)

  const points: ScrewPoint[] = [...start]
  points.push([tipX, -shaftHalf])
  points.push([tipX, shaftHalf])

  // Center the silhouette on the icon origin like every static icon.
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const offsetX = (minX + maxX) / 2
  const offsetY = (minY + maxY) / 2
  return points.map(([x, y]) => [x - offsetX, y - offsetY] as ScrewPoint)
}

/**
 * SVG path `d` string for the gallery. Gallery SVGs use a y-down 0..16
 * viewBox while the outline is y-up centered, so flip y and shift it into
 * the viewBox.
 */
export function screwOutlineSvgPath(
  head: ScrewHeadStyle,
  shaftLength: number,
): string {
  const polygon = screwOutlinePolygon16(head, shaftLength)
  return (
    polygon
      .map(
        ([x, y], index) =>
          `${index === 0 ? 'M' : 'L'}${(x + 8).toFixed(3)} ${(8 - y).toFixed(
            3,
          )}`,
      )
      .join(' ') + ' Z'
  )
}
