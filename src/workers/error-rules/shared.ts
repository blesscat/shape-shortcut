/**
 * Error rules that are not owned by a single CAD component.
 *
 * The `order` key is the position of the rule in the first-match order that
 * `src/workers/error-mapping.ts` applies. It is unique across every rule
 * module, so a new rule can be inserted between two existing ones without
 * renumbering them.
 */

import type {
  CadErrorCodeRule,
  CadErrorStageRule,
} from '../error-mapping-rules'

export const codeRules: readonly CadErrorCodeRule[] = [
  {
    order: 100,
    pattern: 'MODEL_REVISION_MISSING',
    code: 'MODEL_REVISION_MISSING',
  },
  { order: 200, pattern: 'WORKER_RESTARTED', code: 'WORKER_RESTARTED' },
  { order: 300, pattern: 'CANDIDATE_MISSING', code: 'CANDIDATE_ORPHANED' },
  { order: 400, pattern: 'CANDIDATE_CAPACITY', code: 'CANDIDATE_CAPACITY' },
  { order: 500, pattern: 'ENGINE_NOT_READY', code: 'ENGINE_INIT_FAILED' },
  { order: 600, pattern: 'MODEL_PARAMETERS_INVALID', code: 'INVALID_INPUT' },
  { order: 601, pattern: 'INVALID_INPUT', code: 'INVALID_INPUT', exact: true },
  {
    order: 700,
    pattern: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
    code: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
  },
  {
    order: 2200,
    pattern: 'OPENGRID_DETACHABLE_CORNER_SEAT_',
    code: 'MODEL_ASSET_INVALID',
  },
  {
    order: 2500,
    pattern: 'OPENGRID_HONEYCOMB_MEMORY_LIMIT',
    code: 'OPENGRID_HONEYCOMB_MEMORY_LIMIT',
  },
  {
    order: 2600,
    pattern: 'OPENGRID_QUALITY_INVALID',
    code: 'OPENGRID_QUALITY_INVALID',
  },
  {
    order: 2603,
    pattern: 'OPENGRID_BREP_INVALID',
    code: 'OPENGRID_QUALITY_INVALID',
  },
  {
    order: 2800,
    pattern: 'STEP_METADATA_INVALID',
    code: 'STEP_METADATA_INVALID',
  },
  {
    order: 2900,
    pattern: 'STL_METADATA_INVALID',
    code: 'STL_METADATA_INVALID',
  },
  {
    order: 3000,
    pattern: 'THREEMF_METADATA_INVALID',
    code: 'THREEMF_METADATA_INVALID',
  },
  { order: 3100, pattern: 'MESH_INVALID', code: 'MESH_INVALID' },
  { order: 3200, pattern: 'MODEL_ASSET_INVALID', code: 'MODEL_ASSET_INVALID' },
  {
    order: 3204,
    pattern: 'MODEL_ASSET_CONTEXT_MISSING',
    code: 'MODEL_ASSET_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  {
    order: 100,
    pattern: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
    stage: 'validation',
  },
  {
    order: 1100,
    pattern: 'OPENGRID_DETACHABLE_CORNER_SEAT_',
    stage: 'initializing',
  },
  {
    order: 1500,
    pattern: 'OPENGRID_HONEYCOMB_MEMORY_LIMIT',
    stage: 'building',
  },
  { order: 1600, pattern: 'OPENGRID_QUALITY_INVALID', stage: 'meshing' },
  { order: 1800, pattern: 'MESH_INVALID', stage: 'meshing' },
]
