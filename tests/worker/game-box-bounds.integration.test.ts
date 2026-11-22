import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { buildGameBox } from '../../src/cad-kernel/components/game-box/builder'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import {
  boundsForGameBox,
  GAME_BOX_CONFIGURATION,
  type GameBoxModuleIndex,
  type GameBoxParameters,
} from '../../src/cad-contract/units'
import { gameBoxPreview } from '../../src/features/cad/progressive-preview/components'
import type { PreviewDescription } from '../../src/features/cad/progressive-preview/description'

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
  // The assembly divider cards go through the reused text builder, which
  // loads the shared font before it skips the blank text.
  await loadOpenGridWallCoverFont(
    readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_FONT_URL)),
  )
})

/** The bounds of the built geometry, in the authored frame. */
type Bounds = { min: [number, number, number]; max: [number, number, number] }

/** The two axes may differ by at most this much (mm). */
const TOLERANCE = 0.5

function geometryBounds(shape: Shape3D): Bounds {
  const bounds = shape.boundingBox
  try {
    const [min, max] = bounds.bounds as [number[], number[]]
    return {
      min: [min[0]!, min[1]!, min[2]!],
      max: [max[0]!, max[1]!, max[2]!],
    }
  } finally {
    bounds.delete()
  }
}

/** The bounds of the simplified preview solids, in the authored frame. */
function previewBounds(solids: PreviewDescription): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const solid of solids) {
    for (const [x, y] of solid.outline) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = solid.origin[axis] + solid.u[axis] * x + solid.v[axis] * y
        min[axis] = Math.min(min[axis], value)
        max[axis] = Math.max(max[axis], value)
      }
    }
    min[2] = Math.min(min[2], solid.origin[2])
    max[2] = Math.max(max[2], solid.origin[2] + solid.depth)
  }
  return { min, max }
}

function expectBoundsMatch(actual: Bounds, expected: Bounds): void {
  for (let axis = 0; axis < 3; axis += 1) {
    expect(Math.abs(actual.min[axis] - expected.min[axis])).toBeLessThanOrEqual(
      TOLERANCE,
    )
    expect(Math.abs(actual.max[axis] - expected.max[axis])).toBeLessThanOrEqual(
      TOLERANCE,
    )
  }
}

/**
 * The module list of the test: a card module, a dice module and two more
 * card modules, so the assembly carries a divider between the two card
 * modules and a dice holder in the dice module. The dice count is the
 * smallest one the smallest card size can hold.
 */
function moduleParameters(
  overrides: Partial<GameBoxParameters>,
): GameBoxParameters {
  const values: Record<string, unknown> = {}
  const modules: {
    type: 'cards' | 'dice'
    cardDepth: number
    diceSize: number
    diceCount: number
  }[] = [
    { type: 'cards', cardDepth: 30, diceSize: 16, diceCount: 6 },
    { type: 'dice', cardDepth: 30, diceSize: 16, diceCount: 6 },
    { type: 'cards', cardDepth: 20, diceSize: 16, diceCount: 6 },
    { type: 'cards', cardDepth: 15, diceSize: 16, diceCount: 6 },
  ]
  modules.forEach((module, position) => {
    const index = (position + 1) as GameBoxModuleIndex
    values[`module${index}Type`] = module.type
    values[`module${index}CardDepth`] = module.cardDepth
    values[`module${index}DiceSize`] = module.diceSize
    values[`module${index}DiceCount`] = module.diceCount
  })
  return {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
    ...values,
    ...overrides,
  } as GameBoxParameters
}

const CARD_SIZES = [
  { cardWidth: 70, cardHeight: 120 },
  { cardWidth: 40, cardHeight: 60 },
  { cardWidth: 100, cardHeight: 150 },
]

const PARTS = ['assembly', 'box', 'lid', 'divider1', 'module2'] as const

describe('game-box bounds', () => {
  for (const { cardWidth, cardHeight } of CARD_SIZES) {
    const size = `${cardWidth}x${cardHeight}`

    for (const part of PARTS) {
      it(`matches the built geometry for ${part} at ${size}`, async () => {
        const parameters = moduleParameters({ part, cardWidth, cardHeight })
        const build = await buildGameBox(parameters)
        try {
          expectBoundsMatch(
            geometryBounds(build.shape),
            boundsForGameBox(parameters),
          )
        } finally {
          build.shape.delete()
        }
      })

      it(`matches the built geometry with the simplified preview for ${part} at ${size}`, async () => {
        const parameters = moduleParameters({ part, cardWidth, cardHeight })
        const build = await buildGameBox(parameters)
        try {
          expectBoundsMatch(
            previewBounds(gameBoxPreview(parameters)),
            geometryBounds(build.shape),
          )
        } finally {
          build.shape.delete()
        }
      })
    }
  }
})
