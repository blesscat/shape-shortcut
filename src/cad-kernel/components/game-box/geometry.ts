import {
  CARD_BOX_CONFIGURATION,
  gameBoxLayout,
  gameBoxStorageDepth,
  type GameBoxModuleIndex,
  type GameBoxModuleType,
  type GameBoxParameters,
} from '../../../cad-contract/units'
import { cardBoxInnerFrontY } from '../card-box/box'
import type { CardBoxGeometry } from '../card-box/geometry'

/**
 * Geometry input of the game-box part builders.
 *
 * The game box reuses the card-box geometry: only the storage depth (derived
 * from the module list) and the divider slot grid differ. The slot grid of a
 * game box starts at the front inner wall, so every module boundary lands on
 * a slot; the card box centres its slots on the box instead.
 */
export type GameBoxGeometry = {
  /** The card-box geometry the box, lid and divider builders read. */
  cardBox: CardBoxGeometry
  /** Divider slot centres in the box frame (y from the box centre). */
  slotCentres: number[]
  /** Divider centres in the box frame (y from the box centre). */
  dividerCentres: number[]
  /** y of the cavity front wall face in the box frame. */
  frontWallY: number
}

/** A module and the cavity length it may use in the assembly. */
export type GameBoxModulePlacement = {
  index: GameBoxModuleIndex
  type: GameBoxModuleType
  /** y of the free space in front of the module in the box frame. */
  frontY: number
  /** y of the free space behind the module in the box frame. */
  backY: number
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
 * geometry, the wall slot grid counted from the front inner wall and the
 * divider centres on the module boundaries.
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
 * The cavity length every module may use: the module length minus the
 * divider plates that bound it. The first module starts at the front wall
 * and the last one ends at the back wall.
 */
export function gameBoxModulePlacements(
  parameters: GameBoxParameters,
): GameBoxModulePlacement[] {
  const layout = gameBoxLayout(parameters)
  const frontWallY = cardBoxInnerFrontY(gameBoxCardBoxGeometry(parameters))
  const halfPlate = CARD_BOX_CONFIGURATION.dividerPlateThickness / 2
  const depth = layout.storageDepth

  return layout.modules.map((module, position) => {
    const boundaryBefore =
      position === 0 ? 0 : layout.dividerCenters[position - 1]!
    const boundaryAfter =
      position === layout.modules.length - 1
        ? depth
        : layout.dividerCenters[position]!
    const start = boundaryBefore === 0 ? 0 : boundaryBefore + halfPlate
    const end = boundaryAfter === depth ? depth : boundaryAfter - halfPlate
    return {
      index: module.index,
      type: module.type,
      frontY: frontWallY + start,
      backY: frontWallY + end,
    }
  })
}
