import {
  getOC,
  makeBox,
  makeCompound,
  measureVolume,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  HALF_CELL_CONFIGURATION,
  OPENGRID_CONFIGURATION,
  isOpenGridLayeredVariant,
  openGridNominalBoardConfiguration,
  type ModelBounds,
  type OpenGridParameters,
} from '../../../cad-contract/units'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'

export type OpenGridQualityReport = {
  passed: boolean
  failures: string[]
  bounds: ModelBounds | null
  expectedBounds: ModelBounds
  volume: number | null
  solidCount: number | null
  cellOpeningCount: number
  meshTriangleCount: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Quality cleanup must not hide the original diagnostic.
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= 0.05
}

function readBounds(shape: Shape3D): ModelBounds {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    return { min, max }
  } finally {
    boundingBox.delete()
  }
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

function isBRepValid(shape: Shape3D): boolean {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    return analyzer.IsValid_2()
  } finally {
    analyzer.delete()
  }
}

function meshIsFinite(mesh: MeshData | MeshSnapshot): boolean {
  const positions =
    mesh.positions instanceof ArrayBuffer
      ? new Float32Array(mesh.positions)
      : mesh.positions
  const normals =
    mesh.normals instanceof ArrayBuffer
      ? new Float32Array(mesh.normals)
      : mesh.normals
  const indices =
    mesh.indices instanceof ArrayBuffer
      ? new Uint32Array(mesh.indices)
      : mesh.indices
  if (
    positions.length === 0 ||
    normals.length !== positions.length ||
    indices.length === 0 ||
    indices.length % 3 !== 0
  ) {
    return false
  }

  for (const value of positions) {
    if (!Number.isFinite(value)) return false
  }
  for (const value of normals) {
    if (!Number.isFinite(value)) return false
  }
  for (const value of indices) {
    if (!Number.isSafeInteger(value)) return false
  }
  return true
}

function volumeInProbe(
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
    if (intersection && intersection !== shape) deleteShape(intersection)
    deleteShape(probe)
  }
}

function nominalBoundsForOpenGrid(parameters: OpenGridParameters): ModelBounds {
  const nominal = openGridNominalBoardConfiguration(parameters)
  return {
    min: [-nominal.width / 2, -nominal.depth / 2, 0],
    max: [nominal.width / 2, nominal.depth / 2, nominal.height],
  }
}

function inspectOfficialProfile(
  shape: Shape3D,
  parameters: OpenGridParameters,
  failures: string[],
): void {
  const board = nominalBoundsForOpenGrid(parameters)
  const [firstCellX, firstCellY] = cellCenterForOpenGrid(parameters, 0, 0)
  const isLayered = isOpenGridLayeredVariant(parameters.variant)
  const layerThickness = isLayered
    ? OPENGRID_CONFIGURATION.variants.Full.thickness
    : board.max[2]
  const zLevels = isLayered
    ? [
        layerThickness / 2,
        layerThickness + OPENGRID_CONFIGURATION.heavyGap + layerThickness / 2,
      ]
    : [layerThickness / 2]
  const probeHalfWidth = 0.5
  const probeHalfHeight = Math.min(0.2, layerThickness / 8)
  const inspectOuterRail = parameters.rows * parameters.columns <= 4
  let fullBoundaryY = board.max[1]
  if (parameters.halfCellY === 'top') {
    fullBoundaryY -= HALF_CELL_CONFIGURATION.halfPitch
  }

  for (const zLevel of zLevels) {
    if (inspectOuterRail) {
      const outerRailVolume = volumeInProbe(
        shape,
        [
          firstCellX - probeHalfWidth,
          fullBoundaryY - 0.7,
          zLevel - probeHalfHeight,
        ],
        [
          firstCellX + probeHalfWidth,
          fullBoundaryY - 0.3,
          zLevel + probeHalfHeight,
        ],
      )
      if (outerRailVolume <= 0.01) {
        failures.push(`profile:outer-rail-missing@${zLevel}`)
      }
    }

    const innerCaptureVolume = volumeInProbe(
      shape,
      [
        firstCellX - probeHalfWidth,
        fullBoundaryY - 1.35,
        zLevel - probeHalfHeight,
      ],
      [
        firstCellX + probeHalfWidth,
        fullBoundaryY - 1.15,
        zLevel + probeHalfHeight,
      ],
    )
    if (innerCaptureVolume > 0.01) {
      failures.push(`profile:inner-capture-missing@${zLevel}`)
    }
  }
}

