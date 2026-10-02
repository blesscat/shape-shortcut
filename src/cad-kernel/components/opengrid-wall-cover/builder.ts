import {
  deserializeShape,
  getOC,
  importSTEP,
  makeCompound,
  measureVolume,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  OPENGRID_WALL_COVER_CONFIGURATION,
  validateOpenGridWallCoverParameters,
  type OpenGridWallCoverParameters,
} from '../../../cad-contract/units'
import {
  makeOpenGridSnapOpenConnectUndersideNotchCutters,
  type OpenGridSnapBuildContext,
} from '../opengrid-snap/builder'
import { openGridSnapOpenConnectNotchSegmentsFor } from '../opengrid-snap/openconnect'
import { makeOpenGridWallCoverTextGlyphShape } from './flat-text'
import type { BooleanOperationScope } from '../../boolean-progress'
import { measureBooleanInScope } from '../../boolean-progress'
import { deleteShape } from '../../lifetime/dispose'

export {
  importOpenGridSnapReference,
  loadOpenGridSnapReference,
  OPENGRID_SNAP_REFERENCE_URLS,
} from '../opengrid-snap/builder'

export const OPEN_GRID_WALL_COVER_REFERENCE_URL = new URL(
  './assets/opengrid-snap-cover.step',
  import.meta.url,
)

export type OpenGridWallCoverBuildContext = OpenGridSnapBuildContext & {
  getOpenGridWallCoverReference?: () => Promise<Shape3D>
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'steps'
  }) => void
}

export type OpenGridWallCoverNativePart = {
  name: 'body' | 'text'
  shape: Shape3D
}

export type OpenGridWallCoverMultipartBuild = {
  shape: Shape3D
  qualityShape: Shape3D
  parts: OpenGridWallCoverNativePart[]
}

function deleteDistinctShapes(shapes: Array<Shape3D | null | undefined>): void {
  const deleted = new Set<Shape3D>()
  for (const shape of shapes) {
    if (!shape || deleted.has(shape)) continue
    deleted.add(shape)
    deleteShape(shape)
  }
}

function assertGenerationCurrent(context: OpenGridWallCoverBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

function cloneShape(shape: Shape3D): Shape3D {
  return deserializeShape(shape.serialize()).asShape3D()
}

function translateShape(shape: Shape3D, x: number): Shape3D {
  const translated = shape.translate(x, 0, 0)
  if (translated !== shape) deleteShape(shape)
  return translated
}

function extractSolids(shape: Shape3D): Solid[] {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  const solids: Solid[] = []
  try {
    while (explorer.More()) {
      solids.push(new Solid(oc.TopoDS.Solid_1(explorer.Current())))
      explorer.Next()
    }
    return solids
  } catch (error) {
    deleteDistinctShapes(solids)
    throw error
  } finally {
    explorer.delete()
  }
}

function assertWallCoverReferenceGeometry(shape: Shape3D): void {
  if (shape.isNull) throw new Error('OPENGRID_WALL_COVER_ASSET_INVALID')
  const bounds = shape.boundingBox
  try {
    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = bounds.bounds
    if (
      ![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite) ||
      maxX <= minX ||
      maxY <= minY ||
      maxZ <= minZ
    ) {
      throw new Error('OPENGRID_WALL_COVER_ASSET_INVALID')
    }
  } finally {
    bounds.delete()
  }
  const solids = extractSolids(shape)
  try {
    if (solids.length !== 9) {
      throw new Error('OPENGRID_WALL_COVER_ASSET_INVALID')
    }
  } finally {
    deleteDistinctShapes(solids)
  }
}

export async function importOpenGridWallCoverReference(
  blob: Blob,
): Promise<Shape3D> {
  let imported: Shape3D | null = null
  try {
    imported = (await importSTEP(blob)).asShape3D()
    assertWallCoverReferenceGeometry(imported)
    return imported
  } catch (error) {
    deleteShape(imported)
    if (
      error instanceof Error &&
      error.message === 'OPENGRID_WALL_COVER_ASSET_INVALID'
    ) {
      throw error
    }
    throw new Error('OPENGRID_WALL_COVER_ASSET_INVALID')
  }
}

export async function loadOpenGridWallCoverReference(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPEN_GRID_WALL_COVER_REFERENCE_URL)
  if (!response.ok) throw new Error('OPENGRID_WALL_COVER_ASSET_LOAD_FAILED')
  return importOpenGridWallCoverReference(await response.blob())
}

