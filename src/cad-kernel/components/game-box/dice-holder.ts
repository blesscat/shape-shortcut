import { makeBox, type Shape3D } from 'replicad'
import {
  GAME_BOX_CONFIGURATION,
  gameBoxDiceHolderOuterWidth,
  gameBoxDiceHolderThickness,
  gameBoxDiceHolderWidth,
  gameBoxDiceLayout,
  type GameBoxDiceLayout,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'
import {
  applyGameBoxGrip,
  gameBoxGripFrame,
  gameBoxGripProtrusion,
  type GameBoxGripFrame,
} from './grip'
import { cutShape } from './shape-ops'

/**
 * Named constants of the dice holder (mm).
 *
 * The grip is no longer part of the holder: it lives in its own module
 * (`grip.ts`) so that other holders can use the same flap.
 *
 * The holder is a solid block with a dice well open at the top. The front
 * and the back wall are 0.8 mm thick; the side walls and the floor keep the
 * 1.2 mm of the shared wall minimum.
 */
export const GAME_BOX_DICE_HOLDER = {
  /** Widest vertical opening of the front wall. */
  frontSlotMaxWidth: 8,
} as const

export type GameBoxDiceHolderOptions = {
  cardWidth: number
  cardHeight: number
  diceSize: number
  diceCount: number
  /**
   * Outer width of the holder including the grip flaps. Defaults to the
   * natural width; the assembly rebuilds the holder with the flaps pressed
   * in so that it fits the box interior.
   */
  outerWidth?: number
}

/** The derived dimensions of a dice holder (mm). */
export type GameBoxDiceHolderFrame = {
  /** Width of the holder body (without the grip flaps). */
  bodyWidth: number
  /** Outer width including the grip flaps. */
  outerWidth: number
  /** Thickness of the holder (the direction of the box depth). */
  thickness: number
  /** Height of the holder. */
  height: number
  /** Distance between two neighbouring dice. */
  pitch: number
  /** Width of the dice well. */
  wellWidth: number
  /** z of the dice well floor (its top face). */
  wellFloorZ: number
  /** Thickness of the front and the back wall. */
  frontWall: number
  /** Dice arrangement in the well. */
  layout: GameBoxDiceLayout
}

/** Centre of one die in the holder frame. */
export type GameBoxDiceCenter = { x: number; y: number; z: number }

/**
 * Derives the dimensions of a dice holder: the body is narrower than the
 * box interior, the well holds the dice in rows of `perRow` and the front
 * and back walls share the remaining thickness.
 */
export function gameBoxDiceHolderFrame(
  options: GameBoxDiceHolderOptions,
): GameBoxDiceHolderFrame {
  const bodyWidth = gameBoxDiceHolderWidth(options.cardWidth)
  const thickness = gameBoxDiceHolderThickness(options.diceSize)
  const pitch = options.diceSize + GAME_BOX_CONFIGURATION.diceClearance
  const layout = gameBoxDiceLayout(
    options.cardWidth,
    options.cardHeight,
    options.diceSize,
    options.diceCount,
  )
  const wellWidth = layout.perRow * pitch
  return {
    bodyWidth,
    outerWidth:
      options.outerWidth ?? gameBoxDiceHolderOuterWidth(options.cardWidth),
    thickness,
    height: options.cardHeight,
    pitch,
    wellWidth,
    wellFloorZ: options.cardHeight - (layout.layers * pitch + 1),
    frontWall: (thickness - pitch) / 2,
    layout,
  }
}

/**
 * The centres of the `diceCount` dice in the holder frame. The dice fill
 * the well row by row; the positions are clear of every wall, so the dice
 * never touch the holder.
 */
export function gameBoxDiceCenters(
  options: GameBoxDiceHolderOptions,
): GameBoxDiceCenter[] {
  const frame = gameBoxDiceHolderFrame(options)
  const centers: GameBoxDiceCenter[] = []
  for (let layer = 0; layer < frame.layout.layers; layer += 1) {
    for (let column = 0; column < frame.layout.perRow; column += 1) {
      if (centers.length >= options.diceCount) return centers
      centers.push({
        x: -frame.wellWidth / 2 + frame.pitch * (column + 0.5),
        y: frame.thickness / 2,
        z: frame.wellFloorZ + frame.pitch * (layer + 0.5),
      })
    }
  }
  return centers
}

/** Width of the vertical opening in front of one row position. */
export function gameBoxDiceHolderSlotWidth(diceSize: number): number {
  return Math.min(GAME_BOX_DICE_HOLDER.frontSlotMaxWidth, diceSize / 2)
}

/**
 * The grip zone of one side of a holder: the flap band and the height it
 * covers. The flap is joined to the wall along its whole length.
 */
export function gameBoxDiceHolderGripFrame(
  frame: GameBoxDiceHolderFrame,
): GameBoxGripFrame {
  return gameBoxGripFrame({
    bodyHalfWidth: frame.bodyWidth / 2,
    wallInnerHalfWidth: frame.wellWidth / 2,
    thickness: frame.thickness,
    height: frame.height,
  })
}

/**
 * Builds the dice holder: a body with a dice well open at the top, a
 * vertical opening in front of every row position, a solid riser below the
 * well and a grip flap on each side. The holder is built in its print
 * orientation: standing upright, opening up, z ≥ 0.
 *
 * Everything below the dice well is solid, so the full body cross-section
 * forms the bottom face. The slicer's infill setting controls its material.
 */
export function buildGameBoxDiceHolder(
  options: GameBoxDiceHolderOptions,
): Shape3D {
  const frame = gameBoxDiceHolderFrame(options)
  if (frame.layout.layers > frame.layout.layerLimit) {
    throw new Error('GAME_BOX_GEOMETRY_INVALID:dice-capacity')
  }
  const { bodyWidth, thickness, height, wellWidth, wellFloorZ, frontWall } =
    frame

  let shape = makeBox(
    [-bodyWidth / 2, 0, 0],
    [bodyWidth / 2, thickness, height],
  ) as Shape3D
  try {
    // The dice well, open at the top.
    shape = cutShape(
      shape,
      makeBox(
        [-wellWidth / 2, frontWall, wellFloorZ],
        [wellWidth / 2, thickness - frontWall, height + 1],
      ) as Shape3D,
    )
    // The vertical openings in front of the row positions.
    const slotWidth = gameBoxDiceHolderSlotWidth(options.diceSize)
    for (let column = 0; column < frame.layout.perRow; column += 1) {
      const x = -wellWidth / 2 + frame.pitch * (column + 0.5)
      shape = cutShape(
        shape,
        makeBox(
          [x - slotWidth / 2, -0.01, wellFloorZ],
          [x + slotWidth / 2, frontWall + 0.01, height + 1],
        ) as Shape3D,
      )
    }
    const gripInput = {
      bodyHalfWidth: bodyWidth / 2,
      wallInnerHalfWidth: wellWidth / 2,
      thickness,
      height,
    }
    const protrusion = gameBoxGripProtrusion(frame.outerWidth, frame.bodyWidth)
    for (const side of [1, -1] as const) {
      shape = applyGameBoxGrip(shape, gripInput, side, protrusion)
    }
    return shape
  } catch (error) {
    deleteShape(shape)
    throw error
  }
}
