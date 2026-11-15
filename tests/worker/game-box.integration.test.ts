import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { cast, getOC, makeBox, measureVolume, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import { countSolids } from '../../src/cad-kernel/shape-query/solids'
import { buildCardBox } from '../../src/cad-kernel/components/card-box/builder'
import { buildCardBoxDivider } from '../../src/cad-kernel/components/card-box/divider'
import { cardBoxInnerFrontY } from '../../src/cad-kernel/components/card-box/box'
import { buildGameBox } from '../../src/cad-kernel/components/game-box/builder'
import {
  buildGameBoxDiceHolder,
  gameBoxDiceCenters,
  gameBoxDiceHolderFrame,
  gameBoxGripStripFrame,
} from '../../src/cad-kernel/components/game-box/dice-holder'
import { gameBoxCardBoxGeometry } from '../../src/cad-kernel/components/game-box/geometry'
import {
  CARD_BOX_CONFIGURATION,
  GAME_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
  gameBoxDiceHolderOuterWidth,
  gameBoxLayout,
  type GameBoxModuleIndex,
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

/** Largest accepted overlap volume (mm³) between two parts. */
const OVERLAP_LIMIT = 0.001

function parameters(overrides: Partial<GameBoxParameters>): GameBoxParameters {
  return {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
    ...overrides,
  } as GameBoxParameters
}

function moduleParameters(
  modules: readonly {
    type: 'cards' | 'dice'
    cardDepth?: number
    diceSize?: number
    diceCount?: number
  }[],
  overrides: Partial<GameBoxParameters> = {},
): GameBoxParameters {
  const values: Record<string, unknown> = {}
  modules.forEach((module, position) => {
    const index = (position + 1) as GameBoxModuleIndex
    values[`module${index}Type`] = module.type
    if (module.cardDepth !== undefined) {
      values[`module${index}CardDepth`] = module.cardDepth
    }
    if (module.diceSize !== undefined) {
      values[`module${index}DiceSize`] = module.diceSize
    }
    if (module.diceCount !== undefined) {
      values[`module${index}DiceCount`] = module.diceCount
    }
  })
  return parameters({ ...values, ...overrides }) as GameBoxParameters
}

function volumeOf(shape: Shape3D, other: Shape3D): number {
  const overlap = shape.intersect(other)
  try {
    return measureVolume(overlap)
  } finally {
    overlap.delete()
  }
}

type SolidBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

function boundsOf(shape: Shape3D): SolidBounds {
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

/** The solids of a compound; they belong to the compound and are not freed. */
function solidsOf(shape: Shape3D): Shape3D[] {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  const solids: Shape3D[] = []
  try {
    while (explorer.More()) {
      solids.push(cast(explorer.Current()) as Shape3D)
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  return solids
}

describe('game-box box part', () => {
  it('builds one solid on the bed', () => {
    const build = buildGameBox(
      moduleParameters(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 9 },
        ],
        { part: 'box' },
      ),
    )
    try {
      expect(countSolids(build.shape)).toBe(1)
      const bounds = boundsOf(build.shape)
      expect(bounds.min[2]!).toBeGreaterThanOrEqual(-0.01)
    } finally {
      build.shape.delete()
    }
  })

  it('cuts a slot into both side walls on every module boundary', () => {
    const params = moduleParameters([
      { type: 'cards', cardDepth: 30 },
      { type: 'dice', diceSize: 16, diceCount: 9 },
      { type: 'cards', cardDepth: 20 },
    ])
    const layout = gameBoxLayout(params)
    const geometry = gameBoxCardBoxGeometry(params)
    const frontWallY = cardBoxInnerFrontY(geometry)
    const wallX = cardBoxInteriorWidth(params.cardWidth) / 2
    const build = buildGameBox({ ...params, part: 'box' })
    try {
      for (const side of [1, -1] as const) {
        for (const distance of layout.dividerCenters) {
          const y = frontWallY + distance
          const probe = makeBox(
            [side * (wallX + 0.05), y - 0.1, 3],
            [side * (wallX + 0.2), y + 0.1, 100],
          ) as Shape3D
          expect(
            volumeOf(build.shape, probe),
            `slot at ${distance} mm on the ${side} wall`,
          ).toBeLessThan(OVERLAP_LIMIT)
          probe.delete()
        }
      }
      // Between two boundaries the side wall stays solid.
      const between = frontWallY + layout.dividerCenters[0]! + 1.5
      const probe = makeBox(
        [wallX + 0.05, between - 0.1, 3],
        [wallX + 0.2, between + 0.1, 100],
      ) as Shape3D
      expect(volumeOf(build.shape, probe)).toBeGreaterThan(0.1)
      probe.delete()
    } finally {
      build.shape.delete()
    }
  })
})

describe('game-box lid and divider against the card box', () => {
  it('builds the same lid as a card box of the same storage depth', async () => {
    const params = moduleParameters([{ type: 'cards', cardDepth: 71 }], {
      part: 'lid',
    })
    expect(gameBoxLayout(params).storageDepth).toBe(72)
    const gameBoxBuild = buildGameBox(params)
    const cardBoxBuild = await buildCardBox({
      ...CARD_BOX_CONFIGURATION.defaultParameters,
      part: 'lid',
      storageDepth: 72,
    })
    try {
      const extra = gameBoxBuild.shape.cut(cardBoxBuild.shape)
      const missing = cardBoxBuild.shape.cut(gameBoxBuild.shape)
      try {
        expect(measureVolume(extra)).toBeLessThanOrEqual(1)
        expect(measureVolume(missing)).toBeLessThanOrEqual(1)
      } finally {
        extra.delete()
        missing.delete()
      }
    } finally {
      gameBoxBuild.shape.delete()
      cardBoxBuild.shape.delete()
    }
  })

  it('builds the same divider outline as the text-free card-box divider', async () => {
    const params = moduleParameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'cards', cardDepth: 20 },
      ],
      { part: 'divider' },
    )
    const gameBoxBuild = buildGameBox(params)
    const cardBoxBuild = await buildCardBoxDivider({
      ...CARD_BOX_CONFIGURATION.defaultParameters,
      dividerText: '',
    })
    try {
      expect(cardBoxBuild.kind).toBe('single')
      if (cardBoxBuild.kind !== 'single') return
      const extra = gameBoxBuild.shape.cut(cardBoxBuild.shape)
      const missing = cardBoxBuild.shape.cut(gameBoxBuild.shape)
      try {
        expect(measureVolume(extra)).toBeLessThanOrEqual(1)
        expect(measureVolume(missing)).toBeLessThanOrEqual(1)
      } finally {
        extra.delete()
        missing.delete()
      }
    } finally {
      gameBoxBuild.shape.delete()
      if (cardBoxBuild.kind === 'single') cardBoxBuild.shape.delete()
    }
  })
})

