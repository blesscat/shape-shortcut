import {
  getOC,
  makeBox,
  makeCompound,
  measureVolume,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridOpenConnectOrganizer,
  openGridOpenConnectOrganizerLayoutFor,
  openGridOpenConnectOrganizerSlotOriginsFor,
  openGridOpenConnectOrganizerTiltAxisFor,
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
  type ModelBounds,
  type OpenGridOpenConnectOrganizerLayout,
  type OpenGridOpenConnectOrganizerParameters,
} from '../../../cad-contract/units'
import { applyOpenGridOpenConnectOrganizerOwnedTransforms } from './builder'
import { placeOpenGridOpenConnectShelfLockedSlot } from '../opengrid-openconnect-shelf/slot'

type MeshLike = {
  bounds: { min: number[]; max: number[] }
}

type FaceRecord = {
  surfaceType: string
  min: [number, number, number]
  max: [number, number, number]
  normal: [number, number, number] | null
}

export type OpenGridOpenConnectOrganizerQualityReport = {
  passed: boolean
  failures: string[]
  validBRep: boolean
  volume: number
  solidCount: number
  bounds: ModelBounds
  cavityCount: number
  cavitySideCounts: number[]
  cavityFloorCount: number
  bottomThicknessValid: boolean
  slotCount: number
  slotResidualVolumes: number[]
  interfacePlaneParallelToWall: boolean
  separationSkinCount: number
  printUndersideAtZero: boolean
  installedCavityAxis: [number, number, number]
  openingToFloorDelta: { y: number; z: number }
}

export type OpenGridOpenConnectOrganizerQualityContext = {
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
}

const BOUNDS_TOLERANCE = 0.12
const GEOMETRY_TOLERANCE = 0.15
const SLOT_RESIDUAL_VOLUME_TOLERANCE = 0.01
const PROBE_VOLUME_TOLERANCE = 0.002
const QUALITY_BATCH_SIZE = 16
const SEPARATION_PROBE_INSET = 0.05

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the quality result.
  }
}

function assertGenerationCurrent(
  context: OpenGridOpenConnectOrganizerQualityContext,
): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtQualityBoundary(
  context: OpenGridOpenConnectOrganizerQualityContext,
): Promise<void> {
  assertGenerationCurrent(context)
  await context.yieldToEventLoop?.()
  assertGenerationCurrent(context)
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

function isBRepValid(shape: Shape3D): boolean {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    return analyzer.IsValid_2()
  } finally {
    analyzer.delete()
  }
}

function boundsOf(shape: Shape3D): ModelBounds {
  const boundingBox = shape.boundingBox
  try {
    return {
      min: [...boundingBox.bounds[0]] as [number, number, number],
      max: [...boundingBox.bounds[1]] as [number, number, number],
    }
  } finally {
    boundingBox.delete()
  }
}

function clearTriangulation(shape: Shape3D): void {
  const oc = getOC()
  oc.BRepTools.Clean(shape.wrapped, true)
}

function closeEnough(
  first: number,
  second: number,
  tolerance = GEOMETRY_TOLERANCE,
): boolean {
  return Math.abs(first - second) <= tolerance
}

function boundsMatch(actual: ModelBounds, expected: ModelBounds): boolean {
  return [...actual.min, ...actual.max].every((coordinate, index) =>
    closeEnough(
      coordinate,
      [...expected.min, ...expected.max][index]!,
      BOUNDS_TOLERANCE,
    ),
  )
}

