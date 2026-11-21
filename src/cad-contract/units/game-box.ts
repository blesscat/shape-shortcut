import type { DiagnosticParams } from '../diagnostics'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxDividerWidth,
  cardBoxInteriorWidth,
  cardBoxOuterDepth,
  cardBoxOuterWidth,
} from './card-box'
import { PROTOTYPE_CONFIGURATION } from './prototype-configuration'

/**
 * Contract layer for the `game-box` component.
 *
 * A game box is a card box whose storage depth is derived from a list of
 * storage modules instead of a user-entered depth: every active module
 * occupies a length that is computed directly from its contents, and a
 * divider plate always separates two neighbouring modules.
 *
 * The module list is stored as six groups of flat parameters
 * (`moduleNType`, `moduleNCardDepth`, `moduleNDiceSize`, `moduleNDiceCount`)
 * because the shared parameter infrastructure only carries flat scalars.
 * The geometry-relevant numbers (module lengths, storage depth, divider
 * centres, dice layout) are derived here so the kernel, the panel, the bounds
 * and the export file names can never disagree.
 */

export const GAME_BOX_MODULE_INDICES = [1, 2, 3, 4, 5, 6] as const

export type GameBoxModuleIndex = (typeof GAME_BOX_MODULE_INDICES)[number]

export type GameBoxModuleType = 'none' | 'cards' | 'dice'

export const GAME_BOX_MODULE_TYPES: readonly GameBoxModuleType[] = [
  'none',
  'cards',
  'dice',
]

export type GameBoxPart =
  'assembly' | 'box' | 'lid' | 'divider' | `module${GameBoxModuleIndex}`

export const GAME_BOX_PARTS: readonly GameBoxPart[] = [
  'assembly',
  'box',
  'lid',
  'divider',
  ...GAME_BOX_MODULE_INDICES.map((index) => `module${index}` as GameBoxPart),
]

export type GameBoxModuleTypeKey = `module${GameBoxModuleIndex}Type`
export type GameBoxModuleCardDepthKey = `module${GameBoxModuleIndex}CardDepth`
export type GameBoxModuleDiceSizeKey = `module${GameBoxModuleIndex}DiceSize`
export type GameBoxModuleDiceCountKey = `module${GameBoxModuleIndex}DiceCount`

export type GameBoxParameterKey =
  | 'part'
  | 'cardWidth'
  | 'cardHeight'
  | GameBoxModuleTypeKey
  | GameBoxModuleCardDepthKey
  | GameBoxModuleDiceSizeKey
  | GameBoxModuleDiceCountKey

export type GameBoxParameters = {
  part: GameBoxPart
  cardWidth: number
  cardHeight: number
} & {
  [Key in GameBoxModuleTypeKey]: GameBoxModuleType
} & {
  [Key in GameBoxModuleCardDepthKey]: number
} & {
  [Key in GameBoxModuleDiceSizeKey]: number
} & {
  [Key in GameBoxModuleDiceCountKey]: number
}

/** Parameter key of the module type field of the given module. */
export function gameBoxModuleTypeKey(
  index: GameBoxModuleIndex,
): GameBoxModuleTypeKey {
  return `module${index}Type` as GameBoxModuleTypeKey
}

/** Parameter key of the card depth field of the given module. */
export function gameBoxModuleCardDepthKey(
  index: GameBoxModuleIndex,
): GameBoxModuleCardDepthKey {
  return `module${index}CardDepth` as GameBoxModuleCardDepthKey
}

/** Parameter key of the dice size field of the given module. */
export function gameBoxModuleDiceSizeKey(
  index: GameBoxModuleIndex,
): GameBoxModuleDiceSizeKey {
  return `module${index}DiceSize` as GameBoxModuleDiceSizeKey
}

/** Parameter key of the dice count field of the given module. */
export function gameBoxModuleDiceCountKey(
  index: GameBoxModuleIndex,
): GameBoxModuleDiceCountKey {
  return `module${index}DiceCount` as GameBoxModuleDiceCountKey
}

/**
 * The 27 flat parameter keys of the component: `part`, the two card size
 * fields and four fields per module group.
 */
export const GAME_BOX_PARAMETER_KEYS: readonly GameBoxParameterKey[] =
  buildGameBoxParameterKeys()

