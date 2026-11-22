import { describe, expect, it } from 'vitest'
import {
  activeModuleCount,
  addModuleGroup,
  deleteModuleGroup,
  dividerAndCoverRawValues,
  moduleSnapshot,
  moveModuleGroup,
  readModuleGroups,
  resetInactiveDividerValues,
  snapshotRawValues,
} from '../../src/components/cad/component-panels/game-box/module-list'
import {
  GAME_BOX_CONFIGURATION,
  GAME_BOX_PARAMETER_KEYS,
  gameBoxDividerStyleKey,
  gameBoxDividerTabPositionKey,
  gameBoxDividerTextKey,
  gameBoxLayout,
  validateGameBoxParameters,
  type GameBoxParameters,
} from '../../src/cad-contract/units'
import type { RawParameters } from '../../src/components/cad/workspace/types'

function rawFromGroups(
  types: readonly ('cards' | 'dice')[],
  depths: readonly number[] = [],
): RawParameters {
  const raw: Record<string, string> = {}
  types.forEach((type, position) => {
    raw[`module${position + 1}Type`] = type
    if (depths[position] !== undefined) {
      raw[`module${position + 1}CardDepth`] = String(depths[position])
    }
  })
  return raw as RawParameters
}

describe('game-box module list', () => {
  it('reads the six groups from the raw snapshot', () => {
    const groups = readModuleGroups(
      rawFromGroups(['cards', 'dice', 'cards'], [30, 30, 20]),
    )
    expect(groups).toHaveLength(6)
    expect(groups.map((group) => group.type)).toEqual([
      'cards',
      'dice',
      'cards',
      'none',
      'none',
      'none',
    ])
    expect(groups[2]?.cardDepth).toBe('20')
    expect(activeModuleCount(groups)).toBe(3)
  })

  it('appends a module with the contract defaults', () => {
    const groups = readModuleGroups(rawFromGroups(['cards']))
    const next = addModuleGroup(groups, 'dice')
    expect(activeModuleCount(next)).toBe(2)
    expect(next[1]).toEqual({
      type: 'dice',
      cardDepth: String(GAME_BOX_CONFIGURATION.defaults.cardDepth),
      diceSize: String(GAME_BOX_CONFIGURATION.defaults.diceSize),
      diceCount: String(GAME_BOX_CONFIGURATION.defaults.diceCount),
    })
  })

  it('refuses to grow past six modules', () => {
    const groups = readModuleGroups(
      rawFromGroups(['cards', 'cards', 'cards', 'cards', 'cards', 'cards']),
    )
    expect(activeModuleCount(groups)).toBe(6)
    expect(activeModuleCount(addModuleGroup(groups, 'dice'))).toBe(6)
  })

  it('keeps the last module when a middle module is deleted', () => {
    const groups = readModuleGroups(
      rawFromGroups(['cards', 'dice', 'cards'], [30, 30, 20]),
    )
    const next = deleteModuleGroup(groups, 1)
    expect(next.map((group) => group.type)).toEqual([
      'cards',
      'cards',
      'none',
      'none',
      'none',
      'none',
    ])
    expect(next[1]?.cardDepth).toBe('20')
  })

  it('keeps the only module when the last one would be deleted', () => {
    const groups = readModuleGroups(rawFromGroups(['cards']))
    expect(activeModuleCount(deleteModuleGroup(groups, 0))).toBe(1)
  })

  it('keeps an unfinished field entry when the list changes', () => {
    const groups = readModuleGroups({
      ...rawFromGroups(['cards']),
      module1CardDepth: 'abc',
    } as RawParameters)
    const next = addModuleGroup(groups, 'dice')
    expect(next[0]?.cardDepth).toBe('abc')
    expect(snapshotRawValues(next, 'assembly', 70, 120).module1CardDepth).toBe(
      'abc',
    )
  })

  it('swaps the type and the field values when a module moves', () => {
    const groups = readModuleGroups(rawFromGroups(['cards', 'dice'], [30]))
    groups[1]!.diceSize = '16'
    groups[1]!.diceCount = '9'
    const next = moveModuleGroup(groups, 1, -1)
    expect(next[0]?.type).toBe('dice')
    expect(next[0]?.diceSize).toBe('16')
    expect(next[0]?.diceCount).toBe('9')
    expect(next[1]?.type).toBe('cards')
    expect(next[1]?.cardDepth).toBe('30')
  })

  it('writes a complete and contiguous snapshot', () => {
    const groups = readModuleGroups(
      rawFromGroups(['cards', 'dice', 'cards'], [30, 30, 20]),
    )
    const values = snapshotRawValues(groups, 'assembly', 70, 120)
    expect(Object.keys(values).sort()).toEqual(
      [...GAME_BOX_PARAMETER_KEYS].sort(),
    )
    const enumSuffixes = ['Type', 'TabPosition', 'Style']
    const textKeys = [
      'coverTitle',
      'coverSubtitle',
      'coverSvgFingerprint',
      ...[1, 2, 3, 4, 5].map((divider) => `divider${divider}Text`),
    ]
    const validation = validateGameBoxParameters(
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => {
          if (key === 'usesCoverSvg') return [key, value === 'true']
          if (key === 'part' || enumSuffixes.some((s) => key.endsWith(s)))
            return [key, value]
          if (textKeys.includes(key)) return [key, value]
          return [key, Number(value)]
        }),
      ),
    )
    expect(validation.valid).toBe(true)
  })

  it('resets the trailing groups to inactive when a module is deleted', () => {
    const groups = readModuleGroups(
      rawFromGroups(['cards', 'dice', 'cards'], [30, 30, 20]),
    )
    const next = deleteModuleGroup(groups, 0)
    const snapshot = moduleSnapshot(next, 'assembly', 70, 120)
    expect(snapshot.module1Type).toBe('dice')
    expect(snapshot.module2Type).toBe('cards')
    expect(snapshot.module3Type).toBe('none')
    expect(snapshot.module6Type).toBe('none')
  })

  it('keeps a valid snapshot after every list operation', () => {
    let groups = readModuleGroups(rawFromGroups(['cards']))
    groups = addModuleGroup(groups, 'dice')
    groups = addModuleGroup(groups, 'cards')
    const validation = validateGameBoxParameters(
      moduleSnapshot(groups, 'assembly', 70, 120),
    )
    expect(validation.valid).toBe(true)
    const parameters = validation.valid
      ? (validation.value as GameBoxParameters)
      : null
    expect(parameters?.module3Type).toBe('cards')
  })

  it('falls back to the default of the position for an empty field', () => {
    const groups = readModuleGroups({
      module1Type: 'cards',
      module1CardDepth: '',
      module2Type: 'cards',
      module2CardDepth: '',
    } as RawParameters)
    const snapshot = moduleSnapshot(groups, 'assembly', 70, 120)
    // The first module keeps its thicker default, every other module the
    // plain one: an empty field is unfinished, never a zero.
    expect(snapshot.module1CardDepth).toBe(
      GAME_BOX_CONFIGURATION.defaults.firstModuleCardDepth,
    )
    expect(snapshot.module2CardDepth).toBe(
      GAME_BOX_CONFIGURATION.defaults.cardDepth,
    )
    // The read-only storage depth follows the fallback, not the empty field.
    const filled = moduleSnapshot(
      readModuleGroups({
        module1Type: 'cards',
        module1CardDepth: String(
          GAME_BOX_CONFIGURATION.defaults.firstModuleCardDepth,
        ),
        module2Type: 'cards',
        module2CardDepth: String(GAME_BOX_CONFIGURATION.defaults.cardDepth),
      } as RawParameters),
      'assembly',
      70,
      120,
    )
    expect(gameBoxLayout(snapshot).storageDepth).toBe(
      gameBoxLayout(filled).storageDepth,
    )
  })

  it('falls back to the default of the position for an unreadable field', () => {
    const groups = readModuleGroups({
      module1Type: 'dice',
      module1DiceSize: 'abc',
      module1DiceCount: '',
      module2Type: 'cards',
      module2CardDepth: 'abc',
    } as RawParameters)
    const snapshot = moduleSnapshot(groups, 'assembly', 70, 120)
    expect(snapshot.module1DiceSize).toBe(
      GAME_BOX_CONFIGURATION.defaults.diceSize,
    )
    expect(snapshot.module1DiceCount).toBe(
      GAME_BOX_CONFIGURATION.defaults.diceCount,
    )
    expect(snapshot.module2CardDepth).toBe(
      GAME_BOX_CONFIGURATION.defaults.cardDepth,
    )
  })
})

