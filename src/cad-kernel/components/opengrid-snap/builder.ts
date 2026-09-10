import {
  deserializeShape,
  getOC,
  importSTEP,
  makeBox,
  makeCompound,
  makeCylinder,
  measureVolume,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  OPENGRID_SNAP_CONFIGURATION,
  openGridSnapCanonicalAxesFor,
  type ModelBounds,
  type OpenGridSnapParameters,
  type OpenGridSnapFootprint,
  type OpenGridSnapProfile,
  type OpenGridSnapVariant,
} from '../../../cad-contract/units'
import {
  openGridSnapLocatingHoleCentersFor,
  openGridSnapProfileFor,
  type OpenGridSnapProfileDefinition,
} from './profile'
import { buildOpenGridSnapBoundaryObstacle } from './boundary'
import { transformShapeXY, type XYScaleTransform } from '../../transform'
import {
  measureBoolean,
  measureBooleanInScope,
  type BooleanOperationScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import {
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS,
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_AXIS,
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_DEGREES,
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_ORIGIN,
  openGridSnapOpenConnectAnchorForXYTransform,
  openGridSnapOpenConnectNotchSegmentsFor,
  type OpenGridSnapOpenConnectAnchor,
} from './openconnect'

export const OPENGRID_SNAP_REFERENCE_URLS: Readonly<
  Record<OpenGridSnapProfile, Record<OpenGridSnapVariant, URL>>
> = {
  Standard: {
    Full: openGridSnapProfileFor('Standard', 'Full').assetUrl,
    Lite: openGridSnapProfileFor('Standard', 'Lite').assetUrl,
  },
  Directional: {
    Full: openGridSnapProfileFor('Directional', 'Full').assetUrl,
    Lite: openGridSnapProfileFor('Directional', 'Lite').assetUrl,
  },
}

export type OpenGridSnapFixedFootprint = Extract<
  OpenGridSnapFootprint,
  'half' | 'quarter'
>

export const OPENGRID_SNAP_FIXED_FOOTPRINT_URLS: Readonly<
  Record<OpenGridSnapFixedFootprint, string>
> = {
  half: '/downloads/snap-half.step',
  quarter: '/downloads/snap-quarter.step',
}

export const OPENGRID_SNAP_OPEN_CONNECT_HEAD_URL = new URL(
  './assets/openconnect-head.step',
  import.meta.url,
)

const ASSET_TOLERANCE = 0.05
const OPEN_CONNECT_NOTCH_CUT_EPSILON = 0.01

type PointTuple = [number, number, number]
type BoundsTuple = [PointTuple, PointTuple]

export type OpenGridSnapBuildContext = {
  getOpenGridSnapReference?: (
    variant: OpenGridSnapVariant,
    profile: OpenGridSnapProfile,
  ) => Promise<Shape3D>
  getOpenGridSnapFixedFootprint?: (
    footprint: OpenGridSnapFixedFootprint,
  ) => Promise<Shape3D>
  getOpenGridSnapOpenConnectHead?: () => Promise<Shape3D>
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  booleanOperations?: BooleanOperationReporter
}

export type OpenGridSnapReferenceReport = {
  variant: OpenGridSnapVariant
  profile: OpenGridSnapProfile
  bounds: ModelBounds
  solidCount: number
  height: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not hide the original import or geometry error.
  }
}

function deleteDistinctShapes(shapes: Array<Shape3D | null | undefined>): void {
  const deleted = new Set<Shape3D>()
  for (const shape of shapes) {
    if (!shape || deleted.has(shape)) continue
    deleted.add(shape)
    deleteShape(shape)
  }
}

function assertGenerationCurrent(context: OpenGridSnapBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

function readBounds(shape: Shape3D): ModelBounds {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as BoundsTuple
    return { min: [...min], max: [...max] }
  } finally {
    boundingBox.delete()
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= ASSET_TOLERANCE
}

function boundsMatch(actual: ModelBounds, expected: ModelBounds): boolean {
  return [...actual.min, ...actual.max].every((coordinate, index) => {
    const expectedCoordinate = [...expected.min, ...expected.max][index]
    return isClose(coordinate, expectedCoordinate)
  })
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  let count = 0
  try {
    while (explorer.More()) {
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

function assertMillimetreStepUnits(source: string): void {
  const compactSource = source.replace(/\s+/g, '')
  if (
    !compactSource.includes(
      'LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.)',
    )
  ) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_UNITS')
  }
}

function assertReferenceGeometry(
  shape: Shape3D,
  variant: OpenGridSnapVariant,
  profile: OpenGridSnapProfile,
): OpenGridSnapReferenceReport {
  const definition = openGridSnapProfileFor(profile, variant)
  const bounds = readBounds(shape)
  if (!boundsMatch(bounds, definition.expectedBounds)) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_BOUNDS')
  }

  const solidCount = countSolids(shape)
  if (solidCount !== definition.expectedSolidCount) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_SOLID_COUNT')
  }
  if (profile === 'Standard') {
    if (!isClose(bounds.min[0], -bounds.max[0])) {
      throw new Error('OPENGRID_SNAP_ASSET_NOT_CENTERED_X')
    }
    if (!isClose(bounds.min[1], -bounds.max[1])) {
      throw new Error('OPENGRID_SNAP_ASSET_NOT_CENTERED_Y')
    }
  }
  if (!isClose(bounds.min[2], definition.expectedBounds.min[2])) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_BASE_Z')
  }

  return {
    variant,
    profile,
    bounds,
    solidCount,
    height: bounds.max[2] - bounds.min[2],
  }
}

