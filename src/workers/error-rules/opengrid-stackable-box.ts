/**
 * Error rules owned by the `opengrid-stackable-box` component.
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
    order: 2300,
    pattern: 'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT',
    code: 'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT',
  },
  {
    order: 2604,
    pattern: 'OPENGRID_STACKABLE_BOX_',
    code: 'OPENGRID_QUALITY_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  {
    order: 1300,
    pattern: 'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT',
    stage: 'building',
  },
  { order: 1603, pattern: 'OPENGRID_STACKABLE_BOX_', stage: 'meshing' },
]
