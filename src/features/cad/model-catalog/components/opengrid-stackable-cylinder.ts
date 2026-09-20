import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridStackableCylinder,
  isOpenGridStackableCylinderParameters,
  openGridStackableCylinderFileName,
  openGridStackableCylinderStlFileName,
  openGridStackableCylinderThreeMfFileName,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  validateOpenGridStackableCylinderParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const OPENGRID_STACKABLE_CYLINDER_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> =
  [
    {
      key: 'innerDiameter',
      label: 'parameter.innerDiameter',
      axis: 'D',
      unit: 'mm',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultInnerDiameter,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.minInnerDiameter,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.maxInnerDiameter,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.inputStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.minInnerDiameter,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.maxInnerDiameter,
    },
    {
      key: 'height',
      label: 'parameter.height',
      axis: 'Z',
      unit: 'mm',
      control: 'range-text',
      defaultValue: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultHeight,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.minHeight,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.maxHeight,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.inputStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.minHeight,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.heightSliderMax,
    },
    {
      key: 'openingPlusXDepth',
      label: 'parameter.openingDepth',
      axis: '+X',
      unit: 'mm',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.inputStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMin,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMax,
    },
    {
      key: 'openingPlusXBottomLength',
      label: 'parameter.openingBottomLength',
      axis: '+X',
      unit: 'mm',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingLengthStep,
      sliderMin:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMin,
      sliderMax:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMax,
    },
    {
      key: 'openingPlusXAngle',
      label: 'parameter.sideWallAngle',
      axis: '+X',
      unit: 'degree',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMin,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMax,
      sliderDirection: 'rtl',
    },
    {
      key: 'openingMinusXDepth',
      label: 'parameter.openingDepth',
      axis: '-X',
      unit: 'mm',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.inputStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMin,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMax,
    },
    {
      key: 'openingMinusXBottomLength',
      label: 'parameter.openingBottomLength',
      axis: '-X',
      unit: 'mm',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingLengthStep,
      sliderMin:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMin,
      sliderMax:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMax,
    },
    {
      key: 'openingMinusXAngle',
      label: 'parameter.sideWallAngle',
      axis: '-X',
      unit: 'degree',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMin,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMax,
      sliderDirection: 'rtl',
    },
    {
      key: 'openingPlusYDepth',
      label: 'parameter.openingDepth',
      axis: '+Y',
      unit: 'mm',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.inputStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMin,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMax,
    },
    {
      key: 'openingPlusYBottomLength',
      label: 'parameter.openingBottomLength',
      axis: '+Y',
      unit: 'mm',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingLengthStep,
      sliderMin:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMin,
      sliderMax:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMax,
    },
    {
      key: 'openingPlusYAngle',
      label: 'parameter.sideWallAngle',
      axis: '+Y',
      unit: 'degree',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMin,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMax,
      sliderDirection: 'rtl',
    },
    {
      key: 'openingMinusYDepth',
      label: 'parameter.openingDepth',
      axis: '-Y',
      unit: 'mm',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.inputStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMin,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingDepthMax,
    },
    {
      key: 'openingMinusYBottomLength',
      label: 'parameter.openingBottomLength',
      axis: '-Y',
      unit: 'mm',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingLengthStep,
      sliderMin:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMin,
      sliderMax:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMax,
    },
    {
      key: 'openingMinusYAngle',
      label: 'parameter.sideWallAngle',
      axis: '-Y',
      unit: 'degree',
      control: 'range-text',
      defaultValue:
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMin,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMax,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMin,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingAngleMax,
      sliderDirection: 'rtl',
    },
  ]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridStackableCylinderParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-stackable-cylinder' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridStackableCylinderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  return boundsForOpenGridStackableCylinder(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridStackableCylinderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  return openGridStackableCylinderFileName(parameters)
}

function exportStlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridStackableCylinderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  return openGridStackableCylinderStlFileName(parameters)
}

function exportThreeMfFileName(parameters: ModelParameterValues): string | null {
  if (!isOpenGridStackableCylinderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  return parameters.topRimEnabled
    ? openGridStackableCylinderThreeMfFileName(parameters)
    : null
}

export const opengridStackableCylinderDefinition: ModelDefinition = {
  id: 'opengrid-stackable-cylinder',
  buildKey: 'opengrid-stackable-cylinder',
  family: 'opengrid',
  supportedSystemContexts: ['desk'],
  displayName: 'models.model.opengrid-stackable-cylinder.name',
  selectionLabel: 'models.model.opengrid-stackable-cylinder.selection',
  selectionDescription: 'models.model.opengrid-stackable-cylinder.description',
  parameterSchema: OPENGRID_STACKABLE_CYLINDER_PARAMETER_SCHEMA,
  defaultParameters: { ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-stackable-cylinder.webp',
    alt: 'models.model.opengrid-stackable-cylinder.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName: exportStlFileName,
  threeMfFileName: exportThreeMfFileName,
}
