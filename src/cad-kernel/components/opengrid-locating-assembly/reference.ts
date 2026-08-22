import {
  basicFaceExtrusion,
  cast,
  getOC,
  importSTEP,
  isShape3D,
  makeCylinder,
  measureVolume,
  Sketcher,
  Solid,
  Vector,
  type Face,
  type Shape3D,
} from 'replicad'
import type { BOPAlgo_GlueEnum, TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION } from '../../../cad-contract/units'
import {
  countSolids,
  isBRepValid,
} from '../opengrid-stackable-box/quality-metrics'

export const OPEN_GRID_DETACHABLE_CORNER_SEAT_REFERENCE_URL = new URL(
  './assets/detachable-corner-seat-3.8.step',
  import.meta.url,
)

export const OPEN_GRID_DETACHABLE_CORNER_SEAT_HOLDER_REFERENCE_URL = new URL(
  './assets/detachable-corner-seat-holder.step',
  import.meta.url,
)

type ReferenceKind = 'male' | 'female'

type ReferenceInspection = {
  bounds: number[][]
  volume: number
  solidCount: number
  valid: boolean
}

export type OpenGridDetachableCornerSeatCompatibilityReport = {
  male: ReferenceInspection
  female: ReferenceInspection
  intersectionVolume: number
}

export type OpenGridDetachableCornerSeatSocketPlacement = {
  center: [number, number]
  rotationDegrees: 0 | 90 | 180 | 270
}

export type OpenGridDetachableCornerSeatIndicatorPlacement = {
  center: [number, number]
  rotationDegrees: number
}

function deleteShape(shape: { delete(): void } | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not replace the primary geometry diagnostic.
  }
}

function runGeometryStage<T>(code: string, operation: () => T): T {
  try {
    return operation()
  } catch (cause) {
    throw new Error(code, { cause })
  }
}

function fuseWithoutSimplifying(first: Shape3D, second: Shape3D): Shape3D {
  const oc = getOC()
  const progress = new oc.Message_ProgressRange_1()
  const operation = new oc.BRepAlgoAPI_Fuse_3(
    first.wrapped,
    second.wrapped,
    progress,
  )
  try {
    operation.SetGlue(
      oc.BOPAlgo_GlueEnum.BOPAlgo_GlueShift as unknown as BOPAlgo_GlueEnum,
    )
    operation.Build(progress)
    const result = cast(operation.Shape())
    if (!isShape3D(result)) {
      deleteShape(result)
      throw new Error('OPENGRID_DETACHABLE_CORNER_SEAT_HOLDER_FUSE_NOT_3D')
    }
    return result
  } finally {
    operation.delete()
    progress.delete()
  }
}

function readBounds(shape: Shape3D): number[][] {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as number[][]
  } finally {
    boundingBox.delete()
  }
}

function inspectReference(shape: Shape3D): ReferenceInspection {
  return {
    bounds: readBounds(shape),
    volume: measureVolume(shape),
    solidCount: countSolids(shape),
    valid: isBRepValid(shape),
  }
}

function copySingleSolid(shape: Shape3D): Solid {
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
  } finally {
    explorer.delete()
  }

  if (solids.length !== 1) {
    solids.forEach(deleteShape)
    throw new Error('OPENGRID_DETACHABLE_CORNER_SEAT_NOT_SINGLE_SOLID')
  }
  return solids[0]
}

function expectedReference(kind: ReferenceKind) {
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  if (kind === 'male') return configuration.maleReference
  return configuration.femaleReference
}

function boundsMatch(
  actual: readonly (readonly number[])[],
  expected: { min: readonly number[]; max: readonly number[] },
): boolean {
  const expectedPoints = [expected.min, expected.max]
  const tolerance =
    OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.geometryTolerance
  return expectedPoints.every((expectedPoint, pointIndex) =>
    expectedPoint.every(
      (coordinate, coordinateIndex) =>
        Math.abs(
          (actual[pointIndex]?.[coordinateIndex] ?? Number.NaN) - coordinate,
        ) <= tolerance,
    ),
  )
}

