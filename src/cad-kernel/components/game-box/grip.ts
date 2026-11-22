import { makeBox, Sketcher, type Shape3D } from 'replicad'
import { deleteShape } from '../../lifetime/dispose'
import { cutShape, fuseShape } from './shape-ops'

/**
 * Named constants of the grip (mm).
 *
 * The grip is a flap that grows out of each side wall along the whole grip
 * zone: its root is buried in the wall over a short pad that runs the whole
 * height of the grip zone, and its free end stands out of the wall at a
 * shallow angle. A recess behind the flap leaves it free over its whole
 * length, so pressing the holder into the box bends the flap about its root
 * line — inside every print layer, the strong direction of FDM.
 *
 * The flap is sized so the full press stays elastic: a cantilever of
 * thickness `t` and length `L` bent by `δ` carries a peak strain of about
 * `3·δ·t / (2·L²)`. For the full press δ = 0.5 mm (natural outer width
 * `W + 0.4` down to the body width `W − 0.6`), t = 0.4 mm and L = 5 mm it
 * is 1.2 %, below the 2 % elastic limit of PLA/PETG. t = 0.8 mm would need
 * L ≥ 5.5 mm and a recess deeper than the thinnest side wall (1.2 mm) can
 * offer, so the flap stays one extrusion line thick.
 *
 * The 2026-11-19 test print confirmed the fit (natural outer width
 * `W + 0.4`); the flap geometry itself must be confirmed by the owner's
 * test print of this change.
 */
export const GAME_BOX_GRIP = {
  /** Thickness of the flap plate: one 0.4 mm extrusion line. */
  flapThickness: 0.4,
  /** Free length of the flap from its root edge to its tip. */
  flapLength: 5,
  /** Length of the flap root buried in the side wall. */
  rootPad: 1,
  /** Depth of the recess behind the flap, cut into the side wall. */
  recessDepth: 0.8,
  /** Recess length past the flap tip, so the flap can fold in. */
  recessTail: 0.4,
  /** Length of the grip zone along the holder's height. */
  length: 60,
  /** Clearance between the grip zone and the holder edges. */
  endMargin: 4,
  /** How far the flap tip stands proud of the wall in its natural state. */
  protrusion: 0.5,
  /** Radius of the fillet on the flap's inner tip corner. */
  tipRadius: 0.15,
  /** Cutters narrower than this are never built. */
  minCutterWidth: 0.01,
  /** Clearance between the installed holder and the box wall. */
  pressedClearance: 0.2,
} as const

/**
 * The geometry of a grip zone: the flap band, the recess behind it and the
 * height they cover.
 */
export type GameBoxGripFrame = {
  /** y of the flap root edge, where the flap leaves the wall. */
  yStart: number
  /** y of the flap tip. */
  yEnd: number
  /** y where the buried root pad begins. */
  padYStart: number
  /** y of the recess behind the flap. */
  recessYStart: number
  recessYEnd: number
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
 * The grip zone of a side wall: the flap runs in the middle of the holder's
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
  const centre = input.thickness / 2
  const yStart = centre - constants.flapLength / 2
  return {
    yStart,
    yEnd: yStart + constants.flapLength,
    padYStart: yStart - constants.rootPad,
    recessYStart: yStart,
    recessYEnd: yStart + constants.flapLength + constants.recessTail,
    zStart,
    zEnd: zStart + length,
  }
}

/**
 * How far the flap of one side stands proud of the wall: the natural
 * protrusion of the grip, or the pressed one when the holder is built for
 * the assembly.
 */
export function gameBoxGripProtrusion(
  outerWidth: number,
  bodyWidth: number,
): number {
  return (outerWidth - bodyWidth) / 2
}

/** The x range of the recess behind the flap, in the outer face of the wall. */
function recessRange(input: GameBoxGripInput, side: 1 | -1): [number, number] {
  const floor = input.bodyHalfWidth - GAME_BOX_GRIP.recessDepth
  const outer = input.bodyHalfWidth + 0.01
  return side === 1 ? [floor, outer] : [-outer, -floor]
}

/**
 * The recess of one side of the grip: a pocket cut into the outer face of
 * the wall over the whole grip zone, in front of the flap, so the flap is
 * free over its whole length and has room to fold in when pressed. The
 * recess leaves at least 0.4 mm of wall behind it (the wall is never
 * thinner than 1.2 mm) and never reaches the dice well.
 */
function cutGripRecess(
  shape: Shape3D,
  input: GameBoxGripInput,
  frame: GameBoxGripFrame,
  side: 1 | -1,
): Shape3D {
  const [start, end] = recessRange(input, side)
  if (end - start < GAME_BOX_GRIP.minCutterWidth) return shape
  return cutShape(
    shape,
    makeBox(
      [start, frame.recessYStart, frame.zStart],
      [end, frame.recessYEnd, frame.zEnd],
    ) as Shape3D,
  )
}

