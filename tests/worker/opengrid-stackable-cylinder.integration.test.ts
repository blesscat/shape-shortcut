import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  makeBox,
  makeCylinder,
  measureVolume,
  setOC,
  type Shape3D,
} from 'replicad'
import {
  buildOpenGridStackableCylinder,
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
import { openGridSnapProfileFor } from '../../src/cad-kernel/components/opengrid-snap/profile'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'

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

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function parameters(
  overrides: Partial<OpenGridStackableCylinderParameters> = {},
): OpenGridStackableCylinderParameters {
  return {
    ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
    diameter: overrides.diameter ?? 56,
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

function makeCompatibilityFixture(floorThickness: number): Shape3D {
  const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION
  const shaft = makeCylinder(
    configuration.testShaftDiameter / 2,
    configuration.testShaftLengthForFloor(floorThickness),
    [0, 0, -configuration.testShaftExposure],
  )
  const flange = makeCylinder(
    configuration.testFlangeDiameter / 2,
    configuration.testFlangeHeight,
    [0, 0, floorThickness],
  )
  const fixture = shaft.fuse(flange)
  deleteShape(shaft)
  deleteShape(flange)
  return fixture
}

describe('OpenGrid stackable-cylinder B-Rep', () => {
  it.each(['Full', 'Lite'] as const)(
    'keeps the center hook compatible with the Snap %s remover passage',
    (variant) => {
      const profile = openGridSnapProfileFor('Standard', variant)
      const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
      const upperPassageWidth = profile.centerRemoverUpperHalfWidth * 2
      const upperPassageDepth = profile.centerRemoverHalfDepth * 2
      const narrowBandDepth =
        profile.expectedBounds.max[2] - profile.centerRemoverStepZ

      expect(
        configuration.centerHookWidth +
          configuration.centerHookClearancePerSide * 2,
      ).toBeCloseTo(upperPassageWidth, 2)
      expect(
        configuration.centerHookDepth +
          configuration.centerHookClearancePerSide * 2,
      ).toBeCloseTo(upperPassageDepth, 2)
      expect(configuration.centerHookStemHeight).toBeGreaterThan(
        narrowBandDepth,
      )
      expect(configuration.centerHookRotationClearance).toBeGreaterThan(0)
      expect(configuration.centerHookHeight).toBeLessThan(3)
      expect(configuration.centerHookQuarterTurnDegrees).toBe(90)
    },
  )

  it.each([
    {
      name: 'default',
      floorThickness: 5,
      thinBottomMode: false,
      bottomPlateMode: false,
    },
    {
      name: 'thin',
      floorThickness: 3,
      thinBottomMode: true,
      bottomPlateMode: false,
    },
    {
      name: 'bottom-plate',
      floorThickness: 3,
      thinBottomMode: false,
      bottomPlateMode: true,
    },
  ])(
    'accepts the Ø5 shaft and Ø7 flange fixture in $name mode',
    ({ floorThickness, thinBottomMode, bottomPlateMode }) => {
      const input = parameters({ thinBottomMode, bottomPlateMode })
      const shape = buildOpenGridStackableCylinder(input)
      const fixture = makeCompatibilityFixture(floorThickness)
      try {
        const lowerSectionDepth =
          openGridStackableCylinderDerivedGeometryFor(
            input,
          ).bottomHoleSectionDepth
        const fixtureBounds = boundsOf(fixture)
        const fixtureMinZ = fixtureBounds[0]?.[2]
        if (fixtureMinZ === undefined) throw new Error('MISSING_FIXTURE_BOUNDS')
        expect(fixtureMinZ).toBeCloseTo(
          -OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftExposure,
          2,
        )
        expect(floorThickness - fixtureMinZ).toBeCloseTo(
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftLengthForFloor(
            floorThickness,
          ),
          2,
        )
        expect(fixtureBounds[1]?.[2]).toBeCloseTo(
          floorThickness +
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeHeight,
          2,
        )
        expect(measureVolume(shape.intersect(fixture))).toBeLessThan(0.01)
        const retentionProbeOffset = Math.max(
          0.2,
          floorThickness - lowerSectionDepth + 0.2,
        )
        const loweredFixture = fixture.clone().translateZ(-retentionProbeOffset)
        try {
          expect(
            measureVolume(shape.intersect(loweredFixture)),
          ).toBeGreaterThan(0.01)
        } finally {
          deleteShape(loweredFixture)
        }
      } finally {
        deleteShape(fixture)
        deleteShape(shape)
      }
    },
    120_000,
  )

  it.each([
    { diameter: 20, expectedOuterHoleCount: 0 },
    { diameter: 39, expectedOuterHoleCount: 0 },
    { diameter: 40, expectedOuterHoleCount: 4 },
    { diameter: 47, expectedOuterHoleCount: 4 },
    { diameter: 48, expectedOuterHoleCount: 4 },
    { diameter: 56, expectedOuterHoleCount: 4 },
    { diameter: 300, expectedOuterHoleCount: 4 },
  ])(
    'builds a valid centered $diameter mm cylinder with the safe cardinal layout',
    ({ diameter, expectedOuterHoleCount }) => {
      const input = parameters({ diameter })
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
      bottomSeatMode: 'hole',
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
    { diameter: 20, expectedHoleCount: 1 },
    { diameter: 47, expectedHoleCount: 5 },
    { diameter: 48, expectedHoleCount: 5 },
    { diameter: 300, expectedHoleCount: 5 },
  ])(
    'builds the bottom-plate profile at the supported $diameter mm envelope and hole threshold',
    ({ diameter, expectedHoleCount }) => {
      const input = parameters({ diameter, bottomPlateMode: true })
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
      name: 'default',
      overrides: {},
      lowerSectionDepth: 4,
      floorThickness: 5,
    },
    {
      name: 'thin',
      overrides: { thinBottomMode: true },
      lowerSectionDepth: 1,
      floorThickness: 2,
    },
    {
      name: 'bottom-plate',
      overrides: { bottomPlateMode: true },
      lowerSectionDepth: 2,
      floorThickness: 3,
    },
  ])(
    'keeps the center hole as two planar stepped cylindrical sections in $name mode',
    ({ overrides, lowerSectionDepth, floorThickness }) => {
      const input = parameters({ diameter: 56, ...overrides })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        const centerHole = report.holes.find(
          (hole) => hole.center[0] === 0 && hole.center[1] === 0,
        )
        expect(centerHole?.sections).toEqual([
          expect.objectContaining({
            diameter: expect.closeTo(
              OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter,
              2,
            ),
          }),
          expect.objectContaining({
            diameter: expect.closeTo(
              OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter,
              2,
            ),
          }),
        ])
        expect(centerHole?.sections[0]?.minZ).toBeCloseTo(0, 2)
        expect(centerHole?.sections[0]?.maxZ).toBeCloseTo(lowerSectionDepth, 1)
        expect(centerHole?.sections[1]?.minZ).toBeCloseTo(lowerSectionDepth, 1)
        expect(centerHole?.sections[1]?.maxZ).toBeCloseTo(floorThickness, 2)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('keeps the default five-millimetre floor and internal fillet profile', () => {
    const input = parameters({ diameter: 56 })
    const shape = buildOpenGridStackableCylinder(input)
    try {
      const report = inspectOpenGridStackableCylinderInterface(shape, input)
      expect(report.profile).toBe('default')
      expect(report.thinBottomMode).toBe(false)
      expect(report.bottomSeatMode).toBe('hole')
      expect(report.centralFloorBelowVolume).toBeGreaterThan(0.0001)
      expect(report.centralFloorAboveVolume).toBeLessThan(0.0001)
      expect(report.innerRampFaceCount).toBe(0)
      expect(report.internalFilletFaceCount).toBe(1)
      expect(report.internalFilletHeight).toBeGreaterThanOrEqual(0.55)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { profile: 'default', thinBottomMode: false, bottomPlateMode: false },
    { profile: 'thin', thinBottomMode: true, bottomPlateMode: false },
    {
      profile: 'bottom-plate',
      thinBottomMode: false,
      bottomPlateMode: true,
    },
  ])(
    'keeps the $profile stacking geometry valid in no-seat mode',
    ({ profile, thinBottomMode, bottomPlateMode }) => {
      const input = parameters({
        thinBottomMode,
        bottomPlateMode,
        bottomSeatMode: 'none',
      })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        expect(report.profile).toBe(profile)
        expect(report.thinBottomMode).toBe(thinBottomMode)
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
    { profile: 'default', thinBottomMode: false, bottomPlateMode: false },
    { profile: 'thin', thinBottomMode: true, bottomPlateMode: false },
    {
      profile: 'bottom-plate',
      thinBottomMode: false,
      bottomPlateMode: true,
    },
  ])(
    'builds integrated Ø5 by 3 mm seats in the $profile profile as one valid solid',
    ({ thinBottomMode, bottomPlateMode }) => {
      const input = parameters({
        thinBottomMode,
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
        expect(report.solidCount).toBe(1)
        expect(report.brepValid).toBe(true)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it.each([
    { name: 'default', thinBottomMode: false, bottomPlateMode: false },
    { name: 'thin', thinBottomMode: true, bottomPlateMode: false },
    { name: 'bottom-plate', thinBottomMode: false, bottomPlateMode: true },
  ])(
    'builds one centered quarter-turn hook with a rotation neck in the $name profile',
    ({ thinBottomMode, bottomPlateMode }) => {
      const input = parameters({
        thinBottomMode,
        bottomPlateMode,
        bottomSeatMode: 'center-hook',
      })
      const shape = buildOpenGridStackableCylinder(input)
      try {
        const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
        const report = inspectOpenGridStackableCylinderInterface(shape, input)
        expect(report.bounds.min[2]).toBeCloseTo(
          configuration.centerHookMinZ,
          2,
        )
        expect(report.holeRecordCount).toBe(0)
        expect(report.integratedSeatRecordCount).toBe(0)
        expect(report.solidCount).toBe(1)
        expect(report.brepValid).toBe(true)
        expect(report.centerHook).toMatchObject({
          planWidth: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookWidth,
            2,
          ),
          planDepth: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookDepth,
            2,
          ),
          minZ: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookMinZ,
            2,
          ),
          insertionClearancePerSide: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookClearancePerSide,
            2,
          ),
          quarterTurnCaptureOverhang: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookDepth -
              OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookNominalShortSide,
            2,
          ),
          headPlanWidth: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookWidth,
            2,
          ),
          headPlanDepth: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookDepth,
            2,
          ),
          stemPlanWidth: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookStemDiameter,
            2,
          ),
          stemPlanDepth: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookStemDiameter,
            2,
          ),
          headHeight: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookHeadHeight,
            2,
          ),
          stemHeight: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookStemHeight,
            2,
          ),
          rotationClearance: expect.closeTo(
            OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookRotationClearance,
            2,
          ),
        })
        const centerHook = report.centerHook
        if (!centerHook) throw new Error('CENTER_HOOK_QUALITY_MISSING')
        expect(centerHook.stemVolume).toBeLessThan(
          centerHook.stemPlanWidth *
            centerHook.stemPlanDepth *
            centerHook.stemHeight *
            0.85,
        )
        expect(
          volumeInBox(
            shape,
            [
              -configuration.centerHookWidth / 2 + 0.01,
              -configuration.centerHookDepth / 2 + 0.01,
              configuration.centerHookMinZ + 0.01,
            ],
            [
              configuration.centerHookWidth / 2 - 0.01,
              configuration.centerHookDepth / 2 - 0.01,
              configuration.centerHookMaxZ - 0.01,
            ],
          ),
        ).toBeGreaterThan(0.01)

        const neckCenterZ =
          configuration.centerHookMaxZ - configuration.centerHookHeight / 2
        expect(
          volumeInBox(
            shape,
            [
              -configuration.centerHookWidth / 2 + 0.01,
              configuration.centerHookWidth / 2 + 0.1,
              neckCenterZ - 0.05,
            ],
            [
              configuration.centerHookWidth / 2 - 0.01,
              configuration.centerHookDepth / 2 - 0.1,
              neckCenterZ + 0.05,
            ],
          ),
        ).toBeLessThan(0.001)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('keeps the center hook intact when honeycomb cuts are enabled', () => {
    const input = parameters({
      bottomSeatMode: 'center-hook',
      honeycombMode: true,
    })
    const shape = buildOpenGridStackableCylinder(input)
    try {
      const report = inspectOpenGridStackableCylinderInterface(shape, input)
      expect(report.honeycombMode).toBe(true)
      expect(report.centerHook?.footprintVolume).toBeGreaterThan(0)
      expect(report.solidCount).toBe(1)
      expect(report.brepValid).toBe(true)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('meshes and exports the center-hook cylinder with deterministic geometry', async () => {
    const input = parameters({ bottomSeatMode: 'center-hook' })
    const shape = buildOpenGridStackableCylinder(input)
    try {
      const mesh = meshBRep(shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      const step = await exportStepBytes(shape)
      const stl = await exportStlBytes(shape, {
        tolerance: 0.01,
        angularTolerance: 0.1,
      })
      expect(mesh.triangleCount).toBeGreaterThan(0)
      expect(step.byteLength).toBeGreaterThan(0)
      expect(stl.byteLength).toBeGreaterThan(84)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

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

  it('accepts the default-mode height-minus-floor opening depth limit', () => {
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
    { diameter: 20, expectedHoleCount: 1 },
    { diameter: 56, expectedHoleCount: 5 },
    { diameter: 300, expectedHoleCount: 5 },
  ])(
    'builds the thin profile at supported envelope diameter $diameter',
    ({ diameter, expectedHoleCount }) => {
      const input = parameters({ diameter, thinBottomMode: true })
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
    { diameter: 47, expectedHoleCount: 1 },
    { diameter: 48, expectedHoleCount: 1 },
    { diameter: 49, expectedHoleCount: 5 },
  ])(
    'builds the thin profile at the $diameter mm outer-hole threshold',
    ({ diameter, expectedHoleCount }) => {
      const input = parameters({ diameter, thinBottomMode: true })
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
    const input = parameters({ diameter: 56, thinBottomMode: true })
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
    const input = parameters({ diameter: 300, thinBottomMode: true })
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
          input.diameter / 2 - centerRadius - largestSection / 2,
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
    const input = parameters({ diameter: 57, height: 31, thinBottomMode: true })
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

  it.each([
    { thinBottomMode: false, bottomPlateMode: false },
    { thinBottomMode: true, bottomPlateMode: false },
    { thinBottomMode: false, bottomPlateMode: true },
  ])(
    'keeps four distinct openings compatible with the $thinBottomMode/$bottomPlateMode floor profile',
    ({ thinBottomMode, bottomPlateMode }) => {
      const input = parameters({
        thinBottomMode,
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
        expect(report.bottomSeatMode).toBe('hole')
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

  it.each([false, true])(
    'mates equal-diameter cylinders through the bottom protrusion and cavity (%s)',
    (thinBottomMode) => {
      const input = parameters({
        diameter: 56,
        height: 30,
        thinBottomMode,
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
        expect(report.bottomOuterChamferHeight).toBeGreaterThanOrEqual(
          derived.outerTransitionEndZ - derived.outerTransitionStartZ - 0.05,
        )
        expect(report.bottomFootChamferFaceCount).toBeGreaterThan(0)
        expect(report.bottomFootChamferHeight).toBeGreaterThanOrEqual(
          OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.bottomFootBevel -
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius -
            0.05,
        )
        expect(report.bottomOuterFilletFaceCount).toBeGreaterThan(0)
        expect(report.lowerUnexpectedConicalFaceCount).toBe(0)
        if (thinBottomMode) {
          expect(report.innerRampFaceCount).toBeGreaterThan(0)
          expect(report.internalFilletFaceCount).toBe(0)
          expect(report.innerRampBoundaryProbeCount).toBe(6)
        } else {
          expect(report.innerRampFaceCount).toBe(0)
          expect(report.internalFilletFaceCount).toBe(1)
          expect(report.internalFilletHeight).toBeGreaterThanOrEqual(0.55)
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
    const lowerInput = parameters({ diameter: 56, height: 30 })
    const upperInput = parameters({ diameter: 60, height: 30 })
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
      diameter: 56,
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

  it('stops before fusing a stale center hook candidate', () => {
    let checks = 0
    expect(() =>
      buildOpenGridStackableCylinder(
        parameters({ bottomSeatMode: 'center-hook' }),
        {
          isGenerationCurrent: () => {
            checks += 1
            return checks < 2
          },
        },
      ),
    ).toThrow('STALE_GENERATION')
  })
})
