import type { DiagnosticParams } from '../diagnostics'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxDividerWidth,
  cardBoxInteriorWidth,
  cardBoxOuterDepth,
  cardBoxOuterWidth,
  cardBoxToken,
  type CardBoxStyle,
  type CardBoxTabPosition,
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

/** Module boundaries that carry a divider plate: up to five cards pairs. */
export const GAME_BOX_DIVIDER_INDICES = [1, 2, 3, 4, 5] as const

export type GameBoxDividerIndex = (typeof GAME_BOX_DIVIDER_INDICES)[number]

/** Tab position of one divider card; the values are the card-box values. */
export type GameBoxTabPosition = CardBoxTabPosition

export const GAME_BOX_TAB_POSITIONS: readonly GameBoxTabPosition[] = [
  'left',
  'center',
  'right',
]

/** Art style of one divider card or of the cover; card-box values. */
export type GameBoxStyle = CardBoxStyle

export const GAME_BOX_STYLES: readonly GameBoxStyle[] = ['raised', 'flat']

export type GameBoxPart =
  | 'assembly'
  | 'box'
  | 'lid'
  | 'cover'
  | `divider${GameBoxDividerIndex}`
  | `module${GameBoxModuleIndex}`

export const GAME_BOX_PARTS: readonly GameBoxPart[] = [
  'assembly',
  'box',
  'lid',
  'cover',
  ...GAME_BOX_DIVIDER_INDICES.map((index) => `divider${index}` as GameBoxPart),
  ...GAME_BOX_MODULE_INDICES.map((index) => `module${index}` as GameBoxPart),
]

export type GameBoxModuleTypeKey = `module${GameBoxModuleIndex}Type`
export type GameBoxModuleCardDepthKey = `module${GameBoxModuleIndex}CardDepth`
export type GameBoxModuleDiceSizeKey = `module${GameBoxModuleIndex}DiceSize`
export type GameBoxModuleDiceCountKey = `module${GameBoxModuleIndex}DiceCount`

export type GameBoxDividerTextKey = `divider${GameBoxDividerIndex}Text`
export type GameBoxDividerTabPositionKey =
  `divider${GameBoxDividerIndex}TabPosition`
export type GameBoxDividerStyleKey = `divider${GameBoxDividerIndex}Style`

export type GameBoxParameterKey =
  | 'part'
  | 'cardWidth'
  | 'cardHeight'
  | GameBoxModuleTypeKey
  | GameBoxModuleCardDepthKey
  | GameBoxModuleDiceSizeKey
  | GameBoxModuleDiceCountKey
  | GameBoxDividerTextKey
  | GameBoxDividerTabPositionKey
  | GameBoxDividerStyleKey
  | 'coverTitle'
  | 'coverTitleTextHeight'
  | 'coverSubtitle'
  | 'coverSubtitleTextHeight'
  | 'coverSvgWidth'
  | 'coverVerticalPosition'
  | 'coverStyle'
  | 'usesCoverSvg'
  | 'coverSvgFingerprint'
  | 'coverSvgAspect'

