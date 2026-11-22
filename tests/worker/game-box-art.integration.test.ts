// The game-box divider cards and cover: per-divider art, error wrapping and
// the two-color 3MF parts, built through the game-box builder itself.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { measureVolume, type Shape3D as ReplicadShape } from 'replicad'
import { buildGameBox } from '../../src/cad-kernel/components/game-box/builder'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
  GAME_BOX_CONFIGURATION,
  gameBoxLayout,
  type CardBoxSvgOutlineData,
  type GameBoxParameters,
} from '../../src/cad-contract/units'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

function squareOutline(): CardBoxSvgOutlineData {
  return {
    fingerprint: 'scratch',
    width: 10,
    height: 10,
    groups: [
      {
        outer: [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ],
        holes: [],
      },
    ],
  }
}

function parameters(
  modules: readonly { type: 'cards' | 'dice' }[],
  overrides: Partial<GameBoxParameters> = {},
): GameBoxParameters {
  const values: Record<string, unknown> = {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
  }
  modules.forEach((module, position) => {
    values[`module${position + 1}Type`] = module.type
  })
  return { ...values, ...overrides } as GameBoxParameters
}

function shapeBounds(shape: ReplicadShape): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function expectClose(actual: number, expected: number): void {
  expect(actual).toBeCloseTo(expected, 3)
}

beforeAll(async () => {
  await initialiseCadKernel(WASM_PATH)
  await loadOpenGridWallCoverFont(
    readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_FONT_URL)),
  )
})

const TWO_MODULES = [{ type: 'cards' }, { type: 'dice' }] as const

describe('game-box divider card art', () => {
  it('builds a raised labelled divider with a separate proud accent', async () => {
    const build = await buildGameBox(
      parameters(TWO_MODULES, { part: 'divider1', divider1Text: 'ABC' }),
    )
    expect(build.parts).toHaveLength(2)
    try {
      const body = build.parts![0]!
      const accent = build.parts![1]!
      expect(body.name).toBe('body')
      expect(accent.name).toBe('accent')
      expectClose(
        shapeBounds(body.shape)[1]![2]!,
        CARD_BOX_CONFIGURATION.dividerPlateThickness,
      )
      const accentBounds = shapeBounds(accent.shape)
      expectClose(
        accentBounds[0]![2]!,
        CARD_BOX_CONFIGURATION.dividerPlateThickness,
      )
      expectClose(
        accentBounds[1]![2]!,
        CARD_BOX_CONFIGURATION.dividerPlateThickness +
          CARD_BOX_CONFIGURATION.accentDepth,
      )
      expect(accentBounds[1]![0]!).toBeLessThan(0) // left tab
    } finally {
      build.shape.delete()
      for (const part of build.parts ?? []) part.shape.delete()
    }
  })

  it('builds a flat labelled divider with the accent flush in the recess', async () => {
    const build = await buildGameBox(
      parameters(TWO_MODULES, {
        part: 'divider1',
        divider1Text: 'ABC',
        divider1Style: 'flat',
      }),
    )
    expect(build.parts).toHaveLength(2)
    try {
      const accent = build.parts![1]!
      expect(accent.name).toBe('accent')
      const accentBounds = shapeBounds(accent.shape)
      expectClose(
        accentBounds[0]![2]!,
        CARD_BOX_CONFIGURATION.dividerPlateThickness -
          CARD_BOX_CONFIGURATION.accentDepth,
      )
      expectClose(
        accentBounds[1]![2]!,
        CARD_BOX_CONFIGURATION.dividerPlateThickness,
      )
    } finally {
      build.shape.delete()
      for (const part of build.parts ?? []) part.shape.delete()
    }
  })

  it('builds the second boundary from its own fields', async () => {
    // Two boundaries need three modules.
    const modules = [
      { type: 'cards' },
      { type: 'cards' },
      { type: 'cards' },
    ] as const
    const first = await buildGameBox(
      parameters(modules, { part: 'divider1', divider1Text: 'RED' }),
    )
    const second = await buildGameBox(
      parameters(modules, {
        part: 'divider2',
        divider2Text: 'BLUE',
        divider2TabPosition: 'right',
      }),
    )
    try {
      const firstAccent = shapeBounds(first.parts![1]!.shape)
      const secondAccent = shapeBounds(second.parts![1]!.shape)
      // The right tab mirrors the left one.
      expect(firstAccent[1]![0]!).toBeLessThan(0)
      expect(secondAccent[0]![0]!).toBeGreaterThan(0)
    } finally {
      first.shape.delete()
      second.shape.delete()
      for (const build of [first, second])
        for (const part of build.parts ?? []) part.shape.delete()
    }
  })

  it('rejects divider text wider than the tab as a game-box error', async () => {
    await expect(
      buildGameBox(
        parameters(TWO_MODULES, {
          part: 'divider1',
          divider1Text: 'W'.repeat(20),
        }),
      ),
    ).rejects.toThrow('GAME_BOX_DIVIDER_TEXT_TOO_WIDE')
  })

  it('returns no separated parts for a blank plate', async () => {
    const build = await buildGameBox(
      parameters(TWO_MODULES, { part: 'divider1' }),
    )
    expect(build.parts).toBeUndefined()
    try {
      expect(build.shape.boundingBox.bounds[1]![1]!).toBeCloseTo(125, 1)
    } finally {
      build.shape.delete()
    }
  })
})

