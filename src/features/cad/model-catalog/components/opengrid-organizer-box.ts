import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridOrganizerBox,
  isOpenGridOrganizerBoxParameters,
  openGridOrganizerBoxFileName,
  openGridOrganizerBoxStlFileName,
  OPENGRID_ORGANIZER_BOX_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  validateOpenGridOrganizerBoxParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const OPENGRID_ORGANIZER_BOX_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'holeCountX',
    label: 'parameter.organizerHoleCount',
    axis: 'X',
    unit: 'count',
    control: 'range',
    defaultValue: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleCountX,
    min: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minHoleCount,
    max: OPENGRID_ORGANIZER_BOX_CONFIGURATION.maxHoleCount,
    step: 1,
  },
  {
    key: 'holeCountY',
    label: 'parameter.organizerHoleCount',
    axis: 'Y',
    unit: 'count',
    control: 'range',
    defaultValue: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleCountY,
    min: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minHoleCount,
    max: OPENGRID_ORGANIZER_BOX_CONFIGURATION.maxHoleCount,
    step: 1,
  },
  {
    key: 'holeSpacingX',
    label: 'parameter.organizerHoleSpacing',
    axis: 'X',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleSpacing,
    min: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minHoleSpacing,
    max: OPENGRID_ORGANIZER_BOX_CONFIGURATION.maxHoleSpacing,
    step: 0.5,
    sliderMin: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minHoleSpacing,
    sliderMax: 50,
  },
  {
    key: 'holeSpacingY',
    label: 'parameter.organizerHoleSpacing',
    axis: 'Y',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleSpacing,
    min: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minHoleSpacing,
    max: OPENGRID_ORGANIZER_BOX_CONFIGURATION.maxHoleSpacing,
    step: 0.5,
    sliderMin: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minHoleSpacing,
    sliderMax: 50,
  },
  {
    key: 'holeDiameter',
    label: 'parameter.organizerHoleDiameter',
    axis: 'D',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleDiameter,
    min: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minHoleDiameter,
    max: OPENGRID_ORGANIZER_BOX_CONFIGURATION.maxHoleDiameter,
    step: 0.5,
    sliderMin: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minHoleDiameter,
    sliderMax: 100,
  },
  {
    key: 'holeDepth',
    label: 'parameter.organizerHoleDepth',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultHoleDepth,
    min: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minHoleDepth,
    max: OPENGRID_ORGANIZER_BOX_CONFIGURATION.maxHoleDepth,
    step: 0.5,
    sliderMin: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minHoleDepth,
    sliderMax: 100,
  },
  {
    key: 'bottomThickness',
    label: 'parameter.organizerBottomThickness',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultBottomThickness,
    min: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minBottomThickness,
    max: OPENGRID_ORGANIZER_BOX_CONFIGURATION.maxBottomThickness,
    step: 0.5,
    sliderMin: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minBottomThickness,
    sliderMax: 30,
  },
  {
    key: 'wallThickness',
    label: 'parameter.organizerWallThickness',
    axis: 'XY',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultWallThickness,
    min: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minWallThicknessNormal,
    max: OPENGRID_ORGANIZER_BOX_CONFIGURATION.maxWallThickness,
    step: 0.5,
    sliderMin: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minWallThicknessNormal,
    sliderMax: 30,
  },
  {
    key: 'stackingClearanceHeight',
    label: 'parameter.organizerStackingClearance',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue:
      OPENGRID_ORGANIZER_BOX_CONFIGURATION.defaultStackingClearanceHeight,
    min: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minStackingClearanceHeight,
    max: OPENGRID_ORGANIZER_BOX_CONFIGURATION.maxStackingClearanceHeight,
    step: 0.5,
    sliderMin: OPENGRID_ORGANIZER_BOX_CONFIGURATION.minStackingClearanceHeight,
    sliderMax: 50,
  },
]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridOrganizerBoxParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-organizer-box' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridOrganizerBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
  }
  return boundsForOpenGridOrganizerBox(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridOrganizerBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
  }
  return openGridOrganizerBoxFileName(parameters)
}

function exportStlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridOrganizerBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
  }
  return openGridOrganizerBoxStlFileName(parameters)
}

export const opengridOrganizerBoxDefinition: ModelDefinition = {
  id: 'opengrid-organizer-box',
  buildKey: 'opengrid-organizer-box',
  family: 'opengrid',
  supportedSystemContexts: ['desk'],
  displayName: 'models.model.opengrid-organizer-box.name',
  selectionLabel: 'models.model.opengrid-organizer-box.selection',
  selectionDescription: 'models.model.opengrid-organizer-box.description',
  parameterSchema: OPENGRID_ORGANIZER_BOX_PARAMETER_SCHEMA,
  defaultParameters: { ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-organizer-box.webp',
    alt: 'models.model.opengrid-organizer-box.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName: exportStlFileName,
}