function inspectHalfCellBoundary(
  shape: Shape3D,
  parameters: OpenGridParameters,
  failures: string[],
): void {
  if (parameters.halfCellX === 'none' && parameters.halfCellY === 'none') {
    return
  }
  const board = nominalBoundsForOpenGrid(parameters)
  const isLayered = isOpenGridLayeredVariant(parameters.variant)
  const layerThickness = isLayered
    ? OPENGRID_CONFIGURATION.variants.Full.thickness
    : board.max[2]
  const zLevels = isLayered
    ? [
        layerThickness / 2,
        layerThickness + OPENGRID_CONFIGURATION.heavyGap + layerThickness / 2,
      ]
    : [layerThickness / 2]
  const probeHalfWidth = 0.5
  const probeHalfHeight = Math.min(0.2, layerThickness / 8)
  const halfPitch = HALF_CELL_CONFIGURATION.halfPitch
  const fullXCenters: number[] = []
  const fullYCenters: number[] = []

  for (let column = 0; column < parameters.columns; column += 1) {
    fullXCenters.push(cellCenterForOpenGrid(parameters, 0, column)[0])
  }
  for (let row = 0; row < parameters.rows; row += 1) {
    fullYCenters.push(cellCenterForOpenGrid(parameters, row, 0)[1])
  }

  for (const zLevel of zLevels) {
    if (parameters.halfCellX !== 'none') {
      const isLeft = parameters.halfCellX === 'left'
      const boundaryX = isLeft ? board.min[0] : board.max[0]
      const centerYs = [...fullYCenters]
      if (parameters.halfCellY === 'top') {
        centerYs.push(board.max[1] - halfPitch / 2)
      } else if (parameters.halfCellY === 'bottom') {
        centerYs.push(board.min[1] + halfPitch / 2)
      }
      const minX = isLeft ? boundaryX + 0.3 : boundaryX - 0.7
      const maxX = isLeft ? boundaryX + 0.7 : boundaryX - 0.3
      for (const centerY of centerYs) {
        const volume = volumeInProbe(
          shape,
          [minX, centerY - probeHalfWidth, zLevel - probeHalfHeight],
          [maxX, centerY + probeHalfWidth, zLevel + probeHalfHeight],
        )
        if (volume <= 0.01) {
          failures.push(`half-cell:x-boundary-missing@${centerY}:${zLevel}`)
        }
      }
    }

    if (parameters.halfCellY !== 'none') {
      const isBottom = parameters.halfCellY === 'bottom'
      const boundaryY = isBottom ? board.min[1] : board.max[1]
      const centerXs = [...fullXCenters]
      if (parameters.halfCellX === 'left') {
        centerXs.push(board.min[0] + halfPitch / 2)
      } else if (parameters.halfCellX === 'right') {
        centerXs.push(board.max[0] - halfPitch / 2)
      }
      const minY = isBottom ? boundaryY + 0.3 : boundaryY - 0.7
      const maxY = isBottom ? boundaryY + 0.7 : boundaryY - 0.3
      const centerY = isBottom ? boundaryY + halfPitch : boundaryY - halfPitch
      for (const centerX of centerXs) {
        const volume = volumeInProbe(
          shape,
          [centerX - probeHalfWidth, minY, zLevel - probeHalfHeight],
          [centerX + probeHalfWidth, maxY, zLevel + probeHalfHeight],
        )
        if (volume <= 0.01) {
          failures.push(`half-cell:y-boundary-missing@${centerX}:${zLevel}`)
        }
      }
    }
  }
}

