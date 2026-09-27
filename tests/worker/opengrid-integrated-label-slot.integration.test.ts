import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  openGridOpenConnectOrganizerLayoutFor,
} from '../../src/cad-contract/units/opengrid-openconnect-organizer'
import {
  openGridLabelSlotLayoutFor,
  OPENGRID_LABEL_SLOT,
  OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  OPENGRID_LABEL_CARD_HEIGHT,
} from '../../src/cad-contract/units/opengrid-label-shared'
import { OPENGRID_LABEL_CARD_CONFIGURATION } from '../../src/cad-contract/units/opengrid-label-card'
import {
  buildOpenGridOpenConnectOrganizer,
} from '../../src/cad-kernel/components/opengrid-openconnect-organizer/builder'
import { boundsForOpenGridOpenConnectOrganizer } from '../../src/cad-contract/units/opengrid-openconnect-organizer'
import { inspectOpenGridOpenConnectOrganizerShapeQuality } from '../../src/cad-kernel/components/opengrid-openconnect-organizer/quality'
import { buildOpenGridLabelCardWithParts } from '../../src/cad-kernel/components/opengrid-label-card/builder'
import { inspectOpenGridLabelCardShapeQuality } from '../../src/cad-kernel/components/opengrid-label-card/quality'
import {
  importOpenGridOpenConnectShelfLockedSlot,
  openGridOpenConnectShelfLockedSlotAssetUrl,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot'
import { meshBRep } from '../../src/cad-kernel/mesh'
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

async function lockedSlotSource(): Promise<Shape3D> {
  return importOpenGridOpenConnectShelfLockedSlot(
    new Blob([
      readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
    ]),
  )
}

function overlapVolume(first: Shape3D, second: Shape3D): number {
  const overlap = first.intersect(second)
  try {
    return measureVolume(overlap)
  } finally {
    overlap.delete()
  }
}

const defaults = OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS

describe('integrated front label slot geometry', () => {
  it.each([
    { labelGridUnits: 1, tiltAngle: 0, edgeThickness: 0.4, holeCountX: 1 },
    { labelGridUnits: 3, tiltAngle: 15, edgeThickness: 1, holeCountX: 2 },
    { labelGridUnits: 5, tiltAngle: 45, edgeThickness: 0.4, holeCountX: 3 },
  ])(
    'retains matching flat and raised cards without changing cavities: %j',
    async (overrides) => {
      const value = { ...defaults, ...overrides, labelSlotEnabled: true }
      const locked = await lockedSlotSource()
      const shape = await buildOpenGridOpenConnectOrganizer(value, {
        getLockedSlot: async () => locked,
      })
      const plain = await buildOpenGridOpenConnectOrganizer(
        { ...value, labelSlotEnabled: false },
        { getLockedSlot: async () => locked },
      )
      try {
        const report = await inspectOpenGridOpenConnectOrganizerShapeQuality(
          shape,
          value,
          meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
          locked,
        )
        expect(report.failures).toEqual([])
        expect(report.solidCount).toBe(1)
        expect(measureVolume(shape)).toBeGreaterThan(measureVolume(plain))
        const removed = plain.cut(shape)
        try {
          expect(Math.abs(measureVolume(removed))).toBeLessThan(1e-5)
        } finally {
          removed.delete()
        }
        const body = openGridOpenConnectOrganizerLayoutFor(value)
        const slot = openGridLabelSlotLayoutFor(body, value.labelGridUnits)
        for (const style of ['flat', 'raised'] as const) {
          const input = {
            ...OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters,
            gridUnits: value.labelGridUnits,
            style,
          }
          const card = await buildOpenGridLabelCardWithParts(input, {})
          try {
            expect(
              inspectOpenGridLabelCardShapeQuality(card.parts, input).failures,
            ).toEqual([])
            for (const part of card.parts) {
              for (const lift of [0, 5, 10]) {
                const placed = part.shape
                  .clone()
                  .rotate(90, [0, 0, 0], [1, 0, 0])
                  .translate(
                    0,
                    slot.frontY - OPENGRID_LABEL_SLOT.depthClearance / 2,
                    slot.cardBottom +
                    OPENGRID_LABEL_CARD_HEIGHT / 2 +
                    lift,
                  )
                try {
                  expect(Math.abs(overlapVolume(shape, placed))).toBeLessThan(
                    1e-5,
                  )
                } finally {
                  placed.delete()
                }
              }
            }
            // Moving the body forward must hit the retaining lips.
            const escaped = card.parts[0]!.shape.clone()
              .rotate(90, [0, 0, 0], [1, 0, 0])
              .translate(
                0,
                slot.frontY - slot.channelDepth,
                slot.cardBottom + 5,
              )
            try {
              expect(overlapVolume(shape, escaped)).toBeGreaterThan(0.1)
            } finally {
              escaped.delete()
            }
          } finally {
            card.shape.delete()
            card.qualityShape.delete()
            card.parts.forEach((p) => p.shape.delete())
          }
        }
        expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(100)
        expect((await exportStlBytes(shape)).byteLength).toBeGreaterThan(84)
      } finally {
        shape.delete()
        plain.delete()
        locked.delete()
      }
    },
  )

  it('rejects absent rails and a blocked card seat', async () => {
    const value = { ...defaults, labelSlotEnabled: true, labelGridUnits: 3 }
    const locked = await lockedSlotSource()
    const plain = await buildOpenGridOpenConnectOrganizer(
      { ...value, labelSlotEnabled: false },
      { getLockedSlot: async () => locked },
    )
    const shape = await buildOpenGridOpenConnectOrganizer(value, {
      getLockedSlot: async () => locked,
    })
    const slot = openGridLabelSlotLayoutFor(
      openGridOpenConnectOrganizerLayoutFor(value),
      value.labelGridUnits,
    )
    const obstruction = makeBox(
      [
        -1,
        slot.frontY - OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
        slot.cardBottom + 2,
      ],
      [1, slot.frontY + 0.1, slot.cardBottom + 4],
    )
    const blocked = shape.fuse(obstruction)
    try {
      const inspect = (candidate: Shape3D) =>
        inspectOpenGridOpenConnectOrganizerShapeQuality(
          candidate,
          value,
          meshBRep(candidate, { tolerance: 0.05, angularTolerance: 0.1 }),
          locked,
        )
      {
        const rep = await inspect(plain)
        console.log('DBG plain failures:', JSON.stringify(rep.failures))
        console.log('DBG plain bounds:', JSON.stringify(rep.bounds))
        console.log(
          'DBG expected:',
          JSON.stringify(boundsForOpenGridOpenConnectOrganizer(value)),
        )
      }
      expect((await inspect(plain)).failures).toContain('label-slot-material')
      expect((await inspect(blocked)).failures).toContain('label-slot-seat')
    } finally {
      blocked.delete()
      obstruction.delete()
      shape.delete()
      plain.delete()
      locked.delete()
    }
  })
})
