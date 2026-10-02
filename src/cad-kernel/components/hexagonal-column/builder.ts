import {
  cast,
  Compound,
  getOC,
  importSTEP,
  isShape3D,
  makeSolid,
  makePolygon,
  Solid,
  type Shape3D,
  type Face,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForHexagonalColumn,
  HEXAGONAL_COLUMN_CONFIGURATION,
  validateHexagonalColumnParameters,
  type HexagonalColumnOrientation,
  type HexagonalColumnParameters,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'

export const hexagonalColumnReferenceUrl = new URL(
  './hexagonal.step',
  import.meta.url,
)

const ASSET_TOLERANCE = 0.01
const REFERENCE_LENGTH = 20

type PointTuple = [number, number, number]
type BoundsTuple = [PointTuple, PointTuple]
type ProfilePoint = readonly [number, number]

export const HEXAGONAL_COLUMN_PROFILES = {
  end: [
    [0, 2.21906],
    [1.921762, 1.10953],
    [1.921762, -1.10953],
    [0, -2.21906],
    [-1.921762, -1.10953],
    [-1.921762, 1.10953],
  ],
  body: [
    [-0.173205, 2.35],
    [0.173205, 2.35],
    [1.948557, 1.325],
    [2.121762, 1.025],
    [2.121762, -1.025],
    [1.948557, -1.325],
    [0.173205, -2.35],
    [-0.173205, -2.35],
    [-1.948557, -1.325],
    [-2.121762, -1.025],
    [-2.121762, 1.025],
    [-1.948557, 1.325],
  ],
} as const

export type HexagonalColumnBuildContext = {
  reference: Shape3D
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'columns' | 'steps'
  }) => void
  reportPhase?: (
    phase: 'prototype-build' | 'clone-translate-compound',
    durationMs: number,
  ) => void
  compoundBuilder?: (shapes: Shape3D[]) => Shape3D
}

export type HexagonalColumnPrototypeOptions = {
  crossSectionRotationDegrees?: number
  startTransitionLength?: number
  endTransitionLength?: number
}

class OwnedShapeGroup {
  private readonly shapes = new Set<Shape3D>()

  add(shape: Shape3D): void {
    this.shapes.add(shape)
  }

  remove(shape: Shape3D): void {
    this.shapes.delete(shape)
  }

  release(shape: Shape3D): void {
    if (!this.shapes.delete(shape)) return
    deleteShape(shape)
  }

  dispose(): void {
    for (const shape of this.shapes) deleteShape(shape)
    this.shapes.clear()
  }
}

function assertGenerationCurrent(context: HexagonalColumnBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: HexagonalColumnBuildContext,
): Promise<void> {
  await context.yieldToEventLoop?.()
}

function readShapeBounds(shape: Shape3D): BoundsTuple {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as BoundsTuple
  } finally {
    boundingBox.delete()
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= ASSET_TOLERANCE
}

function hasBounds(shape: Shape3D, expected: BoundsTuple): boolean {
  const [actualMin, actualMax] = readShapeBounds(shape)
  return (
    actualMin.every((value, index) => isClose(value, expected[0][index])) &&
    actualMax.every((value, index) => isClose(value, expected[1][index]))
  )
}

function assertMillimetreStepUnits(source: string): void {
  const compactSource = source.replace(/\s+/g, '')
  if (
    !compactSource.includes(
      'LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.)',
    )
  ) {
    throw new Error('HEXAGONAL_COLUMN_ASSET_INVALID_UNITS')
  }
}

function profilePointsAtStation(
  shape: Shape3D,
  station: number,
): ProfilePoint[] {
  const points: ProfilePoint[] = []

  for (const edge of shape.edges) {
    const start = edge.startPoint
    let end: typeof start | null = null
    try {
      end = edge.endPoint
      for (const point of [start, end]) {
        if (!point || !isClose(point.x, station)) continue
        if (
          !points.some(
            ([existingY, existingZ]) =>
              isClose(existingY, point.y) && isClose(existingZ, point.z),
          )
        ) {
          points.push([point.y, point.z])
        }
      }
    } finally {
      start.delete()
      end?.delete()
      edge.delete()
    }
  }

  return points
}

