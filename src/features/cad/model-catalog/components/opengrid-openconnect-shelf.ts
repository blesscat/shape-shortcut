import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridOpenConnectShelf,
  isOpenGridOpenConnectShelfParameters,
  openGridOpenConnectShelfFileName,
  openGridOpenConnectShelfInstalledBoundsFor,
  openGridOpenConnectShelfMaximumAngleForRows,
  openGridOpenConnectShelfSlotOriginsFor,
  openGridOpenConnectShelfStlFileName,
  OPENGRID_OPENCONNECT_SHELF_CONFIGURATION,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  validateOpenGridOpenConnectShelfParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION

const OPENGRID_OPENCONNECT_SHELF_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> =
  [
    {
      key: 'columns',
      label: 'parameter.columns',
      axis: 'X',
      unit: 'grid',
      labelFormat: 'axis',
      control: 'range',
      defaultValue: configuration.defaultColumns,
      min: configuration.minGridCount,
      max: configuration.maxGridCount,
      step: 1,
    },
    {
      key: 'rows',
      label: 'parameter.rows',
      axis: 'Y',
      unit: 'grid',
      labelFormat: 'axis',
      control: 'range',
      defaultValue: configuration.defaultRows,
      min: configuration.minGridCount,
      max: configuration.maxGridCount,
      step: 1,
    },
    {
      key: 'connectorRows',
      label: 'parameter.openConnectRows',
      axis: 'Z',
      unit: 'grid',
      labelFormat: 'axis',
      control: 'range',
      defaultValue: configuration.defaultConnectorRows,
      min: configuration.minGridCount,
      max: configuration.maxGridCount,
      step: 1,
    },
    {
      key: 'angle',
      label: 'parameter.shelfAngle',
      axis: 'Y/Z',
      unit: 'degree',
      control: 'range',
      defaultValue: configuration.defaultAngle,
      min: configuration.minAngle,
      max: openGridOpenConnectShelfMaximumAngleForRows(
        configuration.minGridCount,
        configuration.maxGridCount,
      ),
      step: configuration.angleStep,
      sliderMin: configuration.minAngle,
      sliderMax: openGridOpenConnectShelfMaximumAngleForRows(
        configuration.minGridCount,
        configuration.maxGridCount,
      ),
    },
  ]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridOpenConnectShelfParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-openconnect-shelf' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridOpenConnectShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-shelf')
  }
  return boundsForOpenGridOpenConnectShelf(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridOpenConnectShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-shelf')
  }
  return openGridOpenConnectShelfFileName(parameters)
}

function exportStlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridOpenConnectShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-shelf')
  }
  return openGridOpenConnectShelfStlFileName(parameters)
}

export const opengridOpenConnectShelfDefinition: ModelDefinition = {
  id: 'opengrid-openconnect-shelf',
  buildKey: 'opengrid-openconnect-shelf',
  family: 'opengrid',
  partCategory: 'container',
  displayName: 'models.model.opengrid-openconnect-shelf.name',
  selectionLabel: 'models.model.opengrid-openconnect-shelf.selection',
  selectionDescription: 'models.model.opengrid-openconnect-shelf.description',
  parameterSchema: OPENGRID_OPENCONNECT_SHELF_PARAMETER_SCHEMA,
  defaultParameters: { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS },
  previewMetadata: { centeredOnXY: false, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-openconnect-shelf.webp',
    alt: 'models.model.opengrid-openconnect-shelf.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  wallDisplay: {
    // The builder's orientForPrint applies RotX(+angle) onto the installed
    // frame, so the print frame maps back with the negated angle.
    printToInstalledRotXDegrees: (parameters) => {
      if (!isOpenGridOpenConnectShelfParameters(parameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-shelf')
      }
      return -parameters.angle
    },
    installedBoundsFor: (parameters) => {
      if (!isOpenGridOpenConnectShelfParameters(parameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-shelf')
      }
      return openGridOpenConnectShelfInstalledBoundsFor(parameters)
    },
    wallReadyRotation: { axis: [0, 1, -1], degrees: 180 },
    installedSocketOriginsFor: (parameters) => {
      if (!isOpenGridOpenConnectShelfParameters(parameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-shelf')
      }
      return openGridOpenConnectShelfSlotOriginsFor(parameters)
    },
  },
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName: exportStlFileName,
  supportedSystemContexts: ['wall'],
}
