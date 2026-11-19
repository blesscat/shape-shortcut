/**
 * Error rules owned by the `modular-grid-base` component.
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
  { order: 3201, pattern: 'GRID_TEMPLATE', code: 'MODEL_ASSET_INVALID' },
]

export const stageRules: readonly CadErrorStageRule[] = []
