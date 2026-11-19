/**
 * Error rules owned by the `hsw-cell` component.
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
  { order: 3202, pattern: 'HSW_CELL_ASSET', code: 'MODEL_ASSET_INVALID' },
]

export const stageRules: readonly CadErrorStageRule[] = []
