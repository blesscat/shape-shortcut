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
  OPENGRID_LABEL_TAG_CONFIGURATION,
  normalizeOpenGridLabelTagText,
} from '../../../cad-contract/units'
import { loadOpenGridWallCoverFont } from '../opengrid-wall-cover/flat-text'

export const LABEL_TAG_TEXT_CONFIGURATION = {
  depth: OPENGRID_LABEL_TAG_CONFIGURATION.accentDepth,
  fontSize: 5,
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
  const font = getFont(LABEL_TAG_TEXT_CONFIGURATION.fontFamily)
  const glyph = font?.charToGlyph(character)
  const glyphPath = glyph?.getPath(0, 0, LABEL_TAG_TEXT_CONFIGURATION.fontSize)
  if (!glyph || glyph.index === 0 || !glyphPath?.commands.length) {
    throw new Error('LABEL_TAG_TEXT_GLYPH_UNSUPPORTED')
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
  depth: number = LABEL_TAG_TEXT_CONFIGURATION.depth,
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
  depth: number = LABEL_TAG_TEXT_CONFIGURATION.depth,
): Shape3D {
  assertGlyphSupported(character)
  let pieces: Shape3D[] = []
  let extruded: Shape3D | null = null
  const drawings = textBlueprints(character, {
    fontSize: LABEL_TAG_TEXT_CONFIGURATION.fontSize,
    fontFamily: LABEL_TAG_TEXT_CONFIGURATION.fontFamily,
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

/**
 * Builds the optional label text as accent solids (depth equal to the accent
 * depth, resting on the outward plate face at Z = 0; the builder cuts the
 * matching recess around them). `centerY` overrides the default text row
 * position for the label card layout.
 */
export async function makeOpenGridLabelTagTextShape(
  text: string,
  options: { centerY?: number; depth?: number; maxLength?: number } = {},
): Promise<Shape3D | null> {
  await loadOpenGridWallCoverFont()
  const letters = Array.from(normalizeOpenGridLabelTagText(text))
  if (letters.length === 0) return null
  if (
    letters.length >
    (options.maxLength ?? OPENGRID_LABEL_TAG_CONFIGURATION.maxTextLength)
  ) {
    throw new Error('LABEL_TAG_TEXT_INVALID')
  }

  const spacing = LABEL_TAG_TEXT_CONFIGURATION.fontSize * 0.72
  const totalWidth = (letters.length - 1) * spacing
  const glyphs: Shape3D[] = []
  try {
    for (const [index, character] of letters.entries()) {
      glyphs.push(
        makeGlyph(
          character,
          index * spacing - totalWidth / 2,
          options.centerY ?? LABEL_TAG_TEXT_POSITIONS.textCenterY,
          options.depth ?? LABEL_TAG_TEXT_CONFIGURATION.depth,
        ),
      )
    }
    const result = makeCompound(glyphs).asShape3D()
    glyphs.length = 0
    return result
  } catch (error) {
    for (const glyph of glyphs) deleteShape(glyph)
    throw error
  }
}

/** Accent layout on the plate face (Y along the hang direction). */
export const LABEL_TAG_TEXT_POSITIONS = {
  iconCenterYWithText: 6.6,
  iconCenterYIconOnly: 5,
  textCenterY: 1.8,
} as const
