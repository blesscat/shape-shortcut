/**
 * Error rules owned by the `opengrid-label-card` component.
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
    order: 803,
    pattern: 'MODEL_PARAMETERS_MISMATCH:opengrid-label-card',
    code: 'INVALID_INPUT',
  },
  {
    order: 1100,
    pattern: 'OPENGRID_LABEL_CARD_QUALITY_INVALID',
    code: 'OPENGRID_LABEL_CARD_QUALITY_INVALID',
  },
  {
    order: 1300,
    pattern: 'OPENGRID_LABEL_CARD_PARTS_INVALID',
    code: 'OPENGRID_LABEL_CARD_PARTS_INVALID',
  },
  {
    order: 1400,
    pattern: 'LABEL_CARD_TEXT_TOO_WIDE',
    code: 'LABEL_CARD_ACCENT_INVALID',
  },
  {
    order: 1401,
    pattern: 'LABEL_CARD_ICON_UNKNOWN',
    code: 'LABEL_CARD_ACCENT_INVALID',
  },
  {
    order: 1402,
    pattern: 'LABEL_CARD_ICON_GEOMETRY_FAILED',
    code: 'LABEL_CARD_ACCENT_INVALID',
  },
  {
    order: 1403,
    pattern: 'LABEL_CARD_TEXT_GLYPH_UNSUPPORTED',
    code: 'LABEL_CARD_ACCENT_INVALID',
  },
  {
    order: 1404,
    pattern: 'LABEL_CARD_FONT_LOAD_FAILED',
    code: 'LABEL_CARD_ACCENT_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  {
    order: 400,
    pattern: 'OPENGRID_LABEL_CARD_QUALITY_INVALID',
    stage: 'meshing',
  },
]
