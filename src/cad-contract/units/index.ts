import {
  OPENGRID_CONFIGURATION,
  OPENGRID_PREVIEW_CONFIGURATION,
  boundsForOpenGrid,
  openGridFileName,
  openGridStlFileName,
  validateOpenGridParameters,
  isOpenGridParameters,
} from './opengrid'
import type { OpenGridParameterKey, OpenGridParameters } from './opengrid'
import {
  boundsForOpenGridStackableBox,
  externalOpenGridStackableBoxHeightFor,
  isOpenGridStackableBoxParameters,
  nominalOpenGridStackableBoxFootprintFor,
  nominalOpenGridStackableBoxBottomGridAxisPositionsFor,
  nominalOpenGridStackableBoxBottomGridCentersFor,
  openGridStackableBoxUpperInnerRimZFor,
  openGridStackableBoxActiveFloorTopZFor,
  openGridStackableBoxActiveUpperInnerRimZFor,
  openGridStackableBoxDerivedGeometryFor,
  openGridStackableBoxFileName,
  openGridStackableBoxOpeningBottomLengthMaximumFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  openGridStackableBoxStlFileName,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS,
  OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
  validateOpenGridStackableBoxParameters,
} from './opengrid-stackable-box'
import type {
  OpenGridStackableBoxDerivedGeometry,
  OpenGridStackableBoxDerivedOpening,
  OpenGridStackableBoxOpeningDirection,
  OpenGridStackableBoxOpeningParameterKey,
  OpenGridStackableBoxParameterKey,
  OpenGridStackableBoxParameters,
  OpenGridStackableBoxPoint2D,
  OpenGridStackableBoxValidation,
  OpenGridStackableBoxValidationIssue,
} from './opengrid-stackable-box'
import {
  boundsForOpenGridOrganizerBox,
  isOpenGridOrganizerBoxParameters,
  openGridOrganizerBoxDetachableIndicatorPlacementFor,
  openGridOrganizerBoxFileName,
  openGridOrganizerBoxStlFileName,
  OPENGRID_ORGANIZER_BOX_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  validateOpenGridOrganizerBoxParameters,
} from './opengrid-organizer-box'
import type {
  OpenGridOrganizerBoxDetachableIndicatorPlacement,
  OpenGridOrganizerBoxParameterKey,
  OpenGridOrganizerBoxParameters,
} from './opengrid-organizer-box'
import {
  boundsForOpenGridStackableCylinder,
  isOpenGridStackableCylinderParameters,
  openGridStackableCylinderDerivedGeometryFor,
  openGridStackableCylinderFileName,
  openGridStackableCylinderHoleCentersFor,
  openGridStackableCylinderOpeningBottomLengthMaximumFor,
  openGridStackableCylinderOuterHoleIndexFor,
  openGridStackableCylinderStlFileName,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS,
  OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
  validateOpenGridStackableCylinderParameters,
} from './opengrid-stackable-cylinder'
import type {
  OpenGridStackableCylinderDerivedOpening,
  OpenGridStackableCylinderDerivedGeometry,
  OpenGridStackableCylinderOpeningDirection,
  OpenGridStackableCylinderOpeningParameterKey,
  OpenGridStackableCylinderParameterKey,
  OpenGridStackableCylinderParameters,
  OpenGridStackableCylinderProfile,
  OpenGridStackableCylinderPoint2D,
  OpenGridStackableCylinderValidation,
  OpenGridStackableCylinderValidationIssue,
} from './opengrid-stackable-cylinder'
import {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  isOpenGridSnapFootprint,
  isOpenGridSnapMagnetHoleShape,
  normalizeOpenGridSnapParameters,
  openGridSnapCanonicalAxesFor,
  openGridSnapFileName,
  openGridSnapFootprintForLegacyAxes,
  openGridSnapStlFileName,
  OPENGRID_SNAP_CONFIGURATION,
  validateOpenGridSnapParameters,
} from './opengrid-snap'
import type {
  OpenGridSnapCanonicalAxes,
  OpenGridSnapFootprint,
  OpenGridSnapParameterKey,
  OpenGridSnapParameters,
  OpenGridSnapValidation,
} from './opengrid-snap'
import {
  boundsForOpenGridDivider,
  classifyOpenGridDividerShape,
  isOpenGridDividerParameters,
  normalizeOpenGridDividerParameters,
  openGridDividerArmEndpointsFor,
  openGridDividerAxisFor,
  openGridDividerFileName,
  openGridDividerPegCentersFor,
  openGridDividerPlanBoundsFor,
  openGridDividerPlanDimensionsFor,
  openGridDividerStlFileName,
  openGridDividerTransitionHeightFor,
  OPENGRID_DIVIDER_CONFIGURATION,
  validateOpenGridDividerParameters,
} from './opengrid-divider'
import type {
  OpenGridDividerAxis,
  OpenGridDividerArmEndpoints,
  OpenGridDividerParameterKey,
  OpenGridDividerParameters,
  OpenGridDividerPlanBounds,
  OpenGridDividerPlanDimensions,
  OpenGridDividerPoint2D,
  OpenGridDividerShape,
  OpenGridDividerValidation,
  OpenGridDividerValidationIssue,
} from './opengrid-divider'
import {
  boundsForPillar,
  isPillarParameters,
  normalizePillarParameters,
  pillarBodyDiameterForParameters,
  pillarFileName,
  pillarFlangeDiameterForParameters,
  pillarLengthForParameters,
  pillarLengthForMode,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
} from './opengrid-pillar'
import type {
  PillarBounds,
  PillarMode,
  PillarParameterKey,
  PillarParameters,
  PillarValidation,
  PillarValidationIssue,
} from './opengrid-pillar'
import {
  boundsForOpenGridOpenShelf,
  isOpenGridOpenShelfParameters,
  openGridOpenShelfFileName,
  openGridOpenShelfStlFileName,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  openGridOpenShelfAngleRadiansFor,
  openGridOpenShelfCellClearWidthFor,
  openGridOpenShelfClearCellHeightsFor,
  openGridOpenShelfCellSpaceFor,
  openGridOpenShelfDepthFor,
  openGridOpenShelfDividerCentersFor,
  openGridOpenShelfFootprintFor,
  openGridOpenShelfFrontToRearElevationFor,
  openGridOpenShelfPegCentersFor,
  openGridOpenShelfShelfLowerSurfaceZFor,
  openGridOpenShelfShelfCountFor,
  openGridOpenShelfTopInnerFrontZFor,
  openGridOpenShelfTopInnerRearZFor,
  openGridOpenShelfTopOuterRearZFor,
  validateOpenGridOpenShelfParameters,
} from './opengrid-open-shelf'
import type { FieldDiagnostic } from '../diagnostics'
import type {
  OpenGridOpenShelfCellClearHeights,
  OpenGridOpenShelfCellSpace,
  OpenGridOpenShelfParameterKey,
  OpenGridOpenShelfParameters,
  OpenGridOpenShelfPoint2D,
  OpenGridOpenShelfValidation,
  OpenGridOpenShelfValidationIssue,
} from './opengrid-open-shelf'