function buildGameBoxParameterKeys(): GameBoxParameterKey[] {
  const keys: GameBoxParameterKey[] = ['part', 'cardWidth', 'cardHeight']
  for (const index of GAME_BOX_MODULE_INDICES) {
    keys.push(
      gameBoxModuleTypeKey(index),
      gameBoxModuleCardDepthKey(index),
      gameBoxModuleDiceSizeKey(index),
      gameBoxModuleDiceCountKey(index),
    )
  }
  return keys
}

/** Default values of the game box parameters. */
const GAME_BOX_DEFAULTS = {
  part: 'assembly' as GameBoxPart,
  cardWidth: 70,
  cardHeight: 120,
  cardDepth: 30,
  diceSize: 16,
  diceCount: 9,
  moduleType: 'cards' as GameBoxModuleType,
  firstModuleCardDepth: 60,
} as const

/**
 * Fixed constants of the game box. The wall, floor and divider geometry is
 * inherited from `card-box`; only the module lengths, the dice holder and the
 * derived storage depth are new.
 */
export const GAME_BOX_CONFIGURATION = {
  moduleCount: GAME_BOX_MODULE_INDICES.length,
  /** Divider plate thickness, inherited from card-box. */
  dividerPlateThickness: CARD_BOX_CONFIGURATION.dividerPlateThickness,
  /** Clearance between a dice holder and the neighbouring divider. */
  diceHolderGap: 0.3,
  /** Clearance between a die and the wall of its well. */
  diceClearance: 0.6,
  /** Minimum wall thickness of the dice holder side walls and floor. */
  diceHolderWall: 1.2,
  /** Thickness of the front and the back wall of the dice holder. */
  diceHolderFrontBackWall: 0.8,
  /** Clearance between a card stack and the divider that bounds it. */
  cardsModuleClearance: 1,
  /** The holder body is this much narrower than the box interior. */
  diceHolderWidthAllowance: 0.6,
  /** Free height above the topmost dice well. */
  diceHolderTopMargin: 1,
  /** Natural outer width surplus of the grip tabs. */
  diceHolderGripAllowance: 0.4,
  ranges: {
    cardWidth: { min: 40, max: 100 },
    cardHeight: { min: 60, max: 150 },
    cardDepth: { min: 3, max: 150 },
    diceSize: { min: 8, max: 30, step: 0.5 },
    diceCount: { min: 1, max: 60 },
    storageDepth: { min: 20, max: 150 },
  },
  defaults: GAME_BOX_DEFAULTS,
  defaultParameters: buildDefaultParameters(),
} as const

function buildDefaultParameters(): GameBoxParameters {
  const modules: Record<string, unknown> = {}
  for (const index of GAME_BOX_MODULE_INDICES) {
    const isFirst = index === 1
    modules[gameBoxModuleTypeKey(index)] = isFirst
      ? GAME_BOX_DEFAULTS.moduleType
      : 'none'
    modules[gameBoxModuleCardDepthKey(index)] = isFirst
      ? GAME_BOX_DEFAULTS.firstModuleCardDepth
      : GAME_BOX_DEFAULTS.cardDepth
    modules[gameBoxModuleDiceSizeKey(index)] = GAME_BOX_DEFAULTS.diceSize
    modules[gameBoxModuleDiceCountKey(index)] = GAME_BOX_DEFAULTS.diceCount
  }
  return {
    part: GAME_BOX_DEFAULTS.part,
    cardWidth: GAME_BOX_DEFAULTS.cardWidth,
    cardHeight: GAME_BOX_DEFAULTS.cardHeight,
    ...modules,
  } as GameBoxParameters
}

/** Floating point slack for fit computations. */
const TOLERANCE = 1e-9

/**
 * Length a card module occupies in the storage depth: the card depth, the
 * clearance that lets a finger reach the card stack and the share of the
 * divider plate that bounds the module.
 */
export function gameBoxCardsModuleLength(cardDepth: number): number {
  return (
    cardDepth +
    GAME_BOX_CONFIGURATION.cardsModuleClearance +
    GAME_BOX_CONFIGURATION.dividerPlateThickness
  )
}

/**
 * Thickness of a dice holder: the die pitch and the front and the back wall.
 * The holder no longer fills the slots it occupies; it is as thin as its
 * contents need it to be.
 */
