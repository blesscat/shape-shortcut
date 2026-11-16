import {
  GAME_BOX_CONFIGURATION,
  gameBoxModuleCardDepthKey,
  gameBoxModuleDiceCountKey,
  gameBoxModuleDiceSizeKey,
  type GameBoxModuleIndex,
  type ModelParameterKey,
} from '../../../../cad-contract/units'
import type { ParameterField } from '../../../../features/cad/model-catalog'
import { moduleNumber } from './module-list'

/**
 * The default card depth of a module: the first module of the list carries
 * the thicker default card compartment, every other module the plain one.
 */
export function gameBoxModuleCardDepthDefault(
  index: GameBoxModuleIndex,
): number {
  return index === 1
    ? GAME_BOX_CONFIGURATION.defaults.firstModuleCardDepth
    : GAME_BOX_CONFIGURATION.defaults.cardDepth
}

function moduleField(
  key: ModelParameterKey,
  label: string,
  range: { min: number; max: number; step: number },
  defaultValue: number,
  unit: ParameterField['unit'],
): ParameterField {
  return {
    key,
    label,
    labelFormat: 'label',
    axis: 'Y',
    unit,
    control: 'range-text',
    defaultValue,
    min: range.min,
    max: range.max,
    step: range.step,
    sliderMin: range.min,
    sliderMax: range.max,
  }
}

/** The card depth of a module; the default depends on the module's slot. */
export function cardDepthField(index: GameBoxModuleIndex): ParameterField {
  const range = GAME_BOX_CONFIGURATION.ranges.cardDepth
  return moduleField(
    gameBoxModuleCardDepthKey(index),
    'parameters.gameBoxCardDepth',
    { min: range.min, max: range.max, step: 1 },
    gameBoxModuleCardDepthDefault(index),
    'mm',
  )
}

/** The die size of a dice module, in millimetres. */
export function diceSizeField(index: GameBoxModuleIndex): ParameterField {
  const range = GAME_BOX_CONFIGURATION.ranges.diceSize
  return moduleField(
    gameBoxModuleDiceSizeKey(index),
    'parameters.gameBoxDiceSize',
    { min: range.min, max: range.max, step: range.step },
    GAME_BOX_CONFIGURATION.defaults.diceSize,
    'mm',
  )
}

/** The number of dice of a dice module; a count is not a length. */
export function diceCountField(index: GameBoxModuleIndex): ParameterField {
  const range = GAME_BOX_CONFIGURATION.ranges.diceCount
  return moduleField(
    gameBoxModuleDiceCountKey(index),
    'parameters.gameBoxDiceCount',
    { min: range.min, max: range.max, step: 1 },
    GAME_BOX_CONFIGURATION.defaults.diceCount,
    'count',
  )
}

/**
 * Whether the raw text of a module field differs from the default of its
 * field; an unfinished entry falls back to the default, so it is not
 * reported as edited.
 */
export function moduleFieldChanged(
  text: string,
  field: ParameterField,
): boolean {
  return moduleNumber(text, field.defaultValue) !== field.defaultValue
}