function assertProfileAtStation(
  shape: Shape3D,
  station: number,
  expected: readonly ProfilePoint[],
): void {
  const actual = profilePointsAtStation(shape, station)
  const matches =
    actual.length === expected.length &&
    expected.every(([expectedY, expectedZ]) =>
      actual.some(
        ([actualY, actualZ]) =>
          isClose(actualY, expectedY) && isClose(actualZ, expectedZ),
      ),
    )

  if (!matches) {
    throw new Error(`HEXAGONAL_COLUMN_ASSET_INVALID_PROFILE:${station}`)
  }
}

function asSingleSolid(shape: Shape3D): Solid {
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
    for (const solid of solids) deleteShape(solid)
    throw new Error('HEXAGONAL_COLUMN_ASSET_NOT_SINGLE_SOLID')
  }
  return solids[0]
}

function assertReferenceGeometry(shape: Shape3D): void {
  const expected: BoundsTuple = [
    [
      0,
      -HEXAGONAL_COLUMN_CONFIGURATION.referenceCrossSectionExtentY / 2,
      -2.35,
    ],
    [
      REFERENCE_LENGTH,
      HEXAGONAL_COLUMN_CONFIGURATION.referenceCrossSectionExtentY / 2,
      2.35,
    ],
  ]
  if (!hasBounds(shape, expected)) {
    throw new Error('HEXAGONAL_COLUMN_ASSET_INVALID_BOUNDS')
  }

  for (const edge of shape.edges) {
    try {
      if (edge.geomType !== 'LINE') {
        throw new Error('HEXAGONAL_COLUMN_ASSET_INVALID_EDGE')
      }
    } finally {
      edge.delete()
    }
  }

  assertProfileAtStation(shape, 0, HEXAGONAL_COLUMN_PROFILES.end)
  assertProfileAtStation(
    shape,
    HEXAGONAL_COLUMN_CONFIGURATION.endTransitionLength,
    HEXAGONAL_COLUMN_PROFILES.body,
  )
  assertProfileAtStation(
    shape,
    REFERENCE_LENGTH - HEXAGONAL_COLUMN_CONFIGURATION.endTransitionLength,
    HEXAGONAL_COLUMN_PROFILES.body,
  )
  assertProfileAtStation(shape, REFERENCE_LENGTH, HEXAGONAL_COLUMN_PROFILES.end)
}

function asPoint(station: number, [y, z]: ProfilePoint): PointTuple {
  return [station, y, z]
}

function orientPrototype(
  shape: Shape3D,
  height: number,
  orientation: HexagonalColumnOrientation,
): Shape3D {
  if (orientation === 'standing') return shape

  let lyingShape: Shape3D | null = shape
  try {
    lyingShape = lyingShape.rotate(90, [0, 0, 0], [0, 1, 0])
    lyingShape = lyingShape.translate(-height / 2, 0, 0)
    lyingShape = lyingShape.translate(
      0,
      0,
      HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX / 2,
    )
    return lyingShape
  } catch (error) {
    deleteShape(lyingShape)
    throw error
  }
}

