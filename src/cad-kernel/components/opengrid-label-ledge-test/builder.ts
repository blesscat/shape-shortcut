import { makeBox, type Shape3D } from 'replicad'
import {
  boundsForOpenGridLabelLedgeTest,
  OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION,
  openGridLabelLedgeTestLayoutFor,
  type OpenGridLabelLedgeTestParameters,
} from '../../../cad-contract/units/opengrid-label-ledge-test'
import { OPENGRID_LABEL_LEDGE } from '../../../cad-contract/units/opengrid-label-ledge'
import { inspectSolidIntegrity } from '../opengrid-label-ledge/integrity'
import {
  buildOpenGridLabelLedge,
  inspectOpenGridLabelLedge,
} from '../opengrid-label-ledge/builder'

function placeAtRim(probe: Shape3D, rimZ: number): Shape3D {
  return probe.translate(0, 0, rimZ)
}

export function assertOpenGridLabelLedgeTestQuality(
  shape: Shape3D,
  parameters: OpenGridLabelLedgeTestParameters,
): void {
  const { ledge, rimZ } = openGridLabelLedgeTestLayoutFor(parameters)
  const failures = inspectOpenGridLabelLedge(shape, ledge, (probe) =>
    placeAtRim(probe, rimZ),
  )
  const expected = boundsForOpenGridLabelLedgeTest(parameters)
  const box = shape.boundingBox
  try {
    for (let axis = 0; axis < 3; axis++) {
      if (
        Math.abs(box.bounds[0][axis]! - expected.min[axis]!) > 0.05 ||
        Math.abs(box.bounds[1][axis]! - expected.max[axis]!) > 0.05
      )
        failures.push('bounds')
    }
  } finally {
    box.delete()
  }
  failures.push(...inspectSolidIntegrity(shape))
  if (failures.length)
    throw new Error(
      `OPENGRID_LABEL_LEDGE_TEST_QUALITY_INVALID:${failures.join(';')}`,
    )
}

export async function buildOpenGridLabelLedgeTest(
  parameters: OpenGridLabelLedgeTestParameters,
  context: { isGenerationCurrent?: () => boolean } = {},
): Promise<Shape3D> {
  if (context.isGenerationCurrent && !context.isGenerationCurrent())
    throw new Error('STALE_GENERATION')
  const { ledge, rimZ, halfWidth } = openGridLabelLedgeTestLayoutFor(parameters)
  const config = OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION
  const wallFrameLedge = buildOpenGridLabelLedge(ledge)
  const placedLedge = wallFrameLedge.translate(0, 0, rimZ)
  const stub = makeBox(
    [-halfWidth, -config.backThickness, 0],
    [halfWidth, 0, rimZ],
  )
  const base = makeBox(
    [-halfWidth, -config.backThickness, 0],
    [halfWidth, OPENGRID_LABEL_LEDGE.reach, config.baseThickness],
  )
  try {
    const backed = stub.fuse(base)
    try {
      return backed.fuse(placedLedge)
    } finally {
      backed.delete()
    }
  } finally {
    placedLedge.delete()
    stub.delete()
    base.delete()
  }
}
