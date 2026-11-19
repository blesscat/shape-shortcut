/**
 * The `opengrid-label-ledge-test` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import { isOpenGridLabelLedgeTestParameters } from '../../../cad-contract/units'
import { buildOpenGridLabelLedgeTest } from './builder'
import type { ComponentModelDefinition } from '../../model/types'

export const definition: ComponentModelDefinition = {
  id: 'opengrid-label-ledge-test',
  async build(parameters, context) {
    if (!isOpenGridLabelLedgeTestParameters(parameters))
      throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-ledge-test')
    return buildOpenGridLabelLedgeTest(parameters, context)
  },
}
