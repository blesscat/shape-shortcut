import type { PathPolygon } from './svg-path'

/**
 * Side-view screw pictogram outlines on the shared 16-unit icon grid,
 * centered on the icon origin so every head style scales consistently.
 * Pure math so both the gallery SVG paths and the extruded kernel geometry
 * derive from the same definition. The silhouette is one continuous contour
 * (head flows into the sawtooth shaft and tip), so it is safe under even-odd
 * fill and under direct polygon extrusion.
 */

export type ScrewPoint = [number, number]
export type ScrewOutline = readonly ScrewPoint[]

export type ScrewHeadStyle = 'pan' | 'hex'

const TOOTH_DEPTH = 1.6
const TOOTH_MIN_COUNT = 2
const TOOTH_MIN_PITCH = 1.5
const TOOTH_PITCH = 1.8

const CENTER_Y = -3.4

const PAN = {
  radius: 4.6,
  shaftHalf: 2.2,
  base: 1.6,
  perRatio: 5.1,
} as const

const HEX = {
  circumradius: 5.3,
  shaftHalf: 2.65,
  base: 1.3,
  perRatio: 4.8,
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
 * Head traversal starting at the head's bottom-most point and ending at the
 * shaft's right base. The pan dome is swept symmetrically so both sides of
 * the head are round.
 */
function headOutline(head: ScrewHeadStyle): {
  start: ScrewPoint[]
  shaftHalf: number
  baseY: number
} {
  if (head === 'pan') {
    const angle = Math.asin(PAN.shaftHalf / PAN.radius)
    const arc = circleArc(0, CENTER_Y, PAN.radius, -angle, Math.PI + angle, 14)
    return {
      start: arc,
      shaftHalf: PAN.shaftHalf,
      baseY: arc[arc.length - 1]![1]!,
    }
  }
  const r = HEX.circumradius
  const half = r / 2
  const top = CENTER_Y + (r * Math.sqrt(3)) / 2
  const bottom = CENTER_Y - (r * Math.sqrt(3)) / 2
  return {
    start: [
      [half, bottom],
      [r, CENTER_Y],
      [half, top],
    ],
    shaftHalf: half,
    baseY: top,
  }
}

/**
 * Full screw silhouette on the 16-unit grid: head at the bottom, sawtooth
 * shaft rising with the given ratio (0..1), flat tip, bounding box centered
 * on the icon origin. One closed contour.
 */
export function screwOutlinePolygon16(
  head: ScrewHeadStyle,
  shaftRatio: number,
): PathPolygon {
  const { start, shaftHalf, baseY } = headOutline(head)
  const ratio = Math.min(1, Math.max(0, shaftRatio))
  const span =
    head === 'pan'
      ? PAN.base + PAN.perRatio * ratio
      : HEX.base + HEX.perRatio * ratio
  const tip = baseY + span
  let teeth = Math.max(TOOTH_MIN_COUNT, Math.floor(span / TOOTH_PITCH))
  if (teeth % 2 !== 0) teeth += 1
  while (teeth > TOOTH_MIN_COUNT && span / teeth < TOOTH_MIN_PITCH) teeth -= 2
  const step = span / teeth

  const points: ScrewPoint[] = [...start]
  for (let k = 1; k <= teeth; k += 1) {
    const offset = k % 2 === 1 ? TOOTH_DEPTH : 0
    points.push([shaftHalf + offset, baseY + k * step])
  }
  points.push([-shaftHalf, tip])
  for (let k = teeth - 1; k >= 0; k -= 1) {
    const offset = k % 2 === 1 ? TOOTH_DEPTH : 0
    points.push([-(shaftHalf + offset), baseY + k * step])
  }
  if (head === 'hex') {
    points.push([-HEX.circumradius, CENTER_Y])
    points.push([
      -HEX.circumradius / 2,
      CENTER_Y - (HEX.circumradius * Math.sqrt(3)) / 2,
    ])
  }

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
  shaftRatio: number,
): string {
  const polygon = screwOutlinePolygon16(head, shaftRatio)
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