export function gameBoxDiceHolderThickness(diceSize: number): number {
  return (
    diceSize +
    GAME_BOX_CONFIGURATION.diceClearance +
    2 * GAME_BOX_CONFIGURATION.diceHolderFrontBackWall
  )
}

/**
 * Length a dice module occupies in the storage depth: the holder thickness,
 * the gap to the neighbouring dividers and the share of the divider plate
 * that bounds the module.
 */
export function gameBoxDiceModuleLength(diceSize: number): number {
  return (
    gameBoxDiceHolderThickness(diceSize) +
    2 * GAME_BOX_CONFIGURATION.diceHolderGap +
    GAME_BOX_CONFIGURATION.dividerPlateThickness
  )
}

/** Body width of the dice holder: narrower than the box interior. */
export function gameBoxDiceHolderWidth(cardWidth: number): number {
  return (
    cardBoxInteriorWidth(cardWidth) -
    GAME_BOX_CONFIGURATION.diceHolderWidthAllowance
  )
}

/** Natural outer width of the dice holder including its grip tabs. */
export function gameBoxDiceHolderOuterWidth(cardWidth: number): number {
  return (
    cardBoxInteriorWidth(cardWidth) +
    GAME_BOX_CONFIGURATION.diceHolderGripAllowance
  )
}

export type GameBoxDiceLayout = {
  /** Dice that fit side by side in the holder width. */
  perRowLimit: number
  /** Rows that fit in the holder height. */
  layerLimit: number
  /** Rows used for the requested count. */
  layers: number
  /** Dice per row used for the requested count. */
  perRow: number
  /** Dice the holder can hold at most. */
  capacity: number
}

/**
 * Dice arrangement inside the holder: the dice are spread over as few rows
 * as possible and the rows are filled as evenly as possible.
 */
export function gameBoxDiceLayout(
  cardWidth: number,
  cardHeight: number,
  diceSize: number,
  diceCount: number,
): GameBoxDiceLayout {
  const pitch = diceSize + GAME_BOX_CONFIGURATION.diceClearance
  const usableWidth =
    gameBoxDiceHolderWidth(cardWidth) -
    2 * GAME_BOX_CONFIGURATION.diceHolderWall
  const usableHeight =
    cardHeight -
    GAME_BOX_CONFIGURATION.diceHolderWall -
    GAME_BOX_CONFIGURATION.diceHolderTopMargin
  const perRowLimit = Math.max(0, Math.floor(usableWidth / pitch + TOLERANCE))
  const layerLimit = Math.max(0, Math.floor(usableHeight / pitch + TOLERANCE))
  const layers = perRowLimit > 0 ? Math.ceil(diceCount / perRowLimit) : 0
  const perRow = layers > 0 ? Math.ceil(diceCount / layers) : 0
  return {
    perRowLimit,
    layerLimit,
    layers,
    perRow,
    capacity: perRowLimit * layerLimit,
  }
}

/** Dice a holder of the given card size and die size can hold at most. */
export function gameBoxDiceCapacity(
  cardWidth: number,
  cardHeight: number,
  diceSize: number,
): number {
  const layout = gameBoxDiceLayout(cardWidth, cardHeight, diceSize, 0)
  return layout.capacity
}

export type GameBoxModuleLayout =
  | {
      index: GameBoxModuleIndex
      type: 'cards'
      length: number
    }
  | {
      index: GameBoxModuleIndex
      type: 'dice'
      length: number
      holderThickness: number
    }

export type GameBoxLayout = {
  /** Active modules in front-to-back order. */
  modules: GameBoxModuleLayout[]
  /** Derived storage depth in millimetres. */
  storageDepth: number
  /** The module boundaries, measured from the front inner wall. */
  dividerCenters: number[]
  /** Number of divider plates to print. */
  dividerCount: number
}

/**
 * Derived layout of the active modules: the length every module occupies, the
 * storage depth and the divider positions.
 *
 * The lengths are computed directly from the module contents, so the storage
 * depth is the sum of the module lengths and the divider centres are the
 * cumulative module lengths. No module is rounded to a slot grid.
 */