function buildLocalPrototype(
  height: number,
  orientation: HexagonalColumnOrientation,
  options: HexagonalColumnPrototypeOptions = {},
): Shape3D {
  const {
    crossSectionRotationDegrees = HEXAGONAL_COLUMN_CONFIGURATION.crossSectionRotationDegrees,
    startTransitionLength = HEXAGONAL_COLUMN_CONFIGURATION.endTransitionLength,
    endTransitionLength = HEXAGONAL_COLUMN_CONFIGURATION.endTransitionLength,
  } = options
  if (
    startTransitionLength < 0 ||
    endTransitionLength < 0 ||
    startTransitionLength + endTransitionLength >= height
  ) {
    throw new Error('HEXAGONAL_COLUMN_INVALID_TRANSITION')
  }
  const endStart = HEXAGONAL_COLUMN_PROFILES.end.map((point) =>
    asPoint(0, point),
  )
  const bodyStart = HEXAGONAL_COLUMN_PROFILES.body.map((point) =>
    asPoint(startTransitionLength, point),
  )
  const bodyEnd = HEXAGONAL_COLUMN_PROFILES.body.map((point) =>
    asPoint(height - endTransitionLength, point),
  )
  const endEnd = HEXAGONAL_COLUMN_PROFILES.end.map((point) =>
    asPoint(height, point),
  )
  const faces: Face[] = []

  function addFace(points: PointTuple[]): void {
    faces.push(makePolygon(points))
  }

  function addSixToTwelveTransition(
    endProfile: PointTuple[],
    bodyProfile: PointTuple[],
  ): void {
    for (let index = 0; index < endProfile.length; index += 1) {
      const nextEnd = (index + 1) % endProfile.length
      const bodyStart = index * 2
      const bodyMiddle = bodyStart + 1
      const bodyEnd = (bodyStart + 2) % bodyProfile.length
      addFace([
        endProfile[index],
        bodyProfile[bodyStart],
        bodyProfile[bodyMiddle],
      ])
      addFace([
        endProfile[index],
        endProfile[nextEnd],
        bodyProfile[bodyEnd],
        bodyProfile[bodyMiddle],
      ])
    }
  }

  if (startTransitionLength > 0) {
    addFace([...endStart].reverse())
    addSixToTwelveTransition(endStart, bodyStart)
  } else {
    addFace([...bodyStart].reverse())
  }

  if (endTransitionLength > 0) {
    addSixToTwelveTransition(endEnd, bodyEnd)
    addFace(endEnd)
  } else {
    addFace(bodyEnd)
  }

  for (let index = 0; index < bodyStart.length; index += 1) {
    const next = (index + 1) % bodyStart.length
    addFace([bodyStart[index], bodyStart[next], bodyEnd[next], bodyEnd[index]])
  }

  let localShape: Shape3D | null = null
  try {
    const built = makeSolid(faces)
    if (!isShape3D(built)) {
      throw new Error('HEXAGONAL_COLUMN_PROTOTYPE_NOT_3D')
    }
    localShape = built
    localShape = localShape.rotate(-90, [0, 0, 0], [0, 1, 0])
    localShape = localShape.rotate(
      crossSectionRotationDegrees,
      [0, 0, 0],
      [0, 0, 1],
    )
    localShape = orientPrototype(localShape, height, orientation)
    return localShape
  } catch (error) {
    deleteShape(localShape)
    throw error
  } finally {
    for (const face of faces) deleteShape(face)
  }
}

export function buildHexagonalColumnPrototype(
  height: number,
  orientation: HexagonalColumnOrientation = 'standing',
  options: HexagonalColumnPrototypeOptions = {},
): Shape3D {
  return buildLocalPrototype(height, orientation, options)
}

function assembleCompound(
  shapes: Shape3D[],
  owned: OwnedShapeGroup,
  compoundBuilder?: (shapes: Shape3D[]) => Shape3D,
): Shape3D {
  if (compoundBuilder) {
    const result = compoundBuilder(shapes)
    if (result.constructor.name !== 'Compound') {
      throw new Error('HEXAGONAL_COLUMN_COMPOUND_INVALID')
    }
    for (const shape of shapes) owned.remove(shape)
    return result
  }

  const oc = getOC()
  const builder = new oc.TopoDS_Builder()
  const compound = new oc.TopoDS_Compound()
  let result: Shape3D | null = null

  try {
    builder.MakeCompound(compound)
    for (const shape of shapes) {
      builder.Add(compound, shape.wrapped)
      owned.remove(shape)
      deleteShape(shape)
    }

    const castResult = cast(compound)
    if (!isShape3D(castResult) || castResult.constructor.name !== 'Compound') {
      deleteShape(castResult)
      throw new Error('HEXAGONAL_COLUMN_COMPOUND_INVALID')
    }
    result = castResult
    return castResult
  } catch (error) {
    deleteShape(result)
    if (!result) deleteShape(new Compound(compound))
    throw error
  } finally {
    builder.delete()
  }
}

