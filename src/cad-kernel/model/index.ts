import type { Shape3D } from 'replicad'
import type { ProgressUnit } from '../../cad-contract/messages'
import type { BooleanOperationReporter } from '../boolean-progress'
import type { NativeModelPart } from '../lifetime'
import {
  isBoxParameters,
  isHexagonalColumnParameters,
  isHswCellParameters,
  isModularGridBaseParameters,
  isOpenGridDividerModelParameters,
  isOpenGridParameters,
  isOpenGridOpenShelfParameters,
  isOpenGridOpenConnectShelfParameters,
  isOpenGridOpenConnectOrganizerParameters,
  isOpenGridOrganizerBoxParameters,
  isOpenGridStackableBoxParameters,
  isOpenGridStackableCylinderParameters,
  validateOpenGridStackableBoxParameters,
  validateOpenGridStackableCylinderParameters,
  validateOpenGridWallCoverParameters,
  isOpenGridSnapParameters,
  isOpenGridSnapRemoverParameters,
  isPillarParameters,
  validateOpenGridGenerationSupport,
  validateModelParameters,
  type ModelId,
  type ModelParameterValues,
  type OpenGridVariant,
  type OpenGridSnapProfile,
  type OpenGridSnapVariant,
} from '../../cad-contract/units'
import { buildBoxBRep } from '../components/box/builder'
import { buildHswCell } from '../components/hsw-cell/builder'
import { buildHexagonalColumn } from '../components/hexagonal-column/builder'
import { buildModularGridBase } from '../components/modular-grid-base/builder'
import { buildOpenGridBRep } from '../components/opengrid/builder'
import { buildOpenGridDivider } from '../components/opengrid-divider/builder'
import { buildOpenGridStackableBoxAsync } from '../components/opengrid-stackable-box/builder'
import { buildOpenGridStackableCylinder } from '../components/opengrid-stackable-cylinder/builder'
import {
  buildOpenGridSnap,
  type OpenGridSnapFixedFootprint,
} from '../components/opengrid-snap/builder'
import {
  buildOpenGridWallCover,
  buildOpenGridWallCoverWithFlatText,
} from '../components/opengrid-wall-cover/builder'
import { buildOpenGridSnapRemover } from '../components/opengrid-snap-remover/builder'
import { buildPillar } from '../components/opengrid-pillar/builder'
import { buildOpenGridOpenShelf } from '../components/opengrid-open-shelf/builder'
import { buildOpenGridOpenConnectShelf } from '../components/opengrid-openconnect-shelf/builder'
import { buildOpenGridOpenConnectOrganizer } from '../components/opengrid-openconnect-organizer/builder'
import { buildOpenGridOrganizerBox } from '../components/opengrid-organizer-box/builder'

export type KernelBuildContext = {
  getModularGridBaseTemplate: () => Promise<Shape3D>
  getHswCellTemplate: () => Promise<Shape3D>
  getHexagonalColumnReference?: () => Promise<Shape3D>
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
  useCompoundChamferCutters?: boolean
  useCompoundScrewParts?: boolean
  fuseHalfCellExtensionsIntoAssembly?: boolean
  balancedFuseBatchSize?: number
  getOpenGridSnapReference?: (
    variant: OpenGridSnapVariant,
    profile: OpenGridSnapProfile,
  ) => Promise<Shape3D>
  getOpenGridWallCoverReference?: () => Promise<Shape3D>
  getOpenGridSnapFixedFootprint?: (
    footprint: OpenGridSnapFixedFootprint,
  ) => Promise<Shape3D>
  getOpenGridSnapOpenConnectHead?: () => Promise<Shape3D>
  getOpenGridSnapRemoverAsset?: () => Promise<Shape3D>
  getOpenGridOpenConnectShelfLockedSlot?: () => Promise<Shape3D>
  getOpenGridDetachableCornerSeatReference?: () => Promise<Shape3D>
  getOpenGridDetachableCornerSeatHolderReference?: () => Promise<Shape3D>
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: ProgressUnit
  }) => void
  reportPhase?: (phase: KernelBuildPhase, durationMs: number) => void
  booleanOperations?: BooleanOperationReporter
}

export type KernelBuildPhase =
  | 'clone-translate'
  | 'assembly-fuse'
  | 'fillet'
  | 'prototype-build'
  | 'clone-translate-compound'

export type KernelModelDefinition = {
  id: ModelId
  build: (
    parameters: ModelParameterValues,
    context: KernelBuildContext,
  ) => Shape3D | Promise<Shape3D>
}

