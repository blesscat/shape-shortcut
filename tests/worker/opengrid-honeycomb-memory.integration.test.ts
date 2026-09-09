import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { exportStepBytes, exportStlBytes } from '../../src/cad-kernel/export'
import {
  makeOpenGridStackableBoxBottomHoneycombPanel,
  makeOpenGridStackableBoxSideHoneycombPanel,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb'

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

function boundsVolume(shape: Shape3D): number {
  const bounds = shape.boundingBox
  try {
    const [[minimumX, minimumY, minimumZ], [maximumX, maximumY, maximumZ]] =
      bounds.bounds as number[][]
    return (
      (maximumX! - minimumX!) *
      (maximumY! - minimumY!) *
      (maximumZ! - minimumZ!)
    )
  } finally {
    bounds.delete()
  }
}

function parameters(
  overrides: Partial<OpenGridStackableBoxParameters> = {},
): OpenGridStackableBoxParameters {
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: 7,
    y: 7,
    height: 60,
    cornerSeatMode: 'none',
    honeycombMode: true,
    ...overrides,
  }
}

async function initialise(): Promise<void> {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
}

describe('OpenGrid honeycomb memory ceiling', () => {
  beforeAll(initialise)

  it('builds bounded side and bottom panel profiles', () => {
    const input = parameters({ x: 5, y: 7, height: 20 })
    const startedAt = performance.now()
    const panels: Shape3D[] = []
    try {
      const sidePanel = makeOpenGridStackableBoxSideHoneycombPanel(input, '+X')
      expect(sidePanel).not.toBeNull()
      if (sidePanel) {
        panels.push(sidePanel)
        expect(measureVolume(sidePanel)).toBeLessThan(boundsVolume(sidePanel))
      }
      for (const side of ['-X', '+Y', '-Y'] as const) {
        const panel = makeOpenGridStackableBoxSideHoneycombPanel(input, side)
        if (panel) panels.push(panel)
      }
      const bottom = makeOpenGridStackableBoxBottomHoneycombPanel(input)
      if (bottom.panel) panels.push(bottom.panel)
      if (bottom.slot) panels.push(bottom.slot)
      expect(performance.now() - startedAt).toBeLessThan(10_000)
      expect(panels.length).toBeGreaterThan(0)
    } finally {
      panels.forEach(deleteShape)
    }
  }, 600_000)

  it('builds and exports a 7x7 box at the supported 100 mm height', async () => {
    const shape = buildOpenGridStackableBox(parameters({ height: 100 }))
    try {
      expect(measureVolume(shape)).toBeGreaterThan(0)
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
  }, 600_000)

  it('rejects an over-budget honeycomb box before lattice construction', () => {
    expect(() =>
      buildOpenGridStackableBox(parameters({ height: 500 })),
    ).toThrow('OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:')
  }, 120_000)
})
