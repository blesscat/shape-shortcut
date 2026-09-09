import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
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

describe('OpenGrid honeycomb side-opening memory ceiling', () => {
  beforeAll(initialise)

  it('builds a 7x7 box when a large side opening crosses lattice cells', async () => {
    const parameters: OpenGridStackableBoxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 7,
      y: 7,
      height: 60,
      cornerSeatMode: 'none',
      honeycombMode: true,
      openingPlusXDepth: 45,
      openingPlusXBottomLength: 24,
      openingPlusXAngle: 45,
    }
    let shape: Shape3D | null = null
    try {
      shape = await buildOpenGridStackableBoxAsync(parameters)
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 900_000)
})
