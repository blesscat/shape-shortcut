import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { makeBox, measureVolume, type Shape3D } from 'replicad'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  openGridStackableBoxActiveFloorTopZFor,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import {
  buildOpenGridStackableBox,
  buildOpenGridStackableBoxAsync,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import {
  importOpenGridDetachableCornerSeatReference,
  importOpenGridDetachableCornerSeatHolderReference,
} from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'
import { meshBRep } from '../../src/cad-kernel/mesh'
import { estimateOpenGridStackableBoxHoneycombMemory } from '../../src/cad-kernel/lattice/opengrid-honeycomb'
import {
  initialiseProfileHarness,
  deleteProfileShape,
} from './opengrid-honeycomb-memory-profile.utils'

let detachableCornerSeatReference: Shape3D
let detachableCornerSeatHolderReference: Shape3D

beforeAll(async () => {
  await initialiseProfileHarness()
  detachableCornerSeatReference =
    await importOpenGridDetachableCornerSeatReference(
      new Blob([
        readFileSync(
          new URL(
            '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-v13.step',
            import.meta.url,
          ),
        ),
      ]),
    )
  detachableCornerSeatHolderReference =
    await importOpenGridDetachableCornerSeatHolderReference(
      new Blob([
        readFileSync(
          new URL(
            '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-holder-11.step',
            import.meta.url,
          ),
        ),
      ]),
    )
}, 240_000)

afterAll(() => {
  deleteProfileShape(detachableCornerSeatReference)
  deleteProfileShape(detachableCornerSeatHolderReference)
})

const cases = [
  {
    name: 'locked seats, async',
    cornerSeatMode: 'detachable-corner-seat',
    honeycombMode: true,
    synchronous: false,
  },
  {
    name: 'locked seats, sync',
    cornerSeatMode: 'detachable-corner-seat',
    honeycombMode: true,
    synchronous: true,
  },
  {
    name: 'locked seats, solid mode',
    cornerSeatMode: 'detachable-corner-seat',
    honeycombMode: false,
    synchronous: false,
  },
  {
    name: 'no seats',
    cornerSeatMode: 'none',
    honeycombMode: true,
    synchronous: false,
  },
] as const

function expectCentralFloorMesh(shape: Shape3D, floorTop: number): void {
  const mesh = meshBRep(shape, { tolerance: 0.01, angularTolerance: 0.1 })
  let floorTriangles = 0
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const vertices = [
      mesh.indices[index]!,
      mesh.indices[index + 1]!,
      mesh.indices[index + 2]!,
    ]
    const isCentralFloor = vertices.every(
      (vertex) =>
        Math.abs(mesh.positions[vertex * 3 + 2]! - floorTop) < 0.001 &&
        Math.abs(mesh.positions[vertex * 3]!) < 20 &&
        Math.abs(mesh.positions[vertex * 3 + 1]!) < 20,
    )
    if (isCentralFloor) floorTriangles += 1
  }
  expect(
    floorTriangles,
    'preview/export must include the central floor',
  ).toBeGreaterThan(0)
}

it.each(cases)(
  'preserves the thin-shell floor with $name',
  async ({ cornerSeatMode, honeycombMode, synchronous }) => {
    const parameters: OpenGridStackableBoxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 2,
      height: 20,
      cornerSeatMode,
      honeycombMode,
      topRimMode: 'flat-top',
      bottomMode: 'thin-shell',
    }
    const context = {
      detachableCornerSeatReference,
      detachableCornerSeatHolderReference,
    }
    let shape: Shape3D
    if (synchronous) shape = buildOpenGridStackableBox(parameters, context)
    else shape = await buildOpenGridStackableBoxAsync(parameters, context)
    const floorTop = openGridStackableBoxActiveFloorTopZFor(parameters)
    const probe = makeBox([-10, -10, floorTop * 0.1], [10, 10, floorTop * 0.9])
    let material: Shape3D | null = null
    try {
      material = shape.intersect(probe)
      const retainedRatio = measureVolume(material) / measureVolume(probe)
      if (honeycombMode) {
        expect(retainedRatio, 'floor ribs must survive').toBeGreaterThan(0.1)
        expect(retainedRatio, 'honeycomb holes must remain open').toBeLessThan(
          0.9,
        )
        expectCentralFloorMesh(shape, floorTop)
      } else {
        expect(retainedRatio).toBeCloseTo(1, 4)
      }
    } finally {
      deleteProfileShape(material)
      deleteProfileShape(probe)
      deleteProfileShape(shape)
    }
  },
  180_000,
)

it('preserves the floor mesh of a 7.5x7 h101 thin honeycomb box with locked seats', async () => {
  const parameters: OpenGridStackableBoxParameters = {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: 7.5,
    y: 7,
    height: 101,
    cornerSeatMode: 'detachable-corner-seat',
    topRimMode: 'flat-top',
    bottomMode: 'thin-shell',
    honeycombMode: true,
  }
  const shape = await buildOpenGridStackableBoxAsync(parameters, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
  })
  try {
    expectCentralFloorMesh(
      shape,
      openGridStackableBoxActiveFloorTopZFor(parameters),
    )
  } finally {
    deleteProfileShape(shape)
  }
}, 900_000)

it('rejects an over-budget 10x10 h200 honeycomb box before cutting', async () => {
  const parameters: OpenGridStackableBoxParameters = {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: 10,
    y: 10,
    height: 200,
    cornerSeatMode: 'detachable-corner-seat',
    topRimMode: 'flat-top',
    bottomMode: 'thin-shell',
    honeycombMode: true,
  }
  const estimate = estimateOpenGridStackableBoxHoneycombMemory(parameters)
  expect(estimate.withinBudget).toBe(false)
  const createScope = vi.fn()
  await expect(
    buildOpenGridStackableBoxAsync(parameters, {
      detachableCornerSeatReference,
      detachableCornerSeatHolderReference,
      booleanOperations: { createScope },
    }),
  ).rejects.toThrow(
    `OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:${estimate.estimatedCells}`,
  )
  expect(createScope).not.toHaveBeenCalled()
})
