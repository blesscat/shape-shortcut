import {
  boundsForOpenGridOrganizerBox,
  openGridOrganizerBoxDetachableSocketPosesFor,
  openGridOrganizerBoxLayoutFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type ModelBounds,
  type OpenGridOrganizerBoxDetachableSocketPose,
  type OpenGridOrganizerBoxParameters,
} from '../../../cad-contract/units'
import { makeBox, measureVolume, type Shape3D } from 'replicad'
import {
  countSolids,
  isBRepValid,
} from '../opengrid-stackable-box/quality-metrics'
import { bottomGridSeamsFor } from '../opengrid-stackable-box/geometry'
import {
  buildOpenGridDetachableCornerSeatSocketVoid,
  placeOpenGridDetachableCornerSeatMaleShape,
  placeOpenGridDetachableCornerSeatSocketShape,
} from '../opengrid-locating-assembly/reference'

type FaceRecord = {
  surfaceType: string
  min: [number, number, number]
  max: [number, number, number]
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

function boundsMatch(actual: ModelBounds, expected: ModelBounds): boolean {
  return [...actual.min, ...actual.max].every((coordinate, index) => {
    const expectedCoordinate = [...expected.min, ...expected.max][index]
    return Math.abs(coordinate - expectedCoordinate) <= 0.08
  })
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Quality cleanup must not hide the original diagnostic.
  }
}

function volumeInBox(
  shape: Shape3D,
  min: [number, number, number],
  max: [number, number, number],
): number {
  const probe = makeBox(min, max)
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    deleteShape(probe)
  }
}

function intersectionVolume(first: Shape3D, second: Shape3D): number {
  let intersection: Shape3D | null = null
  try {
    intersection = first.intersect(second)
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
  }
}

function rotateRetainerProbe(
  point: [number, number],
  rotationDegrees: OpenGridOrganizerBoxDetachableSocketPose['rotationDegrees'],
): [number, number] {
  const [x, y] = point
  if (rotationDegrees === 90) return [-y, x]
  if (rotationDegrees === 180) return [-x, -y]
  if (rotationDegrees === 270) return [y, -x]
  return [x, y]
}

function retainerProbeCenterFor(
  pose: OpenGridOrganizerBoxDetachableSocketPose,
): [number, number] {
  // Probe inside the retained plate annulus, outside the head-rotation pocket.
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  const probeRadius =
    (configuration.female.outerDiameter + configuration.male.headMaxLength) / 4
  const [offsetX, offsetY] = rotateRetainerProbe(
    [probeRadius, 0],
    pose.rotationDegrees,
  )
  return [pose.center[0] + offsetX, pose.center[1] + offsetY]
}