function centralSolidIndex(solids: readonly Solid[]): number {
  let centralIndex = -1
  let centralVolume = -Infinity
  for (let index = 0; index < solids.length; index += 1) {
    const solid = solids[index]
    if (!solid) continue
    const volume = measureVolume(solid)
    if (volume > centralVolume) {
      centralVolume = volume
      centralIndex = index
    }
  }
  if (centralIndex < 0) {
    throw new Error('OPENGRID_WALL_COVER_BODY_MISSING')
  }
  return centralIndex
}

function cutShape(
  source: Shape3D,
  cutter: Shape3D,
  scope: BooleanOperationScope | undefined,
): Shape3D {
  try {
    const result = measureBooleanInScope(scope, 'cut', () => source.cut(cutter))
    if (result !== source) deleteShape(source)
    deleteShape(cutter)
    return result
  } catch (error) {
    deleteShape(cutter)
    throw error
  }
}

function cutOpenConnectUndersideNotches(
  body: Shape3D,
  centerX: number,
  scope: BooleanOperationScope | undefined,
): Shape3D {
  const cutters = makeOpenGridSnapOpenConnectUndersideNotchCutters('Lite')
  let result = body
  try {
    for (const cutter of cutters) {
      result = cutShape(result, translateShape(cutter, centerX), scope)
    }
    return result
  } catch (error) {
    deleteShape(result)
    throw error
  } finally {
    cutters.forEach(deleteShape)
  }
}

function fuseTextShape(textShape: Shape3D): Shape3D {
  // Some CJK glyphs contain overlapping solids after their contours are
  // extruded. Self-fusing the cutter resolves those overlaps before it cuts
  // the body, while the original glyph remains available for the text part.
  try {
    const fused = textShape.fuse(textShape)
    deleteShape(textShape)
    return fused
  } catch (error) {
    deleteShape(textShape)
    throw error
  }
}

async function buildCoverBody(
  context: OpenGridWallCoverBuildContext,
): Promise<Shape3D> {
  if (context.getOpenGridWallCoverReference) {
    const reference = await context.getOpenGridWallCoverReference()
    assertGenerationCurrent(context)
    return cloneShape(reference)
  }
  return loadOpenGridWallCoverReference()
}