describe('game-box dice holder', () => {
  const options = {
    cardWidth: 70,
    cardHeight: 120,
    diceSize: 16,
    diceCount: 9,
  }

  it('stands upright as one solid with the card height', () => {
    const holder = buildGameBoxDiceHolder(options)
    try {
      expect(countSolids(holder)).toBe(1)
      const bounds = boundsOf(holder)
      expect(bounds.min[2]!).toBeGreaterThanOrEqual(-0.01)
      expect(bounds.max[2]! - bounds.min[2]!).toBeCloseTo(options.cardHeight, 3)
    } finally {
      holder.delete()
    }
  })

  it('is narrower than the box interior and wider in its natural state', () => {
    const interior = cardBoxInteriorWidth(options.cardWidth)
    const holder = buildGameBoxDiceHolder(options)
    try {
      const bounds = boundsOf(holder)
      // The natural outer width (with the grip strips) exceeds the interior.
      expect(bounds.max[0]! - bounds.min[0]!).toBeGreaterThan(interior)
      expect(bounds.max[0]! - bounds.min[0]!).toBeCloseTo(
        gameBoxDiceHolderOuterWidth(options.cardWidth),
        3,
      )
      // The body itself stays clear of the box walls: no material reaches
      // the interior wall, neither beside nor above the grip strips.
      for (const side of [1, -1] as const) {
        const probe = makeBox(
          [side * (interior - 0.05), 0, 0],
          [side * interior, options.cardHeight, options.cardHeight],
        ) as Shape3D
        expect(volumeOf(holder, probe)).toBeLessThan(OVERLAP_LIMIT)
        probe.delete()
      }
    } finally {
      holder.delete()
    }
  })

  it('relieves the side wall behind the grip strips', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const strip = gameBoxGripStripFrame(frame)
    const holder = buildGameBoxDiceHolder(options)
    try {
      // Behind the strip the side wall is relieved, so the strip can press
      // in to the body width.
      expect(strip.relief).toBeGreaterThanOrEqual(0.6)
      for (const side of [1, -1] as const) {
        const probe = makeBox(
          [
            side * (frame.bodyWidth / 2 - strip.relief),
            strip.yStart + 0.05,
            strip.reliefStart,
          ],
          [
            side * (frame.bodyWidth / 2 - strip.relief + 0.05),
            strip.yEnd - 0.05,
            strip.reliefEnd,
          ],
        ) as Shape3D
        expect(volumeOf(holder, probe)).toBeLessThan(OVERLAP_LIMIT)
        probe.delete()
      }
    } finally {
      holder.delete()
    }
  })

  it('leaves the grip strip free between the walls of its relief pocket', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const strip = gameBoxGripStripFrame(frame)
    const holder = buildGameBoxDiceHolder(options)
    try {
      expect(countSolids(holder)).toBe(1)
      // The pocket is wider than the strip, so the strip does not touch its
      // walls and stays a free leaf between its two embedded ends.
      expect(strip.pocketYStart).toBeLessThan(strip.yStart)
      expect(strip.pocketYEnd).toBeGreaterThan(strip.yEnd)
      for (const side of [1, -1] as const) {
        const gaps = [
          [strip.pocketYStart, strip.yStart],
          [strip.yEnd, strip.pocketYEnd],
        ]
        for (const [gapStart, gapEnd] of gaps) {
          // The gap between the pocket wall and the side face of the strip
          // is empty over the whole relief, so the strip is not bonded to
          // the pocket and can bow in and out.
          const probe = makeBox(
            [
              side * (frame.bodyWidth / 2 - strip.relief),
              gapStart,
              strip.reliefStart,
            ],
            [side * (frame.bodyWidth / 2), gapEnd, strip.reliefEnd],
          ) as Shape3D
          expect(volumeOf(holder, probe)).toBeLessThan(OVERLAP_LIMIT)
          probe.delete()
        }
      }
    } finally {
      holder.delete()
    }
  })

  it('presses the grip strips in to the body width', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const pressed = buildGameBoxDiceHolder({
      ...options,
      outerWidth: frame.bodyWidth,
    })
    try {
      expect(countSolids(pressed)).toBe(1)
      const bounds = boundsOf(pressed)
      expect(bounds.max[0]! - bounds.min[0]!).toBeCloseTo(frame.bodyWidth, 3)
    } finally {
      pressed.delete()
    }
  })

  it('leaves room for every die in the well', () => {
    const holder = buildGameBoxDiceHolder(options)
    const centers = gameBoxDiceCenters(options)
    try {
      expect(centers).toHaveLength(options.diceCount)
      let overlap = 0
      for (const center of centers) {
        const half = options.diceSize / 2
        const die = makeBox(
          [center.x - half, center.y - half, center.z - half],
          [center.x + half, center.y + half, center.z + half],
        ) as Shape3D
        overlap += volumeOf(holder, die)
        die.delete()
      }
      expect(overlap).toBeLessThan(OVERLAP_LIMIT)
    } finally {
      holder.delete()
    }
  })
})

