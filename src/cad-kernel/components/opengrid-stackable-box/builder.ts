import { makeCompound, type Shape3D } from 'replicad'
import {
  validateOpenGridStackableBoxParameters,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import {
  addMountingSockets,
  applyBasePlateMode,
  applyStackingProfile,
  addSideOpenings,
  makeBoxShell,
} from './geometry'
import {
  assertOpenGridStackableBoxGeometry,
  inspectOpenGridStackableBoxInterface,
} from './quality'
import {
  assertGenerationCurrent,
  deleteShape,
  type OpenGridStackableBoxBuildContext,
} from './shared'
import {
  makeOpenGridStackableBoxProtectedBottomHoneycombCutters,
  makeOpenGridStackableBoxSideHoneycombCutters,
} from '../../lattice/opengrid-honeycomb'
import { measureBooleanInScope } from '../../boolean-progress'
import { toGeometryError } from '../../geometry-errors'

const HONEYCOMB_CUT_BATCH_SIZE = 128

export type { OpenGridStackableBoxBuildContext } from './shared'
export type { OpenGridStackableBoxBottomGridSeam } from './geometry'
export {
  assertOpenGridStackableBoxGeometry,
  inspectOpenGridStackableBoxInterface,
} from './quality'
export {
  assertOpenGridStackableBoxOpenings,
  inspectOpenGridStackableBoxOpenings,
} from './quality-openings'
export { inspectOpenGridStackableBoxThinShell } from './quality-thin'
export type { OpenGridStackableBoxThinShellQualityReport } from './quality-thin'
export type { OpenGridStackableBoxOpeningQuality } from './quality-openings'
export type {
  OpenGridStackableBoxCaptiveSocketRecord,
  OpenGridStackableBoxInterfaceQualityReport,
  OpenGridStackableBoxMountingHoleProfile,
} from './quality'
export * from './snap-hold'

export function buildOpenGridStackableBox(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext = {},
): Shape3D {
  const validation = validateOpenGridStackableBoxParameters(parameters)
  if (!validation.valid) throw new Error('INVALID_INPUT')
  const normalizedParameters = validation.value
  assertGenerationCurrent(context)

  let shape = makeBoxShell(normalizedParameters, context.booleanOperations)
  assertGenerationCurrent(context)
  shape = applyStackingProfile(shape, normalizedParameters, context)
  const deferDetachableCornerSeats =
    normalizedParameters.cornerSeatMode === 'detachable-corner-seat'
  if (
    normalizedParameters.basePlateMode &&
    normalizedParameters.cornerSeatMode !== 'detachable-corner-seat'
  ) {
    shape = applyBasePlateMode(
      shape,
      normalizedParameters,
      context.booleanOperations,
    )
    shape = addMountingSockets(shape, normalizedParameters, context)
  } else {
    if (!deferDetachableCornerSeats) {
      shape = addMountingSockets(shape, normalizedParameters, context)
    }
    shape = applyBasePlateMode(
      shape,
      normalizedParameters,
      context.booleanOperations,
    )
  }
  shape = addSideOpenings(shape, normalizedParameters, context)
  shape = applyHoneycombMode(shape, normalizedParameters, context)
  if (deferDetachableCornerSeats) {
    shape = addMountingSockets(shape, normalizedParameters, context)
  }
  try {
    assertGenerationCurrent(context)
    assertOpenGridStackableBoxGeometry(shape, normalizedParameters, context)
    return shape
  } catch (error) {
    deleteShape(shape)
    throw error
  }
}

function applyHoneycombMode(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  if (!parameters.honeycombMode) return shape
  assertGenerationCurrent(context)

  const cutPanel = (
    current: Shape3D,
    cutters: Shape3D[],
    batchSize = HONEYCOMB_CUT_BATCH_SIZE,
  ): Shape3D => {
    const batchCount = Math.ceil(cutters.length / batchSize)
    const scope = context.booleanOperations?.createScope(batchCount)
    let result = current
    try {
      while (cutters.length > 0) {
        assertGenerationCurrent(context)
        const batch = cutters.splice(0, batchSize)
        let cutter: Shape3D | null = null
        try {
          if (batch.length === 1) {
            cutter = batch[0] ?? null
          } else {
            cutter = makeCompound(batch).asShape3D()
          }
          if (!cutter) throw new Error('OPENGRID_HONEYCOMB_CUTTER_EMPTY')
          const activeCutter = cutter
          const cut = measureBooleanInScope(scope, 'cut', () =>
            result.cut(activeCutter),
          )
          deleteShape(result)
          result = cut
        } finally {
          batch.forEach(deleteShape)
          if (cutter !== batch[0]) deleteShape(cutter)
        }
      }
      return result
    } catch (error) {
      if (result !== current) deleteShape(result)
      throw error
    }
  }

  let sideCutters: Shape3D[] = []
  let bottomCutters: Shape3D[] = []
  try {
    sideCutters = makeOpenGridStackableBoxSideHoneycombCutters(
      parameters,
      context,
    )
    assertGenerationCurrent(context)
    shape = cutPanel(shape, sideCutters)
    sideCutters = []
    assertGenerationCurrent(context)
    bottomCutters = makeOpenGridStackableBoxProtectedBottomHoneycombCutters(
      parameters,
      context,
    )
    shape = cutPanel(shape, bottomCutters, 1)
    bottomCutters = []
    return shape
  } catch (error) {
    deleteShape(shape)
    if (error instanceof Error && error.message === 'STALE_GENERATION') {
      throw error
    }
    const message = toGeometryError(error).message
    throw new Error(`OPENGRID_STACKABLE_BOX_HONEYCOMB_INVALID:${message}`)
  } finally {
    sideCutters.forEach(deleteShape)
    bottomCutters.forEach(deleteShape)
  }
}