function translatePrototype(
  prototype: Shape3D,
  y: number,
  owned: OwnedShapeGroup,
): Shape3D {
  const clone = prototype.clone()
  owned.add(clone)
  try {
    const translated = clone.translate(0, y, 0)
    owned.remove(clone)
    owned.add(translated)
    return translated
  } catch (error) {
    deleteShape(clone)
    owned.remove(clone)
    throw error
  }
}

export async function importHexagonalColumnReference(
  blob: Blob,
): Promise<Shape3D> {
  let source: string
  try {
    source = await blob.text()
  } catch {
    throw new Error('HEXAGONAL_COLUMN_ASSET_INVALID')
  }
  assertMillimetreStepUnits(source)

  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('HEXAGONAL_COLUMN_ASSET_INVALID')
  }

  let solid: Solid | null = null
  try {
    solid = asSingleSolid(imported)
    assertReferenceGeometry(solid)
    return solid
  } catch (error) {
    deleteShape(solid)
    throw error
  } finally {
    if (solid !== imported) deleteShape(imported)
  }
}

export async function loadHexagonalColumnReference(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(hexagonalColumnReferenceUrl)
  if (!response.ok) throw new Error('HEXAGONAL_COLUMN_ASSET_LOAD_FAILED')
  return importHexagonalColumnReference(await response.blob())
}

export async function buildHexagonalColumn(
  parameters: HexagonalColumnParameters,
  context: HexagonalColumnBuildContext,
): Promise<Shape3D> {
  const validation = validateHexagonalColumnParameters(parameters)
  if (!validation.valid) {
    throw new Error('INVALID_INPUT')
  }

  const owned = new OwnedShapeGroup()
  let prototype: Shape3D | null = null
  try {
    assertGenerationCurrent(context)
    if (!context.reference) throw new Error('HEXAGONAL_COLUMN_ASSET_INVALID')

    const prototypeStartedAt = performance.now()
    prototype = buildLocalPrototype(parameters.height, parameters.orientation)
    context.reportPhase?.(
      'prototype-build',
      performance.now() - prototypeStartedAt,
    )
    owned.add(prototype)
    assertGenerationCurrent(context)

    const pitch =
      HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentY + parameters.gap
    const firstCenter = -((parameters.count - 1) * pitch) / 2
    const columns: Shape3D[] = []
    const assemblyStartedAt = performance.now()

    for (let index = 0; index < parameters.count; index += 1) {
      assertGenerationCurrent(context)
      const column = translatePrototype(
        prototype,
        firstCenter + index * pitch,
        owned,
      )
      columns.push(column)
      context.reportProgress?.({
        stage: 'building',
        completed: index + 1,
        total: parameters.count,
        unit: 'columns',
      })
      await yieldAtSafeBoundary(context)
      assertGenerationCurrent(context)
    }

    owned.release(prototype)
    prototype = null
    assertGenerationCurrent(context)
    const compound = assembleCompound(columns, owned, context.compoundBuilder)
    context.reportPhase?.(
      'clone-translate-compound',
      performance.now() - assemblyStartedAt,
    )
    owned.dispose()
    return compound
  } catch (error) {
    owned.dispose()
    throw error
  }
}

export function referenceBoundsForHexagonalColumn(): BoundsTuple {
  return [
    [
      0,
      -HEXAGONAL_COLUMN_CONFIGURATION.referenceCrossSectionExtentY / 2,
      -2.35,
    ],
    [
      REFERENCE_LENGTH,
      HEXAGONAL_COLUMN_CONFIGURATION.referenceCrossSectionExtentY / 2,
      2.35,
    ],
  ]
}

export function buildHexagonalColumnBounds(
  parameters: HexagonalColumnParameters,
): BoundsTuple {
  const bounds = boundsForHexagonalColumn(parameters)
  return [bounds.min, bounds.max]
}