describe('game-box assembly', () => {
  const SIZES = [
    ['default', 70, 120],
    ['minimum', 40, 60],
    ['maximum', 100, 150],
  ] as const

  for (const [label, cardWidth, cardHeight] of SIZES) {
    it(`keeps the parts apart at the ${label} card size`, () => {
      const params = moduleParameters(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 4 },
          { type: 'cards', cardDepth: 20 },
        ],
        { part: 'assembly', cardWidth, cardHeight },
      )
      const build = buildGameBox(params)
      try {
        const solids = solidsOf(build.shape)
        expect(solids.length).toBeGreaterThanOrEqual(5)
        for (let first = 0; first < solids.length; first += 1) {
          for (let second = first + 1; second < solids.length; second += 1) {
            expect(
              volumeOf(solids[first]!, solids[second]!),
              `part ${first} overlaps part ${second}`,
            ).toBeLessThan(OVERLAP_LIMIT)
          }
        }
      } finally {
        build.shape.delete()
      }
    })

    it(`seats the dice holder between its dividers at the ${label} card size`, () => {
      const params = moduleParameters(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 4 },
          { type: 'cards', cardDepth: 20 },
        ],
        { part: 'assembly', cardWidth, cardHeight },
      )
      const build = buildGameBox(params)
      try {
        const solids = solidsOf(build.shape)
        const holders = solids.filter((solid) => {
          const bounds = boundsOf(solid)
          return (
            bounds.max[0]! - bounds.min[0]! <
            cardBoxInteriorWidth(cardWidth) - 0.1
          )
        })
        expect(holders).toHaveLength(1)
        const holder = holders[0]!
        const holderBounds = boundsOf(holder)
        const dividers = solids
          .filter((solid) => {
            const bounds = boundsOf(solid)
            return bounds.max[1]! - bounds.min[1]! < 1
          })
          .map((solid) => {
            const bounds = boundsOf(solid)
            return (bounds.min[1]! + bounds.max[1]!) / 2
          })
          .sort((a, b) => a - b)
        expect(dividers).toHaveLength(2)
        // The holder sits between the two dividers, clear of both plates.
        const halfPlate = CARD_BOX_CONFIGURATION.dividerPlateThickness / 2
        expect(holderBounds.min[1]!).toBeGreaterThan(dividers[0]! + halfPlate)
        expect(holderBounds.max[1]!).toBeLessThan(dividers[1]! - halfPlate)
      } finally {
        build.shape.delete()
      }
    })
  }

  it('seats a first module holder between the front wall and the divider', () => {
    const params = moduleParameters(
      [
        { type: 'dice', diceSize: 16, diceCount: 4 },
        { type: 'cards', cardDepth: 20 },
      ],
      { part: 'assembly' },
    )
    const build = buildGameBox(params)
    try {
      const solids = solidsOf(build.shape)
      const holders = solids.filter((solid) => {
        const bounds = boundsOf(solid)
        return (
          bounds.max[0]! - bounds.min[0]! <
          cardBoxInteriorWidth(params.cardWidth) - 0.1
        )
      })
      expect(holders).toHaveLength(1)
      const holderBounds = boundsOf(holders[0]!)
      const layout = gameBoxLayout(params)
      const frontWallY = cardBoxInnerFrontY(gameBoxCardBoxGeometry(params))
      const halfPlate = CARD_BOX_CONFIGURATION.dividerPlateThickness / 2
      // The holder fills the module in front of the only divider.
      expect(holderBounds.min[1]!).toBeGreaterThan(frontWallY)
      expect(holderBounds.max[1]!).toBeLessThan(
        frontWallY + layout.dividerCenters[0]! - halfPlate,
      )
    } finally {
      build.shape.delete()
    }
  })
})