export function gameBoxLayout(parameters: GameBoxParameters): GameBoxLayout {
  const modules: GameBoxModuleLayout[] = []
  const dividerCenters: number[] = []
  let occupied = 0

  for (const index of GAME_BOX_MODULE_INDICES) {
    const type = parameters[gameBoxModuleTypeKey(index)]
    if (type === 'none') continue
    if (modules.length > 0) dividerCenters.push(occupied)

    if (type === 'cards') {
      const length = gameBoxCardsModuleLength(
        parameters[gameBoxModuleCardDepthKey(index)],
      )
      modules.push({ index, type: 'cards', length })
      occupied += length
      continue
    }

    const diceSize = parameters[gameBoxModuleDiceSizeKey(index)]
    const length = gameBoxDiceModuleLength(diceSize)
    modules.push({
      index,
      type: 'dice',
      length,
      holderThickness: gameBoxDiceHolderThickness(diceSize),
    })
    occupied += length
  }

  return {
    modules,
    storageDepth: occupied,
    dividerCenters,
    dividerCount: dividerCenters.length,
  }
}

/** Storage depth derived from the active modules. */
export function gameBoxStorageDepth(parameters: GameBoxParameters): number {
  return gameBoxLayout(parameters).storageDepth
}

/**
 * Module number of a dice holder part (`module3` is module 3), or null for
 * the parts that do not belong to a module.
 */
export function gameBoxPartModuleIndex(
  part: GameBoxPart,
): GameBoxModuleIndex | null {
  if (!part.startsWith('module')) return null
  const index = Number(part.slice('module'.length))
  const match = GAME_BOX_MODULE_INDICES.find((candidate) => candidate === index)
  return match ?? null
}

/**
 * Parts the user can select for the current module list: the assembly, the
 * single box parts and one dice holder per dice module.
 */
export function gameBoxAvailableParts(
  parameters: GameBoxParameters,
): GameBoxPart[] {
  const layout = gameBoxLayout(parameters)
  const parts: GameBoxPart[] = ['assembly', 'box', 'lid']
  if (layout.modules.length > 1) parts.push('divider')
  for (const module of layout.modules) {
    if (module.type === 'dice')
      parts.push(`module${module.index}` as GameBoxPart)
  }
  return parts
}

export type GameBoxIssue = {
  field: GameBoxParameterKey | 'parameters'
  messageId: string
  params?: DiagnosticParams
}

export type GameBoxValidation =
  | { valid: true; value: GameBoxParameters }
  | { valid: false; issues: GameBoxIssue[] }

function invalid(
  field: GameBoxParameterKey | 'parameters',
  messageId = 'validation.invalid',
  params?: DiagnosticParams,
): GameBoxValidation {
  const issue: GameBoxIssue = {
    field,
    messageId,
    ...(params ? { params } : {}),
  }
  return { valid: false, issues: [issue] }
}

function numberInRange(
  value: unknown,
  field: GameBoxParameterKey,
  min: number,
  max: number,
  fallback: number,
  unit?: string,
): { ok: true; value: number } | { ok: false; issue: GameBoxIssue } {
  const resolved = value === undefined ? fallback : value
  if (typeof resolved !== 'number' || !Number.isFinite(resolved)) {
    return {
      ok: false,
      issue: { field, messageId: 'validation.invalidNumber' },
    }
  }
  if (resolved < min || resolved > max) {
    return {
      ok: false,
      issue: {
        field,
        messageId: 'validation.invalid',
        params: unit ? { min, max, unit } : { min, max },
      },
    }
  }
  return { ok: true, value: resolved }
}

/**
 * Validates a parameter snapshot.
 *
 * The checks run in the order of the design decision: types, ranges and
 * enums first, then the module arrangement, then the dice capacity, then the
 * derived storage depth and finally the selected part.
 */
