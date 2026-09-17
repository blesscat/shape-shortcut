import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  boundsForOpenGridOpenConnectOrganizer,
  openGridOpenConnectOrganizerLayoutFor,
  openGridOpenConnectOrganizerTiltAxisFor,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  type OpenGridOpenConnectOrganizerParameters,
  type OpenGridOpenConnectOrganizerShape,
} from '../../src/cad-contract/units'
import {
  applyOpenGridOpenConnectOrganizerOwnedTransforms,
  buildOpenGridOpenConnectOrganizer,
} from '../../src/cad-kernel/components/opengrid-openconnect-organizer/builder'
import { inspectOpenGridOpenConnectOrganizerShapeQuality } from '../../src/cad-kernel/components/opengrid-openconnect-organizer/quality'
import {
  importOpenGridOpenConnectShelfLockedSlot,
  openGridOpenConnectShelfLockedSlotAssetUrl,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot'
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
  overrides: Partial<OpenGridOpenConnectOrganizerParameters> = {},
): OpenGridOpenConnectOrganizerParameters {
  return {
    ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

function deleteShape(shape: { delete: () => void } | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not hide the primary geometry assertion.
  }
}

type FaceBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

function cylindricalFaceBoundsFor(shape: Shape3D): FaceBounds[] {
  const faces = shape.faces
  const bounds: FaceBounds[] = []
  try {
    for (const face of faces) {
      if (face.geomType !== 'CYLINDRE') continue
      const boundingBox = face.boundingBox
      try {
        const [min, max] = boundingBox.bounds as [
          [number, number, number],
          [number, number, number],
        ]
        bounds.push({ min: [...min], max: [...max] })
      } finally {
        boundingBox.delete()
      }
    }
    return bounds
  } finally {
    faces.forEach(deleteShape)
  }
}

async function lockedSlotSource(): Promise<Shape3D> {
  return importOpenGridOpenConnectShelfLockedSlot(
    new Blob([
      readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
    ]),
  )
}

async function buildAndInspect(value: OpenGridOpenConnectOrganizerParameters) {
  const slot = await lockedSlotSource()
  const shape = await buildOpenGridOpenConnectOrganizer(value, {
    getLockedSlot: async () => slot,
  })
  const mesh = meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 })
  const quality = await inspectOpenGridOpenConnectOrganizerShapeQuality(
    shape,
    value,
    mesh,
    slot,
  )
  return { shape, slot, mesh, quality }
}

const shapeCases: ReadonlyArray<[OpenGridOpenConnectOrganizerShape, number]> = [
  ['circle', 1],
  ['triangle', 3],
  ['square', 4],
  ['pentagon', 5],
  ['hexagon', 6],
]
const throughOpenShapeCases = shapeCases.filter(
  ([shape]) => shape === 'circle' || shape === 'hexagon',
)

