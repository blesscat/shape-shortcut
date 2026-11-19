/**
 * Error rules owned by the `opengrid-openconnect-shelf` component.
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
    order: 2601,
    pattern: 'OPENGRID_OPENCONNECT_SHELF_QUALITY_FAILED',
    code: 'OPENGRID_QUALITY_INVALID',
  },
  {
    order: 3209,
    pattern: 'OPENGRID_OPENCONNECT_SLOT_ASSET',
    code: 'MODEL_ASSET_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  {
    order: 1601,
    pattern: 'OPENGRID_OPENCONNECT_SHELF_QUALITY_FAILED',
    stage: 'meshing',
  },
]
