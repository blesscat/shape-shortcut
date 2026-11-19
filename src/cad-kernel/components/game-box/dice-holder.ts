import { makeBox, Sketcher, type Shape3D } from 'replicad'
import {
  GAME_BOX_CONFIGURATION,
  gameBoxDiceHolderOuterWidth,
  gameBoxDiceHolderThickness,
  gameBoxDiceHolderWidth,
  gameBoxDiceLayout,
  type GameBoxDiceLayout,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'

/**
 * Named constants of the dice holder (mm).
 *
 * The grip strip dimensions were confirmed by the test print of
 * 2026-11-19: the design (decision 5) records them as final, and they live
 * in named constants here.
 *
 * The strip is a thin sheet that is fixed at both ends in the side wall and
 * bowed outward in the middle, so the natural outer width exceeds the box
 * interior. The wall is relieved behind the strip (`gripStripRelief`): that
 * pocket is the space the strip needs to press in to the body width.
 */
export const GAME_BOX_DICE_HOLDER = {
  /** Widest vertical opening of the front wall. */
  frontSlotMaxWidth: 8,
  /** Radial thickness of the bowed grip strip. */
  gripStripThickness: 0.4,
  /** Width of the grip strip along the holder's thickness. */
  gripStripWidth: 1.2,
  /** Length of the grip strip along the holder's height. */
  gripStripLength: 60,
  /** Relief behind the grip strip: the pocket that lets it press in. */
  gripStripRelief: 0.6,
  /** Air gap between the grip strip and the sides of its relief pocket. */
  gripStripSideClearance: 0.4,
  /** Distance between the grip strip ends and the holder edges. */
  gripStripEndMargin: 4,
  /** Clearance between the pressed grip strip and the box wall. */
  pressedClearance: 0.2,
} as const

export type GameBoxDiceHolderOptions = {
  cardWidth: number
  cardHeight: number
  diceSize: number
  diceCount: number
  /**
   * Outer width of the holder including the grip strips. Defaults to the
   * natural width; the assembly rebuilds the holder with the strips pressed
   * in so that it fits the box interior.
   */
  outerWidth?: number
}

/** The derived dimensions of a dice holder (mm). */
export type GameBoxDiceHolderFrame = {
  /** Width of the holder body (without the grip strips). */
  bodyWidth: number
  /** Outer width including the grip strips. */
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

function cutShape(source: Shape3D, cutter: Shape3D): Shape3D {
  try {
    const result = source.cut(cutter)
    if (result !== source) deleteShape(source)
    deleteShape(cutter)
    return result
  } catch (error) {
    deleteShape(cutter)
    throw error
  }
}

function fuseShape(source: Shape3D, addition: Shape3D): Shape3D {
  try {
    const result = source.fuse(addition)
    if (result !== source) deleteShape(source)
    deleteShape(addition)
    return result
  } catch (error) {
    deleteShape(addition)
    throw error
  }
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

/** The place the grip strip and its relief pocket occupy. */
export type GameBoxGripStripFrame = {
  /** y of the strip. */
  yStart: number
  yEnd: number
  /** y of the relief pocket behind the strip; it is wider than the strip. */
  pocketYStart: number
  pocketYEnd: number
  /** z of the strip. */
  zStart: number
  zEnd: number
  /** z of the relief pocket behind the strip. */
  reliefStart: number
  reliefEnd: number
  /** Depth of the relief pocket. */
  relief: number
}

/**
 * The grip strip of one side of a holder.
 *
 * The relief pocket is wider than the strip, so the strip touches nothing
 * but air between `reliefStart` and `reliefEnd`: it stays anchored by its
 * two embedded ends only and can bow in and out freely.
 */
export function gameBoxGripStripFrame(
  frame: GameBoxDiceHolderFrame,
): GameBoxGripStripFrame {
  const constants = GAME_BOX_DICE_HOLDER
  const length = Math.min(
    constants.gripStripLength,
    frame.height - 2 * constants.gripStripEndMargin,
  )
  const zStart = (frame.height - length) / 2
  const yStart = (frame.thickness - constants.gripStripWidth) / 2
  return {
    yStart,
    yEnd: yStart + constants.gripStripWidth,
    pocketYStart: yStart - constants.gripStripSideClearance,
    pocketYEnd:
      yStart + constants.gripStripWidth + constants.gripStripSideClearance,
    zStart,
    zEnd: zStart + length,
    reliefStart: zStart + constants.gripStripEndMargin,
    reliefEnd: zStart + length - constants.gripStripEndMargin,
    relief: constants.gripStripRelief,
  }
}

/**
 * The grip strip pressed flat into the relief pocket: a plain bar inside
 * the outer layer of the side wall.
 */
function buildFlatGripStrip(
  frame: GameBoxDiceHolderFrame,
  side: 1 | -1,
): Shape3D {
  const strip = gameBoxGripStripFrame(frame)
  const wallX = (side * frame.bodyWidth) / 2
  const innerX = wallX - side * GAME_BOX_DICE_HOLDER.gripStripThickness
  return makeBox(
    [Math.min(innerX, wallX), strip.yStart, strip.zStart],
    [Math.max(innerX, wallX), strip.yEnd, strip.zEnd],
  ) as Shape3D
}

/**
 * The grip strip: a thin sheet, fixed at both ends and bowed outward in the
 * middle, so the natural outer width exceeds the box interior. The sheet
 * ends sit in the side wall, the middle stands off it by the protrusion, and
 * a relief pocket behind the sheet lets it press in to the body width.
 */
function buildGripStrip(frame: GameBoxDiceHolderFrame, side: 1 | -1): Shape3D {
  const constants = GAME_BOX_DICE_HOLDER
  const strip = gameBoxGripStripFrame(frame)
  const wallX = (side * frame.bodyWidth) / 2
  const protrusion = (side * (frame.outerWidth - frame.bodyWidth)) / 2
  if (Math.abs(protrusion) < 1e-9) return buildFlatGripStrip(frame, side)
  const zStart = strip.zStart
  const zEnd = strip.zEnd
  const zMid = frame.height / 2
  const thickness = constants.gripStripThickness
  const yStart = strip.yStart

  // The sheet bows outward: its outer face follows an arc from the wall to
  // the protrusion and back, its inner face is the same arc offset inwards
  // by the sheet thickness.
  const outerStart: [number, number] = [wallX, zStart]
  const outerApex: [number, number] = [wallX + protrusion, zMid]
  const outerEnd: [number, number] = [wallX, zEnd]
  const innerX = wallX - side * thickness
  const innerStart: [number, number] = [innerX, zStart]
  const innerApex: [number, number] = [innerX + protrusion, zMid]
  const innerEnd: [number, number] = [innerX, zEnd]

  const sketcher = new Sketcher('XZ', [0, yStart, 0])
  sketcher.movePointerTo(outerStart)
  sketcher.threePointsArcTo(outerEnd, outerApex)
  sketcher.lineTo(innerEnd)
  sketcher.threePointsArcTo(innerStart, innerApex)
  const sketch = sketcher.close()
  try {
    return sketch.extrude(constants.gripStripWidth, {
      extrusionDirection: [0, 1, 0],
    }) as unknown as Shape3D
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

/**
 * The relief pocket behind a grip strip: without it the pressed strip
 * would have to sink into the side wall. The pocket is wider than the
 * strip, so the strip is not bonded to the pocket walls and stays a free
 * leaf between its two embedded ends.
 */
function cutGripRelief(
  shape: Shape3D,
  frame: GameBoxDiceHolderFrame,
  side: 1 | -1,
): Shape3D {
  const strip = gameBoxGripStripFrame(frame)
  const wallX = (side * frame.bodyWidth) / 2
  return cutShape(
    shape,
    makeBox(
      [
        side === 1 ? wallX - strip.relief : wallX - 0.01,
        strip.pocketYStart,
        strip.reliefStart,
      ],
      [
        side === 1 ? wallX + 0.01 : wallX + strip.relief,
        strip.pocketYEnd,
        strip.reliefEnd,
      ],
    ) as Shape3D,
  )
}

/**
 * Builds the dice holder: a body with a dice well open at the top, a
 * vertical opening in front of every row position, a solid riser below the
 * well and a bowed grip strip on each side. The holder is built in its print
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
    for (const side of [1, -1] as const) {
      shape = cutGripRelief(shape, frame, side)
      shape = fuseShape(shape, buildGripStrip(frame, side))
    }
    return shape
  } catch (error) {
    deleteShape(shape)
    throw error
  }
}
