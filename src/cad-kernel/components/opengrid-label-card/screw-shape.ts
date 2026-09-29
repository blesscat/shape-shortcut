import type { Shape3D } from 'replicad'
import { extrudeContourGroup } from './icon-shape'
import type { PathPolygon } from './svg-path'
import { screwOutlinePolygon16, type ScrewHeadStyle } from './screw-outline'

/** Shaft-length mapping from the `M<dia>x<len>` designation to grid units. */
export const OPENGRID_LABEL_SCREW_SHAFT = {
  perMillimetre: 0.375,
  stub: 1.2,
  lengthMin: 4,
  lengthMax: 30,
} as const

/**
 * Maps a screw length in millimetres to the shaft length in 16-unit grid
 * units measured from the head's join edge, clamped to the documented
 * 4–30 mm range.
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

/**
 * Extrudes the parametric side-view screw silhouette scaled to the icon size
 * box. The outline is one closed contour, so the accent stays a single solid.
 */
export function makeOpenGridLabelScrewShape(options: {
  iconId: string
  shaftLength: number
  size: number
  depth: number
}): Shape3D {
  const head: ScrewHeadStyle = options.iconId === 'screw-hex' ? 'hex' : 'pan'
  const polygon: PathPolygon = screwOutlinePolygon16(
    head,
    options.shaftLength,
  ).map(([x, y]) => [
    Number(((x * options.size) / 16).toFixed(4)),
    Number(((y * options.size) / 16).toFixed(4)),
  ])
  return extrudeContourGroup(polygon, [], options.depth)
}
