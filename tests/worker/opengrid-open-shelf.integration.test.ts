import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  makeBox,
  makeCompound,
  makeCylinder,
  measureVolume,
  setOC,
  type Shape3D,
} from 'replicad'
import {
  boundsForOpenGridOpenShelf,
  openGridOpenShelfDividerCentersFor,
  openGridOpenShelfDepthFor,
  openGridOpenShelfFootprintFor,
  openGridOpenShelfFrontToRearElevationFor,
  openGridOpenShelfPegCentersFor,
  openGridOpenShelfShelfLowerSurfaceZFor,
  openGridOpenShelfTopOuterRearZFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  type OpenGridOpenShelfParameters,
} from '../../src/cad-contract/units'
import { buildOpenGridOpenShelf } from '../../src/cad-kernel/components/opengrid-open-shelf/builder'
import { inspectOpenGridOpenShelfShapeQuality } from '../../src/cad-kernel/components/opengrid-open-shelf/quality'
import { exportStepBytes, exportStlBytes } from '../../src/cad-kernel/export'
import {
  makeOpenGridOpenShelfPlateHoneycombCutters,
  makeOpenGridOpenShelfWallHoneycombCutters,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb'
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

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not replace the primary geometry assertion.
  }
}

function expectCutterRemovedFromShape(
  cutter: Shape3D,
  baseline: Shape3D,
  honeycomb: Shape3D,
): void {
  let baselineIntersection: Shape3D | null = null
  let honeycombIntersection: Shape3D | null = null
  try {
    baselineIntersection = baseline.intersect(cutter)
    honeycombIntersection = honeycomb.intersect(cutter)
    expect(measureVolume(baselineIntersection)).toBeGreaterThan(0)
    expect(measureVolume(honeycombIntersection)).toBeCloseTo(0, 4)
  } finally {
    deleteShape(baselineIntersection)
    deleteShape(honeycombIntersection)
  }
}

function expectProbePreservedInShape(
  probe: Shape3D,
  baseline: Shape3D,
  honeycomb: Shape3D,
): void {
  let baselineIntersection: Shape3D | null = null
  let honeycombIntersection: Shape3D | null = null
  try {
    baselineIntersection = baseline.intersect(probe)
    honeycombIntersection = honeycomb.intersect(probe)
    const baselineVolume = measureVolume(baselineIntersection)
    expect(baselineVolume).toBeGreaterThan(0)
    expect(measureVolume(honeycombIntersection)).toBeCloseTo(baselineVolume, 4)
  } finally {
    deleteShape(baselineIntersection)
    deleteShape(honeycombIntersection)
  }
}

function expectBoundsClose(
  actual: number[][],
  expected: ReturnType<typeof boundsForOpenGridOpenShelf>,
): void {
  expect(actual[0]?.[0]).toBeCloseTo(expected.min[0], 2)
  expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
  expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 2)
  expect(actual[1]?.[0]).toBeCloseTo(expected.max[0], 2)
  expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
  expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 2)
}