function faceRecordsFor(shape: Shape3D): FaceRecord[] {
  return shape.faces.map((face) => {
    const boundingBox = face.boundingBox
    try {
      const [min, max] = boundingBox.bounds as [
        [number, number, number],
        [number, number, number],
      ]
      return {
        surfaceType: face.surface.surfaceType,
        min: [...min] as [number, number, number],
        max: [...max] as [number, number, number],
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  })
}

function hasIntegratedSeatChamferRecordFor(
  records: readonly FaceRecord[],
  center: readonly [number, number],
): boolean {
  const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION
  return records.some((record) => {
    const planSpan = Math.max(
      record.max[0] - record.min[0],
      record.max[1] - record.min[1],
    )
    const recordCenterX = (record.min[0] + record.max[0]) / 2
    const recordCenterY = (record.min[1] + record.max[1]) / 2
    const zSpan = record.max[2] - record.min[2]
    return (
      record.surfaceType === 'CONE' &&
      Math.abs(recordCenterX - center[0]) <= 0.08 &&
      Math.abs(recordCenterY - center[1]) <= 0.08 &&
      Math.abs(planSpan - configuration.integratedSeatDiameter) <= 0.2 &&
      zSpan >= configuration.integratedSeatBottomChamfer * 0.7 &&
      record.min[2] <= configuration.integratedSeatMinZ + 0.03 &&
      record.max[2] <=
        configuration.integratedSeatMinZ +
          configuration.integratedSeatBottomChamfer +
          0.05
    )
  })
}

function polygonSideCount(
  shape: OpenGridOrganizerBoxParameters['holeShape'],
): number {
  if (shape === 'circle') return 1
  if (shape === 'triangle') return 3
  if (shape === 'square') return 4
  if (shape === 'pentagon') return 5
  return 6
}

function aggregateBounds(records: readonly FaceRecord[]): ModelBounds {
  return {
    min: [
      Math.min(...records.map((record) => record.min[0])),
      Math.min(...records.map((record) => record.min[1])),
      Math.min(...records.map((record) => record.min[2])),
    ],
    max: [
      Math.max(...records.map((record) => record.max[0])),
      Math.max(...records.map((record) => record.max[1])),
      Math.max(...records.map((record) => record.max[2])),
    ],
  }
}

function assertCavityFaceGeometry(
  shape: Shape3D,
  parameters: OpenGridOrganizerBoxParameters,
): void {
  const layout = openGridOrganizerBoxLayoutFor(parameters)
  const floorZ = layout.bodyHeight - parameters.holeDepth
  const expectedSideCount = polygonSideCount(parameters.holeShape)
  const cavityFaceRecords = faceRecordsFor(shape).filter((record) => {
    const zSpan = record.max[2] - record.min[2]
    const expectedSurface =
      parameters.holeShape === 'circle' ? 'CYLINDRE' : 'PLANE'
    return (
      record.surfaceType === expectedSurface &&
      record.min[2] >= floorZ - 0.12 &&
      record.max[2] >= layout.bodyHeight - 0.12 &&
      zSpan >= parameters.holeDepth - 0.12
    )
  })
  const cavityBounds: ModelBounds[] = []

  for (const [index, [centerX, centerY]] of layout.cavityCenters.entries()) {
    const envelope = layout.cavityEnvelope
    const records = cavityFaceRecords.filter((record) => {
      const recordCenterX = (record.min[0] + record.max[0]) / 2
      const recordCenterY = (record.min[1] + record.max[1]) / 2
      return (
        Math.abs(recordCenterX - centerX) <= envelope.x / 2 + 0.25 &&
        Math.abs(recordCenterY - centerY) <= envelope.y / 2 + 0.25
      )
    })
    if (records.length !== expectedSideCount) {
      throw new Error(
        `OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:cavity-face-count-${index}`,
      )
    }
    const actual = aggregateBounds(records)
    if (
      Math.abs(actual.max[0] - actual.min[0] - envelope.x) > 0.25 ||
      Math.abs(actual.max[1] - actual.min[1] - envelope.y) > 0.25 ||
      actual.max[2] - actual.min[2] < parameters.holeDepth - 0.12
    ) {
      throw new Error(
        `OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:cavity-profile-${index}`,
      )
    }
    cavityBounds.push(actual)
  }

  const tolerance = 0.25
  const rows = Array.from(
    new Set(layout.cavityCenters.map(([, y]) => y.toFixed(6))),
  ).map((key) =>
    layout.cavityCenters
      .map((center, index) => ({ center, bounds: cavityBounds[index] }))
      .filter(({ center: [, y] }) => y.toFixed(6) === key)
      .sort((first, second) => first.center[0] - second.center[0]),
  )
  for (const row of rows) {
    for (let index = 1; index < row.length; index += 1) {
      const previous = row[index - 1]
      const current = row[index]
      if (!previous || !current) continue
      const gap = current.bounds.min[0] - previous.bounds.max[0]
      if (Math.abs(gap - parameters.holeSpacingX) > tolerance) {
        throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:spacing-x')
      }
    }
  }

  const columns = Array.from(
    new Set(layout.cavityCenters.map(([x]) => x.toFixed(6))),
  ).map((key) =>
    layout.cavityCenters
      .map((center, index) => ({ center, bounds: cavityBounds[index] }))
      .filter(({ center: [x] }) => x.toFixed(6) === key)
      .sort((first, second) => first.center[1] - second.center[1]),
  )
  for (const column of columns) {
    for (let index = 1; index < column.length; index += 1) {
      const previous = column[index - 1]
      const current = column[index]
      if (!previous || !current) continue
      const gap = current.bounds.min[1] - previous.bounds.max[1]
      if (Math.abs(gap - parameters.holeSpacingY) > tolerance) {
        throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:spacing-y')
      }
    }
  }
}

function assertCavityAndWallGeometry(
  shape: Shape3D,
  parameters: OpenGridOrganizerBoxParameters,
): void {
  const layout = openGridOrganizerBoxLayoutFor(parameters)
  const floorZ = layout.bodyHeight - parameters.holeDepth
  const middleZ = floorZ + parameters.holeDepth / 2
  const probeHalf = Math.min(0.2, parameters.holeDiameter / 8)

  for (const [index, [x, y]] of layout.cavityCenters.entries()) {
    const cavityVolume = volumeInBox(
      shape,
      [x - probeHalf, y - probeHalf, middleZ - 0.05],
      [x + probeHalf, y + probeHalf, middleZ + 0.05],
    )
    if (cavityVolume > 0.001) {
      throw new Error(
        `OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:cavity-not-open-${index}`,
      )
    }

    const floorVolume = volumeInBox(
      shape,
      [x - probeHalf / 2, y - probeHalf / 2, floorZ - 0.15],
      [x + probeHalf / 2, y + probeHalf / 2, floorZ - 0.05],
    )
    if (floorVolume <= 0) {
      throw new Error(
        `OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:bottom-thickness-${index}`,
      )
    }
  }

  const [width, depth] = layout.footprint
  const sideProbeHalf = Math.min(0.2, parameters.holeDiameter / 8)
  const sideZMin = middleZ - 0.05
  const sideZMax = middleZ + 0.05
  const sideProbes: Array<
    [[number, number, number], [number, number, number]]
  > = [
    [
      [width / 2 - sideProbeHalf * 2, -sideProbeHalf, sideZMin],
      [width / 2 + 0.05, sideProbeHalf, sideZMax],
    ],
    [
      [-width / 2 - 0.05, -sideProbeHalf, sideZMin],
      [-width / 2 + sideProbeHalf * 2, sideProbeHalf, sideZMax],
    ],
    [
      [-sideProbeHalf, depth / 2 - sideProbeHalf * 2, sideZMin],
      [sideProbeHalf, depth / 2 + 0.05, sideZMax],
    ],
    [
      [-sideProbeHalf, -depth / 2 - 0.05, sideZMin],
      [sideProbeHalf, -depth / 2 + sideProbeHalf * 2, sideZMax],
    ],
  ]

  if (sideProbes.some(([min, max]) => volumeInBox(shape, min, max) <= 0)) {
    throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:side-opening')
  }
}

function assertInterfaceComposition(
  shape: Shape3D,
  parameters: OpenGridOrganizerBoxParameters,
): void {
  const layout = openGridOrganizerBoxLayoutFor(parameters)
  const interfaceParameters = {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: layout.gridCountX,
    y: layout.gridCountY,
    cornerSeatMode: 'integrated' as const,
    fullBottomHoleGrid: false,
    topRimMode: 'stacking-rail' as const,
    bottomMode: 'stacking' as const,
    honeycombMode: false,
  }
  const socketCenters =
    openGridStackableBoxSocketCentersFor(interfaceParameters)
  if (socketCenters.length !== 4) {
    throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:seat-count')
  }
  const faceRecords = faceRecordsFor(shape)
  const hasAllBuiltInSeatChamfers = socketCenters.every((center) =>
    hasIntegratedSeatChamferRecordFor(faceRecords, center),
  )
  const hasAnyBuiltInSeatChamfer = socketCenters.some((center) =>
    hasIntegratedSeatChamferRecordFor(faceRecords, center),
  )

  const footProbeCenterZ =
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ +
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatHeight / 2
  const footProbeZMin = footProbeCenterZ - 0.05
  const footProbeZMax = footProbeCenterZ + 0.05
  const footVolumes = socketCenters.map(([x, y]) =>
    volumeInBox(
      shape,
      [x - 0.2, y - 0.2, footProbeZMin],
      [x + 0.2, y + 0.2, footProbeZMax],
    ),
  )
  const hasAllBuiltInFeet = footVolumes.every((volume) => volume > 0.001)
  if (
    parameters.cornerSeatMode === 'integrated' &&
    (!hasAllBuiltInFeet || !hasAllBuiltInSeatChamfers)
  ) {
    throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:built-in-feet')
  }
  if (
    parameters.cornerSeatMode !== 'integrated' &&
    (footVolumes.some((volume) => volume > 0.001) || hasAnyBuiltInSeatChamfer)
  ) {
    throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:combined-interface')
  }

  const stackingParameters = {
    ...interfaceParameters,
    cornerSeatMode: 'none' as const,
  }
  const seams = bottomGridSeamsFor(stackingParameters)
  const seamVolumes = seams.map((seam) =>
    seam.axis === 'x'
      ? volumeInBox(
          shape,
          [seam.position - 0.2, -0.2, 0.2],
          [seam.position + 0.2, 0.2, 0.3],
        )
      : volumeInBox(
          shape,
          [-0.2, seam.position - 0.2, 0.2],
          [0.2, seam.position + 0.2, 0.3],
        ),
  )
  if (
    parameters.boxMode === 'stackable' &&
    seamVolumes.some((volume) => volume > 0.001)
  ) {
    throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:stacking-guide')
  }
  if (
    parameters.boxMode !== 'stackable' &&
    seamVolumes.some((volume) => volume <= 0.001)
  ) {
    throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:combined-interface')
  }

  if (!layout.stacking) return
  const [width] = layout.footprint
  const railVolume = volumeInBox(
    shape,
    [width / 2 - 0.5, -0.1, layout.stacking.railBaseZ + 0.8],
    [width / 2 - 0.3, 0.1, layout.stacking.railBaseZ + 0.9],
  )
  if (railVolume <= 0.001) {
    throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:top-rail')
  }
}

function assertDetachableSocketGeometry(
  shape: Shape3D,
  parameters: OpenGridOrganizerBoxParameters,
  holderReference: Shape3D | undefined,
  maleReference: Shape3D | undefined,
): void {
  if (parameters.cornerSeatMode !== 'detachable-corner-seat') return
  if (!holderReference) {
    throw new Error(
      'OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:holder-reference-missing',
    )
  }
  if (!maleReference) {
    throw new Error(
      'OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:male-reference-missing',
    )
  }

  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  let sourceVoid: Shape3D | null = null
  try {
    sourceVoid = buildOpenGridDetachableCornerSeatSocketVoid(holderReference)
    for (const pose of openGridOrganizerBoxDetachableSocketPosesFor(
      parameters,
    )) {
      let placedVoid: Shape3D | null = null
      let placedMale: Shape3D | null = null
      try {
        placedVoid = placeOpenGridDetachableCornerSeatSocketShape(
          sourceVoid,
          pose,
        )
        placedMale = placeOpenGridDetachableCornerSeatMaleShape(
          maleReference,
          pose,
        )
        if (
          intersectionVolume(shape, placedVoid) >
          configuration.intersectionVolumeTolerance
        ) {
          throw new Error(
            `OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:socket-void-${pose.corner}`,
          )
        }
        const [retainerX, retainerY] = retainerProbeCenterFor(pose)
        const retainerZ = configuration.femaleReference.depth / 2
        const retainerVolume = volumeInBox(
          shape,
          [retainerX - 0.08, retainerY - 0.08, retainerZ - 0.04],
          [retainerX + 0.08, retainerY + 0.08, retainerZ + 0.04],
        )
        if (retainerVolume <= 0.0001) {
          throw new Error(
            `OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:socket-retainer-${pose.corner}`,
          )
        }
        if (
          intersectionVolume(shape, placedMale) >
          configuration.intersectionVolumeTolerance
        ) {
          throw new Error(
            `OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:socket-male-collision-${pose.corner}`,
          )
        }

        const [x, y] = pose.center
        const roofVolume = volumeInBox(
          shape,
          [x - 0.1, y - 0.1, configuration.female.depth + 0.05],
          [
            x + 0.1,
            y + 0.1,
            configuration.female.depth + configuration.minimumSocketRoof - 0.05,
          ],
        )
        if (roofVolume <= 0.001) {
          throw new Error(
            `OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:socket-roof-${pose.corner}`,
          )
        }
      } finally {
        deleteShape(placedVoid)
        deleteShape(placedMale)
      }
    }
  } finally {
    deleteShape(sourceVoid)
  }
}

export function assertOpenGridOrganizerBoxGeometry(
  shape: Shape3D,
  parameters: OpenGridOrganizerBoxParameters,
  detachableCornerSeatHolderReference?: Shape3D,
  detachableCornerSeatReference?: Shape3D,
): void {
  const actualBounds = boundsOf(shape)
  const expectedBounds = boundsForOpenGridOrganizerBox(parameters)
  if (!boundsMatch(actualBounds, expectedBounds)) {
    throw new Error(
      `OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:bounds:${JSON.stringify({ actualBounds, expectedBounds })}`,
    )
  }

  const volume = measureVolume(shape)
  if (!Number.isFinite(volume) || volume <= 0) {
    throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:volume')
  }
  if (countSolids(shape) !== 1) {
    throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:single-solid')
  }
  if (!isBRepValid(shape)) {
    throw new Error('OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:brep')
  }
  assertCavityAndWallGeometry(shape, parameters)
  assertCavityFaceGeometry(shape, parameters)
  assertInterfaceComposition(shape, parameters)
  assertDetachableSocketGeometry(
    shape,
    parameters,
    detachableCornerSeatHolderReference,
    detachableCornerSeatReference,
  )
}
