import { describe, expect, it } from 'vitest'
import {
  GAME_BOX_CONFIGURATION,
  GAME_BOX_PARAMETER_KEYS,
  boundsForGameBox,
  gameBoxAvailableParts,
  gameBoxFileName,
  gameBoxLayout,
  gameBoxModuleCardDepthKey,
  gameBoxModuleDiceCountKey,
  gameBoxModuleDiceSizeKey,
  gameBoxModuleTypeKey,
  gameBoxStlFileName,
  gameBoxStorageDepth,
  isGameBoxParameters,
  modelFileName,
  modelStlFileName,
  validateGameBoxParameters,
  type GameBoxModuleIndex,
  type GameBoxModuleType,
  type GameBoxParameters,
} from '../../src/cad-contract/units'

type ModuleSpec = {
  type: GameBoxModuleType
  cardDepth?: number
  diceSize?: number
  diceCount?: number
}

function moduleOverrides(modules: readonly ModuleSpec[]): {
  [key: string]: unknown
} {
  const overrides: { [key: string]: unknown } = {}
  modules.forEach((module, position) => {
    const index = (position + 1) as GameBoxModuleIndex
    overrides[gameBoxModuleTypeKey(index)] = module.type
    if (module.cardDepth !== undefined) {
      overrides[gameBoxModuleCardDepthKey(index)] = module.cardDepth
    }
    if (module.diceSize !== undefined) {
      overrides[gameBoxModuleDiceSizeKey(index)] = module.diceSize
    }
    if (module.diceCount !== undefined) {
      overrides[gameBoxModuleDiceCountKey(index)] = module.diceCount
    }
  })
  return overrides
}

function snapshot(
  modules: readonly ModuleSpec[] = [],
  extra: { [key: string]: unknown } = {},
): { [key: string]: unknown } {
  return {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
    ...moduleOverrides(modules),
    ...extra,
  }
}

function parameters(
  modules: readonly ModuleSpec[] = [],
  extra: { [key: string]: unknown } = {},
): GameBoxParameters {
  return snapshot(modules, extra) as GameBoxParameters
}

function expectIssue(
  value: unknown,
  field: string,
  messageId: string,
  params?: Record<string, string | number | boolean>,
): void {
  const validation = validateGameBoxParameters(value)
  expect(validation.valid).toBe(false)
  if (validation.valid) return
  expect(validation.issues).toHaveLength(1)
  expect(validation.issues[0]?.field).toBe(field)
  expect(validation.issues[0]?.messageId).toBe(messageId)
  if (params) expect(validation.issues[0]?.params).toMatchObject(params)
}

describe('game-box parameter keys', () => {
  it('carries 27 flat keys generated from the module groups', () => {
    expect(GAME_BOX_PARAMETER_KEYS).toHaveLength(27)
    expect(GAME_BOX_PARAMETER_KEYS).toContain('part')
    expect(GAME_BOX_PARAMETER_KEYS).toContain('cardWidth')
    expect(GAME_BOX_PARAMETER_KEYS).toContain('cardHeight')
    for (const index of [1, 2, 3, 4, 5, 6] as GameBoxModuleIndex[]) {
      expect(GAME_BOX_PARAMETER_KEYS).toContain(gameBoxModuleTypeKey(index))
      expect(GAME_BOX_PARAMETER_KEYS).toContain(
        gameBoxModuleCardDepthKey(index),
      )
      expect(GAME_BOX_PARAMETER_KEYS).toContain(gameBoxModuleDiceSizeKey(index))
      expect(GAME_BOX_PARAMETER_KEYS).toContain(
        gameBoxModuleDiceCountKey(index),
      )
    }
  })
})

