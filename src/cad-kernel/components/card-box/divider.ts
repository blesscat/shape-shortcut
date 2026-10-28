import {
  BlueprintSketcher,
  deserializeShape,
  type Blueprint,
  type Shape3D,
} from 'replicad'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxDividerWidth,
  type CardBoxParameters,
  type CardBoxTabPosition,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'
import { makeCardBoxTextShape } from './text'

/** A part either has no art (`single`) or a separate accent art solid. */
export type CardBoxArtPartBuild =
  | { kind: 'single'; shape: Shape3D }
  | { kind: 'accent'; body: Shape3D; accent: Shape3D }

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

type OutlineCorner = { x: number; y: number; radius: number }

/**
 * Closed outline with every corner rounded by its radius: straight lines
 * joined by tangent arcs. Corners must run counter-clockwise.
 */
function roundedOutline(corners: readonly OutlineCorner[]): Blueprint {
  const tangentPoints = corners.map((corner, index) => {
    const before = corners[(index + corners.length - 1) % corners.length]!
    const after = corners[(index + 1) % corners.length]!
    const toward = (target: OutlineCorner): [number, number] => {
      const dx = target.x - corner.x
      const dy = target.y - corner.y
      const length = Math.hypot(dx, dy)
      return [dx / length, dy / length]
    }
    const [bx, by] = toward(before)
    const [ax, ay] = toward(after)
    const angle = Math.acos(bx * ax + by * ay)
    const distance = corner.radius / Math.tan(angle / 2)
    return {
      enter: [corner.x + bx * distance, corner.y + by * distance] as [
        number,
        number,
      ],
      leave: [corner.x + ax * distance, corner.y + ay * distance] as [
        number,
        number,
      ],
    }
  })
  const sketcher = new BlueprintSketcher(tangentPoints[0]!.leave)
  for (const point of [...tangentPoints.slice(1), tangentPoints[0]!]) {
    sketcher.lineTo(point.enter)
    sketcher.tangentArcTo(point.leave)
  }
  return sketcher.close()
}

/**
 * Plate outline in the XY plane spanning x 0..width, y 0..bodyHeight plus the
 * tab. The tab narrows upward: its flanks lean `dividerTabDraftDegrees` from
 * vertical, so the tab top is `tabHeight * tan(draft)` narrower per flank than
 * its base on the body top line.
 */
function plateOutline(
  position: CardBoxTabPosition,
  width: number,
  bodyHeight: number,
): Blueprint {
  const c = CARD_BOX_CONFIGURATION
  const tabTop = bodyHeight + c.dividerTabHeight
  const lean =
    c.dividerTabHeight * Math.tan((c.dividerTabDraftDegrees * Math.PI) / 180)
  const corner = c.dividerCornerFilletRadius
  const flank = c.dividerFlankFilletRadius
  const base = c.dividerTabBaseWidth
  let corners: OutlineCorner[]
  if (position === 'center') {
    const left = width / 2 - base / 2
    const right = width / 2 + base / 2
    corners = [
      { x: 0, y: 0, radius: corner },
      { x: width, y: 0, radius: corner },
      { x: width, y: bodyHeight, radius: corner },
      { x: right, y: bodyHeight, radius: flank },
      { x: right - lean, y: tabTop, radius: flank },
      { x: left + lean, y: tabTop, radius: flank },
      { x: left, y: bodyHeight, radius: flank },
      { x: 0, y: bodyHeight, radius: corner },
    ]
  } else {
    corners = [
      { x: 0, y: 0, radius: corner },
      { x: width, y: 0, radius: corner },
      { x: width, y: bodyHeight, radius: corner },
      { x: base, y: bodyHeight, radius: flank },
      { x: base - lean, y: tabTop, radius: flank },
      { x: 0, y: tabTop, radius: corner },
    ]
    if (position === 'right') {
      corners = corners
        .map((point) => ({ ...point, x: width - point.x }))
        .reverse()
    }
  }
  return roundedOutline(corners)
}

/** Width the text may occupy on the tab face, clear of the drafted flanks. */
function tabTextMaxWidth(position: CardBoxTabPosition): number {
  const c = CARD_BOX_CONFIGURATION
  const lean =
    c.dividerTabHeight * Math.tan((c.dividerTabDraftDegrees * Math.PI) / 180)
  if (position === 'center') {
    return c.dividerTabBaseWidth - 2 * lean - 2 * c.dividerTextFlankMargin
  }
  return (
    c.dividerTabBaseWidth -
    lean -
    c.dividerTextEdgeInset -
    c.dividerTextFlankMargin
  )
}

function shapeBounds(shape: Shape3D): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  const bounds = shape.boundingBox
  try {
    const [[minX, minY], [maxX, maxY]] = bounds.bounds as number[][]
    return { minX: minX!, maxX: maxX!, minY: minY!, maxY: maxY! }
  } finally {
    bounds.delete()
  }
}

/**
 * Builds the divider plate: 0.85 mm thick and `cardHeight` tall, wide enough
 * to enter both side-wall slots, with a 5 mm pull tab (left|center|right)
 * rising above the body. Optional text sits on the tab face near its top;
 * overflow throws `CARD_BOX_DIVIDER_TEXT_TOO_WIDE`. `raised` puts text 0.4 mm
 * proud of the plate, `flat` cuts a matching recess and returns text as accent.
 */
export async function buildCardBoxDivider(
  parameters: CardBoxParameters,
): Promise<CardBoxArtPartBuild> {
  const c = CARD_BOX_CONFIGURATION
  const position = parameters.dividerTabPosition
  const width = cardBoxDividerWidth(parameters.cardWidth)
  const bodyHeight = parameters.cardHeight
  const thickness = c.dividerPlateThickness
  const depth = c.accentDepth

  const blueprint = plateOutline(position, width, bodyHeight)
  let body: Shape3D | null = null
  let textShape: Shape3D | null = null
  try {
    const sketch = blueprint.sketchOnPlane('XY', [-width / 2, 0, 0])
    try {
      body = sketch.extrude(thickness) as Shape3D
    } finally {
      deleteShape(sketch)
    }

    textShape = await makeCardBoxTextShape(parameters.dividerText, {
      textHeight: c.dividerTextHeight,
      maxWidth: tabTextMaxWidth(position),
      depth,
    })
    if (!textShape) {
      const single = body
      body = null
      return { kind: 'single', shape: single }
    }

    const text = shapeBounds(textShape)
    const textWidth = text.maxX - text.minX
    const textX =
      position === 'left'
        ? -width / 2 + c.dividerTextEdgeInset + textWidth / 2
        : position === 'right'
          ? width / 2 - c.dividerTextEdgeInset - textWidth / 2
          : 0
    const textY =
      bodyHeight +
      c.dividerTabHeight -
      c.dividerTextTopInset -
      (text.maxY - text.minY) / 2
    const raised = parameters.dividerStyle === 'raised'
    const accent = raised
      ? textShape.translate(textX, textY, thickness)
      : textShape.translate(textX, textY, thickness - depth)
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
    deleteShape(textShape)
    throw error
  } finally {
    deleteShape(blueprint)
  }
}
