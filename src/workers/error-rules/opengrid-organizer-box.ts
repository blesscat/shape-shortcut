/**
 * Error rules owned by the `opengrid-organizer-box` component.
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
    order: 806,
    pattern: 'OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID',
    code: 'INVALID_INPUT',
  },
  {
    order: 807,
    pattern: 'MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box',
    code: 'INVALID_INPUT',
  },
  {
    order: 2605,
    pattern: 'OPENGRID_ORGANIZER_BOX_',
    code: 'OPENGRID_QUALITY_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  { order: 1604, pattern: 'OPENGRID_ORGANIZER_BOX_', stage: 'meshing' },
]
