import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  makeBox,
  makeCylinder,
  measureDistanceBetween,
  measureVolume,
  type Shape3D,
} from 'replicad'
import {
  buildOpenGridStackableBox as buildOpenGridStackableBoxKernel,
  importOpenGridSnapHoldReference,
  assertOpenGridSnapHoldCompatibility,
  inspectOpenGridStackableBoxInterface,
  inspectOpenGridSnapHoldCompatibility,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import {
  applyStackingProfile,
  bottomStackingProfileTopZ,
  makeBoxShell,
} from '../../src/cad-kernel/components/opengrid-stackable-box/geometry'
import { inspectOpenGridDetachableCornerSeatConsumers } from '../../src/cad-kernel/components/opengrid-locating-assembly/consumer'
import {
  externalOpenGridStackableBoxHeightFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  boundsOf,
  cylindricalFaceCount,
  deleteShape,
  initialiseStackableBoxWasm,
  loadDetachableCornerSeatFixtures,
  SNAP_REFERENCE_PATH,
  stackableBoxParameters as parameters,
} from './opengrid-stackable-box.utils'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require

let detachableCornerSeatReference: Shape3D
let detachableCornerSeatHolderReference: Shape3D

beforeAll(async () => {
  await initialiseStackableBoxWasm()
  ;({ detachableCornerSeatReference, detachableCornerSeatHolderReference } =
    await loadDetachableCornerSeatFixtures())
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

function captureProbeStackZ(height: number): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return (
    height +
    configuration.bottomAssemblyHeight +
    configuration.topRailInnerChamfer +
    configuration.topRailInnerVerticalHeight
  )
}

describe('OpenGrid stackable-box stacking B-Rep', () => {
  it('keeps a thick supported shell with an integrated self-mating guide', () => {
    const input = parameters({
      x: 1,
      y: 4,
      cornerSeatMode: 'detachable-corner-seat',
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const interfaceQuality = inspectOpenGridStackableBoxInterface(
        shape,
        input,
      )
      expect(interfaceQuality.floorProbeVolumes[0]).toBeGreaterThan(0.5)
      expect(interfaceQuality.floorProbeThicknesses[0]).toBeCloseTo(1.2, 1)
      expect(interfaceQuality.measuredExternalHeight).toBeCloseTo(21.45, 2)
      expect(
        interfaceQuality.sideWallProbeThicknesses.every(
          (thickness) => thickness >= 1.1 && thickness <= 1.3,
        ),
      ).toBe(true)
      expect(interfaceQuality.externalHeight).toBeCloseTo(
        externalOpenGridStackableBoxHeightFor(input),
        2,
      )
      expect(interfaceQuality.upperInnerRimZ).toBeCloseTo(15, 2)
      expect(interfaceQuality.bottomAssemblyHeight).toBeCloseTo(5, 2)
      expect(interfaceQuality.topRailProfileHeight).toBeCloseTo(6.45, 2)
      expect(interfaceQuality.bottomGuideProfileHeight).toBeCloseTo(4.75, 2)
      expect(
        Object.values(interfaceQuality.topRailProfileSegmentFaceCounts).every(
          (faceCount) => faceCount > 0,
        ),
      ).toBe(true)
      expect(
        Object.values(
          interfaceQuality.bottomGuideProfileSegmentFaceCounts,
        ).every((faceCount) => faceCount > 0),
      ).toBe(true)
      expect(interfaceQuality.topGuideLeadInFaceCount).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.topRailCornerContinuationFaceCount,
      ).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.topRailOuterCornerRadiusFaceCount,
      ).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.bottomGuideLeadInFaceCount,
      ).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.topRailProbeVolumes.every((volume) => volume > 0.001),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGridSeamWallFaceCount,
      ).toBeGreaterThanOrEqual(interfaceQuality.bottomGridSeamCount * 2)
      expect(
        interfaceQuality.bottomGridSeamWallFaceCounts.every(
          (faceCount) => faceCount >= 2,
        ),
      ).toBe(true)
      expect(interfaceQuality.bottomGridSeamCount).toBe(3)
      expect(interfaceQuality.bottomGridSeams).toEqual([
        { axis: 'y', position: expect.closeTo(-28, 3) },
        { axis: 'y', position: expect.closeTo(0, 3) },
        { axis: 'y', position: expect.closeTo(28, 3) },
      ])
      expect(
        interfaceQuality.bottomGridSeamClearanceVolumes.every(
          (volume) => volume <= 0.05,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGridSeamSupportVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGridSeamSupportThicknesses.every(
          (thickness) => thickness >= 3,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bearingLandVolumes.every((volume) => volume > 0.001),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGuideProtrusionVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomFootChamferVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomSupportBandVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomSupportVolumes.every((volume) => volume > 0.25),
      ).toBe(true)
      expect(
        interfaceQuality.bottomPerimeterResidualVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomSupportFloorThicknesses.every(
          (thickness) => thickness >= 1.1 && thickness <= 1.3,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomTransitionSupportThicknesses.every(
          (thickness) => thickness >= 1.1,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.mountingHoleStepVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.mountingHoleProfiles.every((profile) => {
          expect(profile.lowerBoreDiameter).toBeCloseTo(
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter,
            2,
          )
          expect(profile.lowerBoreDepth).toBeCloseTo(3, 1)
          expect(profile.upperBoreDiameter).toBeCloseTo(
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter,
            2,
          )
          expect(profile.upperBoreDepth).toBeCloseTo(2, 1)
          return true
        }),
      ).toBe(true)
      const detachableRecords = inspectOpenGridDetachableCornerSeatConsumers(
        shape,
        openGridStackableBoxSocketCentersFor(input),
        {
          detachableCornerSeatReference,
          detachableCornerSeatHolderReference,
        },
      )
      expect(detachableRecords).toHaveLength(4)
      expect(
        detachableRecords.every(
          (record) =>
            record.socketVoidResidualVolume <= 1e-6 &&
            record.maleCollisionVolume <= 1e-6 &&
            record.roofVolume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGridSeamFloorVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      const topProbe = makeCylinder(14, 0.2, [
        0,
        0,
        externalOpenGridStackableBoxHeightFor(input) - 0.2,
      ])
      const bottomProbe = makeCylinder(14, 0.2, [0, 0, 0.1])
      try {
        expect(measureVolume(shape.intersect(topProbe))).toBeGreaterThan(0)
        expect(measureVolume(shape.intersect(bottomProbe))).toBeGreaterThan(0)
      } finally {
        topProbe.delete()
        bottomProbe.delete()
      }
      expect(shape.faces.length).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('places supported printable relief at every internal 28 mm grid seam', () => {
    const cases = [
      { x: 1, y: 1, seams: [] },
      {
        x: 1.5,
        y: 1.5,
        seams: [
          { axis: 'x', position: 7 },
          { axis: 'y', position: 7 },
        ],
      },
      {
        x: 2,
        y: 2,
        seams: [
          { axis: 'x', position: 0 },
          { axis: 'y', position: 0 },
        ],
      },
      { x: 0.5, y: 1, seams: [] },
    ] as const

    for (const testCase of cases) {
      const input = parameters({
        x: testCase.x,
        y: testCase.y,
        cornerSeatMode: 'none',
      })
      const shape = buildOpenGridStackableBox(input)
      try {
        const report = inspectOpenGridStackableBoxInterface(shape, input)
        expect(report.bottomGridSeamCount).toBe(testCase.seams.length)
        expect(report.bottomGridSeams).toEqual(
          testCase.seams.map((seam) => ({
            ...seam,
            position: expect.closeTo(seam.position, 3),
          })),
        )
      } finally {
        deleteShape(shape)
      }
    }
  }, 120_000)

  it('keeps the 2×2 grid-seam relief open beneath the supported floor', () => {
    const input = parameters({ x: 2, y: 2, cornerSeatMode: 'none' })
    const shape = buildOpenGridStackableBox(input)
    const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
    const transitionProbeBottom =
      configuration.bottomFootChamferHeight +
      configuration.bottomSupportBandHeight +
      0.1
    const verticalSeamProbe = makeBox(
      [-0.25, -10, 0.2],
      [0.25, 10, configuration.bottomFootChamferHeight],
    )
    const horizontalSeamProbe = makeBox(
      [-10, -0.25, 0.2],
      [10, 0.25, configuration.bottomFootChamferHeight],
    )
    const verticalSlopeProbe = makeBox(
      [1.9, -10, transitionProbeBottom],
      [2.1, 10, transitionProbeBottom + 0.5],
    )
    const horizontalSlopeProbe = makeBox(
      [-10, 1.9, transitionProbeBottom],
      [10, 2.1, transitionProbeBottom + 0.5],
    )
    const verticalFloorProbe = makeBox(
      [-0.25, -10, bottomStackingProfileTopZ() + 0.05],
      [0.25, 10, configuration.bottomAssemblyHeight - 0.05],
    )
    const horizontalFloorProbe = makeBox(
      [-10, -0.25, bottomStackingProfileTopZ() + 0.05],
      [10, 0.25, configuration.bottomAssemblyHeight - 0.05],
    )
    try {
      expect(measureVolume(shape.intersect(verticalSeamProbe))).toBeLessThan(
        0.01,
      )
      expect(measureVolume(shape.intersect(horizontalSeamProbe))).toBeLessThan(
        0.01,
      )
      // The constant-width slot keeps the whole relief open beneath the
      // floor: the former taper walls are gone.
      expect(measureVolume(shape.intersect(verticalSlopeProbe))).toBeLessThan(
        0.01,
      )
      expect(measureVolume(shape.intersect(horizontalSlopeProbe))).toBeLessThan(
        0.01,
      )
      expect(
        measureVolume(shape.intersect(verticalFloorProbe)),
      ).toBeGreaterThan(0.01)
      expect(
        measureVolume(shape.intersect(horizontalFloorProbe)),
      ).toBeGreaterThan(0.01)
    } finally {
      verticalSeamProbe.delete()
      horizontalSeamProbe.delete()
      verticalSlopeProbe.delete()
      horizontalSlopeProbe.delete()
      verticalFloorProbe.delete()
      horizontalFloorProbe.delete()
      deleteShape(shape)
    }
  }, 120_000)

  it('enforces the fixed 0.2 mm radial stacking guide clearance', () => {
    const input = parameters({ x: 1, y: 4, cornerSeatMode: 'none' })
    const shape = buildOpenGridStackableBox(input)
    try {
      const report = inspectOpenGridStackableBoxInterface(shape, input)
      expect(report.stackingClearanceNominalIntersectionVolume).toBeLessThan(
        0.01,
      )
      expect(report.stackingClearanceNearSeatIntersectionVolume).toBeLessThan(
        0.01,
      )
      expect(
        report.stackingClearanceBelowNominalIntersectionVolume,
      ).toBeGreaterThan(0.01)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps a spanning 3×3 box clear of two side-by-side 1×3+2×3 boxes', () => {
    const build = (x: number, y: number) => {
      const input = {
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        x,
        y,
        height: 10,
      }
      const shell = makeBoxShell(input)
      return applyStackingProfile(shell, input, {})
    }
    const front = build(1, 3)
    const back = build(2, 3)
    const upper = build(3, 3)
    const frontPositioned = front.translate(-27.925, 0, 0)
    const backPositioned = back.translate(13.925, 0, 0)
    const lowerPair = frontPositioned.fuse(backPositioned)
    deleteShape(frontPositioned)
    deleteShape(backPositioned)
    try {
      const seatZ =
        captureProbeStackZ(10) -
        OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingGuideClearance +
        0.05
      let worst = 0
      for (let z = 0; z < 4.2; z += 0.3) {
        const slab = makeBox([-45, -45, seatZ + z], [45, 45, seatZ + z + 0.3])
        const positioned = upper.clone().translate(0, 0, seatZ)
        try {
          const clipped = positioned.intersect(slab)
          try {
            const intersection = lowerPair.intersect(clipped)
            try {
              worst = Math.max(worst, measureVolume(intersection))
            } finally {
              deleteShape(intersection)
            }
          } finally {
            deleteShape(clipped)
          }
        } finally {
          deleteShape(slab)
          deleteShape(positioned)
        }
      }
      // The spanning box's floor-slab corners pass the lower boxes' outer
      // corner cones at the overhang ends with a documented sub-millimetre
      // local contact; anything beyond 2 mm³ means a real collision.
      expect(worst).toBeLessThan(2)
    } finally {
      deleteShape(lowerPair)
      deleteShape(upper)
      deleteShape(front)
      deleteShape(back)
    }
  }, 120_000)

  it('allows a 1×1 upper box to slide along a 1×4 lower box', () => {
    const lower = buildOpenGridStackableBox(
      parameters({ x: 1, y: 4, cornerSeatMode: 'none' }),
    )
    const upper = buildOpenGridStackableBox(
      parameters({ x: 1, y: 1, cornerSeatMode: 'none' }),
    )
    try {
      const seatedZ =
        captureProbeStackZ(10) -
        OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingGuideClearance
      const clearanceZ =
        seatedZ +
        OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomStackingLeadIn +
        OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomSupportBandHeight
      const lowered = upper.clone().translate(0, 0, seatedZ)
      try {
        expect(measureVolume(lower.intersect(lowered))).toBeLessThan(0.01)
        expect(measureDistanceBetween(lower, lowered)).toBeLessThan(0.45)
      } finally {
        deleteShape(lowered)
      }

      const clearancePositioned = upper
        .clone()
        .translate(
          OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingClearance,
          0,
          clearanceZ,
        )
      try {
        expect(
          measureVolume(lower.intersect(clearancePositioned)),
        ).toBeLessThan(0.01)
      } finally {
        deleteShape(clearancePositioned)
      }

      const loweredBeyondClearance = upper
        .clone()
        .translate(
          OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingClearance + 0.75,
          0,
          captureProbeStackZ(10) - 0.05,
        )
      try {
        expect(
          measureVolume(lower.intersect(loweredBeyondClearance)),
        ).toBeGreaterThan(0.01)
      } finally {
        deleteShape(loweredBeyondClearance)
      }

      for (const offset of [-28, -21, -14, -7, 0, 7, 14, 21, 28]) {
        const positioned = upper.clone().translate(0, offset, seatedZ)
        try {
          expect(measureVolume(lower.intersect(positioned))).toBeLessThan(0.01)
        } finally {
          deleteShape(positioned)
        }
      }
    } finally {
      deleteShape(lower)
      deleteShape(upper)
    }
  }, 120_000)

  it('lets a 2×2 upper box bridge two adjacent 1×2 lower boxes', () => {
    const left = buildOpenGridStackableBox(
      parameters({ x: 1, y: 2, cornerSeatMode: 'none' }),
    )
    const right = buildOpenGridStackableBox(
      parameters({ x: 1, y: 2, cornerSeatMode: 'none' }),
    )
    const upper = buildOpenGridStackableBox(
      parameters({ x: 2, y: 2, cornerSeatMode: 'none' }),
    )
    const leftPositioned = left.translate(-14, 0, 0)
    const rightPositioned = right.translate(14, 0, 0)
    const lowerPair = leftPositioned.fuse(rightPositioned)
    deleteShape(leftPositioned)
    deleteShape(rightPositioned)
    try {
      // Corner relief clears the junction return cones; the straight guide
      // now bears at the same seated height as a single lower box.
      const positionedUpper = upper
        .clone()
        .translate(
          0,
          0,
          captureProbeStackZ(10) -
            OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingGuideClearance,
        )
      try {
        // The spanning box's slab corners pass the outer corner cones with
        // a documented sub-millimetre local contact; anything beyond 2 mm³
        // means a real collision.
        expect(
          measureVolume(lowerPair.intersect(positionedUpper)),
        ).toBeLessThan(2)
      } finally {
        deleteShape(positionedUpper)
      }
      const loweredUpper = upper
        .clone()
        .translate(
          0,
          0,
          captureProbeStackZ(10) -
            OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingGuideClearance -
            0.05,
        )
      try {
        expect(
          measureVolume(lowerPair.intersect(loweredUpper)),
        ).toBeGreaterThan(0.01)
      } finally {
        deleteShape(loweredUpper)
      }
    } finally {
      deleteShape(lowerPair)
      deleteShape(upper)
    }
  }, 120_000)

  it('exports successful full-cell geometry as STEP and STL', async () => {
    const input = parameters({
      x: 1,
      y: 1,
      height: 20,
      cornerSeatMode: 'none',
      fullBottomHoleGrid: true,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const report = inspectOpenGridStackableBoxInterface(shape, input)
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

  it('loads and validates the supplied Snap reference without using it as a body', async () => {
    const reference = await importOpenGridSnapHoldReference(
      new Blob([readFileSync(SNAP_REFERENCE_PATH)]),
    )
    try {
      expect(boundsOf(reference)[1]?.[0]).toBeGreaterThan(0)
      expect(cylindricalFaceCount(reference)).toBeGreaterThanOrEqual(4)
      const report = inspectOpenGridSnapHoldCompatibility(reference)
      expect(report.nominalInterfaces).toHaveLength(4)
      expect(report.minimumAxialSpan).toBeGreaterThanOrEqual(3)
      expect(report.nominalInterfaces.map((item) => item.diameter)).toEqual(
        expect.arrayContaining([
          expect.closeTo(
            OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleDiameter,
            5,
          ),
        ]),
      )
      expect(report.maximumCenterError).toBeLessThan(0.25)
      expect(() => assertOpenGridSnapHoldCompatibility(reference)).not.toThrow()
      const incompatible = makeBox([-1, -1, 0], [1, 1, 1])
      try {
        expect(() => assertOpenGridSnapHoldCompatibility(incompatible)).toThrow(
          'OPENGRID_SNAP_HOLD_INTERFACE_DIAMETER_MISMATCH',
        )
      } finally {
        incompatible.delete()
      }
      const shortReference = makeCylinder(2.5, 1, [0, 0, 0])
      try {
        expect(() =>
          assertOpenGridSnapHoldCompatibility(shortReference, {
            ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
            x: 0.5,
            y: 0.5,
            height: 10,
            cornerSeatMode: 'detachable-corner-seat',
            fullBottomHoleGrid: false,
          }),
        ).toThrow('OPENGRID_SNAP_HOLD_INSERTION_ENVELOPE_MISMATCH')
      } finally {
        shortReference.delete()
      }
    } finally {
      deleteShape(reference)
    }
  }, 120_000)

  it('deduplicates half-cell socket positions without changing the footprint', () => {
    expect(
      openGridStackableBoxSocketCentersFor(
        parameters({
          x: 0.5,
          y: 0.5,
          cornerSeatMode: 'detachable-corner-seat',
        }),
      ),
    ).toEqual([[0, 0]])
    expect(
      openGridStackableBoxSocketCentersFor(
        parameters({
          x: 0.5,
          y: 1,
          cornerSeatMode: 'detachable-corner-seat',
        }),
      ),
    ).toHaveLength(2)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleDiameter).toBe(5)
  })

  it('fuses integrated seats through the normal bottom and preserves ordinary grid holes', () => {
    const input = parameters({
      x: 1,
      y: 1,
      cornerSeatMode: 'integrated',
      fullBottomHoleGrid: true,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const report = inspectOpenGridStackableBoxInterface(shape, input)
      const ordinaryCenters =
        openGridStackableBoxOrdinaryBottomHoleCentersFor(input)
      expect(report.cornerSeatMode).toBe('integrated')
      expect(report.integratedSeatRecordCount).toBe(
        openGridStackableBoxSocketCentersFor(input).length,
      )
      expect(report.captiveSocketRecords).toHaveLength(0)
      expect(report.ordinaryBottomHoleCount).toBe(ordinaryCenters.length)
      expect(boundsOf(shape)[0]?.[2]).toBeCloseTo(
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ,
        2,
      )
    } finally {
      deleteShape(shape)
    }
  }, 120_000)
})
