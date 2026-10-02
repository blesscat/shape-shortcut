import type { Shape3D } from 'replicad'
import type {
  OpenGridParameters,
  OpenGridScrewPosition,
  OpenGridVariant,
} from '../../../cad-contract/units'
import { isOpenGridLayeredVariant } from '../../../cad-contract/units'
import { openGridScrewPositionsFor, OPENGRID_CONFIGURATION } from './profile'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import { deleteShape } from '../../lifetime/dispose'
import { fuseBalanced } from './assembly'
import { buildHeavyBridge } from './bridges'
import { createBoardConnectorCutterGroups } from './connector-cutters'
import {
  chamferCutterGroups,
  combineCutterGroups,
  createBoardScrewCutterGroups,
  createChamferCutters,
  disposeCutter,
  type CutterGroup,
} from './cutters'
import { buildGridSurface } from './grid-surface'
import { buildHybridProductBase } from './hybrid'
import { buildPrototypeTemplateAssembly } from './prototype-template'
import { addTargetFrame } from './target-frame'
import { hasOpenGridHalfCell } from './tiles'

export { buildOpenGridCanonicalTile } from './tiles'
export {
  buildOpenGridPrototype,
  importOpenGridPrototypeTemplate,
  loadOpenGridPrototypeTemplate,
} from './prototype-template'
export {
  applyBatchedCuts,
  applyHeavyBridgeFeatures,
  assertGenerationCurrent,
  reportProgress,
  yieldAtSafeBoundary,
}
export type OpenGridBuildContext = {
  getOpenGridPrototype?: (variant: OpenGridVariant) => Promise<Shape3D>
  getOpenGridCanonicalTile?: (
    variant: OpenGridVariant,
    thickness: number,
    booleanOperations?: BooleanOperationReporter,
  ) => Promise<Shape3D>
  getOpenGridHalfCellPrototype?: (
    key: string,
    factory: () => Promise<Shape3D> | Shape3D,
  ) => Promise<Shape3D>
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  useCompoundChamferCutters?: boolean
  useCompoundScrewParts?: boolean
  fuseHalfCellExtensionsIntoAssembly?: boolean
  balancedFuseBatchSize?: number
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'cells' | 'batches'
  }) => void
  reportPhase?: (
    phase: 'assembly-fuse' | 'prototype-build',
    durationMs: number,
  ) => void
  booleanOperations?: BooleanOperationReporter
}

export type OpenGridAssemblyStrategy =
  'whole-profile' | 'row-block' | 'cell-balanced' | 'prototype-template'

export type OpenGridProductStrategy = 'cell-balanced'

export const OPENGRID_PRODUCT_STRATEGIES: Readonly<
  Record<OpenGridParameters['variant'], OpenGridProductStrategy>
> = {
  Full: 'cell-balanced',
  Lite: 'cell-balanced',
  Heavy: 'cell-balanced',
  Hybrid: 'cell-balanced',
}

export const OPENGRID_PROTOTYPE_TEMPLATE_URLS: Readonly<
  Record<OpenGridVariant, URL>
> = {
  Full: new URL('./opengrid-full-cell.step', import.meta.url),
  Lite: new URL('./opengrid-lite-cell.step', import.meta.url),
  Heavy: new URL('./opengrid-heavy-cell.step', import.meta.url),
  Hybrid: new URL('./opengrid-heavy-cell.step', import.meta.url),
}

function assertGenerationCurrent(context: OpenGridBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: OpenGridBuildContext,
): Promise<void> {
  assertGenerationCurrent(context)
  await context.yieldToEventLoop?.()
  assertGenerationCurrent(context)
}

function reportProgress(
  context: OpenGridBuildContext,
  completed: number,
  total: number,
): void {
  context.reportProgress?.({
    stage: 'building',
    completed,
    total,
    unit: 'cells',
  })
}

async function buildProductBase(
  parameters: OpenGridParameters,
  strategy: OpenGridAssemblyStrategy,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  if (
    strategy === 'prototype-template' &&
    parameters.variant === 'Hybrid' &&
    (parameters.rows > 1 || parameters.columns > 1)
  ) {
    throw new Error('OPENGRID_HYBRID_TEMPLATE_UNAVAILABLE')
  }
  if (strategy === 'prototype-template' && !hasOpenGridHalfCell(parameters)) {
    return buildPrototypeTemplateAssembly(parameters, context)
  }

  if (parameters.variant === 'Hybrid') {
    return buildHybridProductBase(parameters, strategy, context)
  }

  if (!isOpenGridLayeredVariant(parameters.variant)) {
    return buildGridSurface(
      parameters,
      parameters.variant,
      parameters.variant === 'Lite'
        ? OPENGRID_CONFIGURATION.variants.Lite.thickness
        : OPENGRID_CONFIGURATION.variants.Full.thickness,
      0,
      false,
      strategy,
      context,
    )
  }

  const layerThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  let lower = await buildGridSurface(
    parameters,
    'Heavy',
    layerThickness,
    0,
    true,
    strategy,
    context,
  )
  let upper = await buildGridSurface(
    parameters,
    'Heavy',
    layerThickness,
    layerThickness + OPENGRID_CONFIGURATION.heavyGap,
    false,
    strategy,
    context,
  )
  const bridge = await buildHeavyBridge(
    parameters,
    layerThickness,
    strategy,
    context,
  )
  let cutBridge: Shape3D | null = null
  try {
    cutBridge = await applyHeavyBridgeFeatures(
      bridge,
      parameters,
      layerThickness,
      context,
    )
    const cutLower = await applyBatchedCuts(lower, parameters, context)
    lower = cutLower
    const cutUpper = await applyBatchedCuts(upper, parameters, context)
    upper = cutUpper
    return await fuseBalanced([lower, cutBridge, upper], context)
  } catch (error) {
    deleteShape(lower)
    deleteShape(cutBridge ?? bridge)
    deleteShape(upper)
    throw error
  }
}

