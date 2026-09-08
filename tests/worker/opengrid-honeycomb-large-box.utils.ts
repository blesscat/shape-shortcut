import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { exportStepBytes } from '../../src/cad-kernel/export'
import {
  importOpenGridDetachableCornerSeatHolderReference,
  importOpenGridDetachableCornerSeatReference,
} from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import { deleteShape } from '../../src/cad-kernel/components/opengrid-stackable-box/shared'

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

let initialised = false
let detachableCornerSeatReference: Shape3D
let detachableCornerSeatHolderReference: Shape3D

export async function initialiseLargeBoxHarness(): Promise<void> {
  if (initialised) return
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
  initialised = true
}

export function disposeLargeBoxHarness(): void {
  if (!initialised) return
  deleteShape(detachableCornerSeatReference)
  deleteShape(detachableCornerSeatHolderReference)
  initialised = false
}

/**
 * The 5x8 footprint sits past the point where the honeycomb quality
 * inspection used to exhaust the geometry engine memory ceiling: ~1,500
 * lattice cells combined with per-probe full-shape boolean measurements.
 * Each stacking-seat mode lives in its own test file so the per-file process
 * isolation gives every case a fresh engine heap: the wasm32 heap never
 * gives memory back, so several 5x8 builds in one process would exhaust it
 * regardless of the inspection strategy.
 */
export function runLargeHoneycombBoxCase(
  cornerSeatMode: OpenGridStackableBoxParameters['cornerSeatMode'],
): void {
  it('builds a 5x8 honeycomb box that passes quality inspection and export', async () => {
    const honeycombParameters: OpenGridStackableBoxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 5,
      y: 8,
      height: 20,
      cornerSeatMode,
      honeycombMode: true,
    }
    const solidParameters: OpenGridStackableBoxParameters = {
      ...honeycombParameters,
      honeycombMode: false,
    }
    const buildContext = {
      detachableCornerSeatReference,
      detachableCornerSeatHolderReference,
    }
    const solid = buildOpenGridStackableBox(solidParameters, buildContext)
    try {
      const solidVolume = measureVolume(solid)
      const honeycomb = buildOpenGridStackableBox(
        honeycombParameters,
        buildContext,
      )
      try {
        const honeycombVolume = measureVolume(honeycomb)
        expect(honeycombVolume).toBeGreaterThan(0)
        expect(honeycombVolume).toBeLessThan(solidVolume)
        const stepBytes = await exportStepBytes(honeycomb)
        expect(stepBytes.byteLength).toBeGreaterThan(0)
      } finally {
        deleteShape(honeycomb)
      }
    } finally {
      deleteShape(solid)
    }
  }, 900_000)
}
