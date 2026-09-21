import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC } from 'replicad'
import {
  buildOpenGridLabelSlotTest,
  assertOpenGridLabelSlotTestQuality,
} from '../../src/cad-kernel/components/opengrid-label-slot-test/builder'
import { openGridLabelSlotTestLayoutFor } from '../../src/cad-contract/units/opengrid-label-slot-test'
import { buildOpenGridLabelCardWithParts } from '../../src/cad-kernel/components/opengrid-label-card/builder'
import { OPENGRID_LABEL_CARD_CONFIGURATION } from '../../src/cad-contract/units/opengrid-label-card'
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

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

it.each([1, 3, 5])(
  'exports a %i-unit slot with matching flat/raised card clearance',
  async (gridUnits) => {
    const p = { gridUnits }
    const slot = openGridLabelSlotTestLayoutFor(p)
    const shape = await buildOpenGridLabelSlotTest(p)
    try {
      expect(() => assertOpenGridLabelSlotTestQuality(shape, p)).not.toThrow()
      for (const style of ['flat', 'raised'] as const) {
        const card = await buildOpenGridLabelCardWithParts(
          {
            ...OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters,
            gridUnits,
            style,
          },
          {},
        )
        try {
          for (const lift of [0, 5, 10]) {
            const placed = card.shape
              .clone()
              .rotate(90, [0, 0, 0], [1, 0, 0])
              .translate(0, -0.15, slot.cardBottom + 5 + lift)
            const overlap = shape.intersect(placed)
            expect(Math.abs(measureVolume(overlap))).toBeLessThan(1e-5)
            overlap.delete()
            placed.delete()
          }
        } finally {
          card.shape.delete()
          for (const part of card.parts) part.shape.delete()
        }
      }
      expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(100)
      expect((await exportStlBytes(shape)).byteLength).toBeGreaterThan(100)
      const blocked = makeBox(
        [-1, -0.8, slot.cardBottom],
        [1, 0.1, slot.cardTop],
      )
      const bad = shape.fuse(blocked)
      expect(() => assertOpenGridLabelSlotTestQuality(bad, p)).toThrow()
      bad.delete()
      blocked.delete()
    } finally {
      shape.delete()
    }
  },
  120_000,
)
