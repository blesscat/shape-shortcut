/**
 * Error rules owned by the `opengrid-wall-cover` component.
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
    order: 802,
    pattern: 'MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover',
    code: 'INVALID_INPUT',
  },
  {
    order: 1000,
    pattern: 'OPENGRID_WALL_COVER_QUALITY_INVALID',
    code: 'OPENGRID_WALL_COVER_QUALITY_INVALID',
  },
  {
    order: 3208,
    pattern: 'OPENGRID_WALL_COVER_ASSET',
    code: 'MODEL_ASSET_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  {
    order: 300,
    pattern: 'OPENGRID_WALL_COVER_QUALITY_INVALID',
    stage: 'meshing',
  },
]
