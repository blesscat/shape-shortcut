import { makeBox, type Shape3D } from 'replicad'
import {
  CARD_BOX_CONFIGURATION,
  GAME_BOX_CONFIGURATION,
  cardBoxDividerWidth,
  gameBoxDiceHolderOuterWidth,
  gameBoxDiceHolderTenonOffset,
  gameBoxDiceHolderTenonSpan,
  gameBoxDiceHolderThickness,
  gameBoxDiceHolderWidth,
  gameBoxDiceLayout,
  type GameBoxDiceLayout,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'
import { cutShape, fuseShape } from './shape-ops'

/**
 * Named constants of the dice holder (mm).
 *
 * The holder is a solid block with a dice well open at the top. The front
 * and the back wall are 1.6 mm and 1.2 mm thick; the side walls and the
 * floor keep the 1.2 mm of the shared wall minimum.
 *
 * The holder locks itself into the box: every side carries two tenons that
 * reach into the divider slots of the box walls.
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
}

/** The derived dimensions of a dice holder (mm). */
export type GameBoxDiceHolderFrame = {
  /** Width of the holder body. */
  bodyWidth: number
  /** Outer width including the tenons. */
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
  /** Thickness of the front wall. */
  frontWall: number
  /** Thickness of the back wall. */
  backWall: number
  /** Distance between the centres of the two tenons of one side. */
  tenonSpan: number
  /** Distance from the front face to the centre of the first tenon. */
  tenonOffset: number
  /** Thickness of a tenon. */
  tenonThickness: number
  /** Half width of the holder body: the tenons start inside it. */
  bodyHalfWidth: number
  /** Half width of the tenons: as far out as a divider plate reaches. */
  tenonOuterHalfWidth: number
  /** Dice arrangement in the well. */
  layout: GameBoxDiceLayout
}

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
    outerWidth: gameBoxDiceHolderOuterWidth(options.cardWidth),
    thickness,
    height: options.cardHeight,
    pitch,
    wellWidth,
    wellFloorZ: options.cardHeight - (layout.layers * pitch + 1),
    frontWall: GAME_BOX_CONFIGURATION.diceHolderFrontWall,
    backWall: GAME_BOX_CONFIGURATION.diceHolderBackWall,
    tenonSpan: gameBoxDiceHolderTenonSpan(thickness),
    tenonOffset: gameBoxDiceHolderTenonOffset(thickness),
    tenonThickness: GAME_BOX_CONFIGURATION.dividerPlateThickness,
    bodyHalfWidth: bodyWidth / 2,
    tenonOuterHalfWidth: cardBoxDividerWidth(options.cardWidth) / 2,
    layout,
  }
}

/** Centre of one die in the holder frame. */
export type GameBoxDiceCenter = { x: number; y: number; z: number }

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
 * The tenon centres of one side of a holder, measured from the holder's
 * front face. Both tenons sit on the same slot grid: their distance is a
 * whole number of slots.
 */
export function gameBoxDiceHolderTenonCenters(
  frame: GameBoxDiceHolderFrame,
): number[] {
  return [frame.tenonOffset, frame.tenonOffset + frame.tenonSpan]
}

/**
 * The tenon of one side of the holder: a full-height plate that reaches into
 * the divider slot of the box wall exactly as far as a divider plate does.
 * Its root is buried in the body, so the tenon and the body are one solid.
 */
function tenonShape(
  side: 1 | -1,
  centre: number,
  frame: GameBoxDiceHolderFrame,
): Shape3D {
  const root =
    side * (frame.bodyHalfWidth - GAME_BOX_CONFIGURATION.tenonRootDepth)
  const tip = side * frame.tenonOuterHalfWidth
  return makeBox(
    [Math.min(root, tip), centre - frame.tenonThickness / 2, 0],
    [Math.max(root, tip), centre + frame.tenonThickness / 2, frame.height],
  ) as Shape3D
}

/**
 * Builds the dice holder: a body with a dice well open at the top, a
 * vertical opening in front of every row position, a solid riser below the
 * well and two tenons on each side that lock into the box walls. The holder
 * is built in its print orientation: standing upright, opening up, z ≥ 0.
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
  const {
    bodyWidth,
    thickness,
    height,
    wellWidth,
    wellFloorZ,
    frontWall,
    backWall,
  } = frame

  let shape = makeBox(
    [-bodyWidth / 2, 0, 0],
    [bodyWidth / 2, thickness, height],
  ) as Shape3D
  try {
    // The divider label relief: the top band of the front and the back
    // walls recesses so a raised divider label on the neighbouring plate
    // clears the holder. The band is the free height above the topmost
    // die, so no die space is lost; the relief stays inside the body
    // width, where the label faces the walls (never the grip flaps).
    const relief = GAME_BOX_CONFIGURATION.dividerLabelRelief
    for (const wall of [
      { name: 'front', yMin: -0.01, yMax: relief.depth },
      {
        name: 'back',
        yMin: thickness - relief.depth,
        yMax: thickness + 0.01,
      },
    ] as const) {
      shape = cutShape(
        shape,
        makeBox(
          [-bodyWidth / 2, wall.yMin, height - relief.bandHeight],
          [bodyWidth / 2, wall.yMax, height + 1],
        ) as Shape3D,
      )
    }
    // The dice well, open at the top.
    shape = cutShape(
      shape,
      makeBox(
        [-wellWidth / 2, frontWall, wellFloorZ],
        [wellWidth / 2, thickness - backWall, height + 1],
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
    // The tenons that lock the holder into the divider slots of the walls.
    for (const side of [1, -1] as const) {
      for (const centre of gameBoxDiceHolderTenonCenters(frame)) {
        shape = fuseShape(shape, tenonShape(side, centre, frame))
      }
    }
    return shape
  } catch (error) {
    deleteShape(shape)
    throw error
  }
}
