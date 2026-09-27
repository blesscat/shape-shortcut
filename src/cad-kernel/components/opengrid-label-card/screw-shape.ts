import type { Shape3D } from 'replicad'
import { extrudeContourGroup } from './icon-shape'
import type { PathPolygon } from './svg-path'
import { screwOutlinePolygon16, type ScrewHeadStyle } from './screw-outline'

/** Shaft-length ratio range mapped from the `M<dia>x<len>` designation. */
export const OPENGRID_LABEL_SCREW_SHAFT_RATIO = {
  min: 0.35,
  max: 1,
  fallback: 0.65,
  lengthMin: 4,
  lengthMax: 30,
} as const

/**
 * Parses the first `M<dia>[x<len>]` screw designation out of a text row and
 * maps its length to a shaft ratio. Text without a designation or without a
 * length falls back to the medium ratio.
 */
export function parseOpenGridLabelScrewShaftRatio(
  text: string | undefined,
): number {
  if (!text) return OPENGRID_LABEL_SCREW_SHAFT_RATIO.fallback
  const match = /M\s*(\d+)(?:\s*[x×]\s*(\d+))?/i.exec(text)
  const length = match?.[2] ? Number(match[2]) : undefined
  if (length === undefined || !Number.isFinite(length) || length <= 0)
    return OPENGRID_LABEL_SCREW_SHAFT_RATIO.fallback
  const clamped = Math.min(
    OPENGRID_LABEL_SCREW_SHAFT_RATIO.lengthMax,
    Math.max(OPENGRID_LABEL_SCREW_SHAFT_RATIO.lengthMin, length),
  )
  const span =
    OPENGRID_LABEL_SCREW_SHAFT_RATIO.lengthMax -
    OPENGRID_LABEL_SCREW_SHAFT_RATIO.lengthMin
  return Number(
    (
      OPENGRID_LABEL_SCREW_SHAFT_RATIO.min +
      ((clamped - OPENGRID_LABEL_SCREW_SHAFT_RATIO.lengthMin) / span) *
        (OPENGRID_LABEL_SCREW_SHAFT_RATIO.max -
          OPENGRID_LABEL_SCREW_SHAFT_RATIO.min)
    ).toFixed(4),
  )
}

function isScrewHead(value: string): value is ScrewHeadStyle {
  return value === 'pan' || value === 'hex'
}

/**
 * Extrudes the parametric side-view screw silhouette scaled to the icon size
 * box. The outline is one closed contour, so the accent stays a single solid.
 */
export function makeOpenGridLabelScrewShape(options: {
  iconId: string
  shaftRatio: number
  size: number
  depth: number
}): Shape3D {
  const head: ScrewHeadStyle = options.iconId === 'screw-hex' ? 'hex' : 'pan'
  const polygon: PathPolygon = screwOutlinePolygon16(
    head,
    options.shaftRatio,
  ).map(([x, y]) => [
    Number(((x * options.size) / 16).toFixed(4)),
    Number(((y * options.size) / 16).toFixed(4)),
  ])
  return extrudeContourGroup(polygon, [], options.depth)
}
