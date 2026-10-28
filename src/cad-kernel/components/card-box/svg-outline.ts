import { makeCompound, type Shape3D } from 'replicad'
import type { CardBoxSvgOutlineData } from '../../../cad-contract/units'
import { extrudeContourGroup } from '../opengrid-label-card/icon-shape'
import type { PathPolygon } from '../opengrid-label-card/svg-path'
import { deleteShape } from '../../lifetime/dispose'

export type CardBoxSvgScaledGroup = {
  outer: PathPolygon
  holes: readonly PathPolygon[]
}

export type CardBoxSvgScaledOutline = {
  groups: readonly CardBoxSvgScaledGroup[]
  width: number
  height: number
}

function toPathPolygon(
  points: readonly (readonly [number, number])[],
): PathPolygon {
  return points.map((point) => [point[0], point[1]] as [number, number])
}

/**
 * Scales an outline to `targetWidth` keeping aspect and flips Y (SVG Y-down →
 * CAD Y-up), translating the result so its bounding box is centered on the
 * origin — matching how text solids are produced.
 */
export function scaleCardBoxSvgOutline(
  data: CardBoxSvgOutlineData,
  targetWidth: number,
): CardBoxSvgScaledOutline {
  if (!(data.width > 0) || !(data.height > 0)) {
    throw new Error('CARD_BOX_SVG_NO_GEOMETRY')
  }
  const scale = targetWidth / data.width
  const flip = (points: readonly (readonly [number, number])[]): PathPolygon =>
    toPathPolygon(points).map(
      ([x, y]) => [x * scale, (data.height - y) * scale] as [number, number],
    )
  const groups = data.groups.map((group) => ({
    outer: flip(group.outer),
    holes: group.holes.map((hole) => flip(hole)),
  }))
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const group of groups) {
    for (const [x, y] of group.outer) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const shifted = groups.map((group) => ({
    outer: group.outer.map(
      ([x, y]) => [x - midX, y - midY] as [number, number],
    ),
    holes: group.holes.map((hole) =>
      hole.map(([x, y]) => [x - midX, y - midY] as [number, number]),
    ),
  }))
  return {
    groups: shifted,
    width: targetWidth,
    height: data.height * scale,
  }
}

/**
 * Extrudes every outline group to `depth` and fuses them into one accent
 * solid centered nowhere in particular — the caller positions it. Returns
 * `null` when the outline has no groups.
 */
export function buildCardBoxSvgShape(
  data: CardBoxSvgOutlineData,
  targetWidth: number,
  depth: number,
): Shape3D | null {
  if (!data.groups.length) return null
  const scaled = scaleCardBoxSvgOutline(data, targetWidth)
  let result: Shape3D | null = null
  try {
    for (const group of scaled.groups) {
      const piece = extrudeContourGroup(group.outer, group.holes, depth)
      if (!result) {
        result = piece
        continue
      }
      const fused = result.fuse(piece)
      if (fused !== result) deleteShape(result)
      deleteShape(piece)
      result = fused
    }
    const finalShape = result
    result = null
    return finalShape
  } finally {
    deleteShape(result)
  }
}
