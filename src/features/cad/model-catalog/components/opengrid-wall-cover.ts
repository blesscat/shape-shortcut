import { wallCoverPreview } from '../../progressive-preview/components'
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

function coverMountingOriginsFor(parameters: ModelParameterValues) {
  const validation = validateOpenGridWallCoverParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  const count = Array.from(validation.value.text).length
  const pitch =
    OPENGRID_WALL_COVER_CONFIGURATION.coverWidth +
    OPENGRID_WALL_COVER_CONFIGURATION.coverGap
  const centerOffset = ((count - 1) * pitch) / 2
  return Array.from(
    { length: count },
    (_, index) => [index * pitch - centerOffset, 0, 0] as const,
  )
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
  simplifiedPreview: (parameters) =>
    wallCoverPreview(parameters as Parameters<typeof wallCoverPreview>[0]),
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-wall-cover.webp',
    alt: 'models.model.opengrid-wall-cover.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  wallDisplay: {
    // Covers are already authored with the wall face at Z=0. Their mounting
    // centers anchor full grid cells even when the remover opening is off.
    printToInstalledRotXDegrees: () => 0,
    installedBoundsFor: boundsForDefinition,
    wallReadyRotation: { axis: [1, 0, 0], degrees: 0 },
    installedSocketOriginsFor: coverMountingOriginsFor,
  },
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName,
  threeMfFileName,
}
