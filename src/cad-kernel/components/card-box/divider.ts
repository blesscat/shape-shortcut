import {
  BlueprintSketcher,
  deserializeShape,
  type Blueprint,
  type Shape3D,
} from 'replicad'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
  type CardBoxParameters,
  type CardBoxTabPosition,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'
import { makeCardBoxTextShape } from './text'

/** A part either has no art (`single`) or a separate accent art solid. */
export type CardBoxArtPartBuild =
  | { kind: 'single'; shape: Shape3D }
  | { kind: 'accent'; body: Shape3D; accent: Shape3D }

const PLATE_EDGE_CLEARANCE =
  CARD_BOX_CONFIGURATION.dividerSlotWidth -
  CARD_BOX_CONFIGURATION.dividerPlateThickness
const TAB_EDGE_MARGIN = 2
const TAB_TOP_FILLET_RADIUS = 3
const TAB_BOTTOM_FILLET_RADIUS = 2.5
const DRAFT_DEGREES = (20 * Math.PI) / 180
const DRAFT_RISE = CARD_BOX_CONFIGURATION.accentDepth

function cloneShape(shape: Shape3D): Shape3D {
  return deserializeShape(shape.serialize()).asShape3D()
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

/**
 * Plate outline in the XY plane with rounded corners: `TAB_BOTTOM_FILLET_RADIUS`
 * at the card end, `TAB_TOP_FILLET_RADIUS` at the tab end. The outline spans
 * (0, 0)–(width, height) and is centered on X by the caller.
 */
function plateBlueprint(width: number, height: number): Blueprint {
  const bottom = TAB_BOTTOM_FILLET_RADIUS
  const top = TAB_TOP_FILLET_RADIUS
  const sketcher = new BlueprintSketcher([bottom, 0])
  sketcher.lineTo([width - bottom, 0])
  sketcher.tangentArcTo([width, bottom])
  sketcher.lineTo([width, height - top])
  sketcher.tangentArcTo([width - top, height])
  sketcher.lineTo([top, height])
  sketcher.tangentArcTo([0, height - top])
  sketcher.lineTo([0, bottom])
  sketcher.tangentArcTo([bottom, 0])
  return sketcher.close()
}

/** Tab center X on a plate centered on the origin. */
function tabCenterX(
  position: CardBoxTabPosition,
  plateWidth: number,
  tabWidth: number,
): number {
  const offset = plateWidth / 2 - tabWidth / 2 - TAB_EDGE_MARGIN
  if (position === 'left') return -offset
  if (position === 'right') return offset
  return 0
}

/**
 * Wedge ridge along the outer tab edge: the −20° draft lifts the top edge
 * `accentDepth` above the plate top over a `run` long strip, matching the
 * reference BREP bounding box (thickness 0.85 → 1.25).
 */
function draftWedge(
  tabWidth: number,
  topY: number,
  baseThickness: number,
): Shape3D {
  const run = DRAFT_RISE / Math.tan(DRAFT_DEGREES)
  const sketcher = new BlueprintSketcher([topY - run, baseThickness])
  sketcher.lineTo([topY, baseThickness])
  sketcher.lineTo([topY, baseThickness + DRAFT_RISE])
  const blueprint = sketcher.close()
  try {
    const sketch = blueprint.sketchOnPlane('YZ')
    try {
      const solid = sketch.extrude(tabWidth) as Shape3D
      return solid.translate(-tabWidth / 2, 0, 0)
    } finally {
      deleteShape(sketch)
    }
  } finally {
    deleteShape(blueprint)
  }
}

/**
 * Builds the divider plate: 0.85 mm thick (fits the 1 mm slot),
 * `cardHeight + 5` tall, with the ~30 mm tab (left|center|right) carrying the
 * drafted top edge. Optional text sits centered on the tab face; overflow
 * throws `CARD_BOX_DIVIDER_TEXT_TOO_WIDE`. `raised` puts text 0.4 mm proud of
 * the plate top, `flat` cuts a matching recess and returns text as accent.
 */
export async function buildCardBoxDivider(
  parameters: CardBoxParameters,
): Promise<CardBoxArtPartBuild> {
  const width =
    cardBoxInteriorWidth(parameters.cardWidth) - PLATE_EDGE_CLEARANCE
  const height = parameters.cardHeight + CARD_BOX_CONFIGURATION.hiddenLipWidth
  const thickness = CARD_BOX_CONFIGURATION.dividerPlateThickness
  const depth = CARD_BOX_CONFIGURATION.accentDepth
  const tabWidth = CARD_BOX_CONFIGURATION.dividerTabWidth
  const tabX = tabCenterX(parameters.dividerTabPosition, width, tabWidth)

  const blueprint = plateBlueprint(width, height)
  let body: Shape3D | null = null
  let wedge: Shape3D | null = null
  let textShape: Shape3D | null = null
  try {
    const sketch = blueprint.sketchOnPlane('XY', [-width / 2, 0, 0])
    try {
      body = sketch.extrude(thickness) as Shape3D
    } finally {
      deleteShape(sketch)
    }
    wedge = draftWedge(tabWidth, height, thickness)
    const fused = body.fuse(wedge)
    if (fused !== body) deleteShape(body)
    deleteShape(wedge)
    wedge = null
    body = fused

    textShape = await makeCardBoxTextShape(parameters.dividerText, {
      textHeight: CARD_BOX_CONFIGURATION.dividerTextHeight,
      maxWidth: tabWidth - 2 * TAB_EDGE_MARGIN,
      depth,
    })
    if (!textShape) {
      const single = body
      body = null
      return { kind: 'single', shape: single }
    }

    const raised = parameters.dividerStyle === 'raised'
    const textY = height - CARD_BOX_CONFIGURATION.hiddenLipWidth / 2
    const accent = raised
      ? textShape.translate(tabX, textY, thickness)
      : textShape.translate(tabX, textY, thickness - depth)
    textShape = null
    if (!raised) {
      const recessCutter = cloneShape(accent)
      body = cutShape(body, recessCutter)
    }
    const finalBody = body
    body = null
    return { kind: 'accent', body: finalBody, accent }
  } catch (error) {
    deleteShape(body)
    deleteShape(wedge)
    deleteShape(textShape)
    throw error
  } finally {
    deleteShape(blueprint)
  }
}
