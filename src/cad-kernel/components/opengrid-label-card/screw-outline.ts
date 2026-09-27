/**
 * Side-view screw pictogram outlines on the shared 16-unit icon grid.
 * Pure math so both the gallery SVG paths and the extruded kernel geometry
 * derive from the same definition. The silhouette is one continuous contour
 * (head flows into the sawtooth shaft and tip), so it is safe under even-odd
 * fill and under direct polygon extrusion.
 */

export type ScrewPoint = [number, number]
export type ScrewOutline = readonly ScrewPoint[]

export type ScrewHeadStyle = 'pan' | 'hex'

const CENTER_Y = -3.4
const TOOTH_DEPTH = 1.6
const TOOTH_MIN_COUNT = 2
const TOOTH_PITCH = 1.8

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
): ScrewOutline {
  const points: ScrewPoint[] = []
  for (let index = 0; index <= segments; index += 1) {
    const angle = from + ((to - from) * index) / segments
    points.push([cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)])
  }
  return points
}

/**
 * Shaft base half width at the head junction and the head outline preceding
 * the shaft on the right side. Returns the full head traversal starting at the
 * head's bottom-most point and ending at the shaft's right base.
 */
function headOutline(head: ScrewHeadStyle): {
  start: ScrewOutline
  shaftHalf: number
  baseY: number
} {
  if (head === 'pan') {
    const arc = circleArc(
      0,
      CENTER_Y,
      PAN.radius,
      0,
      Math.asin(PAN.shaftHalf / PAN.radius),
      14,
    )
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
 * shaft rising with the given ratio (0..1), flat tip. One closed contour.
 */
export function screwOutlinePolygon16(
  head: ScrewHeadStyle,
  shaftRatio: number,
): ScrewOutline {
  const { start, shaftHalf, baseY } = headOutline(head)
  const ratio = Math.min(1, Math.max(0, shaftRatio))
  const span =
    head === 'pan'
      ? PAN.base + PAN.perRatio * ratio
      : HEX.base + HEX.perRatio * ratio
  const tip = baseY + span
  let teeth = Math.max(TOOTH_MIN_COUNT, Math.round(span / TOOTH_PITCH))
  if (teeth % 2 !== 0) teeth += 1
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
  // The final head point (bottom-most) closes the contour implicitly; keep the
  // polygon open per the shared PathPolygon/extrusion convention.
  return points
}

/** SVG path `d` string for the gallery, matching the extruded geometry. */
export function screwOutlineSvgPath(
  head: ScrewHeadStyle,
  shaftRatio: number,
): string {
  const polygon = screwOutlinePolygon16(head, shaftRatio)
  return (
    polygon
      .map(
        ([x, y], index) =>
          `${index === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`,
      )
      .join(' ') + ' Z'
  )
}