describe('game-box parameter validation', () => {
  it('uses the agreed defaults', () => {
    const validation = validateGameBoxParameters({})
    expect(validation.valid).toBe(true)
    if (!validation.valid) return
    expect(validation.value.cardWidth).toBe(70)
    expect(validation.value.cardHeight).toBe(120)
    expect(validation.value.part).toBe('assembly')
    expect(validation.value[gameBoxModuleTypeKey(1)]).toBe('cards')
    expect(validation.value[gameBoxModuleCardDepthKey(1)]).toBe(60)
    expect(validation.value[gameBoxModuleDiceSizeKey(1)]).toBe(16)
    expect(validation.value[gameBoxModuleDiceCountKey(1)]).toBe(9)
    for (const index of [2, 3, 4, 5, 6] as GameBoxModuleIndex[]) {
      expect(validation.value[gameBoxModuleTypeKey(index)]).toBe('none')
      expect(validation.value[gameBoxModuleCardDepthKey(index)]).toBe(30)
    }
  })

  it('rejects unknown keys', () => {
    expectIssue(
      { ...snapshot(), storageDepth: 72 },
      'parameters',
      'validation.invalid',
    )
  })

  it('rejects out-of-range card sizes', () => {
    expectIssue(
      snapshot([], { cardWidth: 39 }),
      'cardWidth',
      'validation.invalid',
    )
    expectIssue(
      snapshot([], { cardHeight: 151 }),
      'cardHeight',
      'validation.invalid',
    )
  })

  it('rejects non-finite card sizes', () => {
    expectIssue(
      snapshot([], { cardWidth: Number.NaN }),
      'cardWidth',
      'validation.invalidNumber',
    )
    expectIssue(
      snapshot([], { cardHeight: Number.POSITIVE_INFINITY }),
      'cardHeight',
      'validation.invalidNumber',
    )
  })

  it('rejects unknown part names', () => {
    expectIssue(
      snapshot([], { part: 'cover' }),
      'part',
      'validation.gameBoxPartInvalid',
    )
  })

  it('rejects unknown module types', () => {
    expectIssue(
      snapshot([{ type: 'cards' }, { type: 'tray' as GameBoxModuleType }]),
      gameBoxModuleTypeKey(2),
      'validation.gameBoxModuleTypeInvalid',
    )
  })

  it('rejects out-of-range module fields', () => {
    expectIssue(
      snapshot([{ type: 'cards', cardDepth: 2 }]),
      gameBoxModuleCardDepthKey(1),
      'validation.invalid',
    )
    expectIssue(
      snapshot([{ type: 'dice', diceSize: 31 }]),
      gameBoxModuleDiceSizeKey(1),
      'validation.invalid',
    )
    expectIssue(
      snapshot([{ type: 'dice', diceCount: 61 }]),
      gameBoxModuleDiceCountKey(1),
      'validation.invalid',
    )
  })

  it('rejects a fractional dice count', () => {
    expectIssue(
      snapshot([{ type: 'dice', diceCount: 3.5 }]),
      gameBoxModuleDiceCountKey(1),
      'validation.gameBoxDiceCountNotInteger',
    )
  })

  it('requires the first module to be enabled', () => {
    expectIssue(
      snapshot([{ type: 'none' }]),
      gameBoxModuleTypeKey(1),
      'validation.gameBoxModuleRequired',
    )
  })

  it('requires the modules to be contiguous', () => {
    expectIssue(
      snapshot([
        { type: 'cards', cardDepth: 30 },
        { type: 'none' },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ]),
      gameBoxModuleTypeKey(3),
      'validation.gameBoxModuleNotContiguous',
      { module: 3 },
    )
  })

  it('rejects a dice count above the capacity of the holder', () => {
    expectIssue(
      snapshot([{ type: 'dice', diceSize: 30, diceCount: 9 }], {
        cardWidth: 40,
        cardHeight: 60,
      }),
      gameBoxModuleDiceCountKey(1),
      'validation.gameBoxDiceCapacityExceeded',
      { max: 1 },
    )
  })

  it('rejects a storage depth above the supported range', () => {
    expectIssue(
      snapshot([{ type: 'cards', cardDepth: 150 }]),
      gameBoxModuleCardDepthKey(1),
      'validation.gameBoxStorageDepthOutOfRange',
    )
  })

  it('rejects a storage depth below the supported range on the last module', () => {
    expectIssue(
      snapshot([
        { type: 'cards', cardDepth: 3 },
        { type: 'cards', cardDepth: 3 },
      ]),
      gameBoxModuleCardDepthKey(2),
      'validation.gameBoxStorageDepthOutOfRange',
    )
  })

  it('rejects a dice holder part of a module that is not a dice module', () => {
    expectIssue(
      snapshot([{ type: 'cards', cardDepth: 30 }], { part: 'module1' }),
      'part',
      'validation.gameBoxPartUnavailable',
      { module: 1 },
    )
  })

  it('rejects a divider part while only one module is active', () => {
    expectIssue(
      snapshot([{ type: 'cards', cardDepth: 30 }], { part: 'divider' }),
      'part',
      'validation.gameBoxDividerUnavailable',
    )
  })

  it('accepts a divider part once two modules are active', () => {
    const validation = validateGameBoxParameters(
      snapshot(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 9 },
        ],
        { part: 'divider' },
      ),
    )
    expect(validation.valid).toBe(true)
  })

  it('accepts a dice holder part of a dice module', () => {
    const validation = validateGameBoxParameters(
      snapshot(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 9 },
        ],
        { part: 'module2' },
      ),
    )
    expect(validation.valid).toBe(true)
  })

  it('accepts the field values of disabled modules', () => {
    const validation = validateGameBoxParameters(
      snapshot([{ type: 'cards', cardDepth: 30 }, { type: 'none' }]),
    )
    expect(validation.valid).toBe(true)
    expect(isGameBoxParameters(snapshot())).toBe(true)
  })
})

