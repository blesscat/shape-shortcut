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
  // The game-box art rules run ahead of card-box's art rules (1500ff): the
  // game-box builder re-prefixes the reused card-box builder errors, so its
  // own messages must resolve through game-box's descriptors and leave
  // card-box's rules free for card-box builds to delete at retirement.
  {
    order: 1410,
    pattern: 'GAME_BOX_DIVIDER_TEXT_TOO_WIDE',
    code: 'GAME_BOX_GEOMETRY_INVALID',
  },
  {
    order: 1411,
    pattern: 'GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA',
    code: 'GAME_BOX_GEOMETRY_INVALID',
  },
  {
    order: 1412,
    pattern: 'GAME_BOX_SVG_',
    code: 'GAME_BOX_GEOMETRY_INVALID',
  },
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
  { order: 410, pattern: 'GAME_BOX_DIVIDER_TEXT_TOO_WIDE', stage: 'building' },
  {
    order: 411,
    pattern: 'GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA',
    stage: 'building',
  },
  { order: 412, pattern: 'GAME_BOX_SVG_', stage: 'building' },
  { order: 800, pattern: 'GAME_BOX_GEOMETRY_INVALID', stage: 'building' },
]