export type KernelModelBuildResult = {
  shape: Shape3D
  qualityShape?: Shape3D
  parts?: NativeModelPart[]
}

function buildBoxModel(
  parameters: ModelParameterValues,
  _context: KernelBuildContext,
): Shape3D {
  if (!isBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:box')
  }
  return buildBoxBRep(parameters)
}

async function buildModularGridBaseModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isModularGridBaseParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:modular-grid-base')
  }
  const template = await context.getModularGridBaseTemplate()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildModularGridBase(parameters, template, context)
}

async function buildHswCellModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isHswCellParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hsw-cell')
  }
  const template = await context.getHswCellTemplate()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildHswCell(parameters, template, context)
}

async function buildHexagonalColumnModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isHexagonalColumnParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hexagonal-column')
  }
  if (!context.getHexagonalColumnReference) {
    throw new Error('MODEL_ASSET_INVALID:hexagonal-column-reference-missing')
  }
  const reference = await context.getHexagonalColumnReference()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildHexagonalColumn(parameters, {
    reference,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    reportProgress: context.reportProgress,
    reportPhase: context.reportPhase,
  })
}

async function buildPillarModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isPillarParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  if (parameters.mode === 'detachable-corner-seat') {
    if (!context.getOpenGridDetachableCornerSeatReference) {
      throw new Error('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')
    }
    detachableCornerSeatReference =
      await context.getOpenGridDetachableCornerSeatReference()
    if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
      throw new Error('STALE_GENERATION')
    }
  }
  return buildPillar(parameters, {
    detachableCornerSeatReference,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid')
  }
  const support = validateOpenGridGenerationSupport(parameters)
  if (!support.valid) {
    throw new Error('OPENGRID_UNSUPPORTED_CONFIGURATION')
  }
  return buildOpenGridBRep(parameters, {
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    getOpenGridPrototype: context.getOpenGridPrototype,
    getOpenGridCanonicalTile: context.getOpenGridCanonicalTile,
    getOpenGridHalfCellPrototype: context.getOpenGridHalfCellPrototype,
    useCompoundChamferCutters: context.useCompoundChamferCutters,
    useCompoundScrewParts: context.useCompoundScrewParts,
    fuseHalfCellExtensionsIntoAssembly:
      context.fuseHalfCellExtensionsIntoAssembly,
    balancedFuseBatchSize: context.balancedFuseBatchSize,
    reportProgress: context.reportProgress,
    reportPhase: (phase, durationMs) => {
      if (phase === 'assembly-fuse' || phase === 'prototype-build') {
        context.reportPhase?.(phase, durationMs)
      }
    },
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridSnapModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  }
  return buildOpenGridSnap(parameters, {
    getOpenGridSnapReference: context.getOpenGridSnapReference,
    getOpenGridSnapFixedFootprint: context.getOpenGridSnapFixedFootprint,
    getOpenGridSnapOpenConnectHead: context.getOpenGridSnapOpenConnectHead,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridWallCoverModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  const validation = validateOpenGridWallCoverParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  return buildOpenGridWallCover(validation.value, {
    getOpenGridSnapReference: context.getOpenGridSnapReference,
    getOpenGridWallCoverReference: context.getOpenGridWallCoverReference,
    getOpenGridSnapFixedFootprint: context.getOpenGridSnapFixedFootprint,
    getOpenGridSnapOpenConnectHead: context.getOpenGridSnapOpenConnectHead,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
    reportProgress: context.reportProgress,
  })
}

async function buildOpenGridDividerModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridDividerModelParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
  }
  return buildOpenGridDivider(parameters, {
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    reportProgress: context.reportProgress,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridStackableBoxModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridStackableBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  const validation = validateOpenGridStackableBoxParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  let detachableCornerSeatHolderReference: Shape3D | undefined
  if (validation.value.cornerSeatMode === 'detachable-corner-seat') {
    if (!context.getOpenGridDetachableCornerSeatReference) {
      throw new Error('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')
    }
    if (!context.getOpenGridDetachableCornerSeatHolderReference) {
      throw new Error(
        'MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat-holder',
      )
    }
    ;[detachableCornerSeatReference, detachableCornerSeatHolderReference] =
      await Promise.all([
        context.getOpenGridDetachableCornerSeatReference(),
        context.getOpenGridDetachableCornerSeatHolderReference(),
      ])
    if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
      throw new Error('STALE_GENERATION')
    }
  }
  return buildOpenGridStackableBoxAsync(validation.value, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridOrganizerBoxModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridOrganizerBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  let detachableCornerSeatHolderReference: Shape3D | undefined
  if (parameters.cornerSeatMode === 'detachable-corner-seat') {
    if (!context.getOpenGridDetachableCornerSeatReference) {
      throw new Error('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')
    }
    if (!context.getOpenGridDetachableCornerSeatHolderReference) {
      throw new Error(
        'MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat-holder',
      )
    }
    ;[detachableCornerSeatReference, detachableCornerSeatHolderReference] =
      await Promise.all([
        context.getOpenGridDetachableCornerSeatReference(),
        context.getOpenGridDetachableCornerSeatHolderReference(),
      ])
    if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
      throw new Error('STALE_GENERATION')
    }
  }
  return buildOpenGridOrganizerBox(parameters, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridOpenShelfModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridOpenShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
  }
  return buildOpenGridOpenShelf(parameters, {
    isGenerationCurrent: context.isGenerationCurrent,
    yieldToEventLoop: context.yieldToEventLoop,
    reportProgress: context.reportProgress,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridOpenConnectShelfModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridOpenConnectShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-shelf')
  }
  if (!context.getOpenGridOpenConnectShelfLockedSlot) {
    throw new Error(
      'MODEL_ASSET_CONTEXT_MISSING:opengrid-openconnect-shelf-locked-slot',
    )
  }
  return buildOpenGridOpenConnectShelf(parameters, {
    getLockedSlot: context.getOpenGridOpenConnectShelfLockedSlot,
    getOpenGridPrototype: context.getOpenGridPrototype,
    getOpenGridCanonicalTile: context.getOpenGridCanonicalTile,
    getOpenGridHalfCellPrototype: context.getOpenGridHalfCellPrototype,
    useCompoundChamferCutters: context.useCompoundChamferCutters,
    useCompoundScrewParts: context.useCompoundScrewParts,
    fuseHalfCellExtensionsIntoAssembly:
      context.fuseHalfCellExtensionsIntoAssembly,
    balancedFuseBatchSize: context.balancedFuseBatchSize,
    isGenerationCurrent: context.isGenerationCurrent,
    yieldToEventLoop: context.yieldToEventLoop,
    reportProgress: context.reportProgress,
    reportPhase: context.reportPhase,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridOpenConnectOrganizerModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridOpenConnectOrganizerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer')
  }
  if (!context.getOpenGridOpenConnectShelfLockedSlot) {
    throw new Error(
      'MODEL_ASSET_CONTEXT_MISSING:opengrid-openconnect-organizer-locked-slot',
    )
  }
  return buildOpenGridOpenConnectOrganizer(parameters, {
    getLockedSlot: context.getOpenGridOpenConnectShelfLockedSlot,
    isGenerationCurrent: context.isGenerationCurrent,
    yieldToEventLoop: context.yieldToEventLoop,
    reportProgress: context.reportProgress,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridStackableCylinderModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridStackableCylinderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  const validation = validateOpenGridStackableCylinderParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  let detachableCornerSeatReference: Shape3D | undefined
  let detachableCornerSeatHolderReference: Shape3D | undefined
  if (validation.value.bottomSeatMode === 'detachable-corner-seat') {
    if (!context.getOpenGridDetachableCornerSeatReference) {
      throw new Error('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')
    }
    if (!context.getOpenGridDetachableCornerSeatHolderReference) {
      throw new Error(
        'MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat-holder',
      )
    }
    ;[detachableCornerSeatReference, detachableCornerSeatHolderReference] =
      await Promise.all([
        context.getOpenGridDetachableCornerSeatReference(),
        context.getOpenGridDetachableCornerSeatHolderReference(),
      ])
    if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
      throw new Error('STALE_GENERATION')
    }
  }
  return buildOpenGridStackableCylinder(validation.value, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    isGenerationCurrent: context.isGenerationCurrent,
    booleanOperations: context.booleanOperations,
  })
}

async function buildOpenGridSnapRemoverModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  if (!context.getOpenGridSnapRemoverAsset) {
    throw new Error('MODEL_ASSET_CONTEXT_MISSING:opengrid-snap-remover')
  }

  const source = await context.getOpenGridSnapRemoverAsset()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildOpenGridSnapRemover(source, context)
}

export const boxKernelDefinition: KernelModelDefinition = {
  id: 'box',
  build: buildBoxModel,
}

export const modularGridBaseKernelDefinition: KernelModelDefinition = {
  id: 'modular-grid-base',
  build: buildModularGridBaseModel,
}

export const hswCellKernelDefinition: KernelModelDefinition = {
  id: 'hsw-cell',
  build: buildHswCellModel,
}

export const hexagonalColumnKernelDefinition: KernelModelDefinition = {
  id: 'hexagonal-column',
  build: buildHexagonalColumnModel,
}

export const pillarKernelDefinition: KernelModelDefinition = {
  id: 'opengrid-pillar',
  build: buildPillarModel,
}

export const opengridKernelDefinition: KernelModelDefinition = {
  id: 'opengrid',
  build: buildOpenGridModel,
}

export const opengridSnapKernelDefinition: KernelModelDefinition = {
  id: 'opengrid-snap',
  build: buildOpenGridSnapModel,
}

export const opengridWallCoverKernelDefinition: KernelModelDefinition = {
  id: 'opengrid-wall-cover',
  build: buildOpenGridWallCoverModel,
}

export const opengridStackableBoxKernelDefinition: KernelModelDefinition = {
  id: 'opengrid-stackable-box',
  build: buildOpenGridStackableBoxModel,
}

export const opengridOrganizerBoxKernelDefinition: KernelModelDefinition = {
  id: 'opengrid-organizer-box',
  build: buildOpenGridOrganizerBoxModel,
}

export const opengridStackableCylinderKernelDefinition: KernelModelDefinition =
  {
    id: 'opengrid-stackable-cylinder',
    build: buildOpenGridStackableCylinderModel,
  }

export const opengridOpenShelfKernelDefinition: KernelModelDefinition = {
  id: 'opengrid-open-shelf',
  build: buildOpenGridOpenShelfModel,
}

export const opengridOpenConnectShelfKernelDefinition: KernelModelDefinition = {
  id: 'opengrid-openconnect-shelf',
  build: buildOpenGridOpenConnectShelfModel,
}

export const opengridOpenConnectOrganizerKernelDefinition: KernelModelDefinition =
  {
    id: 'opengrid-openconnect-organizer',
    build: buildOpenGridOpenConnectOrganizerModel,
  }

export const openGridSnapRemoverKernelDefinition: KernelModelDefinition = {
  id: 'opengrid-snap-remover',
  build: buildOpenGridSnapRemoverModel,
}

export const opengridDividerKernelDefinition: KernelModelDefinition = {
  id: 'opengrid-divider',
  build: buildOpenGridDividerModel,
}

export const kernelModelDefinitions: ReadonlyArray<KernelModelDefinition> = [
  boxKernelDefinition,
  modularGridBaseKernelDefinition,
  hswCellKernelDefinition,
  hexagonalColumnKernelDefinition,
  pillarKernelDefinition,
  opengridKernelDefinition,
  opengridStackableBoxKernelDefinition,
  opengridOrganizerBoxKernelDefinition,
  opengridStackableCylinderKernelDefinition,
  opengridOpenShelfKernelDefinition,
  opengridOpenConnectShelfKernelDefinition,
  opengridOpenConnectOrganizerKernelDefinition,
  opengridSnapKernelDefinition,
  opengridWallCoverKernelDefinition,
  openGridSnapRemoverKernelDefinition,
  opengridDividerKernelDefinition,
]

export function getKernelModelDefinition(
  modelId: ModelId,
): KernelModelDefinition | undefined {
  return kernelModelDefinitions.find((definition) => definition.id === modelId)
}

export async function buildModelBRep(
  modelId: ModelId,
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  const validation = validateModelParameters(modelId, parameters)
  if (!validation.valid) throw new Error('MODEL_PARAMETERS_INVALID')

  const definition = getKernelModelDefinition(modelId)
  if (!definition) throw new Error(`MODEL_DEFINITION_MISSING:${modelId}`)
  return definition.build(parameters, context)
}

export async function buildModelBRepWithParts(
  modelId: ModelId,
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<KernelModelBuildResult> {
  if (modelId === 'opengrid-wall-cover') {
    const validation = validateOpenGridWallCoverParameters(parameters)
    if (!validation.valid) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
    }
    return buildOpenGridWallCoverWithFlatText(validation.value, {
      getOpenGridSnapReference: context.getOpenGridSnapReference,
      getOpenGridWallCoverReference: context.getOpenGridWallCoverReference,
      getOpenGridSnapFixedFootprint: context.getOpenGridSnapFixedFootprint,
      getOpenGridSnapOpenConnectHead: context.getOpenGridSnapOpenConnectHead,
      yieldToEventLoop: context.yieldToEventLoop,
      isGenerationCurrent: context.isGenerationCurrent,
      booleanOperations: context.booleanOperations,
      reportProgress: context.reportProgress,
    })
  }

  return {
    shape: await buildModelBRep(modelId, parameters, context),
  }
}
