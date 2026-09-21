import { getOC, measureVolume, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  OPENGRID_LABEL_CARD_CONFIGURATION,
  validateOpenGridLabelCardParameters,
  type OpenGridLabelCardParameters,
} from '../../../cad-contract/units'

export const LABEL_CARD_QUALITY_TOLERANCE = 0.05

export type OpenGridLabelCardQualityReport = {
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

export function inspectOpenGridLabelCardShapeQuality(
  parts: ReadonlyArray<{ name: string; shape: Shape3D }>,
  parameters: OpenGridLabelCardParameters,
): OpenGridLabelCardQualityReport {
  const failures: string[] = []
  const validation = validateOpenGridLabelCardParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }

  const config = OPENGRID_LABEL_CARD_CONFIGURATION
  const body = parts.find((part) => part.name === 'body')
  const accent = parts.find((part) => part.name === 'accent')
  if (
    body &&
    !accent &&
    validation.value.icon === 'none' &&
    !validation.value.text
  ) {
    const bounds = boundsOf(body.shape)
    const volume = measureVolume(body.shape)
    const expectedVolume =
      openGridLabelWidthFor(validation.value.gridUnits) *
      config.cardHeight *
      config.plateThickness
    const passed =
      parts.length === 1 &&
      Math.abs(volume - expectedVolume) < LABEL_CARD_QUALITY_TOLERANCE &&
      Math.abs(bounds.maxZ - config.plateThickness) <
        LABEL_CARD_QUALITY_TOLERANCE
    return {
      passed,
      failures: passed ? [] : ['blank-card-invalid'],
      solidCount: extractSolidCount(body.shape),
      volume,
    }
  }
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
  const tolerance = LABEL_CARD_QUALITY_TOLERANCE
  const raised = parameters.style === 'raised'

  if (
    Math.abs(bodyBounds.maxX - bodyBounds.minX - parameters.widthTier) >
    tolerance
  ) {
    failures.push('width-tier-bounds')
  }
  // The body plate stays at the insertion thickness in both styles; the
  // raised total is enforced through the accent protrusion checks below.
  if (Math.abs(bodyBounds.maxZ - config.plateThickness) > tolerance) {
    failures.push('thickness-bounds')
  }
  if (
    Math.abs(bodyBounds.maxY - bodyBounds.minY - config.cardHeight) > tolerance
  ) {
    failures.push('card-height-bounds')
  }
  if (raised) {
    // Raised accent stacks on top: base at the plate face, top at total.
    if (accentBounds.minZ < config.plateThickness - tolerance) {
      failures.push('accent-protrudes')
    }
    if (
      Math.abs(
        accentBounds.maxZ - config.plateThickness - config.raisedHeight,
      ) > tolerance ||
      Math.abs(accentBounds.maxZ - accentBounds.minZ - config.raisedHeight) >
        tolerance
    ) {
      failures.push('accent-recessed')
    }
  } else {
    // Flush accent: visible face coplanar with the outward plate face.
    if (Math.abs(accentBounds.maxZ - config.plateThickness) > tolerance) {
      failures.push('accent-recessed')
    }
    if (accentBounds.minZ < 0 - tolerance) {
      failures.push('accent-protrudes')
    }
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

export function assertOpenGridLabelCardShapeQuality(
  parts: ReadonlyArray<{ name: string; shape: Shape3D }>,
  parameters: OpenGridLabelCardParameters,
): OpenGridLabelCardQualityReport {
  const report = inspectOpenGridLabelCardShapeQuality(parts, parameters)
  if (!report.passed) {
    throw new Error(
      `OPENGRID_LABEL_CARD_QUALITY_INVALID:${report.failures.join(';')}`,
    )
  }
  return report
}