/** A point of the flap profile in the x–y cross-section. */
type ProfilePoint = { x: number; y: number }

/**
 * The shape of the flap in cross-section, for one side: a plate of
 * `flapThickness` whose outer face rises from the wall face at the root
 * edge to `protrusion` at the tip, and runs `rootPad` into the wall before
 * the root edge, where the pad is buried in solid wall material.
 */
function flapProfile(
  input: GameBoxGripInput,
  frame: GameBoxGripFrame,
  side: 1 | -1,
  protrusion: number,
): ProfilePoint[] {
  const constants = GAME_BOX_GRIP
  const slope = protrusion / constants.flapLength
  const outerX = (y: number): number =>
    input.bodyHalfWidth + slope * (y - frame.yStart)
  const innerX = (y: number): number => outerX(y) - constants.flapThickness
  const points: ProfilePoint[] = [
    { x: outerX(frame.padYStart), y: frame.padYStart },
    { x: outerX(frame.yEnd), y: frame.yEnd },
    { x: innerX(frame.yEnd), y: frame.yEnd },
    { x: innerX(frame.padYStart), y: frame.padYStart },
  ]
  return side === 1
    ? points
    : points.map((point) => ({ ...point, x: -point.x }))
}

/**
 * Fillets one corner of a polygon with a tangent arc that stays inside the
 * material. Only used on the inner corner of the flap tip, never at the
 * root, so no corner is undercut away from its material; the outer tip
 * corner stays sharp because it is what sets the confirmed outer width.
 */
function filletCorner(
  sketcher: Sketcher,
  before: ProfilePoint,
  corner: ProfilePoint,
  after: ProfilePoint,
  radius: number,
): void {
  const toCorner = normalize(corner.x - before.x, corner.y - before.y)
  const fromCorner = normalize(after.x - corner.x, after.y - corner.y)
  // The interior angle θ sits between −toCorner and fromCorner.
  const cosθ = -toCorner.x * fromCorner.x - toCorner.y * fromCorner.y
  const cosHalf = Math.sqrt((1 + cosθ) / 2)
  const sinHalf = Math.sqrt(1 - cosHalf * cosHalf)
  const tangent = Math.min(
    (radius * sinHalf) / cosHalf,
    0.4 * Math.hypot(corner.x - before.x, corner.y - before.y),
    0.4 * Math.hypot(after.x - corner.x, after.y - corner.y),
  )
  const inward = normalize(fromCorner.x - toCorner.x, fromCorner.y - toCorner.y)
  const start = {
    x: corner.x - tangent * toCorner.x,
    y: corner.y - tangent * toCorner.y,
  }
  const end = {
    x: corner.x + tangent * fromCorner.x,
    y: corner.y + tangent * fromCorner.y,
  }
  const mid = {
    x: corner.x + (radius / sinHalf - radius) * inward.x,
    y: corner.y + (radius / sinHalf - radius) * inward.y,
  }
  sketcher.lineTo([start.x, start.y])
  sketcher.threePointsArcTo([end.x, end.y], [mid.x, mid.y])
}

function normalize(x: number, y: number): ProfilePoint {
  const length = Math.hypot(x, y)
  return { x: x / length, y: y / length }
}

/**
 * The flap of one side of the grip: a thin plate whose profile is drawn in
 * the x–y cross-section and extruded over the whole grip zone, so its join
 * to the wall (the root pad) runs the full height. The outer tip corner
 * stays sharp; the inner one is filleted.
 */
function buildGripFlap(
  input: GameBoxGripInput,
  frame: GameBoxGripFrame,
  side: 1 | -1,
  protrusion: number,
): Shape3D {
  const constants = GAME_BOX_GRIP
  const [a, b, c, d] = flapProfile(input, frame, side, protrusion)
  const radius = Math.min(
    constants.tipRadius,
    constants.flapThickness / 2.5,
    (frame.zEnd - frame.zStart) / 4,
  )
  const sketcher = new Sketcher('XY', [0, 0, frame.zStart])
  sketcher.movePointerTo([a.x, a.y])
  sketcher.lineTo([b.x, b.y])
  filletCorner(sketcher, b, c, d, radius)
  sketcher.lineTo([d.x, d.y])
  const sketch = sketcher.close()
  try {
    return sketch.extrude(frame.zEnd - frame.zStart) as unknown as Shape3D
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

/**
 * Builds the grip of one side of a holder: the recess cut into the wall and
 * the flap that grows out of it. The flap is joined to the wall along the
 * whole grip zone through its buried root pad, so the holder stays a single
 * solid and no horizontal slice carries a grip element of its own.
 */
export function applyGameBoxGrip(
  shape: Shape3D,
  input: GameBoxGripInput,
  side: 1 | -1,
  protrusion: number,
): Shape3D {
  const frame = gameBoxGripFrame(input)
  const relieved = cutGripRecess(shape, input, frame, side)
  return fuseShape(relieved, buildGripFlap(input, frame, side, protrusion))
}
