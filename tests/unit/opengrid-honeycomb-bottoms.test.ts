import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  makeBox,
  makeCylinder,
  measureVolume,
  setOC,
  type Shape3D,
} from 'replicad'
import {
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxActiveFloorTopZFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableCylinderDerivedGeometryFor,
  openGridStackableCylinderHoleCentersFor,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { buildOpenGridStackableCylinder } from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'
import type { BooleanOperationReporter } from '../../src/cad-kernel/boolean-progress'
import {
  makeOpenGridStackableBoxBottomHoneycombCutters,
  makeOpenGridStackableBoxProtectedBottomHoneycombCutters,
  makeOpenGridStackableCylinderBottomHoneycombCutters,
  openGridStackableBoxBottomHoneycombCellCountFor,
  openGridStackableCylinderBottomHoneycombCellCountFor,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb'

const createdShapes: Shape3D[] = []

const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const wasmPath =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => wasmPath,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function remember<T extends Shape3D>(shape: T): T {
  createdShapes.push(shape)
  return shape
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function completeBottomCutter(
  cutters: readonly Shape3D[],
): Shape3D | undefined {
  const lattice = OPENGRID_HONEYCOMB_CONFIGURATION.bottomLattice
  const fullSpanX = Math.sqrt(3) * lattice.cellRadius
  const fullSpanY = lattice.cellRadius * 2
  return cutters
    .map((cutter) => {
      const bounds = boundsOf(cutter)
      return {
        cutter,
        bounds,
        distanceFromOrigin: Math.hypot(
          (bounds[0]![0]! + bounds[1]![0]!) / 2,
          (bounds[0]![1]! + bounds[1]![1]!) / 2,
        ),
      }
    })
    .filter(
      ({ bounds }) =>
        Math.abs(bounds[1]![0]! - bounds[0]![0]! - fullSpanX) <= 0.001 &&
        Math.abs(bounds[1]![1]! - bounds[0]![1]! - fullSpanY) <= 0.001,
    )
    .sort(
      (first, second) => first.distanceFromOrigin - second.distanceFromOrigin,
    )[0]?.cutter
}

function expectThroughFloorOpening(
  baseline: Shape3D,
  honeycomb: Shape3D,
  cutter: Shape3D | undefined,
  floorTop: number,
) {
  expect(cutter).toBeDefined()
  if (!cutter) return

  const bounds = boundsOf(cutter)
  const centerX = (bounds[0]![0]! + bounds[1]![0]!) / 2
  const centerY = (bounds[0]![1]! + bounds[1]![1]!) / 2
  const probe = makeBox(
    [centerX - 0.2, centerY - 0.2, 0.1],
    [centerX + 0.2, centerY + 0.2, floorTop - 0.1],
  )
  const baselineIntersection = baseline.intersect(probe)
  const honeycombIntersection = honeycomb.intersect(probe)
  createdShapes.push(probe, baselineIntersection, honeycombIntersection)
  expect(measureVolume(baselineIntersection)).toBeGreaterThan(0)
  expect(measureVolume(honeycombIntersection)).toBeCloseTo(0, 4)
}

function makeAnnularProbe(
  center: { x: number; y: number },
  innerRadius: number,
  outerRadius: number,
  floorTop: number,
): Shape3D {
  const bottom = 0.1
  const height = floorTop - bottom - 0.1
  const outer = makeCylinder(outerRadius, height, [center.x, center.y, bottom])
  const inner = makeCylinder(innerRadius, height + 0.02, [
    center.x,
    center.y,
    bottom - 0.01,
  ])
  const annulus = outer.cut(inner)
  createdShapes.push(outer, inner, annulus)
  return annulus
}

afterEach(() => {
  for (const shape of createdShapes.splice(0)) shape.delete()
})

describe('OpenGrid honeycomb visible bottom floors', () => {
  it('cuts complete floor cells through the Desk thin-shell box floor', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 1.5,
      height: 30,
      cornerSeatMode: 'none' as const,
      topRimMode: 'flat-top' as const,
      bottomMode: 'thin-shell' as const,
      honeycombMode: true,
    }
    const cutters = makeOpenGridStackableBoxBottomHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))

    expect(cutters).toHaveLength(
      openGridStackableBoxBottomHoneycombCellCountFor(parameters),
    )
    expect(cutters.length).toBeGreaterThan(0)

    const baseline = remember(
      buildOpenGridStackableBox({ ...parameters, honeycombMode: false }),
    )
    const honeycomb = remember(buildOpenGridStackableBox(parameters))
    expectThroughFloorOpening(
      baseline,
      honeycomb,
      completeBottomCutter(cutters),
      openGridStackableBoxActiveFloorTopZFor(parameters),
    )
  }, 240_000)

  it('fills the Desk box floor to every protected edge with clipped hex cells', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 4,
      y: 2,
      height: 30,
      cornerSeatMode: 'none' as const,
      topRimMode: 'flat-top' as const,
      bottomMode: 'thin-shell' as const,
      honeycombMode: true,
    }
    const cutters = makeOpenGridStackableBoxBottomHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))

    const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
    const frame = OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame
    const protectedBounds = {
      minimumX: -width / 2 + frame,
      maximumX: width / 2 - frame,
      minimumY: -depth / 2 + frame,
      maximumY: depth / 2 - frame,
    }
    const cutterBounds = cutters.map(boundsOf)

    expect(
      Math.min(...cutterBounds.map((bounds) => bounds[0]![0]!)),
    ).toBeCloseTo(protectedBounds.minimumX, 3)
    expect(
      Math.max(...cutterBounds.map((bounds) => bounds[1]![0]!)),
    ).toBeCloseTo(protectedBounds.maximumX, 3)
    expect(
      Math.min(...cutterBounds.map((bounds) => bounds[0]![1]!)),
    ).toBeCloseTo(protectedBounds.minimumY, 3)
    expect(
      Math.max(...cutterBounds.map((bounds) => bounds[1]![1]!)),
    ).toBeCloseTo(protectedBounds.maximumY, 3)

    const fullSpanX =
      Math.sqrt(3) * OPENGRID_HONEYCOMB_CONFIGURATION.bottomLattice.cellRadius
    const fullSpanY =
      OPENGRID_HONEYCOMB_CONFIGURATION.bottomLattice.cellRadius * 2
    expect(
      cutterBounds.some(
        (bounds) =>
          bounds[1]![0]! - bounds[0]![0]! < fullSpanX - 0.05 ||
          bounds[1]![1]! - bounds[0]![1]! < fullSpanY - 0.05,
      ),
    ).toBe(true)
  })

  it('cancels and cleans up bounded box-floor safety-mask operations', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 1,
      y: 1,
      height: 30,
      topRimMode: 'flat-top' as const,
      bottomMode: 'thin-shell' as const,
      honeycombMode: true,
    }
    let completedOperationCount = 0
    let reportedTotal: number | undefined
    let activeResultDeleted = false
    let disposeTrackedResult: (() => void) | undefined
    let returnedCutters: Shape3D[] = []
    const reporter: BooleanOperationReporter = {
      createScope(total) {
        reportedTotal = total
        return {
          measure<T>(_kind: 'cut' | 'fuse' | 'intersect', operation: () => T) {
            const result = operation()
            completedOperationCount += 1
            if (completedOperationCount === 1) {
              const trackedResult = result as unknown as Shape3D
              const originalDelete = trackedResult.delete.bind(trackedResult)
              disposeTrackedResult = originalDelete
              trackedResult.delete = () => {
                activeResultDeleted = true
                originalDelete()
              }
            }
            return result
          },
          measureCount<T>(
            _kind: 'cut' | 'fuse' | 'intersect',
            _count: number,
            operation: () => T,
          ) {
            return this.measure(_kind, operation)
          },
        }
      },
    }

    expect(() => {
      returnedCutters = makeOpenGridStackableBoxProtectedBottomHoneycombCutters(
        parameters,
        {
          isGenerationCurrent: () => completedOperationCount === 0,
          booleanOperations: reporter,
        },
      )
    }).toThrow('STALE_GENERATION')

    const deletionObservedBeforeTestCleanup = activeResultDeleted
    if (!activeResultDeleted) disposeTrackedResult?.()
    returnedCutters.forEach((cutter) => createdShapes.push(cutter))
    expect(reportedTotal).toBeGreaterThan(1)
    expect(completedOperationCount).toBe(1)
    expect(deletionObservedBeforeTestCleanup).toBe(true)
  }, 120_000)

  it('keeps a 2 mm circular safety ring around box floor holes and clips cells to it', () => {
    expect(OPENGRID_HONEYCOMB_CONFIGURATION.bottomHoleSafetyRing).toBe(2)

    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 1,
      height: 30,
      fullBottomHoleGrid: true,
      cornerSeatMode: 'none' as const,
      topRimMode: 'flat-top' as const,
      bottomMode: 'thin-shell' as const,
      honeycombMode: true,
    }
    const baseline = remember(
      buildOpenGridStackableBox({ ...parameters, honeycombMode: false }),
    )
    const honeycomb = remember(buildOpenGridStackableBox(parameters))
    const floorTop = openGridStackableBoxActiveFloorTopZFor(parameters)
    const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
    const ordinaryCenters =
      openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)
    const ordinaryCenter = ordinaryCenters.toSorted(
      (first, second) =>
        Math.hypot(first[0], first[1]) - Math.hypot(second[0], second[1]),
    )[0]

    expect(ordinaryCenter).toBeDefined()
    const protectedHoles = [
      ...ordinaryCenters.map((center) => ({
        center: { x: center[0], y: center[1] },
        radius: configuration.bottomGridHoleDiameter / 2,
      })),
    ]

    for (const hole of protectedHoles) {
      const safetyRing = makeAnnularProbe(
        hole.center,
        hole.radius + 0.05,
        hole.radius + 1.95,
        floorTop,
      )
      const baselineRing = baseline.intersect(safetyRing)
      const honeycombRing = honeycomb.intersect(safetyRing)
      createdShapes.push(baselineRing, honeycombRing)
      expect(measureVolume(honeycombRing)).toBeCloseTo(
        measureVolume(baselineRing),
        3,
      )
    }

    const outsideRing = makeAnnularProbe(
      { x: ordinaryCenter![0], y: ordinaryCenter![1] },
      configuration.bottomGridHoleDiameter / 2 + 2.05,
      configuration.bottomGridHoleDiameter / 2 + 3,
      floorTop,
    )
    const baselineOutside = baseline.intersect(outsideRing)
    const honeycombOutside = honeycomb.intersect(outsideRing)
    createdShapes.push(baselineOutside, honeycombOutside)
    expect(measureVolume(honeycombOutside)).toBeLessThan(
      measureVolume(baselineOutside) - 0.05,
    )
  }, 120_000)

  it('validates a narrow Desk floor without probing through its hole rings', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 4,
      y: 0.5,
      height: 30,
      fullBottomHoleGrid: true,
      cornerSeatMode: 'none' as const,
      topRimMode: 'flat-top' as const,
      bottomMode: 'thin-shell' as const,
      honeycombMode: true,
    }

    expect(
      openGridStackableBoxBottomHoneycombCellCountFor(parameters),
    ).toBeGreaterThan(0)
    const shape = remember(buildOpenGridStackableBox(parameters))
    expect(measureVolume(shape)).toBeGreaterThan(0)
  }, 120_000)

  it('cuts complete floor cells through the Desk thin-bottom cylinder floor', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 56,
      height: 30,
      bottomSeatMode: 'integrated' as const,
      honeycombMode: true,
    }
    const cutters =
      makeOpenGridStackableCylinderBottomHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))

    expect(cutters).toHaveLength(
      openGridStackableCylinderBottomHoneycombCellCountFor(parameters),
    )
    expect(cutters.length).toBeGreaterThan(0)

    const baseline = remember(
      buildOpenGridStackableCylinder({ ...parameters, honeycombMode: false }),
    )
    const honeycomb = remember(buildOpenGridStackableCylinder(parameters))
    expectThroughFloorOpening(
      baseline,
      honeycomb,
      completeBottomCutter(cutters),
      openGridStackableCylinderDerivedGeometryFor(parameters).floorThickness,
    )

    const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
    const protectedFloorRadius = Math.min(
      derived.flatFloorRadius - OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame,
      openGridStackableCylinderDerivedGeometryFor(parameters).radius -
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.outerEdgeClearance,
    )
    const boundaryProbe = makeAnnularProbe(
      { x: 0, y: 0 },
      protectedFloorRadius - 0.04,
      protectedFloorRadius - 0.01,
      derived.floorThickness,
    )
    const baselineBoundary = remember(baseline.intersect(boundaryProbe))
    const honeycombBoundary = remember(honeycomb.intersect(boundaryProbe))
    expect(measureVolume(baselineBoundary)).toBeGreaterThan(0)
    expect(measureVolume(honeycombBoundary)).toBeLessThan(
      measureVolume(baselineBoundary) - 0.01,
    )

    const protectedFrameProbe = makeAnnularProbe(
      { x: 0, y: 0 },
      protectedFloorRadius + 0.05,
      protectedFloorRadius + 0.3,
      derived.floorThickness,
    )
    const baselineFrame = remember(baseline.intersect(protectedFrameProbe))
    const honeycombFrame = remember(honeycomb.intersect(protectedFrameProbe))
    expect(measureVolume(honeycombFrame)).toBeCloseTo(
      measureVolume(baselineFrame),
      3,
    )

    const holeRadius =
      Math.max(
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.bottomHoleDiameter,
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.innerHoleDiameter,
      ) / 2
    const holeCenters = openGridStackableCylinderHoleCentersFor(parameters)
    expect(holeCenters.length).toBeGreaterThan(0)
    for (const [x, y] of holeCenters) {
      const safetyRing = makeAnnularProbe(
        { x, y },
        holeRadius + 0.05,
        holeRadius + 1.95,
        derived.floorThickness,
      )
      const baselineRing = remember(baseline.intersect(safetyRing))
      const honeycombRing = remember(honeycomb.intersect(safetyRing))
      expect(measureVolume(honeycombRing)).toBeCloseTo(
        measureVolume(baselineRing),
        3,
      )

      const outsideRing = makeAnnularProbe(
        { x, y },
        holeRadius + 2.05,
        holeRadius + 2.35,
        derived.floorThickness,
      )
      const baselineOutside = remember(baseline.intersect(outsideRing))
      const honeycombOutside = remember(honeycomb.intersect(outsideRing))
      const outsideRingMaterialRemoved =
        measureVolume(baselineOutside) - measureVolume(honeycombOutside)
      expect(outsideRingMaterialRemoved).toBeGreaterThan(0.001)
    }
  }, 120_000)

  it('cancels and cleans up cylinder-floor circular clipping operations', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 56,
      height: 30,
      honeycombMode: true,
    }
    let completedOperationCount = 0
    let reportedTotal: number | undefined
    let activeResultDeleted = false
    let disposeTrackedResult: (() => void) | undefined
    let returnedCutters: Shape3D[] = []
    const reporter: BooleanOperationReporter = {
      createScope(total) {
        reportedTotal = total
        return {
          measure<T>(_kind: 'cut' | 'fuse' | 'intersect', operation: () => T) {
            const result = operation()
            completedOperationCount += 1
            if (completedOperationCount === 1) {
              const trackedResult = result as unknown as Shape3D
              const originalDelete = trackedResult.delete.bind(trackedResult)
              disposeTrackedResult = originalDelete
              trackedResult.delete = () => {
                activeResultDeleted = true
                originalDelete()
              }
            }
            return result
          },
          measureCount<T>(
            _kind: 'cut' | 'fuse' | 'intersect',
            _count: number,
            operation: () => T,
          ) {
            return this.measure(_kind, operation)
          },
        }
      },
    }

    expect(() => {
      returnedCutters = makeOpenGridStackableCylinderBottomHoneycombCutters(
        parameters,
        {
          isGenerationCurrent: () => completedOperationCount === 0,
          booleanOperations: reporter,
        },
      )
    }).toThrow('STALE_GENERATION')

    const deletionObservedBeforeTestCleanup = activeResultDeleted
    if (!activeResultDeleted) disposeTrackedResult?.()
    returnedCutters.forEach((cutter) => createdShapes.push(cutter))
    expect(reportedTotal).toBeGreaterThan(1)
    expect(completedOperationCount).toBe(1)
    expect(deletionObservedBeforeTestCleanup).toBe(true)
  }, 120_000)
})
