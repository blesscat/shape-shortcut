import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridLabelHolder,
  isOpenGridLabelHolderParameters,
  openGridLabelHolderFileName,
  openGridLabelHolderStlFileName,
  OPENGRID_LABEL_HOLDER_CONFIGURATION,
  validateOpenGridLabelHolderParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition } from '../types'

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridLabelHolderParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-label-holder' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridLabelHolderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-holder')
  }
  return boundsForOpenGridLabelHolder(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridLabelHolderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-holder')
  }
  return openGridLabelHolderFileName(parameters)
}

function stlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridLabelHolderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-holder')
  }
  return openGridLabelHolderStlFileName(parameters)
}

export const opengridLabelHolderDefinition: ModelDefinition = {
  id: 'opengrid-label-holder',
  buildKey: 'opengrid-label-holder',
  family: 'opengrid',
  displayName: 'models.model.opengrid-label-holder.name',
  selectionLabel: 'models.model.opengrid-label-holder.selection',
  selectionDescription: 'models.model.opengrid-label-holder.description',
  parameterSchema: [],
  parameterPresentation: {
    kind: 'adjustable',
    summaryKey: 'panel.labelHolder.summary',
    detailsKey: 'panel.labelHolder.details',
  },
  defaultParameters: OPENGRID_LABEL_HOLDER_CONFIGURATION.defaultParameters,
  supportedSystemContexts: ['desk', 'wall'],
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-label-holder.webp',
    alt: 'models.model.opengrid-label-holder.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName,
}
