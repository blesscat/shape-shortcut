/**
 * Error rules owned by the `opengrid-snap-remover` component.
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
    order: 3207,
    pattern: 'OPENGRID_SNAP_REMOVER_ASSET',
    code: 'MODEL_ASSET_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = []
