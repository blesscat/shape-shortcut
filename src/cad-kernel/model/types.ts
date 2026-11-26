import type { Shape3D } from 'replicad'
import type { ProgressUnit } from '../../cad-contract/messages'
import type {
  CardBoxSvgOutlineData,
  ModelId,
  ModelParameterValues,
  OpenGridSnapProfile,
  OpenGridSnapVariant,
  OpenGridVariant,
} from '../../cad-contract/units'
import type { BooleanOperationReporter } from '../boolean-progress'
import type { OpenGridSnapFixedFootprint } from '../components/opengrid-snap/builder'
import type { NativeModelPart } from '../lifetime'

export type KernelBuildContext = {
  getModularGridBaseTemplate: () => Promise<Shape3D>
  getHswCellTemplate: () => Promise<Shape3D>
  /** Cover art: cleaned cover-SVG outlines from the generate command. */
  coverSvg?: CardBoxSvgOutlineData
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

/**
 * A component definition module may also own the multipart build path of its
 * component. The shared registry uses it when the Worker asks for the parts
 * of a model, so a component with parts never needs an edit in the shared
 * registry.
 */
export type ComponentModelDefinition = KernelModelDefinition & {
  buildWithParts?: (
    parameters: ModelParameterValues,
    context: KernelBuildContext,
  ) => KernelModelBuildResult | Promise<KernelModelBuildResult>
}
