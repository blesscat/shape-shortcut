/**
 * Error rules owned by the `opengrid-label-slot-test` component.
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
    order: 1200,
    pattern: 'OPENGRID_LABEL_SLOT_TEST_QUALITY_INVALID',
    code: 'OPENGRID_LABEL_SLOT_TEST_QUALITY_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  {
    order: 401,
    pattern: 'OPENGRID_LABEL_SLOT_TEST_QUALITY_INVALID',
    stage: 'meshing',
  },
]
