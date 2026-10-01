import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridWallCover,
  isOpenGridWallCoverParameters,
  openGridWallCoverFileName,
  openGridWallCoverStlFileName,
  openGridWallCoverThreeMfFileName,
  OPENGRID_WALL_COVER_CONFIGURATION,
  validateOpenGridWallCoverParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition } from '../types'

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridWallCoverParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-wall-cover' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridWallCoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  return boundsForOpenGridWallCover(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridWallCoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  return openGridWallCoverFileName(parameters)
}

function stlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridWallCoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  return openGridWallCoverStlFileName(parameters)
}

function threeMfFileName(parameters: ModelParameterValues): string | null {
  if (!isOpenGridWallCoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  return openGridWallCoverThreeMfFileName(parameters)
}

export const opengridWallCoverDefinition: ModelDefinition = {
  id: 'opengrid-wall-cover',
  buildKey: 'opengrid-wall-cover',
  family: 'opengrid',
  partCategory: 'accessory',
  displayName: 'models.model.opengrid-wall-cover.name',
  selectionLabel: 'models.model.opengrid-wall-cover.selection',
  selectionDescription: 'models.model.opengrid-wall-cover.description',
  parameterSchema: [],
  parameterPresentation: {
    kind: 'adjustable',
    summaryKey: 'panel.wallCover.summary',
    detailsKey: 'panel.wallCover.details',
  },
  defaultParameters: OPENGRID_WALL_COVER_CONFIGURATION.defaultParameters,
  supportedSystemContexts: ['wall'],
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-wall-cover.webp',
    alt: 'models.model.opengrid-wall-cover.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName,
  threeMfFileName,
}
