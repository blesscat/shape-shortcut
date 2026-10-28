import {
  CompoundBlueprint,
  makeCompound,
  textBlueprints,
  type Blueprint,
  type Blueprints,
  type Shape3D,
} from 'replicad'
import { loadOpenGridWallCoverFont } from '../opengrid-wall-cover/flat-text'
import { deleteShape } from '../../lifetime/dispose'

const CARD_BOX_TEXT_FONT_FAMILY = 'Noto Sans CJK TC Bold'

type GlyphContourGroup = [Blueprint, ...Blueprint[]]

function deleteDrawingBlueprints(drawings: Blueprints): void {
  const deleted = new Set<Blueprint>()
  const deleteDrawing = (drawing: Blueprint | CompoundBlueprint): void => {
    if (drawing instanceof CompoundBlueprint) {
      drawing.blueprints.forEach(deleteDrawing)
      return
    }
    if (deleted.has(drawing)) return
    deleted.add(drawing)
    drawing.delete()
  }
  drawings.blueprints.forEach(deleteDrawing)
}

function groupGlyphContours(drawings: Blueprints): GlyphContourGroup[] {
  const result: GlyphContourGroup[] = []
  for (const drawing of drawings.blueprints) {
    if (!(drawing instanceof CompoundBlueprint)) {
      result.push([drawing])
      continue
    }
    const [outer, ...holes] = drawing.blueprints
    if (outer) result.push([outer, ...holes])
  }
  return result
}

function extrudeBlueprint(blueprint: Blueprint, depth: number): Shape3D {
  const sketch = blueprint.sketchOnPlane()
  try {
    return sketch.extrude(depth) as Shape3D
  } finally {
    deleteShape(sketch)
  }
}

function cutContourHole(source: Shape3D, hole: Shape3D): Shape3D {
  try {
    const result = source.cut(hole)
    if (result !== source) deleteShape(source)
    deleteShape(hole)
    return result
  } catch (error) {
    deleteShape(hole)
    throw error
  }
}

function extrudeContourGroup(group: GlyphContourGroup, depth: number): Shape3D {
  let result: Shape3D = extrudeBlueprint(group[0], depth)
  try {
    for (const holeBlueprint of group.slice(1)) {
      const hole = extrudeBlueprint(holeBlueprint, depth)
      result = cutContourHole(result, hole)
    }
    return result
  } catch (error) {
    deleteShape(result)
    throw error
  }
}

function makeTextShape(text: string, fontSize: number, depth: number): Shape3D {
  let pieces: Shape3D[] = []
  let extruded: Shape3D | null = null
  const drawings = textBlueprints(text, {
    fontSize,
    fontFamily: CARD_BOX_TEXT_FONT_FAMILY,
  })
  try {
    const contourGroups = groupGlyphContours(drawings)
    for (const group of contourGroups) {
      pieces.push(extrudeContourGroup(group, depth))
    }
    extruded = makeCompound(pieces).asShape3D()
    pieces = []
    const bounds = extruded.boundingBox
    let minX: number
    let maxX: number
    let minY: number
    let maxY: number
    try {
      const [[lowerX, lowerY], [upperX, upperY]] = bounds.bounds as number[][]
      minX = lowerX!
      maxX = upperX!
      minY = lowerY!
      maxY = upperY!
    } finally {
      bounds.delete()
    }
    const result = extruded.translate(-(minX + maxX) / 2, -(minY + maxY) / 2, 0)
    if (result !== extruded) deleteShape(extruded)
    extruded = null
    return result
  } catch (error) {
    deleteShape(extruded)
    for (const piece of pieces) deleteShape(piece)
    throw error
  } finally {
    deleteDrawingBlueprints(drawings)
  }
}

async function preparedText(text: string): Promise<string | null> {
  await loadOpenGridWallCoverFont()
  const normalized = text.trim()
  return normalized.length ? normalized : null
}

function textUnitMetrics(text: string): {
  width: number
  height: number
  dispose: () => void
} {
  const drawings = textBlueprints(text, {
    fontSize: 1,
    fontFamily: CARD_BOX_TEXT_FONT_FAMILY,
  })
  const bounds = drawings.boundingBox
  try {
    const [[minX, minY], [maxX, maxY]] = bounds.bounds as number[][]
    return {
      width: maxX! - minX!,
      height: maxY! - minY!,
      dispose: () => {
        bounds.delete()
        deleteDrawingBlueprints(drawings)
      },
    }
  } catch (error) {
    bounds.delete()
    deleteDrawingBlueprints(drawings)
    throw error
  }
}

/**
 * Measured rendered width/height of one text line at the requested visible
 * glyph height, or `null` for empty text. Uses the same layout engine as
 * `makeCardBoxTextShape` (`drawText`/`textBlueprints`) so placements match the
 * produced solids.
 */
export async function measureCardBoxText(
  text: string,
  textHeight: number,
): Promise<{ width: number; height: number } | null> {
  const normalized = await preparedText(text)
  if (!normalized) return null
  const metrics = textUnitMetrics(normalized)
  try {
    if (!(metrics.height > 0))
      throw new Error('CARD_BOX_TEXT_GLYPH_UNSUPPORTED')
    const scale = textHeight / metrics.height
    return { width: metrics.width * scale, height: textHeight }
  } finally {
    metrics.dispose()
  }
}

/**
 * One horizontal text line centered on the origin with the requested visible
 * glyph height. Returns `null` for empty text; throws
 * `CARD_BOX_DIVIDER_TEXT_TOO_WIDE` when the measured line exceeds `maxWidth`
 * (callers that check fit themselves, like the cover layout, pass the
 * already-validated safe-area width).
 */
export async function makeCardBoxTextShape(
  text: string,
  options: { textHeight: number; maxWidth: number; depth: number },
): Promise<Shape3D | null> {
  const normalized = await preparedText(text)
  if (!normalized) return null
  const metrics = textUnitMetrics(normalized)
  try {
    if (!(metrics.height > 0))
      throw new Error('CARD_BOX_TEXT_GLYPH_UNSUPPORTED')
    if (
      metrics.width * (options.textHeight / metrics.height) >
      options.maxWidth
    ) {
      throw new Error('CARD_BOX_DIVIDER_TEXT_TOO_WIDE')
    }
    return makeTextShape(
      normalized,
      options.textHeight / metrics.height,
      options.depth,
    )
  } finally {
    metrics.dispose()
  }
}
