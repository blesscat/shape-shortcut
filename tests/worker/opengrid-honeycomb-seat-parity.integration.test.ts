import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setOC, type Shape3D } from 'replicad'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { inspectOpenGridDetachableCornerSeatConsumers } from '../../src/cad-kernel/components/opengrid-locating-assembly/consumer'
import {
  importOpenGridDetachableCornerSeatHolderReference,
  importOpenGridDetachableCornerSeatReference,
} from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'
import {
  createOpenGridStackableBoxQualityRegions,
  openGridStackableBoxQualityRegionZBounds,
} from '../../src/cad-kernel/components/opengrid-stackable-box/shared'
import { socketSeatChipZone } from '../../src/cad-kernel/components/opengrid-stackable-box/quality-gate'
import { deleteShape } from '../../src/cad-kernel/components/opengrid-stackable-box/shared'
import {
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  openGridStackableBoxSocketCentersFor,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'

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
}, 240_000)

afterAll(() => {
  deleteShape(detachableCornerSeatReference)
  deleteShape(detachableCornerSeatHolderReference)
})

describe('detachable-seat regional measurement parity', () => {
  it('measures identical seat records with and without region chips', () => {
    const input: OpenGridStackableBoxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 2,
      height: 10,
      cornerSeatMode: 'detachable-corner-seat',
      honeycombMode: true,
    }
    const context = {
      detachableCornerSeatReference,
      detachableCornerSeatHolderReference,
    }
    const shape = buildOpenGridStackableBox(input, context)
    try {
      const centers = openGridStackableBoxSocketCentersFor(input)
      const full = inspectOpenGridDetachableCornerSeatConsumers(
        shape,
        centers,
        context,
      )
      const regions = createOpenGridStackableBoxQualityRegions(shape, input)
      try {
        const zBounds = openGridStackableBoxQualityRegionZBounds(input)
        expect(zBounds.bottomMaxZ).toBeGreaterThanOrEqual(
          OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male.totalHeight,
        )
        const chipped = inspectOpenGridDetachableCornerSeatConsumers(
          shape,
          centers,
          context,
          (center) => regions.bottomZone(socketSeatChipZone(input, center)),
        )
        expect(chipped.length).toBe(full.length)
        for (let index = 0; index < full.length; index += 1) {
          const expected = full[index]!
          const actual = chipped[index]!
          expect(actual.center).toEqual(expected.center)
          expect(
            Math.abs(
              actual.socketVoidResidualVolume -
                expected.socketVoidResidualVolume,
            ),
          ).toBeLessThan(1e-9)
          expect(
            Math.abs(actual.maleCollisionVolume - expected.maleCollisionVolume),
          ).toBeLessThan(1e-9)
          expect(
            Math.abs(actual.roofVolume - expected.roofVolume),
          ).toBeLessThan(1e-9)
        }
      } finally {
        regions.dispose()
      }
    } finally {
      deleteShape(shape)
    }
  }, 240_000)
})
