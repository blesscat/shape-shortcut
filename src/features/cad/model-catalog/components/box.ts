import { simpleBoxPreview } from '../../progressive-preview/components'
import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForBox,
  boxFileName,
  boxStlFileName,
  isBoxParameters,
  PROTOTYPE_CONFIGURATION,
  validateBoxParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const BOX_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'width',
    label: 'parameter.width',
    axis: 'X',
    unit: 'mm',
    control: 'text',
    defaultValue: PROTOTYPE_CONFIGURATION.defaultDimensions.width,
    min: PROTOTYPE_CONFIGURATION.minDimension,
    max: PROTOTYPE_CONFIGURATION.maxDimension,
    step: PROTOTYPE_CONFIGURATION.inputStep,
  },
  {
    key: 'depth',
    label: 'parameter.depth',
    axis: 'Y',
    unit: 'mm',
    control: 'text',
    defaultValue: PROTOTYPE_CONFIGURATION.defaultDimensions.depth,
    min: PROTOTYPE_CONFIGURATION.minDimension,
    max: PROTOTYPE_CONFIGURATION.maxDimension,
    step: PROTOTYPE_CONFIGURATION.inputStep,
  },
  {
    key: 'height',
    label: 'parameter.height',
    axis: 'Z',
    unit: 'mm',
    control: 'text',
    defaultValue: PROTOTYPE_CONFIGURATION.defaultDimensions.height,
    min: PROTOTYPE_CONFIGURATION.minDimension,
    max: PROTOTYPE_CONFIGURATION.maxDimension,
    step: PROTOTYPE_CONFIGURATION.inputStep,
  },
]

function exportBoxFileName(parameters: ModelParameterValues): string {
  if (!isBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:box')
  }
  return boxFileName(parameters)
}

function validateBoxDefinitionParameters(value: unknown) {
  const validation = validateBoxParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: { modelId: 'box' as const, parameters: validation.value },
  }
}

function boundsForBoxDefinition(parameters: ModelParameterValues) {
  if (!isBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:box')
  }
  return boundsForBox(parameters)
}

export const boxDefinition: ModelDefinition = {
  id: 'box',
  buildKey: 'box',
  family: 'other',
  chooserHidden: true,
  displayName: 'models.model.box.name',
  selectionDescription: 'models.model.box.description',
  parameterSchema: BOX_PARAMETER_SCHEMA,
  defaultParameters: { ...PROTOTYPE_CONFIGURATION.defaultDimensions },
  simplifiedPreview: (parameters) =>
    simpleBoxPreview(parameters as Parameters<typeof simpleBoxPreview>[0]),
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validateBoxDefinitionParameters,
  boundsForParameters: boundsForBoxDefinition,
  exportFileName: exportBoxFileName,
  stlFileName: (parameters) => {
    if (!isBoxParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:box')
    }
    return boxStlFileName(parameters)
  },
}
