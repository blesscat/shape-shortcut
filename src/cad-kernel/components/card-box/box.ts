import {
  makeBox,
  makeCompound,
  Sketcher,
  type Edge,
  type Shape3D,
} from 'replicad'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
  type CardBoxParameters,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'

/**
 * Fixed feature dimensions of the original FreeCAD design that do not scale
 * with the card size (mm). Values measured from the reference BREP; see
 * openspec/changes/card-box/design.md decision D3.
 */
/** Front channel slot depth (the 0.85 mm gap the cover slides into). */
export const CARD_BOX_CHANNEL_SLOT_DEPTH = 0.85

const BOX_DESIGN = {
  /** Base sketch depth is D + 2t − 1.8 (the front channel allowance). */
  sketchDepthAllowance: 1.8,
  /** Front wall remnant behind the label channel (t − 1.8). */
  frontWallThickness: 1.2,
  /** Front lip slab extends 1.85 beyond the sketch front face. */
  lipExtension: 1.85,
  lipStubThickness: 1.0,
  lipHeight: 7,
  /** Side stubs inner edge inset from the cavity wall. */
  stubInset: 5,
  /** Side stubs end at H − 8; the outer step sits at the same height. */
  stubTopAllowance: 8,
  /** Back wall extension above the pad top, plus the 0.4 × 0.8 bead. */
  backExtension: 5,
  beadHeight: 0.4,
  beadDepth: 0.8,
  beadOuterOffset: 1.1,
  /** Side walls above the step keep 1 mm thickness. */
  upperWallThickness: 1.0,
  /** Sliding-lid V rail on the upper side wall (z = H−5 .. H−1). */
  railBaseAllowance: 5,
  railTopAllowance: 1,
  railProtrusion: 1.0,
  /** Detent bumps on the rail face (z = H−0.6 .. H+1.5). */
  detentBottomAllowance: 0.6,
  detentTopAllowance: 1.5,
  detentProtrusion: 0.9,
  detentWidth: 2.0,
  detentChamfer: 0.4,
  detentFirstCenterOffset: 3.9,
  detentCount: 4,
  filletRadius: 1,
} as const

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

interface BoxFrame {
  w: number
  h: number
  d: number
  halfOuterX: number
  halfSketchY: number
  padTop: number
  cavityFrontY: number
  cavityBackY: number
  lipOuterY: number
  lipInnerY: number
  lipHeight: number
  stubTop: number
  backTop: number
}

function boxFrame(parameters: CardBoxParameters): BoxFrame {
  const t = CARD_BOX_CONFIGURATION.wallThickness
  const w = cardBoxInteriorWidth(parameters.cardWidth)
  const h = parameters.cardHeight
  const d = parameters.storageDepth
  const halfSketchY = (d + 2 * t - BOX_DESIGN.sketchDepthAllowance) / 2
  return {
    w,
    h,
    d,
    halfOuterX: w / 2 + t,
    halfSketchY,
    padTop: h + 2,
    cavityFrontY: -(halfSketchY - BOX_DESIGN.frontWallThickness),
    cavityBackY: halfSketchY - t,
    lipOuterY: -(halfSketchY + BOX_DESIGN.lipExtension),
    lipInnerY: -(halfSketchY + CARD_BOX_CHANNEL_SLOT_DEPTH),
    lipHeight: BOX_DESIGN.lipHeight,
    stubTop: h - BOX_DESIGN.stubTopAllowance,
    backTop: h + 2 + BOX_DESIGN.backExtension,
  }
}

function buildShelledPad(frame: BoxFrame): Shape3D {
  // Outer pad with the interior cavity cut from the floor top surface up,
  // leaving the constant 2 mm floor.
  let shape = makeBox(
    [-frame.halfOuterX, -frame.halfSketchY, 0],
    [frame.halfOuterX, frame.halfSketchY, frame.padTop],
  ) as Shape3D
  shape = cutShape(
    shape,
    makeBox(
      [-frame.w / 2, frame.cavityFrontY, CARD_BOX_CONFIGURATION.floorThickness],
      [frame.w / 2, frame.cavityBackY, frame.padTop + 1],
    ) as Shape3D,
  )
  return shape
}

