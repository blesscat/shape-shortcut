/**
 * Error rules owned by the `opengrid-divider` component.
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
    order: 2400,
    pattern: 'OPENGRID_DIVIDER_HONEYCOMB_MEMORY_LIMIT',
    code: 'OPENGRID_DIVIDER_HONEYCOMB_MEMORY_LIMIT',
  },
  {
    order: 2700,
    pattern: 'OPENGRID_DIVIDER_QUALITY_INVALID',
    code: 'OPENGRID_DIVIDER_QUALITY_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  {
    order: 1400,
    pattern: 'OPENGRID_DIVIDER_HONEYCOMB_MEMORY_LIMIT',
    stage: 'building',
  },
  {
    order: 1700,
    pattern: 'OPENGRID_DIVIDER_QUALITY_INVALID',
    stage: 'meshing',
  },
]