function assertFixedFootprintGeometry(shape: Shape3D): void {
  const bounds = readBounds(shape)
  const coordinates = [...bounds.min, ...bounds.max]
  if (
    coordinates.some((coordinate) => !Number.isFinite(coordinate)) ||
    bounds.max[0] <= bounds.min[0] ||
    bounds.max[1] <= bounds.min[1] ||
    bounds.max[2] <= bounds.min[2]
  ) {
    throw new Error('OPENGRID_SNAP_FIXED_ASSET_INVALID_BOUNDS')
  }
  if (countSolids(shape) === 0) {
    throw new Error('OPENGRID_SNAP_FIXED_ASSET_EMPTY')
  }
}

function assertOpenConnectHeadGeometry(shape: Shape3D): void {
  const bounds = readBounds(shape)
  if (!boundsMatch(bounds, OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS)) {
    throw new Error('OPENGRID_SNAP_OPEN_CONNECT_HEAD_INVALID_BOUNDS')
  }
  if (countSolids(shape) !== 1) {
    throw new Error('OPENGRID_SNAP_OPEN_CONNECT_HEAD_INVALID_SOLID_COUNT')
  }
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
    for (const solid of solids) deleteShape(solid)
    throw error
  } finally {
    explorer.delete()
  }
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
  if (centralIndex < 0) throw new Error('OPENGRID_SNAP_CENTRAL_SOLID_MISSING')
  return centralIndex
}

function axisSpan(bounds: ModelBounds, axis: 0 | 1): number {
  return bounds.max[axis] - bounds.min[axis]
}

function canonicalCenter(
  definition: OpenGridSnapProfileDefinition,
): [number, number] {
  return [
    (definition.expectedBounds.min[0] + definition.expectedBounds.max[0]) / 2,
    (definition.expectedBounds.min[1] + definition.expectedBounds.max[1]) / 2,
  ]
}

function xyScaleTransformFor(
  source: Shape3D,
  targetBounds: ModelBounds,
  definition: OpenGridSnapProfileDefinition,
): XYScaleTransform {
  const sourceBounds = readBounds(source)
  const sourceSpanX = axisSpan(sourceBounds, 0)
  const sourceSpanY = axisSpan(sourceBounds, 1)
  const targetSpanX = axisSpan(targetBounds, 0)
  const targetSpanY = axisSpan(targetBounds, 1)
  if (
    !Number.isFinite(sourceSpanX) ||
    !Number.isFinite(sourceSpanY) ||
    !Number.isFinite(targetSpanX) ||
    !Number.isFinite(targetSpanY) ||
    sourceSpanX <= 0 ||
    sourceSpanY <= 0 ||
    targetSpanX <= 0 ||
    targetSpanY <= 0
  ) {
    throw new Error('OPENGRID_SNAP_XY_SCALE_BOUNDS_INVALID')
  }

  const [centerX, centerY] = canonicalCenter(definition)
  return {
    scaleX: targetSpanX / sourceSpanX,
    scaleY: targetSpanY / sourceSpanY,
    centerX,
    centerY,
  }
}

