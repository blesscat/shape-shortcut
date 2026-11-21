import { makeBox, Sketcher, type Shape3D } from 'replicad'
import { deleteShape } from '../../lifetime/dispose'

/**
 * Named constants of the grip (mm).
 *
 * The grip is a fin that grows out of the side wall along its whole length.
 * The wall carries a relief groove in which the fin stands; the fin is fused
 * to the floor of that groove, so the grip zone never holds a part that is
 * attached to the body at its two ends only.
 *
 * The dimensions of the groove and of the fin follow the design decision of
 * 2026-11-21: the groove is 0.6 mm deep and leaves a 0.6 mm wall at its
 * bottom, the fin is 1.2 mm wide and stands 0.5 mm proud of the wall.
 */
export const GAME_BOX_GRIP = {
  /** Width of the fin along the holder's thickness. */
  finWidth: 1.2,
  /** Width of the relief groove that carries the fin. */
  grooveWidth: 1.6,
  /** Depth of the relief groove into the side wall. */
  reliefDepth: 0.6,
  /** Thickness of the side wall inside the grip zone. */
  leafThickness: 1.2,
  /** Length of the grip zone along the holder's height. */
  length: 60,
  /** Clearance between the grip zone and the holder edges. */
  endMargin: 4,
  /** How far the fin stands proud of the wall in its natural state. */
  protrusion: 0.5,
  /** Radius of the rounded fin ends. */
  endRadius: 0.2,
  /** Clearance between the pressed fin and the box wall. */
  pressedClearance: 0.2,
} as const

/**
 * The geometry of a grip zone: the band the fin runs in and the height it
 * covers.
 */
export type GameBoxGripFrame = {
  /** y of the fin. */
  yStart: number
  yEnd: number
  /** y of the relief groove that carries the fin. */
  grooveYStart: number
  grooveYEnd: number
  /** z of the grip zone. */
  zStart: number
  zEnd: number
}

/**
 * The side wall a grip is built on. The grip only knows the wall, so the
 * same code serves every holder that carries one.
 */
export type GameBoxGripInput = {
  /** Half width of the holder body: the outer face of the side wall. */
  bodyHalfWidth: number
  /** Distance from the body centre to the inner face of the side wall. */
  wallInnerHalfWidth: number
  /** Thickness of the holder along the box depth. */
  thickness: number
  /** Height of the holder. */
  height: number
}

/**
 * The grip zone of a side wall: the fin runs in the middle of the holder's
 * thickness and covers the height of the grip zone, which leaves the end
 * margin at the holder edges.
 */
export function gameBoxGripFrame(input: GameBoxGripInput): GameBoxGripFrame {
  const constants = GAME_BOX_GRIP
  const length = Math.min(
    constants.length,
    input.height - 2 * constants.endMargin,
  )
  const zStart = (input.height - length) / 2
  const yStart = (input.thickness - constants.finWidth) / 2
  const sideClearance = (constants.grooveWidth - constants.finWidth) / 2
  return {
    yStart,
    yEnd: yStart + constants.finWidth,
    grooveYStart: yStart - sideClearance,
    grooveYEnd: yStart + constants.finWidth + sideClearance,
    zStart,
    zEnd: zStart + length,
  }
}

/**
 * How far the fin of one side stands proud of the wall: the natural
 * protrusion of the grip, or the pressed one when the holder is built for
 * the assembly.
 */
export function gameBoxGripProtrusion(
  outerWidth: number,
  bodyWidth: number,
): number {
  return (outerWidth - bodyWidth) / 2
}

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
 * The x range of the slot that thins the wall down to its leaf: from the
 * inner face of the wall to the inner face of the leaf.
 */
function leafSlotRange(
  input: GameBoxGripInput,
  side: 1 | -1,
): [number, number] {
  const leafInner = input.bodyHalfWidth - GAME_BOX_GRIP.leafThickness
  const wallInner = input.wallInnerHalfWidth
  const start = Math.min(wallInner, leafInner)
  const end = Math.max(wallInner, leafInner)
  return side === 1 ? [start, end] : [-end, -start]
}

