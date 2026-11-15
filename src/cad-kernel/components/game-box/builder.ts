import { makeCompound, type Shape3D } from 'replicad'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
  gameBoxDiceHolderThickness,
  gameBoxModuleDiceCountKey,
  gameBoxModuleDiceSizeKey,
  gameBoxPartModuleIndex,
  isGameBoxParameters,
  type GameBoxParameters,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'
import { buildCardBoxBoxFromGeometry } from '../card-box/box'
import { flipLidForPrint } from '../card-box/builder'
import { buildCardBoxDividerFromGeometry } from '../card-box/divider'
import { buildCardBoxLidFromGeometry } from '../card-box/lid'
import { buildGameBoxDiceHolder, GAME_BOX_DICE_HOLDER } from './dice-holder'
import {
  gameBoxGeometryOf,
  gameBoxModulePlacements,
  type GameBoxGeometry,
  type GameBoxModulePlacement,
} from './geometry'

/**
 * The result of a game-box build. The game box has no art, so a build never
 * carries separated parts; the shape is the only payload.
 */
export type GameBoxBuild = {
  shape: Shape3D
}

/**
 * Stands the flat divider plate in its slot: rotate +90° around X (the
 * height becomes Z with the tab up), lift it onto the floor top and centre
 * its thickness on the divider position.
 */
function placeDividerInAssembly(plate: Shape3D, y: number): Shape3D {
  const rotated = plate.rotate(90, [0, 0, 0], [1, 0, 0])
  if (rotated !== plate) deleteShape(plate)
  return rotated.translate(
    0,
    y + CARD_BOX_CONFIGURATION.dividerPlateThickness / 2,
    CARD_BOX_CONFIGURATION.floorThickness,
  )
}

/**
 * Builds the dice holder in its installed state: the grip strips are
 * pressed in so that the holder fits between the box walls. The single part
 * export keeps the natural, wider strips.
 */
function buildInstalledDiceHolder(
  parameters: GameBoxParameters,
  placement: GameBoxModulePlacement,
): Shape3D {
  const diceSize = parameters[gameBoxModuleDiceSizeKey(placement.index)]
  const diceCount = parameters[gameBoxModuleDiceCountKey(placement.index)]
  const thickness = gameBoxDiceHolderThickness(diceSize)
  const pressedOuterWidth =
    cardBoxInteriorWidth(parameters.cardWidth) -
    GAME_BOX_DICE_HOLDER.pressedClearance
  const holder = buildGameBoxDiceHolder({
    cardWidth: parameters.cardWidth,
    cardHeight: parameters.cardHeight,
    diceSize,
    diceCount,
    outerWidth: pressedOuterWidth,
  })
  const y =
    placement.frontY + (placement.backY - placement.frontY - thickness) / 2
  return holder.translate(0, y, CARD_BOX_CONFIGURATION.floorThickness)
}

/**
 * The assembly in the assembled frame: the box, the lid, one divider per
 * module boundary and one dice holder per dice module. The holders stand on
 * the floor between the dividers that bound their module.
 *
 * Every part is built inside the guarded region, so a failing build frees
 * the parts it already created.
 */
function buildAssembly(
  parameters: GameBoxParameters,
  geometry: GameBoxGeometry,
): Shape3D {
  const parts: Shape3D[] = []
  try {
    parts.push(
      buildCardBoxBoxFromGeometry(geometry.cardBox, geometry.slotCentres),
    )
    parts.push(buildCardBoxLidFromGeometry(geometry.cardBox))
    for (const y of geometry.dividerCentres) {
      parts.push(
        placeDividerInAssembly(
          buildCardBoxDividerFromGeometry(geometry.cardBox),
          y,
        ),
      )
    }
    for (const placement of gameBoxModulePlacements(parameters)) {
      if (placement.type !== 'dice') continue
      parts.push(buildInstalledDiceHolder(parameters, placement))
    }
  } catch (error) {
    for (const part of parts) deleteShape(part)
    throw error
  }
  const compound = makeCompound(parts).asShape3D()
  for (const part of parts) deleteShape(part)
  return compound
}

/**
 * Builds the part the parameters select. Single parts come back in their
 * print orientation (z ≥ 0 on the bed); `assembly` returns the compound of
 * all parts in the assembled frame.
 */
export function buildGameBox(parameters: GameBoxParameters): GameBoxBuild {
  if (!isGameBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
  }
  const geometry = gameBoxGeometryOf(parameters)
  if (parameters.part === 'assembly') {
    return { shape: buildAssembly(parameters, geometry) }
  }
  const moduleIndex = gameBoxPartModuleIndex(parameters.part)
  if (moduleIndex !== null) {
    const diceSize = parameters[gameBoxModuleDiceSizeKey(moduleIndex)]
    const diceCount = parameters[gameBoxModuleDiceCountKey(moduleIndex)]
    return {
      shape: buildGameBoxDiceHolder({
        cardWidth: parameters.cardWidth,
        cardHeight: parameters.cardHeight,
        diceSize,
        diceCount,
      }),
    }
  }
  switch (parameters.part) {
    case 'box':
      return {
        shape: buildCardBoxBoxFromGeometry(
          geometry.cardBox,
          geometry.slotCentres,
        ),
      }
    case 'lid':
      return {
        shape: flipLidForPrint(buildCardBoxLidFromGeometry(geometry.cardBox)),
      }
    case 'divider':
      return {
        shape: buildCardBoxDividerFromGeometry(geometry.cardBox),
      }
    default:
      throw new Error('GAME_BOX_PART_INVALID')
  }
}
