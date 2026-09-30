import { makeCompound, type Shape3D } from 'replicad'
import { extrudeContourGroup } from './icon-shape'
import { groupPolygonContours, type PathPolygon } from './svg-path'
import { screwOutlineContours16 } from './screw-outline'

/** Shaft-length mapping from the `M<dia>x<len>` designation to grid units. */
export const OPENGRID_LABEL_SCREW_SHAFT = {
  perMillimetre: 0.29,
  stub: 1.2,
  lengthMin: 2,
  lengthMax: 30,
} as const

/**
 * Maps a screw length in millimetres to the shaft length in 16-unit grid
 * units measured from the shaft start, clamped to the 2–30 mm range so short
 * designations keep their true proportion inside the grid budget.
 */
export function shaftUnitsForOpenGridLabelScrewLength(length: number): number {
  const clamped = Math.min(
    OPENGRID_LABEL_SCREW_SHAFT.lengthMax,
    Math.max(OPENGRID_LABEL_SCREW_SHAFT.lengthMin, length),
  )
  return Number((clamped * OPENGRID_LABEL_SCREW_SHAFT.perMillimetre).toFixed(4))
}

/**
 * Parses the first `M<dia>[x<len>]` screw designation out of a text row and
 * maps its length to a shaft length. Text without a designation or without a
 * length falls back to the stub shaft.
 */
export function parseOpenGridLabelScrewShaftUnits(
  text: string | undefined,
): number {
  if (!text) return OPENGRID_LABEL_SCREW_SHAFT.stub
  const match = /M\s*(\d+)(?:\s*[x×]\s*(\d+))?/i.exec(text)
  const length = match?.[2] ? Number(match[2]) : undefined
  if (length === undefined || !Number.isFinite(length) || length <= 0)
    return OPENGRID_LABEL_SCREW_SHAFT.stub
  return shaftUnitsForOpenGridLabelScrewLength(length)
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not hide the primary geometry error.
  }
}

/**
 * Extrudes the parametric screw pictogram (ring, shaft, head block) scaled to
 * the icon size box. Contours are even-odd grouped so the ring hole is cut
 * and the disjoint solids fuse into one accent compound.
 */
export function makeOpenGridLabelScrewShape(options: {
  iconId: string
  shaftLength: number
  size: number
  depth: number
}): Shape3D {
  const scale = options.size / 16
  const contours: PathPolygon[] = screwOutlineContours16(
    options.shaftLength,
  ).map((contour) =>
    contour.map(([x, y]) => [
      Number((x * scale).toFixed(4)),
      Number((y * scale).toFixed(4)),
    ]),
  )

  const pieces: Shape3D[] = []
  try {
    for (const [outer, ...holes] of groupPolygonContours(contours)) {
      if (!outer) continue
      pieces.push(extrudeContourGroup(outer, holes, options.depth))
    }
    if (pieces.length === 0) throw new Error('LABEL_CARD_SCREW_EMPTY')
    if (pieces.length === 1) {
      const single = pieces[0]!
      pieces.length = 0
      return single
    }
    const compound = makeCompound(pieces).asShape3D()
    pieces.length = 0
    return compound
  } catch (error) {
    for (const piece of pieces) deleteShape(piece)
    pieces.length = 0
    throw error
  }
}