function inspectHybridProfile(
  shape: Shape3D,
  parameters: OpenGridParameters,
  failures: string[],
): void {
  if (
    parameters.variant !== 'Hybrid' ||
    parameters.rows < 3 ||
    parameters.columns < 3
  ) {
    return
  }

  const layerThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  const lowerLayerMidpoint = layerThickness / 2
  const upperLayerMidpoint =
    layerThickness + OPENGRID_CONFIGURATION.heavyGap + layerThickness / 2
  const probeHalfWidth = 0.5
  const probeHalfHeight = 0.2
  const halfPitch = OPENGRID_CONFIGURATION.gridPitch / 2
  const [perimeterX, perimeterY] = cellCenterForOpenGrid(parameters, 0, 0)
  const [interiorX, interiorY] = cellCenterForOpenGrid(parameters, 1, 1)

  const perimeterUpperVolume = volumeInProbe(
    shape,
    [
      perimeterX - probeHalfWidth,
      perimeterY + halfPitch - 0.7,
      upperLayerMidpoint - probeHalfHeight,
    ],
    [
      perimeterX + probeHalfWidth,
      perimeterY + halfPitch - 0.3,
      upperLayerMidpoint + probeHalfHeight,
    ],
  )
  if (perimeterUpperVolume <= 0.01) {
    failures.push('hybrid:perimeter-upper-layer-missing')
  }

  const interiorLowerVolume = volumeInProbe(
    shape,
    [
      interiorX - probeHalfWidth,
      interiorY + halfPitch - 0.7,
      lowerLayerMidpoint - probeHalfHeight,
    ],
    [
      interiorX + probeHalfWidth,
      interiorY + halfPitch - 0.3,
      lowerLayerMidpoint + probeHalfHeight,
    ],
  )
  if (interiorLowerVolume <= 0.01) {
    failures.push('hybrid:interior-full-layer-missing')
  }

  const interiorUpperVolume = volumeInProbe(
    shape,
    [
      interiorX - probeHalfWidth,
      interiorY + OPENGRID_CONFIGURATION.tileInnerSize / 2 - 2,
      upperLayerMidpoint - probeHalfHeight,
    ],
    [
      interiorX + probeHalfWidth,
      interiorY + OPENGRID_CONFIGURATION.tileInnerSize / 2 - 1.7,
      upperLayerMidpoint + probeHalfHeight,
    ],
  )
  if (interiorUpperVolume > 0.01) {
    failures.push('hybrid:interior-exceeds-full-layer')
  }
}

function inspectHybridTransition(
  shape: Shape3D,
  parameters: OpenGridParameters,
  failures: string[],
): void {
  if (
    parameters.variant !== 'Hybrid' ||
    parameters.rows < 3 ||
    parameters.columns < 3
  ) {
    return
  }

  const fullThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  const heavyThickness = OPENGRID_CONFIGURATION.variants.Heavy.thickness
  const transitionSpan = OPENGRID_CONFIGURATION.hybridTransitionSpan
  const transitionRise = heavyThickness - fullThickness
  const halfPitch = OPENGRID_CONFIGURATION.gridPitch / 2
  const tangentialOffset =
    halfPitch - OPENGRID_CONFIGURATION.outsideExtrusion / 2
  const probeHalfWidth = 0.5
  const probeHalfDepth = 0.25
  const fractions = [0.25, 0.5, 0.75]
  const sides = ['top', 'right', 'bottom', 'left'] as const
  const interiorRow = Math.floor((parameters.rows - 1) / 2)
  const interiorColumn = Math.floor((parameters.columns - 1) / 2)
  const sideCells: Record<(typeof sides)[number], [number, number]> = {
    top: [1, interiorColumn],
    right: [interiorRow, parameters.columns - 2],
    bottom: [parameters.rows - 2, interiorColumn],
    left: [interiorRow, 1],
  }

  const volumeAtTransition = (
    side: (typeof sides)[number],
    fraction: number,
    zMin: number,
    zMax: number,
    includeTangentialOffset = true,
  ): number => {
    const offset = -transitionSpan / 2 + transitionSpan * fraction
    const tangentialProbeOffset = includeTangentialOffset ? tangentialOffset : 0
    const [row, column] = sideCells[side]
    const [sectionX, sectionY] = cellCenterForOpenGrid(parameters, row, column)
    let x = sectionX
    let y = sectionY
    let xHalfSize = probeHalfWidth
    let yHalfSize = probeHalfDepth

    switch (side) {
      case 'top':
        y += offset
        x += tangentialProbeOffset
        break
      case 'right':
        x += offset
        y += tangentialProbeOffset
        xHalfSize = probeHalfDepth
        yHalfSize = probeHalfWidth
        break
      case 'bottom':
        y -= offset
        x += tangentialProbeOffset
        break
      case 'left':
        x -= offset
        y += tangentialProbeOffset
        xHalfSize = probeHalfDepth
        yHalfSize = probeHalfWidth
        break
    }

    return volumeInProbe(
      shape,
      [x - xHalfSize, y - yHalfSize, zMin],
      [x + xHalfSize, y + yHalfSize, zMax],
    )
  }

  for (const side of sides) {
    for (const fraction of fractions) {
      const expectedZ = fullThickness + transitionRise * fraction
      const rampVolume = volumeAtTransition(
        side,
        fraction,
        expectedZ - 0.15,
        expectedZ + 0.15,
      )
      if (rampVolume <= 0.001) {
        failures.push(`hybrid:transition-missing@${side}:${fraction}`)
      }
    }

    const aboveRampVolume = volumeAtTransition(
      side,
      0.5,
      heavyThickness - 0.2,
      heavyThickness + 0.1,
      false,
    )
    if (aboveRampVolume > 0.001) {
      failures.push(`hybrid:transition-overshoots@${side}`)
    }
  }
}

