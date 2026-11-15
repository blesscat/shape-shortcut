import {
  GAME_BOX_CONFIGURATION,
  GAME_BOX_MODULE_INDICES,
  gameBoxModuleCardDepthKey,
  gameBoxModuleDiceCountKey,
  gameBoxModuleDiceSizeKey,
  gameBoxModuleTypeKey,
  type GameBoxModuleType,
  type GameBoxParameters,
  type GameBoxPart,
  type ModelParameterKey,
} from '../../../../cad-contract/units'
import type { RawParameters } from '../../workspace/types'

/**
 * One storage module: its type and the raw text of the fields that type may
 * use. The text is kept verbatim so an unfinished entry survives a list
 * operation instead of being reset to a default.
 */
export type GameBoxModuleGroup = {
  type: GameBoxModuleType
  cardDepth: string
  diceSize: string
  diceCount: string
}

const DEFAULTS = GAME_BOX_CONFIGURATION.defaults

function inactiveGroup(): GameBoxModuleGroup {
  return {
    type: 'none',
    cardDepth: String(DEFAULTS.cardDepth),
    diceSize: String(DEFAULTS.diceSize),
    diceCount: String(DEFAULTS.diceCount),
  }
}

function typeFromRaw(
  raw: RawParameters,
  key: ModelParameterKey,
  fallback: GameBoxModuleType,
): GameBoxModuleType {
  const value = raw[key]
  if (value === 'none' || value === 'cards' || value === 'dice') return value
  return fallback
}

/**
 * The six module groups of the current raw snapshot, in front-to-back order.
 * Missing values fall back to the contract defaults so the panel can always
 * show a complete list.
 */
export function readModuleGroups(raw: RawParameters): GameBoxModuleGroup[] {
  return GAME_BOX_MODULE_INDICES.map((index) => {
    const isFirst = index === 1
    return {
      type: typeFromRaw(
        raw,
        gameBoxModuleTypeKey(index),
        isFirst ? DEFAULTS.moduleType : 'none',
      ),
      cardDepth:
        raw[gameBoxModuleCardDepthKey(index)] ??
        String(isFirst ? DEFAULTS.firstModuleCardDepth : DEFAULTS.cardDepth),
      diceSize:
        raw[gameBoxModuleDiceSizeKey(index)] ?? String(DEFAULTS.diceSize),
      diceCount:
        raw[gameBoxModuleDiceCountKey(index)] ?? String(DEFAULTS.diceCount),
    }
  })
}

/** Number of enabled modules; the list is always a contiguous prefix. */
export function activeModuleCount(
  groups: readonly GameBoxModuleGroup[],
): number {
  const firstInactive = groups.findIndex((group) => group.type === 'none')
  return firstInactive === -1 ? groups.length : firstInactive
}

/** The number a raw module field carries; unreadable text falls back. */
export function moduleNumber(text: string, fallback: number): number {
  const value = Number(text)
  return Number.isFinite(value) ? value : fallback
}

/**
 * Re-packs the list: the enabled modules keep their order and every group
 * behind them is reset to an inactive group, so the snapshot always stays
 * contiguous.
 */
function repack(enabled: readonly GameBoxModuleGroup[]): GameBoxModuleGroup[] {
  const packed: GameBoxModuleGroup[] = enabled.map((group) => ({ ...group }))
  while (packed.length < GAME_BOX_MODULE_INDICES.length) {
    packed.push(inactiveGroup())
  }
  return packed
}

/** Appends a module of the given type; the list never grows past six. */
export function addModuleGroup(
  groups: readonly GameBoxModuleGroup[],
  type: GameBoxModuleType,
): GameBoxModuleGroup[] {
  const count = activeModuleCount(groups)
  if (count >= GAME_BOX_CONFIGURATION.moduleCount) return [...groups]
  const enabled = groups.slice(0, count).map((group) => ({ ...group }))
  enabled.push({
    type,
    cardDepth: String(DEFAULTS.cardDepth),
    diceSize: String(DEFAULTS.diceSize),
    diceCount: String(DEFAULTS.diceCount),
  })
  return repack(enabled)
}

/** Removes a module and closes the gap; the last module stays in place. */
export function deleteModuleGroup(
  groups: readonly GameBoxModuleGroup[],
  position: number,
): GameBoxModuleGroup[] {
  const count = activeModuleCount(groups)
  if (count <= 1 || position < 0 || position >= count) return [...groups]
  const enabled = groups.slice(0, count).map((group) => ({ ...group }))
  enabled.splice(position, 1)
  return repack(enabled)
}

/** Moves a module one slot earlier (-1) or later (+1). */
export function moveModuleGroup(
  groups: readonly GameBoxModuleGroup[],
  position: number,
  offset: -1 | 1,
): GameBoxModuleGroup[] {
  const count = activeModuleCount(groups)
  const target = position + offset
  if (position < 0 || position >= count || target < 0 || target >= count) {
    return [...groups]
  }
  const enabled = groups.slice(0, count).map((group) => ({ ...group }))
  const moved = enabled[position]!
  enabled[position] = enabled[target]!
  enabled[target] = moved
  return repack(enabled)
}

/**
 * The parameter snapshot the six groups describe. The numbers come from the
 * raw text, so the derived sizes stay readable while a field is unfinished.
 */
export function moduleSnapshot(
  groups: readonly GameBoxModuleGroup[],
  part: GameBoxPart,
  cardWidth: number,
  cardHeight: number,
): GameBoxParameters {
  const parameters: Record<string, unknown> = { part, cardWidth, cardHeight }
  GAME_BOX_MODULE_INDICES.forEach((index, position) => {
    const group = groups[position] ?? inactiveGroup()
    parameters[gameBoxModuleTypeKey(index)] = group.type
    parameters[gameBoxModuleCardDepthKey(index)] = moduleNumber(
      group.cardDepth,
      DEFAULTS.cardDepth,
    )
    parameters[gameBoxModuleDiceSizeKey(index)] = moduleNumber(
      group.diceSize,
      DEFAULTS.diceSize,
    )
    parameters[gameBoxModuleDiceCountKey(index)] = moduleNumber(
      group.diceCount,
      DEFAULTS.diceCount,
    )
  })
  return parameters as unknown as GameBoxParameters
}

/**
 * The complete raw snapshot of the component: the part, the card size and
 * all six module groups. Every list operation writes this snapshot back so
 * the stored parameters stay contiguous.
 */
export function snapshotRawValues(
  groups: readonly GameBoxModuleGroup[],
  part: GameBoxPart,
  cardWidth: number,
  cardHeight: number,
): Partial<Record<ModelParameterKey, string>> {
  const values: Partial<Record<ModelParameterKey, string>> = {
    part,
    cardWidth: String(cardWidth),
    cardHeight: String(cardHeight),
  }
  GAME_BOX_MODULE_INDICES.forEach((index, position) => {
    const group = groups[position] ?? inactiveGroup()
    values[gameBoxModuleTypeKey(index)] = group.type
    values[gameBoxModuleCardDepthKey(index)] = group.cardDepth
    values[gameBoxModuleDiceSizeKey(index)] = group.diceSize
    values[gameBoxModuleDiceCountKey(index)] = group.diceCount
  })
  return values
}