function assertReference(shape: Shape3D, kind: ReferenceKind): void {
  const inspection = inspectReference(shape)
  const expected = expectedReference(kind)
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  const volumeMatches =
    Math.abs(inspection.volume - expected.nominalVolume) <=
    configuration.volumeTolerance
  if (
    inspection.solidCount !== 1 ||
    !inspection.valid ||
    !boundsMatch(inspection.bounds, expected.bounds) ||
    !volumeMatches
  ) {
    throw new Error(
      `OPENGRID_DETACHABLE_CORNER_SEAT_${kind.toUpperCase()}_REFERENCE_INVALID`,
    )
  }
}

export function assertOpenGridDetachableCornerSeatReference(
  shape: Shape3D,
): void {
  assertReference(shape, 'male')
}

export function assertOpenGridDetachableCornerSeatHolderReference(
  shape: Shape3D,
): void {
  assertReference(shape, 'female')
}

function assertGeneratedMale(shape: Shape3D): void {
  const inspection = inspectReference(shape)
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  const expected = configuration.male
  const volumeMatches =
    Math.abs(inspection.volume - expected.markedNominalVolume) <=
    configuration.volumeTolerance
  if (
    inspection.solidCount !== 1 ||
    !inspection.valid ||
    !boundsMatch(inspection.bounds, expected.bounds) ||
    !volumeMatches
  ) {
    throw new Error(
      `OPENGRID_DETACHABLE_CORNER_SEAT_GENERATED_MALE_INVALID:${JSON.stringify({ inspection, expected })}`,
    )
  }
}

export function buildOpenGridDetachableCornerSeatIndicatorCutter(): Shape3D {
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.indicator
  const sketcher = new Sketcher('XY', [0, 0, -configuration.cutterOverlap])
  let sketch: ReturnType<Sketcher['close']> | null = null
  let cutter: Shape3D | null = null
  try {
    const halfWidth = configuration.width / 2
    const halfRadialLength = configuration.radialLength / 2
    // The shared local radial datum runs from the flat edge at negative X to
    // the triangle apex at positive X.
    sketcher.movePointerTo([-halfRadialLength, halfWidth])
    sketcher.lineTo([-halfRadialLength, -halfWidth])
    sketcher.lineTo([halfRadialLength, 0])
    sketch = sketcher.close()
    cutter = sketch.extrude(configuration.depth + configuration.cutterOverlap, {
      extrusionDirection: [0, 0, 1],
    })
    const result = cutter
    cutter = null
    return result
  } finally {
    deleteShape(cutter)
    deleteShape(sketch)
    sketcher.delete()
  }
}

export function placeOpenGridDetachableCornerSeatIndicatorShape(
  source: Shape3D,
  placement: OpenGridDetachableCornerSeatIndicatorPlacement,
): Shape3D {
  let placed: Shape3D | null = null
  try {
    placed = source.clone()
    // Positive Z rotation is clockwise when the bottom of the assembly is viewed.
    if (placement.rotationDegrees % 360 !== 0) {
      placed = replaceOwnedShape(
        placed,
        placed.rotate(placement.rotationDegrees, [0, 0, 0], [0, 0, 1]),
      )
    }
    placed = replaceOwnedShape(
      placed,
      placed.translate(placement.center[0], placement.center[1], 0),
    )
    const result = placed
    placed = null
    return result
  } catch (error) {
    deleteShape(placed)
    throw error
  }
}

function cutDetachableCornerSeatIndicator(shape: Shape3D): Shape3D {
  let cutter: Shape3D | null = null
  try {
    cutter = buildOpenGridDetachableCornerSeatIndicatorCutter()
    const marked = runGeometryStage(
      'OPENGRID_DETACHABLE_CORNER_SEAT_INDICATOR_CUT_FAILED',
      () => shape.cut(cutter!, { optimisation: 'none' }),
    )
    deleteShape(shape)
    return marked
  } catch (error) {
    deleteShape(shape)
    throw error
  } finally {
    deleteShape(cutter)
  }
}

function assertGeneratedFemale(shape: Shape3D): void {
  const inspection = inspectReference(shape)
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  const expected = configuration.female
  const volumeMatches =
    Math.abs(inspection.volume - expected.nominalVolume) <=
    configuration.volumeTolerance
  if (
    inspection.solidCount !== 1 ||
    !inspection.valid ||
    !boundsMatch(inspection.bounds, expected.bounds) ||
    !volumeMatches
  ) {
    throw new Error(
      `OPENGRID_DETACHABLE_CORNER_SEAT_GENERATED_FEMALE_INVALID:${JSON.stringify({ inspection, expected })}`,
    )
  }
}

