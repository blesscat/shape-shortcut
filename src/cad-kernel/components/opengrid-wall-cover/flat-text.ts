import {
  CompoundBlueprint,
  getFont,
  loadFont,
  makeCompound,
  textBlueprints,
  type Blueprint,
  type Shape3D,
} from 'replicad'
import {
  OPENGRID_SNAP_CONFIGURATION,
  OPENGRID_WALL_COVER_CONFIGURATION,
  normalizeOpenGridWallCoverText,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'

export const OPENGRID_WALL_COVER_TEXT_CONFIGURATION = {
  depth: 0.4,
  fontSize: 18,
  fontFamily: OPENGRID_WALL_COVER_CONFIGURATION.fontFamily,
} as const

export const OPEN_GRID_WALL_COVER_FONT_URL = new URL(
  `./assets/${OPENGRID_WALL_COVER_CONFIGURATION.fontFileName}`,
  import.meta.url,
)

let fontLoadPromise: Promise<void> | null = null

export function openGridWallCoverTextTopZ(): number {
  return OPENGRID_SNAP_CONFIGURATION.variantHeights.Lite
}

function arrayBufferFor(data: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data
  const copy = new Uint8Array(data.byteLength)
  copy.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return copy.buffer
}

function normalizeFontLoadError(error: unknown): Error {
  if (
    error instanceof Error &&
    error.message.startsWith('OPENGRID_WALL_COVER_FONT_')
  ) {
    return error
  }
  return new Error('OPENGRID_WALL_COVER_FONT_LOAD_FAILED')
}

function rememberFontLoad(promise: Promise<unknown>): Promise<void> {
  const tracked = promise.then(() => undefined)
  const recoverable = tracked.catch((error) => {
    if (fontLoadPromise === recoverable) fontLoadPromise = null
    throw normalizeFontLoadError(error)
  })
  fontLoadPromise = recoverable
  return recoverable
}

export function loadOpenGridWallCoverFont(
  fontData?: ArrayBuffer | ArrayBufferView,
): Promise<void> {
  if (fontData) {
    try {
      return rememberFontLoad(
        loadFont(
          arrayBufferFor(fontData),
          OPENGRID_WALL_COVER_TEXT_CONFIGURATION.fontFamily,
        ),
      )
    } catch {
      return Promise.reject(new Error('OPENGRID_WALL_COVER_FONT_LOAD_FAILED'))
    }
  }
  if (!fontLoadPromise) {
    try {
      rememberFontLoad(
        loadFont(
          OPEN_GRID_WALL_COVER_FONT_URL.href,
          OPENGRID_WALL_COVER_TEXT_CONFIGURATION.fontFamily,
        ),
      )
    } catch {
      fontLoadPromise = Promise.reject(
        new Error('OPENGRID_WALL_COVER_FONT_LOAD_FAILED'),
      )
    }
  }
  const promise = fontLoadPromise
  if (!promise) throw new Error('OPENGRID_WALL_COVER_FONT_MISSING')
  return promise
}

function assertGlyphSupported(character: string): void {
  const font = getFont(OPENGRID_WALL_COVER_TEXT_CONFIGURATION.fontFamily)
  const glyph = font?.charToGlyph(character)
  const glyphPath = glyph?.getPath(
    0,
    0,
    OPENGRID_WALL_COVER_TEXT_CONFIGURATION.fontSize,
  )
  if (!glyph || glyph.index === 0 || !glyphPath?.commands.length) {
    throw new Error('OPENGRID_WALL_COVER_TEXT_GLYPH_UNSUPPORTED')
  }
}

function centerShapeOn(
  shape: Shape3D,
  centerX: number,
  centerY: number,
): Shape3D {
  const bounds = shape.boundingBox
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

  const translated = shape.translate(
    centerX - (minX + maxX) / 2,
    centerY - (minY + maxY) / 2,
    openGridWallCoverTextTopZ() - OPENGRID_WALL_COVER_TEXT_CONFIGURATION.depth,
  )
  if (translated !== shape) deleteShape(shape)
  return translated
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

function extrudeBlueprint(blueprint: Blueprint): Shape3D {
  const sketch = blueprint.sketchOnPlane()
  try {
    return sketch.extrude(
      OPENGRID_WALL_COVER_TEXT_CONFIGURATION.depth,
    ) as Shape3D
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

function extrudeContourGroup(group: GlyphContourGroup): Shape3D {
  let result: Shape3D = extrudeBlueprint(group[0])
  try {
    for (const holeBlueprint of group.slice(1)) {
      const hole = extrudeBlueprint(holeBlueprint)
      result = cutContourHole(result, hole)
    }
    return result
  } catch (error) {
    deleteShape(result)
    throw error
  }
}

function makeGlyph(character: string, centerX: number): Shape3D {
  assertGlyphSupported(character)
  let pieces: Shape3D[] = []
  let extruded: Shape3D | null = null
  const drawings = textBlueprints(character, {
    fontSize: OPENGRID_WALL_COVER_TEXT_CONFIGURATION.fontSize,
    fontFamily: OPENGRID_WALL_COVER_TEXT_CONFIGURATION.fontFamily,
  })
  try {
    const contourGroups = groupGlyphContours(drawings)
    for (const group of contourGroups) {
      pieces.push(extrudeContourGroup(group))
    }
    extruded = makeCompound(pieces).asShape3D()
    pieces = []
    const result = centerShapeOn(extruded, centerX, 0)
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

export async function makeOpenGridWallCoverTextGlyphShape(
  character: string,
  centerX = 0,
): Promise<Shape3D> {
  await loadOpenGridWallCoverFont()
  const letters = Array.from(normalizeOpenGridWallCoverText(character))
  if (letters.length !== 1) {
    throw new Error('OPENGRID_WALL_COVER_TEXT_GLYPH_INVALID')
  }
  return makeGlyph(letters[0]!, centerX)
}

export async function makeOpenGridWallCoverTextShape(
  text: string,
): Promise<Shape3D> {
  await loadOpenGridWallCoverFont()
  const letters = Array.from(normalizeOpenGridWallCoverText(text))
  if (
    letters.length < 1 ||
    letters.length > OPENGRID_WALL_COVER_CONFIGURATION.maxTextLength
  ) {
    throw new Error('OPENGRID_WALL_COVER_TEXT_INVALID')
  }

  const coverWidth = OPENGRID_WALL_COVER_CONFIGURATION.coverWidth
  const centerOffset =
    ((letters.length - 1) *
      (coverWidth + OPENGRID_WALL_COVER_CONFIGURATION.coverGap)) /
    2
  const glyphs: Shape3D[] = []
  try {
    for (const [index, character] of letters.entries()) {
      glyphs.push(
        makeGlyph(
          character,
          index * (coverWidth + OPENGRID_WALL_COVER_CONFIGURATION.coverGap) -
            centerOffset,
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