export {
  OPENGRID_CONFIGURATION,
  OPENGRID_PREVIEW_CONFIGURATION,
  OPENGRID_CONNECTOR_SIDES,
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  deterministicOpenGridCustomScrewPositions,
  isOpenGridGenerationSupported,
  isOpenGridLayeredVariant,
  isOpenGridParameters,
  normalizeOpenGridParameters,
  openGridBoardConfiguration,
  openGridConnectorLocationsFor,
  openGridCustomPositionFingerprint,
  openGridFileName,
  openGridScrewCentersFor,
  openGridScrewLatticeDimensions,
  openGridScrewPositionsFor,
  openGridStlFileName,
  screwCenterForOpenGrid,
  validateOpenGridGenerationSupport,
  validateOpenGridParameters,
} from './opengrid'
export {
  boundsForOpenGridOpenShelf,
  isOpenGridOpenShelfParameters,
  openGridOpenShelfAngleRadiansFor,
  openGridOpenShelfCellClearWidthFor,
  openGridOpenShelfClearCellHeightsFor,
  openGridOpenShelfCellSpaceFor,
  openGridOpenShelfDepthFor,
  openGridOpenShelfDividerCentersFor,
  openGridOpenShelfFileName,
  openGridOpenShelfFootprintFor,
  openGridOpenShelfFrontToRearElevationFor,
  openGridOpenShelfPegCentersFor,
  openGridOpenShelfShelfLowerSurfaceZFor,
  openGridOpenShelfShelfCountFor,
  openGridOpenShelfStlFileName,
  openGridOpenShelfTopInnerFrontZFor,
  openGridOpenShelfTopInnerRearZFor,
  openGridOpenShelfTopOuterRearZFor,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  validateOpenGridOpenShelfParameters,
} from './opengrid-open-shelf'
export {
  boundsForOpenGridDivider,
  classifyOpenGridDividerShape,
  isOpenGridDividerParameters,
  normalizeOpenGridDividerParameters,
  openGridDividerArmEndpointsFor,
  openGridDividerAxisFor,
  openGridDividerFileName,
  openGridDividerPegCentersFor,
  openGridDividerPlanBoundsFor,
  openGridDividerPlanDimensionsFor,
  openGridDividerStlFileName,
  openGridDividerTransitionHeightFor,
  OPENGRID_DIVIDER_CONFIGURATION,
  validateOpenGridDividerParameters,
} from './opengrid-divider'
export {
  boundsForOpenGridStackableBox,
  externalOpenGridStackableBoxHeightFor,
  openGridStackableBoxActiveFloorTopZFor,
  openGridStackableBoxActiveUpperInnerRimZFor,
  openGridStackableBoxDerivedGeometryFor,
  isOpenGridStackableBoxParameters,
  nominalOpenGridStackableBoxFootprintFor,
  nominalOpenGridStackableBoxBottomGridAxisPositionsFor,
  nominalOpenGridStackableBoxBottomGridCentersFor,
  openGridStackableBoxUpperInnerRimZFor,
  openGridStackableBoxFileName,
  openGridStackableBoxOpeningBottomLengthMaximumFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  openGridStackableBoxStlFileName,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS,
  OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
  validateOpenGridStackableBoxParameters,
} from './opengrid-stackable-box'
export {
  boundsForOpenGridOrganizerBox,
  isOpenGridOrganizerBoxParameters,
  openGridOrganizerBoxCavityEnvelopeFor,
  openGridOrganizerBoxDetachableIndicatorPlacementFor,
  openGridOrganizerBoxDetachableSocketPosesFor,
  openGridOrganizerBoxFileName,
  openGridOrganizerBoxLayoutFor,
  openGridOrganizerBoxPolygonPointsFor,
  openGridOrganizerBoxStlFileName,
  OPENGRID_ORGANIZER_BOX_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  validateOpenGridOrganizerBoxParameters,
} from './opengrid-organizer-box'
export {
  boundsForOpenGridStackableCylinder,
  isOpenGridStackableCylinderParameters,
  openGridStackableCylinderDerivedGeometryFor,
  openGridStackableCylinderFileName,
  openGridStackableCylinderHoleCentersFor,
  openGridStackableCylinderOpeningBottomLengthMaximumFor,
  openGridStackableCylinderOuterHoleIndexFor,
  openGridStackableCylinderStlFileName,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS,
  OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
  validateOpenGridStackableCylinderParameters,
} from './opengrid-stackable-cylinder'
export {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  isOpenGridSnapFootprint,
  isOpenGridSnapMagnetHoleShape,
  normalizeOpenGridSnapParameters,
  openGridSnapCanonicalAxesFor,
  openGridSnapFileName,
  openGridSnapFootprintForLegacyAxes,
  openGridSnapStlFileName,
  OPENGRID_SNAP_CONFIGURATION,
  parseOpenGridSnapDecimalInput,
  validateOpenGridSnapParameters,
} from './opengrid-snap'
export {
  HALF_CELL_CONFIGURATION,
  halfCellDirectionLabel,
  halfCellExtensionFor,
  fullGridCenterOffsetX,
  fullGridCenterOffsetY,
  hasHalfCellX,
  hasHalfCellY,
  halfCellHostPitch,
  isHalfCellX,
  isHalfCellY,
  openGridAxisSize,
  snapFixedCoreAxisSize,
  snapNominalAxisSize,
} from './half-cell'
export { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
export { OPENGRID_HONEYCOMB_CONFIGURATION } from './opengrid-honeycomb'
export {
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_LOCATING_SEAT_MODES,
} from './opengrid-locating-assembly'
export type { HalfCellDirection, HalfCellX, HalfCellY } from './half-cell'
export type {
  OpenGridSnapBounds,
  OpenGridSnapCanonicalAxes,
  OpenGridSnapFootprint,
  OpenGridSnapMagnetHoleShape,
  OpenGridSnapParameterKey,
  OpenGridSnapParameters,
  OpenGridSnapValidation,
  OpenGridSnapValidationIssue,
  OpenGridSnapProfile,
  OpenGridSnapVariant,
} from './opengrid-snap'
export type {
  OpenGridStackableBoxParameterKey,
  OpenGridStackableBoxParameters,
  OpenGridStackableBoxDerivedGeometry,
  OpenGridStackableBoxDerivedOpening,
  OpenGridStackableBoxOpeningDirection,
  OpenGridStackableBoxOpeningParameterKey,
  OpenGridStackableBoxPoint2D,
  OpenGridStackableBoxValidation,
  OpenGridStackableBoxValidationIssue,
} from './opengrid-stackable-box'
export type {
  OpenGridOrganizerBoxBottomInterfaceMode,
  OpenGridOrganizerBoxCavityEnvelope,
  OpenGridOrganizerBoxCavityEnvelopeInput,
  OpenGridOrganizerBoxDetachableIndicatorPlacement,
  OpenGridOrganizerBoxDetachableSocketCorner,
  OpenGridOrganizerBoxDetachableSocketPose,
  OpenGridOrganizerBoxLayout,
  OpenGridOrganizerBoxParameterKey,
  OpenGridOrganizerBoxParameters,
  OpenGridOrganizerBoxPoint2D,
  OpenGridOrganizerBoxShape,
  OpenGridOrganizerBoxSpacingMode,
  OpenGridOrganizerBoxValidation,
  OpenGridOrganizerBoxValidationIssue,
} from './opengrid-organizer-box'
export type {
  OpenGridStackableCylinderDerivedOpening,
  OpenGridStackableCylinderDerivedGeometry,
  OpenGridStackableCylinderOpeningDirection,
  OpenGridStackableCylinderOpeningParameterKey,
  OpenGridStackableCylinderParameterKey,
  OpenGridStackableCylinderParameters,
  OpenGridStackableCylinderProfile,
  OpenGridStackableCylinderPoint2D,
  OpenGridStackableCylinderValidation,
  OpenGridStackableCylinderValidationIssue,
} from './opengrid-stackable-cylinder'
export type { OpenGridLocatingSeatMode } from './opengrid-locating-assembly'
export type {
  OpenGridBoardConfiguration,
  OpenGridChamferMode,
  OpenGridCornerFlags,
  OpenGridConnectorLocation,
  OpenGridConnectorSide,
  OpenGridDirection3D,
  OpenGridGenerationSupportValidation,
  OpenGridPoint2D,
  OpenGridScrewDimensions,
  OpenGridScrewKind,
  OpenGridScrewMode,
  OpenGridScrewPreset,
  OpenGridScrewPosition,
  OpenGridSideFlags,
  OpenGridVariant,
  OpenGridValidation,
  OpenGridValidationIssue,
  OpenGridConnectorHoles,
  OpenGridParameters,
  OpenGridParameterKey,
} from './opengrid'
export type {
  OpenGridOpenShelfCellClearHeights,
  OpenGridOpenShelfParameterKey,
  OpenGridOpenShelfParameters,
  OpenGridOpenShelfPoint2D,
  OpenGridOpenShelfValidation,
  OpenGridOpenShelfValidationIssue,
} from './opengrid-open-shelf'
export type {
  OpenGridDividerAxis,
  OpenGridDividerParameterKey,
  OpenGridDividerParameters,
  OpenGridDividerPlanDimensions,
  OpenGridDividerPoint2D,
  OpenGridDividerShape,
  OpenGridDividerValidation,
  OpenGridDividerValidationIssue,
} from './opengrid-divider'
export {
  boundsForPillar,
  isPillarParameters,
  normalizePillarParameters,
  pillarBodyDiameterForParameters,
  pillarFileName,
  pillarFlangeDiameterForParameters,
  pillarLengthForParameters,
  pillarLengthForMode,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
} from './opengrid-pillar'
export type {
  PillarBounds,
  PillarMode,
  PillarParameterKey,
  PillarParameters,
  PillarValidation,
  PillarValidationIssue,
} from './opengrid-pillar'

export const HSW_CELL_CONFIGURATION = {
  maxGridCount: 20,
  outerWidth: 27.250933249878,
  outerDepth: 23.60000049802324,
  outerHeight: 8,
  columnPitch: 20.4381999374085,
  rowPitch: 23.60000049802324,
  staggerY: 11.80000024901162,
} as const

export type HexagonalColumnOrientation = 'lying' | 'standing'

export const HEXAGONAL_COLUMN_CONFIGURATION = {
  defaultHeight: 8,
  minHeight: 1,
  maxHeight: 500,
  heightSliderMax: 200,
  defaultCount: 1,
  minCount: 1,
  defaultGap: 1,
  minGap: 1,
  maxGap: 99,
  gapSliderMax: 10,
  maxCount: 20,
  defaultOrientation: 'lying' as HexagonalColumnOrientation,
  endTransitionLength: 0.2,
  crossSectionRotationDegrees: 30,
  referenceCrossSectionExtentY: 4.243524,
  crossSectionExtentX: 4.243524,
  crossSectionExtentY: 4.7,
} as const

export const PROTOTYPE_CONFIGURATION = {
  defaultDimensions: { width: 20, depth: 30, height: 40 },
  minDimension: 1,
  maxDimension: 500,
  inputStep: 1,
  inputDebounceMs: 500,
  boundsTolerance: 0.01,
  engineInitializationTimeoutMs: 60_000,
  operationTimeoutMs: 120_000,
  recoveryRetries: 1,
  pendingCandidateLimit: 2,
  candidateTtlMs: 30_000,
  stepExtension: '.step',
  stepMime: 'model/step',
  stlExtension: '.stl',
  stlMime: 'model/stl',
  stlTolerance: 0.001,
  stlAngularTolerance: 0.1,
  modularGridBase: {
    maxGridCount: 20,
    cellWidth: 20,
    cellDepth: 20,
    height: 5,
    cutoutWidth: 17.5,
    cutoutDepth: 17.5,
    outerCornerRadius: 2.5,
  },
  hswCell: HSW_CELL_CONFIGURATION,
  opengrid: OPENGRID_CONFIGURATION,
  opengridStackableBox: OPENGRID_STACKABLE_BOX_CONFIGURATION,
  opengridOrganizerBox: OPENGRID_ORGANIZER_BOX_CONFIGURATION,
  opengridStackableCylinder: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  opengridDivider: OPENGRID_DIVIDER_CONFIGURATION,
  opengridOpenShelf: OPENGRID_OPEN_SHELF_CONFIGURATION,
} as const

export type DimensionKey = 'width' | 'depth' | 'height'
export type GridParameterKey = 'rows' | 'columns'
export type HexagonalColumnParameterKey =
  'height' | 'count' | 'gap' | 'orientation'
export type ModelParameterKey =
  | DimensionKey
  | GridParameterKey
  | HexagonalColumnParameterKey
  | OpenGridParameterKey
  | OpenGridStackableBoxParameterKey
  | OpenGridOrganizerBoxParameterKey
  | OpenGridStackableCylinderParameterKey
  | OpenGridSnapParameterKey
  | OpenGridDividerParameterKey
  | PillarParameterKey
  | OpenGridOpenShelfParameterKey
export type ScalarModelParameterKey =
  | DimensionKey
  | GridParameterKey
  | HexagonalColumnParameterKey
  | 'diameter'
  | OpenGridDividerParameterKey
  | 'offset'
export type ModelId =
  | 'box'
  | 'modular-grid-base'
  | 'hsw-cell'
  | 'hexagonal-column'
  | 'opengrid'
  | 'opengrid-stackable-box'
  | 'opengrid-organizer-box'
  | 'opengrid-stackable-cylinder'
  | 'opengrid-snap'
  | 'opengrid-snap-remover'
  | 'opengrid-divider'
  | 'opengrid-pillar'
  | 'opengrid-open-shelf'

export type BoxParameters = Record<DimensionKey, number>
export type ModularGridBaseParameters = Record<GridParameterKey, number>
export type HswCellParameters = Record<GridParameterKey, number>
export type HexagonalColumnParameters = {
  height: number
  count: number
  gap: number
  orientation: HexagonalColumnOrientation
}
export type OpenGridSnapRemoverParameters = Record<never, never>

export type ModelParameters =
  | { modelId: 'box'; parameters: BoxParameters }
  | {
      modelId: 'modular-grid-base'
      parameters: ModularGridBaseParameters
    }
  | { modelId: 'hsw-cell'; parameters: HswCellParameters }
  | {
      modelId: 'hexagonal-column'
      parameters: HexagonalColumnParameters
    }
  | { modelId: 'opengrid'; parameters: OpenGridParameters }
  | {
      modelId: 'opengrid-stackable-box'
      parameters: OpenGridStackableBoxParameters
    }
  | {
      modelId: 'opengrid-organizer-box'
      parameters: OpenGridOrganizerBoxParameters
    }
  | {
      modelId: 'opengrid-stackable-cylinder'
      parameters: OpenGridStackableCylinderParameters
    }
  | { modelId: 'opengrid-snap'; parameters: OpenGridSnapParameters }
  | {
      modelId: 'opengrid-snap-remover'
      parameters: OpenGridSnapRemoverParameters
    }
  | {
      modelId: 'opengrid-divider'
      parameters: OpenGridDividerParameters
    }
  | { modelId: 'opengrid-pillar'; parameters: PillarParameters }
  | {
      modelId: 'opengrid-open-shelf'
      parameters: OpenGridOpenShelfParameters
    }

export type ModelParameterValues = ModelParameters['parameters']

export type ModelBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

export type BoxBounds = ModelBounds

export type ValidationIssue = FieldDiagnostic

export type BoxValidation =
  | { valid: true; value: BoxParameters }
  | { valid: false; issues: ValidationIssue[] }

export type ModularGridBaseValidation =
  | { valid: true; value: ModularGridBaseParameters }
  | { valid: false; issues: ValidationIssue[] }

export type HswCellValidation =
  | { valid: true; value: HswCellParameters }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridStackableBoxModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-stackable-box'
        parameters: OpenGridStackableBoxParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridOrganizerBoxModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-organizer-box'
        parameters: OpenGridOrganizerBoxParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridStackableCylinderModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-stackable-cylinder'
        parameters: OpenGridStackableCylinderParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type HexagonalColumnValidation =
  | { valid: true; value: HexagonalColumnParameters }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridSnapModelValidation = OpenGridSnapValidation
export type OpenGridDividerModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-divider'
        parameters: OpenGridDividerParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridSnapRemoverValidation =
  | { valid: true; value: OpenGridSnapRemoverParameters }
  | { valid: false; issues: ValidationIssue[] }

export type PillarModelValidation =
  | {
      valid: true
      value: { modelId: 'opengrid-pillar'; parameters: PillarParameters }
    }
  | { valid: false; issues: ValidationIssue[] }

export type HswCellOffset = [number, number]

export type ModelValidation =
  | { valid: true; value: ModelParameters }
  | { valid: false; issues: ValidationIssue[] }

const DIMENSIONS: DimensionKey[] = ['width', 'depth', 'height']
const GRID_PARAMETERS: GridParameterKey[] = ['rows', 'columns']
const HEXAGONAL_COLUMN_PARAMETERS: HexagonalColumnParameterKey[] = [
  'height',
  'count',
  'gap',
  'orientation',
]
const HEXAGONAL_COLUMN_REQUIRED_PARAMETERS: HexagonalColumnParameterKey[] = [
  'height',
  'count',
  'gap',
]

function invalidRange(
  field: ValidationIssue['field'],
  min: number,
  max: number,
  unit: 'mm' | 'count' = 'mm',
): ValidationIssue {
  return {
    field,
    messageId: 'validation.invalid',
    params: { min, max, unit },
  }
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  )
}

function hasOnlySupportedKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

export function parseDimensionInput(raw: string): number | null {
  const value = raw.trim()
  if (!/^-?\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

export function validateBoxParameters(value: unknown): BoxValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const candidate = value as Partial<Record<DimensionKey, unknown>> &
    Record<string, unknown>
  const issues: ValidationIssue[] = []

  if (!hasExactKeys(candidate, DIMENSIONS)) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  for (const field of DIMENSIONS) {
    const dimension = candidate[field]
    if (typeof dimension !== 'number' || !Number.isFinite(dimension)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (!Number.isInteger(dimension)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (
      dimension < PROTOTYPE_CONFIGURATION.minDimension ||
      dimension > PROTOTYPE_CONFIGURATION.maxDimension
    ) {
      issues.push(
        invalidRange(
          field,
          PROTOTYPE_CONFIGURATION.minDimension,
          PROTOTYPE_CONFIGURATION.maxDimension,
        ),
      )
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      width: candidate.width as number,
      depth: candidate.depth as number,
      height: candidate.height as number,
    },
  }
}

export function validateModularGridBaseParameters(
  value: unknown,
): ModularGridBaseValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const candidate = value as Partial<Record<GridParameterKey, unknown>> &
    Record<string, unknown>
  const issues: ValidationIssue[] = []
  const grid = PROTOTYPE_CONFIGURATION.modularGridBase

  if (!hasExactKeys(candidate, GRID_PARAMETERS)) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  for (const field of GRID_PARAMETERS) {
    const count = candidate[field]
    if (typeof count !== 'number' || !Number.isFinite(count)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (!Number.isInteger(count)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (count < PROTOTYPE_CONFIGURATION.minDimension) {
      issues.push(
        invalidRange(
          field,
          PROTOTYPE_CONFIGURATION.minDimension,
          grid.maxGridCount,
          'count',
        ),
      )
      continue
    }
    if (count > grid.maxGridCount) {
      issues.push(
        invalidRange(
          field,
          PROTOTYPE_CONFIGURATION.minDimension,
          grid.maxGridCount,
          'count',
        ),
      )
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters: ModularGridBaseParameters = {
    rows: candidate.rows as number,
    columns: candidate.columns as number,
  }
  const width = parameters.columns * grid.cellWidth
  const depth = parameters.rows * grid.cellDepth

  if (width > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push(invalidRange('columns', 1, grid.maxGridCount, 'count'))
  }
  if (depth > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push(invalidRange('rows', 1, grid.maxGridCount, 'count'))
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

export function validateHswCellParameters(value: unknown): HswCellValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const candidate = value as Partial<Record<GridParameterKey, unknown>> &
    Record<string, unknown>
  const issues: ValidationIssue[] = []
  const grid = HSW_CELL_CONFIGURATION

  if (!hasExactKeys(candidate, GRID_PARAMETERS)) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  for (const field of GRID_PARAMETERS) {
    const count = candidate[field]
    if (typeof count !== 'number' || !Number.isFinite(count)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (!Number.isInteger(count)) {
      issues.push({ field, messageId: 'validation.invalid' })
      continue
    }
    if (count < 1) {
      issues.push(invalidRange(field, 1, grid.maxGridCount, 'count'))
      continue
    }
    if (count > grid.maxGridCount) {
      issues.push(invalidRange(field, 1, grid.maxGridCount, 'count'))
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters: HswCellParameters = {
    rows: candidate.rows as number,
    columns: candidate.columns as number,
  }
  const bounds = boundsForHswCell(parameters)
  const width = bounds.max[0] - bounds.min[0]
  const depth = bounds.max[1] - bounds.min[1]

  if (width > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push(invalidRange('columns', 1, grid.maxGridCount, 'count'))
  }
  if (depth > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push(invalidRange('rows', 1, grid.maxGridCount, 'count'))
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

export function validateHexagonalColumnParameters(
  value: unknown,
): HexagonalColumnValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const candidate = value as Partial<
    Record<HexagonalColumnParameterKey, unknown>
  > &
    Record<string, unknown>
  const issues: ValidationIssue[] = []

  if (
    !hasOnlySupportedKeys(candidate, HEXAGONAL_COLUMN_PARAMETERS) ||
    !HEXAGONAL_COLUMN_REQUIRED_PARAMETERS.every((key) =>
      Object.prototype.hasOwnProperty.call(candidate, key),
    )
  ) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  const height = candidate.height
  if (typeof height !== 'number' || !Number.isFinite(height)) {
    issues.push({ field: 'height', messageId: 'validation.invalid' })
  } else if (!Number.isSafeInteger(height)) {
    issues.push({ field: 'height', messageId: 'validation.invalid' })
  } else if (
    height < HEXAGONAL_COLUMN_CONFIGURATION.minHeight ||
    height > HEXAGONAL_COLUMN_CONFIGURATION.maxHeight
  ) {
    issues.push(
      invalidRange(
        'height',
        HEXAGONAL_COLUMN_CONFIGURATION.minHeight,
        HEXAGONAL_COLUMN_CONFIGURATION.maxHeight,
      ),
    )
  }

  const count = candidate.count
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    issues.push({ field: 'count', messageId: 'validation.invalid' })
  } else if (!Number.isSafeInteger(count)) {
    issues.push({ field: 'count', messageId: 'validation.invalid' })
  } else if (
    count < HEXAGONAL_COLUMN_CONFIGURATION.minCount ||
    count > HEXAGONAL_COLUMN_CONFIGURATION.maxCount
  ) {
    issues.push(
      invalidRange(
        'count',
        HEXAGONAL_COLUMN_CONFIGURATION.minCount,
        HEXAGONAL_COLUMN_CONFIGURATION.maxCount,
        'count',
      ),
    )
  }

  const gap = candidate.gap
  if (typeof gap !== 'number' || !Number.isFinite(gap)) {
    issues.push({ field: 'gap', messageId: 'validation.invalid' })
  } else if (!Number.isSafeInteger(gap)) {
    issues.push({ field: 'gap', messageId: 'validation.invalid' })
  } else if (
    gap < HEXAGONAL_COLUMN_CONFIGURATION.minGap ||
    gap > HEXAGONAL_COLUMN_CONFIGURATION.maxGap
  ) {
    issues.push(
      invalidRange(
        'gap',
        HEXAGONAL_COLUMN_CONFIGURATION.minGap,
        HEXAGONAL_COLUMN_CONFIGURATION.maxGap,
      ),
    )
  }

  const orientation =
    candidate.orientation ?? HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation
  if (orientation !== 'lying' && orientation !== 'standing') {
    issues.push({
      field: 'orientation',
      messageId: 'validation.invalid',
    })
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters: HexagonalColumnParameters = {
    height: height as number,
    count: count as number,
    gap: gap as number,
    orientation: orientation as HexagonalColumnOrientation,
  }
  const bounds = boundsForHexagonalColumn(parameters)
  const rowExtent = bounds.max[1] - bounds.min[1]
  let lengthExtent = bounds.max[2] - bounds.min[2]
  if (parameters.orientation === 'lying') {
    lengthExtent = bounds.max[0] - bounds.min[0]
  }
  const exceedsWorkspace =
    rowExtent > PROTOTYPE_CONFIGURATION.maxDimension ||
    lengthExtent > HEXAGONAL_COLUMN_CONFIGURATION.maxHeight

  if (exceedsWorkspace) {
    if (rowExtent > PROTOTYPE_CONFIGURATION.maxDimension) {
      issues.push({
        field: 'gap',
        messageId: 'validation.invalid',
      })
    }
    if (lengthExtent > HEXAGONAL_COLUMN_CONFIGURATION.maxHeight) {
      issues.push({
        field: 'height',
        messageId: 'validation.invalid',
      })
    }
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

function isPlainEmptyObject(
  value: unknown,
): value is OpenGridSnapRemoverParameters {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return false
  return Object.keys(value).length === 0
}

export function validateOpenGridSnapRemoverParameters(
  value: unknown,
): OpenGridSnapRemoverValidation {
  if (!isPlainEmptyObject(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  return { valid: true, value }
}

export function validateModelParameters(
  modelId: unknown,
  value: unknown,
): ModelValidation {
  if (modelId === 'box') {
    const validation = validateBoxParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'modular-grid-base') {
    const validation = validateModularGridBaseParameters(value)
    if (!validation.valid) return validation
    return {
      valid: true,
      value: { modelId, parameters: validation.value },
    }
  }

  if (modelId === 'hsw-cell') {
    const validation = validateHswCellParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'hexagonal-column') {
    const validation = validateHexagonalColumnParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid') {
    const validation = validateOpenGridParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-stackable-box') {
    const validation = validateOpenGridStackableBoxParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-organizer-box') {
    const validation = validateOpenGridOrganizerBoxParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-stackable-cylinder') {
    const validation = validateOpenGridStackableCylinderParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-snap') {
    const validation = validateOpenGridSnapParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field as ValidationIssue['field'],
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-snap-remover') {
    const validation = validateOpenGridSnapRemoverParameters(value)
    if (!validation.valid) return validation
    return {
      valid: true,
      value: { modelId, parameters: validation.value },
    }
  }

  if (modelId === 'opengrid-divider') {
    const validation = validateOpenGridDividerParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-pillar') {
    const validation = validatePillarParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-open-shelf') {
    const validation = validateOpenGridOpenShelfParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  return {
    valid: false,
    issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
  }
}

export function boundsForBox(parameters: BoxParameters): BoxBounds {
  return {
    min: [-parameters.width / 2, -parameters.depth / 2, 0],
    max: [parameters.width / 2, parameters.depth / 2, parameters.height],
  }
}

export function boundsForModularGridBase(
  parameters: ModularGridBaseParameters,
): ModelBounds {
  const grid = PROTOTYPE_CONFIGURATION.modularGridBase
  const width = parameters.columns * grid.cellWidth
  const depth = parameters.rows * grid.cellDepth
  return {
    min: [-width / 2, -depth / 2, 0],
    max: [width / 2, depth / 2, grid.height],
  }
}

export function hswCellOffsetFor(
  parameters: HswCellParameters,
  row: number,
  column: number,
): HswCellOffset {
  const grid = HSW_CELL_CONFIGURATION
  const centeringOffsetY = parameters.columns === 1 ? 0 : grid.staggerY / 2
  return [
    (column - (parameters.columns - 1) / 2) * grid.columnPitch,
    (row - (parameters.rows - 1) / 2) * grid.rowPitch +
      (column % 2) * grid.staggerY -
      centeringOffsetY,
  ]
}

export function hswCellOffsetsForGrid(
  parameters: HswCellParameters,
): HswCellOffset[] {
  const offsets: HswCellOffset[] = []
  for (let row = 0; row < parameters.rows; row += 1) {
    for (let column = 0; column < parameters.columns; column += 1) {
      offsets.push(hswCellOffsetFor(parameters, row, column))
    }
  }
  return offsets
}

export function boundsForHswCell(parameters: HswCellParameters): ModelBounds {
  const grid = HSW_CELL_CONFIGURATION
  const width = grid.outerWidth + (parameters.columns - 1) * grid.columnPitch
  const depth =
    grid.outerDepth *
    (parameters.columns === 1 ? parameters.rows : parameters.rows + 0.5)
  return {
    min: [-width / 2, -depth / 2, 0],
    max: [width / 2, depth / 2, grid.outerHeight],
  }
}

export function boundsForHexagonalColumn(
  parameters: HexagonalColumnParameters,
): ModelBounds {
  const rowExtent =
    HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentY * parameters.count +
    parameters.gap * (parameters.count - 1)
  if (parameters.orientation === 'lying') {
    return {
      min: [-parameters.height / 2, -rowExtent / 2, 0],
      max: [
        parameters.height / 2,
        rowExtent / 2,
        HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX,
      ],
    }
  }

  return {
    min: [
      -HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX / 2,
      -rowExtent / 2,
      0,
    ],
    max: [
      HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX / 2,
      rowExtent / 2,
      parameters.height,
    ],
  }
}

export function boxFileName(parameters: BoxParameters): string {
  return `box-${parameters.width}x${parameters.depth}x${parameters.height}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function boxStlFileName(parameters: BoxParameters): string {
  return `box-${parameters.width}x${parameters.depth}x${parameters.height}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function modularGridBaseFileName(
  parameters: ModularGridBaseParameters,
): string {
  return `modular-grid-base-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function modularGridBaseStlFileName(
  parameters: ModularGridBaseParameters,
): string {
  return `modular-grid-base-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function hswCellFileName(parameters: HswCellParameters): string {
  return `hsw-cell-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function hswCellStlFileName(parameters: HswCellParameters): string {
  return `hsw-cell-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function hexagonalColumnFileName(
  parameters: HexagonalColumnParameters,
): string {
  return `hexagonal-column-${parameters.height}x${parameters.count}-g${parameters.gap}-${parameters.orientation}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function hexagonalColumnStlFileName(
  parameters: HexagonalColumnParameters,
): string {
  return `hexagonal-column-${parameters.height}x${parameters.count}-g${parameters.gap}-${parameters.orientation}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function openGridSnapRemoverFileName(
  parameters: OpenGridSnapRemoverParameters,
): string {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return `snap remover${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function openGridSnapRemoverStlFileName(
  parameters: OpenGridSnapRemoverParameters,
): string {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return `snap remover${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function boundsForOpenGridSnapRemover(
  parameters: OpenGridSnapRemoverParameters,
): ModelBounds {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }

  return {
    min: [-17.202743248030416, -20.00551582963562, -5.005506125135993],
    max: [21.276570355137718, 20.00551582963562, 5.005506125135993],
  }
}

export function isBoxParameters(value: unknown): value is BoxParameters {
  return validateBoxParameters(value).valid
}

export function isModularGridBaseParameters(
  value: unknown,
): value is ModularGridBaseParameters {
  return validateModularGridBaseParameters(value).valid
}

export function isHswCellParameters(
  value: unknown,
): value is HswCellParameters {
  return validateHswCellParameters(value).valid
}

export function isHexagonalColumnParameters(
  value: unknown,
): value is HexagonalColumnParameters {
  return validateHexagonalColumnParameters(value).valid
}

export function isOpenGridModelParameters(
  value: unknown,
): value is OpenGridParameters {
  return isOpenGridParameters(value)
}

export function isOpenGridStackableBoxModelParameters(
  value: unknown,
): value is OpenGridStackableBoxParameters {
  return isOpenGridStackableBoxParameters(value)
}

export function isOpenGridOrganizerBoxModelParameters(
  value: unknown,
): value is OpenGridOrganizerBoxParameters {
  return isOpenGridOrganizerBoxParameters(value)
}

export function isOpenGridStackableCylinderModelParameters(
  value: unknown,
): value is OpenGridStackableCylinderParameters {
  return isOpenGridStackableCylinderParameters(value)
}

export function isOpenGridSnapModelParameters(
  value: unknown,
): value is OpenGridSnapParameters {
  return isOpenGridSnapParameters(value)
}

export function isOpenGridSnapRemoverParameters(
  value: unknown,
): value is OpenGridSnapRemoverParameters {
  return validateOpenGridSnapRemoverParameters(value).valid
}

export function isOpenGridDividerModelParameters(
  value: unknown,
): value is OpenGridDividerParameters {
  return isOpenGridDividerParameters(value)
}

export function isPillarModelParameters(
  value: unknown,
): value is PillarParameters {
  return isPillarParameters(value)
}

export function isOpenGridOpenShelfModelParameters(
  value: unknown,
): value is OpenGridOpenShelfParameters {
  return isOpenGridOpenShelfParameters(value)
}

export function isModelParameters(value: unknown): value is ModelParameters {
  if (!value || typeof value !== 'object') return false
  const model = value as { modelId?: unknown; parameters?: unknown }
  return validateModelParameters(model.modelId, model.parameters).valid
}

export function boundsForModel(model: ModelParameters): ModelBounds {
  switch (model.modelId) {
    case 'box':
      return boundsForBox(model.parameters)
    case 'modular-grid-base':
      return boundsForModularGridBase(model.parameters)
    case 'hsw-cell':
      return boundsForHswCell(model.parameters)
    case 'hexagonal-column':
      return boundsForHexagonalColumn(model.parameters)
    case 'opengrid':
      return boundsForOpenGrid(model.parameters)
    case 'opengrid-stackable-box':
      return boundsForOpenGridStackableBox(model.parameters)
    case 'opengrid-organizer-box':
      return boundsForOpenGridOrganizerBox(model.parameters)
    case 'opengrid-stackable-cylinder':
      return boundsForOpenGridStackableCylinder(model.parameters)
    case 'opengrid-snap':
      return boundsForOpenGridSnap(model.parameters)
    case 'opengrid-snap-remover':
      return boundsForOpenGridSnapRemover(model.parameters)
    case 'opengrid-divider':
      return boundsForOpenGridDivider(model.parameters)
    case 'opengrid-pillar':
      return boundsForPillar(model.parameters)
    case 'opengrid-open-shelf':
      return boundsForOpenGridOpenShelf(model.parameters)
  }
}

export function modelFileName(model: ModelParameters): string {
  switch (model.modelId) {
    case 'box':
      return boxFileName(model.parameters)
    case 'modular-grid-base':
      return modularGridBaseFileName(model.parameters)
    case 'hsw-cell':
      return hswCellFileName(model.parameters)
    case 'hexagonal-column':
      return hexagonalColumnFileName(model.parameters)
    case 'opengrid':
      return openGridFileName(model.parameters)
    case 'opengrid-stackable-box':
      return openGridStackableBoxFileName(model.parameters)
    case 'opengrid-organizer-box':
      return openGridOrganizerBoxFileName(model.parameters)
    case 'opengrid-stackable-cylinder':
      return openGridStackableCylinderFileName(model.parameters)
    case 'opengrid-snap':
      return openGridSnapFileName(model.parameters)
    case 'opengrid-snap-remover':
      return openGridSnapRemoverFileName(model.parameters)
    case 'opengrid-divider':
      return openGridDividerFileName(model.parameters)
    case 'opengrid-pillar':
      return pillarFileName(model.parameters)
    case 'opengrid-open-shelf':
      return openGridOpenShelfFileName(model.parameters)
  }
}

export function modelStlFileName(model: ModelParameters): string {
  switch (model.modelId) {
    case 'box':
      return boxStlFileName(model.parameters)
    case 'modular-grid-base':
      return modularGridBaseStlFileName(model.parameters)
    case 'hsw-cell':
      return hswCellStlFileName(model.parameters)
    case 'hexagonal-column':
      return hexagonalColumnStlFileName(model.parameters)
    case 'opengrid':
      return openGridStlFileName(model.parameters)
    case 'opengrid-stackable-box':
      return openGridStackableBoxStlFileName(model.parameters)
    case 'opengrid-organizer-box':
      return openGridOrganizerBoxStlFileName(model.parameters)
    case 'opengrid-stackable-cylinder':
      return openGridStackableCylinderStlFileName(model.parameters)
    case 'opengrid-snap':
      return openGridSnapStlFileName(model.parameters)
    case 'opengrid-snap-remover':
      return openGridSnapRemoverStlFileName(model.parameters)
    case 'opengrid-divider':
      return openGridDividerStlFileName(model.parameters)
    case 'opengrid-pillar':
      return pillarStlFileName(model.parameters)
    case 'opengrid-open-shelf':
      return openGridOpenShelfStlFileName(model.parameters)
  }
}
