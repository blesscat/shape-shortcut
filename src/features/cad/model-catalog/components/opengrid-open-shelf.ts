import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridOpenShelf,
  isOpenGridOpenShelfParameters,
  openGridOpenShelfFileName,
  openGridOpenShelfStlFileName,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  validateOpenGridOpenShelfParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const OPENGRID_OPEN_SHELF_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'x',
    label: 'parameter.outerXGridCount',
    axis: 'X',
    unit: 'grid',
    labelFormat: 'axis',
    control: 'range',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultX,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minX,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxX,
    step: OPENGRID_OPEN_SHELF_CONFIGURATION.gridStep,
  },
  {
    key: 'y',
    label: 'parameter.outerYGridCount',
    axis: 'Y',
    unit: 'grid',
    labelFormat: 'axis',
    control: 'range',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultY,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minY,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxY,
    step: OPENGRID_OPEN_SHELF_CONFIGURATION.gridStep,
  },
  {
    key: 'height',
    label: 'parameter.overallHeight',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultHeight,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minHeight,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxHeight,
    step: 1,
    sliderMin: OPENGRID_OPEN_SHELF_CONFIGURATION.minHeight,
    sliderMax: OPENGRID_OPEN_SHELF_CONFIGURATION.heightSliderMax,
  },
  {
    key: 'cellX',
    label: 'parameter.innerXGridCount',
    axis: 'X',
    unit: 'grid',
    labelFormat: 'axis',
    control: 'range',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultCellX,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minCellX,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxCellX,
    step: 1,
  },
  {
    key: 'cellZ',
    label: 'parameter.innerZGridCount',
    axis: 'Z',
    unit: 'grid',
    labelFormat: 'axis',
    control: 'range',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultCellZ,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minCellZ,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxCellZ,
    step: 1,
  },
  {
    key: 'angle',
    label: 'parameter.openingElevation',
    axis: 'Y/Z',
    unit: 'degree',
    control: 'range-text',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultAngle,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minAngle,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxAngle,
    step: 1,
    sliderMin: OPENGRID_OPEN_SHELF_CONFIGURATION.minAngle,
    sliderMax: OPENGRID_OPEN_SHELF_CONFIGURATION.maxAngle,
  },
]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridOpenShelfParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-open-shelf' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridOpenShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
  }
  return boundsForOpenGridOpenShelf(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridOpenShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
  }
  return openGridOpenShelfFileName(parameters)
}

function exportStlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridOpenShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
  }
  return openGridOpenShelfStlFileName(parameters)
}

export const opengridOpenShelfDefinition: ModelDefinition = {
  id: 'opengrid-open-shelf',
  buildKey: 'opengrid-open-shelf',
  family: 'opengrid',
  partCategory: 'container',
  supportedSystemContexts: ['desk'],
  displayName: 'models.model.opengrid-open-shelf.name',
  selectionLabel: 'models.model.opengrid-open-shelf.selection',
  selectionDescription: 'models.model.opengrid-open-shelf.description',
  parameterSchema: OPENGRID_OPEN_SHELF_PARAMETER_SCHEMA,
  defaultParameters: { ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS },
  previewMetadata: { centeredOnXY: true, baseAtZ: -3 },
  previewImage: {
    src: '/model-previews/opengrid-open-shelf.webp',
    alt: 'models.model.opengrid-open-shelf.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName: exportStlFileName,
}