describe('OpenGrid OpenConnect organizer CAD kernel integration', () => {
  it.each(shapeCases)(
    'builds one exact %s blind cavity with %i side surface(s)',
    async (holeShape, sideCount) => {
      const value = parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeShape,
        holeDiameter: 14,
        holeDepth: 12,
        bottomThickness: 3,
        tiltAngle: 20,
      })
      const { shape, slot, quality } = await buildAndInspect(value)
      try {
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(quality).toMatchObject({
          passed: true,
          failures: [],
          validBRep: true,
          solidCount: 1,
          cavityCount: 1,
          cavitySideCounts: [sideCount],
          cavityFloorCount: 1,
          bottomThicknessValid: true,
        })
      } finally {
        deleteShape(shape)
        deleteShape(slot)
      }
    },
    180_000,
  )

  it.each(throughOpenShapeCases)(
    'builds a through-open %s cavity when bottom thickness is zero',
    async (holeShape, sideCount) => {
      const value = parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeShape,
        holeDiameter: 14,
        holeDepth: 12,
        bottomThickness: 0,
        tiltAngle: 0,
      })
      const { shape, slot, quality } = await buildAndInspect(value)
      try {
        expect(quality).toMatchObject({
          passed: true,
          failures: [],
          cavityCount: 1,
          cavitySideCounts: [sideCount],
          cavityFloorCount: 0,
          bottomThicknessValid: true,
        })
      } finally {
        deleteShape(shape)
        deleteShape(slot)
      }
    },
    180_000,
  )

  const newShapeCases: ReadonlyArray<
    [OpenGridOpenConnectOrganizerShape, number, number]
  > = [
    ['rectangle', 0, 4],
    ['rectangle', 2, 8],
    ['rectangle', 10, 4],
    ['ellipse', 0, 2],
  ]
  it.each(newShapeCases)(
    'builds one exact %s blind cavity (r=%i) with %i side surface(s)',
    async (holeShape, holeCornerRadius, sideCount) => {
      const value = parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeShape,
        holeWidth: 30,
        holeHeight: 20,
        holeCornerRadius,
        holeDepth: 12,
        bottomThickness: 3,
        tiltAngle: 20,
      })
      const { shape, slot, quality } = await buildAndInspect(value)
      try {
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(quality).toMatchObject({
          passed: true,
          failures: [],
          validBRep: true,
          solidCount: 1,
          cavityCount: 1,
          cavitySideCounts: [sideCount],
          cavityFloorCount: 1,
          bottomThicknessValid: true,
        })
      } finally {
        deleteShape(shape)
        deleteShape(slot)
      }
    },
    180_000,
  )

  it('builds a fully-round rectangle cavity when r reaches min(width, height) / 2', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeShape: 'rectangle',
      holeWidth: 20,
      holeHeight: 20,
      holeCornerRadius: 10,
      holeDepth: 12,
      bottomThickness: 3,
      tiltAngle: 20,
    })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        solidCount: 1,
        cavityCount: 1,
        cavitySideCounts: [1],
        cavityFloorCount: 1,
      })
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('builds a tall stadium rectangle cavity when r reaches holeWidth / 2', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeShape: 'rectangle',
      holeWidth: 20,
      holeHeight: 30,
      holeCornerRadius: 10,
      holeDepth: 12,
      bottomThickness: 3,
      tiltAngle: 20,
    })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        cavityCount: 1,
        cavitySideCounts: [4],
        cavityFloorCount: 1,
        bottomThicknessValid: true,
      })
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('builds a through-open ellipse when bottom thickness is zero', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeShape: 'ellipse',
      holeWidth: 30,
      holeHeight: 20,
      holeDepth: 12,
      bottomThickness: 0,
      tiltAngle: 0,
    })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        cavityCount: 1,
        cavitySideCounts: [2],
        cavityFloorCount: 0,
        bottomThicknessValid: true,
      })
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('keeps an extreme-aspect ellipse a single valid solid', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeShape: 'ellipse',
      holeWidth: 300,
      holeHeight: 1,
      holeDepth: 2,
      bottomThickness: 1,
      tiltAngle: 0,
    })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        cavityCount: 1,
      })
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('keeps a tall extreme-aspect ellipse a single valid solid', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeShape: 'ellipse',
      holeWidth: 1,
      holeHeight: 300,
      holeDepth: 2,
      bottomThickness: 1,
      tiltAngle: 0,
    })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        cavityCount: 1,
        cavitySideCounts: [2],
      })
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('keeps the exact default circular matrix valid when the bottom is open', async () => {
    const value = parameters({ bottomThickness: 0 })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        cavityCount: 4,
        cavitySideCounts: [1, 1, 1, 1],
        cavityFloorCount: 0,
        bottomThicknessValid: true,
      })
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('builds the default direct-mount body with one locked female socket', async () => {
    const value = parameters()
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        cavityCount: 4,
        slotCount: 1,
        interfacePlaneParallelToWall: true,
        separationSkinCount: 1,
        printUndersideAtZero: true,
      })
      expect(quality.slotResidualVolumes).toHaveLength(1)
      expect(quality.slotResidualVolumes.every((volume) => volume < 0.01)).toBe(
        true,
      )
      const expectedBounds = boundsForOpenGridOpenConnectOrganizer(value)
      for (let axis = 0; axis < 3; axis += 1) {
        expect(quality.bounds.min[axis]).toBeCloseTo(
          expectedBounds.min[axis]!,
          1,
        )
        expect(quality.bounds.max[axis]).toBeCloseTo(
          expectedBounds.max[axis]!,
          1,
        )
      }
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('cuts centered columns and top-aligned rows after the 56 mm boundaries', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDiameter: 48,
      holeDepth: 65,
      bottomThickness: 1,
      edgeThickness: 4,
      tiltAngle: 0,
    })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        slotCount: 4,
        separationSkinCount: 4,
      })
      expect(quality.slotResidualVolumes).toHaveLength(4)
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('verifies every socket across multiple quality batches and cancels between them', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDiameter: 14,
      holeDepth: 473,
      bottomThickness: 3,
      tiltAngle: 0,
    })
    const { shape, slot, mesh, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        slotCount: 17,
        separationSkinCount: 17,
      })
      expect(quality.slotResidualVolumes).toHaveLength(17)

      const faces = shape.faces
      const faceCount = faces.length
      faces.forEach(deleteShape)
      const firstSlotBatchBoundary = 1 + Math.ceil(faceCount / 16) + 1 + 1
      let yieldCount = 0
      let current = true

      await expect(
        inspectOpenGridOpenConnectOrganizerShapeQuality(
          shape,
          value,
          mesh,
          slot,
          {
            isGenerationCurrent: () => current,
            yieldToEventLoop: async () => {
              yieldCount += 1
              if (yieldCount === firstSlotBatchBoundary) current = false
            },
          },
        ),
      ).rejects.toThrow('STALE_GENERATION')
      expect(yieldCount).toBe(firstSlotBatchBoundary)
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('keeps the wall interface fixed while the cavity openings tilt toward the user', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDepth: 30,
      bottomThickness: 4,
      tiltAngle: 30,
    })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      const axis = openGridOpenConnectOrganizerTiltAxisFor(value.tiltAngle)
      expect(quality.installedCavityAxis[0]).toBeCloseTo(axis[0], 8)
      expect(quality.installedCavityAxis[1]).toBeCloseTo(axis[1], 8)
      expect(quality.installedCavityAxis[2]).toBeCloseTo(axis[2], 8)
      expect(quality.openingToFloorDelta).toEqual(
        expect.objectContaining({
          y: expect.closeTo(-value.holeDepth * 0.5, 6),
          z: expect.closeTo(value.holeDepth * Math.cos(Math.PI / 6), 6),
        }),
      )
      expect(quality.interfacePlaneParallelToWall).toBe(true)
      expect(quality.passed).toBe(true)
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('joins a tilted body to the rear interface top without an exposed lip', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDepth: 30,
      bottomThickness: 4,
      tiltAngle: 30,
    })
    const layout = openGridOpenConnectOrganizerLayoutFor(value)
    const radians = (value.tiltAngle * Math.PI) / 180
    const bodyTopZ =
      layout.installedBodyPivotZ + layout.bodyThickness * Math.cos(radians)
    const probeTopInset = Math.min(
      0.4,
      (layout.rearInterfaceHeight - bodyTopZ) / 4,
    )
    const probeCenterZ = layout.rearInterfaceHeight - probeTopInset
    const installedProbe = makeBox(
      [layout.bodyWidth / 2 - 2, -0.4, probeCenterZ - probeTopInset / 2],
      [layout.bodyWidth / 2 - 1, -0.2, probeCenterZ + probeTopInset / 2],
    )
    const printProbe = applyOpenGridOpenConnectOrganizerOwnedTransforms(
      installedProbe,
      [
        (current) => current.translate(0, 0, -layout.installedBodyPivotZ),
        (current) => current.rotate(-value.tiltAngle, [0, 0, 0], [1, 0, 0]),
      ],
    )
    const slot = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectOrganizer(value, {
      getLockedSlot: async () => slot,
    })
    let overlap: Shape3D | null = null
    try {
      overlap = shape.intersect(printProbe)
      expect(measureVolume(overlap)).toBeGreaterThanOrEqual(
        measureVolume(printProbe) * 0.9,
      )
    } finally {
      deleteShape(overlap)
      deleteShape(printProbe)
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('rounds only the two front vertical body corners to R2.5', async () => {
    const value = parameters({ holeShape: 'square' })
    const layout = openGridOpenConnectOrganizerLayoutFor(value)
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      const frontCornerFaces = cylindricalFaceBoundsFor(shape).filter(
        ({ min, max }) => {
          const touchesFront = Math.abs(min[1] + layout.bodyDepth) <= 0.1
          const touchesLeft = Math.abs(min[0] + layout.bodyWidth / 2) <= 0.1
          const touchesRight = Math.abs(max[0] - layout.bodyWidth / 2) <= 0.1
          const spansBodyHeight =
            Math.abs(max[2] - min[2] - layout.bodyThickness) <= 0.1
          return (
            touchesFront && (touchesLeft || touchesRight) && spansBodyHeight
          )
        },
      )

      expect(quality.passed).toBe(true)
      expect(frontCornerFaces).toHaveLength(2)
      for (const { min, max } of frontCornerFaces) {
        expect(max[0] - min[0]).toBeCloseTo(2.5, 1)
        expect(max[1] - min[1]).toBeCloseTo(2.5, 1)
      }
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('keeps a thin-edge body valid with a safely limited front radius', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeShape: 'square',
      holeDiameter: 10,
      edgeThickness: 0.4,
    })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
      })
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('keeps a shallow legal body valid without a degenerate front fillet', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeShape: 'square',
      holeDiameter: 1,
      holeDepth: 1,
      bottomThickness: 1,
      edgeThickness: 0.72,
      tiltAngle: 0,
    })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
      })
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('rejects invalid geometry before loading the shared slot asset', async () => {
    let slotLoads = 0
    await expect(
      buildOpenGridOpenConnectOrganizer(parameters({ holeDepth: 0 }), {
        getLockedSlot: async () => {
          slotLoads += 1
          return lockedSlotSource()
        },
      }),
    ).rejects.toThrow('INVALID_INPUT')
    expect(slotLoads).toBe(0)
  })

  it('stops at a safe boundary when a newer generation supersedes the build', async () => {
    let current = true
    let slotLoads = 0

    await expect(
      buildOpenGridOpenConnectOrganizer(
        parameters({
          holeCountX: 20,
          holeCountY: 20,
          holeDiameter: 1,
          holeSpacingX: 0.5,
          holeSpacingY: 0.5,
          holeDepth: 1,
          bottomThickness: 1,
          tiltAngle: 0,
        }),
        {
          isGenerationCurrent: () => current,
          yieldToEventLoop: async () => {
            current = false
          },
          getLockedSlot: async () => {
            slotLoads += 1
            return lockedSlotSource()
          },
        },
      ),
    ).rejects.toThrow('STALE_GENERATION')
    expect(slotLoads).toBe(0)
  })
})
