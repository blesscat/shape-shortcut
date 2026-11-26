import { describe, expect, it } from 'vitest'
import { parseRawParameters } from '../../src/components/cad/workspace/validation/model-raw-parsers'
import {
  cardDepthField,
  diceCountField,
  diceSizeField,
} from '../../src/components/cad/component-panels/game-box/fields'
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

describe('game-box panel slider stops parse valid', () => {
  // Every range-text control the game-box panel builds: the four cover
  // number fields (from rangesCover, exactly what the panel's numericField
  // reads) and one of each module field family. Every slider stop from min
  // to max by the field's step must parse valid through the raw parser with
  // the other fields at defaults.
  const stopValues = (field: {
    min: number
    max: number
    step: number
  }): number[] => {
    const values: number[] = []
    for (let value = field.min; value <= field.max; value += field.step) {
      values.push(Math.round(value * 100) / 100)
    }
    return values
  }

  const coverFields = [
    {
      name: 'coverTitleTextHeight',
      range: GAME_BOX_CONFIGURATION.rangesCover.coverTitleTextHeight,
    },
    {
      name: 'coverSubtitleTextHeight',
      range: GAME_BOX_CONFIGURATION.rangesCover.coverSubtitleTextHeight,
    },
    {
      name: 'coverSvgWidth',
      range: GAME_BOX_CONFIGURATION.rangesCover.coverSvgWidth,
    },
    {
      name: 'coverVerticalPosition',
      range: {
        ...GAME_BOX_CONFIGURATION.rangesCover.coverVerticalPosition,
        step: 1,
      },
    },
  ] as const

  it('parses every cover slider stop as valid', () => {
    for (const { name, range } of coverFields) {
      for (const value of stopValues(range)) {
        const raw: Record<string, string> = {
          ...Object.fromEntries(
            GAME_BOX_PARAMETER_KEYS.map((key) => [
              key,
              String(GAME_BOX_CONFIGURATION.defaultParameters[key]),
            ]),
          ),
          [name]: String(value),
        } as Record<string, string>
        const parsed = parseRawParameters(raw as never, 'game-box')
        expect(parsed.valid, `${name} = ${value}`).toBe(true)
      }
    }
  })

  // The module fields come from the panel's own builders (fields.ts), so
  // the sweep follows the real sliders. These fields have no step/precision
  // mismatch (diceSize uses the half-step parser, the integer fields the
  // dimension parser), so the property here is: every slider stop is
  // representable by the field's parser. Some stops still fail validation
  // on business rules (dice capacity, the 15-150 mm depth range) - those
  // are rejections, not representation bugs, and out of scope for this
  // sweep.
  it('accepts every module slider stop by its field parser', () => {
    const moduleFields = [
      cardDepthField(1),
      diceSizeField(2),
      diceCountField(2),
      cardDepthField(2),
    ]
    for (const field of moduleFields) {
      for (const value of stopValues(field)) {
        const raw: Record<string, string> = {
          ...Object.fromEntries(
            GAME_BOX_PARAMETER_KEYS.map((key) => [
              key,
              String(GAME_BOX_CONFIGURATION.defaultParameters[key]),
            ]),
          ),
          [field.key]: String(value),
        } as Record<string, string>
        const parsed = parseRawParameters(raw as never, 'game-box')
        expect(parsed, `${field.key} = ${value} returns a result`).toBeDefined()
        // Dice capacity and the depth range are business rejections; the
        // precision property under test is that no slider stop turns into
        // NaN the way the 0.5 mm cover text heights did before the fix.
        if (!parsed.valid) {
          expect(
            parsed.messageId,
            `${field.key} = ${value} fails on a business rule, not the parser`,
          ).not.toBe('validation.invalidNumber')
        }
      }
    }
  })
})
