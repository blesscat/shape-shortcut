import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridLabelSlotTest,
  isOpenGridLabelSlotTestParameters,
  openGridLabelSlotTestFileName,
  openGridLabelSlotTestStlFileName,
  OPENGRID_LABEL_SLOT_TEST_CONFIGURATION,
  validateOpenGridLabelSlotTestParameters,
} from '../../../../cad-contract/units'
import { OPENGRID_LABEL_GRID } from '../../../../cad-contract/units/opengrid-label-shared'
import type { ModelDefinition } from '../types'

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridLabelSlotTestParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-label-slot-test' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridLabelSlotTestParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-slot-test')
  }
  return boundsForOpenGridLabelSlotTest(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridLabelSlotTestParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-slot-test')
  }
  return openGridLabelSlotTestFileName(parameters)
}

function stlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridLabelSlotTestParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-slot-test')
  }
  return openGridLabelSlotTestStlFileName(parameters)
}

export const opengridLabelSlotTestDefinition: ModelDefinition = {
  id: 'opengrid-label-slot-test',
  buildKey: 'opengrid-label-slot-test',
  family: 'opengrid',
  displayName: 'models.model.opengrid-label-slot-test.name',
  selectionLabel: 'models.model.opengrid-label-slot-test.selection',
  selectionDescription: 'models.model.opengrid-label-slot-test.description',
  parameterSchema: [
    {
      key: 'gridUnits',
      label: 'parameter.gridUnits',
      axis: 'X',
      unit: 'count',
      labelFormat: 'label',
      control: 'range',
      min: OPENGRID_LABEL_GRID.minUnits,
      max: OPENGRID_LABEL_GRID.maxUnits,
      step: 1,
      defaultValue: 3,
    },
  ],
  parameterPresentation: {
    kind: 'adjustable',
    summaryKey: 'panel.labelSlotTest.summary',
    detailsKey: 'panel.labelSlotTest.details',
  },
  defaultParameters: OPENGRID_LABEL_SLOT_TEST_CONFIGURATION.defaultParameters,
  supportedSystemContexts: ['wall'],
  previewMetadata: { centeredOnXY: false, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-label-slot-test.webp',
    alt: 'models.model.opengrid-label-slot-test.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName,
}
