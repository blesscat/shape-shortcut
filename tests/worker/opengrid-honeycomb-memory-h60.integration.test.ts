import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import { OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS } from '../../src/cad-contract/units'
import { buildOpenGridStackableBoxAsync } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { exportStepBytes, exportStlBytes } from '../../src/cad-kernel/export'

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

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Keep cleanup from hiding a stress-test failure.
  }
}

async function initialise(): Promise<void> {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
}

describe('OpenGrid honeycomb memory ceiling at 60 mm', () => {
  beforeAll(initialise)

  it('builds and exports a 7x7 box through the asynchronous Worker builder', async () => {
    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 7,
      y: 7,
      height: 60,
      cornerSeatMode: 'none' as const,
      honeycombMode: true,
    }
    const solid = await buildOpenGridStackableBoxAsync({
      ...parameters,
      honeycombMode: false,
    })
    let solidVolume = 0
    try {
      solidVolume = measureVolume(solid)
    } finally {
      deleteShape(solid)
    }
    let shape: Shape3D | null = null
    try {
      shape = await buildOpenGridStackableBoxAsync(parameters)
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect(measureVolume(shape)).toBeLessThan(solidVolume)
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
  }, 900_000)
})
