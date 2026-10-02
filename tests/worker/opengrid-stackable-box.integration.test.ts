import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, type Shape3D } from 'replicad'
import {
  buildOpenGridStackableBox as buildOpenGridStackableBoxKernel,
  inspectOpenGridStackableBoxInterface,
  inspectOpenGridStackableBoxOpenings,
  inspectOpenGridStackableBoxBottomStructure,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import {
  buildModelBRep,
  type KernelBuildContext,
} from '../../src/cad-kernel/model'
import {
  boundsForOpenGridStackableBox,
  externalOpenGridStackableBoxHeightFor,
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxDerivedGeometryFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxOpeningDirection,
  type OpenGridStackableBoxParameters,
  validateOpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import { createBooleanOperationReporter } from '../../src/cad-kernel/boolean-progress'
import {
  applyStackingProfile,
  bottomStackingProfileTopZ,
  makeBoxShell,
} from '../../src/cad-kernel/components/opengrid-stackable-box/geometry'
import {
  readFaceQualityRecords,
  volumeInBox,
} from '../../src/cad-kernel/components/opengrid-stackable-box/quality-metrics'
import { inspectOpenGridDetachableCornerSeatConsumers } from '../../src/cad-kernel/components/opengrid-locating-assembly/consumer'
import {
  boundsOf,
  cylindricalFaceCount,
  deleteShape,
  initialiseStackableBoxWasm,
  loadDetachableCornerSeatFixtures,
  stackableBoxParameters as parameters,
} from './opengrid-stackable-box.utils'

let detachableCornerSeatReference: Shape3D
let detachableCornerSeatHolderReference: Shape3D

beforeAll(async () => {
  await initialiseStackableBoxWasm()
  ;({ detachableCornerSeatReference, detachableCornerSeatHolderReference } =
    await loadDetachableCornerSeatFixtures())
})

afterAll(() => {
  deleteShape(detachableCornerSeatReference)
  deleteShape(detachableCornerSeatHolderReference)
})

function buildOpenGridStackableBox(
  parameters: OpenGridStackableBoxParameters,
  context: Parameters<typeof buildOpenGridStackableBoxKernel>[1] = {},
): Shape3D {
  return buildOpenGridStackableBoxKernel(parameters, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    ...context,
  })
}

type Point3D = [number, number, number]
type Bounds3D = [Point3D, Point3D]

function openingWallPenetrationProbeFor(
  parameters: OpenGridStackableBoxParameters,
  direction: OpenGridStackableBoxOpeningDirection,
): Bounds3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const opening = derived.openings[direction]
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const wallThickness = configuration.wallThickness
  const probeOverlap = 0.1
  const sideHalfExtent =
    direction === '+X' || direction === '-X' ? width / 2 : depth / 2
  const positiveDirection = direction === '+X' || direction === '+Y'
  const normalMin = positiveDirection
    ? sideHalfExtent - wallThickness - probeOverlap
    : -sideHalfExtent - probeOverlap
  const normalMax = positiveDirection
    ? sideHalfExtent + probeOverlap
    : -sideHalfExtent + wallThickness + probeOverlap
  const tangentHalf = Math.min(0.25, opening.bottomLength / 4)
  const zMin = opening.bottomZ + 0.05
  const zMax = derived.activeUpperInnerRimZ - 0.05

  if (direction === '+X' || direction === '-X') {
    return [
      [normalMin, -tangentHalf, zMin],
      [normalMax, tangentHalf, zMax],
    ]
  }
  return [
    [-tangentHalf, normalMin, zMin],
    [tangentHalf, normalMax, zMax],
  ]
}

