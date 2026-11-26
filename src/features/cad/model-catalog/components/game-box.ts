import { gameBoxPreview } from '../../progressive-preview/components'
import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForGameBox,
  GAME_BOX_CONFIGURATION,
  gameBoxFileName,
  gameBoxStlFileName,
  gameBoxThreeMfFileName,
  isGameBoxParameters,
  validateGameBoxParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ModelPreset, ParameterField } from '../types'

const GAME_BOX_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'cardWidth',
    label: 'parameters.gameBoxCardWidth',
    axis: 'X',
    unit: 'mm',
    control: 'range-text',
    defaultValue: GAME_BOX_CONFIGURATION.defaults.cardWidth,
    min: GAME_BOX_CONFIGURATION.ranges.cardWidth.min,
    max: GAME_BOX_CONFIGURATION.ranges.cardWidth.max,
    step: 1,
    sliderMin: GAME_BOX_CONFIGURATION.ranges.cardWidth.min,
    sliderMax: GAME_BOX_CONFIGURATION.ranges.cardWidth.max,
  },
  {
    key: 'cardHeight',
    label: 'parameters.gameBoxCardHeight',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: GAME_BOX_CONFIGURATION.defaults.cardHeight,
    min: GAME_BOX_CONFIGURATION.ranges.cardHeight.min,
    max: GAME_BOX_CONFIGURATION.ranges.cardHeight.max,
    step: 1,
    sliderMin: GAME_BOX_CONFIGURATION.ranges.cardHeight.min,
    sliderMax: GAME_BOX_CONFIGURATION.ranges.cardHeight.max,
  },
]

/**
 * The seven card size presets, in the order they are shown in the panel.
 *
 * Each preset overrides only the card size. The game box merges a preset onto
 * the parameters the user has now, so the module list, the module fields and
 * the selected part survive the preset; the available parts depend on the
 * module types, and a card size never changes them.
 */
const GAME_BOX_PRESETS: ReadonlyArray<ModelPreset> = [
  {
    id: 'tarot-70x120',
    labelKey: 'cad.presets.game-box.tarot-70x120',
    overrides: { cardWidth: 70, cardHeight: 120 },
  },
  {
    id: 'standard-tcg-63x88',
    labelKey: 'cad.presets.game-box.standard-tcg-63x88',
    overrides: { cardWidth: 63, cardHeight: 88 },
  },
  {
    id: 'standard-tcg-sleeved-66x91',
    labelKey: 'cad.presets.game-box.standard-tcg-sleeved-66x91',
    overrides: { cardWidth: 66, cardHeight: 91 },
  },
  {
    id: 'japanese-small-59x86',
    labelKey: 'cad.presets.game-box.japanese-small-59x86',
    overrides: { cardWidth: 59, cardHeight: 86 },
  },
  {
    id: 'japanese-small-sleeved-62x89',
    labelKey: 'cad.presets.game-box.japanese-small-sleeved-62x89',
    overrides: { cardWidth: 62, cardHeight: 89 },
  },
  {
    id: 'mini-american-41x63',
    labelKey: 'cad.presets.game-box.mini-american-41x63',
    overrides: { cardWidth: 41, cardHeight: 63 },
  },
  {
    id: 'mini-euro-44x68',
    labelKey: 'cad.presets.game-box.mini-euro-44x68',
    overrides: { cardWidth: 44, cardHeight: 68 },
  },
] as const

function exportGameBoxFileName(parameters: ModelParameterValues): string {
  if (!isGameBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
  }
  return gameBoxFileName(parameters)
}

function validateGameBoxDefinitionParameters(value: unknown) {
  const validation = validateGameBoxParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'game-box' as const,
      parameters: validation.value,
    },
  }
}

function threeMfFileNameForGameBox(parameters: ModelParameterValues) {
  if (!isGameBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
  }
  // Exactly the art parts export a two-color 3MF: a cover with title,
  // subtitle or SVG and a labelled divider card. Blank plates and the box
  // parts return null.
  return gameBoxThreeMfFileName(parameters)
}

function boundsForGameBoxDefinition(parameters: ModelParameterValues) {
  if (!isGameBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
  }
  return boundsForGameBox(parameters)
}

export const gameBoxDefinition: ModelDefinition = {
  id: 'game-box',
  buildKey: 'game-box',
  family: 'other',
  partCategory: 'container',
  displayName: 'models.model.game-box.name',
  selectionDescription: 'models.model.game-box.description',
  parameterSchema: GAME_BOX_PARAMETER_SCHEMA,
  defaultParameters: {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
  },
  presets: GAME_BOX_PRESETS,
  // A card size preset changes the card size only; the module list the user
  // has built up stays as it is.
  presetBase: 'current',
  simplifiedPreview: (parameters) =>
    gameBoxPreview(parameters as Parameters<typeof gameBoxPreview>[0]),
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/game-box.webp',
    alt: 'models.model.game-box.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateGameBoxDefinitionParameters,
  boundsForParameters: boundsForGameBoxDefinition,
  exportFileName: exportGameBoxFileName,
  stlFileName: (parameters) => {
    if (!isGameBoxParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
    }
    return gameBoxStlFileName(parameters)
  },
  threeMfFileName: threeMfFileNameForGameBox,
  exportBlockedHintKey: (parameters) => {
    if (!isGameBoxParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
    }
    return parameters.part === 'assembly'
      ? 'panel.gameBox.pickPartToDownload'
      : null
  },
}
