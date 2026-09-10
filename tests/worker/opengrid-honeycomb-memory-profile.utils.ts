import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import { buildOpenGridStackableBoxAsync } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { exportStepBytes } from '../../src/cad-kernel/export'

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

export function deleteProfileShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Keep cleanup from hiding a stress-test failure.
  }
}

export async function initialiseProfileHarness(): Promise<void> {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
}

export function runHoneycombProfileStressCase(
  profile: 'thin-shell' | 'open-bottom',
): void {
  it(`builds a 7x7 100 mm ${profile} honeycomb box`, async () => {
    const parameters: OpenGridStackableBoxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 7,
      y: 7,
      height: 100,
      cornerSeatMode: 'none',
      topRimMode: 'flat-top',
      bottomMode: profile === 'thin-shell' ? 'thin-shell' : 'none',
      honeycombMode: true,
    }
    let shape: Shape3D | null = null
    try {
      shape = await buildOpenGridStackableBoxAsync(parameters)
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(0)
    } finally {
      deleteProfileShape(shape)
    }
  }, 900_000)
}
