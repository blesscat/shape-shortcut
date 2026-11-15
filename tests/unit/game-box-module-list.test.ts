import { describe, expect, it } from 'vitest'
import {
  activeModuleCount,
  addModuleGroup,
  deleteModuleGroup,
  moduleSnapshot,
  moveModuleGroup,
  readModuleGroups,
  snapshotRawValues,
} from '../../src/components/cad/component-panels/game-box/module-list'
import {
  GAME_BOX_CONFIGURATION,
  GAME_BOX_PARAMETER_KEYS,
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
    const validation = validateGameBoxParameters(
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          key === 'part' || key.endsWith('Type') ? value : Number(value),
        ]),
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
})
