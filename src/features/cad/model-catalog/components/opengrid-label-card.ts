import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridLabelCard,
  isOpenGridLabelCardParameters,
  openGridLabelCardFileName,
  openGridLabelCardStlFileName,
  openGridLabelCardThreeMfFileName,
  OPENGRID_LABEL_CARD_CONFIGURATION,
  validateOpenGridLabelCardParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition } from '../types'

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridLabelCardParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-label-card' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridLabelCardParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }
  return boundsForOpenGridLabelCard(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridLabelCardParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }
  return openGridLabelCardFileName(parameters)
}

function stlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridLabelCardParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }
  return openGridLabelCardStlFileName(parameters)
}

function threeMfFileName(parameters: ModelParameterValues): string | null {
  if (!isOpenGridLabelCardParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }
  if (parameters.icon === 'none' && !parameters.text) return null
  return openGridLabelCardThreeMfFileName(parameters)
}

export const opengridLabelCardDefinition: ModelDefinition = {
  id: 'opengrid-label-card',
  buildKey: 'opengrid-label-card',
  family: 'opengrid',
  displayName: 'models.model.opengrid-label-card.name',
  selectionLabel: 'models.model.opengrid-label-card.selection',
  selectionDescription: 'models.model.opengrid-label-card.description',
  parameterSchema: [],
  parameterPresentation: {
    kind: 'adjustable',
    summaryKey: 'panel.labelCard.summary',
    detailsKey: 'panel.labelCard.details',
  },
  defaultParameters: OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters,
  supportedSystemContexts: ['desk', 'wall'],
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-label-card.webp',
    alt: 'models.model.opengrid-label-card.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName,
  threeMfFileName,
}