function cloneImportedAssembly(shape: Shape3D): Shape3D {
  return deserializeShape(shape.serialize()).asShape3D()
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

function fuseCutter(
  current: Shape3D,
  extension: Shape3D,
  scope: ReturnType<BooleanOperationReporter['createScope']> | undefined,
): Shape3D {
  const fused = measureBooleanInScope(scope, 'fuse', () =>
    current.fuse(extension, { optimisation: 'none' }),
  )
  if (fused !== current) deleteShape(current)
  deleteShape(extension)
  return fused
}

function featureCutterHeight(
  definition: OpenGridSnapProfileDefinition,
): number {
  return definition.expectedBounds.max[2] - definition.expectedBounds.min[2] + 2
}

function makeCenterRemoverCutter(
  definition: OpenGridSnapProfileDefinition,
  scope: BooleanOperationScope | undefined,
): Shape3D {
  const baseZ = definition.expectedBounds.min[2] - 1
  const topZ = definition.expectedBounds.max[2] + 1
  const lower = makeBox(
    [
      -definition.centerRemoverLowerHalfWidth,
      -definition.centerRemoverHalfDepth,
      baseZ,
    ],
    [
      definition.centerRemoverLowerHalfWidth,
      definition.centerRemoverHalfDepth,
      definition.centerRemoverStepZ,
    ],
  )
  const upper = makeBox(
    [
      -definition.centerRemoverUpperHalfWidth,
      -definition.centerRemoverHalfDepth,
      definition.centerRemoverStepZ,
    ],
    [
      definition.centerRemoverUpperHalfWidth,
      definition.centerRemoverHalfDepth,
      topZ,
    ],
  )
  let cutter: Shape3D | null = null
  let centerPassage: Shape3D | null = null
  try {
    const steppedCutter = measureBooleanInScope(scope, 'fuse', () =>
      lower.fuse(upper),
    )
    cutter = steppedCutter
    if (steppedCutter !== lower) deleteShape(lower)
    deleteShape(upper)

    centerPassage = makeCylinder(definition.centerPassageRadius, topZ - baseZ, [
      0,
      0,
      baseZ,
    ])
    const completeCutter = fuseCutter(steppedCutter, centerPassage, scope)
    cutter = completeCutter
    centerPassage = null
    return completeCutter
  } catch (error) {
    deleteDistinctShapes([cutter, centerPassage, lower, upper])
    throw error
  }
}

export function makeOpenGridSnapCenterRemoverCutter(
  variant: OpenGridSnapVariant,
  profile: OpenGridSnapProfile = 'Standard',
  scope?: BooleanOperationScope,
): Shape3D {
  return makeCenterRemoverCutter(
    openGridSnapProfileFor(profile, variant),
    scope,
  )
}

function makeLocatingHolesCutter(
  definition: OpenGridSnapProfileDefinition,
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  const baseZ = definition.expectedBounds.min[2] - 1
  const holeHeight = featureCutterHeight(definition)
  const halfSpan = definition.locatingHoleSlotInnerHalfSpan
  const slotHalfWidth = definition.locatingHoleSlotHalfWidth
  const slotStepZ = definition.locatingHoleSlotStepZ
  const holeCenter = definition.locatingHoleCenter
  const centers = openGridSnapLocatingHoleCentersFor(definition)
  const firstCenter = centers[0]
  if (!firstCenter)
    throw new Error('OPENGRID_SNAP_LOCATING_HOLE_CENTER_MISSING')

  let cutter: Shape3D = makeCylinder(
    definition.locatingHoleRadius,
    holeHeight,
    [firstCenter[0], firstCenter[1], baseZ],
  )
  const fuseScope = reporter?.createScope(centers.length + 3)
  for (const [x, y] of centers.slice(1)) {
    cutter = fuseCutter(
      cutter,
      makeCylinder(definition.locatingHoleRadius, holeHeight, [x, y, baseZ]),
      fuseScope,
    )
  }

  for (const sign of [-1, 1] as const) {
    const bandCenter = sign * holeCenter
    cutter = fuseCutter(
      cutter,
      makeBox(
        [-halfSpan, bandCenter - slotHalfWidth, baseZ],
        [halfSpan, bandCenter + slotHalfWidth, slotStepZ],
      ),
      fuseScope,
    )
    cutter = fuseCutter(
      cutter,
      makeBox(
        [bandCenter - slotHalfWidth, -halfSpan, baseZ],
        [bandCenter + slotHalfWidth, halfSpan, slotStepZ],
      ),
      fuseScope,
    )
  }

  return cutter
}

function magnetHolePlanHalfExtents(
  parameters: OpenGridSnapParameters,
): [number, number] {
  if (parameters.magnetHoleShape === 'square') {
    return [parameters.magnetHoleLength / 2, parameters.magnetHoleWidth / 2]
  }
  const radius = parameters.magnetHoleDiameter / 2
  return [radius, radius]
}

function makeMagnetHoleCutter(
  parameters: OpenGridSnapParameters,
  definition: OpenGridSnapProfileDefinition,
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  if (parameters.magnetHoleShape === 'none') {
    throw new Error('OPENGRID_SNAP_MAGNET_HOLE_DISABLED')
  }

  const baseZ = definition.expectedBounds.min[2] - 1
  const topZ = definition.expectedBounds.min[2] + parameters.magnetHoleThickness
  const [halfX, halfY] = magnetHolePlanHalfExtents(parameters)
  let cutter: Shape3D
  if (parameters.magnetHoleShape === 'square') {
    cutter = makeBox([-halfX, -halfY, baseZ], [halfX, halfY, topZ])
  } else {
    cutter = makeCylinder(parameters.magnetHoleDiameter / 2, topZ - baseZ, [
      0,
      0,
      baseZ,
    ])
  }

  const halfOpeningWidth = definition.magnetHoleOpeningWidth / 2
  const reach = definition.magnetHoleConnectorReachByDirection
  // Overlap the pocket slightly so round pockets are connected by an area,
  // not only tangent at a single point on the circle.
  const connectorOverlap = Math.min(0.5, halfOpeningWidth)
  const slotStartX = halfX - connectorOverlap
  const slotStartY = halfY - connectorOverlap
  const fuseScope = reporter?.createScope(4)
  const slots = [
    makeBox(
      [slotStartX, -halfOpeningWidth, baseZ],
      [reach.positiveX, halfOpeningWidth, topZ],
    ),
    makeBox(
      [-reach.negativeX, -halfOpeningWidth, baseZ],
      [-slotStartX, halfOpeningWidth, topZ],
    ),
    makeBox(
      [-halfOpeningWidth, slotStartY, baseZ],
      [halfOpeningWidth, reach.positiveY, topZ],
    ),
    makeBox(
      [-halfOpeningWidth, -reach.negativeY, baseZ],
      [halfOpeningWidth, -slotStartY, topZ],
    ),
  ]

  try {
    for (const slot of slots) cutter = fuseCutter(cutter, slot, fuseScope)
    return cutter
  } catch (error) {
    deleteShape(cutter)
    for (const slot of slots) deleteShape(slot)
    throw error
  }
}

function applyBodyFeatures(
  body: Shape3D,
  parameters: OpenGridSnapParameters,
  definition: OpenGridSnapProfileDefinition,
  options: { applyLocatingHoles?: boolean } = {},
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  const supportsCornerHoles = definition.optionalFeatures.includes(
    'fourCornerLocatingHoles',
  )
  const supportsCenterRemover =
    definition.optionalFeatures.includes('centerRemoverHole')
  if (
    parameters.fourCornerLocatingHoles &&
    (!supportsCornerHoles ||
      definition.intrinsicFeatures.includes('fourCornerLocatingHoles'))
  ) {
    throw new Error('OPENGRID_SNAP_OPTIONAL_FEATURE_DUPLICATE')
  }
  if (
    parameters.centerRemoverHole &&
    (!supportsCenterRemover ||
      definition.intrinsicFeatures.includes('centerRemoverHole'))
  ) {
    throw new Error('OPENGRID_SNAP_OPTIONAL_FEATURE_DUPLICATE')
  }

  let result = body
  const appliesLocatingHoles =
    parameters.fourCornerLocatingHoles && options.applyLocatingHoles !== false
  const appliesCenterRemover = parameters.centerRemoverHole
  const cutTotal = Number(appliesLocatingHoles) + Number(appliesCenterRemover)
  const cutScope = cutTotal > 0 ? reporter?.createScope(cutTotal) : undefined
  const centerRemoverFuseScope = appliesCenterRemover
    ? reporter?.createScope(2)
    : undefined

  if (appliesLocatingHoles) {
    result = cutShape(
      result,
      makeLocatingHolesCutter(definition, reporter),
      cutScope,
    )
  }

  if (appliesCenterRemover) {
    result = cutShape(
      result,
      makeCenterRemoverCutter(definition, centerRemoverFuseScope),
      cutScope,
    )
  }

  return result
}

type StandardAssemblyParts = {
  body: Shape3D
  sideHolders: Shape3D[]
  snaps: Shape3D[]
}

function buildStandardAssemblyParts(
  reference: Shape3D,
  definition: OpenGridSnapProfileDefinition,
): StandardAssemblyParts {
  const assembly = cloneImportedAssembly(reference)
  const solids = extractSolids(assembly)
  try {
    if (solids.length !== definition.expectedSolidCount) {
      throw new Error('OPENGRID_SNAP_STANDARD_ASSEMBLY_INVALID')
    }
    const centralIndex = centralSolidIndex(solids)
    const body = solids[centralIndex]
    if (!body) throw new Error('OPENGRID_SNAP_SOLID_MISSING')
    const outerSolids = solids.filter((_, index) => index !== centralIndex)
    const snaps = outerSolids.filter((solid) => {
      const bounds = readBounds(solid)
      return bounds.min[2] >= definition.snapLayerMinZ - ASSET_TOLERANCE
    })
    const sideHolders = outerSolids.filter((solid) => {
      const bounds = readBounds(solid)
      return (
        !snaps.includes(solid) &&
        bounds.min[2] >= definition.sideHolderLayerMinZ - ASSET_TOLERANCE
      )
    })
    if (sideHolders.length !== 4 || snaps.length !== 4) {
      throw new Error('OPENGRID_SNAP_STANDARD_ASSEMBLY_PARTS_INVALID')
    }
    deleteShape(assembly)
    return { body, sideHolders, snaps }
  } catch (error) {
    deleteShape(assembly)
    for (const solid of solids) deleteShape(solid)
    throw error
  }
}

function transformStandardAssemblyParts(
  parts: StandardAssemblyParts,
  transform: XYScaleTransform,
): StandardAssemblyParts {
  const sourceSolids = [parts.body, ...parts.sideHolders, ...parts.snaps]
  const transformedSolids: Solid[] = []

  try {
    for (const solid of sourceSolids) {
      const transformed = transformShapeXY(solid, transform)
      transformedSolids.push(transformed)
    }
  } catch (error) {
    for (const solid of transformedSolids) deleteShape(solid)
    throw error
  } finally {
    for (const solid of sourceSolids) deleteShape(solid)
  }

  const body = transformedSolids[0]
  const sideHolders = transformedSolids.slice(1, 5)
  const snaps = transformedSolids.slice(5)
  if (!body || sideHolders.length !== 4 || snaps.length !== 4) {
    for (const solid of transformedSolids) deleteShape(solid)
    throw new Error('OPENGRID_SNAP_STANDARD_TRANSFORM_PARTS_INVALID')
  }

  return { body, sideHolders, snaps }
}

function composeStandardAssembly(
  parts: StandardAssemblyParts,
  parameters: OpenGridSnapParameters,
  definition: OpenGridSnapProfileDefinition,
  applyOptionalFeatures: boolean,
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  let body = parts.body
  if (applyOptionalFeatures) {
    body = applyBodyFeatures(parts.body, parameters, definition, {}, reporter)
  }
  const assemblyParts: StandardAssemblyParts = {
    body,
    sideHolders: parts.sideHolders,
    snaps: parts.snaps,
  }
  if (applyOptionalFeatures && parameters.magnetHoleShape !== 'none') {
    const members = [
      assemblyParts.body,
      ...assemblyParts.sideHolders,
      ...assemblyParts.snaps,
    ]
    const cutScope = reporter?.createScope(members.length)
    let magnetCutter: Shape3D | null = null
    try {
      magnetCutter = makeMagnetHoleCutter(parameters, definition, reporter)
      for (let index = 0; index < members.length; index += 1) {
        const member = members[index]
        if (!member) continue
        const cutMember = cutShape(
          member,
          cloneImportedAssembly(magnetCutter),
          cutScope,
        )
        members[index] = cutMember
      }
      const cutBody = members[0]
      if (!cutBody) throw new Error('OPENGRID_SNAP_MAGNET_BODY_MISSING')
      assemblyParts.body = cutBody
      assemblyParts.sideHolders = members.slice(1, 5)
      assemblyParts.snaps = members.slice(5)
    } catch (error) {
      deleteDistinctShapes(members)
      throw error
    } finally {
      deleteShape(magnetCutter)
    }
  }
  const finalOutput: Shape3D[] = [
    assemblyParts.body,
    ...assemblyParts.sideHolders,
    ...assemblyParts.snaps,
  ]
  try {
    return makeCompound(finalOutput).asShape3D()
  } catch (error) {
    for (const shape of finalOutput) deleteShape(shape)
    throw error
  }
}

function buildDirectionalAssembly(
  reference: Shape3D,
  transform: XYScaleTransform | null,
): Shape3D {
  const assembly = cloneImportedAssembly(reference)
  if (!transform) {
    return assembly
  }

  const transformed = transformShapeXY(assembly, transform)
  deleteShape(assembly)
  return transformed
}

function applyDirectionalFeatures(
  assembly: Shape3D,
  parameters: OpenGridSnapParameters,
  definition: OpenGridSnapProfileDefinition,
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  if (parameters.magnetHoleShape !== 'none') {
    return cutShape(
      assembly,
      makeMagnetHoleCutter(parameters, definition, reporter),
      reporter?.createScope(1),
    )
  }
  if (!parameters.fourCornerLocatingHoles && !parameters.centerRemoverHole) {
    return assembly
  }

  const solids = extractSolids(assembly)
  if (solids.length !== definition.expectedSolidCount) {
    deleteShape(assembly)
    for (const solid of solids) deleteShape(solid)
    throw new Error('OPENGRID_SNAP_DIRECTIONAL_ASSEMBLY_INVALID')
  }
  const solid = solids[0]
  if (!solid) {
    deleteShape(assembly)
    throw new Error('OPENGRID_SNAP_SOLID_MISSING')
  }
  for (const extraSolid of solids.slice(1)) deleteShape(extraSolid)
  deleteShape(assembly)
  return applyBodyFeatures(solid, parameters, definition, {}, reporter)
}

function buildFeatureAssembly(
  reference: Shape3D,
  parameters: OpenGridSnapParameters,
  targetBounds: ModelBounds,
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  const definition = openGridSnapProfileFor(
    parameters.profile,
    parameters.variant,
  )
  const transform =
    parameters.offset > 0
      ? xyScaleTransformFor(reference, targetBounds, definition)
      : null

  if (parameters.profile === 'Directional') {
    const assembly = buildDirectionalAssembly(reference, transform)
    return parameters.footprint === 'full'
      ? applyDirectionalFeatures(assembly, parameters, definition, reporter)
      : assembly
  }

  let parts = buildStandardAssemblyParts(reference, definition)
  if (transform) {
    parts = transformStandardAssemblyParts(parts, transform)
  }
  return composeStandardAssembly(
    parts,
    parameters,
    definition,
    parameters.footprint === 'full',
    reporter,
  )
}

function openConnectAnchorFor(
  reference: Shape3D,
  parameters: OpenGridSnapParameters,
  targetBounds: ModelBounds,
): OpenGridSnapOpenConnectAnchor {
  const definition = openGridSnapProfileFor(
    parameters.profile,
    parameters.variant,
  )
  if (parameters.offset === 0) {
    return openGridSnapOpenConnectAnchorForXYTransform(
      undefined,
      parameters.variant,
    )
  }
  return openGridSnapOpenConnectAnchorForXYTransform(
    xyScaleTransformFor(reference, targetBounds, definition),
    parameters.variant,
  )
}

export function openGridSnapPreFootprintBoundsFor(
  parameters: OpenGridSnapParameters,
): ModelBounds {
  const fullCellParameters = {
    variant: parameters.variant,
    profile: parameters.profile,
    offset: parameters.offset,
    footprint: 'full' as const,
  }
  const fullBounds = boundsForOpenGridSnap(fullCellParameters)
  const axes = openGridSnapCanonicalAxesFor(parameters.footprint)
  const selectedAxisExtraX =
    axes.halfCellX === 'none' ? 0 : parameters.offset / 2
  const selectedAxisExtraY =
    axes.halfCellY === 'none' ? 0 : parameters.offset / 2

  return {
    min: [
      fullBounds.min[0] - selectedAxisExtraX,
      fullBounds.min[1] - selectedAxisExtraY,
      fullBounds.min[2],
    ],
    max: [
      fullBounds.max[0] + selectedAxisExtraX,
      fullBounds.max[1] + selectedAxisExtraY,
      fullBounds.max[2],
    ],
  }
}

function footprintClipBounds(
  sourceBounds: ModelBounds,
  parameters: OpenGridSnapParameters,
): ModelBounds {
  let minX = sourceBounds.min[0]
  let maxX = sourceBounds.max[0]
  let minY = sourceBounds.min[1]
  let maxY = sourceBounds.max[1]
  const axes = openGridSnapCanonicalAxesFor(parameters.footprint)

  if (axes.halfCellX === 'left') maxX = 0
  if (axes.halfCellX === 'right') minX = 0
  if (axes.halfCellY === 'bottom') maxY = 0
  if (axes.halfCellY === 'top') minY = 0

  return {
    min: [minX, minY, sourceBounds.min[2]],
    max: [maxX, maxY, sourceBounds.max[2]],
  }
}

function hostEnvelope(bounds: ModelBounds): Shape3D {
  return makeBox(
    [bounds.min[0], bounds.min[1], bounds.min[2] - 0.1],
    [bounds.max[0], bounds.max[1], bounds.max[2] + 0.1],
  )
}

async function clipAssemblyToFootprint(
  assembly: Shape3D,
  parameters: OpenGridSnapParameters,
  context: OpenGridSnapBuildContext,
): Promise<Shape3D> {
  const sourceBounds = readBounds(assembly)
  const clipBounds = footprintClipBounds(sourceBounds, parameters)
  const translation: [number, number] = [
    -(clipBounds.min[0] + clipBounds.max[0]) / 2,
    -(clipBounds.min[1] + clipBounds.max[1]) / 2,
  ]
  const clippingProfile = hostEnvelope(clipBounds)
  const finalProfile = hostEnvelope(boundsForOpenGridSnap(parameters))
  const source = cloneImportedAssembly(assembly)
  const sourceSolids = extractSolids(source)
  const definition = openGridSnapProfileFor(
    parameters.profile,
    parameters.variant,
  )
  const centralIndex =
    parameters.profile === 'Directional' ? 0 : centralSolidIndex(sourceSolids)
  const output: Shape3D[] = []
  let boundaryObstacle: Shape3D | null = null
  let succeeded = false
  const firstClipScope = context.booleanOperations?.createScope(
    sourceSolids.length,
  )

  try {
    boundaryObstacle = buildOpenGridSnapBoundaryObstacle(
      parameters.footprint,
      context.booleanOperations,
    )
    for (const [sourceIndex, solid] of sourceSolids.entries()) {
      assertGenerationCurrent(context)
      const clipped = measureBooleanInScope(firstClipScope, 'intersect', () =>
        solid.intersect(clippingProfile),
      )
      if (clipped !== solid) deleteShape(solid)
      if (measureVolume(clipped) <= ASSET_TOLERANCE) {
        deleteShape(clipped)
        continue
      }
      const translated = clipped.translate(translation[0], translation[1], 0)
      if (translated !== clipped) deleteShape(clipped)
      let bounded = measureBoolean(context.booleanOperations, 'intersect', () =>
        translated.intersect(finalProfile),
      )
      if (bounded !== translated) deleteShape(translated)
      if (measureVolume(bounded) <= ASSET_TOLERANCE) {
        deleteShape(bounded)
        continue
      }
      if (sourceIndex === centralIndex) {
        bounded = applyBodyFeatures(
          bounded,
          parameters,
          definition,
          {
            // A half/quarter envelope cannot contain a complete fixed ±7 mm
            // locating hole. Keep the fixed feature out instead of producing a
            // translated or partial hole at the new boundary.
            applyLocatingHoles: false,
          },
          context.booleanOperations,
        )
      }
      let boundaryCut = bounded
      if (boundaryObstacle) {
        const activeBoundaryObstacle = boundaryObstacle
        boundaryCut = measureBoolean(context.booleanOperations, 'cut', () =>
          bounded.cut(activeBoundaryObstacle),
        )
      }
      if (boundaryCut !== bounded) deleteShape(bounded)
      if (measureVolume(boundaryCut) <= ASSET_TOLERANCE) {
        deleteShape(boundaryCut)
        continue
      }
      output.push(boundaryCut)
      await context.yieldToEventLoop?.()
    }

    if (output.length === 0) {
      throw new Error('OPENGRID_SNAP_HALF_ASSEMBLY_EMPTY')
    }
    if (output.length === 1) {
      const only = output[0]
      if (!only) throw new Error('OPENGRID_SNAP_HALF_ASSEMBLY_EMPTY')
      succeeded = true
      return only
    }
    const compound = makeCompound(output).asShape3D()
    succeeded = true
    return compound
  } finally {
    deleteShape(clippingProfile)
    deleteShape(finalProfile)
    deleteShape(boundaryObstacle)
    deleteShape(source)
    for (const solid of sourceSolids) deleteShape(solid)
    if (!succeeded) {
      for (const shape of output) deleteShape(shape)
    }
  }
}

export async function importOpenGridSnapReference(
  blob: Blob,
  variant: OpenGridSnapVariant,
  profile: OpenGridSnapProfile = 'Standard',
): Promise<Shape3D> {
  let source: string
  try {
    source = await blob.text()
  } catch {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID')
  }
  assertMillimetreStepUnits(source)

  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID')
  }

  try {
    assertReferenceGeometry(imported, variant, profile)
    return imported
  } catch (error) {
    deleteShape(imported)
    throw error
  }
}