export function validateGameBoxParameters(value: unknown): GameBoxValidation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid('parameters')
  }
  const record = value as Record<string, unknown>

  const keys = Object.keys(record)
  if (
    keys.some(
      (key) => !GAME_BOX_PARAMETER_KEYS.includes(key as GameBoxParameterKey),
    )
  ) {
    return invalid('parameters')
  }

  const part = record.part
  if (part !== undefined && !GAME_BOX_PARTS.includes(part as GameBoxPart)) {
    return invalid('part', 'validation.gameBoxPartInvalid')
  }
  const resolvedPart = (part ?? 'assembly') as GameBoxPart

  const cardWidth = numberInRange(
    record.cardWidth,
    'cardWidth',
    GAME_BOX_CONFIGURATION.ranges.cardWidth.min,
    GAME_BOX_CONFIGURATION.ranges.cardWidth.max,
    GAME_BOX_CONFIGURATION.defaults.cardWidth,
    'mm',
  )
  if (!cardWidth.ok) return { valid: false, issues: [cardWidth.issue] }

  const cardHeight = numberInRange(
    record.cardHeight,
    'cardHeight',
    GAME_BOX_CONFIGURATION.ranges.cardHeight.min,
    GAME_BOX_CONFIGURATION.ranges.cardHeight.max,
    GAME_BOX_CONFIGURATION.defaults.cardHeight,
    'mm',
  )
  if (!cardHeight.ok) return { valid: false, issues: [cardHeight.issue] }

  const types: GameBoxModuleType[] = []
  const cardDepths: number[] = []
  const diceSizes: number[] = []
  const diceCounts: number[] = []

  for (const index of GAME_BOX_MODULE_INDICES) {
    const typeKey = gameBoxModuleTypeKey(index)
    const rawType = record[typeKey]
    if (
      rawType !== undefined &&
      !GAME_BOX_MODULE_TYPES.includes(rawType as GameBoxModuleType)
    ) {
      return invalid(typeKey, 'validation.gameBoxModuleTypeInvalid')
    }
    const fallbackType =
      index === 1 ? GAME_BOX_CONFIGURATION.defaults.moduleType : 'none'
    types.push(
      rawType === undefined ? fallbackType : (rawType as GameBoxModuleType),
    )

    const depthKey = gameBoxModuleCardDepthKey(index)
    const fallbackDepth =
      index === 1
        ? GAME_BOX_CONFIGURATION.defaults.firstModuleCardDepth
        : GAME_BOX_CONFIGURATION.defaults.cardDepth
    const depth = numberInRange(
      record[depthKey],
      depthKey,
      GAME_BOX_CONFIGURATION.ranges.cardDepth.min,
      GAME_BOX_CONFIGURATION.ranges.cardDepth.max,
      fallbackDepth,
      'mm',
    )
    if (!depth.ok) return { valid: false, issues: [depth.issue] }
    cardDepths.push(depth.value)

    const sizeKey = gameBoxModuleDiceSizeKey(index)
    const size = numberInRange(
      record[sizeKey],
      sizeKey,
      GAME_BOX_CONFIGURATION.ranges.diceSize.min,
      GAME_BOX_CONFIGURATION.ranges.diceSize.max,
      GAME_BOX_CONFIGURATION.defaults.diceSize,
      'mm',
    )
    if (!size.ok) return { valid: false, issues: [size.issue] }
    diceSizes.push(size.value)

    const countKey = gameBoxModuleDiceCountKey(index)
    const count = numberInRange(
      record[countKey],
      countKey,
      GAME_BOX_CONFIGURATION.ranges.diceCount.min,
      GAME_BOX_CONFIGURATION.ranges.diceCount.max,
      GAME_BOX_CONFIGURATION.defaults.diceCount,
    )
    if (!count.ok) return { valid: false, issues: [count.issue] }
    if (!Number.isInteger(count.value)) {
      return invalid(countKey, 'validation.gameBoxDiceCountNotInteger')
    }
    diceCounts.push(count.value)
  }

  const arrangementIssue = moduleArrangementIssue(types)
  if (arrangementIssue) return { valid: false, issues: [arrangementIssue] }

  for (let position = 0; position < types.length; position += 1) {
    if (types[position] !== 'dice') continue
    const index = GAME_BOX_MODULE_INDICES[position]
    const layout = gameBoxDiceLayout(
      cardWidth.value,
      cardHeight.value,
      diceSizes[position],
      diceCounts[position],
    )
    if (diceCounts[position] > layout.capacity) {
      return invalid(
        gameBoxModuleDiceCountKey(index),
        'validation.gameBoxDiceCapacityExceeded',
        { max: layout.capacity },
      )
    }
  }

  const parameters = buildParameters(
    resolvedPart,
    cardWidth.value,
    cardHeight.value,
    types,
    cardDepths,
    diceSizes,
    diceCounts,
  )
  const layout = gameBoxLayout(parameters)
  const depth = layout.storageDepth
  const depthRange = GAME_BOX_CONFIGURATION.ranges.storageDepth
  if (depth < depthRange.min || depth > depthRange.max) {
    const lastModule = layout.modules.at(-1)
    if (!lastModule) return invalid('parameters')
    const field =
      lastModule.type === 'cards'
        ? gameBoxModuleCardDepthKey(lastModule.index)
        : gameBoxModuleDiceSizeKey(lastModule.index)
    return invalid(field, 'validation.gameBoxStorageDepthOutOfRange', {
      depth,
      min: depthRange.min,
      max: depthRange.max,
    })
  }

  const availableParts = gameBoxAvailableParts(parameters)
  if (!availableParts.includes(resolvedPart)) {
    const partModule = gameBoxPartModuleIndex(resolvedPart)
    if (partModule !== null) {
      return invalid('part', 'validation.gameBoxPartUnavailable', {
        module: partModule,
      })
    }
    return invalid('part', 'validation.gameBoxDividerUnavailable')
  }

  return { valid: true, value: parameters }
}

