import { describe, expect, it } from 'vitest'
import {
  CARD_BOX_CONFIGURATION,
  GAME_BOX_CONFIGURATION,
  GAME_BOX_DIVIDER_INDICES,
  GAME_BOX_PARAMETER_KEYS,
  boundsForGameBox,
  gameBoxAvailableParts,
  gameBoxFileName,
  gameBoxLayout,
  gameBoxModuleCardDepthKey,
  gameBoxModuleDiceCountKey,
  gameBoxDividerStyleKey,
  gameBoxDividerTabPositionKey,
  gameBoxDividerTextKey,
  gameBoxModuleDiceSizeKey,
  gameBoxModuleTypeKey,
  gameBoxDiceLayout,
  gameBoxStlFileName,
  gameBoxStorageDepth,
  gameBoxThreeMfFileName,
  gameBoxHasAccentArt,
  isGameBoxParameters,
  modelFileName,
  modelStlFileName,
  validateGameBoxParameters,
  type GameBoxModuleIndex,
  type GameBoxModuleType,
  type GameBoxParameters,
} from '../../src/cad-contract/units'
import { gameBoxDiceHolderFrame } from '../../src/cad-kernel/components/game-box/dice-holder'

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
  it('carries 51 flat keys generated from the module, divider and cover groups', () => {
    expect(GAME_BOX_PARAMETER_KEYS).toHaveLength(51)
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
    for (const index of GAME_BOX_DIVIDER_INDICES) {
      expect(GAME_BOX_PARAMETER_KEYS).toContain(gameBoxDividerTextKey(index))
      expect(GAME_BOX_PARAMETER_KEYS).toContain(
        gameBoxDividerTabPositionKey(index),
      )
      expect(GAME_BOX_PARAMETER_KEYS).toContain(gameBoxDividerStyleKey(index))
    }
    for (const key of [
      'coverTitle',
      'coverTitleTextHeight',
      'coverSubtitle',
      'coverSubtitleTextHeight',
      'coverSvgWidth',
      'coverVerticalPosition',
      'coverStyle',
      'usesCoverSvg',
      'coverSvgFingerprint',
    ] as const) {
      expect(GAME_BOX_PARAMETER_KEYS).toContain(key)
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
      snapshot([], { part: 'tray' }),
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
      snapshot([{ type: 'cards', cardDepth: 30 }], { part: 'divider1' }),
      'part',
      'validation.gameBoxDividerUnavailable',
    )
  })

  it('rejects a divider part beyond the active boundaries', () => {
    expectIssue(
      snapshot(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 9 },
        ],
        { part: 'divider2' },
      ),
      'part',
      'validation.gameBoxDividerUnavailable',
    )
  })

  it('accepts a divider part once two card modules are adjacent', () => {
    const validation = validateGameBoxParameters(
      snapshot(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'cards', cardDepth: 20 },
        ],
        { part: 'divider' },
      ),
    )
    expect(validation.valid).toBe(true)
  })

  it('refuses a divider part when a dice holder stands between the cards', () => {
    // The holder is its own divider, so no plate is printed next to it.
    const validation = validateGameBoxParameters(
      snapshot(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 9 },
        ],
        { part: 'divider1' },
      ),
    )
    expect(validation.valid).toBe(false)
    if (validation.valid) return
    expect(validation.issues[0]?.messageId).toBe(
      'validation.gameBoxDividerUnavailable',
    )
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
    expect(gameBoxFileName(box)).toBe('game-box-box-70x120x75-c30-d16-c20.step')
    expect(gameBoxStlFileName(box)).toBe(
      'game-box-box-70x120x75-c30-d16-c20.stl',
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
    expect(gameBoxFileName(box)).toBe('game-box-box-70x120x54-c30-d16.step')
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
    expect(gameBoxFileName(lid)).toBe('game-box-lid-70x120x33.step')
    expect(gameBoxFileName(divider)).toBe('game-box-divider-70x120x33.step')
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
    for (const part of ['box', 'lid', 'divider1'] as const) {
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
    expect(modelFileName(model)).toBe('game-box-box-70x120x75-c30-d16-c20.step')
    expect(modelStlFileName(model)).toBe(
      'game-box-box-70x120x75-c30-d16-c20.stl',
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

describe('game-box divider card fields', () => {
  it('defaults every divider to a blank left raised card', () => {
    const validation = validateGameBoxParameters({})
    expect(validation.valid).toBe(true)
    if (!validation.valid) return
    for (const index of [1, 2, 3, 4, 5] as const) {
      expect(validation.value[gameBoxDividerTextKey(index)]).toBe('')
      expect(validation.value[gameBoxDividerTabPositionKey(index)]).toBe('left')
      expect(validation.value[gameBoxDividerStyleKey(index)]).toBe('raised')
    }
  })

  it('rejects a label over 20 characters on the owning field', () => {
    expectIssue(
      snapshot([], { divider2Text: 'x'.repeat(21) }),
      'divider2Text',
      'validation.gameBoxTextTooLong',
      { max: 20 },
    )
  })

  it('accepts a 20-character label', () => {
    const validation = validateGameBoxParameters(
      snapshot([], { divider2Text: 'x'.repeat(20) }),
    )
    expect(validation.valid).toBe(true)
  })

  it('rejects an unknown tab position and an unknown style', () => {
    expectIssue(
      snapshot([], { divider1TabPosition: 'middle' }),
      'divider1TabPosition',
      'validation.gameBoxTabPositionInvalid',
    )
    expectIssue(
      snapshot([], { divider3Style: 'embossed' }),
      'divider3Style',
      'validation.gameBoxStyleInvalid',
    )
  })

  it('keeps inactive divider groups out of the geometry results', () => {
    const active = parameters([
      { type: 'cards', cardDepth: 30 },
      { type: 'dice', diceSize: 16, diceCount: 9 },
    ])
    const withInactiveFields = {
      ...active,
      divider3Text: 'unused',
      divider3TabPosition: 'right',
      divider3Style: 'flat',
    } as GameBoxParameters
    expect(gameBoxLayout(withInactiveFields)).toEqual(gameBoxLayout(active))
    expect(gameBoxStorageDepth(withInactiveFields)).toBe(
      gameBoxStorageDepth(active),
    )
  })
})

describe('game-box cover fields', () => {
  it('defaults the cover to GAME with the agreed numbers', () => {
    const validation = validateGameBoxParameters({})
    expect(validation.valid).toBe(true)
    if (!validation.valid) return
    expect(validation.value.coverTitle).toBe('GAME')
    expect(validation.value.coverTitleTextHeight).toBe(6)
    expect(validation.value.coverSubtitle).toBe('')
    expect(validation.value.coverSubtitleTextHeight).toBe(5)
    expect(validation.value.coverSvgWidth).toBe(40)
    expect(validation.value.coverVerticalPosition).toBe(30)
    expect(validation.value.coverStyle).toBe('raised')
    expect(validation.value.usesCoverSvg).toBe(false)
    expect(validation.value.coverSvgFingerprint).toBe('')
  })

  it('rejects cover fields outside their ranges on the owning field', () => {
    expectIssue(
      snapshot([], { coverTitleTextHeight: 25 }),
      'coverTitleTextHeight',
      'validation.invalid',
      { min: 4, max: 20, unit: 'mm' },
    )
    expectIssue(
      snapshot([], { coverSubtitleTextHeight: 2 }),
      'coverSubtitleTextHeight',
      'validation.invalid',
      { min: 3, max: 12, unit: 'mm' },
    )
    expectIssue(
      snapshot([], { coverSvgWidth: 60 }),
      'coverSvgWidth',
      'validation.invalid',
      { min: 10, max: 58, unit: 'mm' },
    )
    expectIssue(
      snapshot([], { coverVerticalPosition: 101 }),
      'coverVerticalPosition',
      'validation.invalid',
      { min: 0, max: 100 },
    )
  })

  it('rejects cover lines over 30 characters', () => {
    expectIssue(
      snapshot([], { coverTitle: 'x'.repeat(31) }),
      'coverTitle',
      'validation.gameBoxTextTooLong',
      { max: 30 },
    )
    expectIssue(
      snapshot([], { coverSubtitle: 'x'.repeat(31) }),
      'coverSubtitle',
      'validation.gameBoxTextTooLong',
      { max: 30 },
    )
  })

  it('rejects a missing SVG fingerprint when the SVG flag is on', () => {
    expectIssue(
      snapshot([], { usesCoverSvg: true, coverSvgFingerprint: '' }),
      'coverSvgFingerprint',
      'validation.gameBoxSvgFingerprintMissing',
    )
  })
})

describe('game-box accent art and 3MF file names', () => {
  it('marks a labelled divider and a decorated cover as art parts', () => {
    const labelled = parameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ],
      { part: 'divider1', divider1Text: 'CATCH' },
    )
    const blank = { ...labelled, divider1Text: '' } as GameBoxParameters
    expect(gameBoxHasAccentArt(labelled)).toBe(true)
    expect(gameBoxHasAccentArt(blank)).toBe(false)
    const cover = parameters([{ type: 'cards' }], { part: 'cover' })
    expect(gameBoxHasAccentArt(cover)).toBe(true)
    expect(gameBoxHasAccentArt({ ...cover, coverTitle: '  ' })).toBe(false)
    expect(
      gameBoxHasAccentArt({ ...cover, coverTitle: '', usesCoverSvg: true }),
    ).toBe(true)
    expect(gameBoxHasAccentArt(parameters([{ type: 'cards' }]))).toBe(false)
    expect(
      gameBoxHasAccentArt(
        parameters([{ type: 'dice', diceSize: 16, diceCount: 9 }], {
          part: 'module1',
        }),
      ),
    ).toBe(false)
  })

  it('names divider cards by boundary so identical plates never collide', () => {
    const modules = [
      { type: 'cards', cardDepth: 30 },
      { type: 'dice', diceSize: 16, diceCount: 9 },
      { type: 'cards', cardDepth: 20 },
    ] as const
    const first = gameBoxFileName(parameters(modules, { part: 'divider1' }))
    const second = gameBoxFileName(parameters(modules, { part: 'divider2' }))
    expect(first).toBe('game-box-divider1-70x120x73.35-left-raised-blank.step')
    expect(second).toBe('game-box-divider2-70x120x73.35-left-raised-blank.step')
    expect(first).not.toBe(second)
  })

  it('names divider cards by tab, style and text token', () => {
    const modules = [
      { type: 'cards', cardDepth: 30 },
      { type: 'cards', cardDepth: 20 },
    ] as const
    const plain = gameBoxFileName(parameters(modules, { part: 'divider1' }))
    const tab = gameBoxFileName(
      parameters(modules, { part: 'divider1', divider1TabPosition: 'center' }),
    )
    const style = gameBoxFileName(
      parameters(modules, { part: 'divider1', divider1Style: 'flat' }),
    )
    const text = gameBoxFileName(
      parameters(modules, { part: 'divider1', divider1Text: 'RED' }),
    )
    expect(plain).toBe('game-box-divider1-70x120x53.7-left-raised-blank.step')
    expect(tab).toBe('game-box-divider1-70x120x53.7-center-raised-blank.step')
    expect(style).toBe('game-box-divider1-70x120x53.7-left-flat-blank.step')
    expect(text).toBe('game-box-divider1-70x120x53.7-left-raised-83ce97fc.step')
    expect(new Set([plain, tab, style, text]).size).toBe(4)
  })

  it('derives a stable FNV-1a token for the divider text', () => {
    const modules = [
      { type: 'cards', cardDepth: 30 },
      { type: 'cards', cardDepth: 20 },
    ] as const
    const red = gameBoxFileName(
      parameters(modules, { part: 'divider1', divider1Text: 'RED' }),
    )
    const redAgain = gameBoxFileName(
      parameters(modules, { part: 'divider1', divider1Text: 'RED' }),
    )
    const blue = gameBoxFileName(
      parameters(modules, { part: 'divider1', divider1Text: 'BLUE' }),
    )
    expect(red).toBe(redAgain)
    expect(red).not.toBe(blue)
  })

  it('names the cover after card size, depth, style and art token', () => {
    const cover = gameBoxFileName(
      parameters([{ type: 'cards' }], { part: 'cover' }),
    )
    expect(cover).toBe('game-box-cover-70x120x61.85-raised-5533ae9f.step')
    const flat = gameBoxFileName(
      parameters([{ type: 'cards' }], { part: 'cover', coverStyle: 'flat' }),
    )
    expect(flat).toContain('-flat-')
    const titled = gameBoxFileName(
      parameters([{ type: 'cards' }], {
        part: 'cover',
        coverTitle: 'GO FISH',
      }),
    )
    expect(titled).not.toBe(cover)
    // A blank cover (no title, subtitle or SVG) reads blank.
    const blank = gameBoxFileName(
      parameters([{ type: 'cards' }], {
        part: 'cover',
        coverTitle: '',
      }),
    )
    expect(blank).toBe('game-box-cover-70x120x61.85-raised-blank.step')
  })

  it('names the 3MF exactly like the STEP with the .3mf extension', () => {
    const labelled = parameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 9 },
      ],
      { part: 'divider1', divider1Text: 'CATCH' },
    )
    expect(gameBoxThreeMfFileName(labelled)).toBe(
      gameBoxFileName(labelled).replace(/\.step$/, '.3mf'),
    )
    const cover = parameters([{ type: 'cards' }], { part: 'cover' })
    expect(gameBoxThreeMfFileName(cover)).toBe(
      gameBoxFileName(cover).replace(/\.step$/, '.3mf'),
    )
    // Blank plates and the box parts have no 3MF.
    expect(gameBoxThreeMfFileName({ ...labelled, divider1Text: '' })).toBeNull()
    expect(gameBoxThreeMfFileName(parameters([{ type: 'cards' }]))).toBeNull()
    expect(
      gameBoxThreeMfFileName(
        parameters([{ type: 'dice', diceSize: 16, diceCount: 9 }], {
          part: 'module1',
        }),
      ),
    ).toBeNull()
  })

  it('keeps the box, lid and dice holder names unchanged', () => {
    expect(
      gameBoxFileName(
        parameters(
          [
            { type: 'cards', cardDepth: 30 },
            { type: 'dice', diceSize: 16, diceCount: 9 },
          ],
          { part: 'box' },
        ),
      ),
    ).toBe('game-box-box-70x120x51.5-c30-d16.step')
    expect(
      gameBoxFileName(
        parameters(
          [
            { type: 'cards', cardDepth: 30 },
            { type: 'dice', diceSize: 16, diceCount: 9 },
          ],
          { part: 'lid' },
        ),
      ),
    ).toBe('game-box-lid-70x120x51.5.step')
    expect(
      gameBoxFileName(
        parameters([{ type: 'dice', diceSize: 16, diceCount: 9 }], {
          part: 'module1',
        }),
      ),
    ).toBe('game-box-dice-holder-70x120-d16x9.step')
  })
})

