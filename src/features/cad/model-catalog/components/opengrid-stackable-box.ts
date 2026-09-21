import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridStackableBox,
  isOpenGridStackableBoxParameters,
  openGridStackableBoxFileName,
  openGridStackableBoxStlFileName,
  openGridStackableBoxThreeMfFileName,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  validateOpenGridStackableBoxParameters,
  type OpenGridStackableBoxOpeningParameterKey,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const BASE_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'x',
    label: 'parameter.xGridCount',
    axis: 'X',
    unit: 'grid',
    labelFormat: 'axis',
    control: 'range',
    defaultValue: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultX,
    min: OPENGRID_STACKABLE_BOX_CONFIGURATION.minX,
    max: OPENGRID_STACKABLE_BOX_CONFIGURATION.maxX,
    step: OPENGRID_STACKABLE_BOX_CONFIGURATION.gridStep,
  },
  {
    key: 'y',
    label: 'parameter.yGridCount',
    axis: 'Y',
    unit: 'grid',
    labelFormat: 'axis',
    control: 'range',
    defaultValue: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultY,
    min: OPENGRID_STACKABLE_BOX_CONFIGURATION.minY,
    max: OPENGRID_STACKABLE_BOX_CONFIGURATION.maxY,
    step: OPENGRID_STACKABLE_BOX_CONFIGURATION.gridStep,
  },
  {
    key: 'height',
    label: 'parameter.innerHeight',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultHeight,
    min: OPENGRID_STACKABLE_BOX_CONFIGURATION.minHeight,
    max: OPENGRID_STACKABLE_BOX_CONFIGURATION.maxHeight,
    step: 1,
    sliderMin: OPENGRID_STACKABLE_BOX_CONFIGURATION.minHeight,
    sliderMax: OPENGRID_STACKABLE_BOX_CONFIGURATION.heightSliderMax,
  },
]

function openingFieldsFor(
  direction: string,
  depthKey: OpenGridStackableBoxOpeningParameterKey,
  bottomLengthKey: OpenGridStackableBoxOpeningParameterKey,
  angleKey: OpenGridStackableBoxOpeningParameterKey,
): ReadonlyArray<ParameterField> {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return [
    {
      key: depthKey,
      label: 'parameter.openingDepth',
      axis: direction,
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultOpeningDepth,
      min: configuration.openingDepthMin,
      max: configuration.openingDepthMax,
      step: configuration.openingDepthStep,
      sliderMin: configuration.openingDepthMin,
      sliderMax: configuration.openingDepthMax,
    },
    {
      key: bottomLengthKey,
      label: 'parameter.openingBottomLength',
      axis: direction,
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultOpeningBottomLength,
      min: configuration.openingBottomLengthMin,
      max: configuration.openingBottomLengthMax,
      step: configuration.openingBottomLengthStep,
      sliderMin: configuration.openingBottomLengthMin,
      sliderMax: configuration.openingBottomLengthMax,
    },
    {
      key: angleKey,
      label: 'parameter.sideWallAngle',
      axis: direction,
      unit: 'degree',
      control: 'range-text',
      defaultValue: configuration.defaultOpeningAngle,
      min: configuration.openingAngleMin,
      max: configuration.openingAngleMax,
      step: configuration.openingAngleStep,
      sliderMin: configuration.openingAngleMin,
      sliderMax: configuration.openingAngleMax,
      sliderDirection: 'rtl',
    },
  ]
}

const OPENGRID_STACKABLE_BOX_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  ...BASE_PARAMETER_SCHEMA,
  ...openingFieldsFor(
    '+X',
    'openingPlusXDepth',
    'openingPlusXBottomLength',
    'openingPlusXAngle',
  ),
  ...openingFieldsFor(
    '-X',
    'openingMinusXDepth',
    'openingMinusXBottomLength',
    'openingMinusXAngle',
  ),
  ...openingFieldsFor(
    '+Y',
    'openingPlusYDepth',
    'openingPlusYBottomLength',
    'openingPlusYAngle',
  ),
  ...openingFieldsFor(
    '-Y',
    'openingMinusYDepth',
    'openingMinusYBottomLength',
    'openingMinusYAngle',
  ),
]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridStackableBoxParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-stackable-box' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridStackableBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  return boundsForOpenGridStackableBox(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridStackableBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  return openGridStackableBoxFileName(parameters)
}

function exportStlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridStackableBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  return openGridStackableBoxStlFileName(parameters)
}

function exportThreeMfFileName(
  parameters: ModelParameterValues,
): string | null {
  if (!isOpenGridStackableBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  return openGridStackableBoxThreeMfFileName(parameters)
}

export const opengridStackableBoxDefinition: ModelDefinition = {
  id: 'opengrid-stackable-box',
  buildKey: 'opengrid-stackable-box',
  family: 'opengrid',
  supportedSystemContexts: ['desk'],
  displayName: 'models.model.opengrid-stackable-box.name',
  selectionLabel: 'models.model.opengrid-stackable-box.selection',
  selectionDescription: 'models.model.opengrid-stackable-box.description',
  parameterSchema: OPENGRID_STACKABLE_BOX_PARAMETER_SCHEMA,
  defaultParameters: {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-stackable-box.webp',
    alt: 'models.model.opengrid-stackable-box.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName: exportStlFileName,
  threeMfFileName: exportThreeMfFileName,
}
