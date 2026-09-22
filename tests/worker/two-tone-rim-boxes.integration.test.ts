import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import {
  externalOpenGridStackableBoxHeightFor,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_DIVIDER_CONFIGURATION,
} from '../../src/cad-contract/units'
import { buildOpenGridStackableBoxWithParts } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { buildOpenGridOrganizerBoxWithParts } from '../../src/cad-kernel/components/opengrid-organizer-box/builder'
import { buildOpenGridDividerWithParts } from '../../src/cad-kernel/components/opengrid-divider/builder'
import { buildOpenGridOpenConnectOrganizerWithParts } from '../../src/cad-kernel/components/opengrid-openconnect-organizer/builder'
import {
  importOpenGridOpenConnectShelfLockedSlot,
  openGridOpenConnectShelfLockedSlotAssetUrl,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot'

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
  lockedSlot = await importOpenGridOpenConnectShelfLockedSlot(
    new Blob([
      readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
    ]),
  )
})

let lockedSlot: Shape3D

function deleteShape(shape: { delete: () => void } | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not hide the primary geometry assertion.
  }
}

function deleteParts(build: { shape: Shape3D; parts?: unknown[] }): void {
  const parts = build.parts as { name: string; shape: Shape3D }[] | undefined
  if (parts) {
    for (const part of parts) deleteShape(part.shape)
  }
  deleteShape(build.shape)
}

function zBoundsOf(shape: Shape3D): [number, number] {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    return [min[2], max[2]]
  } finally {
    boundingBox.delete()
  }
}

function expectComplementaryParts(
  build: { shape: Shape3D; parts?: { name: string; shape: Shape3D }[] },
  expectedSplitZ: number,
  expectedTopZ: number,
): void {
  expect(build.parts).toBeDefined()
  expect(build.parts).toHaveLength(2)
  expect(build.parts![0]?.name).toBe('body')
  expect(build.parts![1]?.name).toBe('rim')

  const body = build.parts![0]!.shape
  const rim = build.parts![1]!.shape
  const bodyVolume = measureVolume(body)
  const rimVolume = measureVolume(rim)
  expect(bodyVolume).toBeGreaterThan(0)
  expect(rimVolume).toBeGreaterThan(0)
  expect(bodyVolume + rimVolume).toBeCloseTo(measureVolume(build.shape), -1)

  const [bodyMinZ, bodyMaxZ] = zBoundsOf(body)
  const [rimMinZ, rimMaxZ] = zBoundsOf(rim)
  expect(bodyMaxZ).toBeCloseTo(expectedSplitZ, 1)
  expect(rimMinZ).toBeCloseTo(expectedSplitZ, 1)
  expect(rimMaxZ).toBeCloseTo(expectedTopZ, 1)
  expect(bodyMinZ).toBeLessThan(expectedSplitZ)
}