function dot(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number {
  return first[0] * second[0] + first[1] * second[1] + first[2] * second[2]
}

function parallel(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): boolean {
  return Math.abs(Math.abs(dot(first, second)) - 1) <= 0.01
}

async function faceRecordsFor(
  shape: Shape3D,
  context: OpenGridOpenConnectOrganizerQualityContext,
): Promise<FaceRecord[]> {
  const records: FaceRecord[] = []
  const faces = shape.faces
  let nextIndex = 0
  try {
    while (nextIndex < faces.length) {
      const face = faces[nextIndex]!
      nextIndex += 1
      let normal: ReturnType<typeof face.normalAt> | null = null
      try {
        const boundingBox = face.boundingBox
        try {
          const [min, max] = boundingBox.bounds as [
            [number, number, number],
            [number, number, number],
          ]
          if (face.surface.surfaceType === 'PLANE') normal = face.normalAt()
          records.push({
            surfaceType: face.surface.surfaceType,
            min: [...min],
            max: [...max],
            normal: normal ? [normal.x, normal.y, normal.z] : null,
          })
        } finally {
          boundingBox.delete()
        }
      } finally {
        normal?.delete()
        face.delete()
      }
      if (nextIndex % QUALITY_BATCH_SIZE === 0) {
        await yieldAtQualityBoundary(context)
      }
    }
    if (nextIndex % QUALITY_BATCH_SIZE !== 0) {
      await yieldAtQualityBoundary(context)
    }
  } finally {
    for (let index = nextIndex; index < faces.length; index += 1) {
      deleteShape(faces[index])
    }
  }
  return records
}

function createOwnedShapes<T>(
  values: readonly T[],
  factory: (value: T) => Shape3D,
): Shape3D[] {
  const shapes: Shape3D[] = []
  try {
    for (const value of values) shapes.push(factory(value))
    return shapes
  } catch (error) {
    shapes.forEach(deleteShape)
    throw error
  }
}

function volumeInOwnedProbes(
  shape: Shape3D,
  probes: Shape3D[],
): { actual: number; expected: number } {
  const firstProbe = probes[0]
  if (!firstProbe) {
    throw new Error('OPENGRID_OPENCONNECT_ORGANIZER_PROBES_EMPTY')
  }
  let compound: Shape3D | null = null
  let intersection: Shape3D | null = null
  try {
    compound =
      probes.length === 1 ? firstProbe : makeCompound(probes).asShape3D()
    const expected = measureVolume(compound)
    intersection = shape.intersect(compound)
    return { actual: measureVolume(intersection), expected }
  } finally {
    deleteShape(intersection)
    if (compound && compound !== firstProbe) deleteShape(compound)
    probes.forEach(deleteShape)
  }
}

function probeIsMostlyFilled(probe: {
  actual: number
  expected: number
}): boolean {
  return probe.expected > 0 && probe.actual >= probe.expected * 0.9
}

function probeIsMostlyEmpty(probe: {
  actual: number
  expected: number
}): boolean {
  return (
    probe.expected > 0 &&
    probe.actual <= Math.min(PROBE_VOLUME_TOLERANCE, probe.expected * 0.1)
  )
}

type CavitySideExpectation = {
  surfaces: readonly string[]
  count: number
}

function cavitySideExpectationFor(
  shape: OpenGridOpenConnectOrganizerParameters['holeShape'],
  holeWidth: number,
  holeHeight: number,
  holeCornerRadius: number,
): CavitySideExpectation {
  if (shape === 'circle') return { surfaces: ['CYLINDRE'], count: 1 }
  if (shape === 'ellipse') {
    return { surfaces: ['EXTRUSION_SURFACE'], count: 2 }
  }
  if (shape === 'rectangle') {
    if (holeCornerRadius <= 0) return { surfaces: ['PLANE'], count: 4 }
    const straightX = holeCornerRadius < holeWidth / 2
    const straightY = holeCornerRadius < holeHeight / 2
    if (!straightX && !straightY) return { surfaces: ['CYLINDRE'], count: 1 }
    if (!straightX || !straightY) {
      return { surfaces: ['PLANE', 'CYLINDRE'], count: 4 }
    }
    return { surfaces: ['PLANE', 'CYLINDRE'], count: 8 }
  }
  const polygonSideCounts = {
    triangle: 3,
    square: 4,
    pentagon: 5,
    hexagon: 6,
  } as const
  return { surfaces: ['PLANE'], count: polygonSideCounts[shape] }
}

function faceRecordMatchesCavityFootprint(
  record: FaceRecord,
  parameters: OpenGridOpenConnectOrganizerParameters,
  layout: OpenGridOpenConnectOrganizerLayout,
  centerX: number,
  centerY: number,
): boolean {
  const recordCenterX = (record.min[0] + record.max[0]) / 2
  const recordCenterY = (record.min[1] + record.max[1]) / 2
  if (parameters.holeShape === 'circle') {
    const xSpan = record.max[0] - record.min[0]
    const ySpan = record.max[1] - record.min[1]
    return (
      closeEnough(recordCenterX, centerX) &&
      closeEnough(recordCenterY, centerY) &&
      closeEnough(xSpan, layout.cavityEnvelope.x) &&
      closeEnough(ySpan, layout.cavityEnvelope.y)
    )
  }
  return (
    Math.abs(recordCenterX - centerX) <=
      layout.cavityEnvelope.x / 2 + GEOMETRY_TOLERANCE &&
    Math.abs(recordCenterY - centerY) <=
      layout.cavityEnvelope.y / 2 + GEOMETRY_TOLERANCE
  )
}

async function inspectCavities(
  shape: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
  records: readonly FaceRecord[],
  failures: string[],
  context: OpenGridOpenConnectOrganizerQualityContext,
): Promise<{
  cavityCount: number
  cavitySideCounts: number[]
  cavityFloorCount: number
  bottomThicknessValid: boolean
}> {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  const sideExpectation = cavitySideExpectationFor(
    parameters.holeShape,
    parameters.holeWidth,
    parameters.holeHeight,
    parameters.holeCornerRadius,
  )
  const printCenters = layout.cavityCenters.map(
    ([x, y]) => [x, y - layout.bodyDepth / 2] as const,
  )
  const sideCounts: number[] = []
  let floorCount = 0
  let cavityCount = 0
  let bottomThicknessValid = true
  const expectsFloor = parameters.bottomThickness > 0

  for (
    let start = 0;
    start < printCenters.length;
    start += QUALITY_BATCH_SIZE
  ) {
    const batch = printCenters.slice(start, start + QUALITY_BATCH_SIZE)
    const topologyValid: boolean[] = []

    for (const [offset, [centerX, centerY]] of batch.entries()) {
      const index = start + offset
      const sideRecords = records.filter((record) => {
        const zSpan = record.max[2] - record.min[2]
        return (
          sideExpectation.surfaces.includes(record.surfaceType) &&
          zSpan >= parameters.holeDepth - GEOMETRY_TOLERANCE &&
          record.min[2] >= parameters.bottomThickness - GEOMETRY_TOLERANCE &&
          record.max[2] >= layout.bodyThickness - GEOMETRY_TOLERANCE &&
          faceRecordMatchesCavityFootprint(
            record,
            parameters,
            layout,
            centerX,
            centerY,
          )
        )
      })
      sideCounts.push(sideRecords.length)
      if (sideRecords.length !== sideExpectation.count) {
        failures.push(`cavity-side-count-${index}`)
      }

      const hasFloor = records.some(
        (record) =>
          record.surfaceType === 'PLANE' &&
          closeEnough(
            record.min[2],
            parameters.bottomThickness,
            GEOMETRY_TOLERANCE,
          ) &&
          closeEnough(
            record.max[2],
            parameters.bottomThickness,
            GEOMETRY_TOLERANCE,
          ) &&
          record.min[0] <= centerX &&
          record.max[0] >= centerX &&
          record.min[1] <= centerY &&
          record.max[1] >= centerY &&
          record.max[0] - record.min[0] <=
            layout.cavityEnvelope.x + 2 * GEOMETRY_TOLERANCE &&
          record.max[1] - record.min[1] <=
            layout.cavityEnvelope.y + 2 * GEOMETRY_TOLERANCE,
      )
      if (expectsFloor && hasFloor) floorCount += 1
      if (expectsFloor && !hasFloor) failures.push(`cavity-floor-${index}`)
      if (!expectsFloor && hasFloor) {
        failures.push(`unexpected-cavity-floor-${index}`)
      }
      const floorTopologyValid = expectsFloor ? hasFloor : !hasFloor
      topologyValid.push(
        floorTopologyValid && sideRecords.length === sideExpectation.count,
      )
    }

    const cavityProbes = createOwnedShapes(batch, ([centerX, centerY]) => {
      const probeHalf = Math.min(0.2, parameters.holeDiameter / 8)
      const middleZ = parameters.bottomThickness + parameters.holeDepth / 2
      return makeBox(
        [centerX - probeHalf, centerY - probeHalf, middleZ - 0.05],
        [centerX + probeHalf, centerY + probeHalf, middleZ + 0.05],
      )
    })
    const cavityProbe = volumeInOwnedProbes(shape, cavityProbes)
    const cavitiesOpen = cavityProbe.actual <= PROBE_VOLUME_TOLERANCE
    if (!cavitiesOpen) failures.push(`cavity-open-batch-${start}`)

    const bottomProbes = createOwnedShapes(batch, ([centerX, centerY]) => {
      const probeHalf = Math.min(0.2, parameters.holeDiameter / 8)
      if (!expectsFloor) {
        return makeBox(
          [centerX - probeHalf, centerY - probeHalf, 0],
          [
            centerX + probeHalf,
            centerY + probeHalf,
            Math.min(0.1, parameters.holeDepth / 2),
          ],
        )
      }
      const bottomInset = Math.min(0.05, parameters.bottomThickness / 4)
      return makeBox(
        [centerX - probeHalf, centerY - probeHalf, bottomInset],
        [
          centerX + probeHalf,
          centerY + probeHalf,
          parameters.bottomThickness - bottomInset,
        ],
      )
    })
    const bottomProbe = volumeInOwnedProbes(shape, bottomProbes)
    const bottomsCorrect = expectsFloor
      ? probeIsMostlyFilled(bottomProbe)
      : probeIsMostlyEmpty(bottomProbe)
    if (!bottomsCorrect) {
      failures.push(
        `${expectsFloor ? 'bottom-thickness' : 'through-bottom'}-batch-${start}`,
      )
      bottomThicknessValid = false
    }

    if (cavitiesOpen && bottomsCorrect) {
      cavityCount += topologyValid.filter(Boolean).length
    }
    await yieldAtQualityBoundary(context)
  }

  return {
    cavityCount,
    cavitySideCounts: sideCounts,
    cavityFloorCount: floorCount,
    bottomThicknessValid,
  }
}

function transformInstalledShapeForPrint(
  shape: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
): Shape3D {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  return applyOpenGridOpenConnectOrganizerOwnedTransforms(shape, [
    (current) => current.translate(0, 0, -layout.installedBodyPivotZ),
    (current) => current.rotate(-parameters.tiltAngle, [0, 0, 0], [1, 0, 0]),
  ])
}

async function inspectLockedSlots(
  shape: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
  lockedSlot: Shape3D,
  failures: string[],
  context: OpenGridOpenConnectOrganizerQualityContext,
): Promise<{
  residualVolumes: number[]
  separationSkinCount: number
  slotCount: number
}> {
  const origins = openGridOpenConnectOrganizerSlotOriginsFor(parameters)
  const residualVolumes: number[] = []
  let slotCount = 0
  let separationSkinCount = 0

  for (let start = 0; start < origins.length; start += QUALITY_BATCH_SIZE) {
    assertGenerationCurrent(context)
    const batch = origins.slice(start, start + QUALITY_BATCH_SIZE)
    try {
      const cutters = createOwnedShapes(batch, (origin) => {
        const installedCutter = placeOpenGridOpenConnectShelfLockedSlot(
          lockedSlot,
          origin,
        )
        return transformInstalledShapeForPrint(installedCutter, parameters)
      })
      const residual = volumeInOwnedProbes(shape, cutters).actual
      residualVolumes.push(...batch.map(() => residual))
      if (
        Number.isFinite(residual) &&
        residual <= SLOT_RESIDUAL_VOLUME_TOLERANCE
      ) {
        slotCount += batch.length
      } else {
        failures.push(`locked-slot-batch-${start}`)
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'STALE_GENERATION') {
        throw error
      }
      residualVolumes.push(...batch.map(() => Number.POSITIVE_INFINITY))
      failures.push(`locked-slot-batch-${start}`)
    }

    try {
      const probes = createOwnedShapes(batch, (origin) => {
        const separation =
          OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.minimumInterfaceSeparation
        const installedProbe = makeBox(
          [origin[0] - 0.12, SEPARATION_PROBE_INSET, origin[2] - 0.12],
          [
            origin[0] + 0.12,
            separation - SEPARATION_PROBE_INSET,
            origin[2] + 0.12,
          ],
        )
        return transformInstalledShapeForPrint(installedProbe, parameters)
      })
      const coverage = volumeInOwnedProbes(shape, probes)
      if (coverage.expected - coverage.actual <= PROBE_VOLUME_TOLERANCE) {
        separationSkinCount += batch.length
      } else {
        failures.push(`separation-skin-batch-${start}`)
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'STALE_GENERATION') {
        throw error
      }
      failures.push(`separation-skin-batch-${start}`)
    }
    await yieldAtQualityBoundary(context)
  }

  return {
    residualVolumes,
    separationSkinCount,
    slotCount,
  }
}

function inspectInterfacePlane(
  records: readonly FaceRecord[],
  parameters: OpenGridOpenConnectOrganizerParameters,
): boolean {
  const radians = (parameters.tiltAngle * Math.PI) / 180
  const expectedPrintNormal: [number, number, number] = [
    0,
    Math.cos(radians),
    -Math.sin(radians),
  ]
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  return records.some(
    (record) =>
      record.normal !== null &&
      parallel(record.normal, expectedPrintNormal) &&
      record.max[0] - record.min[0] >= layout.rearInterfaceWidth * 0.2,
  )
}

function emptyReport(
  parameters: OpenGridOpenConnectOrganizerParameters,
  bounds: ModelBounds,
): OpenGridOpenConnectOrganizerQualityReport {
  const installedCavityAxis = openGridOpenConnectOrganizerTiltAxisFor(
    parameters.tiltAngle,
  )
  return {
    passed: false,
    failures: ['invalid-brep'],
    validBRep: false,
    volume: 0,
    solidCount: 0,
    bounds,
    cavityCount: 0,
    cavitySideCounts: [],
    cavityFloorCount: 0,
    bottomThicknessValid: false,
    slotCount: 0,
    slotResidualVolumes: [],
    interfacePlaneParallelToWall: false,
    separationSkinCount: 0,
    printUndersideAtZero: false,
    installedCavityAxis,
    openingToFloorDelta: {
      y: parameters.holeDepth * installedCavityAxis[1],
      z: parameters.holeDepth * installedCavityAxis[2],
    },
  }
}

export async function inspectOpenGridOpenConnectOrganizerShapeQuality(
  shape: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
  mesh: MeshLike,
  lockedSlot: Shape3D,
  context: OpenGridOpenConnectOrganizerQualityContext = {},
): Promise<OpenGridOpenConnectOrganizerQualityReport> {
  assertGenerationCurrent(context)
  clearTriangulation(shape)
  const actualBounds = boundsOf(shape)
  if (!isBRepValid(shape)) return emptyReport(parameters, actualBounds)
  await yieldAtQualityBoundary(context)

  const failures: string[] = []
  const expectedBounds = boundsForOpenGridOpenConnectOrganizer(parameters)
  if (!boundsMatch(actualBounds, expectedBounds)) failures.push('shape-bounds')
  const meshBounds: ModelBounds = {
    min: [...mesh.bounds.min] as [number, number, number],
    max: [...mesh.bounds.max] as [number, number, number],
  }
  if (!boundsMatch(meshBounds, expectedBounds)) failures.push('mesh-bounds')

  const volume = measureVolume(shape)
  if (!(volume > 0)) failures.push('positive-volume')
  const solidCount = countSolids(shape)
  if (solidCount !== 1) failures.push('single-solid')

  const records = await faceRecordsFor(shape, context)
  const cavities = await inspectCavities(
    shape,
    parameters,
    records,
    failures,
    context,
  )
  const interfacePlaneParallelToWall = inspectInterfacePlane(
    records,
    parameters,
  )
  if (!interfacePlaneParallelToWall) failures.push('wall-parallel-interface')

  const slots = await inspectLockedSlots(
    shape,
    parameters,
    lockedSlot,
    failures,
    context,
  )
  const printUndersideAtZero = closeEnough(actualBounds.min[2], 0, 0.02)
  if (!printUndersideAtZero) failures.push('print-underside')

  const installedCavityAxis = openGridOpenConnectOrganizerTiltAxisFor(
    parameters.tiltAngle,
  )
  return {
    passed: failures.length === 0,
    failures,
    validBRep: true,
    volume,
    solidCount,
    bounds: actualBounds,
    ...cavities,
    slotCount: slots.slotCount,
    slotResidualVolumes: slots.residualVolumes,
    interfacePlaneParallelToWall,
    separationSkinCount: slots.separationSkinCount,
    printUndersideAtZero,
    installedCavityAxis,
    openingToFloorDelta: {
      y: parameters.holeDepth * installedCavityAxis[1],
      z: parameters.holeDepth * installedCavityAxis[2],
    },
  }
}

export async function assertOpenGridOpenConnectOrganizerShapeQuality(
  shape: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
  mesh: MeshLike,
  lockedSlot: Shape3D,
  context: OpenGridOpenConnectOrganizerQualityContext = {},
): Promise<void> {
  const report = await inspectOpenGridOpenConnectOrganizerShapeQuality(
    shape,
    parameters,
    mesh,
    lockedSlot,
    context,
  )
  if (!report.passed) {
    throw new Error(
      `OPENGRID_OPENCONNECT_ORGANIZER_QUALITY_FAILED:${report.failures.join(',')}`,
    )
  }
}