describe('game-box bounds for the new parts', () => {
  it('frames the cover plate as interior width x card height x 0.6', () => {
    const bounds = boundsForGameBox(
      parameters([{ type: 'cards' }], { part: 'cover' }),
    )
    expect(bounds.min[2]).toBe(0)
    expect(bounds.max[2]).toBeCloseTo(0.6, 6)
    expect(bounds.max[1]).toBe(120)
    expect(bounds.max[0] - bounds.min[0]).toBeCloseTo(70.5, 6)
  })

  it('frames every divider card like the plain divider outline', () => {
    const modules = [
      { type: 'cards', cardDepth: 30 },
      { type: 'dice', diceSize: 16, diceCount: 9 },
    ] as const
    for (const part of ['divider1', 'divider2'] as const) {
      const bounds = boundsForGameBox(parameters(modules, { part }))
      expect(bounds.min[2]).toBe(0)
      expect(bounds.max[2]).toBeCloseTo(0.85, 6)
      expect(bounds.max[1]).toBeCloseTo(125, 6)
      expect(bounds.max[0] - bounds.min[0]).toBeCloseTo(70.85, 6)
    }
  })
})

describe('game-box lists cover and divider parts', () => {
  it('offers cover and one divider per boundary', () => {
    expect(
      gameBoxAvailableParts(
        parameters([
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 9 },
          { type: 'cards', cardDepth: 20 },
        ]),
      ),
    ).toEqual([
      'assembly',
      'box',
      'lid',
      'cover',
      'divider1',
      'divider2',
      'module2',
    ])
  })

  it('offers cover even with a single module and no divider', () => {
    expect(gameBoxAvailableParts(parameters([{ type: 'cards' }]))).toEqual([
      'assembly',
      'box',
      'lid',
      'cover',
    ])
  })
})

