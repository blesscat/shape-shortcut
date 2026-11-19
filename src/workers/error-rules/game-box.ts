/**
 * Error rules owned by the `game-box` component.
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
    order: 1700,
    pattern: 'GAME_BOX_GEOMETRY_INVALID',
    code: 'GAME_BOX_GEOMETRY_INVALID',
  },
  {
    order: 1800,
    pattern: 'MODEL_PARAMETERS_MISMATCH:game-box',
    code: 'INVALID_INPUT',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  { order: 800, pattern: 'GAME_BOX_GEOMETRY_INVALID', stage: 'building' },
]
