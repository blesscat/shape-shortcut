import { gameBoxPreview } from '../../progressive-preview/components'
import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForGameBox,
  GAME_BOX_CONFIGURATION,
  gameBoxFileName,
  gameBoxStlFileName,
  isGameBoxParameters,
  validateGameBoxParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

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
  exportBlockedHintKey: (parameters) => {
    if (!isGameBoxParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
    }
    return parameters.part === 'assembly'
      ? 'panel.gameBox.pickPartToDownload'
      : null
  },
}
