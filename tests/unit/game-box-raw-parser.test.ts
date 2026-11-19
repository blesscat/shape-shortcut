import { describe, expect, it } from 'vitest'
import { parseRawParameters } from '../../src/components/cad/workspace/validation/model-raw-parsers'
import { rawFromParameters } from '../../src/components/cad/workspace/validation/raw-from-parameters'
import {
  GAME_BOX_CONFIGURATION,
  GAME_BOX_PARAMETER_KEYS,
  type GameBoxParameters,
} from '../../src/cad-contract/units'

function threeModuleSnapshot(): GameBoxParameters {
  return {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
    module1Type: 'cards',
    module1CardDepth: 30,
    module2Type: 'dice',
    module2DiceSize: 16,
    module2DiceCount: 9,
    module3Type: 'cards',
    module3CardDepth: 20,
    module4Type: 'none',
    module5Type: 'none',
    module6Type: 'none',
  }
}

describe('game-box raw parameters', () => {
  it('round-trips the default snapshot', () => {
    const raw = rawFromParameters(GAME_BOX_CONFIGURATION.defaultParameters)
    expect(Object.keys(raw).sort()).toEqual([...GAME_BOX_PARAMETER_KEYS].sort())

    const parsed = parseRawParameters(raw, 'game-box')
    expect(parsed.valid).toBe(true)
    if (!parsed.valid) return
    expect(parsed.value).toEqual(GAME_BOX_CONFIGURATION.defaultParameters)
  })

  it('round-trips a three-module snapshot with a dice module', () => {
    const snapshot = threeModuleSnapshot()
    const raw = rawFromParameters(snapshot)
    const parsed = parseRawParameters(raw, 'game-box')
    expect(parsed.valid).toBe(true)
    if (!parsed.valid) return
    expect(parsed.value).toEqual(snapshot)
  })

  it('keeps half millimetre dice sizes', () => {
    const snapshot = threeModuleSnapshot()
    const raw = rawFromParameters({ ...snapshot, module2DiceSize: 16.5 })
    const parsed = parseRawParameters(raw, 'game-box')
    expect(parsed.valid).toBe(true)
    if (!parsed.valid) return
    expect((parsed.value as GameBoxParameters).module2DiceSize).toBe(16.5)
  })

  it('reports a non-contiguous module list on the offending field', () => {
    const raw = rawFromParameters({
      ...threeModuleSnapshot(),
      module2Type: 'none',
      module3Type: 'dice',
    })
    const parsed = parseRawParameters(raw, 'game-box')
    expect(parsed.valid).toBe(false)
    if (parsed.valid) return
    expect(parsed.messageId).toBe('validation.gameBoxModuleNotContiguous')
    expect(parsed.field).toBe('module3Type')
  })

  it('reports a dice count above the holder capacity', () => {
    const raw = rawFromParameters({
      ...threeModuleSnapshot(),
      cardWidth: 40,
      cardHeight: 60,
      module2DiceSize: 30,
      module2DiceCount: 9,
    })
    const parsed = parseRawParameters(raw, 'game-box')
    expect(parsed.valid).toBe(false)
    if (parsed.valid) return
    expect(parsed.messageId).toBe('validation.gameBoxDiceCapacityExceeded')
    expect(parsed.field).toBe('module2DiceCount')
    expect(parsed.params?.max).toBe(1)
  })

  it('rejects a part that no module provides', () => {
    const raw = rawFromParameters({
      ...threeModuleSnapshot(),
      part: 'module1',
    })
    const parsed = parseRawParameters(raw, 'game-box')
    expect(parsed.valid).toBe(false)
    if (parsed.valid) return
    expect(parsed.messageId).toBe('validation.gameBoxPartUnavailable')
    expect(parsed.field).toBe('part')
  })
})