export async function loadOpenGridSnapReference(
  variant: OpenGridSnapVariant,
  profile: OpenGridSnapProfile = 'Standard',
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPENGRID_SNAP_REFERENCE_URLS[profile][variant])
  if (!response.ok) throw new Error('OPENGRID_SNAP_ASSET_LOAD_FAILED')
  return importOpenGridSnapReference(await response.blob(), variant, profile)
}

export async function importOpenGridSnapFixedFootprint(
  blob: Blob,
): Promise<Shape3D> {
  let source: string
  try {
    source = await blob.text()
  } catch {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID')
  }
  assertMillimetreStepUnits(source)

  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID')
  }

  try {
    assertFixedFootprintGeometry(imported)
    return imported
  } catch (error) {
    deleteShape(imported)
    throw error
  }
}

export async function loadOpenGridSnapFixedFootprint(
  footprint: OpenGridSnapFixedFootprint,
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPENGRID_SNAP_FIXED_FOOTPRINT_URLS[footprint])
  if (!response.ok) throw new Error('OPENGRID_SNAP_ASSET_LOAD_FAILED')
  return importOpenGridSnapFixedFootprint(await response.blob())
}

export async function importOpenGridSnapOpenConnectHead(
  blob: Blob,
): Promise<Shape3D> {
  let source: string
  try {
    source = await blob.text()
  } catch {
    throw new Error('OPENGRID_SNAP_OPEN_CONNECT_HEAD_INVALID')
  }
  assertMillimetreStepUnits(source)

  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('OPENGRID_SNAP_OPEN_CONNECT_HEAD_INVALID')
  }

  try {
    assertOpenConnectHeadGeometry(imported)
    return imported
  } catch (error) {
    deleteShape(imported)
    throw error
  }
}