describe('OpenGrid stackable-box B-Rep', () => {
  it('reports remaining counts for deterministic fuse and cut scopes', () => {
    const progress: Array<{
      kind: string
      state: string
      completed?: number
      total?: number
    }> = []
    const reporter = createBooleanOperationReporter((update) =>
      progress.push(update),
    )
    const input = parameters({
      x: 2,
      y: 2,
      cornerSeatMode: 'integrated',
      fullBottomHoleGrid: true,
    })
    const shape = buildOpenGridStackableBox(input, {
      booleanOperations: reporter,
    })

    try {
      const completed = progress.filter(
        (update) => update.state === 'completed',
      )
      expect(completed.length).toBeGreaterThan(0)
      expect(completed.every((update) => update.total !== undefined)).toBe(true)
      expect(
        completed.some(
          (update) => update.kind === 'fuse' && update.total !== undefined,
        ),
      ).toBe(true)
      expect(
        completed.some(
          (update) => update.kind === 'cut' && update.total !== undefined,
        ),
      ).toBe(true)
    } finally {
      deleteShape(shape)
    }
  })

  it.each([
    { x: 1, y: 1 },
    { x: 1, y: 4 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0.5 },
  ])(
    'builds a valid $x×$y centered box',
    ({ x, y }) => {
      const input = parameters({ x, y })
      const shape = buildOpenGridStackableBox(input)
      try {
        const actual = boundsOf(shape)
        const expected = boundsForOpenGridStackableBox(input)
        expect(actual[0]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.min[0], 3),
            expect.closeTo(expected.min[1], 3),
            expect.closeTo(expected.min[2], 3),
          ]),
        )
        expect(actual[1]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.max[0], 3),
            expect.closeTo(expected.max[1], 3),
            expect.closeTo(expected.max[2], 3),
          ]),
        )
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(cylindricalFaceCount(shape)).toBeGreaterThanOrEqual(
          openGridStackableBoxSocketCentersFor(input).length,
        )
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('builds through kernel dispatch without a Snap reference loader', async () => {
    const input = parameters({
      x: 1,
      y: 1,
      cornerSeatMode: 'detachable-corner-seat',
    })
    let snapReferenceLoadAttempts = 0
    const context: KernelBuildContext = {
      getModularGridBaseTemplate: async () => {
        throw new Error('UNEXPECTED_MODULAR_GRID_TEMPLATE_LOAD')
      },
      getHswCellTemplate: async () => {
        throw new Error('UNEXPECTED_HSW_TEMPLATE_LOAD')
      },
      getOpenGridSnapReference: async () => {
        snapReferenceLoadAttempts += 1
        throw new Error('SNAP_REFERENCE_MUST_NOT_BE_LOADED')
      },
      getOpenGridDetachableCornerSeatReference: async () =>
        detachableCornerSeatReference,
      getOpenGridDetachableCornerSeatHolderReference: async () =>
        detachableCornerSeatHolderReference,
    }
    const shape = await buildModelBRep('opengrid-stackable-box', input, context)
    try {
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect(cylindricalFaceCount(shape)).toBeGreaterThanOrEqual(
        openGridStackableBoxSocketCentersFor(input).length,
      )
      expect(snapReferenceLoadAttempts).toBe(0)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { x: 1, y: 1 },
    { x: 1, y: 4 },
    { x: 2, y: 2 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0.5 },
  ])(
    'preserves the nominal full-hole grid while replacing corner sockets for $x×$y',
    ({ x, y }) => {
      const input = parameters({
        x,
        y,
        cornerSeatMode: 'detachable-corner-seat',
        fullBottomHoleGrid: true,
      })
      const shape = buildOpenGridStackableBox(input)
      try {
        const report = inspectOpenGridStackableBoxInterface(shape, input)
        const ordinaryCenters =
          openGridStackableBoxOrdinaryBottomHoleCentersFor(input)

        expect(report.expectedOrdinaryBottomHoleCount).toBe(
          ordinaryCenters.length,
        )
        expect(report.ordinaryBottomHoleCount).toBe(ordinaryCenters.length)
        expect(report.captiveSocketRecords).toHaveLength(0)
        const actualBounds = boundsOf(shape)
        const expectedBounds = boundsForOpenGridStackableBox(input)
        expect(actualBounds[0]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expectedBounds.min[0], 3),
            expect.closeTo(expectedBounds.min[1], 3),
            expect.closeTo(expectedBounds.min[2], 3),
          ]),
        )
        expect(actualBounds[1]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expectedBounds.max[0], 3),
            expect.closeTo(expectedBounds.max[1], 3),
            expect.closeTo(expectedBounds.max[2], 3),
          ]),
        )
        expect(measureVolume(shape)).toBeGreaterThan(0)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('keeps ordinary full-grid holes straight at the assembly opening', () => {
    const input = parameters({ x: 2, y: 2, fullBottomHoleGrid: true })
    const shape = buildOpenGridStackableBox(input)
    const ordinaryCenters =
      openGridStackableBoxOrdinaryBottomHoleCentersFor(input)
    try {
      const records = readFaceQualityRecords(shape)
      for (const [centerX, centerY] of ordinaryCenters) {
        const centeredRecords = records.filter((record) => {
          if (record.surfaceType !== 'CYLINDRE') return false
          const recordCenterX = (record.min[0] + record.max[0]) / 2
          const recordCenterY = (record.min[1] + record.max[1]) / 2
          return (
            Math.abs(recordCenterX - centerX) < 0.04 &&
            Math.abs(recordCenterY - centerY) < 0.04
          )
        })
        const throughHole = centeredRecords.find(
          (record) => record.min[2] <= 0.03 && record.max[2] >= 4.97,
        )
        expect(throughHole).toBeDefined()
        const throughHoleDiameter = throughHole
          ? Math.max(
              throughHole.max[0] - throughHole.min[0],
              throughHole.max[1] - throughHole.min[1],
            )
          : Number.NaN
        expect(throughHoleDiameter).toBeCloseTo(
          OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGridHoleDiameter,
          2,
        )
        expect(
          centeredRecords.some((record) => {
            const diameter = Math.max(
              record.max[0] - record.min[0],
              record.max[1] - record.min[1],
            )
            return (
              Math.abs(
                diameter -
                  OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleTopOpeningDiameter,
              ) < 0.02
            )
          }),
        ).toBe(false)
      }
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps the floor quality probe clear of seams and full-hole cutters', () => {
    const input = parameters({
      x: 8,
      y: 1.5,
      fullBottomHoleGrid: true,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const report = inspectOpenGridStackableBoxInterface(shape, input)
      expect(report.floorProbeVolumes[0]).toBeGreaterThan(0.01)
      expect(report.floorProbeThicknesses[0]).toBeCloseTo(1.2, 1)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    {
      name: 'stacking-rail + stacking',
      topRimMode: 'stacking-rail' as const,
      bottomMode: 'stacking' as const,
    },
    {
      name: 'stacking-rail + thin-shell',
      topRimMode: 'stacking-rail' as const,
      bottomMode: 'thin-shell' as const,
    },
    {
      name: 'stacking-rail + none',
      topRimMode: 'stacking-rail' as const,
      bottomMode: 'none' as const,
    },
    {
      name: 'flat-top + stacking',
      topRimMode: 'flat-top' as const,
      bottomMode: 'stacking' as const,
    },
    {
      name: 'flat-top + thin-shell',
      topRimMode: 'flat-top' as const,
      bottomMode: 'thin-shell' as const,
    },
    {
      name: 'flat-top + none',
      topRimMode: 'flat-top' as const,
      bottomMode: 'none' as const,
    },
  ])(
    'builds and exports the $name combination within its expected bounds',
    ({ topRimMode, bottomMode }) => {
      const input = parameters({ topRimMode, bottomMode })
      const expected = boundsForOpenGridStackableBox(input)
      const shape = buildOpenGridStackableBox(input)
      try {
        const actual = boundsOf(shape)
        expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 3)
        expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 3)
        expect(measureVolume(shape)).toBeGreaterThan(0)
        if (topRimMode === 'flat-top') {
          const [width] = nominalOpenGridStackableBoxFootprintFor(input)
          const chamfer = OPENGRID_STACKABLE_BOX_CONFIGURATION.flatTopRimChamfer
          const externalTop = expected.max[2]
          const innerBandStart = width / 2 - 1.15
          const innerBandEnd = width / 2 - 0.8
          const insideTopChamfer = makeBox(
            [innerBandStart, -1, externalTop - 0.3],
            [innerBandEnd, 1, externalTop - 0.05],
          )
          const belowTopChamfer = makeBox(
            [innerBandStart, -1, externalTop - chamfer - 0.6],
            [innerBandEnd, 1, externalTop - chamfer - 0.1],
          )
          try {
            const chamfered = shape.intersect(insideTopChamfer)
            expect(measureVolume(chamfered)).toBeCloseTo(0, 3)
            chamfered.delete()
            const wall = shape.intersect(belowTopChamfer)
            expect(measureVolume(wall)).toBeGreaterThan(0.01)
            wall.delete()
          } finally {
            insideTopChamfer.delete()
            belowTopChamfer.delete()
          }
        }
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('hosts detachable corner seats on the open-bottom corner pads', () => {
    const input = parameters({
      cornerSeatMode: 'detachable-corner-seat',
      bottomMode: 'none',
    })
    const expected = boundsForOpenGridStackableBox(input)
    const shape = buildOpenGridStackableBox(input)
    try {
      const actual = boundsOf(shape)
      expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 3)
      expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 3)
      const centers = openGridStackableBoxSocketCentersFor(input)
      expect(centers).toHaveLength(4)
      const records = inspectOpenGridDetachableCornerSeatConsumers(
        shape,
        centers,
        {
          detachableCornerSeatReference,
          detachableCornerSeatHolderReference,
        },
      )
      expect(records).toHaveLength(4)
      for (const record of records) {
        expect(record).toMatchObject({
          socketVoidResidualVolume: expect.closeTo(0, 6),
          maleCollisionVolume: expect.closeTo(0, 6),
        })
      }
      const openProbe = makeBox([-40, -40, 0.01], [40, 40, 1.9])
      try {
        const openVolume = measureVolume(shape.intersect(openProbe))
        expect(openVolume).toBeGreaterThan(0)
        expect(openVolume).toBeLessThan(
          0.4 *
            (nominalOpenGridStackableBoxFootprintFor(input)[0] *
              nominalOpenGridStackableBoxFootprintFor(input)[1] *
              1.9),
        )
      } finally {
        openProbe.delete()
      }
      // A square pad (half 8) would keep material at 7.5 mm diagonally off
      // the socket center; the round pad (radius = hole + 5 mm = 10.5) does
      // not cover that point, so the probe must stay empty.
      const squareCornerProbe = makeBox(
        [
          centers[0]![0]! + Math.sign(centers[0]![0]!) * 7.5 - 0.3,
          centers[0]![1]! + Math.sign(centers[0]![1]!) * 7.5 - 0.3,
          0.01,
        ],
        [
          centers[0]![0]! + Math.sign(centers[0]![0]!) * 7.5 + 0.3,
          centers[0]![1]! + Math.sign(centers[0]![1]!) * 7.5 + 0.3,
          1.9,
        ],
      )
      try {
        expect(measureVolume(shape.intersect(squareCornerProbe))).toBeCloseTo(
          0,
          3,
        )
      } finally {
        squareCornerProbe.delete()
      }
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('fuses integrated seats below the open-bottom corner pads', () => {
    const input = parameters({
      cornerSeatMode: 'integrated',
      bottomMode: 'none',
    })
    const expected = boundsForOpenGridStackableBox(input)
    const shape = buildOpenGridStackableBox(input)
    try {
      const actual = boundsOf(shape)
      expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 3)
      expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 3)
      const centers = openGridStackableBoxSocketCentersFor(input)
      expect(centers).toHaveLength(4)
      const records = readFaceQualityRecords(shape).filter(
        (record) => record.surfaceType === 'CYLINDRE',
      )
      for (const [centerX, centerY] of centers) {
        const record = records.find((candidate) => {
          const candidateCenterX = (candidate.min[0] + candidate.max[0]) / 2
          const candidateCenterY = (candidate.min[1] + candidate.max[1]) / 2
          return (
            Math.abs(candidateCenterX - centerX) <= 0.08 &&
            Math.abs(candidateCenterY - centerY) <= 0.08
          )
        })
        expect(record).toBeDefined()
        expect(record!.min[2]).toBeCloseTo(
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ +
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatBottomChamfer,
          1,
        )
        expect(record!.max[2]).toBeCloseTo(0, 1)
      }
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { x: 1, y: 1 },
    { x: 0.5, y: 0.5 },
  ])(
    'opens the whole bottom of the $x×$y open-bottom box without corner seats',
    ({ x, y }) => {
      const input = parameters({
        x,
        y,
        height: 20,
        bottomMode: 'none',
      })
      const shape = buildOpenGridStackableBox(input)
      const interiorHalf =
        nominalOpenGridStackableBoxFootprintFor(input)[0] / 2 -
        OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness -
        OPENGRID_STACKABLE_BOX_CONFIGURATION.outerCornerRadius -
        0.2
      const floorProbe = makeBox(
        [-interiorHalf, -interiorHalf, 0.01],
        [interiorHalf, interiorHalf, 1.9],
      )
      try {
        const actual = boundsOf(shape)
        const expected = boundsForOpenGridStackableBox(input)
        expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 3)
        expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 3)
        expect(measureVolume(shape.intersect(floorProbe))).toBeCloseTo(0, 3)
      } finally {
        floorProbe.delete()
        deleteShape(shape)
      }
    },
    120_000,
  )

  it.each([
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 0.5, y: 0.5 },
  ])(
    'builds the non-stackable thin-shell bottom at $x×$y',
    ({ x, y }) => {
      const input = parameters({
        x,
        y,
        height: 20,
        topRimMode: 'flat-top',
        bottomMode: 'thin-shell',
      })
      const shape = buildOpenGridStackableBox(input)
      try {
        const report = inspectOpenGridStackableBoxBottomStructure(shape, input)
        const expected = boundsForOpenGridStackableBox(input)
        const actual = boundsOf(shape)
        expect(actual[0]?.[2]).toBeCloseTo(0, 3)
        expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 3)
        expect(report.floorProbeThickness).toBeCloseTo(2, 1)
        expect(
          report.sideWallProbeThicknesses.every(
            (thickness) => thickness >= 1.1 && thickness <= 1.3,
          ),
        ).toBe(true)
        const [width] = nominalOpenGridStackableBoxFootprintFor(input)
        const chamfer =
          OPENGRID_STACKABLE_BOX_CONFIGURATION.thinShellBottomChamfer
        const outerSliver = width / 2 - 0.3
        const insideChamferZone = makeBox(
          [outerSliver, -1, 0.05],
          [width / 2 + 1, 1, chamfer - 0.3],
        )
        const aboveChamferZone = makeBox(
          [outerSliver, -1, chamfer + 0.2],
          [width / 2 + 1, 1, 1.9],
        )
        try {
          const chamfered = shape.intersect(insideChamferZone)
          expect(measureVolume(chamfered)).toBeCloseTo(0, 3)
          chamfered.delete()
          const wall = shape.intersect(aboveChamferZone)
          expect(measureVolume(wall)).toBeGreaterThan(0.01)
          wall.delete()
        } finally {
          insideChamferZone.delete()
          aboveChamferZone.delete()
        }
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('uses the thin-shell two-stage sockets and ordinary through holes', async () => {
    const input = parameters({
      x: 1,
      y: 1,
      height: 20,
      cornerSeatMode: 'detachable-corner-seat',
      topRimMode: 'flat-top',
      bottomMode: 'thin-shell',
      fullBottomHoleGrid: true,
    })
    const shape = buildOpenGridStackableBox(input)
    const [center] = openGridStackableBoxSocketCentersFor(input)
    if (!center) throw new Error('MISSING_SOCKET_CENTER')
    try {
      const report = inspectOpenGridStackableBoxBottomStructure(shape, input)
      const records = inspectOpenGridDetachableCornerSeatConsumers(
        shape,
        [center],
        {
          detachableCornerSeatReference,
          detachableCornerSeatHolderReference,
        },
      )
      expect(records).toHaveLength(1)
      expect(records[0]).toMatchObject({
        socketVoidResidualVolume: expect.closeTo(0, 6),
        maleCollisionVolume: expect.closeTo(0, 6),
      })
      expect(report.ordinaryBottomHoleCount).toBe(
        openGridStackableBoxOrdinaryBottomHoleCentersFor(input).length,
      )
      const [step, stl] = await Promise.all([
        exportStepBytes(shape),
        exportStlBytes(shape),
      ])
      expect(step.byteLength).toBeGreaterThan(0)
      expect(stl.byteLength).toBeGreaterThan(84)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps all four box-native opening modes on the thin-shell datum', () => {
    const input = parameters({
      x: 2,
      y: 2,
      height: 20,
      topRimMode: 'flat-top',
      bottomMode: 'thin-shell',
      openingPlusXDepth: 4,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 45,
      openingMinusXDepth: 8,
      openingMinusXBottomLength: 8,
      openingMinusXAngle: 90,
      openingPlusYDepth: 4,
      openingPlusYBottomLength: 8,
      openingPlusYAngle: 45,
      openingMinusYDepth: 8,
      openingMinusYBottomLength: 8,
      openingMinusYAngle: 90,
    })
    const validation = validateOpenGridStackableBoxParameters(input)
    expect(validation.valid).toBe(true)
    const shape = buildOpenGridStackableBox(input)
    try {
      const quality = inspectOpenGridStackableBoxOpenings(shape, input)
      expect(quality).toHaveLength(4)
      expect(quality.every((record) => record.cutProbeVolume <= 0.01)).toBe(
        true,
      )
      expect(quality.every((record) => record.planarSillFaceCount >= 1)).toBe(
        true,
      )
      expect(quality.every((record) => record.planarSideFaceCount >= 2)).toBe(
        true,
      )
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps ordinary thin-shell grid holes when corner sockets are disabled', () => {
    const input = parameters({
      x: 1,
      y: 1,
      topRimMode: 'flat-top',
      bottomMode: 'thin-shell',
      cornerSeatMode: 'none',
      fullBottomHoleGrid: true,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const report = inspectOpenGridStackableBoxBottomStructure(shape, input)
      expect(report.padProbeVolumes).toHaveLength(0)
      expect(report.ordinaryBottomHoleCount).toBe(
        openGridStackableBoxOrdinaryBottomHoleCentersFor(input).length,
      )
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps the detachable seat interface usable on the thin-shell bottom', () => {
    const input = parameters({
      x: 1,
      y: 1,
      height: 20,
      cornerSeatMode: 'detachable-corner-seat',
      topRimMode: 'flat-top',
      bottomMode: 'thin-shell',
    })
    const shape = buildOpenGridStackableBox(input)
    const [center] = openGridStackableBoxSocketCentersFor(input)
    if (!center) throw new Error('MISSING_SOCKET_CENTER')
    try {
      const [record] = inspectOpenGridDetachableCornerSeatConsumers(
        shape,
        [center],
        {
          detachableCornerSeatReference,
          detachableCornerSeatHolderReference,
        },
      )
      expect(record).toMatchObject({
        socketVoidResidualVolume: expect.closeTo(0, 6),
        maleCollisionVolume: expect.closeTo(0, 6),
      })
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { profile: 'stacking', bottomMode: 'stacking' as const },
    {
      profile: 'thin-shell',
      bottomMode: 'thin-shell' as const,
      topRimMode: 'flat-top' as const,
    },
  ])(
    'builds a rounded +X opening over the $profile bottom',
    ({ profile: _profile, bottomMode, ...rest }) => {
      const input = parameters({
        x: 2,
        y: 2,
        height: 20,
        bottomMode,
        ...rest,
        openingPlusXDepth: 4,
        openingPlusXBottomLength: 8,
        openingPlusXAngle: 45,
      })
      const shape = buildOpenGridStackableBox(input)
      try {
        const [quality] = inspectOpenGridStackableBoxOpenings(shape, input)
        expect(quality).toMatchObject({
          direction: '+X',
          cutProbeVolume: expect.closeTo(0, 2),
          sillProbeVolume: expect.any(Number),
        })
        expect(quality?.planarSillFaceCount).toBeGreaterThanOrEqual(1)
        expect(quality?.planarSideFaceCount).toBeGreaterThanOrEqual(2)
        expect(quality?.cylindricalFaceCount).toBeGreaterThanOrEqual(4)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('opens the notch through the top edge with rounded transitions', () => {
    const input = parameters({
      x: 2,
      y: 2,
      height: 20,
      openingPlusXDepth: 18,
      openingPlusXBottomLength: 20,
      openingPlusXAngle: 90,
    })
    const shape = buildOpenGridStackableBox(input)
    const [sideHalfExtent] = boundsForOpenGridStackableBox(input).max
    const externalHeight = externalOpenGridStackableBoxHeightFor(input)
    const topEdgeProbe = makeBox(
      [sideHalfExtent - 1.15, -6, externalHeight - 1.5],
      [sideHalfExtent + 0.02, 6, externalHeight - 0.1],
    )
    const railProbe = makeBox(
      [
        sideHalfExtent -
          OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailWidth +
          0.08,
        -6,
        externalHeight -
          OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight +
          0.1,
      ],
      [
        sideHalfExtent -
          OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness +
          0.02,
        6,
        externalHeight - 0.1,
      ],
    )
    try {
      const [quality] = inspectOpenGridStackableBoxOpenings(shape, input)
      expect(measureVolume(shape.intersect(topEdgeProbe))).toBeCloseTo(0, 2)
      expect(measureVolume(shape.intersect(railProbe))).toBeCloseTo(0, 2)
      expect(quality?.cylindricalFaceCount).toBeGreaterThanOrEqual(4)
    } finally {
      topEdgeProbe.delete()
      railProbe.delete()
      deleteShape(shape)
    }
  }, 120_000)

  it('removes the complete selected rail for a long -Y opening', () => {
    const input = parameters({
      x: 4.5,
      y: 2,
      height: 63,
      openingMinusYDepth: 18,
      openingMinusYBottomLength: 20,
      openingMinusYAngle: 90,
    })
    const shape = buildOpenGridStackableBox(input)
    const bounds = boundsForOpenGridStackableBox(input)
    const sideHalfExtent = Math.abs(bounds.min[1] ?? 0)
    const externalHeight = externalOpenGridStackableBoxHeightFor(input)
    const railProbe = makeBox(
      [
        -10,
        -sideHalfExtent +
          OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness -
          0.02,
        externalHeight -
          OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight +
          0.1,
      ],
      [
        10,
        -sideHalfExtent +
          OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailWidth -
          0.08,
        externalHeight - 0.1,
      ],
    )
    try {
      expect(measureVolume(shape.intersect(railProbe))).toBeCloseTo(0, 2)
    } finally {
      railProbe.delete()
      deleteShape(shape)
    }
  }, 120_000)

  it('builds four independent rectangular openings without changing the box footprint', () => {
    const input = parameters({
      x: 2,
      y: 2,
      height: 20,
      fullBottomHoleGrid: true,
      openingPlusXDepth: 6,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 90,
      openingMinusXDepth: 4,
      openingMinusXBottomLength: 6,
      openingMinusXAngle: 60,
      openingPlusYDepth: 5,
      openingPlusYBottomLength: 7,
      openingPlusYAngle: 45,
      openingMinusYDepth: 5,
      openingMinusYBottomLength: 9,
      openingMinusYAngle: 75,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const quality = inspectOpenGridStackableBoxOpenings(shape, input)
      expect(quality.map((record) => record.direction)).toEqual([
        '+X',
        '-X',
        '+Y',
        '-Y',
      ])
      expect(quality.every((record) => record.cutProbeVolume <= 0.01)).toBe(
        true,
      )
      expect(boundsOf(shape)).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            expect.closeTo(-27.925, 3),
            expect.closeTo(-27.925, 3),
            expect.closeTo(0, 3),
          ]),
          expect.arrayContaining([
            expect.closeTo(27.925, 3),
            expect.closeTo(27.925, 3),
            expect.closeTo(31.45, 3),
          ]),
        ]),
      )
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    {
      profile: 'stacking-rail + stacking',
      topRimMode: 'stacking-rail' as const,
      bottomMode: 'stacking' as const,
    },
    {
      profile: 'flat-top + thin-shell',
      topRimMode: 'flat-top' as const,
      bottomMode: 'thin-shell' as const,
    },
  ])(
    'cuts every $profile opening completely through its wall',
    ({ topRimMode, bottomMode }) => {
      const input = parameters({
        x: 2,
        y: 2,
        height: 20,
        topRimMode,
        bottomMode,
        openingPlusXDepth: 6,
        openingPlusXBottomLength: 8,
        openingPlusXAngle: 90,
        openingMinusXDepth: 4,
        openingMinusXBottomLength: 6,
        openingMinusXAngle: 60,
        openingPlusYDepth: 5,
        openingPlusYBottomLength: 7,
        openingPlusYAngle: 45,
        openingMinusYDepth: 5,
        openingMinusYBottomLength: 9,
        openingMinusYAngle: 75,
      })
      const shape = buildOpenGridStackableBox(input)
      try {
        const quality = inspectOpenGridStackableBoxOpenings(shape, input)
        expect(quality.map((record) => record.direction)).toEqual(
          OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS,
        )
        expect(quality.every((record) => record.cutProbeVolume <= 0.01)).toBe(
          true,
        )
        expect(quality.every((record) => record.planarSillFaceCount >= 1)).toBe(
          true,
        )
        expect(quality.every((record) => record.planarSideFaceCount >= 2)).toBe(
          true,
        )
        for (const direction of OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS) {
          const [min, max] = openingWallPenetrationProbeFor(input, direction)
          expect(volumeInBox(shape, min, max)).toBeLessThanOrEqual(0.01)
        }

        const expectedBounds = boundsForOpenGridStackableBox(input)
        const actualBounds = boundsOf(shape)
        expect(actualBounds[0]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expectedBounds.min[0], 3),
            expect.closeTo(expectedBounds.min[1], 3),
            expect.closeTo(expectedBounds.min[2], 3),
          ]),
        )
        expect(actualBounds[1]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expectedBounds.max[0], 3),
            expect.closeTo(expectedBounds.max[1], 3),
            expect.closeTo(expectedBounds.max[2], 3),
          ]),
        )
        expect(measureVolume(shape)).toBeGreaterThan(0)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('keeps a zero-depth opposite wall solid when one side is open', () => {
    const input = parameters({
      x: 2,
      y: 2,
      height: 20,
      openingPlusXDepth: 4,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 45,
    })
    const shape = buildOpenGridStackableBox(input)
    const bounds = boundsForOpenGridStackableBox(input)
    try {
      const oppositeWallVolume = volumeInBox(
        shape,
        [bounds.min[0] - 0.02, -0.25, 21.05],
        [bounds.min[0] + 1.15, 0.25, 24.95],
      )
      expect(oppositeWallVolume).toBeGreaterThan(0.1)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps a side opening valid on a half-cell footprint', () => {
    const input = parameters({
      x: 0.5,
      y: 1.5,
      height: 20,
      openingPlusXDepth: 2,
      openingPlusXBottomLength: 1,
      openingPlusXAngle: 90,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const [quality] = inspectOpenGridStackableBoxOpenings(shape, input)
      expect(quality).toMatchObject({
        direction: '+X',
        cutProbeVolume: expect.closeTo(0, 2),
      })
      expect(
        quality?.cornerBridgeVolumes.every((volume) => volume > 0.001),
      ).toBe(true)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { cornerSeatMode: 'none' as const, fullBottomHoleGrid: false },
    { cornerSeatMode: 'none' as const, fullBottomHoleGrid: true },
  ])(
    'builds no-seat mode with fullBottomHoleGrid=$fullBottomHoleGrid',
    (holeMode) => {
      const input = parameters({ x: 1, y: 1, ...holeMode })
      const shape = buildOpenGridStackableBox(input)
      try {
        const report = inspectOpenGridStackableBoxInterface(shape, input)
        const ordinaryCenters =
          openGridStackableBoxOrdinaryBottomHoleCentersFor(input)

        expect(report.captiveSocketRecords).toHaveLength(0)
        expect(report.ordinaryBottomHoleCount).toBe(ordinaryCenters.length)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )
})