describe('game-box cover and divider fields survive a card-size preset', () => {
  it('a merged snapshot that only changes the card size keeps every new field', () => {
    const presetOverrides = { cardWidth: 63, cardHeight: 88 }
    const merged = {
      ...GAME_BOX_CONFIGURATION.defaultParameters,
      divider2Text: 'SPELLS',
      divider2TabPosition: 'center',
      divider2Style: 'flat',
      coverTitle: 'GO FISH',
      usesCoverSvg: true,
      coverSvgFingerprint: 'abc',
      ...presetOverrides,
    }
    const validation = validateGameBoxParameters(merged)
    expect(validation.valid).toBe(true)
    if (!validation.valid) return
    expect(validation.value.cardWidth).toBe(63)
    expect(validation.value.cardHeight).toBe(88)
    expect(validation.value[gameBoxDividerTextKey(2)]).toBe('SPELLS')
    expect(validation.value[gameBoxDividerTabPositionKey(2)]).toBe('center')
    expect(validation.value[gameBoxDividerStyleKey(2)]).toBe('flat')
    expect(validation.value.coverTitle).toBe('GO FISH')
    expect(validation.value.usesCoverSvg).toBe(true)
  })

  it('a preset that provably cannot fit the cover art is not applicable', () => {
    // The 41x63 card has a 27.5 mm safe area; a 40 mm SVG cannot fit, so the
    // merged snapshot is invalid and the preset is not applied.
    const merged = {
      ...GAME_BOX_CONFIGURATION.defaultParameters,
      usesCoverSvg: true,
      coverSvgFingerprint: 'abc',
      coverSvgWidth: 40,
      cardWidth: 41,
      cardHeight: 63,
    }
    expect(validateGameBoxParameters(merged).valid).toBe(false)
  })
})

