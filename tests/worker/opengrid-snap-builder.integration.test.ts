import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  getOC,
  makeBox,
  makeCylinder,
  measureVolume,
  setOC,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import {
  buildOpenGridSnap as buildOpenGridSnapImplementation,
  importOpenGridSnapFixedFootprint,
  importOpenGridSnapOpenConnectHead,
  importOpenGridSnapReference,
  inspectOpenGridSnapReference,
  openGridSnapPreFootprintBoundsFor,
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_URL,
  OPENGRID_SNAP_REFERENCE_URLS,
} from '../../src/cad-kernel/components/opengrid-snap/builder'
import {
  openGridSnapOpenConnectHeadBounds,
  openGridSnapOpenConnectNotchSegmentsFor,
} from '../../src/cad-kernel/components/opengrid-snap/openconnect'
import { openGridSnapProfileFor } from '../../src/cad-kernel/components/opengrid-snap/profile'
import { pillarBodyDiameterForParameters } from '../../src/cad-contract/units'
import { buildPillar } from '../../src/cad-kernel/components/opengrid-pillar/builder'
import {
  assertOpenGridSnapOpenConnectShapeQuality,
  inspectOpenGridSnapShapeQuality,
  OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE,
} from '../../src/cad-kernel/components/opengrid-snap/quality'
import { createBooleanOperationReporter } from '../../src/cad-kernel/boolean-progress'
import { meshBRep } from '../../src/cad-kernel/mesh'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

function shapeBounds(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function expectBoundsNear(actual: number[][], expected: number[][]): void {
  for (let axis = 0; axis < 2; axis += 1) {
    for (let coordinate = 0; coordinate < 3; coordinate += 1) {
      expect(
        Math.abs(actual[axis]![coordinate]! - expected[axis]![coordinate]!),
      ).toBeLessThanOrEqual(OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE)
    }
  }
}

function scaleBoundsXY(
  bounds: number[][],
  scaleX: number,
  scaleY: number,
  centerX = 0,
  centerY = 0,
): number[][] {
  return [
    [
      centerX + (bounds[0]![0]! - centerX) * scaleX,
      centerY + (bounds[0]![1]! - centerY) * scaleY,
      bounds[0]![2]!,
    ],
    [
      centerX + (bounds[1]![0]! - centerX) * scaleX,
      centerY + (bounds[1]![1]! - centerY) * scaleY,
      bounds[1]![2]!,
    ],
  ]
}

function expectBoundsInsideCanonicalFootprint(
  actual: number[][],
  height: number,
): void {
  expect(actual[0]?.[0]).toBeGreaterThanOrEqual(-7.15)
  expect(actual[0]?.[1]).toBeGreaterThanOrEqual(-7.15)
  expect(actual[1]?.[0]).toBeLessThanOrEqual(7.15)
  expect(actual[1]?.[1]).toBeLessThanOrEqual(7.15)
  expect(actual[0]?.[2]).toBeGreaterThanOrEqual(-0.15)
  expect(actual[1]?.[2]).toBeLessThanOrEqual(height + 0.15)
}

function assemblyBounds(shape: Shape3D): number[][] {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let bounds: number[][] | null = null
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      try {
        const solidBounds = shapeBounds(solid)
        if (!bounds) {
          bounds = solidBounds
        } else {
          bounds = [
            [
              Math.min(bounds[0][0], solidBounds[0][0]),
              Math.min(bounds[0][1], solidBounds[0][1]),
              Math.min(bounds[0][2], solidBounds[0][2]),
            ],
            [
              Math.max(bounds[1][0], solidBounds[1][0]),
              Math.max(bounds[1][1], solidBounds[1][1]),
              Math.max(bounds[1][2], solidBounds[1][2]),
            ],
          ]
        }
      } finally {
        solid.delete()
      }
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  if (!bounds) throw new Error('assembly bounds missing')
  return bounds
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
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

type SolidDescriptor = {
  bounds: number[][]
  volume: number
}

function solidDescriptors(shape: Shape3D): SolidDescriptor[] {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  const descriptors: SolidDescriptor[] = []
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      try {
        descriptors.push({
          bounds: shapeBounds(solid),
          volume: measureVolume(solid),
        })
      } finally {
        solid.delete()
      }
      explorer.Next()
    }
    return descriptors
  } finally {
    explorer.delete()
  }
}

function sortedSolidDescriptors(shape: Shape3D): SolidDescriptor[] {
  return solidDescriptors(shape).sort((left, right) => {
    if (Math.abs(left.volume - right.volume) > 0.01) {
      return right.volume - left.volume
    }
    const xDifference = left.bounds[0]![0]! - right.bounds[0]![0]!
    if (Math.abs(xDifference) > 0.01) return xDifference
    return left.bounds[0]![1]! - right.bounds[0]![1]!
  })
}

function countDiagonalBoundaryCorners(shape: Shape3D, height: number): number {
  const assembly = assemblyBounds(shape)
  const centerX = (assembly[0]![0]! + assembly[1]![0]!) / 2
  const centerY = (assembly[0]![1]! + assembly[1]![1]!) / 2
  const corners = new Set<string>()
  for (const face of shape.faces) {
    try {
      if (face.geomType !== 'PLANE') continue
      const normal = face.normalAt()
      const faceBounds = face.boundingBox
      try {
        const [min, max] = faceBounds.bounds as number[][]
        const hasZSpan = max[2]! - min[2]! >= height - 1.2
        const isDiagonal =
          Math.abs(normal.z) < 0.1 &&
          Math.abs(normal.x) > 0.1 &&
          Math.abs(normal.y) > 0.1
        if (!hasZSpan || !isDiagonal) continue

        const xSign = (min[0]! + max[0]!) / 2 >= centerX ? 1 : -1
        const ySign = (min[1]! + max[1]!) / 2 >= centerY ? 1 : -1
        const touchesX =
          xSign > 0
            ? Math.abs(max[0]! - assembly[1]![0]!) <= 0.75
            : Math.abs(min[0]! - assembly[0]![0]!) <= 0.75
        const touchesY =
          ySign > 0
            ? Math.abs(max[1]! - assembly[1]![1]!) <= 0.75
            : Math.abs(min[1]! - assembly[0]![1]!) <= 0.75
        if (touchesX && touchesY) corners.add(`${xSign}:${ySign}`)
      } finally {
        faceBounds.delete()
        normal.delete()
      }
    } finally {
      face.delete()
    }
  }
  return corners.size
}

