import type { ModelParameterValues } from '../../../../../cad-contract/units'
import {
  boundsForOpenGridSnapRemover,
  isOpenGridSnapRemoverParameters,
  openGridSnapRemoverFileName,
  openGridSnapRemoverStlFileName,
  validateOpenGridSnapRemoverParameters,
} from '../../../../../cad-contract/units'
import type { ModelDefinition } from '../../types'

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridSnapRemoverParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-snap-remover' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return boundsForOpenGridSnapRemover(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return openGridSnapRemoverFileName(parameters)
}

function stlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return openGridSnapRemoverStlFileName(parameters)
}

export const openGridSnapRemoverDefinition: ModelDefinition = {
  id: 'opengrid-snap-remover',
  buildKey: 'opengrid-snap-remover',
  family: 'opengrid',
  partCategory: 'tool',
  supportedSystemContexts: ['desk'],
  displayName: 'models.model.opengrid-snap-remover.name',
  selectionLabel: 'models.model.opengrid-snap-remover.selection',
  selectionDescription: 'models.model.opengrid-snap-remover.description',
  parameterSchema: [],
  defaultParameters: {},
  previewMetadata: {
    centeredOnXY: false,
    baseAtZ: -5.005506125135993,
  },
  previewImage: {
    src: '/model-previews/opengrid-snap-remover.webp',
    alt: 'models.model.opengrid-snap-remover.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName,
}