export type GameBoxParameters = {
  part: GameBoxPart
  cardWidth: number
  cardHeight: number
  coverTitle: string
  coverTitleTextHeight: number
  coverSubtitle: string
  coverSubtitleTextHeight: number
  coverSvgWidth: number
  coverVerticalPosition: number
  coverStyle: GameBoxStyle
  usesCoverSvg: boolean
  coverSvgFingerprint: string
  coverSvgAspect: number
} & {
  [Key in GameBoxModuleTypeKey]: GameBoxModuleType
} & {
  [Key in GameBoxModuleCardDepthKey]: number
} & {
  [Key in GameBoxModuleDiceSizeKey]: number
} & {
  [Key in GameBoxModuleDiceCountKey]: number
} & {
  [Key in GameBoxDividerTextKey]: string
} & {
  [Key in GameBoxDividerTabPositionKey]: GameBoxTabPosition
} & {
  [Key in GameBoxDividerStyleKey]: GameBoxStyle
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
 * Parameter key of the label text field of the given divider card. `dividerN`
 * is the Nth boundary that carries a divider plate (the Nth boundary between
 * two adjacent `cards` modules), front to back.
 */
export function gameBoxDividerTextKey(
  index: GameBoxDividerIndex,
): GameBoxDividerTextKey {
  return `divider${index}Text` as GameBoxDividerTextKey
}

/** Parameter key of the tab position field of the given divider card. */
export function gameBoxDividerTabPositionKey(
  index: GameBoxDividerIndex,
): GameBoxDividerTabPositionKey {
  return `divider${index}TabPosition` as GameBoxDividerTabPositionKey
}

/** Parameter key of the style field of the given divider card. */
export function gameBoxDividerStyleKey(
  index: GameBoxDividerIndex,
): GameBoxDividerStyleKey {
  return `divider${index}Style` as GameBoxDividerStyleKey
}

/**
 * Divider ordinal of a divider part (`divider3` is the third divider plate),
 * or null for the parts that are not divider cards.
 */
export function gameBoxPartDividerOrdinal(
  part: GameBoxPart,
): GameBoxDividerIndex | null {
  if (!part.startsWith('divider')) return null
  const index = Number(part.slice('divider'.length))
  const match = GAME_BOX_DIVIDER_INDICES.find(
    (candidate) => candidate === index,
  )
  return (match as GameBoxDividerIndex | undefined) ?? null
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
  for (const index of GAME_BOX_DIVIDER_INDICES) {
    keys.push(
      gameBoxDividerTextKey(index),
      gameBoxDividerTabPositionKey(index),
      gameBoxDividerStyleKey(index),
    )
  }
  keys.push(
    'coverTitle',
    'coverTitleTextHeight',
    'coverSubtitle',
    'coverSubtitleTextHeight',
    'coverSvgWidth',
    'coverVerticalPosition',
    'coverStyle',
    'usesCoverSvg',
    'coverSvgFingerprint',
    'coverSvgAspect',
  )
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
  dividerText: '',
  coverTitle: 'GAME',
  coverSubtitle: '',
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
  /** Clearance between a die and the wall of its well. */
  diceClearance: 0.6,
  /** Minimum wall thickness of the dice holder side walls and floor. */
  diceHolderWall: 1.2,
  /** Thickness of the front wall of the dice holder. */
  diceHolderFrontWall: 1.6,
  /** Thickness of the back wall of the dice holder. */
  diceHolderBackWall: 1.2,
  /** Clearance between a card stack and the divider that bounds it. */
  cardsModuleClearance: 1,
  /** The holder body is this much narrower than the box interior. */
  diceHolderWidthAllowance: 0.6,
  /** Free height above the topmost dice well. */
  diceHolderTopMargin: 1,
  /** How deep a tenon is buried in the holder body. */
  tenonRootDepth: 0.5,
  /** Label cap per divider card; the same value the card-box divider uses. */
  dividerTextMaxLength: CARD_BOX_CONFIGURATION.dividerTextMaxLength,
  /** Label cap per cover line; the same value the card-box cover uses. */
  coverTextMaxLength: CARD_BOX_CONFIGURATION.coverTextMaxLength,
  rangesCover: {
    coverTitleTextHeight: CARD_BOX_CONFIGURATION.coverTitleTextHeight,
    coverSubtitleTextHeight: CARD_BOX_CONFIGURATION.coverSubtitleTextHeight,
    coverSvgWidth: CARD_BOX_CONFIGURATION.coverSvgWidth,
    coverVerticalPosition: CARD_BOX_CONFIGURATION.coverVerticalPosition,
  },
  defaultTabPosition: CARD_BOX_CONFIGURATION.defaultTabPosition,
  defaultStyle: CARD_BOX_CONFIGURATION.defaultStyle,
  // Owner decision 2026-11-21: the game-box cover reads GAME, deliberately
  // diverging from the card-box cover's CARDS.
  defaultCoverTitle: 'GAME',
  ranges: {
    cardWidth: { min: 40, max: 100 },
    cardHeight: { min: 60, max: 150 },
    cardDepth: { min: 3, max: 150 },
    diceSize: { min: 8, max: 30, step: 0.5 },
    diceCount: { min: 1, max: 60 },
    // The minimum follows the round-1 gate decision: with the direct module
    // lengths a lone 16 mm dice module adds up to 19.65 mm, so the old 20 mm
    // minimum would reject saved designs. The box and the lid still build
    // (and pass their geometry checks) down to 8 mm at every card width, so
    // the minimum is the lead's floor of 15 mm; a lone 14 mm dice module
    // (17.65 mm) stays valid.
    storageDepth: { min: 15, max: 150 },
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
  const dividers: Record<string, unknown> = {}
  for (const index of GAME_BOX_DIVIDER_INDICES) {
    dividers[gameBoxDividerTextKey(index)] = GAME_BOX_DEFAULTS.dividerText
    dividers[gameBoxDividerTabPositionKey(index)] =
      CARD_BOX_CONFIGURATION.defaultTabPosition
    dividers[gameBoxDividerStyleKey(index)] =
      CARD_BOX_CONFIGURATION.defaultStyle
  }
  return {
    part: GAME_BOX_DEFAULTS.part,
    cardWidth: GAME_BOX_DEFAULTS.cardWidth,
    cardHeight: GAME_BOX_DEFAULTS.cardHeight,
    coverTitle: GAME_BOX_DEFAULTS.coverTitle,
    coverTitleTextHeight: CARD_BOX_CONFIGURATION.coverTitleTextHeight.default,
    coverSubtitle: GAME_BOX_DEFAULTS.coverSubtitle,
    coverSubtitleTextHeight:
      CARD_BOX_CONFIGURATION.coverSubtitleTextHeight.default,
    coverSvgWidth: CARD_BOX_CONFIGURATION.coverSvgWidth.default,
    coverVerticalPosition: CARD_BOX_CONFIGURATION.coverVerticalPosition.default,
    coverStyle: CARD_BOX_CONFIGURATION.defaultStyle,
    usesCoverSvg: false,
    coverSvgFingerprint: '',
    // 0 = unknown aspect: an imported cover always writes the height/width
    // ratio of its cleaned outlines, so the font-free fit gate can judge the
    // scaled SVG height without the outline data.
    coverSvgAspect: 0,
    ...modules,
    ...dividers,
  } as GameBoxParameters
}

/** Floating point slack for fit computations. */
const TOLERANCE = 1e-9

/**
 * Lengths are read back to a hundredth of a millimetre: `cardDepth` and
 * `diceSize` have no enforced input step, and the export names round the
 * derived depth to two decimals, so two inputs that differ by less than a
 * hundredth must not become two different geometries under one name.
 */
function quantizeLength(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Length a card module needs in the storage depth: the card depth and the
 * clearance that lets a finger reach the card stack. A divider plate that
 * bounds the module takes half its thickness from each of the two modules it
 * separates; the layout adds those halves to the allocated length.
 */
export function gameBoxCardsModuleLength(cardDepth: number): number {
  return cardDepth + GAME_BOX_CONFIGURATION.cardsModuleClearance
}

/**
 * Thickness of a dice holder: the die pitch and the front and the back wall.
 * The holder is as thick as its contents need it to be; the 3 mm quantisation
 * lives in the tenon spacing, not in the thickness.
 */
export function gameBoxDiceHolderThickness(diceSize: number): number {
  return (
    diceSize +
    GAME_BOX_CONFIGURATION.diceClearance +
    GAME_BOX_CONFIGURATION.diceHolderFrontWall +
    GAME_BOX_CONFIGURATION.diceHolderBackWall
  )
}

/**
 * Distance between the centres of the two tenons of one side: the largest
 * whole multiple of the slot pitch that still fits inside the holder. Because
 * the distance is a whole number of slots, both tenons land in slots as soon
 * as the first one does.
 */
export function gameBoxDiceHolderTenonSpan(thickness: number): number {
  const pitch = CARD_BOX_CONFIGURATION.dividerSlotPitch
  const free = thickness - GAME_BOX_CONFIGURATION.dividerPlateThickness
  return Math.max(0, Math.floor(free / pitch) * pitch)
}

/**
 * Distance from the holder's front face to the centre of its first tenon: the
 * two tenons are centred in the holder.
 */
export function gameBoxDiceHolderTenonOffset(thickness: number): number {
  return (thickness - gameBoxDiceHolderTenonSpan(thickness)) / 2
}

/** Body width of the dice holder: narrower than the box interior. */
export function gameBoxDiceHolderWidth(cardWidth: number): number {
  return (
    cardBoxInteriorWidth(cardWidth) -
    GAME_BOX_CONFIGURATION.diceHolderWidthAllowance
  )
}

/**
 * Outer width of the dice holder including its tenons: the tenons reach
 * exactly as far into the wall slots as a divider plate does.
 */
export function gameBoxDiceHolderOuterWidth(cardWidth: number): number {
  return cardBoxDividerWidth(cardWidth)
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

/** One active module and the region of the cavity it owns. */
export type GameBoxModuleLayout =
  | {
      index: GameBoxModuleIndex
      type: 'cards'
      /** The region's front, from the front inner wall face. */
      start: number
      /** The region's back. */
      end: number
      /** The region's length. */
      length: number
      /** The depth the card stack may use, clearance included. */
      freeLength: number
    }
  | {
      index: GameBoxModuleIndex
      type: 'dice'
      /** The region's front, from the front inner wall face. */
      start: number
      /** The region's back. */
      end: number
      /** The region's length. */
      length: number
      /** The holder's thickness. */
      holderThickness: number
      /** The holder's front face. */
      holderStart: number
      /** The tenon centres, from the front inner wall face. */
      tenonCentres: number[]
    }

export type GameBoxLayout = {
  /** Active modules in front-to-back order. */
  modules: GameBoxModuleLayout[]
  /** Derived storage depth in millimetres: a whole multiple of the slot pitch. */
  storageDepth: number
  /** The divider slot centres of the whole rack, from the front inner wall. */
  slotCenters: number[]
  /** The boundaries that carry a divider plate, from the front inner wall. */
  dividerCenters: number[]
  /** Number of divider plates to print. */
  dividerCount: number
}

/** The slot pitch of the rack in the box walls. */
const SLOT_PITCH = CARD_BOX_CONFIGURATION.dividerSlotPitch

/** Half of a divider plate: the share a module loses to the plate beside it. */
const HALF_PLATE = GAME_BOX_CONFIGURATION.dividerPlateThickness / 2

/** One active module with the numbers the layout needs. */
type ActiveModule = {
  index: GameBoxModuleIndex
  type: 'cards' | 'dice'
  /** The card depth of a cards module. */
  cardDepth: number
  /** The holder thickness of a dice module. */
  thickness: number
  /** The distance from the holder's front face to its first tenon centre. */
  tenonOffset: number
}

/**
 * The first position at or after `from` that sits on `residue` of the slot
 * pitch. A null residue accepts any position.
 */
function firstPositionOn(from: number, residue: number | null): number {
  if (residue === null) return from
  const remainder = (((residue - from) % SLOT_PITCH) + SLOT_PITCH) % SLOT_PITCH
  return from + remainder
}

/** The active modules of a snapshot, in front-to-back order. */
function activeModules(parameters: GameBoxParameters): ActiveModule[] {
  const active: ActiveModule[] = []
  for (const index of GAME_BOX_MODULE_INDICES) {
    const type = parameters[gameBoxModuleTypeKey(index)]
    if (type === 'none') continue
    if (type === 'cards') {
      active.push({
        index,
        type,
        cardDepth: parameters[gameBoxModuleCardDepthKey(index)],
        thickness: 0,
        tenonOffset: 0,
      })
      continue
    }
    const thickness = gameBoxDiceHolderThickness(
      parameters[gameBoxModuleDiceSizeKey(index)],
    )
    active.push({
      index,
      type,
      cardDepth: 0,
      thickness,
      tenonOffset: gameBoxDiceHolderTenonOffset(thickness),
    })
  }
  return active
}

/**
 * The residue the boundary behind a cards module must sit on: the next
 * holder's front face has to put its first tenon in a slot, and a divider
 * plate between two card modules needs a slot of its own.
 */
function boundaryResidue(next: ActiveModule): number {
  return next.type === 'dice' ? -next.tenonOffset : 0
}

/**
 * Places the modules front to back on the slot rack. Every boundary lands on
 * the first position that gives the module at least its required length and
 * that the next module can use.
 */
function placeModules(active: readonly ActiveModule[]): {
  modules: GameBoxModuleLayout[]
  dividerCenters: number[]
  minimumDepth: number
} {
  const modules: GameBoxModuleLayout[] = []
  const dividerCenters: number[] = []
  let cursor = 0

  for (let position = 0; position < active.length; position += 1) {
    const current = active[position]!
    const next = active[position + 1]

    if (current.type === 'dice') {
      // The holder stands at the front of its region, but its first tenon has
      // to land in a slot, so the front face waits for the next slot that
      // fits.
      const holderStart = firstPositionOn(cursor, -current.tenonOffset)
      const end = holderStart + current.thickness
      modules.push({
        index: current.index,
        type: 'dice',
        start: cursor,
        end,
        length: end - cursor,
        holderThickness: current.thickness,
        holderStart,
        tenonCentres: [
          holderStart + current.tenonOffset,
          holderStart +
            current.tenonOffset +
            gameBoxDiceHolderTenonSpan(current.thickness),
        ],
      })
      cursor = end
      continue
    }

    const plateBefore = position > 0 && active[position - 1]!.type === 'cards'
    const plateAfter = next !== undefined && next.type === 'cards'
    const required =
      gameBoxCardsModuleLength(current.cardDepth) +
      (plateBefore ? HALF_PLATE : 0) +
      (plateAfter ? HALF_PLATE : 0)
    const end = next
      ? firstPositionOn(cursor + required, boundaryResidue(next))
      : cursor + required
    if (plateBefore) dividerCenters.push(cursor)
    modules.push({
      index: current.index,
      type: 'cards',
      start: cursor,
      end,
      length: end - cursor,
      freeLength:
        end -
        cursor -
        (plateBefore ? HALF_PLATE : 0) -
        (plateAfter ? HALF_PLATE : 0),
    })
    cursor = end
  }

  return { modules, dividerCenters, minimumDepth: cursor }
}

/**
 * Derived layout of the active modules: the region every module owns in the
 * cavity, the divider plates between two card modules, the whole slot rack
 * and the storage depth.
 *
 * The modules are placed on the rack: every boundary sits on the first
 * position that gives the module at least its required length. The storage
 * depth is the length the contents need, rounded up to a whole multiple of
 * the slot pitch, so the rack keeps a 3 mm margin at both ends.
 */
export function gameBoxLayout(parameters: GameBoxParameters): GameBoxLayout {
  const placed = placeModules(activeModules(parameters))
  // The tolerance keeps a length that is a whole number of slots by a
  // fraction of a nanometre from rounding up to the next slot.
  const storageDepth =
    Math.ceil((placed.minimumDepth - TOLERANCE) / SLOT_PITCH) * SLOT_PITCH
  const last = placed.modules.length - 1
  const modules = placed.modules.map((module, position) => {
    if (position !== last) return module
    // The last module collects the rounding slack.
    if (module.type === 'cards') {
      return {
        ...module,
        end: storageDepth,
        length: storageDepth - module.start,
        freeLength: module.freeLength + (storageDepth - module.end),
      }
    }
    return {
      ...module,
      end: storageDepth,
      length: storageDepth - module.start,
    }
  })
  const slotCenters: number[] = []
  for (
    let centre = SLOT_PITCH;
    centre <= storageDepth - SLOT_PITCH;
    centre += SLOT_PITCH
  ) {
    slotCenters.push(centre)
  }
  return {
    modules,
    storageDepth,
    slotCenters,
    dividerCenters: placed.dividerCenters,
    dividerCount: placed.dividerCenters.length,
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
  const parts: GameBoxPart[] = ['assembly', 'box', 'lid', 'cover']
  for (let divider = 1; divider <= layout.dividerCount; divider += 1) {
    parts.push(`divider${divider}` as GameBoxPart)
  }
  for (const module of layout.modules) {
    if (module.type === 'dice')
      parts.push(`module${module.index}` as GameBoxPart)
  }
  return parts
}

/**
 * Whether the selected part carries accent art and therefore exports a
 * two-color 3MF: a labelled divider card with non-empty text, or a cover
 * with title, subtitle or imported SVG. Blank plates and the box parts do
 * not.
 */
export function gameBoxHasAccentArt(parameters: GameBoxParameters): boolean {
  const dividerIndex = gameBoxPartDividerOrdinal(parameters.part)
  if (dividerIndex !== null) {
    return parameters[gameBoxDividerTextKey(dividerIndex)].trim() !== ''
  }
  if (parameters.part === 'cover') {
    return (
      parameters.coverTitle.trim() !== '' ||
      parameters.coverSubtitle.trim() !== '' ||
      parameters.usesCoverSvg
    )
  }
  return false
}

/**
 * The safe-area width the cover art must fit: the visible window
 * (interior width - 2 x 5 mm hidden lips) shrunk by the 2 mm safe margin on
 * every side. Validation uses it for the exact, font-free cover-fit gate.
 */
export function gameBoxCoverSafeAreaWidth(cardWidth: number): number {
  return (
    cardBoxInteriorWidth(cardWidth) -
    2 *
      (CARD_BOX_CONFIGURATION.hiddenLipWidth +
        CARD_BOX_CONFIGURATION.coverSafeAreaMargin)
  )
}

/**
 * The safe-area height the cover art must fit: the visible window
 * (card height - 2 x 5 mm hidden lips) shrunk by the 2 mm safe margin on
 * every side.
 */
export function gameBoxCoverSafeAreaHeight(cardHeight: number): number {
  return (
    cardHeight -
    2 *
      (CARD_BOX_CONFIGURATION.hiddenLipWidth +
        CARD_BOX_CONFIGURATION.coverSafeAreaMargin)
  )
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
    cardDepths.push(quantizeLength(depth.value))

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
    diceSizes.push(quantizeLength(size.value))

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

  const dividerFields = validateDividerFields(record)
  if (!dividerFields.ok) return { valid: false, issues: [dividerFields.issue] }

  const coverFields = validateCoverFields(
    record,
    cardWidth.value,
    cardHeight.value,
  )
  if (!coverFields.ok) return { valid: false, issues: [coverFields.issue] }

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
    dividerFields.value,
    coverFields.value,
  )
  const layout = gameBoxLayout(parameters)
  const depth = layout.storageDepth
  const depthRange = GAME_BOX_CONFIGURATION.ranges.storageDepth
  if (
    depth < depthRange.min - TOLERANCE ||
    depth > depthRange.max + TOLERANCE
  ) {
    const lastModule = layout.modules.at(-1)
    if (!lastModule) return invalid('parameters')
    const field =
      lastModule.type === 'cards'
        ? gameBoxModuleCardDepthKey(lastModule.index)
        : gameBoxModuleDiceSizeKey(lastModule.index)
    return invalid(field, 'validation.gameBoxStorageDepthOutOfRange', {
      // The formatted depth: the raw sum carries binary noise (a nominal
      // 150 mm can arrive as 150.00000000000003), which is not what the
      // message should show.
      depth: formatDepth(depth),
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
  dividers: DividerFieldValues,
  cover: CoverFieldValues,
): GameBoxParameters {
  const parameters: Record<string, unknown> = {
    part,
    cardWidth,
    cardHeight,
    ...cover,
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
  for (const index of GAME_BOX_DIVIDER_INDICES) {
    parameters[gameBoxDividerTextKey(index)] = dividers.text[index - 1]
    parameters[gameBoxDividerTabPositionKey(index)] =
      dividers.tabPositions[index - 1]
    parameters[gameBoxDividerStyleKey(index)] = dividers.styles[index - 1]
  }
  return parameters as GameBoxParameters
}

type DividerFieldValues = {
  text: readonly string[]
  tabPositions: readonly GameBoxTabPosition[]
  styles: readonly GameBoxStyle[]
}

type CoverFieldValues = {
  coverTitle: string
  coverTitleTextHeight: number
  coverSubtitle: string
  coverSubtitleTextHeight: number
  coverSvgWidth: number
  coverVerticalPosition: number
  coverStyle: GameBoxStyle
  usesCoverSvg: boolean
  coverSvgFingerprint: string
  coverSvgAspect: number
}

/**
 * Validates the five divider-card field groups. Every group validates its
 * ranges and enums even when its boundary does not exist; a divider card
 * whose boundary is not one of the cards pairs never reaches the geometry.
 */
function validateDividerFields(
  record: Record<string, unknown>,
):
  { ok: true; value: DividerFieldValues } | { ok: false; issue: GameBoxIssue } {
  const text: string[] = []
  const tabPositions: GameBoxTabPosition[] = []
  const styles: GameBoxStyle[] = []
  for (const index of GAME_BOX_DIVIDER_INDICES) {
    const textKey = gameBoxDividerTextKey(index)
    const dividerText = validStringOrDefault(record[textKey], '')
    if (dividerText.length > GAME_BOX_CONFIGURATION.dividerTextMaxLength) {
      return {
        ok: false,
        issue: {
          field: textKey,
          messageId: 'validation.gameBoxTextTooLong',
          params: { max: GAME_BOX_CONFIGURATION.dividerTextMaxLength },
        },
      }
    }
    text.push(dividerText)

    const tabKey = gameBoxDividerTabPositionKey(index)
    const rawTab = record[tabKey]
    if (
      rawTab !== undefined &&
      !GAME_BOX_TAB_POSITIONS.includes(rawTab as GameBoxTabPosition)
    ) {
      return {
        ok: false,
        issue: {
          field: tabKey,
          messageId: 'validation.gameBoxTabPositionInvalid',
        },
      }
    }
    tabPositions.push(
      rawTab === undefined
        ? GAME_BOX_CONFIGURATION.defaultTabPosition
        : (rawTab as GameBoxTabPosition),
    )

    const styleKey = gameBoxDividerStyleKey(index)
    const rawStyle = record[styleKey]
    if (
      rawStyle !== undefined &&
      !GAME_BOX_STYLES.includes(rawStyle as GameBoxStyle)
    ) {
      return {
        ok: false,
        issue: { field: styleKey, messageId: 'validation.gameBoxStyleInvalid' },
      }
    }
    styles.push(
      rawStyle === undefined
        ? GAME_BOX_CONFIGURATION.defaultStyle
        : (rawStyle as GameBoxStyle),
    )
  }
  return { ok: true, value: { text, tabPositions, styles } }
}

/** The height/width ratio of an imported cover: 0 means unknown, and a
 * stored value that is not a positive finite number (negative, NaN) counts
 * as unknown too - the ratio has no control on the panel, so it never
 * carries a field error of its own. */
function coverSvgAspectValue(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    return 0
  }
  return raw
}

function validStringOrDefault(value: unknown, fallback: string): string {
  if (value === undefined) return fallback
  return typeof value === 'string' ? value : fallback
}

/**
 * Validates the nine cover fields, then the exact, font-free cover-fit
 * gate: imported SVG wider than the safe area of the current card size can
 * never render, so the snapshot is invalid (a smaller card size preset is
 * not applied, by the not-applicable rule). The font-dependent overflow of
 * rendered text stays a kernel build-time error.
 */
function validateCoverFields(
  record: Record<string, unknown>,
  cardWidth: number,
  cardHeight: number,
): { ok: true; value: CoverFieldValues } | { ok: false; issue: GameBoxIssue } {
  const cover = GAME_BOX_CONFIGURATION.rangesCover
  const coverTitle = validStringOrDefault(
    record.coverTitle,
    GAME_BOX_CONFIGURATION.defaultCoverTitle,
  )
  if (coverTitle.length > GAME_BOX_CONFIGURATION.coverTextMaxLength) {
    return {
      ok: false,
      issue: {
        field: 'coverTitle',
        messageId: 'validation.gameBoxTextTooLong',
        params: { max: GAME_BOX_CONFIGURATION.coverTextMaxLength },
      },
    }
  }

  const titleHeight = numberInRange(
    record.coverTitleTextHeight,
    'coverTitleTextHeight',
    cover.coverTitleTextHeight.min,
    cover.coverTitleTextHeight.max,
    cover.coverTitleTextHeight.default,
    'mm',
  )
  if (!titleHeight.ok) return { ok: false, issue: titleHeight.issue }

  const coverSubtitle = validStringOrDefault(record.coverSubtitle, '')
  if (coverSubtitle.length > GAME_BOX_CONFIGURATION.coverTextMaxLength) {
    return {
      ok: false,
      issue: {
        field: 'coverSubtitle',
        messageId: 'validation.gameBoxTextTooLong',
        params: { max: GAME_BOX_CONFIGURATION.coverTextMaxLength },
      },
    }
  }

  const subtitleHeight = numberInRange(
    record.coverSubtitleTextHeight,
    'coverSubtitleTextHeight',
    cover.coverSubtitleTextHeight.min,
    cover.coverSubtitleTextHeight.max,
    cover.coverSubtitleTextHeight.default,
    'mm',
  )
  if (!subtitleHeight.ok) return { ok: false, issue: subtitleHeight.issue }

  const svgWidth = numberInRange(
    record.coverSvgWidth,
    'coverSvgWidth',
    cover.coverSvgWidth.min,
    cover.coverSvgWidth.max,
    cover.coverSvgWidth.default,
    'mm',
  )
  if (!svgWidth.ok) return { ok: false, issue: svgWidth.issue }

  const verticalPosition = numberInRange(
    record.coverVerticalPosition,
    'coverVerticalPosition',
    cover.coverVerticalPosition.min,
    cover.coverVerticalPosition.max,
    cover.coverVerticalPosition.default,
  )
  if (!verticalPosition.ok) return { ok: false, issue: verticalPosition.issue }

  const rawCoverStyle = record.coverStyle
  if (
    rawCoverStyle !== undefined &&
    !GAME_BOX_STYLES.includes(rawCoverStyle as GameBoxStyle)
  ) {
    return {
      ok: false,
      issue: {
        field: 'coverStyle',
        messageId: 'validation.gameBoxStyleInvalid',
      },
    }
  }
  const coverStyle =
    rawCoverStyle === undefined
      ? GAME_BOX_CONFIGURATION.defaultStyle
      : (rawCoverStyle as GameBoxStyle)

  const rawUsesSvg = record.usesCoverSvg
  if (rawUsesSvg !== undefined && typeof rawUsesSvg !== 'boolean') {
    return {
      ok: false,
      issue: { field: 'usesCoverSvg', messageId: 'validation.invalid' },
    }
  }
  const usesCoverSvg = rawUsesSvg === undefined ? false : rawUsesSvg

  const coverSvgFingerprint = validStringOrDefault(
    record.coverSvgFingerprint,
    '',
  )
  if (usesCoverSvg && coverSvgFingerprint === '') {
    return {
      ok: false,
      issue: {
        field: 'coverSvgFingerprint',
        messageId: 'validation.gameBoxSvgFingerprintMissing',
      },
    }
  }

  // The height/width ratio the import wrote into the parameter record: 0
  // means unknown (the outlines were imported before the ratio existed),
  // and an unknown ratio cannot be judged here.
  const aspect = coverSvgAspectValue(record.coverSvgAspect)

  if (
    usesCoverSvg &&
    svgWidth.value > gameBoxCoverSafeAreaWidth(cardWidth) + TOLERANCE
  ) {
    return {
      ok: false,
      issue: {
        field: 'coverSvgWidth',
        messageId: 'validation.gameBoxCoverArtOutsideSafeArea',
      },
    }
  }

  // Font-free vertical fit: the scaled SVG height plus the configured text
  // heights stack inside the safe area of the current card size. Text-only
  // stacks cannot overflow within the legal ranges, so an overflow always
  // names the SVG width as the owning field. The rendered text width stays
  // a kernel build-time check (it needs font metrics).
  if (usesCoverSvg && aspect > 0) {
    const svgHeight = svgWidth.value * aspect
    const stackHeight =
      svgHeight +
      (coverTitle.trim() === '' ? 0 : titleHeight.value) +
      (coverSubtitle.trim() === '' ? 0 : subtitleHeight.value)
    if (stackHeight > gameBoxCoverSafeAreaHeight(cardHeight) + TOLERANCE) {
      return {
        ok: false,
        issue: {
          field: 'coverSvgWidth',
          messageId: 'validation.gameBoxCoverArtTooTall',
        },
      }
    }
  }

  return {
    ok: true,
    value: {
      coverTitle,
      coverTitleTextHeight: titleHeight.value,
      coverSubtitle,
      coverSubtitleTextHeight: subtitleHeight.value,
      coverSvgWidth: svgWidth.value,
      coverVerticalPosition: verticalPosition.value,
      coverStyle,
      usesCoverSvg,
      coverSvgFingerprint,
      coverSvgAspect: aspect,
    },
  }
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
  if (gameBoxPartDividerOrdinal(parameters.part) !== null) {
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
  if (parameters.part === 'cover') {
    // The cover plate: interior width x card height x 0.6 mm.
    const halfInterior = cardBoxInteriorWidth(parameters.cardWidth) / 2
    return {
      min: [-halfInterior, 0, 0],
      max: [
        halfInterior,
        parameters.cardHeight,
        CARD_BOX_CONFIGURATION.coverPlateThickness,
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
 * A length in millimetres, rounded to two decimals and without trailing
 * zeros, so a computed depth never carries floating-point noise into a file
 * name and two different geometries never share one.
 */
function formatDepth(depth: number): string {
  return Number(depth.toFixed(2)).toString()
}

/**
 * The module list of a box file name: every module contributes its code and
 * its content size, in front-to-back order. The depth alone does not tell
 * two different module lists apart, so the box file name carries the list.
 */
function gameBoxModuleList(parameters: GameBoxParameters): string {
  const layout = gameBoxLayout(parameters)
  return layout.modules
    .map((module) => {
      if (module.type === 'cards') {
        return `c${parameters[gameBoxModuleCardDepthKey(module.index)]}`
      }
      return `d${parameters[gameBoxModuleDiceSizeKey(module.index)]}`
    })
    .join('-')
}

/** Short stable token for file names (FNV-1a, hex) over the divider label. */
function gameBoxTextToken(value: string): string {
  return cardBoxToken(value)
}

/** File-name token over every cover geometry input, so two different
 * covers never share a name: title, subtitle, both text heights, SVG width,
 * vertical position, style and the SVG fingerprint. */
function gameBoxCoverArtToken(parameters: GameBoxParameters): string {
  if (!gameBoxHasAccentArt(parameters)) return 'blank'
  return gameBoxTextToken(
    [
      parameters.coverTitle,
      parameters.coverSubtitle,
      parameters.coverTitleTextHeight,
      parameters.coverSubtitleTextHeight,
      parameters.usesCoverSvg ? parameters.coverSvgFingerprint : '',
      parameters.usesCoverSvg ? parameters.coverSvgWidth : '',
      parameters.usesCoverSvg ? parameters.coverSvgAspect : '',
      parameters.coverVerticalPosition,
      parameters.coverStyle,
    ].join('\u0000'),
  )
}

/**
 * Export file name. The assembly has no file name; the box carries the card
 * size, the derived storage depth and the module list; the lid follows the
 * depth alone; every divider card carries its ordinal among the boundaries
 * that carry a plate (so identical plates never collide) plus tab, style and
 * text token; the cover carries the card size, the depth, the style and the
 * art token; the dice holder carries the card size, the die size and the die
 * count.
 */
export function gameBoxFileName(parameters: GameBoxParameters): string {
  if (parameters.part === 'assembly') {
    throw new Error('GAME_BOX_ASSEMBLY_EXPORT_FORBIDDEN')
  }
  const size = `${parameters.cardWidth}x${parameters.cardHeight}`
  const partModule = gameBoxPartModuleIndex(parameters.part)
  if (partModule === null) {
    const depth = formatDepth(gameBoxStorageDepth(parameters))
    const dividerIndex = gameBoxPartDividerOrdinal(parameters.part)
    if (dividerIndex !== null) {
      const tab = parameters[gameBoxDividerTabPositionKey(dividerIndex)]
      const style = parameters[gameBoxDividerStyleKey(dividerIndex)]
      const text = parameters[gameBoxDividerTextKey(dividerIndex)]
      return `game-box-divider${dividerIndex}-${size}x${depth}-${tab}-${style}-${gameBoxTextToken(text)}${PROTOTYPE_CONFIGURATION.stepExtension}`
    }
    if (parameters.part === 'cover') {
      return `game-box-cover-${size}x${depth}-${parameters.coverStyle}-${gameBoxCoverArtToken(parameters)}${PROTOTYPE_CONFIGURATION.stepExtension}`
    }
    // Only the box depends on the module list; the lid follows the depth
    // alone.
    const modules =
      parameters.part === 'box' ? gameBoxModuleList(parameters) : ''
    const suffix = modules ? `-${modules}` : ''
    return `game-box-${parameters.part}-${size}x${depth}${suffix}${PROTOTYPE_CONFIGURATION.stepExtension}`
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

/**
 * File name of the two-color 3MF export: exactly the STEP name with the
 * `.3mf` extension, and only for the parts that carry accent art. Blank
 * plates, box, lid, dice holders and the assembly return null.
 */
export function gameBoxThreeMfFileName(
  parameters: GameBoxParameters,
): string | null {
  if (!gameBoxHasAccentArt(parameters)) return null
  return gameBoxFileName(parameters).replace(
    PROTOTYPE_CONFIGURATION.stepExtension,
    PROTOTYPE_CONFIGURATION.threeMfExtension,
  )
}
