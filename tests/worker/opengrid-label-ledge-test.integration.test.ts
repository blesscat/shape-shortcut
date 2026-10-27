import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  assertOpenGridLabelLedgeTestQuality,
  buildOpenGridLabelLedgeTest,
} from '../../src/cad-kernel/components/opengrid-label-ledge-test/builder'
import { placeOnLedgeSlope } from '../../src/cad-kernel/components/opengrid-label-ledge/builder'
import { OPENGRID_LABEL_SNAP_FITS } from '../../src/cad-contract/units/opengrid-label-ledge'
import { openGridLabelLedgeTestLayoutFor } from '../../src/cad-contract/units/opengrid-label-ledge-test'
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

function overlapVolume(shape: Shape3D, probe: Shape3D): number {
  const overlap = shape.intersect(probe)
  try {
    return Math.abs(measureVolume(overlap))
  } finally {
    overlap.delete()
  }
}

/** Seats a card (plate in X/Y, face along +Z) on the ledge slope, shifted along it. */
function placeCard(
  card: Shape3D,
  ledge: ReturnType<typeof openGridLabelLedgeTestLayoutFor>,
  slideDown: number,
): Shape3D {
  const turned = card.clone().rotate(180, [0, 0, 0], [0, 0, 1])
  const box = turned.boundingBox
  const [min] = box.bounds
  box.delete()
  const seated = turned.translate(
    0,
    ledge.ledge.cardTopS - min[1] + slideDown,
    ledge.ledge.cardNormalMin - min[2],
  )
  const sloped = placeOnLedgeSlope(seated, ledge.ledge)
  return sloped.translate(0, 0, ledge.rimZ)
}

it.each(
  [2, 3, 10].flatMap((gridUnits) =>
    OPENGRID_LABEL_SNAP_FITS.map((labelSnapFit) => ({
      gridUnits,
      labelSnapFit,
    })),
  ),
)(
  'builds a valid $gridUnits-unit $labelSnapFit coupon that seats and snaps flat and raised cards',
  async (parameters) => {
    const layout = openGridLabelLedgeTestLayoutFor(parameters)
    const shape = await buildOpenGridLabelLedgeTest(parameters)
    try {
      expect(() =>
        assertOpenGridLabelLedgeTestQuality(shape, parameters),
      ).not.toThrow()
      for (const style of ['flat', 'raised'] as const) {
        const card = await buildOpenGridLabelCardWithParts(
          {
            ...OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters,
            gridUnits: parameters.gridUnits,
            style,
          },
          {},
        )
        try {
          const seated = placeCard(card.shape, layout, 0)
          expect(overlapVolume(shape, seated)).toBeLessThan(1e-5)
          seated.delete()
          const slidOut = placeCard(card.shape, layout, 0.6)
          expect(overlapVolume(shape, slidOut)).toBeGreaterThan(1e-3)
          slidOut.delete()
          const pushedIntoWall = placeCard(card.shape, layout, -0.5)
          expect(overlapVolume(shape, pushedIntoWall)).toBeGreaterThan(1e-3)
          pushedIntoWall.delete()
        } finally {
          card.shape.delete()
          for (const part of card.parts) part.shape.delete()
        }
      }
      expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(100)
      expect((await exportStlBytes(shape)).byteLength).toBeGreaterThan(100)
      const blocked = makeBox([-1, 0, 0], [1, 3, 30])
      const bad = shape.fuse(blocked)
      expect(() =>
        assertOpenGridLabelLedgeTestQuality(bad, parameters),
      ).toThrow()
      bad.delete()
      blocked.delete()
    } finally {
      shape.delete()
    }
  },
  180_000,
)
