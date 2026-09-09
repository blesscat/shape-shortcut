import type { DiagnosticDescriptor } from '../diagnostics'
import { diagnostic } from '../diagnostics'

export type CadErrorCode =
  | 'PROTOCOL_UNSUPPORTED'
  | 'PROTOCOL_INVALID'
  | 'ENGINE_INIT_FAILED'
  | 'ENGINE_TIMEOUT'
  | 'WORKER_TIMEOUT'
  | 'WORKER_RESTARTED'
  | 'WORKER_TERMINATED'
  | 'BROWSER_UNSUPPORTED'
  | 'INVALID_INPUT'
  | 'OPENGRID_UNSUPPORTED_CONFIGURATION'
  | 'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT'
  | 'OPENGRID_HONEYCOMB_MEMORY_LIMIT'
  | 'OPENGRID_QUALITY_INVALID'
  | 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID'
  | 'OPENGRID_SNAP_QUALITY_INVALID'
  | 'OPENGRID_WALL_COVER_QUALITY_INVALID'
  | 'OPENGRID_DIVIDER_QUALITY_INVALID'
  | 'MODEL_BUILD_FAILED'
  | 'MODEL_ASSET_INVALID'
  | 'MESH_INVALID'
  | 'MODEL_REVISION_MISSING'
  | 'STALE_GENERATION'
  | 'CANDIDATE_CAPACITY'
  | 'CANDIDATE_EXPIRED'
  | 'CANDIDATE_ORPHANED'
  | 'STEP_EXPORT_FAILED'
  | 'STEP_METADATA_INVALID'
  | 'STL_EXPORT_FAILED'
  | 'STL_METADATA_INVALID'
  | 'THREEMF_EXPORT_FAILED'
  | 'THREEMF_METADATA_INVALID'
  | 'UNKNOWN_ERROR'

export type CadErrorStage =
  | 'protocol'
  | 'initializing'
  | 'building'
  | 'meshing'
  | 'exporting'
  | 'worker'
  | 'validation'

export type CadError = {
  stage: CadErrorStage
  code: CadErrorCode
  message: DiagnosticDescriptor
  recoverable: boolean
  generation?: number
  modelRevision?: string
  requestId?: string
  operationId?: string
}

export function normalizeError(
  error: unknown,
  fallback: Partial<CadError> = {},
): CadError {
  void error
  return {
    stage: fallback.stage ?? 'worker',
    code: fallback.code ?? 'UNKNOWN_ERROR',
    message: fallback.message ?? diagnostic('diagnostic.unexpected'),
    recoverable: fallback.recoverable ?? true,
    generation: fallback.generation,
    modelRevision: fallback.modelRevision,
    requestId: fallback.requestId,
    operationId: fallback.operationId,
  }
}