export async function loadOpenGridSnapOpenConnectHead(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPENGRID_SNAP_OPEN_CONNECT_HEAD_URL)
  if (!response.ok)
    throw new Error('OPENGRID_SNAP_OPEN_CONNECT_HEAD_LOAD_FAILED')
  return importOpenGridSnapOpenConnectHead(await response.blob())
}

function placeOpenConnectHead(
  source: Shape3D,
  anchor: OpenGridSnapOpenConnectAnchor,
): Shape3D {
  let placed: Shape3D | null = source
  try {
    const rotated = placed.rotate(
      OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_DEGREES,
      [...OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_ORIGIN] as [
        number,
        number,
        number,
      ],
      [...OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_AXIS] as [
        number,
        number,
        number,
      ],
    )
    if (rotated !== placed) {
      deleteShape(placed)
      placed = rotated
    }

    const translated = placed.translate(anchor[0], anchor[1], anchor[2])
    if (translated !== placed) {
      deleteShape(placed)
      placed = translated
    }

    const result = placed
    placed = null
    return result
  } catch (error) {
    deleteShape(placed)
    throw error
  }
}

export function makeOpenGridSnapOpenConnectUndersideNotchCutters(
  variant: OpenGridSnapVariant,
  transform: XYScaleTransform | null = null,
): Shape3D[] {
  // Lite's Standard assembly needs a tiny overlap to avoid a coplanar sliver;
  // keep Full's cutter exactly at its existing nominal coordinates.
  const cutEpsilon = variant === 'Lite' ? OPEN_CONNECT_NOTCH_CUT_EPSILON : 0
  const cutters = openGridSnapOpenConnectNotchSegmentsFor(variant).map(
    ({ min, max }) =>
      makeBox(
        [min[0] - cutEpsilon, min[1] - cutEpsilon, min[2] - cutEpsilon],
        [max[0] + cutEpsilon, max[1] + cutEpsilon, max[2] + cutEpsilon],
      ),
  )
  if (!transform) return cutters

  try {
    return cutters.map((cutter) => transformShapeXY(cutter, transform))
  } finally {
    cutters.forEach(deleteShape)
  }
}

