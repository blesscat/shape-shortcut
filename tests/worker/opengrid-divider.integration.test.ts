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
  boundsForOpenGridDivider,
  openGridDividerArmEndpointsFor,
  openGridDividerPegPlanFor,
  openGridDividerPlanBoundsFor,
  openGridDividerPegLengthFor,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  type OpenGridDividerParameters,
  openGridDividerTransitionHeightFor,
} from '../../src/cad-contract/units'
import { exportStepBytes, exportStlBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'
import { buildOpenGridDivider } from '../../src/cad-kernel/components/opengrid-divider/builder'
import { inspectOpenGridDividerShapeQuality } from '../../src/cad-kernel/components/opengrid-divider/quality'

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

const DIVIDER_ALIGNMENT_DEFAULTS = {
  alignmentMode: 'free',
  targetBoxGridsX:
    OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.targetBoxGridsX,
  targetBoxGridsY:
    OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.targetBoxGridsY,
  endClearance: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.endClearance,
  pegLengthMode: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.pegLengthMode,
  pegDiameterIncrement:
    OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.pegDiameterIncrement,
} as const

function fullDividerParameters(
  base: Partial<
    Pick<
      OpenGridDividerParameters,
      | 'left'
      | 'right'
      | 'up'
      | 'down'
      | 'height'
      | 'wallThickness'
      | 'alignmentMode'
      | 'targetBoxGridsX'
      | 'targetBoxGridsY'
      | 'endClearance'
      | 'pegLengthMode'
      | 'pegDiameterIncrement'
    >
  > &
    Pick<
      OpenGridDividerParameters,
      'left' | 'right' | 'up' | 'down' | 'height' | 'wallThickness'
    >,
): OpenGridDividerParameters {
  return { ...DIVIDER_ALIGNMENT_DEFAULTS, ...base }
}

function pegProbeZFor(parameters: OpenGridDividerParameters): number {
  return (
    -openGridDividerPegLengthFor(parameters) +
    OPENGRID_DIVIDER_CONFIGURATION.pegBottomChamfer +
    0.01
  )
}

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

function meshBoundsOf(mesh: {
  bounds: { min: number[]; max: number[] }
}): number[][] {
  return [mesh.bounds.min, mesh.bounds.max]
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not replace the primary geometry assertion.
  }
}

function topRoundFaceCount(shape: Shape3D, height: number): number {
  let count = 0
  for (const face of shape.faces) {
    const bounds = face.boundingBox
    try {
      const [[, , minZ], [, , maxZ]] = bounds.bounds as number[][]
      if (
        face.surface.surfaceType === 'CYLINDRE' &&
        minZ >=
          height - OPENGRID_DIVIDER_CONFIGURATION.topFilletRadius - 0.05 &&
        maxZ <= height + 0.05
      ) {
        count += 1
      }
    } finally {
      bounds.delete()
      face.delete()
    }
  }
  return count
}

function transitionRoundFaceCount(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
): number {
  const transitionHeight = openGridDividerTransitionHeightFor(parameters)
  if (transitionHeight <= 0) return 0
  const transitionStart = OPENGRID_DIVIDER_CONFIGURATION.bottomSupportHeight
  const transitionEnd = transitionStart + transitionHeight
  let count = 0
  for (const face of shape.faces) {
    const bounds = face.boundingBox
    try {
      const [[minX, minY, minZ], [maxX, maxY, maxZ]] =
        bounds.bounds as number[][]
      const shortPlanSpan = Math.min(maxX - minX, maxY - minY)
      if (
        face.surface.surfaceType === 'CYLINDRE' &&
        minZ <= transitionStart + 0.02 &&
        maxZ >= transitionStart + 0.02 &&
        maxZ <= transitionEnd + 1 &&
        shortPlanSpan < parameters.wallThickness
      ) {
        count += 1
      }
    } finally {
      bounds.delete()
      face.delete()
    }
  }
  return count
}

function rawPlanCenter(
  parameters: OpenGridDividerParameters,
): [number, number] {
  const plan = openGridDividerPlanBoundsFor(parameters)
  return [(plan.minX + plan.maxX) / 2, (plan.minY + plan.maxY) / 2]
}

function probeVolumeAt(
  shape: Shape3D,
  center: [number, number],
  z: number,
  radius = 0.1,
): number {
  const probe = makeCylinder(radius, 0.02, [center[0], center[1], z])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    probe.delete()
  }
}