export function buildOpenGridDetachableCornerSeatFromReference(
  reference: Shape3D,
): Shape3D {
  assertReference(reference, 'male')
  let result: Shape3D | null = reference.clone()
  try {
    result = cutDetachableCornerSeatIndicator(result)
    assertGeneratedMale(result)
    const generated = result
    result = null
    return generated
  } finally {
    deleteShape(result)
  }
}

export function buildOpenGridDetachableCornerSeatHolderFromReference(
  reference: Shape3D,
): Shape3D {
  assertReference(reference, 'female')
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  const extensionHeight =
    configuration.female.depth - configuration.femaleReference.depth
  const topFaces: Face[] = []
  for (const face of reference.faces) {
    const boundingBox = face.boundingBox
    try {
      const [minimum, maximum] = boundingBox.bounds as [
        [number, number, number],
        [number, number, number],
      ]
      const isTopFace =
        face.surface.surfaceType === 'PLANE' &&
        Math.abs(minimum[2] - configuration.femaleReference.sourceMaxZ) <=
          configuration.geometryTolerance &&
        Math.abs(maximum[2] - configuration.femaleReference.sourceMaxZ) <=
          configuration.geometryTolerance
      if (isTopFace) {
        topFaces.push(face)
      } else {
        deleteShape(face)
      }
    } finally {
      boundingBox.delete()
    }
  }
  if (topFaces.length === 0) {
    throw new Error('OPENGRID_DETACHABLE_CORNER_SEAT_HOLDER_TOP_FACE_MISSING')
  }

  const fusionOverlap = configuration.geometryTolerance / 2
  const extrusionVector = new Vector([0, 0, extensionHeight + fusionOverlap])
  let holder: Shape3D | null = copySingleSolid(reference)
  try {
    for (const face of topFaces) {
      let extrusionFace: Face | null = null
      let extension: Shape3D | null = null
      try {
        extrusionFace = face.translateZ(-fusionOverlap)
        extension = runGeometryStage(
          'OPENGRID_DETACHABLE_CORNER_SEAT_HOLDER_EXTRUSION_FAILED',
          () => basicFaceExtrusion(extrusionFace!, extrusionVector),
        )
        holder = replaceOwnedShape(
          holder,
          runGeometryStage(
            'OPENGRID_DETACHABLE_CORNER_SEAT_HOLDER_FUSION_FAILED',
            () => fuseWithoutSimplifying(holder!, extension!),
          ),
        )
      } finally {
        deleteShape(extension)
        deleteShape(extrusionFace)
      }
    }
    assertGeneratedFemale(holder)
    const generated = holder
    holder = null
    return generated
  } finally {
    deleteShape(holder)
    topFaces.forEach(deleteShape)
    extrusionVector.delete()
  }
}

async function importReference(
  blob: Blob,
  kind: ReferenceKind,
): Promise<Shape3D> {
  let imported: Shape3D | null = null
  try {
    imported = (await importSTEP(blob)).asShape3D()
    assertReference(imported, kind)
    return imported
  } catch (error) {
    deleteShape(imported)
    if (
      error instanceof Error &&
      error.message.startsWith('OPENGRID_DETACHABLE_CORNER_SEAT_')
    ) {
      throw error
    }
    throw new Error(
      `OPENGRID_DETACHABLE_CORNER_SEAT_${kind.toUpperCase()}_REFERENCE_INVALID`,
      { cause: error },
    )
  }
}

export function importOpenGridDetachableCornerSeatReference(
  blob: Blob,
): Promise<Shape3D> {
  return importReference(blob, 'male')
}

export function importOpenGridDetachableCornerSeatHolderReference(
  blob: Blob,
): Promise<Shape3D> {
  return importReference(blob, 'female')
}

export async function loadOpenGridDetachableCornerSeatReference(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPEN_GRID_DETACHABLE_CORNER_SEAT_REFERENCE_URL)
  if (!response.ok) {
    throw new Error('OPENGRID_DETACHABLE_CORNER_SEAT_REFERENCE_LOAD_FAILED')
  }
  return importOpenGridDetachableCornerSeatReference(await response.blob())
}

