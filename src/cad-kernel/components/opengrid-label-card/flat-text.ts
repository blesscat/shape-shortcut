import { OPENGRID_LABEL_GRID } from '../../../cad-contract/units/opengrid-label-shared'
import {
  CompoundBlueprint,
  getFont,
  makeCompound,
  textBlueprints,
  type Blueprint,
  type Shape3D,
} from 'replicad'
import {
  OPENGRID_LABEL_CARD_CONFIGURATION,
  normalizeOpenGridLabelCardText,
} from '../../../cad-contract/units'
import { loadOpenGridWallCoverFont } from '../opengrid-wall-cover/flat-text'

export const LABEL_CARD_TEXT_CONFIGURATION = {
  depth: OPENGRID_LABEL_CARD_CONFIGURATION.accentDepth,
  fontSize: OPENGRID_LABEL_GRID.textFontSize,
  fontFamily: 'Noto Sans CJK TC Bold',
} as const

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Preserve the primary geometry error during cleanup.
  }
}

function assertGlyphSupported(character: string): void {
  const font = getFont(LABEL_CARD_TEXT_CONFIGURATION.fontFamily)
  const glyph = font?.charToGlyph(character)
  const glyphPath = glyph?.getPath(0, 0, LABEL_CARD_TEXT_CONFIGURATION.fontSize)
  if (!glyph || glyph.index === 0 || !glyphPath?.commands.length) {
    throw new Error('LABEL_CARD_TEXT_GLYPH_UNSUPPORTED')
  }
}

type GlyphContourGroup = [Blueprint, ...Blueprint[]]

function deleteDrawingBlueprints(
  drawings: ReturnType<typeof textBlueprints>,
): void {
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

function groupGlyphContours(
  drawings: ReturnType<typeof textBlueprints>,
): GlyphContourGroup[] {
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

function extrudeBlueprint(
  blueprint: Blueprint,
  depth: number = LABEL_CARD_TEXT_CONFIGURATION.depth,
): Shape3D {
  const sketch = blueprint.sketchOnPlane()
  try {
    return sketch.extrude(depth) as Shape3D
  } finally {
    deleteShape(sketch)
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

function makeGlyph(
  character: string,
  centerX: number,
  centerY: number,
  depth: number = LABEL_CARD_TEXT_CONFIGURATION.depth,
  fontSize: number = LABEL_CARD_TEXT_CONFIGURATION.fontSize,
): Shape3D {
  let pieces: Shape3D[] = []
  let extruded: Shape3D | null = null
  const drawings = textBlueprints(character, {
    fontSize,
    fontFamily: LABEL_CARD_TEXT_CONFIGURATION.fontFamily,
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
    const result = extruded.translate(
      centerX - (minX + maxX) / 2,
      centerY - (minY + maxY) / 2,
      0,
    )
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

/** Build one horizontal text line at an actual visible height of 7 mm. */
export async function makeOpenGridLabelCardTextShape(
  text: string,
  options: { depth?: number; maxLength?: number } = {},
): Promise<Shape3D | null> {
  await loadOpenGridWallCoverFont()
  const normalized = normalizeOpenGridLabelCardText(text)
  const letters = Array.from(normalized)
  if (!letters.length) return null
  if (
    letters.length >
    (options.maxLength ?? OPENGRID_LABEL_CARD_CONFIGURATION.maxTextLength)
  )
    throw new Error('LABEL_CARD_TEXT_INVALID')
  letters.forEach(assertGlyphSupported)
  const font = getFont(LABEL_CARD_TEXT_CONFIGURATION.fontFamily)
  const bounds = font.getPath(normalized, 0, 0, 1).getBoundingBox()
  const visibleHeight = bounds.y2 - bounds.y1
  if (!(visibleHeight > 0)) throw new Error('LABEL_CARD_TEXT_GLYPH_UNSUPPORTED')
  const fontSize = OPENGRID_LABEL_GRID.textFontSize / visibleHeight
  return makeGlyph(
    normalized,
    0,
    0,
    options.depth ?? LABEL_CARD_TEXT_CONFIGURATION.depth,
    fontSize,
  )
}