describe('game-box divider settings across list operations', () => {
  function rawWithDividerSettings(): RawParameters {
    const raw = rawFromGroups(
      ['cards', 'dice', 'cards'],
      [30, 16, 20],
    ) as Record<string, string>
    raw['divider1Text'] = 'RED'
    raw['divider1TabPosition'] = 'center'
    raw['divider1Style'] = 'flat'
    raw['divider2Text'] = 'BLUE'
    raw['coverTitle'] = 'GO FISH'
    return raw as RawParameters
  }

  it('keeps the divider and cover values through a list operation', () => {
    const groups = readModuleGroups(rawWithDividerSettings())
    const values = snapshotRawValues(
      groups,
      'assembly',
      70,
      120,
      rawWithDividerSettings(),
    )
    expect(values.divider1Text).toBe('RED')
    expect(values.divider1TabPosition).toBe('center')
    expect(values.divider1Style).toBe('flat')
    expect(values.divider2Text).toBe('BLUE')
    expect(values.coverTitle).toBe('GO FISH')
  })

  it('defaults the divider and cover values when no raw snapshot exists', () => {
    const groups = readModuleGroups(rawFromGroups(['cards']))
    const values = snapshotRawValues(groups, 'assembly', 70, 120)
    expect(values.divider1Text).toBe('')
    expect(values.divider1TabPosition).toBe('left')
    expect(values.divider1Style).toBe('raised')
    expect(values.coverTitle).toBe(GAME_BOX_CONFIGURATION.defaultCoverTitle)
    expect(values.usesCoverSvg).toBe('false')
  })

  it('resets the vanished boundary and keeps the surviving ones by index', () => {
    const values = resetInactiveDividerValues(
      dividerAndCoverRawValues(rawWithDividerSettings()),
      1,
    )
    expect(values[gameBoxDividerTextKey(1)]).toBe('RED')
    expect(values[gameBoxDividerTabPositionKey(1)]).toBe('center')
    expect(values[gameBoxDividerStyleKey(1)]).toBe('flat')
    expect(values[gameBoxDividerTextKey(2)]).toBe('')
    expect(values[gameBoxDividerTabPositionKey(2)]).toBe('left')
    expect(values[gameBoxDividerStyleKey(2)]).toBe('raised')
    // The vanished boundary reset does not touch the cover fields.
    expect(values.coverTitle).toBe('GO FISH')
  })

  it('keeps every boundary when the list grows', () => {
    const values = resetInactiveDividerValues(
      dividerAndCoverRawValues(rawWithDividerSettings()),
      2,
    )
    expect(values[gameBoxDividerTextKey(1)]).toBe('RED')
    expect(values[gameBoxDividerTextKey(2)]).toBe('BLUE')
  })
})
