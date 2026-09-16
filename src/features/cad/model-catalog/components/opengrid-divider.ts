import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridDivider,
  isOpenGridDividerParameters,
  openGridDividerFileName,
  openGridDividerStlFileName,
  OPENGRID_DIVIDER_CONFIGURATION,
  validateOpenGridDividerParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const OPENGRID_DIVIDER_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'left',
    label: 'parameter.leftArm',
    axis: 'X',
    unit: 'grid',
    control: 'range',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.left,
    min: 0,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
    step: OPENGRID_DIVIDER_CONFIGURATION.gridStep,
  },
  {
    key: 'right',
    label: 'parameter.rightArm',
    axis: 'X',
    unit: 'grid',
    control: 'range',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.right,
    min: 0,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
    step: OPENGRID_DIVIDER_CONFIGURATION.gridStep,
  },
  {
    key: 'up',
    label: 'parameter.upperArm',
    axis: 'Y',
    unit: 'grid',
    control: 'range',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.up,
    min: 0,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
    step: OPENGRID_DIVIDER_CONFIGURATION.gridStep,
  },
  {
    key: 'down',
    label: 'parameter.lowerArm',
    axis: 'Y',
    unit: 'grid',
    control: 'range',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.down,
    min: 0,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
    step: OPENGRID_DIVIDER_CONFIGURATION.gridStep,
  },
  {
    key: 'height',
    label: 'parameter.wallHeight',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.height,
    min: OPENGRID_DIVIDER_CONFIGURATION.minHeight,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxHeight,
    step: 1,
    sliderMin: OPENGRID_DIVIDER_CONFIGURATION.minHeight,
    sliderMax: OPENGRID_DIVIDER_CONFIGURATION.heightSliderMax,
  },
  {
    key: 'wallThickness',
    label: 'parameter.wallThickness',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue:
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.wallThickness,
    min: OPENGRID_DIVIDER_CONFIGURATION.minWallThickness,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxWallThickness,
    step: 1,
    sliderMin: OPENGRID_DIVIDER_CONFIGURATION.minWallThickness,
    sliderMax: OPENGRID_DIVIDER_CONFIGURATION.maxWallThickness,
  },
  {
    key: 'targetBoxGridsX',
    label: 'parameter.targetBoxGridsX',
    axis: 'X',
    unit: 'grid',
    control: 'range-text',
    defaultValue:
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.targetBoxGridsX,
    min: OPENGRID_DIVIDER_CONFIGURATION.minTargetBoxGrids,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxTargetBoxGrids,
    step: OPENGRID_DIVIDER_CONFIGURATION.gridStep,
  },
  {
    key: 'targetBoxGridsY',
    label: 'parameter.targetBoxGridsY',
    axis: 'Y',
    unit: 'grid',
    control: 'range-text',
    defaultValue:
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.targetBoxGridsY,
    min: OPENGRID_DIVIDER_CONFIGURATION.minTargetBoxGrids,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxTargetBoxGrids,
    step: OPENGRID_DIVIDER_CONFIGURATION.gridStep,
  },
  {
    key: 'endClearance',
    label: 'parameter.endClearance',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.endClearance,
    min: OPENGRID_DIVIDER_CONFIGURATION.minEndClearance,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxEndClearance,
    step: OPENGRID_DIVIDER_CONFIGURATION.endClearanceStep,
  },
  {
    key: 'pegDiameterIncrement',
    label: 'parameter.xyDiameterIncrement',
    axis: 'XY',
    unit: 'mm',
    control: 'range-text',
    defaultValue:
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.pegDiameterIncrement,
    min: OPENGRID_DIVIDER_CONFIGURATION.pegDiameterIncrementMin,
    max: OPENGRID_DIVIDER_CONFIGURATION.pegDiameterIncrementMax,
    step: OPENGRID_DIVIDER_CONFIGURATION.pegDiameterIncrementStep,
    sliderMin: OPENGRID_DIVIDER_CONFIGURATION.pegDiameterIncrementMin,
    sliderMax: OPENGRID_DIVIDER_CONFIGURATION.pegDiameterIncrementMax,
  },
]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridDividerParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-divider' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridDividerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
  }
  return boundsForOpenGridDivider(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridDividerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
  }
  return openGridDividerFileName(parameters)
}

function exportStlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridDividerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
  }
  return openGridDividerStlFileName(parameters)
}

export const opengridDividerDefinition: ModelDefinition = {
  id: 'opengrid-divider',
  buildKey: 'opengrid-divider',
  family: 'opengrid',
  supportedSystemContexts: ['desk'],
  displayName: 'models.model.opengrid-divider.name',
  selectionLabel: 'models.model.opengrid-divider.selection',
  selectionDescription: 'models.model.opengrid-divider.description',
  parameterSchema: OPENGRID_DIVIDER_PARAMETER_SCHEMA,
  defaultParameters: { ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-divider.webp',
    alt: 'models.model.opengrid-divider.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName: exportStlFileName,
}