function cutOpenConnectUndersideNotches(
  assembly: Shape3D,
  variant: OpenGridSnapVariant,
  transform: XYScaleTransform | null,
  scope: BooleanOperationScope | undefined,
): Shape3D {
  const cutters = makeOpenGridSnapOpenConnectUndersideNotchCutters(
    variant,
    transform,
  )
  let result = assembly
  try {
    for (const cutter of cutters) {
      result = cutShape(result, cutter, scope)
    }
    return result
  } catch (error) {
    deleteShape(result)
    throw error
  } finally {
    cutters.forEach(deleteShape)
  }
}

function composeOpenConnectAssembly(
  assembly: Shape3D,
  head: Shape3D,
  anchor: OpenGridSnapOpenConnectAnchor,
): Shape3D {
  const placedHead = placeOpenConnectHead(cloneImportedAssembly(head), anchor)
  try {
    return makeCompound([assembly, placedHead]).asShape3D()
  } catch (error) {
    deleteShape(assembly)
    deleteShape(placedHead)
    throw error
  }
}

export function inspectOpenGridSnapReference(
  shape: Shape3D,
  variant: OpenGridSnapVariant,
  profile: OpenGridSnapProfile = 'Standard',
): OpenGridSnapReferenceReport {
  return assertReferenceGeometry(shape, variant, profile)
}