describe('two-tone rim multipart builds', () => {
  it('partitions the stackable box into complementary body and rim parts', async () => {
    const topRimHeight = 3
    const build = await buildOpenGridStackableBoxWithParts({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      cornerSeatMode: 'none',
      topRimEnabled: true,
      topRimHeight,
    })
    try {
      const externalTop = externalOpenGridStackableBoxHeightFor({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        cornerSeatMode: 'none',
        topRimEnabled: true,
        topRimHeight,
      })
      expectComplementaryParts(build, externalTop - topRimHeight, externalTop)
    } finally {
      deleteParts(build)
    }
  }, 240_000)

  it('keeps the stackable box single-part when the rim is disabled', async () => {
    const build = await buildOpenGridStackableBoxWithParts({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      cornerSeatMode: 'none',
      topRimEnabled: false,
    })
    try {
      expect(build.parts).toBeUndefined()
      expect(build.qualityShape).toBeUndefined()
    } finally {
      deleteParts(build)
    }
  }, 240_000)

  it('partitions the organizer box into complementary body and rim parts', async () => {
    const topRimHeight = 3
    const build = buildOpenGridOrganizerBoxWithParts({
      ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
      cornerSeatMode: 'none',
      topRimEnabled: true,
      topRimHeight,
    })
    try {
      const bodyHeight =
        OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeDepth +
        OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.bottomThickness +
        2
      expectComplementaryParts(build, bodyHeight - topRimHeight, bodyHeight)
    } finally {
      deleteParts(build)
    }
  }, 240_000)

  it('partitions the divider into complementary body and rim parts', async () => {
    const topRimHeight = 4
    const height = 40
    const build = await buildOpenGridDividerWithParts({
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      height,
      topRimEnabled: true,
      topRimHeight,
    })
    try {
      expectComplementaryParts(build, height - topRimHeight, height)
    } finally {
      deleteParts(build)
    }
  }, 240_000)

  it('partitions the OpenConnect organizer parallel to the print face', async () => {
    const topRimHeight = 3
    const build = await buildOpenGridOpenConnectOrganizerWithParts(
      {
        ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
        topRimEnabled: true,
        topRimHeight,
      },
      { getLockedSlot: async () => lockedSlot },
    )
    try {
      const bodyThickness =
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeDepth +
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.bottomThickness
      expectComplementaryParts(
        build,
        bodyThickness - topRimHeight,
        bodyThickness,
      )
    } finally {
      deleteParts(build)
    }
  }, 240_000)

  it('keeps the OpenConnect organizer single-part when the rim is disabled', async () => {
    const build = await buildOpenGridOpenConnectOrganizerWithParts(
      {
        ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
        topRimEnabled: false,
      },
      { getLockedSlot: async () => lockedSlot },
    )
    try {
      expect(build.parts).toBeUndefined()
    } finally {
      deleteParts(build)
    }
  }, 240_000)

  it('loads the locked slot asset used by the OpenConnect organizer build', async () => {
    expect(measureVolume(lockedSlot)).toBeGreaterThan(0)
  }, 120_000)
})

describe('two-tone rim partitioning across intersecting features', () => {
  it('keeps the divider honeycomb frame valid across the rim split', async () => {
    const topRimHeight = 4
    const height = 40
    const build = await buildOpenGridDividerWithParts({
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      height,
      honeycombMode: true,
      topRimEnabled: true,
      topRimHeight,
    })
    try {
      expectComplementaryParts(build, height - topRimHeight, height)
    } finally {
      deleteParts(build)
    }
  }, 240_000)

  it('preserves a side opening crossing the stackable box split plane', async () => {
    const topRimHeight = 3
    const build = await buildOpenGridStackableBoxWithParts({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      cornerSeatMode: 'none',
      topRimEnabled: true,
      topRimHeight,
      openingPlusXDepth: 10,
      openingPlusXBottomLength: 5,
      openingPlusXAngle: 90,
    })
    try {
      const externalTop = externalOpenGridStackableBoxHeightFor({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        cornerSeatMode: 'none',
        topRimEnabled: true,
        topRimHeight,
        openingPlusXDepth: 10,
      })
      expectComplementaryParts(build, externalTop - topRimHeight, externalTop)
    } finally {
      deleteParts(build)
    }
  }, 240_000)

  it('leaves the stackable box host geometry identical with and without the rim', async () => {
    const base = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      cornerSeatMode: 'none' as const,
    }
    const withoutRim = await buildOpenGridStackableBoxWithParts({
      ...base,
      topRimEnabled: false,
    })
    const withRim = await buildOpenGridStackableBoxWithParts({
      ...base,
      topRimEnabled: true,
      topRimHeight: 3,
    })
    try {
      const hostVolume = measureVolume(withoutRim.shape)
      expect(measureVolume(withRim.shape)).toBeCloseTo(hostVolume, -1)
      expect(withoutRim.parts).toBeUndefined()
    } finally {
      deleteParts(withoutRim)
      deleteParts(withRim)
    }
  }, 240_000)
})