function sectionWidthAt(shape: Shape3D, z: number): number {
  const probe = makeBox([0, -10, z], [7, 10, z + 0.1])
  let section: Shape3D | null = null
  try {
    section = shape.intersect(probe)
    const [[, minY], [, maxY]] = boundsOf(section)
    return maxY - minY
  } finally {
    deleteShape(section)
    probe.delete()
  }
}

function horizontalSectionBoundsAt(shape: Shape3D, z: number): number[][] {
  const probe = makeBox([-100, -100, z], [100, 100, z + 0.02])
  let section: Shape3D | null = null
  try {
    section = shape.intersect(probe)
    return boundsOf(section)
  } finally {
    deleteShape(section)
    probe.delete()
  }
}

describe('OpenGrid divider CAD kernel integration', () => {
  it.each([
    { left: 1, right: 1, up: 0, down: 0, height: 20, wallThickness: 2 },
    { left: 0, right: 1, up: 0, down: 0, height: 20, wallThickness: 2 },
    { left: 0, right: 0, up: 1, down: 2, height: 12, wallThickness: 2 },
    { left: 1, right: 0, up: 2, down: 0, height: 20, wallThickness: 2 },
    { left: 1, right: 1, up: 2, down: 1, height: 20, wallThickness: 2 },
    { left: 1.5, right: 2, up: 0, down: 0, height: 35, wallThickness: 2 },
    { left: 0.5, right: 0, up: 0.5, down: 0, height: 20, wallThickness: 2 },
    { left: 10, right: 0, up: 0.5, down: 0, height: 500, wallThickness: 2 },
  ])(
    'builds a centered one-solid divider for %#',
    async (baseParameters) => {
      const parameters = fullDividerParameters(baseParameters)
      const shape = await buildOpenGridDivider(parameters)
      try {
        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const actual = meshBoundsOf(mesh)
        const expected = boundsForOpenGridDivider(parameters)
        expect(actual[0]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.min[0], 2),
            expect.closeTo(expected.min[1], 2),
            expect.closeTo(expected.min[2], 2),
          ]),
        )
        expect(actual[1]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.max[0], 2),
            expect.closeTo(expected.max[1], 2),
            expect.closeTo(expected.max[2], 2),
          ]),
        )
        expect(shape.constructor.name).toBe('Solid')
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(topRoundFaceCount(shape, parameters.height)).toBeGreaterThan(0)

        const [centerX, centerY] = rawPlanCenter(parameters)
        const pegPlan = openGridDividerPegPlanFor(parameters)
        for (const [rawX, rawY] of pegPlan.centers) {
          const probe = makeCylinder(pegPlan.diameter / 2 - 0.1, 0.2, [
            rawX - centerX,
            rawY - centerY,
            pegProbeZFor(parameters),
          ])
          try {
            expect(measureVolume(shape.intersect(probe))).toBeGreaterThan(0)
          } finally {
            probe.delete()
          }
        }

        expect(mesh.triangleCount).toBeGreaterThan(0)
        const quality = inspectOpenGridDividerShapeQuality(
          shape,
          parameters,
          mesh,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
        expect(quality.topFilletFaceCount).toBeGreaterThan(0)
        expect(quality.transitionFaceCount).toBeGreaterThan(0)
        expect(quality.transitionFilletFaceCount).toBeGreaterThan(0)
        expect(quality.bottomPegChamferCount).toBe(quality.expectedPegCount)
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
    },
    180_000,
  )

  it.each([
    ['horizontal', { left: 1, right: 1, up: 0, down: 0 }],
    ['vertical', { left: 0, right: 0, up: 1, down: 1 }],
  ])(
    'rounds the short edges of the 45-degree transition for %s arms',
    async (_axis, plan) => {
      for (const wallThickness of [1, 2, 3, 4]) {
        const parameters = fullDividerParameters({
          ...plan,
          height: 20,
          wallThickness,
        })
        const shape = await buildOpenGridDivider(parameters)
        try {
          expect(transitionRoundFaceCount(shape, parameters)).toBeGreaterThan(0)
        } finally {
          deleteShape(shape)
        }
      }
    },
    180_000,
  )

  it.each([1, 2, 3, 4, 5])(
    'supports the selectable %d mm upper wall profile',
    async (wallThickness) => {
      const parameters = {
        ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
        height: 20,
        wallThickness,
      }
      const shape = await buildOpenGridDivider(parameters)
      try {
        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridDividerShapeQuality(
          shape,
          parameters,
          mesh,
        )
        expect(
          sectionWidthAt(
            shape,
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius +
              0.01,
          ),
        ).toBeCloseTo(OPENGRID_DIVIDER_CONFIGURATION.wallWidth, 2)
        expect(sectionWidthAt(shape, 4)).toBeCloseTo(wallThickness, 2)
        const transitionHeight = openGridDividerTransitionHeightFor(parameters)
        if (transitionHeight > 0) {
          expect(
            sectionWidthAt(
              shape,
              OPENGRID_DIVIDER_CONFIGURATION.bottomSupportHeight +
                transitionHeight / 2,
            ),
          ).toBeCloseTo(
            (OPENGRID_DIVIDER_CONFIGURATION.wallWidth + wallThickness) / 2,
            2,
          )
        }
        expect(quality.passed).toBe(true)
        if (wallThickness < OPENGRID_DIVIDER_CONFIGURATION.wallWidth) {
          expect(quality.transitionFaceCount).toBeGreaterThan(0)
          expect(quality.transitionFilletFaceCount).toBeGreaterThan(0)
        } else {
          expect(quality.transitionFaceCount).toBe(0)
          expect(quality.transitionFilletFaceCount).toBe(0)
        }
        expect(quality.topFilletFaceCount).toBeGreaterThan(0)
        expect(mesh.triangleCount).toBeGreaterThan(0)
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
    },
    180_000,
  )

  it.each([1, 2, 3, 4, 5])(
    'supports the minimum 2 mm height with a %d mm upper wall profile',
    async (wallThickness) => {
      const parameters = {
        ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
        height: OPENGRID_DIVIDER_CONFIGURATION.minHeight,
        wallThickness,
      }
      const shape = await buildOpenGridDivider(parameters)
      try {
        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridDividerShapeQuality(
          shape,
          parameters,
          mesh,
        )

        expect(shape.constructor.name).toBe('Solid')
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(quality.passed, quality.failures.join(';')).toBe(true)
        expect(mesh.triangleCount).toBeGreaterThan(0)
      } finally {
        deleteShape(shape)
      }
    },
    180_000,
  )

  it('keeps a 5 mm base support and selected upper wall thickness', async () => {
    const parameters = fullDividerParameters({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })
    const shape = await buildOpenGridDivider(parameters)
    const baseProbeZ =
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius + 0.01
    const baseProbe = makeBox([0, -10, baseProbeZ], [7, 10, baseProbeZ + 0.01])
    const upperProbe = makeBox([0, -10, 10], [7, 10, 10.1])
    let baseSection: Shape3D | null = null
    let upperSection: Shape3D | null = null
    try {
      baseSection = shape.intersect(baseProbe)
      upperSection = shape.intersect(upperProbe)
      const [[baseMinX, baseMinY], [baseMaxX, baseMaxY]] = boundsOf(baseSection)
      const [[upperMinX, upperMinY], [upperMaxX, upperMaxY]] =
        boundsOf(upperSection)
      expect(baseMaxX - baseMinX).toBeCloseTo(7, 2)
      expect(baseMaxY - baseMinY).toBeCloseTo(5, 2)
      expect(upperMaxX - upperMinX).toBeCloseTo(7, 2)
      expect(upperMaxY - upperMinY).toBeCloseTo(2, 2)
    } finally {
      deleteShape(baseSection)
      deleteShape(upperSection)
      baseProbe.delete()
      upperProbe.delete()
      deleteShape(shape)
    }
  }, 180_000)

  it('retracts the complete active terminal profile by 2.275 mm', async () => {
    const parameters = fullDividerParameters({
      left: 0,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })
    const shape = await buildOpenGridDivider(parameters)
    try {
      const [centerX] = rawPlanCenter(parameters)
      const { right: rawEndpoint } = openGridDividerArmEndpointsFor(parameters)
      const expectedEnd = rawEndpoint - centerX
      const nominalEnd = OPENGRID_DIVIDER_CONFIGURATION.gridPitch - centerX

      expect(nominalEnd - expectedEnd).toBeCloseTo(
        OPENGRID_DIVIDER_CONFIGURATION.armEndRetraction,
        10,
      )

      for (const z of [0.05, 0.85, 4]) {
        const [, [maxX]] = horizontalSectionBoundsAt(shape, z)
        expect(maxX).toBeCloseTo(expectedEnd, 1)
      }
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('extends every single-arm profile across the central peg', async () => {
    const cases = [
      {
        parameters: {
          left: 0,
          right: 1,
          up: 0,
          down: 0,
          height: 20,
          wallThickness: 2,
        },
        axis: 'x',
        activeDirection: 'right',
      },
      {
        parameters: {
          left: 1,
          right: 0,
          up: 0,
          down: 0,
          height: 20,
          wallThickness: 2,
        },
        axis: 'x',
        activeDirection: 'left',
      },
      {
        parameters: {
          left: 0,
          right: 0,
          up: 1,
          down: 0,
          height: 20,
          wallThickness: 2,
        },
        axis: 'y',
        activeDirection: 'up',
      },
      {
        parameters: {
          left: 0,
          right: 0,
          up: 0,
          down: 1,
          height: 20,
          wallThickness: 2,
        },
        axis: 'y',
        activeDirection: 'down',
      },
    ]

    for (const { parameters: baseParameters, axis, activeDirection } of cases) {
      const parameters = fullDividerParameters(baseParameters)
      const shape = await buildOpenGridDivider(parameters)
      try {
        const [centerX, centerY] = rawPlanCenter(parameters)
        const endpoints = openGridDividerArmEndpointsFor(parameters)
        const [[minX, minY], [maxX, maxY]] = horizontalSectionBoundsAt(shape, 4)
        const centerExtension = OPENGRID_DIVIDER_CONFIGURATION.wallWidth / 2
        const expectedActiveEndpoint =
          activeDirection === 'right'
            ? endpoints.right - centerX
            : activeDirection === 'left'
              ? endpoints.left - centerX
              : activeDirection === 'up'
                ? endpoints.up - centerY
                : endpoints.down - centerY
        const actualActiveEndpoint =
          activeDirection === 'right'
            ? maxX
            : activeDirection === 'left'
              ? minX
              : activeDirection === 'up'
                ? maxY
                : minY
        expect(actualActiveEndpoint).toBeCloseTo(expectedActiveEndpoint, 1)

        const actualInactiveEdge =
          activeDirection === 'right'
            ? minX
            : activeDirection === 'left'
              ? maxX
              : activeDirection === 'up'
                ? minY
                : maxY
        const expectedInactiveEdge =
          activeDirection === 'right'
            ? -centerExtension - centerX
            : activeDirection === 'left'
              ? centerExtension - centerX
              : activeDirection === 'up'
                ? -centerExtension - centerY
                : centerExtension - centerY
        expect(actualInactiveEdge).toBeCloseTo(expectedInactiveEdge, 1)

        const oppositeSideProbe: [number, number] =
          axis === 'x'
            ? [-centerX + (activeDirection === 'right' ? -1 : 1), -centerY]
            : [-centerX, -centerY + (activeDirection === 'up' ? -1 : 1)]
        for (const z of [0.05, 0.85, 4]) {
          expect(
            probeVolumeAt(shape, oppositeSideProbe, z, 0.05),
          ).toBeGreaterThan(0)
        }
      } finally {
        deleteShape(shape)
      }
    }
  }, 180_000)

  it('keeps nominal peg diameter, shared 3.8 mm length, and chamfered profile', async () => {
    const parameters = fullDividerParameters({
      left: 1.5,
      right: 2.5,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })
    const shape = await buildOpenGridDivider(parameters)
    const [centerX, centerY] = rawPlanCenter(parameters)
    const rightPeg: [number, number] = [
      OPENGRID_DIVIDER_CONFIGURATION.pegCenterSpacing - centerX,
      -centerY,
    ]
    try {
      expect(
        probeVolumeAt(shape, [rightPeg[0] + 2.35, rightPeg[1]], -0.5),
      ).toBeGreaterThan(0)
      expect(
        probeVolumeAt(shape, [rightPeg[0] + 2.65, rightPeg[1]], -0.5),
      ).toBeLessThan(1e-8)
      expect(
        probeVolumeAt(
          shape,
          rightPeg,
          pegProbeZFor(
            fullDividerParameters({
              left: 1.5,
              right: 2.5,
              up: 0,
              down: 0,
              height: 20,
              wallThickness: 2,
            }),
          ),
        ),
      ).toBeGreaterThan(0)
      expect(
        probeVolumeAt(
          shape,
          rightPeg,
          -openGridDividerPegLengthFor({
            pegLengthMode:
              OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.pegLengthMode,
          }) - 0.04,
        ),
      ).toBeLessThan(1e-8)

      expect(probeVolumeAt(shape, [27.5, 0.9], 10, 0.05)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, [27.5, 1.1], 10, 0.05)).toBeLessThan(1e-8)

      const filletZ = parameters.height - 0.51
      expect(filletZ).toBeLessThan(parameters.height)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('keeps a 3x3 cross to one central peg without dense arm pegs', async () => {
    const parameters = fullDividerParameters({
      left: 1,
      right: 1,
      up: 1,
      down: 1,
      height: 20,
      wallThickness: 2,
    })
    const shape = await buildOpenGridDivider(parameters)
    try {
      expect(
        probeVolumeAt(shape, [0, 0], pegProbeZFor(parameters)),
      ).toBeGreaterThan(0)
      expect(
        probeVolumeAt(
          shape,
          [OPENGRID_DIVIDER_CONFIGURATION.gridPitch / 2, 0],
          -0.5,
        ),
      ).toBeLessThan(1e-8)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('builds a box-fit single arm that spans the box with pegs on hole columns', async () => {
    const parameters = fullDividerParameters({
      left: 0,
      right: 4.5,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
      alignmentMode: 'box-fit',
      targetBoxGridsX: 4.5,
      targetBoxGridsY: 4.5,
      endClearance: 0.15,
    })
    const shape = await buildOpenGridDivider(parameters)
    try {
      const bounds = boundsOf(shape)
      // Box interior half is 61.725 mm; the wall keeps 0.15 mm per end.
      expect(bounds[0][0]).toBeCloseTo(-61.575, 2)
      expect(bounds[1][0]).toBeCloseTo(61.575, 2)
      expect(measureVolume(shape)).toBeGreaterThan(0)

      const quality = inspectOpenGridDividerShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
      )
      expect(quality.passed, quality.failures.join(';')).toBe(true)

      // Five pegs at box hole columns 0, ±28, ±56 (junction-relative).
      const pegPlan = openGridDividerPegPlanFor(parameters)
      expect(pegPlan.centers).toHaveLength(5)
      const centerX = (0 + 123.15) / 2
      for (const [rawX, rawY] of pegPlan.centers) {
        const probe = makeCylinder(pegPlan.diameter / 2 - 0.1, 0.2, [
          rawX - centerX,
          rawY,
          -pegPlan.length + pegPlan.bottomChamfer + 0.01,
        ])
        try {
          expect(measureVolume(shape.intersect(probe))).toBeGreaterThan(0)
        } finally {
          probe.delete()
        }
      }
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('builds a box-fit straight divider whose pegs land on box hole columns', async () => {
    const parameters = fullDividerParameters({
      left: 2,
      right: 2.5,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
      alignmentMode: 'box-fit',
      targetBoxGridsX: 4.5,
      targetBoxGridsY: 4.5,
      endClearance: 0.15,
    })
    const shape = await buildOpenGridDivider(parameters)
    try {
      const bounds = boundsOf(shape)
      expect(bounds[0][0]).toBeCloseTo(-61.575, 2)
      expect(bounds[1][0]).toBeCloseTo(61.575, 2)

      const quality = inspectOpenGridDividerShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
      )
      expect(quality.passed, quality.failures.join(';')).toBe(true)

      const pegPlan = openGridDividerPegPlanFor(parameters)
      expect(pegPlan.centers).toHaveLength(5)
      // Box coordinates after centering: junction offset is +7 mm.
      const boxColumns = pegPlan.centers.map(([x]) => x - 7)
      expect(boxColumns.sort((a, b) => a - b)).toEqual([-56, -28, 0, 28, 56])
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('fuses enlarged pegs into one solid and widens the base with them', async () => {
    const parameters = fullDividerParameters({
      left: 1.5,
      right: 1.5,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
      pegDiameterIncrement: 0.3,
    })
    const shape = await buildOpenGridDivider(parameters)
    try {
      // Ø5.2 pegs exceed the 5 mm base, so the base support widens to 5.2 mm
      // to keep the peg fully supported and printable.
      const sectionBounds = horizontalSectionBoundsAt(shape, 0.5)
      expect(sectionBounds[1][1] - sectionBounds[0][1]).toBeCloseTo(5.2, 1)

      const mesh = meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 })
      const quality = inspectOpenGridDividerShapeQuality(
        shape,
        parameters,
        mesh,
      )
      expect(quality.passed, quality.failures.join(';')).toBe(true)
      expect(quality.solidCount).toBe(1)
      expect(measureVolume(shape)).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('stops at a stale generation safe boundary', async () => {
    let current = true
    await expect(
      buildOpenGridDivider(
        fullDividerParameters({
          left: 3,
          right: 3,
          up: 2,
          down: 2,
          height: 20,
          wallThickness: 2,
        }),
        {
          isGenerationCurrent: () => current,
          yieldToEventLoop: async () => {
            current = false
            await Promise.resolve()
          },
        },
      ),
    ).rejects.toThrow('STALE_GENERATION')
  }, 180_000)
})
