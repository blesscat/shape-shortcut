/**
 * Error rules owned by the `opengrid-stackable-cylinder` component.
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
    order: 804,
    pattern: 'OPENGRID_STACKABLE_CYLINDER_PARAMETERS_INVALID',
    code: 'INVALID_INPUT',
  },
  {
    order: 805,
    pattern: 'MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder',
    code: 'INVALID_INPUT',
  },
  {
    order: 1900,
    pattern: 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
    code: 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
  },
  {
    order: 1901,
    pattern: 'OPENGRID_STACKABLE_CYLINDER_OPENINGS_INVALID',
    code: 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
  },
]

export const stageRules: readonly CadErrorStageRule[] = [
  {
    order: 900,
    pattern: 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
    stage: 'meshing',
  },
  {
    order: 901,
    pattern: 'OPENGRID_STACKABLE_CYLINDER_OPENINGS_INVALID',
    stage: 'meshing',
  },
]
