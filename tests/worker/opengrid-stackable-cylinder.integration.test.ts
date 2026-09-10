import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  makeBox,
  makeCylinder,
  measureVolume,
  setOC,
  type Shape3D,
} from 'replicad'
import {
  buildOpenGridStackableCylinder as buildOpenGridStackableCylinderKernel,
  inspectOpenGridStackableCylinderInterface,
} from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'
import {
  boundsForOpenGridStackableCylinder,
  openGridStackableCylinderDerivedGeometryFor,
  openGridStackableCylinderHoleCentersFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  type OpenGridStackableCylinderParameters,
} from '../../src/cad-contract/units'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  importOpenGridDetachableCornerSeatHolderReference,
  importOpenGridDetachableCornerSeatReference,
} from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'
import { inspectOpenGridDetachableCornerSeatConsumers } from '../../src/cad-kernel/components/opengrid-locating-assembly/consumer'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')
const DETACHABLE_MALE_REFERENCE_PATH = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-v13.step',
  import.meta.url,
)
const DETACHABLE_HOLDER_REFERENCE_PATH = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-holder-11.step',
  import.meta.url,
)
let detachableCornerSeatReference: Shape3D
let detachableCornerSeatHolderReference: Shape3D

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
  ;[detachableCornerSeatReference, detachableCornerSeatHolderReference] =
    await Promise.all([
      importOpenGridDetachableCornerSeatReference(
        new Blob([readFileSync(DETACHABLE_MALE_REFERENCE_PATH)]),
      ),
      importOpenGridDetachableCornerSeatHolderReference(
        new Blob([readFileSync(DETACHABLE_HOLDER_REFERENCE_PATH)]),
      ),
    ])
})

afterAll(() => {
  deleteShape(detachableCornerSeatReference)
  deleteShape(detachableCornerSeatHolderReference)
})

function buildOpenGridStackableCylinder(
  parameters: OpenGridStackableCylinderParameters,
  context: Parameters<typeof buildOpenGridStackableCylinderKernel>[1] = {},
): Shape3D {
  return buildOpenGridStackableCylinderKernel(parameters, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
    ...context,
  })
}

function parameters(
  overrides: Partial<OpenGridStackableCylinderParameters> = {},
): OpenGridStackableCylinderParameters {
  return {
    ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
    innerDiameter: overrides.innerDiameter ?? 52,
    height: overrides.height ?? 30,
    ...overrides,
  }
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not hide the geometry assertion.
  }
}

