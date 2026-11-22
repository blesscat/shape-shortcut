// The game-box blank divider card stays bit-for-bit the text-free card-box
// divider, at every boundary and every tab position.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, type Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { deleteShape } from '../../src/cad-kernel/lifetime/dispose'
import { buildGameBox } from '../../src/cad-kernel/components/game-box/builder'
import { buildCardBoxDivider } from '../../src/cad-kernel/components/card-box/divider'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import { countSolids } from '../../src/cad-kernel/shape-query/solids'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxDividerWidth,
  cardBoxInteriorWidth,
  GAME_BOX_CONFIGURATION,
  type GameBoxParameters,
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

const { cardHeight, cardWidth } = GAME_BOX_CONFIGURATION.defaults
const TAB_HEIGHT = CARD_BOX_CONFIGURATION.dividerTabHeight
const PLATE_WIDTH = cardBoxDividerWidth(cardWidth)

function parameters(
  modules: readonly ('cards' | 'dice')[],
  overrides: Partial<GameBoxParameters> = {},
): GameBoxParameters {
  const values: Record<string, unknown> = {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
  }
  modules.forEach((type, position) => {
    values[`module${position + 1}Type`] = type
  })
  return { ...values, ...overrides } as GameBoxParameters
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

/** Highest plate point inside a thin vertical strip centered on `x`. */
function plateTopAt(plate: Shape3D, x: number): number {
  const strip = makeBox([x - 0.25, -1, -1], [x + 0.25, 300, 3]) as Shape3D
  const slice = plate.intersect(strip)
  try {
    return boundsOf(slice)[1]![1]!
  } finally {
    dispose(slice, strip)
  }
}

function dispose(...shapes: Shape3D[]): void {
  for (const shape of shapes) deleteShape(shape)
}

async function buildBlankDivider(
  part: 'divider1' | 'divider2',
): Promise<Shape3D> {
  const build = await buildGameBox(
    parameters(['cards', 'dice', 'cards'], { part }),
  )
  if (build.parts !== undefined) throw new Error('expected a plain divider')
  return build.shape
}

describe('game-box blank divider reference geometry', () => {
  it.each(['divider1', 'divider2'] as const)(
    'matches the reference plate at %s: 70.85 × 125 × 0.85 and 7347.9 mm³',
    async (part) => {
      const plate = await buildBlankDivider(part)
      try {
        const [[minX, minY, minZ], [maxX, maxY, maxZ]] = boundsOf(plate)
        expect(maxX! - minX!).toBeCloseTo(70.85, 1)
        expect(maxY! - minY!).toBeCloseTo(125, 1)
        expect(maxZ! - minZ!).toBeCloseTo(0.85, 1)
        expect(Math.abs((maxX! + minX!) / 2)).toBeLessThan(0.05)
        expect(minY).toBeCloseTo(0, 2)
        expect(Math.abs(measureVolume(plate) - 7347.9) / 7347.9).toBeLessThan(
          0.005,
        )
        expect(countSolids(plate)).toBe(1)
      } finally {
        deleteShape(plate)
      }
    },
  )

  it('is exactly the text-free card-box divider with the default tab', async () => {
    const gameBoxPlate = await buildBlankDivider('divider1')
    const cardBoxBuild = await buildCardBoxDivider({
      ...CARD_BOX_CONFIGURATION.defaultParameters,
      dividerText: '',
    })
    try {
      if (cardBoxBuild.kind !== 'single') {
        throw new Error('expected the plain card-box divider')
      }
      const extra = gameBoxPlate.cut(cardBoxBuild.shape)
      const missing = cardBoxBuild.shape.cut(gameBoxPlate)
      try {
        expect(measureVolume(extra)).toBeLessThanOrEqual(0.001)
        expect(measureVolume(missing)).toBeLessThanOrEqual(0.001)
      } finally {
        dispose(extra, missing)
      }
    } finally {
      deleteShape(gameBoxPlate)
      if (cardBoxBuild.kind === 'single') {
        deleteShape(cardBoxBuild.shape)
      } else {
        deleteShape(cardBoxBuild.body)
        deleteShape(cardBoxBuild.accent)
      }
    }
  })

  it.each(['center', 'right'] as const)(
    'rises to H + 5 only inside the %s tab when the divider asks for it',
    async (position) => {
      const build = await buildGameBox(
        parameters(['cards', 'dice', 'cards'], {
          part: 'divider1',
          divider1TabPosition: position,
        }),
      )
      try {
        const plate = build.shape
        expect(plateTopAt(plate, position === 'center' ? 0 : 30)).toBeCloseTo(
          cardHeight + TAB_HEIGHT,
          2,
        )
        expect(
          plateTopAt(plate, position === 'center' ? -30 : -20),
        ).toBeCloseTo(cardHeight, 2)
      } finally {
        deleteShape(build.shape)
      }
    },
  )

  it('enters both side-wall slots without touching the box walls', async () => {
    const plate = await buildBlankDivider('divider1')
    try {
      const [[minX], [maxX]] = boundsOf(plate)
      const halfInterior = cardBoxInteriorWidth(cardWidth) / 2
      const slotBottom = halfInterior + CARD_BOX_CONFIGURATION.dividerSlotDepth
      expect(maxX!).toBeGreaterThan(halfInterior + 0.1)
      expect(maxX!).toBeLessThan(slotBottom)
      expect(minX!).toBeLessThan(-halfInterior - 0.1)
      expect(minX!).toBeGreaterThan(-slotBottom)
    } finally {
      deleteShape(plate)
    }
  })
})

// The text placement is shared with card-box through the reused builder; a
// single representative placement pins it for game-box.
describe('game-box divider text placement', () => {
  it('starts the left-tab text 2.25 mm from the plate edge, 0.8 mm below the tab top', async () => {
    const build = await buildGameBox(
      parameters(['cards', 'dice', 'cards'], {
        part: 'divider1',
        divider1Text: 'Special',
      }),
    )
    try {
      const accent = build.parts?.find((part) => part.name === 'accent')
      if (!accent) throw new Error('expected an accent build')
      const bounds = boundsOf(accent.shape)
      expect(bounds[0]![0]!).toBeCloseTo(-PLATE_WIDTH / 2 + 2.25, 1)
      expect(bounds[1]![1]!).toBeCloseTo(cardHeight + TAB_HEIGHT - 0.8, 1)
    } finally {
      deleteShape(build.shape)
      for (const part of build.parts ?? []) part.shape.delete()
    }
  })
})
