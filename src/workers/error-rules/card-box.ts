/**
 * Error rules owned by the `card-box` component.
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
    order: 1500,
    pattern: 'CARD_BOX_DIVIDER_TEXT_TOO_WIDE',
    code: 'CARD_BOX_GEOMETRY_INVALID',
  },
  {
    order: 1501,
    pattern: 'CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA',
    code: 'CARD_BOX_GEOMETRY_INVALID',
  },
  {
    order: 1502,
    pattern: 'CARD_BOX_SVG_',
    code: 'CARD_BOX_GEOMETRY_INVALID',
  },
  {
    order: 1600,
    pattern: 'MODEL_PARAMETERS_MISMATCH:card-box',
    code: 'INVALID_INPUT',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  { order: 500, pattern: 'CARD_BOX_DIVIDER_TEXT_TOO_WIDE', stage: 'building' },
  {
    order: 600,
    pattern: 'CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA',
    stage: 'building',
  },
  { order: 700, pattern: 'CARD_BOX_SVG_', stage: 'building' },
]