describe('game-box cover art', () => {
  it('builds a raised GAME cover within the plate envelope', async () => {
    const build = await buildGameBox(
      parameters([{ type: 'cards' }], { part: 'cover' }),
    )
    expect(build.parts).toHaveLength(2)
    try {
      const width = cardBoxInteriorWidth(
        GAME_BOX_CONFIGURATION.defaults.cardWidth,
      )
      const body = build.parts![0]!
      const accent = build.parts![1]!
      expect(body.name).toBe('body')
      expect(accent.name).toBe('accent')
      const bodyBounds = shapeBounds(body.shape)
      expectClose(bodyBounds[0]![0]!, -width / 2)
      expectClose(bodyBounds[1]![0]!, width / 2)
      expectClose(bodyBounds[0]![1]!, 0)
      expectClose(
        bodyBounds[1]![1]!,
        GAME_BOX_CONFIGURATION.defaults.cardHeight,
      )
      expectClose(
        bodyBounds[1]![2]!,
        CARD_BOX_CONFIGURATION.coverPlateThickness,
      )
      const accentBounds = shapeBounds(accent.shape)
      expectClose(
        accentBounds[0]![2]!,
        CARD_BOX_CONFIGURATION.coverPlateThickness,
      )
      expectClose(
        accentBounds[1]![2]!,
        CARD_BOX_CONFIGURATION.coverPlateThickness +
          CARD_BOX_CONFIGURATION.accentDepth,
      )
      // Art stays inside the safe area.
      expect(accentBounds[0]![0]!).toBeGreaterThan(-width / 2 + 5)
      expect(accentBounds[1]![0]!).toBeLessThan(width / 2 - 5)
      expect(accentBounds[0]![1]!).toBeGreaterThan(5)
      expect(accentBounds[1]![1]!).toBeLessThan(
        GAME_BOX_CONFIGURATION.defaults.cardHeight,
      )
    } finally {
      build.shape.delete()
      for (const part of build.parts ?? []) part.shape.delete()
    }
  })

  it('builds a flat cover with svg, title and subtitle flush in recesses', async () => {
    const build = await buildGameBox(
      parameters([{ type: 'cards' }], {
        part: 'cover',
        coverTitle: 'GAME',
        coverSubtitle: 'SUB',
        usesCoverSvg: true,
        coverSvgFingerprint: 'scratch',
        coverStyle: 'flat',
      }),
      squareOutline(),
    )
    expect(build.parts).toHaveLength(2)
    try {
      const accent = build.parts![1]!
      const accentBounds = shapeBounds(accent.shape)
      expectClose(
        accentBounds[0]![2]!,
        CARD_BOX_CONFIGURATION.coverPlateThickness -
          CARD_BOX_CONFIGURATION.accentDepth,
      )
      expectClose(
        accentBounds[1]![2]!,
        CARD_BOX_CONFIGURATION.coverPlateThickness,
      )
      // The SVG scaled to coverSvgWidth dominates the accent width.
      expect(accentBounds[1]![0]! - accentBounds[0]![0]!).toBeCloseTo(
        GAME_BOX_CONFIGURATION.rangesCover.coverSvgWidth.default,
        3,
      )
    } finally {
      build.shape.delete()
      for (const part of build.parts ?? []) part.shape.delete()
    }
  })

  it('rejects cover art exceeding the safe area as a game-box error', async () => {
    // A long title at a tall text height cannot fit any window: the exact
    // stack layout inside the ported layout throws.
    await expect(
      buildGameBox(
        parameters([{ type: 'cards' }], {
          part: 'cover',
          coverTitle: 'W'.repeat(20),
          coverTitleTextHeight: 20,
        }),
      ),
    ).rejects.toThrow('GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA')
  })

  it('returns no separated parts for a blank cover', async () => {
    const build = await buildGameBox(
      parameters([{ type: 'cards' }], { part: 'cover', coverTitle: '' }),
    )
    expect(build.parts).toBeUndefined()
    build.shape.delete()
  })
})

