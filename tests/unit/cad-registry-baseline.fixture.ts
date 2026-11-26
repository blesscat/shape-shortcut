import type { CadErrorCode, CadErrorStage } from '../../src/cad-contract/errors'
import type { WorkerCommand } from '../../src/cad-contract/messages'
import type { ModelId } from '../../src/cad-contract/units'

export type WorkerCommandKind = WorkerCommand['kind']

export type KernelModelGoldenEntry = {
  readonly id: ModelId
  readonly invalidParametersError: string
}

export const KERNEL_MODEL_GOLDEN_ENTRIES: Readonly<
  Record<ModelId, KernelModelGoldenEntry>
> = {
  box: { id: 'box', invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:box' },
  'modular-grid-base': {
    id: 'modular-grid-base',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:modular-grid-base',
  },
  'hsw-cell': {
    id: 'hsw-cell',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:hsw-cell',
  },
  'hexagonal-column': {
    id: 'hexagonal-column',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:hexagonal-column',
  },
  'card-box': {
    id: 'card-box',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:card-box',
  },
  'game-box': {
    id: 'game-box',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:game-box',
  },
  opengrid: {
    id: 'opengrid',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:opengrid',
  },
  'opengrid-stackable-box': {
    id: 'opengrid-stackable-box',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box',
  },
  'opengrid-organizer-box': {
    id: 'opengrid-organizer-box',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box',
  },
  'opengrid-stackable-cylinder': {
    id: 'opengrid-stackable-cylinder',
    invalidParametersError:
      'MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder',
  },
  'opengrid-snap': {
    id: 'opengrid-snap',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:opengrid-snap',
  },
  'opengrid-wall-cover': {
    id: 'opengrid-wall-cover',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover',
  },
  'opengrid-snap-remover': {
    id: 'opengrid-snap-remover',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover',
  },
  'opengrid-divider': {
    id: 'opengrid-divider',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:opengrid-divider',
  },
  'opengrid-pillar': {
    id: 'opengrid-pillar',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:opengrid-pillar',
  },
  'opengrid-open-shelf': {
    id: 'opengrid-open-shelf',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf',
  },
  'opengrid-openconnect-shelf': {
    id: 'opengrid-openconnect-shelf',
    invalidParametersError:
      'MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-shelf',
  },
  'opengrid-openconnect-tissue-box': {
    id: 'opengrid-openconnect-tissue-box',
    invalidParametersError: 'INVALID_INPUT',
  },
  'opengrid-openconnect-organizer': {
    id: 'opengrid-openconnect-organizer',
    invalidParametersError:
      'MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer',
  },
  'opengrid-label-card': {
    id: 'opengrid-label-card',
    invalidParametersError: 'MODEL_PARAMETERS_MISMATCH:opengrid-label-card',
  },
  'opengrid-label-slot-test': {
    id: 'opengrid-label-slot-test',
    invalidParametersError:
      'MODEL_PARAMETERS_MISMATCH:opengrid-label-slot-test',
  },
  'opengrid-label-ledge-test': {
    id: 'opengrid-label-ledge-test',
    invalidParametersError:
      'MODEL_PARAMETERS_MISMATCH:opengrid-label-ledge-test',
  },
}

export const KERNEL_MODEL_WITH_PARTS_MISMATCH_IDS: ReadonlySet<ModelId> =
  new Set<ModelId>([
    'opengrid-wall-cover',
    'opengrid-stackable-cylinder',
    'opengrid-stackable-box',
    'opengrid-organizer-box',
    'opengrid-divider',
    'opengrid-openconnect-organizer',
    'opengrid-label-card',
    // game-box owns buildWithParts (the cover and labelled dividers export
    // separated body/accent parts), so its with-parts guard throws its own
    // mismatch error like every other multipart model.
    'game-box',
    'card-box',
  ])

export type ErrorRuleGoldenCase = {
  readonly rule: string
  readonly message: string
  readonly exactMatchOnly?: boolean
  readonly code: CadErrorCode
  readonly stageOnGenerate: CadErrorStage
}

export const ERROR_RULE_GOLDEN_CASES: readonly ErrorRuleGoldenCase[] = [
  {
    rule: 'MODEL_REVISION_MISSING',
    message: 'MODEL_REVISION_MISSING',
    code: 'MODEL_REVISION_MISSING',
    stageOnGenerate: 'building',
  },
  {
    rule: 'WORKER_RESTARTED',
    message: 'WORKER_RESTARTED',
    code: 'WORKER_RESTARTED',
    stageOnGenerate: 'building',
  },
  {
    rule: 'CANDIDATE_MISSING',
    message: 'CANDIDATE_MISSING',
    code: 'CANDIDATE_ORPHANED',
    stageOnGenerate: 'building',
  },
  {
    rule: 'CANDIDATE_CAPACITY',
    message: 'CANDIDATE_CAPACITY',
    code: 'CANDIDATE_CAPACITY',
    stageOnGenerate: 'building',
  },
  {
    rule: 'ENGINE_NOT_READY',
    message: 'ENGINE_NOT_READY',
    code: 'ENGINE_INIT_FAILED',
    stageOnGenerate: 'building',
  },
  {
    rule: 'MODEL_PARAMETERS_INVALID',
    message: 'MODEL_PARAMETERS_INVALID',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'INVALID_INPUT',
    message: 'INVALID_INPUT',
    exactMatchOnly: true,
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
    message: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
    code: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
    stageOnGenerate: 'validation',
  },
  {
    rule: 'OPENGRID_SNAP_PARAMETERS_INVALID',
    message: 'OPENGRID_SNAP_PARAMETERS_INVALID',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'MODEL_PARAMETERS_MISMATCH:opengrid-snap',
    message: 'MODEL_PARAMETERS_MISMATCH:opengrid-snap',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover',
    message: 'MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'MODEL_PARAMETERS_MISMATCH:opengrid-label-card',
    message: 'MODEL_PARAMETERS_MISMATCH:opengrid-label-card',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_STACKABLE_CYLINDER_PARAMETERS_INVALID',
    message: 'OPENGRID_STACKABLE_CYLINDER_PARAMETERS_INVALID',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder',
    message: 'MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID',
    message: 'OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box',
    message: 'MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer',
    message: 'MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_SNAP_QUALITY_INVALID',
    message: 'OPENGRID_SNAP_QUALITY_INVALID',
    code: 'OPENGRID_SNAP_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_WALL_COVER_QUALITY_INVALID',
    message: 'OPENGRID_WALL_COVER_QUALITY_INVALID',
    code: 'OPENGRID_WALL_COVER_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_LABEL_CARD_QUALITY_INVALID',
    message: 'OPENGRID_LABEL_CARD_QUALITY_INVALID',
    code: 'OPENGRID_LABEL_CARD_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_LABEL_SLOT_TEST_QUALITY_INVALID',
    message: 'OPENGRID_LABEL_SLOT_TEST_QUALITY_INVALID',
    code: 'OPENGRID_LABEL_SLOT_TEST_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_LABEL_CARD_PARTS_INVALID',
    message: 'OPENGRID_LABEL_CARD_PARTS_INVALID',
    code: 'OPENGRID_LABEL_CARD_PARTS_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'LABEL_CARD_TEXT_TOO_WIDE',
    message: 'LABEL_CARD_TEXT_TOO_WIDE',
    code: 'LABEL_CARD_ACCENT_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'LABEL_CARD_ICON_UNKNOWN',
    message: 'LABEL_CARD_ICON_UNKNOWN',
    code: 'LABEL_CARD_ACCENT_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'LABEL_CARD_ICON_GEOMETRY_FAILED',
    message: 'LABEL_CARD_ICON_GEOMETRY_FAILED',
    code: 'LABEL_CARD_ACCENT_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'LABEL_CARD_TEXT_GLYPH_UNSUPPORTED',
    message: 'LABEL_CARD_TEXT_GLYPH_UNSUPPORTED',
    code: 'LABEL_CARD_ACCENT_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'LABEL_CARD_FONT_LOAD_FAILED',
    message: 'LABEL_CARD_FONT_LOAD_FAILED',
    code: 'LABEL_CARD_ACCENT_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'CARD_BOX_DIVIDER_TEXT_TOO_WIDE',
    message: 'CARD_BOX_DIVIDER_TEXT_TOO_WIDE',
    code: 'CARD_BOX_GEOMETRY_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA',
    message: 'CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA',
    code: 'CARD_BOX_GEOMETRY_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'CARD_BOX_SVG_',
    message: 'CARD_BOX_SVG_INVALID',
    code: 'CARD_BOX_GEOMETRY_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'MODEL_PARAMETERS_MISMATCH:card-box',
    message: 'MODEL_PARAMETERS_MISMATCH:card-box',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'GAME_BOX_DIVIDER_TEXT_TOO_WIDE',
    message: 'GAME_BOX_DIVIDER_TEXT_TOO_WIDE',
    code: 'GAME_BOX_GEOMETRY_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA',
    message: 'GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA',
    code: 'GAME_BOX_GEOMETRY_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'GAME_BOX_SVG_',
    message: 'GAME_BOX_SVG_INVALID',
    code: 'GAME_BOX_GEOMETRY_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'GAME_BOX_GEOMETRY_INVALID',
    message: 'GAME_BOX_GEOMETRY_INVALID',
    code: 'GAME_BOX_GEOMETRY_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'MODEL_PARAMETERS_MISMATCH:game-box',
    message: 'MODEL_PARAMETERS_MISMATCH:game-box',
    code: 'INVALID_INPUT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
    message: 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
    code: 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_STACKABLE_CYLINDER_OPENINGS_INVALID',
    message: 'OPENGRID_STACKABLE_CYLINDER_OPENINGS_INVALID',
    code: 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_SNAP_HOLD_REFERENCE_MISSING',
    message: 'OPENGRID_SNAP_HOLD_REFERENCE_MISSING',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'initializing',
  },
  {
    rule: 'OPENGRID_SNAP_HOLD_REFERENCE_INVALID',
    message: 'OPENGRID_SNAP_HOLD_REFERENCE_INVALID',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'initializing',
  },
  {
    rule: 'OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED',
    message: 'OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'initializing',
  },
  {
    rule: 'OPENGRID_SNAP_HOLD_',
    message: 'OPENGRID_SNAP_HOLD_INTERFACE_MISMATCH',
    code: 'OPENGRID_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_DETACHABLE_CORNER_SEAT_',
    message: 'OPENGRID_DETACHABLE_CORNER_SEAT_REFERENCE_INVALID',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'initializing',
  },
  {
    rule: 'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT',
    message: 'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:4097',
    code: 'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_DIVIDER_HONEYCOMB_MEMORY_LIMIT',
    message: 'OPENGRID_DIVIDER_HONEYCOMB_MEMORY_LIMIT:4097',
    code: 'OPENGRID_DIVIDER_HONEYCOMB_MEMORY_LIMIT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_HONEYCOMB_MEMORY_LIMIT',
    message: 'OPENGRID_HONEYCOMB_MEMORY_LIMIT:4097',
    code: 'OPENGRID_HONEYCOMB_MEMORY_LIMIT',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_QUALITY_INVALID',
    message: 'OPENGRID_QUALITY_INVALID',
    code: 'OPENGRID_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_OPENCONNECT_SHELF_QUALITY_FAILED',
    message: 'OPENGRID_OPENCONNECT_SHELF_QUALITY_FAILED',
    code: 'OPENGRID_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_OPENCONNECT_ORGANIZER_QUALITY_FAILED',
    message: 'OPENGRID_OPENCONNECT_ORGANIZER_QUALITY_FAILED',
    code: 'OPENGRID_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_BREP_INVALID',
    message: 'OPENGRID_BREP_INVALID',
    code: 'OPENGRID_QUALITY_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_STACKABLE_BOX_',
    message: 'OPENGRID_STACKABLE_BOX_THICK_SHELL_INVALID',
    code: 'OPENGRID_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_ORGANIZER_BOX_',
    message: 'OPENGRID_ORGANIZER_BOX_COMPARTMENT_INVALID',
    code: 'OPENGRID_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'OPENGRID_DIVIDER_QUALITY_INVALID',
    message: 'OPENGRID_DIVIDER_QUALITY_INVALID',
    code: 'OPENGRID_DIVIDER_QUALITY_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'STEP_METADATA_INVALID',
    message: 'STEP_METADATA_INVALID',
    code: 'STEP_METADATA_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'STL_METADATA_INVALID',
    message: 'STL_METADATA_INVALID',
    code: 'STL_METADATA_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'THREEMF_METADATA_INVALID',
    message: 'THREEMF_METADATA_INVALID',
    code: 'THREEMF_METADATA_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'MESH_INVALID',
    message: 'MESH_INVALID',
    code: 'MESH_INVALID',
    stageOnGenerate: 'meshing',
  },
  {
    rule: 'MODEL_ASSET_INVALID',
    message: 'MODEL_ASSET_INVALID',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'GRID_TEMPLATE',
    message: 'GRID_TEMPLATE_BOUNDS_INVALID',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'HSW_CELL_ASSET',
    message: 'HSW_CELL_ASSET_BOUNDS_INVALID',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'HEXAGONAL_COLUMN_ASSET',
    message: 'HEXAGONAL_COLUMN_ASSET_BOUNDS_INVALID',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'MODEL_ASSET_CONTEXT_MISSING',
    message: 'MODEL_ASSET_CONTEXT_MISSING:test',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_SNAP_ASSET',
    message: 'OPENGRID_SNAP_ASSET_MISSING',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_SNAP_OPEN_CONNECT_HEAD',
    message: 'OPENGRID_SNAP_OPEN_CONNECT_HEAD_MISSING',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_SNAP_REMOVER_ASSET',
    message: 'OPENGRID_SNAP_REMOVER_ASSET_MISSING',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_WALL_COVER_ASSET',
    message: 'OPENGRID_WALL_COVER_ASSET_MISSING',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'building',
  },
  {
    rule: 'OPENGRID_OPENCONNECT_SLOT_ASSET',
    message: 'OPENGRID_OPENCONNECT_SLOT_ASSET_MISSING',
    code: 'MODEL_ASSET_INVALID',
    stageOnGenerate: 'building',
  },
]

export const ERROR_STAGE_PREFIX_GOLDEN_CASES: readonly ErrorRuleGoldenCase[] = [
  {
    rule: 'OPENGRID_SNAP_HOLD_REFERENCE_',
    message: 'OPENGRID_SNAP_HOLD_REFERENCE_CUSTOM',
    code: 'OPENGRID_QUALITY_INVALID',
    stageOnGenerate: 'initializing',
  },
]

/**
 * Every error-stage rule the Worker error mapping must contain.
 *
 * The code rules are already covered one by one by
 * `ERROR_RULE_GOLDEN_CASES`. The stage rules only have one behavioural case,
 * so their names are listed here to make the rule set exhaustiveness-checkable:
 * a stage rule that is added without being recorded here must fail a test.
 */
export const ERROR_STAGE_RULE_NAMES: readonly string[] = [
  'OPENGRID_UNSUPPORTED_CONFIGURATION',
  'OPENGRID_SNAP_QUALITY_INVALID',
  'OPENGRID_WALL_COVER_QUALITY_INVALID',
  'OPENGRID_LABEL_CARD_QUALITY_INVALID',
  'OPENGRID_LABEL_SLOT_TEST_QUALITY_INVALID',
  'CARD_BOX_DIVIDER_TEXT_TOO_WIDE',
  'CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA',
  'CARD_BOX_SVG_',
  'GAME_BOX_DIVIDER_TEXT_TOO_WIDE',
  'GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA',
  'GAME_BOX_SVG_',
  'GAME_BOX_GEOMETRY_INVALID',
  'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
  'OPENGRID_STACKABLE_CYLINDER_OPENINGS_INVALID',
  'OPENGRID_SNAP_HOLD_REFERENCE_',
  'OPENGRID_DETACHABLE_CORNER_SEAT_',
  'OPENGRID_SNAP_HOLD_',
  'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT',
  'OPENGRID_DIVIDER_HONEYCOMB_MEMORY_LIMIT',
  'OPENGRID_HONEYCOMB_MEMORY_LIMIT',
  'OPENGRID_QUALITY_INVALID',
  'OPENGRID_OPENCONNECT_SHELF_QUALITY_FAILED',
  'OPENGRID_OPENCONNECT_ORGANIZER_QUALITY_FAILED',
  'OPENGRID_STACKABLE_BOX_',
  'OPENGRID_ORGANIZER_BOX_',
  'OPENGRID_DIVIDER_QUALITY_INVALID',
  'MESH_INVALID',
]

export const COMMAND_KIND_FALLBACK_GOLDEN_CASES: Readonly<
  Record<
    WorkerCommandKind,
    { readonly code: CadErrorCode; readonly stage: CadErrorStage }
  >
> = {
  'engine.init': { code: 'ENGINE_INIT_FAILED', stage: 'initializing' },
  'model.generate': { code: 'MODEL_BUILD_FAILED', stage: 'building' },
  'model.invalidate': { code: 'MODEL_BUILD_FAILED', stage: 'worker' },
  'model.commit': { code: 'MODEL_BUILD_FAILED', stage: 'worker' },
  'model.discard': { code: 'MODEL_BUILD_FAILED', stage: 'worker' },
  'export.step': { code: 'STEP_EXPORT_FAILED', stage: 'exporting' },
  'export.stl': { code: 'STL_EXPORT_FAILED', stage: 'exporting' },
  'export.3mf': { code: 'THREEMF_EXPORT_FAILED', stage: 'exporting' },
  'scene.instance.generate': { code: 'MODEL_BUILD_FAILED', stage: 'building' },
  'scene.instance.export.step': {
    code: 'STEP_EXPORT_FAILED',
    stage: 'exporting',
  },
  'scene.instance.export.stl': {
    code: 'STL_EXPORT_FAILED',
    stage: 'exporting',
  },
  'worker.dispose': { code: 'MODEL_BUILD_FAILED', stage: 'worker' },
}