/**
 * The module list must be contiguous and must not start with a disabled
 * module; the first offending module type field owns the issue.
 */
function moduleArrangementIssue(
  types: readonly GameBoxModuleType[],
): GameBoxIssue | null {
  const firstInactive = types.findIndex((type) => type === 'none')
  if (firstInactive === 0) {
    return {
      field: gameBoxModuleTypeKey(GAME_BOX_MODULE_INDICES[0]),
      messageId: 'validation.gameBoxModuleRequired',
    }
  }
  if (firstInactive === -1) return null
  for (
    let position = firstInactive + 1;
    position < types.length;
    position += 1
  ) {
    if (types[position] === 'none') continue
    const index = GAME_BOX_MODULE_INDICES[position]
    return {
      field: gameBoxModuleTypeKey(index),
      messageId: 'validation.gameBoxModuleNotContiguous',
      params: { module: index },
    }
  }
  return null
}

function buildParameters(
  part: GameBoxPart,
  cardWidth: number,
  cardHeight: number,
  types: readonly GameBoxModuleType[],
  cardDepths: readonly number[],
  diceSizes: readonly number[],
  diceCounts: readonly number[],
): GameBoxParameters {
  const parameters: Record<string, unknown> = {
    part,
    cardWidth,
    cardHeight,
  }
  for (
    let position = 0;
    position < GAME_BOX_MODULE_INDICES.length;
    position += 1
  ) {
    const index = GAME_BOX_MODULE_INDICES[position]
    parameters[gameBoxModuleTypeKey(index)] = types[position]
    parameters[gameBoxModuleCardDepthKey(index)] = cardDepths[position]
    parameters[gameBoxModuleDiceSizeKey(index)] = diceSizes[position]
    parameters[gameBoxModuleDiceCountKey(index)] = diceCounts[position]
  }
  return parameters as GameBoxParameters
}

export function isGameBoxParameters(
  value: unknown,
): value is GameBoxParameters {
  return validateGameBoxParameters(value).valid
}

/**
 * Offsets of the card-box frame the game box inherits, in millimetres.
 *
 * The game box builds the card-box box, lid and divider, so the parts
 * inherit the card-box frame: the front lip of the box body, the back face
 * of the lid and the heights of the box body, of the printed lid and of the
 * assembled lid. The values mirror the card-box kernel design
 * (`src/cad-kernel/components/card-box/box.ts` and `lid.ts`);
 * `tests/worker/game-box-bounds.integration.test.ts` pins them to the built
 * geometry.
 */
const CARD_BOX_FRAME = {
  /** The box front lip reaches this far in front of the sketch face. */
  frontLipExtension: 1.85,
  /** The front wall of the box body sits this far behind the sketch face. */
  frontWallThickness: 1.2,
  /** The lid back face stops this far short of the sketch back face. */
  lidBackInset: 0.05,
  /** The box body reaches this far above the card height. */
  boxTopAllowance: 7.4,
  /** The assembled lid reaches this far above the card height. */
  lidTopAllowance: 9,
  /** The printed lid is this tall (plate plus skirts). */
  lidPrintHeight: 16.8,
} as const

/**
 * Y of the cavity front wall face in the box frame: the module grid and the
 * dividers are measured from there.
 */
