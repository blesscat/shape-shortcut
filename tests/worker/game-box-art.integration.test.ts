// The game-box divider cards and cover: per-divider art, error wrapping and
// the two-color 3MF parts, built through the game-box builder itself.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import {
  cast,
  getOC,
  makeBox,
  measureVolume,
  type Shape3D as ReplicadShape,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { buildGameBox } from '../../src/cad-kernel/components/game-box/builder'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import { countSolids } from '../../src/cad-kernel/shape-query/solids'
import {
  exportThreeMfBytes,
  isThreeMfPackage,
  threeMfExpectationFor,
  threeMfMetaFor,
} from '../../src/cad-kernel/export'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxDividerTabCenterX,
  cardBoxDividerWidth,
  cardBoxInteriorWidth,
  GAME_BOX_CONFIGURATION,
  gameBoxLayout,
  gameBoxThreeMfFileName,
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

/** The solids of a (possibly compound) shape. */
function explorerSolidsOf(shape: ReplicadShape): ReplicadShape[] {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  const solids: ReplicadShape[] = []
  try {
    while (explorer.More()) {
      solids.push(cast(explorer.Current()) as ReplicadShape)
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  return solids
}

/** Intersection volume of two shapes (mm³). */
function intersectionVolume(
  shape: ReplicadShape,
  other: ReplicadShape,
): number {
  const overlap = shape.intersect(other)
  try {
    return measureVolume(overlap)
  } finally {
    overlap.delete()
  }
}

function makeBoxForSlice(
  corner1: [number, number, number],
  corner2: [number, number, number],
): ReplicadShape {
  return makeBox(corner1, corner2) as ReplicadShape
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

const TWO_CARDS = [{ type: 'cards' }, { type: 'cards' }] as const

describe('game-box divider card art', () => {
  it('builds a raised labelled divider with a separate proud accent', async () => {
    const build = await buildGameBox(
      parameters(TWO_CARDS, { part: 'divider1', divider1Text: 'ABC' }),
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
      parameters(TWO_CARDS, {
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
    // Two dividers need three card modules: every pair of neighbours
    // carries one labelled plate.
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
        parameters(TWO_CARDS, {
          part: 'divider1',
          divider1Text: 'W'.repeat(20),
        }),
      ),
    ).rejects.toThrow('GAME_BOX_DIVIDER_TEXT_TOO_WIDE')
  })

  it('returns no separated parts for a blank plate', async () => {
    const build = await buildGameBox(
      parameters(TWO_CARDS, { part: 'divider1' }),
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
      { type: 'cards' },
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
    await expect(
      buildGameBox(
        parameters(TWO_CARDS, {
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
    it(`rebuilds the assembly with labels at the ${label} card size`, async () => {
      const build = await buildGameBox(
        parameters([{ type: 'cards' }, { type: 'dice' }], {
          part: 'assembly',
          cardWidth,
          cardHeight,
          // The minimum 40x60 card fits at most 6 of the default 16 mm dice.
          ...(label === 'minimum' ? { module2DiceCount: 4 } : {}),
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
        expect(layout.dividerCount).toBe(0)
      } finally {
        build.shape.delete()
      }
    })
  }
})

describe('game-box assembly zero intersection with labelled dividers', () => {
  const OVERLAP_LIMIT = 0.001
  const SIZES = [
    ['default', 70, 120],
    ['minimum', 40, 60],
    ['maximum', 100, 150],
  ] as const

  for (const dividerStyle of ['raised', 'flat'] as const) {
    for (const [label, cardWidth, cardHeight] of SIZES) {
      it(`keeps every pair apart with a ${dividerStyle} label between two card modules at the ${label} card size`, async () => {
        const params = parameters(
          [{ type: 'cards' }, { type: 'cards' }, { type: 'cards' }],
          {
            part: 'assembly',
            cardWidth,
            cardHeight,
            divider2Style: dividerStyle,
            // The middle boundary carries the labelled plate.
            divider2Text: 'BLUE',
          },
        )
        const build = await buildGameBox(params)
        const solids = explorerSolidsOf(build.shape)
        try {
          expect(solids.length).toBeGreaterThan(4)
          for (let first = 0; first < solids.length; first += 1) {
            for (let second = first + 1; second < solids.length; second += 1) {
              expect(
                intersectionVolume(solids[first]!, solids[second]!),
                `part ${first} overlaps part ${second}`,
              ).toBeLessThan(OVERLAP_LIMIT)
            }
          }
        } finally {
          for (const solid of solids) solid.delete()
          build.shape.delete()
        }
      })
    }
  }
})

describe('game-box two-color 3MF packages', () => {
  it('exports a raised labelled divider as a body/accent package', async () => {
    const params = parameters(TWO_CARDS, {
      part: 'divider1',
      divider1Text: 'TCG',
      divider1Style: 'raised',
    })
    const build = await buildGameBox(params)
    try {
      const body = build.parts?.find((part) => part.name === 'body')
      const accent = build.parts?.find((part) => part.name === 'accent')
      if (!body || !accent) throw new Error('expected body/accent parts')
      const fileName = gameBoxThreeMfFileName(params)
      expect(fileName).toMatch(/\.3mf$/)
      const meta = threeMfMetaFor('game-box', fileName!)
      const bytes = await exportThreeMfBytes(
        [
          { name: 'body', shape: body.shape },
          { name: 'accent', shape: accent.shape },
        ],
        {
          tolerance: 0.001,
          angularTolerance: 0.1,
          modelName: 'game-box',
          sourceFile: fileName!,
        },
        meta,
      )
      expect(isThreeMfPackage(bytes, threeMfExpectationFor(meta))).toBe(true)
    } finally {
      build.shape.delete()
      for (const part of build.parts ?? []) part.shape.delete()
    }
  })

  it('exports a flat cover with art as a body/accent package', async () => {
    const params = parameters([{ type: 'cards' }], {
      part: 'cover',
      coverStyle: 'flat',
      coverSubtitle: ' collection',
    })
    const build = await buildGameBox(params)
    try {
      const body = build.parts?.find((part) => part.name === 'body')
      const accent = build.parts?.find((part) => part.name === 'accent')
      if (!body || !accent) throw new Error('expected body/accent parts')
      const fileName = gameBoxThreeMfFileName(params)
      const meta = threeMfMetaFor('game-box', fileName!)
      const bytes = await exportThreeMfBytes(
        [
          { name: 'body', shape: body.shape },
          { name: 'accent', shape: accent.shape },
        ],
        {
          tolerance: 0.001,
          angularTolerance: 0.1,
          modelName: 'game-box',
          sourceFile: fileName!,
        },
        meta,
      )
      expect(isThreeMfPackage(bytes, threeMfExpectationFor(meta))).toBe(true)
    } finally {
      build.shape.delete()
      for (const part of build.parts ?? []) part.shape.delete()
    }
  })
})

describe('game-box cover depth independence and solid count', () => {
  it('builds the same cover whatever the modules make the depth', async () => {
    const deep = await buildGameBox(
      parameters([{ type: 'cards' }], { part: 'cover' }),
    )
    const shallow = await buildGameBox(
      parameters([{ type: 'cards' }, { type: 'cards' }], { part: 'cover' }),
    )
    try {
      expect(gameBoxLayout(parameters([{ type: 'cards' }])).storageDepth).toBe(
        63,
      )
      expect(
        gameBoxLayout(parameters([{ type: 'cards' }, { type: 'cards' }]))
          .storageDepth,
      ).toBe(96)
      expect(measureVolume(deep.shape)).toBeCloseTo(
        measureVolume(shallow.shape),
        6,
      )
      const deepBounds = shapeBounds(deep.shape)
      const shallowBounds = shapeBounds(shallow.shape)
      for (let axis = 0; axis < 3; axis += 1) {
        expect(deepBounds[0]![axis]).toBeCloseTo(shallowBounds[0]![axis]!, 6)
        expect(deepBounds[1]![axis]).toBeCloseTo(shallowBounds[1]![axis]!, 6)
      }
    } finally {
      deep.shape.delete()
      shallow.shape.delete()
      for (const build of [deep, shallow])
        for (const part of build.parts ?? []) part.shape.delete()
    }
  })

  it('builds an artless cover as a single solid on the bed', async () => {
    const build = await buildGameBox(
      parameters([{ type: 'cards' }], {
        part: 'cover',
        coverTitle: '',
        coverSubtitle: '',
        usesCoverSvg: false,
      }),
    )
    try {
      expect(build.parts).toBeUndefined()
      expect(countSolids(build.shape)).toBe(1)
      // A hair below zero is binary noise; the part lies on the bed.
      expect(shapeBounds(build.shape)[0]![2]!).toBeGreaterThanOrEqual(-0.001)
    } finally {
      build.shape.delete()
    }
  })
})
describe('game-box assembly divider ordinals', () => {
  it('gives every plate its own divider fields in boundary order', async () => {
    // Three card modules make two plates; each divider carries a different
    // tab so the plates are tellable apart by their tab centres alone.
    const params = parameters(
      [{ type: 'cards' }, { type: 'cards' }, { type: 'cards' }],
      {
        part: 'assembly',
        divider1TabPosition: 'left',
        divider2TabPosition: 'center',
      },
    )
    const build = await buildGameBox(params)
    const solids = explorerSolidsOf(build.shape)
    const c = CARD_BOX_CONFIGURATION
    try {
      // The plates: 0.85 mm deep in Y and taller than the card (the tab
      // rises above the body); the cover plate is thinner and shorter.
      const plateBounds = new Map<ReplicadShape, number[][]>()
      const plates = solids
        .filter((solid) => {
          const bounds = shapeBounds(solid)
          const matches =
            bounds[1]![1]! - bounds[0]![1]! < 1 &&
            bounds[1]![2]! - bounds[0]![2]! >
              GAME_BOX_CONFIGURATION.defaults.cardHeight + 1
          if (matches) plateBounds.set(solid, bounds)
          return matches
        })
        .sort(
          (first, second) =>
            plateBounds.get(first)![0]![1]! - plateBounds.get(second)![0]![1]!,
        )
      expect(plates).toHaveLength(2)

      // The tab centre of a plate: slice it at the tab height and measure
      // the x centre of the band that remains.
      const tabCentre = (plate: ReplicadShape): number => {
        const bounds = shapeBounds(plate)
        const z = bounds[1]![2]! - c.dividerTabHeight / 2
        const slice = plate.intersect(
          makeBoxForSlice(
            [-200, bounds[0]![1]! - 0.01, z - 0.1],
            [200, bounds[1]![1]! + 0.01, z + 0.1],
          ),
        )
        try {
          const sliceBounds = shapeBounds(slice)
          return (sliceBounds[0]![0]! + sliceBounds[1]![0]!) / 2
        } finally {
          slice.delete()
        }
      }

      const width = cardBoxDividerWidth(params.cardWidth)
      const expected = [
        cardBoxDividerTabCenterX('left', width),
        cardBoxDividerTabCenterX('center', width),
      ]
      for (const [index, plate] of plates.entries()) {
        expect(tabCentre(plate), `plate ${index + 1} tab`).toBeCloseTo(
          expected[index]!,
          0,
        )
      }
    } finally {
      for (const solid of solids) solid.delete()
      build.shape.delete()
    }
  })
})