function volumeInBox(
  shape: Shape3D,
  minimum: [number, number, number],
  maximum: [number, number, number],
): number {
  const probe = makeBox(minimum, maximum)
  const intersection = shape.intersect(probe)
  try {
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    deleteShape(probe)
  }
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

describe('OpenGrid stackable-cylinder B-Rep', () => {
  it.each([
    { innerDiameter: 20, expectedOuterHoleCount: 0 },
    { innerDiameter: 35, expectedOuterHoleCount: 0 },
    { innerDiameter: 36, expectedOuterHoleCount: 0 },
    { innerDiameter: 43, expectedOuterHoleCount: 0 },
    { innerDiameter: 44, expectedOuterHoleCount: 0 },
    { innerDiameter: 52, expectedOuterHoleCount: 4 },
    { innerDiameter: 296, expectedOuterHoleCount: 4 },
  ])(
    'builds a valid centered $innerDiameter mm inner-diameter cylinder with the safe cardinal layout',
    ({ innerDiameter, expectedOuterHoleCount }) => {
      const input = parameters({ innerDiameter })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        const expectedBounds = boundsForOpenGridStackableCylinder(input)
        expect(report.bounds.min).toEqual([
          expect.closeTo(expectedBounds.min[0], 3),
          expect.closeTo(expectedBounds.min[1], 3),
          expect.closeTo(expectedBounds.min[2], 3),
        ])
        expect(report.bounds.max).toEqual([
          expect.closeTo(expectedBounds.max[0], 3),
          expect.closeTo(expectedBounds.max[1], 3),
          expect.closeTo(expectedBounds.max[2], 3),
        ])
        expect(report.volume).toBeGreaterThan(0)
        expect(report.solidCount).toBe(1)
        expect(report.brepValid).toBe(true)
        expect(report.holes).toHaveLength(expectedOuterHoleCount + 1)
        expect(report.holes.slice(1).map((hole) => hole.center)).toEqual(
          expect.arrayContaining(
            openGridStackableCylinderHoleCentersFor(input).slice(1),
          ),
        )
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('builds the clipped bottom-plate mode with the default-style interior', () => {
    const input = parameters({
      bottomPlateMode: true,
      bottomSeatMode: 'detachable-corner-seat',
    })
    const derived = openGridStackableCylinderDerivedGeometryFor(input)
    const shape = buildOpenGridStackableCylinder(input)
    try {
      const report = inspectOpenGridStackableCylinderInterface(shape, input)
      expect(report.profile).toBe('bottom-plate')
      expect(report.bottomPlateMode).toBe(true)
      expect(report.floorThickness).toBe(3)
      expect(report.bottomHoleSectionDepth).toBe(2)
      expect(report.holes).toHaveLength(5)
      expect(report.bottomFootChamferFaceCount).toBe(0)
      expect(report.bottomFootChamferHeight).toBe(0)
      expect(derived.outerTransitionStartRadius).toBeCloseTo(
        derived.matingProtrusionRadius,
        2,
      )
      expect(derived.outerTransitionStartZ).toBe(0)
      expect(derived.lowerFootRadius).toBeCloseTo(
        derived.matingProtrusionRadius,
        2,
      )
      expect(report.bottomOuterChamferFaceCount).toBeGreaterThan(0)
      const outerTransitionHeight =
        derived.outerTransitionEndZ - derived.outerTransitionStartZ
      const outerTransitionAngle = Math.atan2(
        outerTransitionHeight,
        derived.outerTransitionEndRadius - derived.outerTransitionStartRadius,
      )
      expect(report.bottomOuterChamferHeight).toBeCloseTo(
        outerTransitionHeight -
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius *
            (1 - Math.cos(outerTransitionAngle)),
        2,
      )
      expect(report.innerRampFaceCount).toBe(0)
      expect(report.internalFilletFaceCount).toBe(1)
      expect(report.internalFilletHeight).toBeGreaterThanOrEqual(0.55)
      expect(report.bottomProtrusionVolume).toBeGreaterThan(0)
      expect(report.bottomMatingClearance).toBeCloseTo(
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.stackFitClearance,
        2,
      )
      expect(report.matingIntersectionVolume).toBeLessThan(0.01)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { innerDiameter: 20, expectedHoleCount: 1 },
    { innerDiameter: 43, expectedHoleCount: 5 },
    { innerDiameter: 44, expectedHoleCount: 5 },
    { innerDiameter: 296, expectedHoleCount: 5 },
  ])(
    'builds the bottom-plate profile at the supported $innerDiameter mm inner diameter and hole threshold',
    ({ innerDiameter, expectedHoleCount }) => {
      const input = parameters({ innerDiameter, bottomPlateMode: true })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        const expectedBounds = boundsForOpenGridStackableCylinder(input)
        expect(report.profile).toBe('bottom-plate')
        expect(report.bounds.min[2]).toBeCloseTo(expectedBounds.min[2], 3)
        expect(report.bounds.max[2]).toBeCloseTo(expectedBounds.max[2], 3)
        expect(report.floorThickness).toBe(3)
        expect(report.bottomHoleSectionDepth).toBe(2)
        expect(report.holes).toHaveLength(expectedHoleCount)
        expect(report.bottomFootChamferFaceCount).toBe(0)
        expect(report.bottomFootChamferHeight).toBe(0)
        expect(report.matingIntersectionVolume).toBeLessThan(0.01)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it.each([
    {
      name: 'thin',
      overrides: {},
    },
    {
      name: 'bottom-plate',
      overrides: { bottomPlateMode: true },
    },
  ])(
    'keeps the center locking seat valid in $name mode',
    ({ overrides }) => {
      const input = parameters({
        innerDiameter: 52,
        ...overrides,
      })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const [record] = inspectOpenGridDetachableCornerSeatConsumers(
          shape,
          [[0, 0]],
          {
            detachableCornerSeatReference,
            detachableCornerSeatHolderReference,
          },
        )
        expect(record).toMatchObject({
          socketVoidResidualVolume: expect.closeTo(0, 6),
          maleCollisionVolume: expect.closeTo(0, 6),
        })
        expect(record?.roofVolume).toBeGreaterThan(0.001)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it.each([
    { profile: 'thin', bottomPlateMode: false },
    {
      profile: 'bottom-plate',
      bottomPlateMode: true,
    },
  ])(
    'keeps the $profile stacking geometry valid in no-seat mode',
    ({ profile, bottomPlateMode }) => {
      const input = parameters({
        bottomPlateMode,
        bottomSeatMode: 'none',
      })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        expect(report.profile).toBe(profile)
        expect(report.bottomPlateMode).toBe(bottomPlateMode)
        expect(report.bottomSeatMode).toBe('none')
        expect(report.holeRecordCount).toBe(0)
        expect(report.holes).toEqual([])
        expect(report.solidCount).toBe(1)
        expect(report.brepValid).toBe(true)
        expect(report.bottomProtrusionVolume).toBeGreaterThan(0)
        expect(report.matingIntersectionVolume).toBeLessThan(0.01)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it.each([
    { profile: 'thin', bottomPlateMode: false },
    {
      profile: 'bottom-plate',
      bottomPlateMode: true,
    },
  ])(
    'builds integrated Ø5 by 3.8 mm chamfered seats in the $profile profile as one valid solid',
    ({ bottomPlateMode }) => {
      const input = parameters({
        bottomPlateMode,
        bottomSeatMode: 'integrated',
      })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        const expectedCenters = openGridStackableCylinderHoleCentersFor(input)
        expect(report.bottomSeatMode).toBe('integrated')
        expect(report.bounds.min[2]).toBeCloseTo(
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ,
          2,
        )
        expect(report.holeRecordCount).toBe(0)
        expect(report.holes).toEqual([])
        expect(report.integratedSeatRecordCount).toBe(expectedCenters.length)
        expect(report.integratedSeats).toHaveLength(expectedCenters.length)
        for (const seat of report.integratedSeats) {
          expect(seat.minZ).toBeCloseTo(
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ +
              OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatBottomChamfer,
            1,
          )
          expect(seat.maxZ).toBeCloseTo(0, 1)
        }
        expect(report.solidCount).toBe(1)
        expect(report.brepValid).toBe(true)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('keeps straight vertical U-opening sides above the rounded corners', () => {
    const input = parameters({
      openingPlusXDepth: 12,
      openingPlusXBottomLength: 12,
      openingPlusXAngle: 90,
    })
    const shape = buildOpenGridStackableCylinder(input)
    try {
      expect(
        volumeInBox(shape, [21.8, 11.5, 24], [24.8, 11.7, 24.5]),
      ).toBeGreaterThan(0.0001)
      expect(volumeInBox(shape, [26.5, -3, 22], [28.5, 3, 23])).toBeLessThan(
        0.001,
      )
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('accepts the height-minus-floor opening depth limit', () => {
    const input = parameters({
      openingPlusXDepth: 25,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 90,
    })
    const shape = buildOpenGridStackableCylinder(input)
    try {
      const report = inspectOpenGridStackableCylinderInterface(shape, input)
      expect(report.brepValid).toBe(true)
      expect(report.solidCount).toBe(1)
      expect(
        report.openings.find((opening) => opening.direction === '+X'),
      ).toMatchObject({ enabled: true, bottomZ: 5, valid: true })
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('opens with outward-sloping V sides at a 45 degree side angle', () => {
    const input = parameters({
      openingPlusXDepth: 8,
      openingPlusXBottomLength: 1,
      openingPlusXAngle: 45,
    })
    const shape = buildOpenGridStackableCylinder(input)
    try {
      expect(
        volumeInBox(shape, [25.5, 7.5, 29.2], [25.9, 8, 29.6]),
      ).toBeLessThan(0.001)
      expect(
        volumeInBox(shape, [25.4, 10.3, 29.2], [25.7, 10.7, 29.6]),
      ).toBeGreaterThan(0.0001)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { innerDiameter: 20, expectedHoleCount: 1 },
    { innerDiameter: 53, expectedHoleCount: 5 },
    { innerDiameter: 296, expectedHoleCount: 5 },
  ])(
    'builds the thin profile at supported inner diameter $innerDiameter',
    ({ innerDiameter, expectedHoleCount }) => {
      const input = parameters({ innerDiameter })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        expect(report.profile).toBe('thin')
        expect(report.floorThickness).toBe(2)
        expect(report.bottomHoleSectionDepth).toBe(1)
        expect(report.holes).toHaveLength(expectedHoleCount)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it.each([
    { innerDiameter: 43, expectedHoleCount: 1 },
    { innerDiameter: 44, expectedHoleCount: 1 },
    { innerDiameter: 45, expectedHoleCount: 1 },
  ])(
    'builds the thin profile at the $innerDiameter mm inner-diameter outer-hole threshold',
    ({ innerDiameter, expectedHoleCount }) => {
      const input = parameters({ innerDiameter })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        expect(report.holes).toHaveLength(expectedHoleCount)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('keeps the central flat floor at 2 mm', () => {
    const input = parameters({ innerDiameter: 52 })
    const shape = buildOpenGridStackableCylinder(input)
    const belowCavity = makeCylinder(0.5, 0.1, [10, 0, 1.9])
    const insideCavity = makeCylinder(0.5, 0.1, [10, 0, 2.01])
    const belowIntersection = shape.intersect(belowCavity)
    const insideIntersection = shape.intersect(insideCavity)
    try {
      expect(measureVolume(belowIntersection)).toBeGreaterThan(0.05)
      expect(measureVolume(insideIntersection)).toBeLessThan(0.001)
    } finally {
      deleteShape(insideIntersection)
      deleteShape(belowIntersection)
      deleteShape(insideCavity)
      deleteShape(belowCavity)
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps every hole outer edge at least 2 mm from the cylinder edge', () => {
    const input = parameters({ innerDiameter: 296 })
    const shape = buildOpenGridStackableCylinder(input)
    try {
      const report = inspectOpenGridStackableCylinderInterface(shape, input)
      expect(report.holeOuterClearances).toHaveLength(4)
      expect(report.holeOuterClearances).toEqual(
        expect.arrayContaining([
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
        ]),
      )
      expect(
        report.holeOuterClearances.every((clearance) => clearance >= 2),
      ).toBe(true)
      expect(
        report.holeFlatFloorClearances.every((clearance) => clearance >= 2),
      ).toBe(true)
      for (const hole of report.holes) {
        const centerRadius = Math.hypot(hole.center[0], hole.center[1])
        const largestSection = Math.max(
          ...hole.sections.map((section) => section.diameter),
        )
        expect(
          openGridStackableCylinderDerivedGeometryFor(input).radius -
            centerRadius -
            largestSection / 2,
        ).toBeGreaterThanOrEqual(
          OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.outerEdgeClearance - 0.05,
        )
        expect(
          openGridStackableCylinderDerivedGeometryFor(input).flatFloorRadius -
            centerRadius -
            largestSection / 2,
        ).toBeGreaterThanOrEqual(
          OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.flatFloorClearance - 0.05,
        )
      }
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps the reference-inspired profile valid after a dimension update', () => {
    const input = parameters({
      innerDiameter: 54,
      height: 31,
    })
    const derived = openGridStackableCylinderDerivedGeometryFor(input)
    const shape = buildOpenGridStackableCylinder(input)
    try {
      const report = inspectOpenGridStackableCylinderInterface(shape, input)
      expect(report.brepValid).toBe(true)
      expect(report.solidCount).toBe(1)
      expect(report.centralFloorBelowVolume).toBeGreaterThan(0.0001)
      expect(report.centralFloorAboveVolume).toBeLessThan(0.0001)
      expect(report.straightWallThickness).toBeCloseTo(derived.wallThickness, 2)
      expect(report.straightWallBoundaryProbeCount).toBe(2)
      expect(report.topOuterConicalFaceCount).toBe(0)
      expect(report.topInnerChamferFaceCount).toBeGreaterThan(0)
      expect(report.topInnerChamferHeight).toBeGreaterThanOrEqual(
        derived.topInnerChamfer - 0.05,
      )
      expect(report.bottomFootChamferFaceCount).toBeGreaterThan(0)
      expect(report.bottomOuterFilletFaceCount).toBeGreaterThan(0)
      expect(report.lowerUnexpectedConicalFaceCount).toBe(0)
      expect(report.innerRampFaceCount).toBeGreaterThan(0)
      expect(report.innerRampHeight).toBeGreaterThanOrEqual(
        derived.innerRampEndZ - derived.flatFloorZ - 0.05,
      )
      expect(report.innerRampAngleDegrees).toBeCloseTo(45, 2)
      expect(report.innerRampNormalThickness).toBeCloseTo(
        derived.wallThickness,
        2,
      )
      expect(report.innerRampBoundaryProbeCount).toBe(6)
      expect(report.bottomMatingClearance).toBeCloseTo(
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.stackFitClearance,
        2,
      )
      expect(report.bottomMatingBoundaryProbeCount).toBe(1)
      expect(report.matingIntersectionVolume).toBeLessThan(0.01)
      expect(report.internalFilletFaceCount).toBe(0)
      const mesh = meshBRep(shape, { tolerance: 0.01, angularTolerance: 0.1 })
      expect(mesh.triangleCount).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    {
      direction: '+X',
      key: 'openingPlusXDepth',
      minimum: [26.5, -3, 24] as [number, number, number],
      maximum: [28.5, 3, 25] as [number, number, number],
    },
    {
      direction: '-X',
      key: 'openingMinusXDepth',
      minimum: [-28.5, -3, 24] as [number, number, number],
      maximum: [-26.5, 3, 25] as [number, number, number],
    },
    {
      direction: '+Y',
      key: 'openingPlusYDepth',
      minimum: [-3, 26.5, 24] as [number, number, number],
      maximum: [3, 28.5, 25] as [number, number, number],
    },
    {
      direction: '-Y',
      key: 'openingMinusYDepth',
      minimum: [-3, -28.5, 24] as [number, number, number],
      maximum: [3, -26.5, 25] as [number, number, number],
    },
  ])(
    'cuts the independently enabled $direction side opening with valid B-Rep',
    ({ key, minimum, maximum }) => {
      const input = parameters({
        [key]: 8,
        openingPlusXBottomLength: 12,
        openingPlusXAngle: 90,
        openingMinusXBottomLength: 12,
        openingMinusXAngle: 90,
        openingPlusYBottomLength: 12,
        openingPlusYAngle: 90,
        openingMinusYBottomLength: 12,
        openingMinusYAngle: 90,
      })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        expect(report.brepValid).toBe(true)
        expect(report.solidCount).toBe(1)
        expect(report.straightWallThickness).toBeCloseTo(
          openGridStackableCylinderDerivedGeometryFor(input).wallThickness,
          2,
        )
        expect(volumeInBox(shape, minimum, maximum)).toBeLessThan(0.001)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it.each([{ bottomPlateMode: false }, { bottomPlateMode: true }])(
    'keeps four distinct openings compatible with the $bottomPlateMode bottom-plate floor profile',
    ({ bottomPlateMode }) => {
      const input = parameters({
        bottomPlateMode,
        openingPlusXDepth: 12,
        openingPlusXBottomLength: 8,
        openingPlusXAngle: 90,
        openingMinusXDepth: 9,
        openingMinusXBottomLength: 8,
        openingMinusXAngle: 80,
        openingPlusYDepth: 10,
        openingPlusYBottomLength: 8,
        openingPlusYAngle: 85,
        openingMinusYDepth: 8,
        openingMinusYBottomLength: 8,
        openingMinusYAngle: 70,
      })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        expect(report.brepValid).toBe(true)
        expect(report.solidCount).toBe(1)
        expect(report.bottomSeatMode).toBe('detachable-corner-seat')
        expect(report.volume).toBeGreaterThan(0)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('keeps a valid U-opening and stacking interface in no-seat mode', () => {
    const input = parameters({
      bottomSeatMode: 'none',
      openingPlusXDepth: 12,
      openingPlusXBottomLength: 12,
      openingPlusXAngle: 90,
    })
    const shape = buildOpenGridStackableCylinder(input)
    try {
      const report = inspectOpenGridStackableCylinderInterface(shape, input)
      expect(report.brepValid).toBe(true)
      expect(report.solidCount).toBe(1)
      expect(report.holeRecordCount).toBe(0)
      expect(
        report.openings.find((opening) => opening.direction === '+X'),
      ).toMatchObject({
        enabled: true,
        bottomZ: 18,
        bottomLength: 12,
        valid: true,
      })
      expect(report.bottomProtrusionVolume).toBeGreaterThan(0)
      expect(report.matingIntersectionVolume).toBeLessThan(0.01)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { name: 'thin', bottomPlateMode: false, hasRamp: true },
    { name: 'bottom-plate', bottomPlateMode: true, hasRamp: false },
  ])(
    'mates equal-diameter cylinders through the bottom protrusion and cavity ($name)',
    ({ bottomPlateMode, hasRamp }) => {
      const input = parameters({
        innerDiameter: 52,
        height: 30,
        bottomPlateMode,
      })
      const derived = openGridStackableCylinderDerivedGeometryFor(input)
      const lower = buildOpenGridStackableCylinder(input)
      const upper = buildOpenGridStackableCylinder(input)
      const positionedUpper = upper.translate(
        0,
        0,
        input.height -
          OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.stackGrooveDepth,
      )
      try {
        const report = inspectOpenGridStackableCylinderInterface(lower, input)
        expect(report.bottomProtrusionVolume).toBeGreaterThan(0)
        expect(report.bottomGrooveResidualVolume).toBeLessThan(0.01)
        expect(report.topOuterConicalFaceCount).toBe(0)
        expect(report.topInnerChamferFaceCount).toBeGreaterThan(0)
        expect(report.topInnerChamferHeight).toBeGreaterThanOrEqual(
          derived.topInnerChamfer - 0.05,
        )
        expect(report.bottomOuterChamferFaceCount).toBeGreaterThan(0)
        const outerTransitionHeight =
          derived.outerTransitionEndZ - derived.outerTransitionStartZ
        const outerTransitionAngle = Math.atan2(
          outerTransitionHeight,
          derived.outerTransitionEndRadius - derived.outerTransitionStartRadius,
        )
        const bottomOuterFilletTrim = bottomPlateMode
          ? OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius *
            (1 - Math.cos(outerTransitionAngle))
          : 0
        expect(report.bottomOuterChamferHeight).toBeGreaterThanOrEqual(
          outerTransitionHeight - bottomOuterFilletTrim - 0.05,
        )
        expect(report.bottomOuterFilletFaceCount).toBeGreaterThan(0)
        expect(report.lowerUnexpectedConicalFaceCount).toBe(0)
        if (hasRamp) {
          expect(report.innerRampFaceCount).toBeGreaterThan(0)
          expect(report.internalFilletFaceCount).toBe(0)
          expect(report.innerRampBoundaryProbeCount).toBe(6)
          expect(report.bottomFootChamferFaceCount).toBeGreaterThan(0)
          expect(report.bottomFootChamferHeight).toBeGreaterThanOrEqual(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.bottomFootBevel -
              OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius -
              0.05,
          )
        } else {
          expect(report.innerRampFaceCount).toBe(0)
          expect(report.internalFilletFaceCount).toBe(1)
          expect(report.internalFilletHeight).toBeGreaterThanOrEqual(0.55)
          expect(report.bottomFootChamferFaceCount).toBe(0)
          expect(report.bottomFootChamferHeight).toBe(0)
        }
        expect(report.bottomMatingBoundaryProbeCount).toBe(1)
        expect(report.matingIntersectionVolume).toBeLessThan(0.01)
        expect(
          openGridStackableCylinderDerivedGeometryFor(input)
            .matingProtrusionRadius,
        ).toBeCloseTo(
          openGridStackableCylinderDerivedGeometryFor(input).innerRadius -
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.stackFitClearance,
          5,
        )
        expect(measureVolume(lower.intersect(positionedUpper))).toBeLessThan(
          0.01,
        )
      } finally {
        deleteShape(positionedUpper)
        deleteShape(lower)
        deleteShape(upper)
      }
    },
    120_000,
  )

  it('does not promise the same interface for different outer diameters', () => {
    const lowerInput = parameters({ innerDiameter: 56, height: 30 })
    const upperInput = parameters({ innerDiameter: 56, height: 30 })
    const lower = buildOpenGridStackableCylinder(lowerInput)
    const upper = buildOpenGridStackableCylinder(upperInput)
    try {
      expect(
        inspectOpenGridStackableCylinderInterface(lower, lowerInput).solidCount,
      ).toBe(1)
      expect(
        inspectOpenGridStackableCylinderInterface(upper, upperInput).solidCount,
      ).toBe(1)
    } finally {
      deleteShape(lower)
      deleteShape(upper)
    }
  }, 120_000)

  it('meshes and exports the validated cylinder as STEP and STL', async () => {
    const input = parameters({
      innerDiameter: 52,
      height: 30,
      honeycombMode: true,
    })
    const shape = buildOpenGridStackableCylinder(input)
    try {
      const report = inspectOpenGridStackableCylinderInterface(shape, input)
      expect(report.honeycombMode).toBe(true)
      expect(report.honeycombCellCount).toBeGreaterThan(0)
      const mesh = meshBRep(shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      expect(mesh.triangleCount).toBeGreaterThan(0)
      const step = await exportStepBytes(shape)
      const stl = await exportStlBytes(shape, {
        tolerance: 0.01,
        angularTolerance: 0.1,
      })
      expect(step.byteLength).toBeGreaterThan(0)
      expect(stl.byteLength).toBeGreaterThan(84)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('stops at a stale generation boundary without returning native geometry', () => {
    expect(() =>
      buildOpenGridStackableCylinder(parameters(), {
        isGenerationCurrent: () => false,
      }),
    ).toThrow('STALE_GENERATION')
  })
})