async function applyBoardFeatures(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  return applyBoardFeatureCuts(
    source,
    parameters,
    context,
    !parameters.fitToTarget,
  )
}

async function applyBoardFeatureCuts(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
  includeChamfers: boolean,
): Promise<Shape3D> {
  const chamferGroups: CutterGroup[] = []
  const connectorGroups: CutterGroup[] = []
  const screwGroups: CutterGroup[] = []
  try {
    if (includeChamfers) chamferGroups.push(...createChamferCutters(parameters))
    connectorGroups.push(
      ...createBoardConnectorCutterGroups(parameters, context),
    )
    screwGroups.push(...createBoardScrewCutterGroups(parameters, context))
    const useCompoundScrewParts = context.useCompoundScrewParts !== false
    const useCompoundChamfers =
      context.useCompoundChamferCutters !== false &&
      parameters.chamfers !== 'everywhere'
    let combinedGroups: CutterGroup[]
    if (useCompoundChamfers && useCompoundScrewParts) {
      combinedGroups = combineCutterGroups([
        ...chamferGroups,
        ...connectorGroups,
        ...screwGroups,
      ])
    } else if (useCompoundChamfers) {
      combinedGroups = [
        ...combineCutterGroups([...chamferGroups, ...connectorGroups]),
        ...screwGroups,
      ]
    } else {
      let combinedScrewGroups: CutterGroup[]
      if (useCompoundScrewParts) {
        combinedScrewGroups = combineCutterGroups(screwGroups)
      } else {
        combinedScrewGroups = screwGroups
      }
      combinedGroups = [
        ...chamferGroups,
        ...combineCutterGroups(connectorGroups),
        ...combinedScrewGroups,
      ]
    }
    return await applyCutterGroups(source, combinedGroups, context)
  } catch (error) {
    for (const group of [...chamferGroups, ...connectorGroups, ...screwGroups])
      disposeCutter(group)
    throw error
  }
}

async function applyBoardScrewCuts(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const screwGroups = createBoardScrewCutterGroups(parameters, context)
  let groups: CutterGroup[]
  if (context.useCompoundScrewParts === false) {
    groups = screwGroups
  } else {
    groups = combineCutterGroups(screwGroups)
  }
  return applyCutterGroups(source, groups, context)
}

async function applyBoardConnectorCuts(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const groups = combineCutterGroups(
    createBoardConnectorCutterGroups(parameters, context),
  )
  return applyCutterGroups(source, groups, context)
}

function cutShape(source: Shape3D, cutter: Shape3D): Shape3D {
  const result = source.cut(cutter, { optimisation: 'none' })
  if (result !== source) deleteShape(source)
  return result
}

async function applyCutterGroups(
  source: Shape3D,
  groups: CutterGroup[],
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  let current = source
  const cutScope = context.booleanOperations?.createScope(groups.length)
  try {
    while (groups.length > 0) {
      assertGenerationCurrent(context)
      const group = groups.shift()
      if (!group) continue
      try {
        current = measureBooleanInScope(cutScope, 'cut', () =>
          cutShape(current, group.shape),
        )
      } finally {
        disposeCutter(group)
      }
      await yieldAtSafeBoundary(context)
    }
    return current
  } catch (error) {
    for (const group of groups) disposeCutter(group)
    deleteShape(current)
    throw error
  }
}

async function applyBatchedCuts(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const groups = chamferCutterGroups(parameters, context)
  return applyCutterGroups(source, groups, context)
}

async function applyHeavyBridgeFeatures(
  source: Shape3D,
  parameters: OpenGridParameters,
  zOffset: number,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const groups = chamferCutterGroups(
    parameters,
    context,
    zOffset,
    OPENGRID_CONFIGURATION.heavyGap,
  )
  return applyCutterGroups(source, groups, context)
}

export async function buildOpenGridBRepWithStrategy(
  parameters: OpenGridParameters,
  strategy: OpenGridAssemblyStrategy,
  context: OpenGridBuildContext = {},
): Promise<Shape3D> {
  if (
    strategy !== 'whole-profile' &&
    strategy !== 'row-block' &&
    strategy !== 'cell-balanced' &&
    strategy !== 'prototype-template'
  ) {
    throw new Error('OPENGRID_STRATEGY_MISSING')
  }
  let base: Shape3D | null = null
  try {
    assertGenerationCurrent(context)
    base = await buildProductBase(parameters, strategy, context)
    if (strategy === 'prototype-template') {
      base = await applyBoardFeatures(base, parameters, context)
    } else {
      base = await applyBoardFeatureCuts(
        base,
        parameters,
        context,
        !isOpenGridLayeredVariant(parameters.variant),
      )
    }
    // Keep cutters on the nominal grid geometry. A narrow target-frame overlap
    // can otherwise be severed by edge features and fail the single-solid gate.
    base = await addTargetFrame(base, parameters, context)
    assertGenerationCurrent(context)
    return base
  } catch (error) {
    deleteShape(base)
    throw error
  }
}

export async function buildOpenGridBRep(
  parameters: OpenGridParameters,
  context: OpenGridBuildContext = {},
): Promise<Shape3D> {
  const strategy = OPENGRID_PRODUCT_STRATEGIES[parameters.variant]
  return buildOpenGridBRepWithStrategy(parameters, strategy, context)
}

export function effectiveScrewPositionsForOpenGrid(
  parameters: OpenGridParameters,
): OpenGridScrewPosition[] {
  return openGridScrewPositionsFor(parameters)
}