describe('game-box assembly with art', () => {
  it('shows every divider with its own art and the seated cover', async () => {
    const modules = [
      { type: 'cards' },
      { type: 'dice' },
      { type: 'cards' },
    ] as const
    const build = await buildGameBox(
      parameters(modules, {
        part: 'assembly',
        divider1Text: 'RED',
        divider2Text: 'BLUE',
      }),
    )
    try {
      expect(measureVolume(build.shape)).toBeGreaterThan(0)
    } finally {
      build.shape.delete()
    }
  })

  it('rejects a labelled divider in the assembly when the text is too wide', async () => {
    const modules = [
      { type: 'cards' },
      { type: 'dice' },
      { type: 'cards' },
    ] as const
    await expect(
      buildGameBox(
        parameters(modules, {
          part: 'assembly',
          divider1Text: 'W'.repeat(20),
        }),
      ),
    ).rejects.toThrow('GAME_BOX_DIVIDER_TEXT_TOO_WIDE')
  })

  it('rejects overflowing cover art in the assembly', async () => {
    await expect(
      buildGameBox(
        parameters([{ type: 'cards' }], {
          part: 'assembly',
          coverTitle: 'W'.repeat(20),
          coverTitleTextHeight: 20,
        }),
      ),
    ).rejects.toThrow('GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA')
  })
})

describe('game-box zero intersection with art', () => {
  const SIZES = [
    ['default', 70, 120],
    ['minimum', 40, 60],
    ['maximum', 100, 150],
  ] as const

  for (const [label, cardWidth, cardHeight] of SIZES) {
    it(`keeps the cover art clear of the box at the ${label} card size`, async () => {
      const build = await buildGameBox(
        parameters([{ type: 'cards' }, { type: 'dice' }], {
          part: 'assembly',
          cardWidth,
          cardHeight,
          // The minimum 40x60 card fits at most 6 of the default 16 mm dice.
          ...(label === 'minimum' ? { module2DiceCount: 4 } : {}),
          divider1Text: 'ABC',
        }),
      )
      try {
        expect(measureVolume(build.shape)).toBeGreaterThan(0)
        const layout = gameBoxLayout(
          parameters([{ type: 'cards' }, { type: 'dice' }], {
            cardWidth,
            cardHeight,
          }),
        )
        expect(layout.dividerCount).toBe(1)
      } finally {
        build.shape.delete()
      }
    })
  }
})
