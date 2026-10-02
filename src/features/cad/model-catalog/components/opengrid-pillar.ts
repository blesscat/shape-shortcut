import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForPillar,
  isPillarParameters,
  pillarFileName,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const PILLAR_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'length',
    label: 'parameter.totalLength',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: PILLAR_CONFIGURATION.positioningDefaultLength,
    min: PILLAR_CONFIGURATION.positioningMinLength,
    max: PILLAR_CONFIGURATION.positioningMaxLength,
    step: 1,
    sliderMin: PILLAR_CONFIGURATION.positioningMinLength,
    sliderMax: PILLAR_CONFIGURATION.positioningLengthSliderMax,
  },
  {
    key: 'offset',
    label: 'parameter.xyDiameterIncrement',
    axis: 'XY',
    unit: 'mm',
    control: 'range-text',
    defaultValue: 0,
    min: PILLAR_CONFIGURATION.offsetMin,
    max: PILLAR_CONFIGURATION.offsetMax,
    step: PILLAR_CONFIGURATION.offsetStep,
    sliderMin: PILLAR_CONFIGURATION.offsetMin,
    sliderMax: PILLAR_CONFIGURATION.offsetMax,
  },
  {
    key: 'length',
    label: 'parameter.seatLocatingLength',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: PILLAR_CONFIGURATION.seatDefaultLength,
    min: PILLAR_CONFIGURATION.seatMinLength,
    max: PILLAR_CONFIGURATION.seatMaxLength,
    step: PILLAR_CONFIGURATION.seatLengthStep,
    sliderMin: PILLAR_CONFIGURATION.seatMinLength,
    sliderMax: PILLAR_CONFIGURATION.seatLengthSliderMax,
  },
]

function validatePillarDefinitionParameters(value: unknown) {
  const validation = validatePillarParameters(value)
  if (!validation.valid) {
    return {
      valid: false as const,
      issues: validation.issues,
    }
  }
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-pillar' as const,
      parameters: validation.value,
    },
  }
}

function boundsForPillarDefinition(parameters: ModelParameterValues) {
  if (!isPillarParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
  }
  return boundsForPillar(parameters)
}

function exportPillarFileName(parameters: ModelParameterValues): string {
  if (!isPillarParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
  }
  return pillarFileName(parameters)
}

function exportPillarStlFileName(parameters: ModelParameterValues): string {
  if (!isPillarParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
  }
  return pillarStlFileName(parameters)
}

export const opengridPillarDefinition: ModelDefinition = {
  id: 'opengrid-pillar',
  buildKey: 'opengrid-pillar',
  family: 'opengrid',
  partCategory: 'accessory',
  supportedSystemContexts: ['desk'],
  displayName: 'models.model.opengrid-pillar.name',
  selectionLabel: 'models.model.opengrid-pillar.selection',
  selectionDescription: 'models.model.opengrid-pillar.description',
  parameterSchema: PILLAR_PARAMETER_SCHEMA,
  defaultParameters: { ...PILLAR_CONFIGURATION.defaultParameters },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-pillar.webp',
    alt: 'models.model.opengrid-pillar.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validatePillarDefinitionParameters,
  boundsForParameters: boundsForPillarDefinition,
  exportFileName: exportPillarFileName,
  stlFileName: exportPillarStlFileName,
}