export async function buildOpenGridSnap(
  parameters: OpenGridSnapParameters,
  context: OpenGridSnapBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('OPENGRID_SNAP_PARAMETERS_INVALID')
  }

  assertGenerationCurrent(context)
  if (
    parameters.footprint !== 'full' &&
    context.getOpenGridSnapFixedFootprint
  ) {
    const fixedFootprint = await context.getOpenGridSnapFixedFootprint(
      parameters.footprint,
    )
    assertGenerationCurrent(context)
    return cloneImportedAssembly(fixedFootprint)
  }

  if (!context.getOpenGridSnapReference) {
    throw new Error('OPENGRID_SNAP_ASSET_REFERENCE_MISSING')
  }

  const reference = await context.getOpenGridSnapReference(
    parameters.variant,
    parameters.profile,
  )
  assertGenerationCurrent(context)

  const targetBounds = openGridSnapPreFootprintBoundsFor(parameters)
  const assembly = buildFeatureAssembly(
    reference,
    parameters,
    targetBounds,
    context.booleanOperations,
  )

  if (parameters.footprint === 'full') {
    if (!parameters.openConnect) return assembly
    if (!context.getOpenGridSnapOpenConnectHead) {
      deleteShape(assembly)
      throw new Error('OPENGRID_SNAP_OPEN_CONNECT_HEAD_MISSING')
    }
    const head = await context.getOpenGridSnapOpenConnectHead()
    assertGenerationCurrent(context)
    const definition = openGridSnapProfileFor(
      parameters.profile,
      parameters.variant,
    )
    const notchTransform =
      parameters.offset > 0
        ? xyScaleTransformFor(reference, targetBounds, definition)
        : null
    const notchedAssembly = cutOpenConnectUndersideNotches(
      assembly,
      parameters.variant,
      notchTransform,
      context.booleanOperations?.createScope(
        openGridSnapOpenConnectNotchSegmentsFor(parameters.variant).length,
      ),
    )
    return composeOpenConnectAssembly(
      notchedAssembly,
      head,
      openConnectAnchorFor(reference, parameters, targetBounds),
    )
  }

  try {
    const clipped = await clipAssemblyToFootprint(assembly, parameters, context)
    deleteShape(assembly)
    return clipped
  } catch (error) {
    deleteShape(assembly)
    throw error
  }
}
