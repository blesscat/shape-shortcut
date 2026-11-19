/**
 * Error rules owned by the `opengrid-openconnect-organizer` component.
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
    order: 808,
    pattern: 'MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer',
    code: 'INVALID_INPUT',
  },
  {
    order: 2602,
    pattern: 'OPENGRID_OPENCONNECT_ORGANIZER_QUALITY_FAILED',
    code: 'OPENGRID_QUALITY_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  {
    order: 1602,
    pattern: 'OPENGRID_OPENCONNECT_ORGANIZER_QUALITY_FAILED',
    stage: 'meshing',
  },
]