/** The x range of the relief groove in the outer face of the wall. */
function grooveRange(input: GameBoxGripInput, side: 1 | -1): [number, number] {
  const floor = input.bodyHalfWidth - GAME_BOX_GRIP.reliefDepth
  const outer = input.bodyHalfWidth + 0.01
  return side === 1 ? [floor, outer] : [-outer, -floor]
}

/**
 * The relief of one side of the grip: the groove in the outer face of the
 * wall and the slot that thins the wall down to its leaf.
 *
 * The slot runs from the inner face of the wall to the leaf, so the groove
 * leaves the confirmed wall of 0.6 mm at its bottom and the fin can give
 * way when the holder is pressed into the box.
 */
function cutGripRelief(
  shape: Shape3D,
  input: GameBoxGripInput,
  frame: GameBoxGripFrame,
  side: 1 | -1,
): Shape3D {
  const slot = leafSlotRange(input, side)
  const thinned = cutShape(
    shape,
    makeBox(
      [slot[0], frame.grooveYStart, frame.zStart],
      [slot[1], frame.grooveYEnd, frame.zEnd],
    ) as Shape3D,
  )

  const groove = grooveRange(input, side)
  return cutShape(
    thinned,
    makeBox(
      [groove[0], frame.grooveYStart, frame.zStart],
      [groove[1], frame.grooveYEnd, frame.zEnd],
    ) as Shape3D,
  )
}

/**
 * The fin of one side of the grip: a ridge that stands on the floor of the
 * relief groove and is fused to it along the whole grip zone. Its ends are
 * rounded so that they do not become the crack origin of the print.
 */
function buildGripFin(
  input: GameBoxGripInput,
  frame: GameBoxGripFrame,
  side: 1 | -1,
  protrusion: number,
): Shape3D {
  const constants = GAME_BOX_GRIP
  const floor = side * (input.bodyHalfWidth - constants.reliefDepth)
  const tip = side * (input.bodyHalfWidth + protrusion)
  const xStart = Math.min(floor, tip)
  const xEnd = Math.max(floor, tip)
  const radius = Math.min(
    constants.endRadius,
    (xEnd - xStart) / 2,
    (frame.zEnd - frame.zStart) / 2,
  )

  const sketcher = new Sketcher('XZ', [0, frame.yStart, 0])
  const inset = radius * (1 - Math.SQRT1_2)
  sketcher.movePointerTo([xStart + radius, frame.zStart])
  sketcher.lineTo([xEnd - radius, frame.zStart])
  sketcher.threePointsArcTo(
    [xEnd, frame.zStart + radius],
    [xEnd - inset, frame.zStart + inset],
  )
  sketcher.lineTo([xEnd, frame.zEnd - radius])
  sketcher.threePointsArcTo(
    [xEnd - radius, frame.zEnd],
    [xEnd - inset, frame.zEnd - inset],
  )
  sketcher.lineTo([xStart + radius, frame.zEnd])
  sketcher.threePointsArcTo(
    [xStart, frame.zEnd - radius],
    [xStart + inset, frame.zEnd - inset],
  )
  sketcher.lineTo([xStart, frame.zStart + radius])
  sketcher.threePointsArcTo(
    [xStart + radius, frame.zStart],
    [xStart + inset, frame.zStart + inset],
  )
  const sketch = sketcher.close()
  try {
    return sketch.extrude(constants.finWidth, {
      extrusionDirection: [0, 1, 0],
    }) as unknown as Shape3D
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

/**
 * Builds the grip of one side of a holder: the relief cut into the wall and
 * the fin that stands in it. The fin is fused to the wall along the whole
 * grip zone, so the holder stays a single solid.
 */
export function applyGameBoxGrip(
  shape: Shape3D,
  input: GameBoxGripInput,
  side: 1 | -1,
  protrusion: number,
): Shape3D {
  const frame = gameBoxGripFrame(input)
  const relieved = cutGripRelief(shape, input, frame, side)
  return fuseShape(relieved, buildGripFin(input, frame, side, protrusion))
}
