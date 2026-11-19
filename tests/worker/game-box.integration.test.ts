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

/** The empty span of the front wall around a row position. */
type OpeningSpan = {
  /** The left edge of the opening. */
  start: number
  /** The right edge of the opening. */
  end: number
  /** The middle of the opening. */
  center: number
  /** The width of the opening. */
  width: number
}

/** A volume that is noise, not material (mm³). */
const MATERIAL_EPSILON = 1e-9

/**
 * The empty span of the front wall around a row position: the opening that
 * covers it, measured from the material edges around it.
 *
 * The edges are read from the material inside a probe that reaches into the
 * wall, so the span is the real width of the opening and not the width of a
 * probe placed around it. A probe that is empty up to its face touches the
 * material first on the side it is scanned towards, so the material it
 * carries gives the exact edge.
 */
function openingSpan(
  holder: Shape3D,
  x: number,
  wallY: readonly [number, number],
  zStart: number,
  zEnd: number,
  limit: number,
): OpeningSpan {
  const [yStart, yEnd] = wallY
  const depth = yEnd - yStart
  const height = zEnd - zStart
  const width = 2
  const step = 1
  /** The material edge of the wall on one side of the opening. */
  const edge = (direction: 1 | -1): number => {
    for (let distance = step; distance <= limit; distance += step) {
      const center = x + direction * distance
      const probe = makeBox(
        [center - width / 2, yStart, zStart],
        [center + width / 2, yEnd, zEnd],
      ) as Shape3D
      const volume = volumeOf(holder, probe)
      probe.delete()
      if (volume <= MATERIAL_EPSILON) continue
      // The probe reaches the material: the edge lies inside the probe and
      // the material it carries gives the exact edge.
      const material = volume / (depth * height)
      return direction === 1
        ? center + width / 2 - material
        : center - width / 2 + material
    }
    // No material on this side: the opening reaches the end of the holder.
    return x + direction * limit
  }
  const start = edge(-1)
  const end = edge(1)
  return { start, end, center: (start + end) / 2, width: end - start }
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

  it('fills the riser below the well and the full bed face', () => {
    const cases = [
      { name: 'default', options },
      {
        name: 'tall riser',
        options: { ...options, cardHeight: 150, diceCount: 3 },
      },
      {
        name: 'short riser',
        options: { ...options, cardHeight: 60, diceSize: 18, diceCount: 9 },
      },
    ]

    for (const scenario of cases) {
      const frame = gameBoxDiceHolderFrame(scenario.options)
      const holder = buildGameBoxDiceHolder(scenario.options)
      const probes = [
        {
          name: 'below the well',
          probe: makeBox(
            [-frame.wellWidth / 2, frame.frontWall, 0],
            [
              frame.wellWidth / 2,
              frame.thickness - frame.frontWall,
              frame.wellFloorZ,
            ],
          ) as Shape3D,
        },
        {
          name: 'the bed face',
          probe: makeBox(
            [-frame.bodyWidth / 2, 0, 0],
            [frame.bodyWidth / 2, frame.thickness, 0.2],
          ) as Shape3D,
        },
      ]

      try {
        for (const region of probes) {
          expect(
            volumeOf(holder, region.probe),
            `${scenario.name}: ${region.name}`,
          ).toBeCloseTo(measureVolume(region.probe), 2)
        }
      } finally {
        for (const region of probes) region.probe.delete()
        holder.delete()
      }
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

  it('pins the grip strip dimensions confirmed by the test print', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const strip = gameBoxGripStripFrame(frame)
    // The dimensions the 2026-11-19 test print confirmed (design decision 5).
    expect(strip.zEnd - strip.zStart).toBeCloseTo(60, 6) // length along the height
    expect(strip.yEnd - strip.yStart).toBeCloseTo(1.2, 6) // width along the thickness
    expect(strip.relief).toBe(0.6) // depth of the relief pocket
    // A holder shorter than the strip loses both end margins: the strip
    // length is capped at the height minus 2 × 4 mm.
    const shortFrame = gameBoxDiceHolderFrame({
      ...options,
      cardHeight: 60,
      diceSize: 18,
      diceCount: 9,
    })
    const shortStrip = gameBoxGripStripFrame(shortFrame)
    expect(shortStrip.zEnd - shortStrip.zStart).toBeCloseTo(52, 6)
    // The sheet thickness is measured on the built solid: within the
    // relieved band the strip is the only material between the pocket
    // floor and the outer face, and its horizontal span equals the sheet
    // thickness at every height, so the material in the probe divided by
    // the probe's y × z face gives the thickness.
    const holder = buildGameBoxDiceHolder(options)
    try {
      const probeHeight = 2
      const probeWidth = 0.2
      const yMid = (strip.yStart + strip.yEnd) / 2
      const probe = makeBox(
        [
          frame.bodyWidth / 2 - strip.relief,
          yMid - probeWidth / 2,
          frame.height / 2 - probeHeight / 2,
        ],
        [
          frame.outerWidth / 2 + 1,
          yMid + probeWidth / 2,
          frame.height / 2 + probeHeight / 2,
        ],
      ) as Shape3D
      expect(
        volumeOf(holder, probe) / (probeHeight * probeWidth),
        'grip strip thickness measured at the bow apex',
      ).toBeCloseTo(0.4, 2)
      probe.delete()
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

  it('opens the front wall in front of every row position', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const centers = gameBoxDiceCenters(options)
    // The front wall of the holder: it spans the thickness of the holder
    // between the front face and the dice well.
    const wallY: [number, number] = [0.01, frame.frontWall - 0.01]
    // The openings run from the well floor to the top of the holder, so a
    // die can be seen and pushed from the front.
    const bands: [number, number][] = [
      [frame.wellFloorZ + 0.2, frame.wellFloorZ + 1.2],
      [frame.height - 2, frame.height - 0.2],
    ]
    const holder = buildGameBoxDiceHolder(options)
    try {
      // One opening in front of every position of the first row.
      const row = centers.slice(0, frame.layout.perRow)
      expect(row).toHaveLength(frame.layout.perRow)
      for (const center of row) {
        for (const [zStart, zEnd] of bands) {
          // The opening is there: the front of the row is free.
          const opening = makeBox(
            [center.x - 0.5, wallY[0], zStart],
            [center.x + 0.5, wallY[1], zEnd],
          ) as Shape3D
          expect(
            volumeOf(holder, opening),
            `opening in front of the row at ${center.x} mm`,
          ).toBeLessThan(OVERLAP_LIMIT)
          opening.delete()
          // The opening is narrower than the die: the empty span through
          // the front wall is measured, so an opening that grows to the
          // width of the die is caught on either side of the row position.
          const span = openingSpan(
            holder,
            center.x,
            wallY,
            zStart,
            zEnd,
            3 * frame.pitch,
          )
          expect(
            span.width,
            `width of the opening in front of the row at ${center.x} mm`,
          ).toBeLessThan(options.diceSize - 0.01)
          // A die does not pass through the opening: the wall still holds
          // it, whichever side of the row position the opening reaches.
          const die = makeBox(
            [span.center - options.diceSize / 2, wallY[0], zStart],
            [span.center + options.diceSize / 2, wallY[1], zEnd],
          ) as Shape3D
          expect(
            volumeOf(holder, die),
            `wall in front of the row at ${center.x} mm`,
          ).toBeGreaterThan(OVERLAP_LIMIT)
          die.delete()
        }
      }
      // The wall between two neighbouring openings is still there.
      for (let column = 1; column < row.length; column += 1) {
        const middle = (row[column - 1]!.x + row[column]!.x) / 2
        const wall = makeBox(
          [middle - 0.5, wallY[0], bands[0]![0]],
          [middle + 0.5, wallY[1], bands[0]![1]],
        ) as Shape3D
        expect(
          volumeOf(holder, wall),
          `wall between the openings at ${middle} mm`,
        ).toBeGreaterThan(OVERLAP_LIMIT)
        wall.delete()
      }
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

  /**
   * The parts of the assembly: the box, the lid, one divider per module
   * boundary and one dice holder per dice module.
   */
  function expectedPartCount(params: GameBoxParameters): number {
    const layout = gameBoxLayout(params)
    const diceModules = layout.modules.filter(
      (module) => module.type === 'dice',
    ).length
    return 2 + layout.dividerCount + diceModules
  }

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
        expect(solids.length).toBe(expectedPartCount(params))
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
      expect(solids.length).toBe(expectedPartCount(params))
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
