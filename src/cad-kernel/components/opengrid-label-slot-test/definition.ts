/**
 * The `opengrid-label-slot-test` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import { isOpenGridLabelSlotTestParameters } from '../../../cad-contract/units'
import { buildOpenGridLabelSlotTest } from './builder'
import type { ComponentModelDefinition } from '../../model/types'

export const definition: ComponentModelDefinition = {
  id: 'opengrid-label-slot-test',
  async build(parameters, context) {
    if (!isOpenGridLabelSlotTestParameters(parameters))
      throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-slot-test')
    return buildOpenGridLabelSlotTest(parameters, context)
  },
}
