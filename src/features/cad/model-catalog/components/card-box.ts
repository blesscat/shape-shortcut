import { cardBoxPreview } from '../../progressive-preview/components'
import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForCardBox,
  CARD_BOX_CONFIGURATION,
  cardBoxFileName,
  cardBoxStlFileName,
  cardBoxThreeMfFileName,
  isCardBoxParameters,
  validateCardBoxParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ModelPreset, ParameterField } from '../types'

const CARD_BOX_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'cardWidth',
    label: 'parameters.cardBoxCardWidth',
    axis: 'X',
    unit: 'mm',
    control: 'range-text',
    defaultValue: CARD_BOX_CONFIGURATION.defaults.cardWidth,
    min: CARD_BOX_CONFIGURATION.ranges.cardWidth.min,
    max: CARD_BOX_CONFIGURATION.ranges.cardWidth.max,
    step: 1,
    sliderMin: CARD_BOX_CONFIGURATION.ranges.cardWidth.min,
    sliderMax: CARD_BOX_CONFIGURATION.ranges.cardWidth.max,
  },
  {
    key: 'cardHeight',
    label: 'parameters.cardBoxCardHeight',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: CARD_BOX_CONFIGURATION.defaults.cardHeight,
    min: CARD_BOX_CONFIGURATION.ranges.cardHeight.min,
    max: CARD_BOX_CONFIGURATION.ranges.cardHeight.max,
    step: 1,
    sliderMin: CARD_BOX_CONFIGURATION.ranges.cardHeight.min,
    sliderMax: CARD_BOX_CONFIGURATION.ranges.cardHeight.max,
  },
  {
    key: 'storageDepth',
    label: 'parameters.cardBoxStorageDepth',
    axis: 'Y',
    unit: 'mm',
    control: 'range-text',
    defaultValue: CARD_BOX_CONFIGURATION.defaults.storageDepth,
    min: CARD_BOX_CONFIGURATION.ranges.storageDepth.min,
    max: CARD_BOX_CONFIGURATION.ranges.storageDepth.max,
    step: 1,
    sliderMin: CARD_BOX_CONFIGURATION.ranges.storageDepth.min,
    sliderMax: CARD_BOX_CONFIGURATION.ranges.storageDepth.max,
  },
]

const CARD_BOX_PRESETS: ReadonlyArray<ModelPreset> = [
  {
    id: 'tarot-70x120',
    labelKey: 'cad.presets.card-box.tarot-70x120',
    overrides: { cardWidth: 70, cardHeight: 120 },
  },
  {
    id: 'standard-tcg-63x88',
    labelKey: 'cad.presets.card-box.standard-tcg-63x88',
    overrides: { cardWidth: 63, cardHeight: 88 },
  },
  {
    id: 'standard-tcg-sleeved-66x91',
    labelKey: 'cad.presets.card-box.standard-tcg-sleeved-66x91',
    overrides: { cardWidth: 66, cardHeight: 91 },
  },
  {
    id: 'japanese-small-59x86',
    labelKey: 'cad.presets.card-box.japanese-small-59x86',
    overrides: { cardWidth: 59, cardHeight: 86 },
  },
  {
    id: 'japanese-small-sleeved-62x89',
    labelKey: 'cad.presets.card-box.japanese-small-sleeved-62x89',
    overrides: { cardWidth: 62, cardHeight: 89 },
  },
  {
    id: 'mini-american-41x63',
    labelKey: 'cad.presets.card-box.mini-american-41x63',
    overrides: { cardWidth: 41, cardHeight: 63 },
  },
  {
    id: 'mini-euro-44x68',
    labelKey: 'cad.presets.card-box.mini-euro-44x68',
    overrides: { cardWidth: 44, cardHeight: 68 },
  },
] as const

function exportCardBoxFileName(parameters: ModelParameterValues): string {
  if (!isCardBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:card-box')
  }
  return cardBoxFileName(parameters)
}

function validateCardBoxDefinitionParameters(value: unknown) {
  const validation = validateCardBoxParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'card-box' as const,
      parameters: validation.value,
    },
  }
}

function boundsForCardBoxDefinition(parameters: ModelParameterValues) {
  if (!isCardBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:card-box')
  }
  return boundsForCardBox(parameters)
}

export const cardBoxDefinition: ModelDefinition = {
  id: 'card-box',
  buildKey: 'card-box',
  family: 'other',
  partCategory: 'container',
  displayName: 'models.model.card-box.name',
  selectionDescription: 'models.model.card-box.description',
  parameterSchema: CARD_BOX_PARAMETER_SCHEMA,
  defaultParameters: {
    ...CARD_BOX_CONFIGURATION.defaultParameters,
  },
  presets: CARD_BOX_PRESETS,
  simplifiedPreview: (parameters) =>
    cardBoxPreview(parameters as Parameters<typeof cardBoxPreview>[0]),
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/card-box.webp',
    alt: 'models.model.card-box.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateCardBoxDefinitionParameters,
  boundsForParameters: boundsForCardBoxDefinition,
  exportFileName: exportCardBoxFileName,
  stlFileName: (parameters) => {
    if (!isCardBoxParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:card-box')
    }
    return cardBoxStlFileName(parameters)
  },
  threeMfFileName: (parameters) => {
    if (!isCardBoxParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:card-box')
    }
    return cardBoxThreeMfFileName(parameters)
  },
}