export function gameBoxFrontWallY(parameters: GameBoxParameters): number {
  const halfSketchY = cardBoxOuterDepth(gameBoxStorageDepth(parameters)) / 2
  return -(halfSketchY - CARD_BOX_FRAME.frontWallThickness)
}

/**
 * The envelope of the built part.
 *
 * Every part reports the bounds of the geometry it builds, so the scene
 * frame and the progressive preview match the exact model. The assembly
 * reports the assembled frame, the single parts their print orientation
 * with z >= 0.
 */
export function boundsForGameBox(parameters: GameBoxParameters): {
  min: [number, number, number]
  max: [number, number, number]
} {
  const partModule = gameBoxPartModuleIndex(parameters.part)
  if (partModule !== null) {
    return diceHolderBounds(parameters, partModule)
  }

  const storageDepth = gameBoxStorageDepth(parameters)
  const halfWidth = cardBoxOuterWidth(parameters.cardWidth) / 2
  // The card-box sketch face; the box body extends in front of it.
  const halfSketchY = cardBoxOuterDepth(storageDepth) / 2

  if (parameters.part === 'lid') {
    // The printed lid lies on its back, so the frame is mirrored in Y.
    return {
      min: [-halfWidth, -(halfSketchY - CARD_BOX_FRAME.lidBackInset), 0],
      max: [
        halfWidth,
        halfSketchY + CARD_BOX_FRAME.frontLipExtension,
        CARD_BOX_FRAME.lidPrintHeight,
      ],
    }
  }
  if (parameters.part === 'divider') {
    // The plain divider carries no art, so it is only as thick as the plate.
    const halfPlate = cardBoxDividerWidth(parameters.cardWidth) / 2
    return {
      min: [-halfPlate, 0, 0],
      max: [
        halfPlate,
        parameters.cardHeight + CARD_BOX_CONFIGURATION.dividerTabHeight,
        CARD_BOX_CONFIGURATION.dividerPlateThickness,
      ],
    }
  }
  if (parameters.part === 'box') {
    return {
      min: [-halfWidth, -(halfSketchY + CARD_BOX_FRAME.frontLipExtension), 0],
      max: [
        halfWidth,
        halfSketchY,
        parameters.cardHeight + CARD_BOX_FRAME.boxTopAllowance,
      ],
    }
  }
  return {
    min: [-halfWidth, -(halfSketchY + CARD_BOX_FRAME.frontLipExtension), 0],
    max: [
      halfWidth,
      halfSketchY,
      parameters.cardHeight + CARD_BOX_FRAME.lidTopAllowance,
    ],
  }
}

function diceHolderBounds(
  parameters: GameBoxParameters,
  index: GameBoxModuleIndex,
): { min: [number, number, number]; max: [number, number, number] } {
  const diceSize = parameters[gameBoxModuleDiceSizeKey(index)]
  const halfWidth = gameBoxDiceHolderOuterWidth(parameters.cardWidth) / 2
  const thickness = gameBoxDiceHolderThickness(diceSize)
  return {
    min: [-halfWidth, 0, 0],
    max: [halfWidth, thickness, parameters.cardHeight],
  }
}

/**
 * Export file name. The assembly has no file name; the box parts carry the
 * card size and the derived storage depth, the dice holder carries the card
 * size, the die size and the die count.
 */
export function gameBoxFileName(parameters: GameBoxParameters): string {
  if (parameters.part === 'assembly') {
    throw new Error('GAME_BOX_ASSEMBLY_EXPORT_FORBIDDEN')
  }
  const size = `${parameters.cardWidth}x${parameters.cardHeight}`
  const partModule = gameBoxPartModuleIndex(parameters.part)
  if (partModule === null) {
    const depth = gameBoxStorageDepth(parameters)
    return `game-box-${parameters.part}-${size}x${depth}${PROTOTYPE_CONFIGURATION.stepExtension}`
  }
  const diceSize = parameters[gameBoxModuleDiceSizeKey(partModule)]
  const diceCount = parameters[gameBoxModuleDiceCountKey(partModule)]
  return `game-box-dice-holder-${size}-d${diceSize}x${diceCount}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function gameBoxStlFileName(parameters: GameBoxParameters): string {
  return gameBoxFileName(parameters).replace(
    PROTOTYPE_CONFIGURATION.stepExtension,
    PROTOTYPE_CONFIGURATION.stlExtension,
  )
}