function hasPlanarFaceWithBounds(
  shape: Shape3D,
  expected: number[][],
  tolerance = 0.05,
): boolean {
  for (const face of shape.faces) {
    try {
      if (face.geomType !== 'PLANE') continue
      const bounds = face.boundingBox
      try {
        const actual = bounds.bounds as number[][]
        if (
          actual.every((point, pointIndex) =>
            point.every(
              (coordinate, coordinateIndex) =>
                Math.abs(
                  coordinate - expected[pointIndex]![coordinateIndex]!,
                ) <= tolerance,
            ),
          )
        ) {
          return true
        }
      } finally {
        bounds.delete()
      }
    } finally {
      face.delete()
    }
  }
  return false
}

function centralSolid(shape: Shape3D): Solid {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let selected: Solid | null = null
  let selectedVolume = -Infinity
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      const volume = measureVolume(solid)
      if (volume > selectedVolume) {
        selected?.delete()
        selected = solid
        selectedVolume = volume
      } else {
        solid.delete()
      }
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  if (!selected) throw new Error('central solid missing')
  return selected
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
    if (intersection && intersection !== shape) intersection.delete()
    probe.delete()
  }
}

function volumeInCylinder(
  shape: Shape3D,
  radius: number,
  minZ: number,
  maxZ: number,
): number {
  const probe = makeCylinder(radius, maxZ - minZ, [0, 0, minZ])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== shape) intersection.delete()
    probe.delete()
  }
}

function circularSegmentStripArea(radius: number, halfWidth: number): number {
  return (
    2 *
    (halfWidth * Math.sqrt(radius ** 2 - halfWidth ** 2) +
      radius ** 2 * Math.asin(halfWidth / radius))
  )
}

function centerRemoverPassageVolume(
  definition: ReturnType<typeof openGridSnapProfileFor>,
): number {
  const radius = definition.centerPassageRadius
  const halfWidth = definition.centerRemoverUpperHalfWidth
  const stripArea = circularSegmentStripArea(radius, halfWidth)
  const passageSegmentArea = Math.PI * radius ** 2 - stripArea
  return (
    passageSegmentArea *
    (definition.expectedBounds.max[2] - definition.centerRemoverStepZ)
  )
}

function pillarCenterRemoverInterferenceVolume(
  definition: ReturnType<typeof openGridSnapProfileFor>,
): number {
  const pillarRadius =
    pillarBodyDiameterForParameters({
      mode: 'positioning',
      length: 10,
      offset: 0,
    }) / 2
  const passageRadius = definition.centerPassageRadius
  const halfWidth = definition.centerRemoverUpperHalfWidth
  // Material the Ø4.9 pillar displaces above the step: the annulus between
  // the pillar and the narrower passage, minus the part of that annulus
  // already opened by the 4 mm-wide upper remover box.
  const interferenceArea =
    Math.PI * (pillarRadius ** 2 - passageRadius ** 2) -
    (circularSegmentStripArea(pillarRadius, halfWidth) -
      circularSegmentStripArea(passageRadius, halfWidth))
  return (
    interferenceArea *
    (definition.expectedBounds.max[2] - definition.centerRemoverStepZ)
  )
}

function intersectionVolume(first: Shape3D, second: Shape3D): number {
  const intersection = first.intersect(second)
  try {
    return measureVolume(intersection)
  } finally {
    if (intersection !== first && intersection !== second) intersection.delete()
  }
}

function assetBlob(
  variant: 'Full' | 'Lite',
  profile: 'Standard' | 'Directional' = 'Standard',
): Blob {
  return new Blob([
    readFileSync(fileURLToPath(OPENGRID_SNAP_REFERENCE_URLS[profile][variant])),
  ])
}

function fixedAssetBlob(footprint: 'half' | 'quarter'): Blob {
  return new Blob([
    readFileSync(
      fileURLToPath(
        new URL(
          `../../public/downloads/snap-${footprint}.step`,
          import.meta.url,
        ),
      ),
    ),
  ])
}

function openConnectHeadBlob(): Blob {
  return new Blob([
    readFileSync(fileURLToPath(OPENGRID_SNAP_OPEN_CONNECT_HEAD_URL)),
  ])
}

type SnapBuildParameters = Parameters<typeof buildOpenGridSnapImplementation>[0]
type SnapBuildContext = Parameters<typeof buildOpenGridSnapImplementation>[1]

async function buildOpenGridSnap(
  parameters: SnapBuildParameters,
  context: SnapBuildContext,
): Promise<Shape3D> {
  if (
    parameters.footprint !== 'full' ||
    !parameters.openConnect ||
    context.getOpenGridSnapOpenConnectHead
  ) {
    return buildOpenGridSnapImplementation(parameters, context)
  }

  const head = await importOpenGridSnapOpenConnectHead(openConnectHeadBlob())
  try {
    return await buildOpenGridSnapImplementation(parameters, {
      ...context,
      getOpenGridSnapOpenConnectHead: async () => head,
    })
  } finally {
    head.delete()
  }
}

function snapParameters(
  variant: 'Full' | 'Lite',
  offset: number,
  footprint: 'full' | 'half' | 'quarter' = 'full',
  overrides: Partial<{
    profile: 'Standard' | 'Directional'
    fourCornerLocatingHoles: boolean
    centerRemoverHole: boolean
    openConnect: boolean
    magnetHoleShape: 'none' | 'square' | 'round'
    magnetHoleLength: number
    magnetHoleWidth: number
    magnetHoleDiameter: number
    magnetHoleThickness: number
  }> = {},
) {
  return {
    variant,
    profile: 'Standard' as const,
    offset,
    footprint,
    fourCornerLocatingHoles: false,
    centerRemoverHole: false,
    openConnect: false,
    topText: 'none' as const,
    magnetHoleShape: 'none' as const,
    magnetHoleLength: 0,
    magnetHoleWidth: 0,
    magnetHoleDiameter: 0,
    magnetHoleThickness: 0,
    ...overrides,
  }
}