export async function loadOpenGridDetachableCornerSeatHolderReference(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(
    OPEN_GRID_DETACHABLE_CORNER_SEAT_HOLDER_REFERENCE_URL,
  )
  if (!response.ok) {
    throw new Error(
      'OPENGRID_DETACHABLE_CORNER_SEAT_HOLDER_REFERENCE_LOAD_FAILED',
    )
  }
  return importOpenGridDetachableCornerSeatHolderReference(
    await response.blob(),
  )
}

export function inspectOpenGridDetachableCornerSeatCompatibility(
  male: Shape3D,
  female: Shape3D,
): OpenGridDetachableCornerSeatCompatibilityReport {
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  let alignedHolder: Shape3D | null =
    buildOpenGridDetachableCornerSeatHolderFromReference(female)
  let intersection: Shape3D | null = null
  try {
    const alignmentZ =
      configuration.male.bodyHeight - configuration.female.sourceMinZ
    alignedHolder = replaceOwnedShape(
      alignedHolder,
      alignedHolder.translateZ(alignmentZ),
    )
    intersection = male.intersect(alignedHolder)
    return {
      male: inspectReference(male),
      female: inspectReference(female),
      intersectionVolume: measureVolume(intersection),
    }
  } finally {
    deleteShape(intersection)
    deleteShape(alignedHolder)
  }
}

export function assertOpenGridDetachableCornerSeatCompatibility(
  male: Shape3D,
  female: Shape3D,
): OpenGridDetachableCornerSeatCompatibilityReport {
  assertReference(male, 'male')
  assertReference(female, 'female')
  const report = inspectOpenGridDetachableCornerSeatCompatibility(male, female)
  if (
    report.intersectionVolume >
    OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance
  ) {
    throw new Error('OPENGRID_DETACHABLE_CORNER_SEAT_REFERENCE_COLLISION')
  }
  return report
}

export function buildOpenGridDetachableCornerSeatSocketVoid(
  holderReference: Shape3D,
): Shape3D {
  assertReference(holderReference, 'female')
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female
  const envelope = makeCylinder(
    configuration.outerDiameter / 2 - configuration.hostOverlap,
    configuration.depth,
    [0, 0, configuration.sourceMinZ],
  )
  const holder =
    buildOpenGridDetachableCornerSeatHolderFromReference(holderReference)
  try {
    const socketVoid = envelope.cut(holder)
    const volume = measureVolume(socketVoid)
    if (!Number.isFinite(volume) || volume <= 0 || !isBRepValid(socketVoid)) {
      deleteShape(socketVoid)
      throw new Error('OPENGRID_DETACHABLE_CORNER_SEAT_SOCKET_VOID_INVALID')
    }
    return socketVoid
  } finally {
    deleteShape(holder)
    deleteShape(envelope)
  }
}

function replaceOwnedShape(current: Shape3D, next: Shape3D): Shape3D {
  if (next !== current) deleteShape(current)
  return next
}

function placeOpenGridDetachableCornerSeatShapeAtDatum(
  source: Shape3D,
  placement: OpenGridDetachableCornerSeatSocketPlacement,
  sourceMinZ: number,
): Shape3D {
  let placed: Shape3D | null = null
  try {
    placed = source.clone()
    placed = replaceOwnedShape(placed, placed.translateZ(-sourceMinZ))
    if (placement.rotationDegrees !== 0) {
      placed = replaceOwnedShape(
        placed,
        placed.rotate(placement.rotationDegrees, [0, 0, 0], [0, 0, 1]),
      )
    }
    placed = replaceOwnedShape(
      placed,
      placed.translate(placement.center[0], placement.center[1], 0),
    )
    const result = placed
    placed = null
    return result
  } catch (error) {
    deleteShape(placed)
    throw error
  }
}

export function placeOpenGridDetachableCornerSeatSocketShape(
  source: Shape3D,
  placement: OpenGridDetachableCornerSeatSocketPlacement,
): Shape3D {
  return placeOpenGridDetachableCornerSeatShapeAtDatum(
    source,
    placement,
    OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.sourceMinZ,
  )
}

export function placeOpenGridDetachableCornerSeatMaleShape(
  source: Shape3D,
  placement: OpenGridDetachableCornerSeatSocketPlacement,
): Shape3D {
  return placeOpenGridDetachableCornerSeatShapeAtDatum(
    source,
    placement,
    OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male.bodyHeight,
  )
}
