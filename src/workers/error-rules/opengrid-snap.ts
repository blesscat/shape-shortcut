/**
 * Error rules owned by the `opengrid-snap` component.
 *
 * The `order` key is the position of the rule in the first-match order that
 * `src/workers/error-mapping.ts` applies. It is unique within its list (the
 * code rules or the stage rules) across every rule module, so a new rule can
 * be inserted between two existing ones without renumbering them.
 */
import type {
  CadErrorCodeRule,
  CadErrorStageRule,
} from '../error-mapping-rules'

export const codeRules: readonly CadErrorCodeRule[] = [
  {
    order: 800,
    pattern: 'OPENGRID_SNAP_PARAMETERS_INVALID',
    code: 'INVALID_INPUT',
  },
  {
    order: 801,
    pattern: 'MODEL_PARAMETERS_MISMATCH:opengrid-snap',
    code: 'INVALID_INPUT',
  },
  {
    order: 900,
    pattern: 'OPENGRID_SNAP_QUALITY_INVALID',
    code: 'OPENGRID_SNAP_QUALITY_INVALID',
  },
  {
    order: 2000,
    pattern: 'OPENGRID_SNAP_HOLD_REFERENCE_MISSING',
    code: 'MODEL_ASSET_INVALID',
  },
  {
    order: 2001,
    pattern: 'OPENGRID_SNAP_HOLD_REFERENCE_INVALID',
    code: 'MODEL_ASSET_INVALID',
  },
  {
    order: 2002,
    pattern: 'OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED',
    code: 'MODEL_ASSET_INVALID',
  },
  {
    order: 2100,
    pattern: 'OPENGRID_SNAP_HOLD_',
    code: 'OPENGRID_QUALITY_INVALID',
  },
  { order: 3205, pattern: 'OPENGRID_SNAP_ASSET', code: 'MODEL_ASSET_INVALID' },
  {
    order: 3206,
    pattern: 'OPENGRID_SNAP_OPEN_CONNECT_HEAD',
    code: 'MODEL_ASSET_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  { order: 200, pattern: 'OPENGRID_SNAP_QUALITY_INVALID', stage: 'meshing' },
  {
    order: 1000,
    pattern: 'OPENGRID_SNAP_HOLD_REFERENCE_',
    stage: 'initializing',
  },
  { order: 1200, pattern: 'OPENGRID_SNAP_HOLD_', stage: 'meshing' },
]