function addFrontFeatures(shape: Shape3D, frame: BoxFrame): Shape3D {
  // The cover channel is the open gap between the side walls: the walls
  // continue through the lip's y span (floor top upward) and only the
  // interior width stays open. Slabs overlap the floor core and the stubs
  // so every fuse has a real volume overlap.
  let result = shape
  for (const side of [1, -1] as const) {
    result = fuseShape(
      result,
      makeBox(
        [side * (frame.w / 2), frame.lipInnerY - 0.05, 1.95],
        [side * frame.halfOuterX, -frame.halfSketchY + 0.05, frame.stubTop],
      ) as Shape3D,
    )
  }
  // Front lip fused in two steps so every fuse has a real volume overlap
  // (face-contact fuses stay separate solids in OCCT): first a core slab
  // sunk into the solid floor strip (z stays below the slot), then the
  // visible lip, then the side stubs overlapping the lip.
  result = fuseShape(
    result,
    makeBox(
      [-frame.halfOuterX, frame.lipOuterY, 0],
      [
        frame.halfOuterX,
        -frame.halfSketchY + 0.05,
        CARD_BOX_CONFIGURATION.floorThickness,
      ],
    ) as Shape3D,
  )
  result = fuseShape(
    result,
    makeBox(
      [-frame.halfOuterX, frame.lipOuterY, 0],
      [frame.halfOuterX, frame.lipInnerY, frame.lipHeight],
    ) as Shape3D,
  )
  const stubInnerX = frame.w / 2 - BOX_DESIGN.stubInset
  result = fuseShape(
    result,
    makeBox(
      [-frame.halfOuterX, frame.lipOuterY, 0],
      [-stubInnerX, frame.lipInnerY, frame.stubTop],
    ) as Shape3D,
  )
  result = fuseShape(
    result,
    makeBox(
      [stubInnerX, frame.lipOuterY, 0],
      [frame.halfOuterX, frame.lipInnerY, frame.stubTop],
    ) as Shape3D,
  )
  return result
}

function addBackFeatures(shape: Shape3D, frame: BoxFrame): Shape3D {
  // Back wall extension to H+7 (width W+2, matching the upper walls' outer
  // faces) plus the 0.4 mm bead (width W−0.4).
  const upperOuterX = frame.w / 2 + BOX_DESIGN.upperWallThickness
  let result = fuseShape(
    shape,
    makeBox(
      [-upperOuterX, frame.cavityBackY, frame.padTop],
      [upperOuterX, frame.halfSketchY, frame.backTop],
    ) as Shape3D,
  )
  const beadHalfWidth = (frame.w - CARD_BOX_CONFIGURATION.clearance * 2) / 2
  result = fuseShape(
    result,
    makeBox(
      [-beadHalfWidth, frame.halfSketchY - 1.9, frame.backTop],
      [
        beadHalfWidth,
        frame.halfSketchY - BOX_DESIGN.beadOuterOffset,
        frame.backTop + BOX_DESIGN.beadHeight,
      ],
    ) as Shape3D,
  )
  return result
}

function applyOuterStep(shape: Shape3D, frame: BoxFrame): Shape3D {
  // Above H−8 everything outside the upper walls' outer faces (±(W/2+1))
  // is cut across the full depth; the back wall extension respects the
  // same width.
  const upperOuterX = frame.w / 2 + BOX_DESIGN.upperWallThickness
  let result = cutShape(
    shape,
    makeBox(
      [upperOuterX, -frame.halfSketchY - 2, frame.stubTop],
      [frame.halfOuterX + 1, frame.halfSketchY + 1, frame.padTop + 1],
    ) as Shape3D,
  )
  result = cutShape(
    result,
    makeBox(
      [-frame.halfOuterX - 1, -frame.halfSketchY - 2, frame.stubTop],
      [-upperOuterX, frame.halfSketchY + 1, frame.padTop + 1],
    ) as Shape3D,
  )
  return result
}