function inspectTargetFrame(
  shape: Shape3D,
  parameters: OpenGridParameters,
  failures: string[],
): void {
  if (!parameters.fitToTarget) return

  const nominal = nominalBoundsForOpenGrid(parameters)
  const target = boundsForOpenGrid(parameters)
  const probeHalf = 0.5
  const zHalf = Math.min(0.2, (target.max[2] - target.min[2]) / 8)
  const zCenter = (target.max[2] + target.min[2]) / 2
  const frameProbeRemainder = 0.2

  if (target.min[0] < nominal.min[0] - frameProbeRemainder) {
    const volume = volumeInProbe(
      shape,
      [target.min[0] + 0.1, -probeHalf, zCenter - zHalf],
      [nominal.min[0] - 0.05, probeHalf, zCenter + zHalf],
    )
    if (volume <= 0.01) failures.push('target-frame:left-strip-missing')
  }
  if (target.max[0] > nominal.max[0] + frameProbeRemainder) {
    const volume = volumeInProbe(
      shape,
      [nominal.max[0] + 0.05, -probeHalf, zCenter - zHalf],
      [target.max[0] - 0.1, probeHalf, zCenter + zHalf],
    )
    if (volume <= 0.01) failures.push('target-frame:right-strip-missing')
  }
  if (target.min[1] < nominal.min[1] - frameProbeRemainder) {
    const volume = volumeInProbe(
      shape,
      [-probeHalf, target.min[1] + 0.1, zCenter - zHalf],
      [probeHalf, nominal.min[1] - 0.05, zCenter + zHalf],
    )
    if (volume <= 0.01) failures.push('target-frame:bottom-strip-missing')
  }
  if (target.max[1] > nominal.max[1] + frameProbeRemainder) {
    const volume = volumeInProbe(
      shape,
      [-probeHalf, nominal.max[1] + 0.05, zCenter - zHalf],
      [probeHalf, target.max[1] - 0.1, zCenter + zHalf],
    )
    if (volume <= 0.01) failures.push('target-frame:top-strip-missing')
  }
}

