import type { CadErrorCode, CadErrorStage } from '../cad-contract/errors'
import type { WorkerCommand } from '../cad-contract/messages'

type WorkerCommandKind = WorkerCommand['kind']

export function cadErrorCodeFor(
  message: string,
  commandKind: WorkerCommandKind,
): CadErrorCode {
  if (message.includes('MODEL_REVISION_MISSING'))
    return 'MODEL_REVISION_MISSING'
  if (message.includes('WORKER_RESTARTED')) return 'WORKER_RESTARTED'
  if (message.includes('CANDIDATE_MISSING')) return 'CANDIDATE_ORPHANED'
  if (message.includes('CANDIDATE_CAPACITY')) return 'CANDIDATE_CAPACITY'
  if (message.includes('ENGINE_NOT_READY')) return 'ENGINE_INIT_FAILED'
  if (
    message.includes('MODEL_PARAMETERS_INVALID') ||
    message === 'INVALID_INPUT'
  ) {
    return 'INVALID_INPUT'
  }
  if (message.includes('OPENGRID_UNSUPPORTED_CONFIGURATION')) {
    return 'OPENGRID_UNSUPPORTED_CONFIGURATION'
  }
  if (
    message.includes('OPENGRID_SNAP_PARAMETERS_INVALID') ||
    message.includes('MODEL_PARAMETERS_MISMATCH:opengrid-snap') ||
    message.includes('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover') ||
    message.includes('OPENGRID_STACKABLE_CYLINDER_PARAMETERS_INVALID') ||
    message.includes('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder') ||
    message.includes('OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID') ||
    message.includes('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box') ||
    message.includes('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer')
  ) {
    return 'INVALID_INPUT'
  }
  if (message.includes('OPENGRID_SNAP_QUALITY_INVALID')) {
    return 'OPENGRID_SNAP_QUALITY_INVALID'
  }
  if (message.includes('OPENGRID_WALL_COVER_QUALITY_INVALID')) {
    return 'OPENGRID_WALL_COVER_QUALITY_INVALID'
  }
  if (
    message.includes('OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID') ||
    message.includes('OPENGRID_STACKABLE_CYLINDER_OPENINGS_INVALID')
  ) {
    return 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID'
  }
  if (
    message.includes('OPENGRID_SNAP_HOLD_REFERENCE_MISSING') ||
    message.includes('OPENGRID_SNAP_HOLD_REFERENCE_INVALID') ||
    message.includes('OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED')
  ) {
    return 'MODEL_ASSET_INVALID'
  }
  if (message.includes('OPENGRID_SNAP_HOLD_')) {
    return 'OPENGRID_QUALITY_INVALID'
  }
  if (message.includes('OPENGRID_DETACHABLE_CORNER_SEAT_')) {
    return 'MODEL_ASSET_INVALID'
  }
  if (message.includes('OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT')) {
    return 'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT'
  }
  if (
    message.includes('OPENGRID_QUALITY_INVALID') ||
    message.includes('OPENGRID_OPENCONNECT_SHELF_QUALITY_FAILED') ||
    message.includes('OPENGRID_OPENCONNECT_ORGANIZER_QUALITY_FAILED') ||
    message.includes('OPENGRID_BREP_INVALID') ||
    message.includes('OPENGRID_STACKABLE_BOX_') ||
    message.includes('OPENGRID_ORGANIZER_BOX_')
  ) {
    return 'OPENGRID_QUALITY_INVALID'
  }
  if (message.includes('OPENGRID_DIVIDER_QUALITY_INVALID')) {
    return 'OPENGRID_DIVIDER_QUALITY_INVALID'
  }
  if (message.includes('STEP_METADATA_INVALID')) return 'STEP_METADATA_INVALID'
  if (message.includes('STL_METADATA_INVALID')) return 'STL_METADATA_INVALID'
  if (message.includes('THREEMF_METADATA_INVALID')) {
    return 'THREEMF_METADATA_INVALID'
  }
  if (message.includes('MESH_INVALID')) return 'MESH_INVALID'
  if (
    message.includes('MODEL_ASSET_INVALID') ||
    message.includes('GRID_TEMPLATE') ||
    message.includes('HSW_CELL_ASSET') ||
    message.includes('HEXAGONAL_COLUMN_ASSET') ||
    message.includes('MODEL_ASSET_CONTEXT_MISSING') ||
    message.includes('OPENGRID_SNAP_ASSET') ||
    message.includes('OPENGRID_SNAP_OPEN_CONNECT_HEAD') ||
    message.includes('OPENGRID_SNAP_REMOVER_ASSET') ||
    message.includes('OPENGRID_WALL_COVER_ASSET') ||
    message.includes('OPENGRID_OPENCONNECT_SLOT_ASSET')
  ) {
    return 'MODEL_ASSET_INVALID'
  }
  if (commandKind === 'engine.init') return 'ENGINE_INIT_FAILED'
  if (commandKind === 'export.step') return 'STEP_EXPORT_FAILED'
  if (commandKind === 'export.stl') return 'STL_EXPORT_FAILED'
  if (commandKind === 'export.3mf') return 'THREEMF_EXPORT_FAILED'
  return 'MODEL_BUILD_FAILED'
}

export function cadErrorStageFor(
  commandKind: WorkerCommandKind,
  message = '',
): CadErrorStage {
  if (message.includes('OPENGRID_UNSUPPORTED_CONFIGURATION')) {
    return 'validation'
  }
  if (message.includes('OPENGRID_SNAP_QUALITY_INVALID')) return 'meshing'
  if (message.includes('OPENGRID_WALL_COVER_QUALITY_INVALID')) {
    return 'meshing'
  }
  if (
    message.includes('OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID') ||
    message.includes('OPENGRID_STACKABLE_CYLINDER_OPENINGS_INVALID')
  ) {
    return 'meshing'
  }
  if (message.includes('OPENGRID_SNAP_HOLD_REFERENCE_')) {
    return 'initializing'
  }
  if (message.includes('OPENGRID_DETACHABLE_CORNER_SEAT_')) {
    return 'initializing'
  }
  if (message.includes('OPENGRID_SNAP_HOLD_')) return 'meshing'
  if (message.includes('OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT')) {
    return 'building'
  }
  if (
    message.includes('OPENGRID_QUALITY_INVALID') ||
    message.includes('OPENGRID_OPENCONNECT_SHELF_QUALITY_FAILED') ||
    message.includes('OPENGRID_OPENCONNECT_ORGANIZER_QUALITY_FAILED') ||
    message.includes('OPENGRID_STACKABLE_BOX_') ||
    message.includes('OPENGRID_ORGANIZER_BOX_')
  ) {
    return 'meshing'
  }
  if (message.includes('OPENGRID_DIVIDER_QUALITY_INVALID')) return 'meshing'
  if (message.includes('MESH_INVALID')) return 'meshing'
  switch (commandKind) {
    case 'engine.init':
      return 'initializing'
    case 'export.step':
    case 'export.stl':
    case 'export.3mf':
      return 'exporting'
    case 'model.generate':
      return 'building'
    default:
      return 'worker'
  }
}
