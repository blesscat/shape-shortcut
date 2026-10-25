import { makeBox, Sketcher, type Shape3D } from 'replicad'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
  type CardBoxParameters,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'

/**
 * Fixed feature dimensions of the original FreeCAD lid design that do not
 * scale with the card size (mm). Values measured from the reference BREP;
 * see openspec/changes/card-box/design.md decision D4.
 */
const LID_DESIGN = {
  /** Lid rides 0.2 above the box outer step: skirt bottom at H−7.8. */
  bottomAllowance: 7.8,
  /** Plate underside at H+7.2, top at H+9 (1.8 thick). */
  plateInnerAllowance: 7.2,
  plateTopAllowance: 9,
  /** Skirt inner face sits 0.2 outside the upper side walls (W/2+1.2). */
  skirtInnerAllowance: 1.2,
  /** Rail groove: the box V rail (z H−5 .. H−1 at the wall, 45° flanks)
   * offset by the 0.2 clearance, so the flanks sit 0.2·√2 below the rail
   * flanks (z H−5.0828 .. H−0.9172 at the skirt inner face), 1 mm deep. */
  grooveBaseAllowance: 5 - 0.2 + 0.2 * Math.SQRT2,
  grooveTopAllowance: 1 + 0.2 - 0.2 * Math.SQRT2,
  grooveDepth: 1.0,
  /** The groove is closed at the front: it starts 1.65 behind the front
   * face (the flange thickness plus 0.05). */
  grooveFrontClosure: 1.65,
  /** Detent recesses: flat, 1 mm deep, z H−0.71 .. H+1.6, 0.1 clearance
   * around each 2 mm bump. */
  recessBottomAllowance: 0.71,
  recessTopAllowance: 1.6,
  recessClearance: 0.1,
  /** Front flange: 1.6 thick from the skirt bottom (the strips reach the
   * bed; the W−10 notch keeps the middle open below H−3); the deep part
   * (3.45) starts at H+2.2, above the box front wall top. */
  flangeThickness: 1.6,
  flangeDeepThickness: 3.45,
  flangeDeepBottomAllowance: 2.2,
  notchTopAllowance: 3,
  notchInset: 5,
  /** Back pocket for the box bead: 0.4 deep, W wide, y (yB−2)..(yB−1). */
  pocketDepth: 0.4,
  pocketInnerOffset: 2,
  pocketOuterOffset: 1,
  topRoundRadius: 1,
} as const

interface LidFrame {
  w: number
  h: number
  halfOuterX: number
  yFront: number
  yBack: number
  zBottom: number
  plateInner: number
  plateTop: number
  skirtInnerX: number
}