describe('game-box export file names', () => {
  it('names the box after the card size, the depth and the module list', () => {
    const box = parameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
        { type: 'cards', cardDepth: 20 },
      ],
      { part: 'box' },
    )
    expect(gameBoxFileName(box)).toBe(
      'game-box-box-70x120x73.35-c30-d16-c20.step',
    )
    expect(gameBoxStlFileName(box)).toBe(
      'game-box-box-70x120x73.35-c30-d16-c20.stl',
    )
  })

  it('names the box of a mixed module list with its depth and its modules', () => {
    const box = parameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ],
      { part: 'box' },
    )
    expect(gameBoxFileName(box)).toBe('game-box-box-70x120x51.5-c30-d16.step')
  })

  it('never lets two module lists share a box file name', () => {
    const first = parameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ],
      { part: 'box' },
    )
    const second = parameters(
      [
        { type: 'cards', cardDepth: 33 },
        { type: 'dice', diceSize: 13, diceCount: 9 },
      ],
      { part: 'box' },
    )
    // Both module lists occupy the same depth, but their divider boundaries
    // differ, so the box file names have to tell them apart.
    expect(gameBoxStorageDepth(first)).toBeCloseTo(
      gameBoxStorageDepth(second),
      6,
    )
    expect(gameBoxFileName(first)).not.toBe(gameBoxFileName(second))
  })

  it('names the dice holder after the card size, the die size and the count', () => {
    const holder = parameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ],
      { part: 'module2' },
    )
    expect(gameBoxFileName(holder)).toBe(
      'game-box-dice-holder-70x120-d16x9.step',
    )
  })

  it('names the lid and the divider after the derived storage depth', () => {
    const lid = parameters([{ type: 'cards', cardDepth: 30 }], { part: 'lid' })
    const divider = parameters([{ type: 'cards', cardDepth: 30 }], {
      part: 'divider',
    })
    expect(gameBoxFileName(lid)).toBe('game-box-lid-70x120x31.85.step')
    expect(gameBoxFileName(divider)).toBe('game-box-divider-70x120x31.85.step')
  })

  it('gives card depths within a hundredth of a millimetre one name', () => {
    // The lid and the divider are named after the derived depth rounded to
    // two decimals, so validation reads the card depth back to a hundredth
    // of a millimetre: depths that round to the same name also build the
    // same geometry.
    const names = new Set<string>()
    for (const cardDepth of [30, 30.001, 30.004]) {
      const validation = validateGameBoxParameters(
        parameters([{ type: 'cards', cardDepth }], { part: 'lid' }),
      )
      expect(validation.valid).toBe(true)
      if (!validation.valid) return
      names.add(gameBoxFileName(validation.value))
    }
    expect(names.size).toBe(1)
  })

  it('never lets two sizes share a file name', () => {
    const names = new Set<string>()
    for (const cardWidth of [40, 70, 100]) {
      for (const cardHeight of [60, 120, 150]) {
        const box = parameters([{ type: 'cards', cardDepth: 30 }], {
          part: 'box',
          cardWidth,
          cardHeight,
        })
        names.add(gameBoxFileName(box))
      }
    }
    expect(names.size).toBe(9)
  })

  it('ignores the fields of disabled modules in the file name', () => {
    const active = parameters([{ type: 'cards', cardDepth: 30 }], {
      part: 'box',
    })
    const withInactiveFields = parameters(
      [{ type: 'cards', cardDepth: 30 }, { type: 'none' }],
      {
        part: 'box',
        [gameBoxModuleDiceSizeKey(2)]: 22,
        [gameBoxModuleDiceCountKey(2)]: 40,
      },
    )
    expect(gameBoxFileName(withInactiveFields)).toBe(gameBoxFileName(active))
  })

  it('ignores the fields of a module type that is not active', () => {
    const active = parameters([
      { type: 'cards', cardDepth: 30 },
      { type: 'dice', diceSize: 16, diceCount: 9 },
    ])
    const withInactiveFields = parameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ],
      {
        [gameBoxModuleDiceSizeKey(1)]: 24,
        [gameBoxModuleDiceCountKey(1)]: 40,
        [gameBoxModuleCardDepthKey(2)]: 90,
      },
    )
    expect(gameBoxStorageDepth(withInactiveFields)).toBe(
      gameBoxStorageDepth(active),
    )
    expect(gameBoxLayout(withInactiveFields)).toEqual(gameBoxLayout(active))
    expect(gameBoxAvailableParts(withInactiveFields)).toEqual(
      gameBoxAvailableParts(active),
    )
    for (const part of ['box', 'lid', 'divider'] as const) {
      expect(gameBoxFileName({ ...withInactiveFields, part })).toBe(
        gameBoxFileName({ ...active, part }),
      )
    }
  })

  it('refuses a file name for the assembly', () => {
    expect(() => gameBoxFileName(parameters([{ type: 'cards' }]))).toThrow(
      'GAME_BOX_ASSEMBLY_EXPORT_FORBIDDEN',
    )
  })

  it('routes the model file names through the model layer', () => {
    const model = {
      modelId: 'game-box',
      parameters: parameters(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 9 },
          { type: 'cards', cardDepth: 20 },
        ],
        { part: 'box' },
      ),
    } as const
    expect(modelFileName(model)).toBe(
      'game-box-box-70x120x73.35-c30-d16-c20.step',
    )
    expect(modelStlFileName(model)).toBe(
      'game-box-box-70x120x73.35-c30-d16-c20.stl',
    )
  })
})

describe('game-box bounds', () => {
  it('frames the box on the bed', () => {
    const bounds = boundsForGameBox(parameters([{ type: 'cards' }]))
    expect(bounds.min[2]).toBe(0)
    expect(bounds.max[2]).toBeGreaterThan(0)
    expect(bounds.min[0]).toBeLessThan(0)
    expect(bounds.max[0]).toBeGreaterThan(0)
  })

  it('frames the dice holder standing up', () => {
    const bounds = boundsForGameBox(
      parameters([{ type: 'dice', diceSize: 16, diceCount: 9 }], {
        part: 'module1',
      }),
    )
    expect(bounds.min[2]).toBe(0)
    expect(bounds.max[2]).toBe(120)
    expect(bounds.max[1]).toBeGreaterThan(0)
  })

  it('keeps the dice holder narrower than the box interior', () => {
    const holderWidth =
      boundsForGameBox(
        parameters([{ type: 'dice', diceSize: 16, diceCount: 9 }], {
          part: 'module1',
        }),
      ).max[0] * 2
    const boxWidth =
      boundsForGameBox(parameters([{ type: 'cards' }])).max[0] * 2
    expect(holderWidth).toBeLessThan(boxWidth)
  })
})
