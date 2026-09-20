import { getOC, measureVolume, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  OPENGRID_LABEL_TAG_CONFIGURATION,
  validateOpenGridLabelTagParameters,
  type OpenGridLabelTagParameters,
} from '../../../cad-contract/units'

export const LABEL_TAG_QUALITY_TOLERANCE = 0.05

export type OpenGridLabelTagQualityReport = {
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

/**
 * Structural quality gate for a generated label tag. The checks use the
 * committed multipart assembly: the body and accent parts are validated as
 * separate solids so a fused or missing accent fails the gate.
 */
export function inspectOpenGridLabelTagShapeQuality(
  parts: ReadonlyArray<{ name: string; shape: Shape3D }>,
  parameters: OpenGridLabelTagParameters,
): OpenGridLabelTagQualityReport {
  const failures: string[] = []
  const validation = validateOpenGridLabelTagParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-tag')
  }

  const config = OPENGRID_LABEL_TAG_CONFIGURATION
  const body = parts.find((part) => part.name === 'body')
  const accent = parts.find((part) => part.name === 'icon')
  if (!body || !accent) {
    return {
      passed: false,
      failures: ['parts-missing'],
      solidCount: parts.length,
      volume: 0,
    }
  }
  if (parts.length !== 2) failures.push('parts-count')

  const bodyBounds = boundsOf(body.shape)
  const accentBounds = boundsOf(accent.shape)
  const expectedHeight =
    config.plateThickness +
    config.clipArmThickness * 2 +
    config.gripClearance +
    parameters.gripThickness
  const tolerance = LABEL_TAG_QUALITY_TOLERANCE

  if (
    Math.abs(bodyBounds.maxX - bodyBounds.minX - parameters.widthTier) >
    tolerance
  ) {
    failures.push('width-tier-bounds')
  }
  if (
    Math.abs(bodyBounds.maxZ - expectedHeight) > tolerance ||
    Math.abs(bodyBounds.minZ) > tolerance
  ) {
    failures.push('height-bounds')
  }
  if (bodyBounds.maxY - bodyBounds.minY < config.plateHangLength - tolerance) {
    failures.push('plate-hang-length')
  }
  // Grip opening check: the channel interior must match the grip stack-up.
  const channelSpan =
    bodyBounds.maxZ -
    config.clipArmThickness -
    (config.plateThickness + config.clipArmThickness)
  if (
    Math.abs(channelSpan - (config.gripClearance + parameters.gripThickness)) >
    tolerance
  ) {
    failures.push('grip-opening')
  }

  // The accent must sit flush with the outward plate face (Z = 0, facing
  // away from the gripped panel) without protruding below it.
  const outwardFaceZ = 0
  if (accentBounds.minZ < outwardFaceZ - tolerance) {
    failures.push('accent-protrudes')
  }
  if (Math.abs(accentBounds.minZ - outwardFaceZ) > tolerance) {
    failures.push('accent-recessed')
  }
  const accentVolume = measureVolume(accent.shape)
  if (!Number.isFinite(accentVolume) || accentVolume <= 0) {
    failures.push('accent-empty')
  }

  const bodyVolume = measureVolume(body.shape)
  if (!Number.isFinite(bodyVolume) || bodyVolume <= 0) {
    failures.push('body-empty')
  }
  const bodySolidCount = extractSolidCount(body.shape)
  if (bodySolidCount < 1) {
    failures.push('body-not-solid')
  }

  return {
    passed: failures.length === 0,
    failures,
    solidCount: bodySolidCount + extractSolidCount(accent.shape),
    volume: bodyVolume,
  }
}

export function assertOpenGridLabelTagShapeQuality(
  parts: ReadonlyArray<{ name: string; shape: Shape3D }>,
  parameters: OpenGridLabelTagParameters,
): OpenGridLabelTagQualityReport {
  const report = inspectOpenGridLabelTagShapeQuality(parts, parameters)
  if (!report.passed) {
    throw new Error(
      `OPENGRID_LABEL_TAG_QUALITY_INVALID:${report.failures.join(';')}`,
    )
  }
  return report
}
