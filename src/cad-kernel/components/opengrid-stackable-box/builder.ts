import { makeBox, makeCompound, type Shape3D } from 'replicad'
import {
  validateOpenGridStackableBoxParameters,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import {
  addMountingSockets,
  applyStackingProfile,
  addSideOpenings,
  makeBoxShell,
} from './geometry'
import {
  assertOpenGridStackableBoxGeometry,
  captureOpenGridStackableBoxHoneycombQualityBaseline,
  inspectOpenGridStackableBoxInterface,
} from './quality'
import {
  assertGenerationCurrent,
  deleteShape,
  type OpenGridStackableBoxBuildContext,
} from './shared'
import {
  estimateOpenGridStackableBoxHoneycombMemory,
  OPENGRID_HONEYCOMB_BOTTOM_PANEL_BATCH_SIZE,
  makeOpenGridStackableBoxBottomHoneycombPanel,
  makeOpenGridStackableBoxSideHoneycombPanel,
  makeOpenGridStackableBoxSideHoneycombPanelSlot,
  openGridStackableBoxHoneycombPanelCellCountFor,
  OPENGRID_HONEYCOMB_PANEL_BATCH_SIZE,
} from '../../lattice/opengrid-honeycomb'
import {
  measureBooleanCountInScope,
  measureBooleanInScope,
  type BooleanOperationScope,
} from '../../boolean-progress'

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
export { inspectOpenGridStackableBoxBottomStructure } from './quality-thin'
export type { OpenGridStackableBoxBottomStructureQualityReport } from './quality-thin'
export type { OpenGridStackableBoxOpeningQuality } from './quality-openings'
export type {
  OpenGridStackableBoxCaptiveSocketRecord,
  OpenGridStackableBoxInterfaceQualityReport,
  OpenGridStackableBoxMountingHoleProfile,
} from './quality'
export * from './snap-hold'

function normalizedParametersOrThrow(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxParameters {
  const validation = validateOpenGridStackableBoxParameters(parameters)
  if (!validation.valid) throw new Error('INVALID_INPUT')
  return validation.value
}

function assertHoneycombMemoryWithinBudget(
  parameters: OpenGridStackableBoxParameters,
): void {
  const estimate = estimateOpenGridStackableBoxHoneycombMemory(parameters)
  if (!parameters.honeycombMode || estimate.withinBudget) return
  throw new Error(
    `OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:${estimate.estimatedCells}`,
  )
}

export function buildOpenGridStackableBox(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext = {},
): Shape3D {
  const normalizedParameters = normalizedParametersOrThrow(parameters)
  assertGenerationCurrent(context)
  assertHoneycombMemoryWithinBudget(normalizedParameters)

  let shape: Shape3D | null = null
  let honeycombBaseline:
    | ReturnType<typeof captureOpenGridStackableBoxHoneycombQualityBaseline>
    | undefined
  try {
    shape = makeBoxShell(normalizedParameters, context.booleanOperations)
    assertGenerationCurrent(context)
    const deferDetachableCornerSeats =
      normalizedParameters.cornerSeatMode === 'detachable-corner-seat'
    if (normalizedParameters.honeycombMode) {
      shape = applyStackingProfile(shape, normalizedParameters, context)
      // Build every host interface before applying the lattice. The exact
      // bottom masks protect these features, and the solid host can therefore
      // receive the complete, bounded interface quality inspection before its
      // face count becomes too large for the wasm32 volume probes.
      shape = addMountingSockets(shape, normalizedParameters, context)
      shape = addSideOpenings(shape, normalizedParameters, context)
      honeycombBaseline = captureOpenGridStackableBoxHoneycombQualityBaseline(
        shape,
        normalizedParameters,
      )
      assertOpenGridStackableBoxGeometry(
        shape,
        { ...normalizedParameters, honeycombMode: false },
        context,
      )
      shape = applyHoneycombMode(shape, normalizedParameters, context)
    } else {
      shape = applyStackingProfile(shape, normalizedParameters, context)
      if (!deferDetachableCornerSeats) {
        shape = addMountingSockets(shape, normalizedParameters, context)
      }
      shape = addSideOpenings(shape, normalizedParameters, context)
      if (deferDetachableCornerSeats) {
        shape = addMountingSockets(shape, normalizedParameters, context)
      }
    }
    assertGenerationCurrent(context)
    assertOpenGridStackableBoxGeometry(
      shape,
      normalizedParameters,
      context,
      honeycombBaseline,
    )
    return shape
  } catch (error) {
    deleteShape(shape)
    throw error
  }
}

export async function buildOpenGridStackableBoxAsync(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext = {},
): Promise<Shape3D> {
  const normalizedParameters = normalizedParametersOrThrow(parameters)
  assertGenerationCurrent(context)
  assertHoneycombMemoryWithinBudget(normalizedParameters)

  let shape: Shape3D | null = null
  let honeycombBaseline:
    | ReturnType<typeof captureOpenGridStackableBoxHoneycombQualityBaseline>
    | undefined
  try {
    shape = makeBoxShell(normalizedParameters, context.booleanOperations)
    assertGenerationCurrent(context)
    const deferDetachableCornerSeats =
      normalizedParameters.cornerSeatMode === 'detachable-corner-seat'
    if (normalizedParameters.honeycombMode) {
      shape = applyStackingProfile(shape, normalizedParameters, context)
      shape = addMountingSockets(shape, normalizedParameters, context)
      shape = addSideOpenings(shape, normalizedParameters, context)
      honeycombBaseline = captureOpenGridStackableBoxHoneycombQualityBaseline(
        shape,
        normalizedParameters,
      )
      assertOpenGridStackableBoxGeometry(
        shape,
        { ...normalizedParameters, honeycombMode: false },
        context,
      )
      shape = await applyHoneycombModeAsync(
        shape,
        normalizedParameters,
        context,
      )
    } else {
      shape = applyStackingProfile(shape, normalizedParameters, context)
      if (!deferDetachableCornerSeats) {
        shape = addMountingSockets(shape, normalizedParameters, context)
      }
      shape = addSideOpenings(shape, normalizedParameters, context)
      if (deferDetachableCornerSeats) {
        shape = addMountingSockets(shape, normalizedParameters, context)
      }
    }
    assertGenerationCurrent(context)
    assertOpenGridStackableBoxGeometry(
      shape,
      normalizedParameters,
      context,
      honeycombBaseline,
    )
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

  const estimate = estimateOpenGridStackableBoxHoneycombMemory(parameters)
  if (!estimate.withinBudget) {
    deleteShape(shape)
    throw new Error(
      `OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:${estimate.estimatedCells}`,
    )
  }

  let current = shape
  const panelCutters: Shape3D[] = []
  let operation = 'bottom'
  const cellScope = context.booleanOperations?.createScope(
    openGridStackableBoxHoneycombPanelCellCountFor(parameters),
    { unit: 'cells' },
  )
  try {
    let batchCellCount = 0
    for (
      let batchStart = 0;
      ;
      batchStart += OPENGRID_HONEYCOMB_BOTTOM_PANEL_BATCH_SIZE
    ) {
      assertGenerationCurrent(context)
      operation = `bottom:${batchStart}`
      const bottom = makeOpenGridStackableBoxBottomHoneycombPanel(
        parameters,
        context,
        batchStart,
        OPENGRID_HONEYCOMB_BOTTOM_PANEL_BATCH_SIZE,
      )
      if (!bottom.panel || !bottom.slot) {
        deleteShape(bottom.panel)
        deleteShape(bottom.slot)
        break
      }
      panelCutters.push(
        makeHoneycombPanelCutter(bottom.panel, context, bottom.slot),
      )
      batchCellCount += bottom.cellCount
    }
    operation = 'bottom'
    current = cutHoneycombPanelGroup(
      current,
      panelCutters,
      batchCellCount,
      cellScope,
      context,
    )

    for (const side of ['+X', '-X', '+Y', '-Y'] as const) {
      panelCutters.length = 0
      batchCellCount = 0
      for (
        let batchStart = 0;
        ;
        batchStart += OPENGRID_HONEYCOMB_PANEL_BATCH_SIZE
      ) {
        assertGenerationCurrent(context)
        operation = `side:${side}:${batchStart}`
        const panel = makeOpenGridStackableBoxSideHoneycombPanel(
          parameters,
          side,
          context,
          batchStart,
        )
        const panelShape = panel.panel
        if (!panelShape) break
        panelCutters.push(
          makeHoneycombPanelCutter(panelShape, context, undefined, () =>
            makeOpenGridStackableBoxSideHoneycombPanelSlot(
              parameters,
              side,
              panelShape,
              context,
            ),
          ),
        )
        batchCellCount += panel.cellCount
      }
      operation = `side:${side}`
      current = cutHoneycombPanelGroup(
        current,
        panelCutters,
        batchCellCount,
        cellScope,
        context,
      )
    }
    return current
  } catch (error) {
    deleteShape(current)
    panelCutters.forEach(deleteShape)
    if (error instanceof Error && error.message === 'STALE_GENERATION') {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    if (message.startsWith('OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:')) {
      throw error
    }
    throw new Error(
      `OPENGRID_STACKABLE_BOX_HONEYCOMB_INVALID:${operation}:${message}`,
    )
  }
}

async function yieldAtHoneycombBatchBoundary(
  context: OpenGridStackableBoxBuildContext,
): Promise<void> {
  await context.yieldToEventLoop?.()
  assertGenerationCurrent(context)
}

async function applyHoneycombModeAsync(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Promise<Shape3D> {
  if (!parameters.honeycombMode) return shape
  assertGenerationCurrent(context)

  const estimate = estimateOpenGridStackableBoxHoneycombMemory(parameters)
  if (!estimate.withinBudget) {
    deleteShape(shape)
    throw new Error(
      `OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:${estimate.estimatedCells}`,
    )
  }

  let current = shape
  const panelCutters: Shape3D[] = []
  let operation = 'bottom'
  const cellScope = context.booleanOperations?.createScope(
    openGridStackableBoxHoneycombPanelCellCountFor(parameters),
    { unit: 'cells' },
  )
  try {
    await yieldAtHoneycombBatchBoundary(context)
    let batchCellCount = 0
    for (
      let batchStart = 0;
      ;
      batchStart += OPENGRID_HONEYCOMB_BOTTOM_PANEL_BATCH_SIZE
    ) {
      operation = `bottom:${batchStart}`
      const bottom = makeOpenGridStackableBoxBottomHoneycombPanel(
        parameters,
        context,
        batchStart,
        OPENGRID_HONEYCOMB_BOTTOM_PANEL_BATCH_SIZE,
      )
      if (!bottom.panel || !bottom.slot) {
        deleteShape(bottom.panel)
        deleteShape(bottom.slot)
        break
      }
      panelCutters.push(
        makeHoneycombPanelCutter(bottom.panel, context, bottom.slot),
      )
      batchCellCount += bottom.cellCount
      await yieldAtHoneycombBatchBoundary(context)
    }
    operation = 'bottom'
    current = cutHoneycombPanelGroup(
      current,
      panelCutters,
      batchCellCount,
      cellScope,
      context,
    )

    for (const side of ['+X', '-X', '+Y', '-Y'] as const) {
      panelCutters.length = 0
      batchCellCount = 0
      for (
        let batchStart = 0;
        ;
        batchStart += OPENGRID_HONEYCOMB_PANEL_BATCH_SIZE
      ) {
        operation = `side:${side}:${batchStart}`
        const panel = makeOpenGridStackableBoxSideHoneycombPanel(
          parameters,
          side,
          context,
          batchStart,
        )
        const panelShape = panel.panel
        if (!panelShape) break
        panelCutters.push(
          makeHoneycombPanelCutter(panelShape, context, undefined, () =>
            makeOpenGridStackableBoxSideHoneycombPanelSlot(
              parameters,
              side,
              panelShape,
              context,
            ),
          ),
        )
        batchCellCount += panel.cellCount
        await yieldAtHoneycombBatchBoundary(context)
      }
      operation = `side:${side}`
      current = cutHoneycombPanelGroup(
        current,
        panelCutters,
        batchCellCount,
        cellScope,
        context,
      )
      await yieldAtHoneycombBatchBoundary(context)
    }
    return current
  } catch (error) {
    deleteShape(current)
    panelCutters.forEach(deleteShape)
    if (error instanceof Error && error.message === 'STALE_GENERATION') {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    if (message.startsWith('OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:')) {
      throw error
    }
    throw new Error(
      `OPENGRID_STACKABLE_BOX_HONEYCOMB_INVALID:${operation}:${message}`,
    )
  }
}

function cutHoneycombPanelGroup(
  current: Shape3D,
  panelCutters: Shape3D[],
  cellCount: number,
  cellScope: BooleanOperationScope | undefined,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  if (panelCutters.length === 0) return current
  assertGenerationCurrent(context)
  let compound: Shape3D | null = null
  try {
    const cutter =
      panelCutters.length === 1
        ? panelCutters[0]!
        : (compound = makeCompound(panelCutters).asShape3D())
    const result = measureBooleanCountInScope(cellScope, 'cut', cellCount, () =>
      current.cut(cutter),
    )
    deleteShape(current)
    return result
  } finally {
    panelCutters.forEach(deleteShape)
    panelCutters.length = 0
    deleteShape(compound)
  }
}

function makeHoneycombPanelCutter(
  panel: Shape3D,
  context: OpenGridStackableBoxBuildContext,
  providedSlot?: Shape3D,
  slotFactory?: () => Shape3D,
): Shape3D {
  let slot: Shape3D | null = providedSlot ?? null
  let cutter: Shape3D | null = null
  try {
    slot ??= slotFactory?.() ?? makeHoneycombPanelSlot(panel)
    const activeSlot = slot
    cutter = measureBooleanInScope(
      context.booleanOperations?.createScope(1),
      'cut',
      // Bottom slots are clipped around protected seats and seams, so their
      // faces no longer coincide with the panel. The common-face shortcut can
      // return the entire slot, turning every retained floor rib into a cut.
      () => {
        if (providedSlot) return activeSlot.cut(panel)
        return activeSlot.cut(panel, { optimisation: 'commonFace' })
      },
    )
    return cutter
  } catch (error) {
    deleteShape(cutter)
    throw error
  } finally {
    deleteShape(slot)
    deleteShape(panel)
  }
}

function makeHoneycombPanelSlot(panel: Shape3D): Shape3D {
  const bounds = panel.boundingBox
  try {
    const [[minimumX, minimumY, minimumZ], [maximumX, maximumY, maximumZ]] =
      bounds.bounds as number[][]
    return makeBox(
      [minimumX, minimumY, minimumZ],
      [maximumX, maximumY, maximumZ],
    )
  } finally {
    bounds.delete()
  }
}