function extrudeProfileAlongY(
  profile: readonly (readonly [number, number])[],
  yStart: number,
  distance: number,
): Shape3D {
  // Profile drawn in the XZ plane (world x, world z), extruded toward +Y.
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

function addLidRails(shape: Shape3D, frame: BoxFrame): Shape3D {
  // Trapezoid rail on the outer face of each upper side wall: base
  // H−5..H−1, flat face H−4..H−2, 45° flanks, running the full depth.
  const innerX = frame.w / 2 + BOX_DESIGN.upperWallThickness
  const outerX = innerX + BOX_DESIGN.railProtrusion
  const baseZ = frame.h - BOX_DESIGN.railBaseAllowance
  const topZ = frame.h - BOX_DESIGN.railTopAllowance
  const rightProfile: [number, number][] = [
    [innerX, baseZ],
    [outerX, baseZ + BOX_DESIGN.railProtrusion],
    [outerX, topZ - BOX_DESIGN.railProtrusion],
    [innerX, topZ],
  ]
  const leftProfile: [number, number][] = rightProfile.map(([x, z]) => [-x, z])
  let result = fuseShape(
    shape,
    extrudeProfileAlongY(
      rightProfile,
      -frame.halfSketchY,
      2 * frame.halfSketchY,
    ),
  )
  result = fuseShape(
    result,
    extrudeProfileAlongY(
      leftProfile,
      -frame.halfSketchY,
      2 * frame.halfSketchY,
    ),
  )
  return result
}

function extrudeProfileAlongZ(
  profile: readonly (readonly [number, number])[],
  zStart: number,
  distance: number,
): Shape3D {
  // Profile drawn in the XY plane (world x, world y), extruded toward +Z.
  const sketcher = new Sketcher('XY', [0, 0, zStart])
  const first = profile[0]!
  sketcher.movePointerTo([first[0], first[1]])
  for (const point of profile.slice(1)) sketcher.lineTo([point[0], point[1]])
  const sketch = sketcher.close()
  try {
    return sketch.extrude(distance) as unknown as Shape3D
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function addDetents(shape: Shape3D, frame: BoxFrame): Shape3D {
  // Detent bumps on the rail face: four per side spaced over D−5, mirrored,
  // with a 0.4 chamfer on the outer face's front (−Y) end edge.
  const span = frame.d - 5
  const innerX = frame.w / 2 + BOX_DESIGN.upperWallThickness
  const outerX = innerX + BOX_DESIGN.detentProtrusion
  const bottom = frame.h - BOX_DESIGN.detentBottomAllowance
  const height = frame.h + BOX_DESIGN.detentTopAllowance - bottom
  const chamfer = BOX_DESIGN.detentChamfer
  const halfWidth = BOX_DESIGN.detentWidth / 2
  let result = shape
  for (let index = 0; index < BOX_DESIGN.detentCount; index += 1) {
    const center =
      -frame.d / 2 +
      BOX_DESIGN.detentFirstCenterOffset +
      (index * span) / (BOX_DESIGN.detentCount - 1)
    const rightProfile: [number, number][] = [
      [innerX, center - halfWidth],
      [outerX - chamfer, center - halfWidth],
      [outerX, center - halfWidth + chamfer],
      [outerX, center + halfWidth],
      [innerX, center + halfWidth],
    ]
    const leftProfile: [number, number][] = rightProfile.map(([x, y]) => [
      -x,
      y,
    ])
    result = fuseShape(
      result,
      extrudeProfileAlongZ(rightProfile, bottom, height),
    )
    result = fuseShape(
      result,
      extrudeProfileAlongZ(leftProfile, bottom, height),
    )
  }
  return result
}

function filletBoxEdges(shape: Shape3D, frame: BoxFrame): Shape3D {
  // 1 mm fillets on the outer bottom perimeter and the four outer vertical
  // corners, in one operation so the corner blends meet cleanly. Edges are
  // selected by a point known to lie on them; OCCT edge bounding boxes
  // overshoot and cannot be used for selection. Divider slots are cut
  // afterwards so they never interact with the fillet geometry.
  const x = frame.halfOuterX
  const midZ = 50
  const points: [number, number, number][] = [
    [0, frame.lipOuterY, 0],
    [0, frame.halfSketchY, 0],
    [x, 0, 0],
    [-x, 0, 0],
    [x, frame.lipOuterY, midZ],
    [-x, frame.lipOuterY, midZ],
    [x, frame.halfSketchY, midZ],
    [-x, frame.halfSketchY, midZ],
  ]
  return shape.fillet(BOX_DESIGN.filletRadius, (finder) =>
    finder.either(
      points.map((point) => (edge) => edge.withinDistance(0.3, point)),
    ),
  )
}

function addDividerSlots(shape: Shape3D, frame: BoxFrame): Shape3D {
  // 1 mm grooves, every 3 mm at y = ±k·pitch for k = 0..floor(D/2/3)−1
  // (y = 0 is shared, so 2·floor(D/2/3)−1 positions along both halves);
  // 0.25 mm deep into each side wall. Cutters start at the floor
  // TOP surface (z = 2) so the floor stays intact.
  const floor = CARD_BOX_CONFIGURATION.floorThickness
  const pitch = CARD_BOX_CONFIGURATION.dividerSlotPitch
  const halfWidth = CARD_BOX_CONFIGURATION.dividerSlotWidth / 2
  const slotCount = Math.floor(frame.d / 2 / pitch)
  const cutters: Shape3D[] = []
  for (let index = 0; index < slotCount; index += 1) {
    const offsets = index === 0 ? [0] : [index * pitch, -index * pitch]
    for (const y of offsets) {
      for (const side of [1, -1] as const) {
        cutters.push(
          makeBox(
            [side * (frame.w / 2 - 0.01), y - halfWidth, floor],
            [
              side * (frame.w / 2 + CARD_BOX_CONFIGURATION.dividerSlotDepth),
              y + halfWidth,
              frame.padTop + 1,
            ],
          ) as Shape3D,
        )
      }
    }
  }
  // One boolean for all (disjoint) grooves: far cheaper than a cut per slot.
  const compound = makeCompound(cutters).asShape3D()
  for (const cutter of cutters) deleteShape(cutter)
  return cutShape(shape, compound)
}

/**
 * Builds the box part. The box's print orientation (opening up on the bed)
 * is identical to its assembled frame, so no orientation transform applies.
 */
export function buildCardBoxBox(parameters: CardBoxParameters): Shape3D {
  const frame = boxFrame(parameters)
  let shape = buildShelledPad(frame)
  try {
    shape = addFrontFeatures(shape, frame)
    shape = addBackFeatures(shape, frame)
    shape = applyOuterStep(shape, frame)
    shape = addLidRails(shape, frame)
    shape = addDetents(shape, frame)
    shape = filletBoxEdges(shape, frame)
    shape = addDividerSlots(shape, frame)
    return shape
  } catch (error) {
    deleteShape(shape)
    throw error
  }
}
