import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridLabelTag,
  isOpenGridLabelTagParameters,
  openGridLabelTagFileName,
  openGridLabelTagStlFileName,
  openGridLabelTagThreeMfFileName,
  OPENGRID_LABEL_TAG_CONFIGURATION,
  validateOpenGridLabelTagParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition } from '../types'

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridLabelTagParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-label-tag' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridLabelTagParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-tag')
  }
  return boundsForOpenGridLabelTag(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridLabelTagParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-tag')
  }
  return openGridLabelTagFileName(parameters)
}

function stlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridLabelTagParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-tag')
  }
  return openGridLabelTagStlFileName(parameters)
}

function threeMfFileName(parameters: ModelParameterValues): string | null {
  if (!isOpenGridLabelTagParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-tag')
  }
  return openGridLabelTagThreeMfFileName(parameters)
}

export const opengridLabelTagDefinition: ModelDefinition = {
  id: 'opengrid-label-tag',
  buildKey: 'opengrid-label-tag',
  family: 'opengrid',
  displayName: 'models.model.opengrid-label-tag.name',
  selectionLabel: 'models.model.opengrid-label-tag.selection',
  selectionDescription: 'models.model.opengrid-label-tag.description',
  parameterSchema: [],
  parameterPresentation: {
    kind: 'adjustable',
    summaryKey: 'panel.labelTag.summary',
    detailsKey: 'panel.labelTag.details',
  },
  defaultParameters: OPENGRID_LABEL_TAG_CONFIGURATION.defaultParameters,
  supportedSystemContexts: ['desk', 'wall'],
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-label-tag.webp',
    alt: 'models.model.opengrid-label-tag.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName,
  threeMfFileName,
}
