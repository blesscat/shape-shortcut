import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridOpenConnectOrganizer,
  isOpenGridOpenConnectOrganizerParameters,
  openGridOpenConnectOrganizerFileName,
  openGridOpenConnectOrganizerStlFileName,
  openGridOpenConnectOrganizerThreeMfFileName,
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  validateOpenGridOpenConnectOrganizerParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION

const OPENGRID_OPENCONNECT_ORGANIZER_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> =
  [
    {
      key: 'holeCountX',
      label: 'parameter.organizerHoleCount',
      axis: 'X',
      unit: 'count',
      control: 'range',
      defaultValue: configuration.defaultHoleCountX,
      min: configuration.minHoleCount,
      max: configuration.maxHoleCount,
      step: 1,
    },
    {
      key: 'holeCountY',
      label: 'parameter.organizerHoleCount',
      axis: 'Y',
      unit: 'count',
      control: 'range',
      defaultValue: configuration.defaultHoleCountY,
      min: configuration.minHoleCount,
      max: configuration.maxHoleCount,
      step: 1,
    },
    {
      key: 'holeSpacingX',
      label: 'parameter.organizerHoleSpacing',
      axis: 'X',
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultHoleSpacing,
      min: configuration.minHoleSpacing,
      max: configuration.maxHoleSpacing,
      step: 0.5,
      sliderMin: configuration.minHoleSpacing,
      sliderMax: 50,
    },
    {
      key: 'holeSpacingY',
      label: 'parameter.organizerHoleSpacing',
      axis: 'Y',
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultHoleSpacing,
      min: configuration.minHoleSpacing,
      max: configuration.maxHoleSpacing,
      step: 0.5,
      sliderMin: configuration.minHoleSpacing,
      sliderMax: 50,
    },
    {
      key: 'holeDiameter',
      label: 'parameter.organizerHoleDiameter',
      axis: 'D',
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultHoleDiameter,
      min: configuration.minHoleDiameter,
      max: configuration.maxHoleDiameter,
      step: 0.5,
      sliderMin: configuration.minHoleDiameter,
      sliderMax: 100,
    },
    {
      key: 'holeWidth',
      label: 'parameter.organizerHoleWidth',
      axis: 'X',
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultHoleWidth,
      min: configuration.minHoleWidth,
      max: configuration.maxHoleWidth,
      step: 0.5,
      sliderMin: configuration.minHoleWidth,
      sliderMax: 100,
    },
    {
      key: 'holeHeight',
      label: 'parameter.organizerHoleHeight',
      axis: 'Y',
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultHoleHeight,
      min: configuration.minHoleHeight,
      max: configuration.maxHoleHeight,
      step: 0.5,
      sliderMin: configuration.minHoleHeight,
      sliderMax: 100,
    },
    {
      key: 'holeCornerRadius',
      label: 'parameter.organizerHoleCornerRadius',
      axis: 'X/Y',
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultHoleCornerRadius,
      min: configuration.minHoleCornerRadius,
      max: configuration.maxHoleDiameter / 2,
      step: 0.5,
      sliderMin: configuration.minHoleCornerRadius,
      sliderMax: 50,
    },
    {
      key: 'holeDepth',
      label: 'parameter.organizerHoleDepth',
      axis: 'Z',
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultHoleDepth,
      min: configuration.minHoleDepth,
      max: configuration.maxHoleDepth,
      step: 0.5,
      sliderMin: configuration.minHoleDepth,
      sliderMax: 100,
    },
    {
      key: 'bottomThickness',
      label: 'parameter.organizerBottomThickness',
      axis: 'Z',
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultBottomThickness,
      min: configuration.minBottomThickness,
      max: configuration.maxBottomThickness,
      step: 0.5,
      sliderMin: configuration.minBottomThickness,
      sliderMax: 30,
    },
    {
      key: 'edgeThickness',
      label: 'parameter.organizerEdgeThickness',
      axis: 'X/Y',
      unit: 'mm',
      control: 'range-text',
      defaultValue: configuration.defaultEdgeThickness,
      min: configuration.minEdgeThickness,
      max: configuration.maxEdgeThickness,
      step: 0.1,
      sliderMin: configuration.minEdgeThickness,
      sliderMax: 30,
    },
    {
      key: 'tiltAngle',
      label: 'parameter.organizerForwardTilt',
      axis: 'Y/Z',
      unit: 'degree',
      control: 'range',
      defaultValue: configuration.defaultTiltAngle,
      min: configuration.minTiltAngle,
      max: configuration.maxTiltAngle,
      step: configuration.tiltAngleStep,
    },
  ]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridOpenConnectOrganizerParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-openconnect-organizer' as const,
      parameters: validation.value,
    },
  }
}

function requireParameters(parameters: ModelParameterValues) {
  if (!isOpenGridOpenConnectOrganizerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-organizer')
  }
  return parameters
}

export const opengridOpenConnectOrganizerDefinition: ModelDefinition = {
  id: 'opengrid-openconnect-organizer',
  buildKey: 'opengrid-openconnect-organizer',
  family: 'opengrid',
  supportedSystemContexts: ['wall'],
  displayName: 'models.model.opengrid-openconnect-organizer.name',
  selectionLabel: 'models.model.opengrid-openconnect-organizer.selection',
  selectionDescription:
    'models.model.opengrid-openconnect-organizer.description',
  parameterSchema: OPENGRID_OPENCONNECT_ORGANIZER_PARAMETER_SCHEMA,
  defaultParameters: { ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS },
  previewMetadata: { centeredOnXY: false, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-openconnect-organizer-wall.webp',
    alt: 'models.model.opengrid-openconnect-organizer.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: (parameters) =>
    boundsForOpenGridOpenConnectOrganizer(requireParameters(parameters)),
  exportFileName: (parameters) =>
    openGridOpenConnectOrganizerFileName(requireParameters(parameters)),
  stlFileName: (parameters) =>
    openGridOpenConnectOrganizerStlFileName(requireParameters(parameters)),
  threeMfFileName: (parameters) =>
    openGridOpenConnectOrganizerThreeMfFileName(requireParameters(parameters)),
}