describe('game-box divider label relief', () => {
  it('relieves only the free band above the topmost die, for every valid size', () => {
    const relief = GAME_BOX_CONFIGURATION.dividerLabelRelief
    // The band may not reach below the top margin: the highest die top is
    // always cardHeight - diceHolderTopMargin, so the relief never enters
    // the dice region and capacity is unaffected for every valid input.
    expect(relief.bandHeight).toBeLessThanOrEqual(
      GAME_BOX_CONFIGURATION.diceHolderTopMargin,
    )
    const topMargin = GAME_BOX_CONFIGURATION.diceHolderTopMargin
    for (const diceSize of [8, 8.5, 12, 16, 20, 25.5, 30] as const) {
      for (const cardHeight of [60, 63, 88, 91, 120, 150] as const) {
        // The ceiling comes from the kernel frame (the built geometry), not
        // from algebra over the same constants, so a kernel change that
        // moves the well floor or the die stack breaks this assertion.
        const frame = gameBoxDiceHolderFrame({
          cardWidth: 70,
          cardHeight,
          diceSize,
          diceCount: 1,
        })
        const dieCeiling = frame.wellFloorZ + frame.layout.layers * frame.pitch
        expect(
          dieCeiling,
          `die ceiling at ${diceSize}x${cardHeight}`,
        ).toBeCloseTo(cardHeight - topMargin, 6)
        expect(
          relief.bandHeight,
          `relief band at ${diceSize}x${cardHeight}`,
        ).toBeLessThanOrEqual(cardHeight - dieCeiling)
      }
    }
  })

  it('clears the raised label: art protrusion plus margin fits the recess', () => {
    const relief = GAME_BOX_CONFIGURATION.dividerLabelRelief
    // Raised art reaches 0.4 mm (accentDepth) out of the plate face while
    // the holder face keeps the 0.3 mm designed gap, so the art penetrates
    // 0.1 mm; the 0.3 mm recess clears it with the 0.2 mm minimum margin.
    expect(relief.depth - 0.1).toBeGreaterThanOrEqual(0.2 - 1e-9)
    // 0.4 mm art depth - 0.3 mm holder gap + the 0.2 mm minimum margin.
    expect(relief.depth).toBeCloseTo(
      CARD_BOX_CONFIGURATION.accentDepth -
        GAME_BOX_CONFIGURATION.diceHolderGap +
        0.2,
      9,
    )
  })
})
