import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, type Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { deleteShape } from '../../src/cad-kernel/lifetime/dispose'
import { countSolids } from '../../src/cad-kernel/shape-query/solids'
import {
  buildCardBoxBox,
  buildCardBoxBoxFromGeometry,
  cardBoxDividerSlotCentres,
} from '../../src/cad-kernel/components/card-box/box'
import {
  buildCardBoxLid,
  buildCardBoxLidFromGeometry,
} from '../../src/cad-kernel/components/card-box/lid'
import {
  buildCardBoxDivider,
  buildCardBoxDividerFromGeometry,
} from '../../src/cad-kernel/components/card-box/divider'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import { type CardBoxGeometry } from '../../src/cad-kernel/components/card-box/geometry'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
} from '../../src/cad-contract/units'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require

beforeAll(async () => {
  await initialiseCadKernel(
    require.resolve('replicad-opencascadejs/src/replicad_single.wasm'),
  )
  await loadOpenGridWallCoverFont(
    readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_FONT_URL)),
  )
})

const parameters = CARD_BOX_CONFIGURATION.defaultParameters
const geometry: CardBoxGeometry = {
  cardWidth: parameters.cardWidth,
  cardHeight: parameters.cardHeight,
  storageDepth: parameters.storageDepth,
}

function boundsOf(shape: Shape3D): { min: number[]; max: number[] } {
  const bounds = shape.boundingBox
  try {
    const [min, max] = bounds.bounds as number[][]
    return { min: min!, max: max! }
  } finally {
    bounds.delete()
  }
}

function expectSameSolid(
  built: Shape3D,
  reference: Shape3D,
  label: string,
): void {
  const builtVolume = measureVolume(built)
  const referenceVolume = measureVolume(reference)
  expect(
    Math.abs(builtVolume - referenceVolume) / referenceVolume,
    `${label} volume`,
  ).toBeLessThan(1e-6)
  expect(countSolids(built), `${label} solid count`).toBe(
    countSolids(reference),
  )
  const builtBounds = boundsOf(built)
  const referenceBounds = boundsOf(reference)
  for (const axis of [0, 1, 2]) {
    expect(builtBounds.min[axis]!, `${label} bbox min[${axis}]`).toBeCloseTo(
      referenceBounds.min[axis]!,
      3,
    )
    expect(builtBounds.max[axis]!, `${label} bbox max[${axis}]`).toBeCloseTo(
      referenceBounds.max[axis]!,
      3,
    )
  }
}

/** Material volume of one side wall at a given depth position. */
function wallMaterialAt(box: Shape3D, side: 1 | -1, y: number): number {
  const probeX = cardBoxInteriorWidth(geometry.cardWidth) / 2 + 0.05
  const probe = makeBox(
    [side * probeX - 0.05, y - 0.1, 3],
    [side * probeX + 0.05, y + 0.1, 100],
  ) as Shape3D
  const intersection = box.intersect(probe)
  try {
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    deleteShape(probe)
  }
}

describe('card-box geometry builders', () => {
  it('builds the same box as the card-box parameter build with the card-box slot grid', () => {
    const fromParameters = buildCardBoxBox(parameters)
    const fromGeometry = buildCardBoxBoxFromGeometry(
      geometry,
      cardBoxDividerSlotCentres(geometry),
    )
    try {
      expectSameSolid(fromGeometry, fromParameters, 'box')
    } finally {
      deleteShape(fromParameters)
      deleteShape(fromGeometry)
    }
  })

  it('cuts the divider slots at the caller-supplied centres only', () => {
    const slotCentres = [0, 6]
    const built = buildCardBoxBoxFromGeometry(geometry, slotCentres)
    try {
      for (const side of [1, -1] as const) {
        for (const y of slotCentres) {
          expect(wallMaterialAt(built, side, y), `slot at y ${y}`).toBeLessThan(
            0.001,
          )
        }
        // The card-box grid would also cut y = 3 and y = 9.
        for (const y of [3, 9]) {
          expect(
            wallMaterialAt(built, side, y),
            `wall at y ${y}`,
          ).toBeGreaterThan(0.1)
        }
      }
    } finally {
      deleteShape(built)
    }
  })

  it('builds a box without divider slots when the caller passes no centres', () => {
    const built = buildCardBoxBoxFromGeometry(geometry, [])
    try {
      for (const side of [1, -1] as const) {
        expect(wallMaterialAt(built, side, 0)).toBeGreaterThan(0.1)
      }
    } finally {
      deleteShape(built)
    }
  })

  it('builds the same lid as the card-box parameter build', () => {
    const fromParameters = buildCardBoxLid(parameters)
    const fromGeometry = buildCardBoxLidFromGeometry(geometry)
    try {
      expectSameSolid(fromGeometry, fromParameters, 'lid')
    } finally {
      deleteShape(fromParameters)
      deleteShape(fromGeometry)
    }
  })

  it('builds the same plain divider as the text-free card-box divider', async () => {
    const build = await buildCardBoxDivider(parameters)
    if (build.kind !== 'single') throw new Error('expected a plain divider')
    const fromGeometry = buildCardBoxDividerFromGeometry(geometry)
    try {
      expectSameSolid(fromGeometry, build.shape, 'divider')
    } finally {
      deleteShape(build.shape)
      deleteShape(fromGeometry)
    }
  })
})