describe('OpenGrid Snap reference builder', () => {
  beforeAll(async () => {
    await initialiseCadKernel(WASM_PATH)
  })

  afterAll(() => {
    // OpenCascade is process-global in these integration tests.
  })

  it('imports the repository OpenConnect head at its original dimensions', async () => {
    const head = await importOpenGridSnapOpenConnectHead(openConnectHeadBlob())

    try {
      expectBoundsNear(shapeBounds(head), [
        [-8.5, -1.7, 0],
        [8.5, 8.9, 2.6],
      ])
      expect(countSolids(head)).toBe(1)
    } finally {
      head.delete()
    }
  })

  it.each([
    ['Standard', 'Lite'],
    ['Standard', 'Full'],
    ['Directional', 'Lite'],
    ['Directional', 'Full'],
  ] as const)(
    'cuts the stepped OpenConnect underside notch for %s %s',
    async (profile, variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, profile),
        variant,
        profile,
      )
      const head = await importOpenGridSnapOpenConnectHead(
        openConnectHeadBlob(),
      )
      const generated = await buildOpenGridSnap(
        snapParameters(variant, 0, 'full', {
          profile,
          openConnect: true,
        }),
        {
          getOpenGridSnapReference: async () => reference,
          getOpenGridSnapOpenConnectHead: async () => head,
        },
      )

      try {
        const notchSegments = openGridSnapOpenConnectNotchSegmentsFor(variant)
        if (variant === 'Lite') {
          expect(notchSegments).toEqual([
            {
              min: [-2.5, -12.4, 1.9],
              max: [2.5, -10.9, 3.4],
            },
            {
              min: [-2.5, -10.9, 2],
              max: [2.5, -10.4, 2.5],
            },
          ])
        }
        const notchVolumes = notchSegments.map(({ min, max }) => {
          const probeMin: [number, number, number] = [
            min[0] + 0.1,
            min[1] + 0.1,
            min[2] + 0.1,
          ]
          const probeMax: [number, number, number] = [
            max[0] - 0.1,
            max[1] - 0.1,
            max[2] - 0.1,
          ]
          return volumeInBox(generated, probeMin, probeMax)
        })
        const firstSegment = notchSegments[0]!
        const secondSegment = notchSegments[1]!
        const neighboringMaterialProbe = volumeInBox(
          generated,
          [3, firstSegment.min[1] + 0.1, firstSegment.min[2] + 0.1],
          [4, firstSegment.max[1] - 0.1, firstSegment.max[2] - 0.1],
        )
        const materialBelowNotchProbe = volumeInBox(
          generated,
          [-2, secondSegment.min[1] + 0.1, secondSegment.min[2] - 0.3],
          [2, secondSegment.max[1] - 0.1, secondSegment.min[2] - 0.1],
        )
        const centralSupportProbe = volumeInBox(
          generated,
          [-2, -11.9, firstSegment.min[2] + 0.1],
          [2, -10.8, (notchSegments[2]?.min[2] ?? firstSegment.max[2]) - 0.1],
        )
        const expectedMaxZ =
          (variant === 'Lite' ? 3.4 : 6.8) +
          (openGridSnapOpenConnectHeadBounds(variant).max[2] -
            openGridSnapOpenConnectHeadBounds(variant).min[2])

        expect(notchVolumes.every((volume) => volume < 0.01)).toBe(true)
        expect(neighboringMaterialProbe).toBeGreaterThan(0.05)
        expect(materialBelowNotchProbe).toBeGreaterThan(0.05)
        expect(centralSupportProbe).toBeGreaterThan(0.05)
        expect(shapeBounds(generated)[1]?.[2]).toBeCloseTo(expectedMaxZ, 2)
        expect(countSolids(generated)).toBe(
          openGridSnapProfileFor(profile, variant).expectedSolidCount + 1,
        )
      } finally {
        generated.delete()
        head.delete()
        reference.delete()
      }
    },
  )

  it.each([
    ['Standard', 'Lite'],
    ['Standard', 'Full'],
    ['Directional', 'Lite'],
    ['Directional', 'Full'],
  ] as const)(
    'does not compose OpenConnect when disabled for %s %s',
    async (profile, variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, profile),
        variant,
        profile,
      )
      const head = await importOpenGridSnapOpenConnectHead(
        openConnectHeadBlob(),
      )
      const generated = await buildOpenGridSnap(
        snapParameters(variant, 0, 'full', { profile, openConnect: false }),
        {
          getOpenGridSnapReference: async () => reference,
          getOpenGridSnapOpenConnectHead: async () => head,
        },
      )

      try {
        expect(countSolids(generated)).toBe(
          openGridSnapProfileFor(profile, variant).expectedSolidCount,
        )
        expect(shapeBounds(generated)[1]?.[2]).toBeCloseTo(
          variant === 'Lite' ? 3.4 : 6.8,
          2,
        )
      } finally {
        generated.delete()
        head.delete()
        reference.delete()
      }
    },
  )

  it.each([
    ['Standard', 'Lite'],
    ['Standard', 'Full'],
    ['Directional', 'Lite'],
    ['Directional', 'Full'],
  ] as const)(
    'composes OpenConnect after XY adjustment for %s %s',
    async (profile, variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, profile),
        variant,
        profile,
      )
      const head = await importOpenGridSnapOpenConnectHead(
        openConnectHeadBlob(),
      )
      const generated = await buildOpenGridSnap(
        snapParameters(variant, 0.2, 'full', { profile, openConnect: true }),
        {
          getOpenGridSnapReference: async () => reference,
          getOpenGridSnapOpenConnectHead: async () => head,
        },
      )

      try {
        expect(countSolids(generated)).toBe(
          openGridSnapProfileFor(profile, variant).expectedSolidCount + 1,
        )
        const headBounds = openGridSnapOpenConnectHeadBounds(variant)
        const expectedHeadBaseZ = headBounds.min[2]
        const headDescriptor = solidDescriptors(generated).find(({ bounds }) =>
          bounds.every((point, pointIndex) =>
            point.every(
              (coordinate, coordinateIndex) =>
                Math.abs(
                  coordinate -
                    [headBounds.min, headBounds.max][pointIndex]![
                      coordinateIndex
                    ]!,
                ) <= 0.05,
            ),
          ),
        )
        expect(headDescriptor).toBeDefined()
        expect(headDescriptor?.bounds[0]?.[2]).toBeCloseTo(expectedHeadBaseZ, 2)
        const quality = assertOpenGridSnapOpenConnectShapeQuality(
          generated,
          snapParameters(variant, 0.2, 'full', { profile, openConnect: true }),
          meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 }),
          reference,
        )
        expect(quality.passed).toBe(true)
      } finally {
        generated.delete()
        head.delete()
        reference.delete()
      }
    },
  )

  it('shows known scope totals while leaving footprint-dependent work indeterminate', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Lite'),
      'Lite',
    )
    const progress: Array<{
      kind: string
      state: string
      total?: number
    }> = []
    const reporter = createBooleanOperationReporter((update) =>
      progress.push(update),
    )
    const parameters = snapParameters('Lite', 0, 'quarter')
    const generated = await buildOpenGridSnap(parameters, {
      getOpenGridSnapReference: async () => reference,
      booleanOperations: reporter,
    })

    try {
      expect(
        progress.some(
          (update) => update.state === 'running' && update.total !== undefined,
        ),
      ).toBe(true)
      expect(
        progress.some(
          (update) => update.state === 'running' && update.total === undefined,
        ),
      ).toBe(true)
    } finally {
      generated.delete()
      reference.delete()
    }
  })

  it.each(['half', 'quarter'] as const)(
    'uses the repository fixed %s STEP shape for fixed-footprint builds',
    async (footprint) => {
      const fixed = await importOpenGridSnapFixedFootprint(
        fixedAssetBlob(footprint),
      )
      let referenceLoads = 0
      const generated = await buildOpenGridSnap(
        snapParameters('Lite', 0.4, footprint, {
          fourCornerLocatingHoles: true,
          centerRemoverHole: true,
        }),
        {
          getOpenGridSnapFixedFootprint: async () => fixed,
          getOpenGridSnapReference: async () => {
            referenceLoads += 1
            throw new Error(
              'fixed footprint must not load a generated reference',
            )
          },
        },
      )

      try {
        expect(generated).not.toBe(fixed)
        expect(referenceLoads).toBe(0)
        expect(countSolids(generated)).toBe(countSolids(fixed))
        expectBoundsNear(assemblyBounds(generated), assemblyBounds(fixed))
      } finally {
        generated.delete()
        fixed.delete()
      }
    },
  )

  it('imports complete Full and Lite nine-solid references with the expected envelope', async () => {
    for (const variant of ['Full', 'Lite'] as const) {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      try {
        const report = inspectOpenGridSnapReference(reference, variant)
        const descriptors = solidDescriptors(reference)
        const body = descriptors.find((descriptor) => descriptor.volume > 100)
        const snaps = descriptors.filter(
          (descriptor) => descriptor.volume > 5.8 && descriptor.volume < 100,
        )
        const holders = descriptors.filter(
          (descriptor) => descriptor.volume <= 5.8,
        )
        expect(report.solidCount).toBe(9)
        expect(body).toBeDefined()
        expect(snaps).toHaveLength(4)
        expect(holders).toHaveLength(4)
        expect(body?.volume).toBeCloseTo(
          variant === 'Full' ? 3670.486 : 1837.358,
          2,
        )
        expect(
          Math.min(...snaps.map((descriptor) => descriptor.bounds[0]![2]!)),
        ).toBeCloseTo(variant === 'Full' ? 5.3 : 1.9, 2)
        expect(
          Math.max(...snaps.map((descriptor) => descriptor.bounds[1]![2]!)),
        ).toBeCloseTo(variant === 'Full' ? 6.8 : 3.4, 2)
        expect(
          Math.min(...holders.map((descriptor) => descriptor.bounds[0]![2]!)),
        ).toBeCloseTo(variant === 'Full' ? 3.4 : 0.2, 2)
        expect(
          Math.max(...holders.map((descriptor) => descriptor.bounds[1]![2]!)),
        ).toBeCloseTo(variant === 'Full' ? 5.4 : 2, 2)
        expect(report.bounds.min[0]).toBeCloseTo(-12.8, 2)
        expect(report.bounds.max[0]).toBeCloseTo(12.8, 2)
        expect(report.bounds.min[1]).toBeCloseTo(-12.8, 2)
        expect(report.bounds.max[1]).toBeCloseTo(12.8, 2)
        expect(report.bounds.min[2]).toBeCloseTo(0, 2)
        expect(report.height).toBeCloseTo(variant === 'Full' ? 6.8 : 3.4, 2)
      } finally {
        reference.delete()
      }
    }
  }, 60_000)

  it.each(['Full', 'Lite'] as const)(
    'retains the complete zero-offset %s reference assembly',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const generated = await buildOpenGridSnap(snapParameters(variant, 0), {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        expect(countSolids(generated)).toBe(9)
        expect(shapeBounds(generated)).toEqual([
          [
            expect.closeTo(-12.8, 2),
            expect.closeTo(-12.8, 2),
            expect.closeTo(0, 2),
          ],
          [
            expect.closeTo(12.8, 2),
            expect.closeTo(12.8, 2),
            expect.closeTo(variant === 'Full' ? 6.8 : 3.4, 2),
          ],
        ])
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          snapParameters(variant, 0),
          meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 }),
          reference,
        )
        expect(
          quality.passed,
          `${quality.failures.join(';')} bounds=${JSON.stringify(quality.bounds)}`,
        ).toBe(true)
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it('cuts one centered square or round magnet pocket with four 2 mm openings', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Full'),
      'Full',
    )
    const cases = [
      {
        magnetHoleShape: 'square' as const,
        magnetHoleLength: 6,
        magnetHoleWidth: 4,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 2,
      },
      {
        magnetHoleShape: 'round' as const,
        magnetHoleLength: 0,
        magnetHoleWidth: 0,
        magnetHoleDiameter: 8,
        magnetHoleThickness: 2,
      },
    ]

    try {
      for (const magnet of cases) {
        const parameters = snapParameters('Full', 0.2, 'full', magnet)
        const generated = await buildOpenGridSnap(parameters, {
          getOpenGridSnapReference: async () => reference,
        })
        const body = centralSolid(generated)
        try {
          expect(countSolids(generated)).toBe(9)
          expect(
            magnet.magnetHoleShape === 'square'
              ? volumeInBox(body, [-2.9, -1.9, 0.1], [2.9, 1.9, 1.9])
              : volumeInCylinder(body, 3.9, 0.1, 1.9),
          ).toBeLessThan(0.05)
          expect(
            volumeInBox(body, [2.5, -0.8, 0.1], [3.1, 0.8, 1.9]),
          ).toBeLessThan(0.1)
          expect(
            volumeInBox(body, [-0.8, 2.8, 0.1], [0.8, 9.5, 1.9]),
          ).toBeLessThan(0.1)
          expect(
            volumeInBox(body, [-0.8, -9.5, 0.1], [0.8, -2.8, 1.9]),
          ).toBeLessThan(0.1)
          expect(
            volumeInBox(body, [2.8, -0.8, 0.1], [9.5, 0.8, 1.9]),
          ).toBeLessThan(0.1)
          expect(
            volumeInBox(body, [-9.5, -0.8, 0.1], [-2.8, 0.8, 1.9]),
          ).toBeLessThan(0.1)
          expect(
            volumeInBox(body, [11, -0.8, 0.1], [12, 0.8, 1.9]),
          ).toBeGreaterThan(0.05)
          expect(
            volumeInBox(body, [-0.8, 11, 0.1], [0.8, 12, 1.9]),
          ).toBeGreaterThan(0.05)
          expect(
            volumeInBox(body, [10.9, -0.8, 0.1], [11.3, 0.8, 1.9]),
          ).toBeLessThan(0.1)
          expect(
            volumeInBox(body, [-11.3, -0.8, 0.1], [-10.9, 0.8, 1.9]),
          ).toBeLessThan(0.1)
          expect(
            volumeInBox(body, [-0.8, 10.9, 0.1], [0.8, 11.3, 1.9]),
          ).toBeLessThan(0.1)
          expect(
            volumeInBox(body, [-0.8, -11.3, 0.1], [0.8, -10.9, 1.9]),
          ).toBeLessThan(0.1)
          const quality = inspectOpenGridSnapShapeQuality(
            generated,
            parameters,
            meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 }),
            reference,
          )
          expect(quality.passed, quality.failures.join(';')).toBe(true)
        } finally {
          body.delete()
          generated.delete()
        }
      }
    } finally {
      reference.delete()
    }
  }, 60_000)

  it.each([
    ['Full', 'Directional'],
    ['Lite', 'Standard'],
    ['Lite', 'Directional'],
  ] as const)(
    'quality-gates %s %s magnet assemblies',
    async (variant, profile) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, profile),
        variant,
        profile,
      )
      const parameters = snapParameters(variant, 0, 'full', {
        profile,
        magnetHoleShape: 'round',
        magnetHoleDiameter: 8,
        magnetHoleThickness: 2,
      })
      const generated = await buildOpenGridSnap(parameters, {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          parameters,
          meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 }),
          reference,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
        expect(countSolids(generated)).toBe(profile === 'Standard' ? 9 : 1)
      } finally {
        generated.delete()
        reference.delete()
      }
    },
    60_000,
  )

  it.each(['Full', 'Lite'] as const)(
    'derives the full, half, and quarter footprints for %s',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const footprints = ['full', 'half', 'quarter'] as const
      try {
        for (const footprint of footprints) {
          const parameters = snapParameters(variant, 0, footprint)
          const generated = await buildOpenGridSnap(parameters, {
            getOpenGridSnapReference: async () => reference,
          })
          try {
            const mesh = meshBRep(generated, {
              tolerance: 0.05,
              angularTolerance: 0.1,
            })
            const quality = inspectOpenGridSnapShapeQuality(
              generated,
              parameters,
              mesh,
              reference,
            )
            const bounds = assemblyBounds(generated)
            const expectedX = footprint === 'full' ? 12.8 : 6.4
            const expectedY = footprint === 'quarter' ? 6.4 : 12.8
            expect(
              quality.passed,
              `${footprint}: ${quality.failures.join(';')} actual=${JSON.stringify(bounds)}`,
            ).toBe(true)
            expectBoundsNear(bounds, [
              [-expectedX, -expectedY, 0],
              [expectedX, expectedY, variant === 'Full' ? 6.8 : 3.4],
            ])
            expect(
              countDiagonalBoundaryCorners(
                generated,
                variant === 'Full' ? 6.8 : 3.4,
              ),
              `${variant}/${footprint} diagonal boundary corner count`,
            ).toBe(4)
          } finally {
            generated.delete()
          }
        }
      } finally {
        reference.delete()
      }
    },
  )

  it('computes the extra selected-axis span before half/quarter clipping', () => {
    expect(
      openGridSnapPreFootprintBoundsFor(snapParameters('Full', 0.2, 'half')),
    ).toEqual({
      min: [-13, -12.9, 0],
      max: [13, 12.9, 6.8],
    })
    const directionalQuarter = openGridSnapPreFootprintBoundsFor(
      snapParameters('Lite', 0.2, 'quarter', {
        profile: 'Directional',
      }),
    )
    expect(directionalQuarter.min[0]).toBeCloseTo(-13.001, 10)
    expect(directionalQuarter.min[1]).toBeCloseTo(-13.001, 10)
    expect(directionalQuarter.min[2]).toBeCloseTo(-0.001, 10)
    expect(directionalQuarter.max[0]).toBeCloseTo(13.001, 10)
    expect(directionalQuarter.max[1]).toBeCloseTo(13.401, 10)
    expect(directionalQuarter.max[2]).toBeCloseTo(3.401, 10)
  })

  it.each(['Full', 'Lite'] as const)(
    'keeps the fixed center-remover coordinate after quarter clipping for %s',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const parameters = snapParameters(variant, 0.2, 'quarter', {
        centerRemoverHole: true,
      })
      const generated = await buildOpenGridSnap(parameters, {
        getOpenGridSnapReference: async () => reference,
      })
      const body = centralSolid(generated)
      try {
        const definitionStepZ = variant === 'Full' ? 4.8 : 1.9
        expect(
          volumeInBox(
            body,
            [-0.5, -0.5, 0.1],
            [0.5, 0.5, definitionStepZ - 0.1],
          ),
        ).toBeLessThan(0.05)
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          parameters,
          meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 }),
          reference,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
      } finally {
        body.delete()
        generated.delete()
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'applies one positive offset symmetrically on the $variant envelope',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      try {
        for (const offset of [0.05, 0.2]) {
          const generated = await buildOpenGridSnap(
            snapParameters(variant, offset),
            { getOpenGridSnapReference: async () => reference },
          )
          try {
            meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 })
            const bounds = assemblyBounds(generated)
            const halfSpan = 12.8 + offset / 2
            expectBoundsNear(bounds, [
              [-halfSpan, -halfSpan, 0],
              [halfSpan, halfSpan, variant === 'Full' ? 6.8 : 3.4],
            ])
          } finally {
            generated.delete()
          }
        }
      } finally {
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'keeps the canonical quarter footprint within both host pitches at maximum offset for $variant',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const parameters = snapParameters(variant, 1, 'quarter')
      const generated = await buildOpenGridSnap(parameters, {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        const mesh = meshBRep(generated, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          parameters,
          mesh,
          reference,
        )
        expect(
          quality.passed,
          `${quality.failures.join(';')} bounds=${JSON.stringify(quality.bounds)}`,
        ).toBe(true)
        const bounds = assemblyBounds(generated)
        expectBoundsInsideCanonicalFootprint(
          bounds,
          variant === 'Full' ? 6.8 : 3.4,
        )
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'scales every Standard %s assembly member with the centered outer envelope',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const parameters = snapParameters(variant, 0.2)
      const generated = await buildOpenGridSnap(parameters, {
        getOpenGridSnapReference: async () => reference,
      })
      const referenceCore = centralSolid(reference)
      const generatedCore = centralSolid(generated)
      const referenceMembers = sortedSolidDescriptors(reference)
      const generatedMembers = sortedSolidDescriptors(generated)
      const scale = 12.9 / 12.8
      try {
        expect(countSolids(generated)).toBe(9)
        expect(generatedMembers).toHaveLength(referenceMembers.length)
        for (let index = 0; index < referenceMembers.length; index += 1) {
          const referenceMember = referenceMembers[index]
          const generatedMember = generatedMembers[index]
          if (!referenceMember || !generatedMember) {
            throw new Error('standard-assembly-member-missing')
          }
          expectBoundsNear(
            generatedMember.bounds,
            scaleBoundsXY(referenceMember.bounds, scale, scale),
          )
          expect(generatedMember.volume).toBeCloseTo(
            referenceMember.volume * scale * scale,
            1,
          )
        }
        expect(shapeBounds(generated)).toEqual([
          [
            expect.closeTo(-12.9, 2),
            expect.closeTo(-12.9, 2),
            expect.closeTo(0, 2),
          ],
          [
            expect.closeTo(12.9, 2),
            expect.closeTo(12.9, 2),
            expect.closeTo(variant === 'Full' ? 6.8 : 3.4, 2),
          ],
        ])
        const mesh = meshBRep(generated, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          parameters,
          mesh,
          reference,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
        expect(measureVolume(generatedCore)).toBeCloseTo(
          measureVolume(referenceCore) * scale * scale,
          1,
        )
        expectBoundsNear(
          shapeBounds(generatedCore),
          scaleBoundsXY(shapeBounds(referenceCore), scale, scale),
        )
      } finally {
        referenceCore.delete()
        generatedCore.delete()
        generated.delete()
        reference.delete()
      }
    },
    60_000,
  )

  it('quality-gates the complete assembly and fixed internal probes', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Lite'),
      'Lite',
    )
    const generated = await buildOpenGridSnap(snapParameters('Lite', 0.2), {
      getOpenGridSnapReference: async () => reference,
    })
    try {
      const mesh = meshBRep(generated, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      const quality = inspectOpenGridSnapShapeQuality(
        generated,
        snapParameters('Lite', 0.2),
        mesh,
        reference,
      )
      expect(quality.passed, quality.failures.join(';')).toBe(true)
      expect(quality.solidCount).toBe(9)
      expect(quality.internalProbeVolumes).toHaveLength(3)
    } finally {
      generated.delete()
      reference.delete()
    }
  }, 60_000)

  it('rejects a positive-offset candidate whose assembly remains unscaled', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Full'),
      'Full',
    )
    const unscaled = await buildOpenGridSnap(snapParameters('Full', 0), {
      getOpenGridSnapReference: async () => reference,
    })
    try {
      const parameters = snapParameters('Full', 0.2)
      const quality = inspectOpenGridSnapShapeQuality(
        unscaled,
        parameters,
        meshBRep(unscaled, { tolerance: 0.05, angularTolerance: 0.1 }),
        reference,
      )
      expect(quality.passed).toBe(false)
      expect(quality.failures).toContain(
        'transformed-core:central-bounds-mismatch',
      )
      expect(quality.failures).toContain(
        'transformed-assembly:member-bounds-mismatch',
      )
    } finally {
      unscaled.delete()
      reference.delete()
    }
  })

  it.each(['Full', 'Lite'] as const)(
    'applies the two optional body features independently for %s',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const solid = await buildOpenGridSnap(snapParameters(variant, 0), {
        getOpenGridSnapReference: async () => reference,
      })
      const corners = await buildOpenGridSnap(
        snapParameters(variant, 0, 'full', {
          fourCornerLocatingHoles: true,
        }),
        { getOpenGridSnapReference: async () => reference },
      )
      const offsetCorners = await buildOpenGridSnap(
        snapParameters(variant, 0.4, 'full', {
          fourCornerLocatingHoles: true,
        }),
        { getOpenGridSnapReference: async () => reference },
      )
      const offsetSolid = await buildOpenGridSnap(
        snapParameters(variant, 0.4),
        {
          getOpenGridSnapReference: async () => reference,
        },
      )
      const center = await buildOpenGridSnap(
        snapParameters(variant, 0, 'full', {
          centerRemoverHole: true,
        }),
        { getOpenGridSnapReference: async () => reference },
      )
      const offsetCenter = await buildOpenGridSnap(
        snapParameters(variant, 0.4, 'full', {
          centerRemoverHole: true,
        }),
        { getOpenGridSnapReference: async () => reference },
      )
      const both = await buildOpenGridSnap(
        snapParameters(variant, 0, 'full', {
          fourCornerLocatingHoles: true,
          centerRemoverHole: true,
        }),
        { getOpenGridSnapReference: async () => reference },
      )
      try {
        const featureCases = [
          [solid, snapParameters(variant, 0)],
          [
            corners,
            snapParameters(variant, 0, 'full', {
              fourCornerLocatingHoles: true,
            }),
          ],
          [
            center,
            snapParameters(variant, 0, 'full', {
              centerRemoverHole: true,
            }),
          ],
          [
            both,
            snapParameters(variant, 0, 'full', {
              fourCornerLocatingHoles: true,
              centerRemoverHole: true,
            }),
          ],
          [offsetSolid, snapParameters(variant, 0.4)],
          [
            offsetCorners,
            snapParameters(variant, 0.4, 'full', {
              fourCornerLocatingHoles: true,
            }),
          ],
          [
            offsetCenter,
            snapParameters(variant, 0.4, 'full', {
              centerRemoverHole: true,
            }),
          ],
        ] as const
        const volumes = featureCases.map(([shape]) => {
          const body = centralSolid(shape)
          const volume = measureVolume(body)
          body.delete()
          return volume
        })
        const qualityReports: Array<
          ReturnType<typeof inspectOpenGridSnapShapeQuality>
        > = []
        for (const [shape, parameters] of featureCases) {
          const quality = inspectOpenGridSnapShapeQuality(
            shape,
            parameters,
            meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
            reference,
          )
          expect(quality.passed, quality.failures.join(';')).toBe(true)
          qualityReports.push(quality)
        }
        expect(volumes[1]).toBeLessThan(volumes[0]!)
        expect(volumes[2]).toBeLessThan(volumes[0]!)
        expect(volumes[3]).toBeLessThan(volumes[1]!)
        expect(volumes[3]).toBeLessThan(volumes[2]!)
        expect(volumes[4]).toBeCloseTo(volumes[0]! * (26 / 25.6) ** 2, 1)
        expect(volumes[5]).toBeLessThan(volumes[4]!)
        expect(volumes[6]).toBeLessThan(volumes[4]!)
        expect(volumes[0]! - volumes[1]!).toBeCloseTo(
          variant === 'Full' ? 1070.83 : 479.503,
          2,
        )
        expect(volumes[4]! - volumes[5]!).toBeCloseTo(
          volumes[0]! - volumes[1]!,
          2,
        )
        const definition = openGridSnapProfileFor('Standard', variant)
        const existingCenterRemoverReduction =
          variant === 'Full' ? 371.2 : 169.6
        expect(volumes[0]! - volumes[2]!).toBeCloseTo(
          existingCenterRemoverReduction +
            centerRemoverPassageVolume(definition),
          2,
        )
        expect(volumes[4]! - volumes[6]!).toBeCloseTo(
          volumes[0]! - volumes[2]!,
          2,
        )
        for (const [zeroOffset, positiveOffset] of [
          [qualityReports[1], qualityReports[5]],
          [qualityReports[2], qualityReports[6]],
        ] as const) {
          if (!zeroOffset || !positiveOffset) {
            throw new Error('optional-feature-quality-report-missing')
          }
          expect(positiveOffset.optionalFeatureProbeVolumes).toHaveLength(
            zeroOffset.optionalFeatureProbeVolumes.length,
          )
          for (
            let index = 0;
            index < zeroOffset.optionalFeatureProbeVolumes.length;
            index += 1
          ) {
            expect(
              positiveOffset.optionalFeatureProbeVolumes[index],
            ).toBeCloseTo(zeroOffset.optionalFeatureProbeVolumes[index]!, 1)
          }
        }

        const cornerBody = centralSolid(corners)
        try {
          const slotStepZ = variant === 'Full' ? 4.8 : 1.9
          expect(
            hasPlanarFaceWithBounds(cornerBody, [
              [-5, 5.5, 0],
              [5, 5.5, slotStepZ],
            ]),
          ).toBe(true)
          expect(
            hasPlanarFaceWithBounds(cornerBody, [
              [5.5, -5, 0],
              [5.5, 5, slotStepZ],
            ]),
          ).toBe(true)
          expect(
            hasPlanarFaceWithBounds(cornerBody, [
              [-5, 5.5, slotStepZ],
              [5, 8.5, slotStepZ],
            ]),
          ).toBe(true)
        } finally {
          cornerBody.delete()
        }

        const centerBody = centralSolid(center)
        try {
          const stepZ = variant === 'Full' ? 4.8 : 1.9
          const topZ = variant === 'Full' ? 6.8 : 3.4
          const passageChordY = Math.sqrt(
            definition.centerPassageRadius ** 2 -
              definition.centerRemoverUpperHalfWidth ** 2,
          )
          expect(
            hasPlanarFaceWithBounds(centerBody, [
              [4, -4, 0],
              [4, 4, stepZ],
            ]),
          ).toBe(true)
          expect(
            hasPlanarFaceWithBounds(centerBody, [
              [2, -4, stepZ],
              [2, -passageChordY, topZ],
            ]),
          ).toBe(true)
          expect(
            hasPlanarFaceWithBounds(centerBody, [
              [2, passageChordY, stepZ],
              [2, 4, topZ],
            ]),
          ).toBe(true)
          expect(
            hasPlanarFaceWithBounds(centerBody, [
              [2, -4, stepZ],
              [4, 4, stepZ],
            ]),
          ).toBe(true)
        } finally {
          centerBody.delete()
        }
      } finally {
        solid.delete()
        corners.delete()
        offsetCorners.delete()
        offsetSolid.delete()
        center.delete()
        offsetCenter.delete()
        both.delete()
        reference.delete()
      }
    },
    60_000,
  )

  it.each(['Full', 'Lite'] as const)(
    'loads the independent Directional %s profile',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, 'Directional'),
        variant,
        'Directional',
      )
      const parameters = snapParameters(variant, 0, 'full', {
        profile: 'Directional',
      })
      const generated = await buildOpenGridSnap(parameters, {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        const report = inspectOpenGridSnapReference(
          reference,
          variant,
          'Directional',
        )
        expect(report.solidCount).toBe(1)
        expect(countSolids(generated)).toBe(1)
        expect(assemblyBounds(generated)[1][1]).toBeGreaterThan(12.8)
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it.each([
    ['Standard', 'Full'],
    ['Standard', 'Lite'],
    ['Directional', 'Full'],
    ['Directional', 'Lite'],
  ] as const)(
    'interference-fits the nominal positioning pillar in the center remover for %s %s',
    async (profile, variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, profile),
        variant,
        profile,
      )
      const pillar = await buildPillar({
        mode: 'positioning',
        length: 10,
        offset: 0,
      })
      const definition = openGridSnapProfileFor(profile, variant)
      const expectedInterference =
        pillarCenterRemoverInterferenceVolume(definition)
      const innerPassageProbeRadius = 2.43
      const passageVolumes: number[] = []
      const shrinkProbeVolumes: number[] = []
      const pillarCollisionVolumes: number[] = []
      try {
        for (const offset of [0, 0.4]) {
          const generated = await buildOpenGridSnap(
            snapParameters(variant, offset, 'full', {
              profile,
              centerRemoverHole: true,
            }),
            { getOpenGridSnapReference: async () => reference },
          )
          const body = centralSolid(generated)
          try {
            const bounds = shapeBounds(body)
            passageVolumes.push(
              volumeInCylinder(
                body,
                innerPassageProbeRadius,
                bounds[0]![2]! - 0.1,
                bounds[1]![2]! + 0.1,
              ),
            )
            // The inner probe must be fully void inside the new Ø4.9 passage;
            // the surrounding box still samples material outside its boundary.
            shrinkProbeVolumes.push(
              volumeInBox(
                body,
                [2.41, -0.15, definition.centerRemoverStepZ + 0.05],
                [2.49, 0.15, bounds[1]![2]! - 0.05],
              ),
            )
            pillarCollisionVolumes.push(intersectionVolume(body, pillar))

            const upperLedgeVolume = volumeInBox(
              body,
              [2.55, -0.1, definition.centerRemoverStepZ + 0.1],
              [2.75, 0.1, bounds[1]![2]! - 0.1],
            )
            expect(upperLedgeVolume).toBeGreaterThan(0.05)
          } finally {
            body.delete()
            generated.delete()
          }
        }

        expect(passageVolumes[0]).toBeLessThan(0.05)
        expect(passageVolumes[1]).toBeLessThan(0.05)
        expect(passageVolumes[1]).toBeCloseTo(passageVolumes[0]!, 3)
        expect(shrinkProbeVolumes[0]).toBeGreaterThan(0.01)
        expect(shrinkProbeVolumes[1]).toBeGreaterThan(0.01)
        expect(shrinkProbeVolumes[1]).toBeCloseTo(shrinkProbeVolumes[0]!, 3)
        expect(pillarCollisionVolumes[0]).toBeCloseTo(expectedInterference, 2)
        expect(pillarCollisionVolumes[1]).toBeCloseTo(expectedInterference, 2)
      } finally {
        pillar.delete()
        reference.delete()
      }
    },
    180_000,
  )

  it.each(['Full', 'Lite'] as const)(
    'scales the Directional %s profile in both axes',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, 'Directional'),
        variant,
        'Directional',
      )
      const parameters = snapParameters(variant, 0.2, 'full', {
        profile: 'Directional',
      })
      const generated = await buildOpenGridSnap(parameters, {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        const sourceBounds = shapeBounds(reference)
        const sourceWidth = sourceBounds[1]![0]! - sourceBounds[0]![0]!
        const sourceDepth = sourceBounds[1]![1]! - sourceBounds[0]![1]!
        const scaleX = (sourceWidth + 0.2) / sourceWidth
        const scaleY = (sourceDepth + 0.2) / sourceDepth
        expectBoundsNear(
          assemblyBounds(generated),
          scaleBoundsXY(sourceBounds, scaleX, scaleY, 0, 0.2),
        )
        expect(
          Math.abs(
            measureVolume(generated) -
              measureVolume(reference) * scaleX * scaleY,
          ),
        ).toBeLessThanOrEqual(1)
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          parameters,
          meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 }),
          reference,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'keeps Directional optional features independent for %s',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, 'Directional'),
        variant,
        'Directional',
      )
      const baseParameters = snapParameters(variant, 0, 'full', {
        profile: 'Directional',
      })
      const featureCases = [
        baseParameters,
        { ...baseParameters, fourCornerLocatingHoles: true },
        { ...baseParameters, centerRemoverHole: true },
        {
          ...baseParameters,
          fourCornerLocatingHoles: true,
          centerRemoverHole: true,
        },
      ]
      const generated: Shape3D[] = []
      try {
        for (const parameters of featureCases) {
          generated.push(
            await buildOpenGridSnap(parameters, {
              getOpenGridSnapReference: async () => reference,
            }),
          )
        }
        const volumes = generated.map((shape) => {
          const body = centralSolid(shape)
          const volume = measureVolume(body)
          body.delete()
          return volume
        })
        expect(volumes[1]).toBeLessThan(volumes[0]!)
        expect(volumes[2]).toBeLessThan(volumes[0]!)
        expect(volumes[3]).toBeLessThan(volumes[1]!)
        expect(volumes[3]).toBeLessThan(volumes[2]!)
        for (let index = 0; index < featureCases.length; index += 1) {
          const parameters = featureCases[index]
          const shape = generated[index]
          if (!shape) throw new Error('directional-feature-shape-missing')
          const quality = inspectOpenGridSnapShapeQuality(
            shape,
            parameters,
            meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
            reference,
          )
          expect(quality.passed, quality.failures.join(';')).toBe(true)
        }
      } finally {
        for (const shape of generated) shape.delete()
        reference.delete()
      }
    },
    120_000,
  )

  it('meshes the Directional Lite offset assembly with both optional features', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Lite', 'Directional'),
      'Lite',
      'Directional',
    )
    try {
      for (const features of [
        { fourCornerLocatingHoles: false, centerRemoverHole: false },
        { fourCornerLocatingHoles: true, centerRemoverHole: false },
        { fourCornerLocatingHoles: false, centerRemoverHole: true },
        { fourCornerLocatingHoles: true, centerRemoverHole: true },
      ]) {
        for (const offset of [0, 0.05, 0.2, 0.35]) {
          const parameters = snapParameters('Lite', offset, 'full', {
            profile: 'Directional',
            ...features,
          })
          const generated = await buildOpenGridSnap(parameters, {
            getOpenGridSnapReference: async () => reference,
          })
          try {
            let mesh: ReturnType<typeof meshBRep>
            try {
              mesh = meshBRep(generated, {
                tolerance: 0.05,
                angularTolerance: 0.1,
              })
            } catch (error) {
              throw new Error(
                `Directional Lite offset${offset} corners${features.fourCornerLocatingHoles} center${features.centerRemoverHole}: ${error instanceof Error ? error.message : String(error)}`,
              )
            }
            const quality = inspectOpenGridSnapShapeQuality(
              generated,
              parameters,
              mesh,
              reference,
            )
            expect(quality.passed, quality.failures.join(';')).toBe(true)
          } finally {
            generated.delete()
          }
        }
      }
    } finally {
      reference.delete()
    }
  }, 60_000)

  it.each(['Full', 'Lite'] as const)(
    'derives every Directional footprint for %s',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, 'Directional'),
        variant,
        'Directional',
      )
      const footprints = ['full', 'half', 'quarter'] as const
      try {
        for (const footprint of footprints) {
          const parameters = snapParameters(variant, 0, footprint, {
            profile: 'Directional',
          })
          const generated = await buildOpenGridSnap(parameters, {
            getOpenGridSnapReference: async () => reference,
          })
          try {
            const quality = inspectOpenGridSnapShapeQuality(
              generated,
              parameters,
              meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 }),
              reference,
            )
            expect(
              quality.passed,
              `${footprint}: ${quality.failures.join(';')}`,
            ).toBe(true)
            expect(quality.solidCount).toBeGreaterThanOrEqual(1)
          } finally {
            generated.delete()
          }
        }
      } finally {
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'derives a Directional quarter-cell from the complete %s assembly',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, 'Directional'),
        variant,
        'Directional',
      )
      const parameters = snapParameters(variant, 0, 'quarter', {
        profile: 'Directional',
      })
      const generated = await buildOpenGridSnap(parameters, {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        const mesh = meshBRep(generated, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          parameters,
          mesh,
          reference,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
        expect(quality.solidCount).toBeGreaterThanOrEqual(1)
        expectBoundsNear(assemblyBounds(generated), [
          [-6.4, -6.4, 0],
          [6.4, 6.4, variant === 'Full' ? 6.8 : 3.4],
        ])
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'supports the maximum slider offset for $variant with scaled core geometry',
    async (parameters) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(parameters),
        parameters,
      )
      const generated = await buildOpenGridSnap(snapParameters(parameters, 1), {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        const mesh = meshBRep(generated, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          snapParameters(parameters, 1),
          mesh,
          reference,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
        expect(
          Math.abs((quality.bounds?.min[0] ?? 0) + 13.3),
        ).toBeLessThanOrEqual(OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE)
        expect(
          Math.abs((quality.bounds?.max[0] ?? 0) - 13.3),
        ).toBeLessThanOrEqual(OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE)
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it('keeps the cached reference usable after zero-offset preview meshing', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Full'),
      'Full',
    )
    const zeroOffset = await buildOpenGridSnap(snapParameters('Full', 0), {
      getOpenGridSnapReference: async () => reference,
    })
    meshBRep(zeroOffset, { tolerance: 0.05, angularTolerance: 0.1 })
    expect(countSolids(reference)).toBe(9)
    const generated = await buildOpenGridSnap(snapParameters('Full', 0.2), {
      getOpenGridSnapReference: async () => reference,
    })
    try {
      expect(countSolids(generated)).toBe(9)
    } finally {
      generated.delete()
      zeroOffset.delete()
      reference.delete()
    }
  }, 60_000)

  it('rejects an offset that cannot preserve the fixed central region', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Full'),
      'Full',
    )
    try {
      await expect(
        buildOpenGridSnap(snapParameters('Full', -0.05), {
          getOpenGridSnapReference: async () => reference,
        }),
      ).rejects.toThrow('OPENGRID_SNAP_PARAMETERS_INVALID')
    } finally {
      reference.delete()
    }
  }, 60_000)
})
