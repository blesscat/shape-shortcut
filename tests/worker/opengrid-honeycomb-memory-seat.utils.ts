import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import { buildOpenGridStackableBoxAsync } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import {
  importOpenGridDetachableCornerSeatHolderReference,
  importOpenGridDetachableCornerSeatReference,
} from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import { exportStepBytes } from '../../src/cad-kernel/export'
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

let detachableCornerSeatReference: Shape3D | undefined
let detachableCornerSeatHolderReference: Shape3D | undefined

export async function initialiseHoneycombSeatHarness(): Promise<void> {
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
}

export function disposeHoneycombSeatHarness(): void {
  deleteShape(detachableCornerSeatReference)
  deleteShape(detachableCornerSeatHolderReference)
  detachableCornerSeatReference = undefined
  detachableCornerSeatHolderReference = undefined
}

function parameters(
  cornerSeatMode: OpenGridStackableBoxParameters['cornerSeatMode'],
  height: number,
): OpenGridStackableBoxParameters {
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: 7,
    y: 7,
    height,
    cornerSeatMode,
    honeycombMode: true,
  }
}

export function runHoneycombSeatStressCase(
  cornerSeatMode: OpenGridStackableBoxParameters['cornerSeatMode'],
  height: number,
): void {
  it(`builds and exports a 7x7 honeycomb box at ${height} mm`, async () => {
    const shape = await buildOpenGridStackableBoxAsync(
      parameters(cornerSeatMode, height),
      {
        detachableCornerSeatReference,
        detachableCornerSeatHolderReference,
      },
    )
    try {
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 900_000)
}
