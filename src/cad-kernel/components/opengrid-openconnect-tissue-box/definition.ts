/**
 * The `opengrid-openconnect-tissue-box` model definition owned by this component.
 *
 * The shared registry in `src/cad-kernel/model/index.ts` collects this module
 * automatically, so adding or changing this component never requires editing
 * that shared file.
 */

import { isTissueBoxParameters } from '../../../cad-contract/units'
import { buildTissueBox } from './builder'
import type { ComponentModelDefinition } from '../../model/types'

export const definition: ComponentModelDefinition = {
  id: 'opengrid-openconnect-tissue-box',
  build: (parameters, context) => {
    if (!isTissueBoxParameters(parameters)) throw new Error('INVALID_INPUT')
    return buildTissueBox(parameters, {
      getLockedSlot: context.getOpenGridOpenConnectShelfLockedSlot,
      isGenerationCurrent: context.isGenerationCurrent,
      yieldToEventLoop: context.yieldToEventLoop,
      reportProgress: context.reportProgress,
      booleanOperations: context.booleanOperations,
    })
  },
}
