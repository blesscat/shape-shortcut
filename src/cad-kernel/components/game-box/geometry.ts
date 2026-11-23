import {
  gameBoxLayout,
  gameBoxStorageDepth,
  type GameBoxModuleIndex,
  type GameBoxParameters,
} from '../../../cad-contract/units'
import { cardBoxInnerFrontY } from '../card-box/box'
import type { CardBoxGeometry } from '../card-box/geometry'

/**
 * Geometry input of the game-box part builders.
 *
 * The game box reuses the card-box geometry: only the storage depth (derived
 * from the module list) and the divider slots differ. The side walls carry
 * a divider slot every 3 mm, so a dice holder can lock itself into the rack
 * wherever it stands and a divider plate finds a slot of its own.
 */
export type GameBoxGeometry = {
  /** The card-box geometry the box, lid and divider builders read. */
  cardBox: CardBoxGeometry
  /** Divider slot centres of the whole rack (box frame, y from the centre). */
  slotCentres: number[]
  /** The boundaries that carry a divider plate (box frame). */
  dividerCentres: number[]
  /** y of the cavity front wall face in the box frame. */
  frontWallY: number
}

/** A module and the cavity it may use in the assembly. */
export type GameBoxModulePlacement =
  | {
      index: GameBoxModuleIndex
      type: 'cards'
      /** y of the free space in front of the module in the box frame. */
      frontY: number
      /** y of the free space behind the module in the box frame. */
      backY: number
    }
  | GameBoxDicePlacement

/** A dice module and the holder that stands in it. */
export type GameBoxDicePlacement = {
  index: GameBoxModuleIndex
  type: 'dice'
  /** y of the free space in front of the module in the box frame. */
  frontY: number
  /** y of the free space behind the module in the box frame. */
  backY: number
  /** y of the holder's front face: where the first tenon starts. */
  holderFrontY: number
}

/** The card-box geometry of a game-box snapshot. */
export function gameBoxCardBoxGeometry(
  parameters: GameBoxParameters,
): CardBoxGeometry {
  return {
    cardWidth: parameters.cardWidth,
    cardHeight: parameters.cardHeight,
    storageDepth: gameBoxStorageDepth(parameters),
  }
}

/**
 * Derives the geometry input of the game-box builders: the card-box
 * geometry, the whole slot rack and the divider positions between two card
 * modules. The side walls carry a slot at every rack centre.
 */
export function gameBoxGeometryOf(
  parameters: GameBoxParameters,
): GameBoxGeometry {
  const cardBox = gameBoxCardBoxGeometry(parameters)
  const layout = gameBoxLayout(parameters)
  const frontWallY = cardBoxInnerFrontY(cardBox)
  return {
    cardBox,
    slotCentres: layout.slotCenters.map((distance) => frontWallY + distance),
    dividerCentres: layout.dividerCenters.map(
      (distance) => frontWallY + distance,
    ),
    frontWallY,
  }
}

/**
 * Where every module stands in the assembly: the region it owns in the
 * cavity. A dice holder stands at the front of its region, so the card
 * module next to it leans on the holder's wall.
 */
export function gameBoxModulePlacements(
  parameters: GameBoxParameters,
): GameBoxModulePlacement[] {
  const layout = gameBoxLayout(parameters)
  const frontWallY = cardBoxInnerFrontY(gameBoxCardBoxGeometry(parameters))

  return layout.modules.map((module) => {
    const frontY = frontWallY + module.start
    const backY = frontWallY + module.end
    if (module.type === 'dice') {
      return {
        index: module.index,
        type: module.type,
        frontY,
        backY,
        holderFrontY: frontWallY + module.holderStart,
      }
    }
    return { index: module.index, type: module.type, frontY, backY }
  })
}
