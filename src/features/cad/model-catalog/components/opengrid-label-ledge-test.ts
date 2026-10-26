import { labelLedgePreview } from '../../progressive-preview/components'
import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridLabelLedgeTest,
  isOpenGridLabelLedgeTestParameters,
  openGridLabelLedgeTestFileName,
  openGridLabelLedgeTestStlFileName,
  OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION,
  validateOpenGridLabelLedgeTestParameters,
} from '../../../../cad-contract/units'
import { OPENGRID_LABEL_GRID } from '../../../../cad-contract/units/opengrid-label-shared'
import { OPENGRID_LABEL_LEDGE } from '../../../../cad-contract/units/opengrid-label-ledge'
import type { ModelDefinition } from '../types'

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridLabelLedgeTestParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-label-ledge-test' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridLabelLedgeTestParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-ledge-test')
  }
  return boundsForOpenGridLabelLedgeTest(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridLabelLedgeTestParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-ledge-test')
  }
  return openGridLabelLedgeTestFileName(parameters)
}

function stlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridLabelLedgeTestParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-ledge-test')
  }
  return openGridLabelLedgeTestStlFileName(parameters)
}

export const opengridLabelLedgeTestDefinition: ModelDefinition = {
  id: 'opengrid-label-ledge-test',
  buildKey: 'opengrid-label-ledge-test',
  family: 'opengrid',
  partCategory: 'test',
  displayName: 'models.model.opengrid-label-ledge-test.name',
  selectionLabel: 'models.model.opengrid-label-ledge-test.selection',
  selectionDescription: 'models.model.opengrid-label-ledge-test.description',
  parameterSchema: [
    {
      key: 'gridUnits',
      label: 'parameter.gridUnits',
      axis: 'X',
      unit: 'count',
      labelFormat: 'label',
      control: 'range',
      min: OPENGRID_LABEL_LEDGE.minUnits,
      max: OPENGRID_LABEL_GRID.maxUnits,
      step: 1,
      defaultValue:
        OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION.defaultParameters.gridUnits,
    },
  ],
  parameterPresentation: {
    kind: 'adjustable',
    summaryKey: 'panel.labelLedgeTest.summary',
    detailsKey: 'panel.labelLedgeTest.details',
  },
  defaultParameters: OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION.defaultParameters,
  supportedSystemContexts: ['desk'],
  simplifiedPreview: (parameters) =>
    labelLedgePreview(parameters as Parameters<typeof labelLedgePreview>[0]),
  previewMetadata: { centeredOnXY: false, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-label-ledge-test.webp',
    alt: 'models.model.opengrid-label-ledge-test.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName,
}