function inspectCellOpenings(
  shape: Shape3D,
  parameters: OpenGridParameters,
  failures: string[],
): number {
  let openingCount = 0
  const board = boundsForOpenGrid(parameters)
  const probeWidth = 2
  const probeDepth = 2

  const inspectCell = (row: number, column: number): boolean => {
    const [centerX, centerY] = cellCenterForOpenGrid(parameters, row, column)
    let probe: Shape3D | null = null
    let intersection: Shape3D | null = null
    try {
      probe = makeBox(
        [centerX - probeWidth / 2, centerY - probeDepth / 2, -0.5],
        [
          centerX + probeWidth / 2,
          centerY + probeDepth / 2,
          board.max[2] + 0.5,
        ],
      )
      intersection = shape.intersect(probe)
      const volume = measureVolume(intersection)
      if (volume > 0.01) {
        failures.push(`openings:cell-${row}-${column}-not-through`)
        return false
      }
      return true
    } catch (error) {
      failures.push(
        `openings:cell-${row}-${column}:${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    } finally {
      if (intersection && intersection !== shape) deleteShape(intersection)
      deleteShape(probe)
    }
  }

  const cellProbes: Shape3D[] = []
  let combinedProbe: Shape3D | null = null
  let combinedIntersection: Shape3D | null = null
  try {
    for (let row = 0; row < parameters.rows; row += 1) {
      for (let column = 0; column < parameters.columns; column += 1) {
        const [centerX, centerY] = cellCenterForOpenGrid(
          parameters,
          row,
          column,
        )
        cellProbes.push(
          makeBox(
            [centerX - probeWidth / 2, centerY - probeDepth / 2, -0.5],
            [
              centerX + probeWidth / 2,
              centerY + probeDepth / 2,
              board.max[2] + 0.5,
            ],
          ),
        )
      }
    }
    combinedProbe = makeCompound(cellProbes).asShape3D()
    combinedIntersection = shape.intersect(combinedProbe)
    if (measureVolume(combinedIntersection) <= 0.01) {
      return parameters.rows * parameters.columns
    }
  } catch {
    // Fall back to individual probes so the report keeps cell-level failures.
  } finally {
    if (combinedIntersection && combinedIntersection !== shape) {
      deleteShape(combinedIntersection)
    }
    deleteShape(combinedProbe)
    for (const probe of cellProbes) deleteShape(probe)
  }

  for (let row = 0; row < parameters.rows; row += 1) {
    for (let column = 0; column < parameters.columns; column += 1) {
      if (inspectCell(row, column)) openingCount += 1
    }
  }
  return openingCount
}

export function inspectOpenGridShapeQuality(
  shape: Shape3D,
  parameters: OpenGridParameters,
  mesh: MeshData | MeshSnapshot,
): OpenGridQualityReport {
  const expectedBounds = boundsForOpenGrid(parameters)
  const failures: string[] = []
  let bounds: ModelBounds | null = null
  let volume: number | null = null
  let solidCount: number | null = null

  try {
    bounds = readBounds(shape)
    if (!boundsMatch(bounds, expectedBounds)) {
      failures.push('bounds:expected-envelope-or-placement')
    }
  } catch (error) {
    failures.push(
      `bounds:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    volume = measureVolume(shape)
    if (!(volume > 0)) failures.push('volume:non-positive')
  } catch (error) {
    failures.push(
      `volume:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    solidCount = countSolids(shape)
    if (solidCount !== 1) failures.push('topology:not-single-solid')
  } catch (error) {
    failures.push(
      `topology:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    if (!isBRepValid(shape)) failures.push('topology:brep-invalid')
  } catch (error) {
    failures.push(
      `topology:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const cellOpeningCount = inspectCellOpenings(shape, parameters, failures)
  if (cellOpeningCount !== parameters.rows * parameters.columns) {
    failures.push('openings:incomplete-cell-coverage')
  }
  inspectOfficialProfile(shape, parameters, failures)
  inspectHybridProfile(shape, parameters, failures)
  inspectHybridTransition(shape, parameters, failures)
  inspectHalfCellBoundary(shape, parameters, failures)
  inspectTargetFrame(shape, parameters, failures)
  if (mesh.triangleCount <= 0 || !meshIsFinite(mesh)) {
    failures.push('mesh:empty-or-non-finite')
  }

  return {
    passed: failures.length === 0,
    failures,
    bounds,
    expectedBounds,
    volume,
    solidCount,
    cellOpeningCount,
    meshTriangleCount: mesh.triangleCount,
  }
}

export function assertOpenGridShapeQuality(
  shape: Shape3D,
  parameters: OpenGridParameters,
  mesh: MeshData | MeshSnapshot,
): OpenGridQualityReport {
  const report = inspectOpenGridShapeQuality(shape, parameters, mesh)
  if (!report.passed) {
    throw new Error(`OPENGRID_QUALITY_INVALID:${report.failures.join(';')}`)
  }
  return report
}