function countPegChamferFaces(shape: Shape3D): number {
  const centers = openGridOpenShelfPegCentersFor(
    OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  )
  let count = 0
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      if (face.surface.surfaceType !== 'CONE') continue
      const [min, max] = boundingBox.bounds as number[][]
      const centerX = ((min[0] ?? 0) + (max[0] ?? 0)) / 2
      const centerY = ((min[1] ?? 0) + (max[1] ?? 0)) / 2
      const radialSpan = Math.max(
        (max[0] ?? 0) - (min[0] ?? 0),
        (max[1] ?? 0) - (min[1] ?? 0),
      )
      const isPegCenter = centers.some(
        ([x, y]) =>
          Math.abs(centerX - x) <= 0.08 && Math.abs(centerY - y) <= 0.08,
      )
      if (
        isPegCenter &&
        radialSpan <= OPENGRID_OPEN_SHELF_CONFIGURATION.pegDiameter + 0.2 &&
        (min[2] ?? 0) <= -OPENGRID_OPEN_SHELF_CONFIGURATION.pegHeight + 0.05 &&
        (max[2] ?? 0) <=
          -OPENGRID_OPEN_SHELF_CONFIGURATION.pegHeight +
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatBottomChamfer +
            0.1
      ) {
        count += 1
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return count
}

describe('OpenGrid open-shelf CAD kernel integration', () => {
  it('rejects oversized honeycomb while retaining the solid counterpart', async () => {
    const parameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      x: 5,
      y: 8,
      height: 100,
      honeycombMode: true,
    }
    await expect(buildOpenGridOpenShelf(parameters)).rejects.toThrow(
      'OPENGRID_HONEYCOMB_MEMORY_LIMIT:',
    )
    const solid = await buildOpenGridOpenShelf({
      ...parameters,
      honeycombMode: false,
    })
    try {
      expect(measureVolume(solid)).toBeGreaterThan(0)
      expect((await exportStepBytes(solid)).byteLength).toBeGreaterThan(0)
    } finally {
      solid.delete()
    }
  }, 180_000)

  it.each([
    {
      name: 'native exception',
      thrown: 12345,
      expected: 'OPENGRID_OPEN_SHELF_HONEYCOMB_INVALID:OCCT_EXCEPTION:12345',
    },
    {
      name: 'cancellation',
      thrown: new Error('STALE_GENERATION'),
      expected: 'STALE_GENERATION',
    },
  ])(
    'preserves $name during shelf honeycomb cutting',
    async ({ thrown, expected }) => {
      let cuts = 0
      await expect(
        buildOpenGridOpenShelf(
          {
            ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
            x: 2,
            y: 2,
            height: 30,
            cellX: 1,
            cellZ: 1,
            honeycombMode: true,
          },
          {
            booleanOperations: {
              createScope: () => ({
                measure: () => {
                  cuts += 1
                  throw thrown
                },
                measureCount: () => {
                  cuts += 1
                  throw thrown
                },
              }),
            },
          },
        ),
      ).rejects.toThrow(expected)
      expect(cuts).toBe(1)
    },
    120_000,
  )

  it('uses protected Hex Mesh to reduce material without changing bounds or pegs', async () => {
    const baselineParameters: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      cellX: 2,
      honeycombMode: false,
    }
    const honeycombParameters: OpenGridOpenShelfParameters = {
      ...baselineParameters,
      honeycombMode: true,
    }
    const baseline = await buildOpenGridOpenShelf(baselineParameters)
    const honeycomb = await buildOpenGridOpenShelf(honeycombParameters)
    try {
      expect(measureVolume(honeycomb)).toBeLessThan(measureVolume(baseline))
      expectBoundsClose(
        boundsOf(honeycomb),
        boundsForOpenGridOpenShelf(honeycombParameters),
      )
      const quality = inspectOpenGridOpenShelfShapeQuality(
        honeycomb,
        honeycombParameters,
        meshBRep(honeycomb, { tolerance: 0.05, angularTolerance: 0.1 }),
      )
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        honeycombMode: true,
      })
      expect(quality.honeycombCellCount).toBeGreaterThan(0)

      const plateCutters =
        makeOpenGridOpenShelfPlateHoneycombCutters(honeycombParameters)
      let bottomProbe: Shape3D | null = null
      let baselineBottomIntersection: Shape3D | null = null
      let honeycombBottomIntersection: Shape3D | null = null
      try {
        const bottomCutter = plateCutters.find((cutter) => {
          const bounds = boundsOf(cutter)
          return (
            bounds[0]![2]! < 0 &&
            bounds[1]![2]! <
              OPENGRID_OPEN_SHELF_CONFIGURATION.bottomThickness + 0.1
          )
        })
        expect(bottomCutter).toBeDefined()
        const cutterBounds = boundsOf(bottomCutter!)
        const centerX = (cutterBounds[0]![0]! + cutterBounds[1]![0]!) / 2
        const centerY = (cutterBounds[0]![1]! + cutterBounds[1]![1]!) / 2
        bottomProbe = makeBox(
          [centerX - 0.2, centerY - 0.2, -0.05],
          [
            centerX + 0.2,
            centerY + 0.2,
            OPENGRID_OPEN_SHELF_CONFIGURATION.bottomThickness + 0.05,
          ],
        )
        baselineBottomIntersection = baseline.intersect(bottomProbe)
        honeycombBottomIntersection = honeycomb.intersect(bottomProbe)
        expect(measureVolume(baselineBottomIntersection)).toBeGreaterThan(0)
        expect(measureVolume(honeycombBottomIntersection)).toBeCloseTo(0, 4)
      } finally {
        plateCutters.forEach(deleteShape)
        deleteShape(bottomProbe)
        deleteShape(baselineBottomIntersection)
        deleteShape(honeycombBottomIntersection)
      }

      const wallCutters =
        makeOpenGridOpenShelfWallHoneycombCutters(honeycombParameters)
      try {
        const [width, depth] =
          openGridOpenShelfFootprintFor(honeycombParameters)
        const dividerCenter =
          openGridOpenShelfDividerCentersFor(honeycombParameters)[0]
        const [shelfFrontZ, shelfRearZ] =
          openGridOpenShelfShelfLowerSurfaceZFor(honeycombParameters, 1)
        const yFront = -depth / 2
        const firstShelfLowerZAt = (y: number) =>
          shelfFrontZ + ((y - yFront) / depth) * (shelfRearZ - shelfFrontZ)
        const wedgeCutters = wallCutters.filter((cutter) => {
          const bounds = boundsOf(cutter)
          return (
            bounds[1]![0]! - bounds[0]![0]! < bounds[1]![1]! - bounds[0]![1]! &&
            bounds[1]![2]! <
              firstShelfLowerZAt((bounds[0]![1]! + bounds[1]![1]!) / 2) - 0.05
          )
        })
        const sideWallCutter = wedgeCutters.find((cutter) => {
          const bounds = boundsOf(cutter)
          return (
            bounds[0]![0]! >
            width / 2 -
              OPENGRID_OPEN_SHELF_CONFIGURATION.outerWallThickness -
              0.1
          )
        })
        const dividerCutter = wedgeCutters.find((cutter) => {
          if (dividerCenter === undefined) return false
          const bounds = boundsOf(cutter)
          const centerX = (bounds[0]![0]! + bounds[1]![0]!) / 2
          return Math.abs(centerX - dividerCenter) < 0.1
        })
        expect(sideWallCutter, 'outer-side bottom wedge').toBeDefined()
        expect(dividerCutter, 'divider bottom wedge').toBeDefined()
        for (const cutter of [sideWallCutter, dividerCutter]) {
          if (!cutter) continue
          expectCutterRemovedFromShape(cutter, baseline, honeycomb)
        }

        const [secondShelfFrontZ, secondShelfRearZ] =
          openGridOpenShelfShelfLowerSurfaceZFor(honeycombParameters, 2)
        const shelfVerticalThickness =
          OPENGRID_OPEN_SHELF_CONFIGURATION.innerPlateThickness *
          Math.cos((honeycombParameters.angle * Math.PI) / 180)
        const railYs = [yFront + 3, -yFront - 3]
        const panelCenters = [
          width / 2 - OPENGRID_OPEN_SHELF_CONFIGURATION.outerWallThickness / 2,
          dividerCenter,
        ]
        const railProbes: Shape3D[] = []
        let railProbeGroup: Shape3D | null = null
        try {
          for (const centerX of panelCenters) {
            if (centerX === undefined) continue
            for (const centerY of railYs) {
              const interpolation = (centerY - yFront) / depth
              const firstShelfLowerZ =
                shelfFrontZ + interpolation * (shelfRearZ - shelfFrontZ)
              const secondShelfLowerZ =
                secondShelfFrontZ +
                interpolation * (secondShelfRearZ - secondShelfFrontZ)
              const centerZ =
                (firstShelfLowerZ +
                  shelfVerticalThickness +
                  secondShelfLowerZ) /
                2
              railProbes.push(
                makeBox(
                  [centerX - 0.2, centerY - 0.2, centerZ - 0.2],
                  [centerX + 0.2, centerY + 0.2, centerZ + 0.2],
                ),
              )
            }
          }
          railProbeGroup = makeCompound(railProbes).asShape3D()
          expectProbePreservedInShape(railProbeGroup, baseline, honeycomb)
        } finally {
          deleteShape(railProbeGroup)
          railProbes.forEach(deleteShape)
        }
      } finally {
        wallCutters.forEach(deleteShape)
      }

      for (const center of openGridOpenShelfPegCentersFor(
        honeycombParameters,
      )) {
        const probe = makeCylinder(
          OPENGRID_OPEN_SHELF_CONFIGURATION.pegDiameter / 2 - 0.1,
          0.2,
          [center[0], center[1], -2.95],
        )
        let intersection: Shape3D | null = null
        try {
          intersection = honeycomb.intersect(probe)
          expect(measureVolume(intersection)).toBeGreaterThan(0)
        } finally {
          deleteShape(intersection)
          probe.delete()
        }
      }

      expect((await exportStepBytes(honeycomb)).byteLength).toBeGreaterThan(0)
      expect(
        (
          await exportStlBytes(honeycomb, {
            tolerance: 0.05,
            angularTolerance: 0.1,
          })
        ).byteLength,
      ).toBeGreaterThan(0)
    } finally {
      deleteShape(baseline)
      deleteShape(honeycomb)
    }
  }, 240_000)

  it('keeps a valid solid when protected panels have no complete Hex Mesh cells', async () => {
    const baselineParameters: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      x: 1,
      y: 1,
      height: 10,
      cellX: 10,
      cellZ: 1,
      angle: 0,
      honeycombMode: false,
    }
    const honeycombParameters: OpenGridOpenShelfParameters = {
      ...baselineParameters,
      honeycombMode: true,
    }
    const baseline = await buildOpenGridOpenShelf(baselineParameters)
    const honeycomb = await buildOpenGridOpenShelf(honeycombParameters)
    try {
      const quality = inspectOpenGridOpenShelfShapeQuality(
        honeycomb,
        honeycombParameters,
        meshBRep(honeycomb, { tolerance: 0.05, angularTolerance: 0.1 }),
      )
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        honeycombMode: true,
        honeycombCellCount: 0,
      })
      expect(measureVolume(honeycomb)).toBeCloseTo(measureVolume(baseline), 4)
      const baselineBounds = boundsOf(baseline)
      for (const [boundIndex, bound] of boundsOf(honeycomb).entries()) {
        for (const [axisIndex, value] of bound.entries()) {
          expect(value).toBeCloseTo(
            baselineBounds[boundIndex]?.[axisIndex] ?? Number.NaN,
            2,
          )
        }
      }
    } finally {
      deleteShape(baseline)
      deleteShape(honeycomb)
    }
  }, 60_000)

  it('builds the default front-open, full-depth, one-solid shelf', async () => {
    const parameters: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
    }
    const shape = await buildOpenGridOpenShelf(parameters)
    try {
      expect(shape.constructor.name).toBe('Solid')
      expect(measureVolume(shape)).toBeGreaterThan(0)
      const cylindricalFaceBounds = shape.faces.flatMap((face) => {
        const boundingBox = face.boundingBox
        try {
          if (face.surface.surfaceType !== 'CYLINDRE') return []
          const [min, max] = boundingBox.bounds as number[][]
          return [{ min, max }]
        } finally {
          boundingBox.delete()
          face.delete()
        }
      })
      const outerArcFaces = cylindricalFaceBounds.filter(({ min, max }) => {
        const xSpan = (max[0] ?? 0) - (min[0] ?? 0)
        const ySpan = (max[1] ?? 0) - (min[1] ?? 0)
        return (
          (min[2] ?? 0) >= -0.1 && (max[2] ?? 0) > 1 && xSpan > 1 && ySpan > 1
        )
      })
      expect(outerArcFaces).toHaveLength(4)
      for (const { min, max } of outerArcFaces) {
        expect(
          Math.max(
            (max[0] ?? 0) - (min[0] ?? 0),
            (max[1] ?? 0) - (min[1] ?? 0),
          ),
        ).toBeCloseTo(OPENGRID_OPEN_SHELF_CONFIGURATION.outerCornerRadius, 2)
      }
      const [width, depth] = openGridOpenShelfFootprintFor(parameters)
      const rearZ = openGridOpenShelfTopOuterRearZFor(parameters)
      const topRearFilletFaces = cylindricalFaceBounds.filter(
        ({ min, max }) => {
          const xSpan = (max[0] ?? 0) - (min[0] ?? 0)
          const ySpan = (max[1] ?? 0) - (min[1] ?? 0)
          const zSpan = (max[2] ?? 0) - (min[2] ?? 0)
          const radius = OPENGRID_OPEN_SHELF_CONFIGURATION.topOuterEdgeRadius
          return (
            xSpan > width * 0.5 &&
            ySpan > radius * 0.5 &&
            zSpan <= radius + 0.2 &&
            (min[2] ?? 0) >= rearZ - radius - 0.2 &&
            (max[2] ?? 0) <= rearZ + 0.2
          )
        },
      )
      expect(topRearFilletFaces).toHaveLength(1)
      const topSideFilletFaces = cylindricalFaceBounds.filter(
        ({ min, max }) => {
          const xSpan = (max[0] ?? 0) - (min[0] ?? 0)
          const ySpan = (max[1] ?? 0) - (min[1] ?? 0)
          const zSpan = (max[2] ?? 0) - (min[2] ?? 0)
          const radius = OPENGRID_OPEN_SHELF_CONFIGURATION.topOuterEdgeRadius
          return (
            xSpan <= radius + 0.2 &&
            ySpan > depth * 0.5 &&
            zSpan > 0.2 &&
            (max[2] ?? 0) >= parameters.height - radius - 0.2
          )
        },
      )
      expect(topSideFilletFaces).toHaveLength(2)
      expectBoundsClose(boundsOf(shape), boundsForOpenGridOpenShelf(parameters))
      expect(countPegChamferFaces(shape)).toBe(4)
      const quality = inspectOpenGridOpenShelfShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
      )
      expect(quality).toMatchObject({ passed: true, failures: [] })

      for (const center of openGridOpenShelfPegCentersFor(parameters)) {
        const probe = makeCylinder(
          OPENGRID_OPEN_SHELF_CONFIGURATION.pegDiameter / 2 - 0.1,
          0.2,
          [center[0], center[1], -2.95],
        )
        try {
          expect(measureVolume(shape.intersect(probe))).toBeGreaterThan(0)
        } finally {
          probe.delete()
        }
      }

      const frontProbe = makeBox([-100, -42, 49.5], [100, -41, 50.1])
      const rearProbe = makeBox([-100, 41, 20], [100, 42, 30])
      const [firstShelfFrontZ] = openGridOpenShelfShelfLowerSurfaceZFor(
        parameters,
        1,
      )
      const openingProbe = makeBox(
        [-10, -41.4, 4],
        [10, -40.9, firstShelfFrontZ - 1],
      )
      let frontSection: Shape3D | null = null
      let rearSection: Shape3D | null = null
      let openingSection: Shape3D | null = null
      try {
        frontSection = shape.intersect(frontProbe)
        rearSection = shape.intersect(rearProbe)
        openingSection = shape.intersect(openingProbe)
        expect(boundsOf(frontSection)[1]?.[2]).toBeGreaterThan(
          boundsOf(rearSection)[1]?.[2] ?? 0,
        )
        expect(measureVolume(openingSection)).toBeCloseTo(0, 5)
      } finally {
        deleteShape(frontSection)
        deleteShape(rearSection)
        deleteShape(openingSection)
        frontProbe.delete()
        rearProbe.delete()
        openingProbe.delete()
      }
      expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(0)
      expect(
        (
          await exportStlBytes(shape, {
            tolerance: 0.05,
            angularTolerance: 0.1,
          })
        ).byteLength,
      ).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('accepts a one-solid shape when its JavaScript wrapper name is not Solid', async () => {
    const parameters: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
    }
    const shape = await buildOpenGridOpenShelf(parameters)
    const workerWrappedShape = Object.create(shape) as Shape3D
    Object.defineProperty(workerWrappedShape, 'constructor', {
      value: class WorkerWrappedShape {},
    })
    try {
      const quality = inspectOpenGridOpenShelfShapeQuality(
        workerWrappedShape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
      )
      expect(quality).toMatchObject({ passed: true, failures: [] })
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('keeps multi-cell shelves at the rear and uses chamfered peg shafts', async () => {
    const parameters: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      height: 80,
      cellX: 3,
      cellZ: 3,
      angle: 10,
    }
    const shape = await buildOpenGridOpenShelf(parameters)
    try {
      const quality = inspectOpenGridOpenShelfShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
      )
      expect(quality).toMatchObject({ passed: true, failures: [] })

      const depth = openGridOpenShelfDepthFor(parameters)
      const yFront = -depth / 2
      const yRear = depth / 2
      const [shelfFrontZ, shelfRearZ] = openGridOpenShelfShelfLowerSurfaceZFor(
        parameters,
        1,
      )
      expect(shelfFrontZ - shelfRearZ).toBeCloseTo(
        openGridOpenShelfFrontToRearElevationFor(parameters),
      )
      const frontProbe = makeBox(
        [-50, yFront, shelfFrontZ - 0.3],
        [50, yFront + 0.5, shelfFrontZ + 0.4],
      )
      const rearProbe = makeBox(
        [-50, yRear - 0.5, shelfRearZ - 0.3],
        [50, yRear, shelfRearZ + 0.4],
      )
      let frontShelf: Shape3D | null = null
      let rearShelf: Shape3D | null = null
      try {
        frontShelf = shape.intersect(frontProbe)
        rearShelf = shape.intersect(rearProbe)
        expect(measureVolume(frontShelf)).toBeGreaterThan(0)
        expect(measureVolume(rearShelf)).toBeGreaterThan(0)
      } finally {
        deleteShape(frontShelf)
        deleteShape(rearShelf)
        frontProbe.delete()
        rearProbe.delete()
      }

      const center = openGridOpenShelfPegCentersFor(parameters)[0]
      if (!center) throw new Error('Expected a locating peg center')
      const pegRadius = OPENGRID_OPEN_SHELF_CONFIGURATION.pegDiameter / 2
      const outer = makeCylinder(pegRadius + 1.35, 0.2, [
        center[0],
        center[1],
        -3,
      ])
      const inner = makeCylinder(pegRadius + 0.05, 0.2, [
        center[0],
        center[1],
        -3,
      ])
      let annulus: Shape3D | null = null
      try {
        annulus = outer.cut(inner)
        expect(measureVolume(shape.intersect(annulus))).toBeCloseTo(0, 5)
      } finally {
        deleteShape(annulus)
        outer.delete()
        inner.delete()
      }
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(
    'supports the default shelf geometry with cellZ=%i',
    async (cellZ) => {
      const parameters: OpenGridOpenShelfParameters = {
        ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
        cellZ,
      }
      const shape = await buildOpenGridOpenShelf(parameters)
      try {
        const quality = inspectOpenGridOpenShelfShapeQuality(
          shape,
          parameters,
          meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
        )
        expect(quality).toMatchObject({ passed: true, failures: [] })
      } finally {
        deleteShape(shape)
      }
    },
    180_000,
  )

  it('keeps upper transitions when the shelf is flat', async () => {
    const parameters: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      angle: 0,
    }
    const shape = await buildOpenGridOpenShelf(parameters)
    try {
      const quality = inspectOpenGridOpenShelfShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
      )
      expect(quality).toMatchObject({ passed: true, failures: [] })
      expectBoundsClose(boundsOf(shape), boundsForOpenGridOpenShelf(parameters))
    } finally {
      deleteShape(shape)
    }
  }, 180_000)
})