export async function buildOpenGridWallCoverWithFlatText(
  parameters: OpenGridWallCoverParameters,
  context: OpenGridWallCoverBuildContext,
): Promise<OpenGridWallCoverMultipartBuild> {
  const validation = validateOpenGridWallCoverParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  const text = validation.value.text
  const openConnectEnabled = validation.value.openConnect !== false
  const letters = Array.from(text)
  assertGenerationCurrent(context)
  const baseAssembly = await buildCoverBody(context)
  let qualityShape: Shape3D | null = null
  let sourceSolids: Solid[] = []
  let bodyPieces: Shape3D[] = []
  let qualityPieces: Shape3D[] = []
  let textPieces: Shape3D[] = []
  let textPart: Shape3D | null = null
  let bodyPart: Shape3D | null = null
  let previewShape: Shape3D | null = null

  try {
    if (letters.length < 1) {
      throw new Error('OPENGRID_WALL_COVER_TEXT_INVALID')
    }
    const coverStep =
      OPENGRID_WALL_COVER_CONFIGURATION.coverWidth +
      OPENGRID_WALL_COVER_CONFIGURATION.coverGap
    const centerOffset = ((letters.length - 1) * coverStep) / 2
    const notchCount = openConnectEnabled
      ? openGridSnapOpenConnectNotchSegmentsFor('Lite').length
      : 0
    const cutScope = context.booleanOperations?.createScope(
      letters.length * (notchCount + 1),
    )
    context.reportProgress?.({
      stage: 'building',
      completed: 0,
      total: letters.length,
      unit: 'steps',
    })

    for (const [index, letter] of letters.entries()) {
      assertGenerationCurrent(context)
      const centerX = index * coverStep - centerOffset
      let referenceClone: Shape3D | null = null
      let translatedReference: Shape3D | null = null
      let translatedQualityReference: Shape3D | null = null
      try {
        referenceClone = cloneShape(baseAssembly)
        translatedReference = translateShape(referenceClone, centerX)
        referenceClone = null
        translatedQualityReference = cloneShape(translatedReference)
        qualityPieces.push(translatedQualityReference)
        translatedQualityReference = null

        sourceSolids = extractSolids(translatedReference)
        if (sourceSolids.length !== 9) {
          throw new Error('OPENGRID_WALL_COVER_ASSET_INVALID')
        }
        const bodyIndex = centralSolidIndex(sourceSolids)
        const body = sourceSolids[bodyIndex]
        if (!body) throw new Error('OPENGRID_WALL_COVER_BODY_MISSING')

        let bodyWithNotches = body
        if (openConnectEnabled) {
          bodyWithNotches = cutOpenConnectUndersideNotches(
            body,
            centerX,
            cutScope,
          )
        }
        sourceSolids[bodyIndex] = bodyWithNotches

        const glyph = await makeOpenGridWallCoverTextGlyphShape(letter, centerX)
        textPieces.push(glyph)
        const bodyCutter = fuseTextShape(cloneShape(glyph))
        const bodyWithCavity = cutShape(bodyWithNotches, bodyCutter, cutScope)
        sourceSolids[bodyIndex] = bodyWithCavity
        for (const solid of sourceSolids) {
          bodyPieces.push(cloneShape(solid))
        }
        deleteDistinctShapes(sourceSolids)
        sourceSolids = []
        deleteShape(translatedReference)
        translatedReference = null
        context.reportProgress?.({
          stage: 'building',
          completed: index + 1,
          total: letters.length,
          unit: 'steps',
        })
      } finally {
        deleteShape(referenceClone)
        deleteShape(translatedQualityReference)
        deleteDistinctShapes(sourceSolids)
        sourceSolids = []
        if (translatedReference) deleteShape(translatedReference)
      }
      await context.yieldToEventLoop?.()
    }

    qualityShape = makeCompound(qualityPieces).asShape3D()
    qualityPieces = []
    bodyPart = makeCompound(bodyPieces).asShape3D()
    bodyPieces = []
    textPart = makeCompound(textPieces).asShape3D()
    textPieces = []
    deleteShape(baseAssembly)

    let previewBodyClone: Shape3D | null = null
    let previewTextClone: Shape3D | null = null
    try {
      previewBodyClone = cloneShape(bodyPart)
      previewTextClone = cloneShape(textPart)
      previewShape = makeCompound([
        previewBodyClone,
        previewTextClone,
      ]).asShape3D()
      previewBodyClone = null
      previewTextClone = null
    } finally {
      deleteShape(previewBodyClone)
      deleteShape(previewTextClone)
    }

    const completedPreviewShape = previewShape
    const completedQualityShape = qualityShape
    const completedBodyPart = bodyPart
    const completedTextPart = textPart
    previewShape = null
    qualityShape = null
    bodyPart = null
    textPart = null
    return {
      shape: completedPreviewShape,
      qualityShape: completedQualityShape,
      parts: [
        { name: 'body', shape: completedBodyPart },
        { name: 'text', shape: completedTextPart },
      ],
    }
  } catch (error) {
    deleteDistinctShapes([
      baseAssembly,
      qualityShape,
      ...sourceSolids,
      ...bodyPieces,
      ...qualityPieces,
      ...textPieces,
      textPart,
      bodyPart,
      previewShape,
    ])
    throw error
  }
}

export async function buildOpenGridWallCover(
  parameters: OpenGridWallCoverParameters,
  context: OpenGridWallCoverBuildContext,
): Promise<Shape3D> {
  if (!validateOpenGridWallCoverParameters(parameters).valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  const result = await buildOpenGridWallCoverWithFlatText(parameters, context)
  for (const part of result.parts) deleteShape(part.shape)
  deleteShape(result.qualityShape)
  return result.shape
}
