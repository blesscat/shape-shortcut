import { getOC, makeBox, measureVolume, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  OPENGRID_LABEL_HOLDER_CONFIGURATION,
  openGridLabelHolderDepthFor,
  openGridLabelHolderHeightFor,
  validateOpenGridLabelHolderParameters,
  type OpenGridLabelHolderParameters,
} from '../../../cad-contract/units'

export const LABEL_HOLDER_QUALITY_TOLERANCE = 0.05

export type OpenGridLabelHolderQualityReport = {
  passed: boolean
  failures: string[]
  solidCount: number
  volume: number
}

function boundsOf(shape: Shape3D): {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
} {
  const bounds = shape.boundingBox
  try {
    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = bounds.bounds as number[][]
    return {
      minX: minX!,
      minY: minY!,
      minZ: minZ!,
      maxX: maxX!,
      maxY: maxY!,
      maxZ: maxZ!,
    }
  } finally {
    bounds.delete()
  }
}

function extractSolidCount(shape: Shape3D): number {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  let count = 0
  try {
    while (explorer.More()) {
      new Solid(oc.TopoDS.Solid_1(explorer.Current())).delete()
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

export function inspectOpenGridLabelHolderShapeQuality(
  shape: Shape3D,
  parameters: OpenGridLabelHolderParameters,
): OpenGridLabelHolderQualityReport {
  const failures: string[] = []
  const validation = validateOpenGridLabelHolderParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-holder')
  }

  const config = OPENGRID_LABEL_HOLDER_CONFIGURATION
  const tolerance = LABEL_HOLDER_QUALITY_TOLERANCE
  const bounds = boundsOf(shape)
  const expectedHeight = openGridLabelHolderHeightFor(parameters.gripThickness)
  const expectedDepth = openGridLabelHolderDepthFor()
  const expectedHalfWidth = parameters.widthTier / 2 + config.pocketFrameWidth

  if (Math.abs(bounds.maxX - bounds.minX - expectedHalfWidth * 2) > tolerance) {
    failures.push('width-bounds')
  }
  if (
    Math.abs(bounds.minZ) > tolerance ||
    Math.abs(bounds.maxZ - expectedHeight) > tolerance
  ) {
    failures.push('height-bounds')
  }
  if (Math.abs(bounds.maxY - bounds.minY - expectedDepth) > tolerance) {
    failures.push('depth-bounds')
  }

  const volume = measureVolume(shape)
  if (!Number.isFinite(volume) || volume <= 0) {
    failures.push('body-empty')
  }
  const solidCount = extractSolidCount(shape)
  if (solidCount !== 1) {
    failures.push('not-single-solid')
  }

  // Pocket hollowness: the card seat region must be empty so the card can
  // seat; measured by intersecting the holder with the pocket interior box.
  // All probes use post-shift coordinates: the builder centers Y with a -2
  // shift, so the pocket spans Y ∈ [-2, 8] and the detents sit at Y ≈ 6.5.
  const pocketHalfWidth = parameters.widthTier / 2 + config.pocketWallClearance
  const pocketBottom = config.baseThickness - config.pocketDepth
  const detentPostYCenter = 10 - 1.5 - 2
  const pocketProbe = makeBox(
    [-pocketHalfWidth + 0.05, -2 + 0.05, pocketBottom + 0.05],
    [
      pocketHalfWidth - 0.05,
      detentPostYCenter - config.detentLength / 2 - 0.05,
      config.baseThickness - 0.05,
    ],
  )
  let pocketIntersection: Shape3D | null = null
  try {
    pocketIntersection = shape.intersect(pocketProbe)
    const occupied = measureVolume(pocketIntersection)
    if (occupied > tolerance) {
      failures.push('pocket-occupied')
    }
  } finally {
    if (pocketIntersection && pocketIntersection !== pocketProbe) {
      pocketIntersection.delete()
    }
    pocketProbe.delete()
  }

  // Detent presence and symmetry: each detent nub must protrude into the
  // pocket near the mouth; probe Z is confined to the pocket depth so the
  // probe cannot touch the solid base slab, and the two sides' engagement
  // volumes must match within tolerance.
  const detentZCenter = pocketBottom + config.pocketDepth / 2
  const detentZHalf = config.pocketDepth / 2 - 0.05
  const detentVolumes: number[] = []
  for (const side of [1, -1] as const) {
    const innerX = pocketHalfWidth - config.detentProtrusion - 0.02
    const outerX = pocketHalfWidth - 0.05
    const probe = makeBox(
      [
        Math.min(side * innerX, side * outerX),
        detentPostYCenter - config.detentLength / 2 + 0.05,
        detentZCenter - detentZHalf,
      ],
      [
        Math.max(side * innerX, side * outerX),
        detentPostYCenter + config.detentLength / 2 - 0.05,
        detentZCenter + detentZHalf,
      ],
    )
    let intersection: Shape3D | null = null
    try {
      intersection = shape.intersect(probe)
      const occupied = measureVolume(intersection)
      if (occupied <= 0) {
        failures.push(
          side === 1 ? 'detent-missing-positive' : 'detent-missing-negative',
        )
      }
      detentVolumes.push(occupied)
    } finally {
      if (intersection && intersection !== probe) intersection.delete()
      probe.delete()
    }
  }
  if (
    detentVolumes.length === 2 &&
    Math.abs(detentVolumes[0]! - detentVolumes[1]!) > tolerance
  ) {
    failures.push('detent-asymmetric')
  }

  return {
    passed: failures.length === 0,
    failures,
    solidCount,
    volume,
  }
}

export function assertOpenGridLabelHolderShapeQuality(
  shape: Shape3D,
  parameters: OpenGridLabelHolderParameters,
): OpenGridLabelHolderQualityReport {
  const report = inspectOpenGridLabelHolderShapeQuality(shape, parameters)
  if (!report.passed) {
    throw new Error(
      `OPENGRID_LABEL_HOLDER_QUALITY_INVALID:${report.failures.join(';')}`,
    )
  }
  return report
}
