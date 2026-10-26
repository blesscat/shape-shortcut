import { makeBox, type Shape3D } from 'replicad'
import {
  boundsForOpenGridStackableBox,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  openGridStackableBoxLabelPlacementFor,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import { openGridLabelLedgeLayoutFor } from '../../../cad-contract/units/opengrid-label-ledge'
import {
  buildOpenGridLabelLedge,
  inspectOpenGridLabelLedge,
} from '../opengrid-label-ledge/builder'
import { inspectSolidIntegrity } from '../opengrid-label-ledge/integrity'
import {
  assertGenerationCurrent,
  deleteShape,
  readBounds,
  type OpenGridStackableBoxBuildContext,
} from './shared'

const BOUNDS_TOLERANCE = 0.05

function layoutFor(parameters: OpenGridStackableBoxParameters) {
  return openGridLabelLedgeLayoutFor(
    parameters.labelGridUnits,
    parameters.labelSnapFit,
  )
}

/** Moves a wall-frame solid onto the selected box wall, consuming the input. */
function placeOnLabelWall(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): Shape3D {
  const placement = openGridStackableBoxLabelPlacementFor(parameters)
  return shape
    .rotate(placement.rotationDegrees, [0, 0, 0], [0, 0, 1])
    .translate(placement.origin[0], placement.origin[1], placement.rimZ)
}

/**
 * Fuses the label ledge to the selected wall. Honeycomb boxes also get the wall
 * band behind the ledge restored so the attachment stays solid.
 */
export function addLabelLedge(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  if (!parameters.labelSlotEnabled) return shape
  assertGenerationCurrent(context)
  const layout = layoutFor(parameters)
  const floorZ =
    parameters.bottomMode === 'none' ? undefined : -parameters.height
  const parts = [
    placeOnLabelWall(buildOpenGridLabelLedge(layout, floorZ), parameters),
  ]
  try {
    if (parameters.honeycombMode) {
      const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
      const bandBottom = Math.max(floorZ ?? -Infinity, layout.wallBottomZ)
      parts.push(
        placeOnLabelWall(
          makeBox(
            [-layout.outerHalfWidth, -configuration.wallThickness, bandBottom],
            [layout.outerHalfWidth, 0, -configuration.flatTopRimChamfer],
          ),
          parameters,
        ),
      )
    }
    let current = shape
    try {
      for (const part of parts) {
        assertGenerationCurrent(context)
        const fused = current.fuse(part)
        deleteShape(current)
        current = fused
      }
    } catch (error) {
      deleteShape(current)
      throw error
    }
    return current
  } finally {
    parts.forEach(deleteShape)
  }
}

/** Throws when the ledge is missing, obstructed, or breaks the single valid solid. */
export function assertOpenGridStackableBoxLabelLedge(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): void {
  if (!parameters.labelSlotEnabled) return
  const failures = inspectOpenGridLabelLedge(
    shape,
    layoutFor(parameters),
    (probe) => placeOnLabelWall(probe, parameters),
  )
  const [min, max] = readBounds(shape)
  const expected = boundsForOpenGridStackableBox(parameters)
  for (let axis = 0; axis < 3; axis++) {
    if (
      Math.abs(min[axis]! - expected.min[axis]!) > BOUNDS_TOLERANCE ||
      Math.abs(max[axis]! - expected.max[axis]!) > BOUNDS_TOLERANCE
    )
      failures.push('label-ledge-bounds')
  }
  failures.push(...inspectSolidIntegrity(shape))
  if (failures.length)
    throw new Error(
      `OPENGRID_STACKABLE_BOX_LABEL_LEDGE_QUALITY_INVALID:${[...new Set(failures)].join(';')}`,
    )
}