function lidFrame(parameters: CardBoxParameters): LidFrame {
  const t = CARD_BOX_CONFIGURATION.wallThickness
  const w = cardBoxInteriorWidth(parameters.cardWidth)
  const h = parameters.cardHeight
  const d = parameters.storageDepth
  const halfSketchY = (d + 2 * t - 1.8) / 2
  return {
    w,
    h,
    halfOuterX: w / 2 + t,
    yFront: -(halfSketchY + 1.85),
    yBack: halfSketchY - 0.05,
    zBottom: h - LID_DESIGN.bottomAllowance,
    plateInner: h + LID_DESIGN.plateInnerAllowance,
    plateTop: h + LID_DESIGN.plateTopAllowance,
    skirtInnerX: w / 2 + LID_DESIGN.skirtInnerAllowance,
  }
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

function buildPlateAndSkirts(frame: LidFrame): Shape3D {
  // Top plate with the two side skirts fused through a real volume overlap
  // (the skirts reach 0.5 mm into the plate region).
  let shape = makeBox(
    [-frame.halfOuterX, frame.yFront, frame.plateInner],
    [frame.halfOuterX, frame.yBack, frame.plateTop],
  ) as Shape3D
  shape = fuseShape(
    shape,
    makeBox(
      [frame.skirtInnerX, frame.yFront, frame.zBottom],
      [frame.halfOuterX, frame.yBack, frame.plateInner + 0.5],
    ) as Shape3D,
  )
  shape = fuseShape(
    shape,
    makeBox(
      [-frame.halfOuterX, frame.yFront, frame.zBottom],
      [-frame.skirtInnerX, frame.yBack, frame.plateInner + 0.5],
    ) as Shape3D,
  )
  return shape
}

function extrudeProfileAlongY(
  profile: readonly (readonly [number, number])[],
  yStart: number,
  distance: number,
): Shape3D {
  const sketcher = new Sketcher('XZ', [0, yStart, 0])
  const first = profile[0]!
  sketcher.movePointerTo([first[0], first[1]])
  for (const point of profile.slice(1)) sketcher.lineTo([point[0], point[1]])
  const sketch = sketcher.close()
  try {
    return sketch.extrude(distance, {
      extrusionDirection: [0, 1, 0],
    }) as unknown as Shape3D
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function cutRailGrooves(shape: Shape3D, frame: LidFrame): Shape3D {
  // Trapezoid groove around the box V rail with 0.2 x-clearance; the
  // cutter is extended 0.05 past the skirt inner face along the 45° flanks.
  const baseZ = frame.h - LID_DESIGN.grooveBaseAllowance
  const topZ = frame.h - LID_DESIGN.grooveTopAllowance
  const innerX = frame.skirtInnerX
  const outerX = innerX + LID_DESIGN.grooveDepth
  const yStart = frame.yFront + LID_DESIGN.grooveFrontClosure
  const yLength = frame.yBack - yStart
  for (const side of [1, -1] as const) {
    const profile: [number, number][] = [
      [side * (innerX - 0.05), baseZ - 0.05],
      [side * outerX, baseZ + LID_DESIGN.grooveDepth],
      [side * outerX, topZ - LID_DESIGN.grooveDepth],
      [side * (innerX - 0.05), topZ + 0.05],
    ]
    shape = cutShape(shape, extrudeProfileAlongY(profile, yStart, yLength + 1))
  }
  return shape
}

function detentCenters(storageDepth: number): number[] {
  const span = storageDepth - 5
  const centers: number[] = []
  for (let index = 0; index < 4; index += 1) {
    centers.push(-storageDepth / 2 + 3.9 + (index * span) / 3)
  }
  return centers
}

function cutDetentRecesses(
  shape: Shape3D,
  frame: LidFrame,
  storageDepth: number,
): Shape3D {
  // Flat recesses in the groove band: 1 mm deep, z H−0.71 .. H+1.6,
  // 2.2 wide (2 mm bump + 0.1 clearance per side).
  const bottom = frame.h - LID_DESIGN.recessBottomAllowance
  const top = frame.h + LID_DESIGN.recessTopAllowance
  const halfWidth = 1 + LID_DESIGN.recessClearance
  let result = shape
  for (const center of detentCenters(storageDepth)) {
    for (const side of [1, -1] as const) {
      result = cutShape(
        result,
        makeBox(
          [side * (frame.skirtInnerX - 0.01), center - halfWidth, bottom],
          [
            side * (frame.skirtInnerX + LID_DESIGN.grooveDepth),
            center + halfWidth,
            top,
          ],
        ) as Shape3D,
      )
    }
  }
  return result
}

function addFrontFlange(shape: Shape3D, frame: LidFrame): Shape3D {
  // Front flange wrapped around the lip and cover channel: 1.6 thick. The
  // side strips (|x| ≥ W/2−5, mirroring the box stubs) run from the skirt
  // bottom; the middle stays open below H−3 (the W−10 notch, built in).
  // Above H+2.2 — clear of the box front wall — the flange deepens to
  // 3.45 across the full width up to the plate underside.
  const deepBottom = frame.h + LID_DESIGN.flangeDeepBottomAllowance
  const stripInner = frame.w / 2 - LID_DESIGN.notchInset
  const stripOuter = frame.halfOuterX
  const notchHalfWidth = stripInner
  let result = shape
  for (const side of [1, -1] as const) {
    result = fuseShape(
      result,
      makeBox(
        [side * stripInner, frame.yFront, frame.zBottom],
        [
          side * stripOuter,
          frame.yFront + LID_DESIGN.flangeThickness,
          deepBottom,
        ],
      ) as Shape3D,
    )
  }
  result = fuseShape(
    result,
    makeBox(
      [-notchHalfWidth, frame.yFront, frame.h - LID_DESIGN.notchTopAllowance],
      [notchHalfWidth, frame.yFront + LID_DESIGN.flangeThickness, deepBottom],
    ) as Shape3D,
  )
  result = fuseShape(
    result,
    makeBox(
      [-frame.halfOuterX, frame.yFront, deepBottom],
      [
        frame.halfOuterX,
        frame.yFront + LID_DESIGN.flangeDeepThickness,
        frame.plateInner + 0.5,
      ],
    ) as Shape3D,
  )
  return result
}

function cutBackPocket(shape: Shape3D, frame: LidFrame): Shape3D {
  // Pocket in the plate underside for the box back bead: 0.4 deep, W wide,
  // y (yB−2)..(yB−1) where yB is the box back face. The reference pocket is
  // 0.595 narrower per side than the bead, which makes the reference lid
  // clip the bead by 0.13 mm³; this pocket clears it instead.
  const boxBackY = frame.yBack + 0.05
  return cutShape(
    shape,
    makeBox(
      [
        -frame.w / 2,
        boxBackY - LID_DESIGN.pocketInnerOffset,
        frame.plateInner - 0.01,
      ],
      [
        frame.w / 2,
        boxBackY - LID_DESIGN.pocketOuterOffset,
        frame.plateInner + LID_DESIGN.pocketDepth,
      ],
    ) as Shape3D,
  )
}

function roundPlateTop(shape: Shape3D, frame: LidFrame): Shape3D {
  // 1 mm round on the plate's top front and side edges (the back edge stays
  // sharp, as in the reference), selected by points on the edges (OCCT edge
  // bounding boxes overshoot).
  const midY = (frame.yFront + frame.yBack) / 2
  const points: Array<[number, number, number]> = [
    [0, frame.yFront, frame.plateTop],
    [frame.halfOuterX, midY, frame.plateTop],
    [-frame.halfOuterX, midY, frame.plateTop],
  ]
  let result = shape
  for (const point of points) {
    const next = result.fillet(LID_DESIGN.topRoundRadius, (finder) =>
      finder.withinDistance(0.3, [point[0], point[1], point[2]]),
    )
    if (next !== result) deleteShape(result)
    result = next
  }
  return result
}

/**
 * Builds the lid in the assembled frame (slid onto the rails), matching the
 * reference coordinates: bbox z from H−7.8 to H+9 at defaults. The print
 * orientation (flipped, flat top on the bed) is applied by the builder.
 */
export function buildCardBoxLid(parameters: CardBoxParameters): Shape3D {
  return lidStageBuild(parameters)
}

export function lidStageBuild(
  parameters: CardBoxParameters,
  stage?: (name: string) => void,
): Shape3D {
  const frame = lidFrame(parameters)
  let shape = buildPlateAndSkirts(frame)
  stage?.('plate+skirts')
  try {
    shape = addFrontFlange(shape, frame)
    stage?.('flange')
    shape = cutRailGrooves(shape, frame)
    stage?.('grooves')
    shape = cutDetentRecesses(shape, frame, parameters.storageDepth)
    stage?.('recesses')
    shape = cutBackPocket(shape, frame)
    stage?.('pocket')
    shape = roundPlateTop(shape, frame)
    stage?.('round')
    return shape
  } catch (error) {
    deleteShape(shape)
    throw error
  }
}
