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
  gameBoxDiceHolderTenonCenters,
} from '../../src/cad-kernel/components/game-box/dice-holder'
import { gameBoxCardBoxGeometry } from '../../src/cad-kernel/components/game-box/geometry'
import {
  CARD_BOX_CONFIGURATION,
  GAME_BOX_CONFIGURATION,
  cardBoxDividerWidth,
  cardBoxInteriorWidth,
  gameBoxDiceHolderThickness,
  gameBoxDiceHolderWidth,
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

/** The two ends of a span, in the order a box needs them. */
function span(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a]
}

/**
 * The solids of a horizontal slice of the holder. The front wall carries a
 * vertical opening in front of every row position, so a slice through the
 * dice well falls into several solids; a slice of the riser is one.
 */
function sliceSolidCount(holder: Shape3D, z: number): number {
  const slab = makeBox(
    [-1000, -1000, z - 0.02],
    [1000, 1000, z + 0.02],
  ) as Shape3D
  const slice = holder.intersect(slab)
  try {
    return countSolids(slice)
  } finally {
    slice.delete()
    slab.delete()
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

/**
 * The y band of one tenon of a holder, measured on the solid: the tenons
 * are the only material outside the holder body.
 */
function tenonBand(
  holder: Shape3D,
  bodyHalfWidth: number,
  tenonOuterHalfWidth: number,
  centre: number,
  height: number,
): { start: number; end: number } {
  const probe = makeBox(
    [bodyHalfWidth + 0.01, centre - 1.5, 0],
    [tenonOuterHalfWidth - 0.01, centre + 1.5, height],
  ) as Shape3D
  const cut = holder.intersect(probe)
  try {
    const bounds = boundsOf(cut)
    return { start: bounds.min[1]!, end: bounds.max[1]! }
  } finally {
    cut.delete()
    probe.delete()
  }
}

/**
 * The open bands of the wall at the depth of the slot: the ranges where the
 * wall carries no material. The band is measured on the built box, so the
 * slot is where the wall is really open and not where it is supposed to be.
 */
function openBandsOfWall(
  box: Shape3D,
  side: 1 | -1,
  wallX: number,
  centre: number,
  cardHeight: number,
): { start: number; end: number }[] {
  const reach = 1.4
  const near = side * (wallX + 0.01)
  const far = side * (wallX + 0.24)
  const probe = makeBox(
    [Math.min(near, far), centre - reach, 3],
    [Math.max(near, far), centre + reach, cardHeight],
  ) as Shape3D
  const cut = box.intersect(probe)
  try {
    const pieces = solidsOf(cut)
      .map((solid) => boundsOf(solid))
      .sort((first, second) => first.min[1]! - second.min[1]!)
    const bands: { start: number; end: number }[] = []
    let cursor = centre - reach
    for (const piece of pieces) {
      if (piece.min[1]! > cursor + 1e-6) {
        bands.push({ start: cursor, end: piece.min[1]! })
      }
      cursor = Math.max(cursor, piece.max[1]!)
    }
    if (cursor < centre + reach - 1e-6) {
      bands.push({ start: cursor, end: centre + reach })
    }
    return bands
  } finally {
    cut.delete()
    probe.delete()
  }
}

/**
 * The parts of the assembly: the box, the lid, one divider per pair of
 * card modules, one dice holder per dice module and the seated cover. The
 * cover contributes the solids its own build produces (the plate plus one
 * solid per raised glyph of the GAME title).
 */
async function expectedPartCount(params: GameBoxParameters): Promise<number> {
  const layout = gameBoxLayout(params)
  const diceModules = layout.modules.filter(
    (module) => module.type === 'dice',
  ).length
  const coverBuild = await buildGameBox({ ...params, part: 'cover' })
  const coverSolids = solidsOf(coverBuild.shape).length
  for (const solid of solidsOf(coverBuild.shape)) solid.delete()
  coverBuild.shape.delete()
  return 2 + layout.dividerCount + diceModules + coverSolids
}

/**
 * The holder solids of an assembly: they are as wide as a divider plate
 * and much deeper than one.
 */
function holderSolids(
  solids: readonly Shape3D[],
  cardWidth: number,
): Shape3D[] {
  const interior = cardBoxInteriorWidth(cardWidth)
  return solids.filter((solid) => {
    const bounds = boundsOf(solid)
    const width = bounds.max[0]! - bounds.min[0]!
    return width < interior + 1 && bounds.max[1]! - bounds.min[1]! > 1
  })
}

describe('game-box box part', () => {
  it('builds one solid on the bed', async () => {
    const build = await buildGameBox(
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

  it('cuts a slot every 3 mm into both side walls', async () => {
    const params = moduleParameters([
      { type: 'cards', cardDepth: 30 },
      { type: 'dice', diceSize: 16, diceCount: 9 },
      { type: 'cards', cardDepth: 20 },
    ])
    const layout = gameBoxLayout(params)
    const geometry = gameBoxCardBoxGeometry(params)
    const frontWallY = cardBoxInnerFrontY(geometry)
    const wallX = cardBoxInteriorWidth(params.cardWidth) / 2
    const build = await buildGameBox({ ...params, part: 'box' })
    try {
      expect(layout.slotCenters).toHaveLength(layout.storageDepth / 3 - 1)
      for (const side of [1, -1] as const) {
        for (const distance of layout.slotCenters) {
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
      // Between two slots the side wall stays solid.
      const between = frontWallY + layout.slotCenters[0]! + 1.5
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

  it('keeps the first and the last slot 3 mm clear of the box ends', async () => {
    const params = moduleParameters([{ type: 'cards', cardDepth: 60 }])
    const layout = gameBoxLayout(params)
    const geometry = gameBoxCardBoxGeometry(params)
    const frontWallY = cardBoxInnerFrontY(geometry)
    const wallX = cardBoxInteriorWidth(params.cardWidth) / 2
    const build = await buildGameBox({ ...params, part: 'box' })
    try {
      // The front wall face and the back wall face carry no slot.
      for (const distance of [0, layout.storageDepth]) {
        const y = frontWallY + distance
        const probe = makeBox(
          [wallX + 0.05, y - 0.1, 3],
          [wallX + 0.2, y + 0.1, 100],
        ) as Shape3D
        expect(
          volumeOf(build.shape, probe),
          `the wall at ${distance} mm`,
        ).toBeGreaterThan(0.1)
        probe.delete()
      }
      // The first slot is 3 mm behind the front wall face.
      const first = frontWallY + layout.slotCenters[0]!
      expect(first - frontWallY).toBeCloseTo(3, 6)
      // The last slot is 3 mm in front of the back wall face.
      const last = frontWallY + layout.slotCenters.at(-1)!
      expect(frontWallY + layout.storageDepth - last).toBeCloseTo(3, 6)
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
    const depth = gameBoxLayout(params).storageDepth
    expect(depth).toBeCloseTo(72, 6)
    const gameBoxBuild = await buildGameBox(params)
    const cardBoxBuild = await buildCardBox({
      ...CARD_BOX_CONFIGURATION.defaultParameters,
      part: 'lid',
      storageDepth: depth,
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
      { part: 'divider1' },
    )
    const gameBoxBuild = await buildGameBox(params)
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
              frame.thickness - frame.backWall,
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

  it('keeps the body narrower than the box interior and reaches out with its tenons', () => {
    const interior = cardBoxInteriorWidth(options.cardWidth)
    const frame = gameBoxDiceHolderFrame(options)
    const holder = buildGameBoxDiceHolder(options)
    try {
      const bounds = boundsOf(holder)
      // The tenons reach exactly as far out as a divider plate does.
      expect(bounds.max[0]! - bounds.min[0]!).toBeCloseTo(
        cardBoxDividerWidth(options.cardWidth),
        3,
      )
      // The body itself stays 0.3 mm clear of the interior wall on each
      // side: only the tenons reach the wall.
      expect(frame.bodyWidth).toBeCloseTo(interior - 0.6, 3)
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

  it('thickens the front wall to 1.6 mm and the back wall to 1.2 mm', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const holder = buildGameBoxDiceHolder(options)
    try {
      // The front wall carries a vertical opening in front of every row
      // position, so the wall is measured between two of them.
      const rowPosition = -frame.wellWidth / 2 + frame.pitch * 1.5
      const opening = frame.pitch / 2
      const column = rowPosition - opening / 2 - frame.pitch / 2
      const bandHeight = 0.2
      const bandWidth = 0.2
      const z = frame.wellFloorZ + 1
      const walls = [
        { name: 'the front wall', y: [0, 2], expected: 1.6 },
        {
          name: 'the back wall',
          y: [frame.thickness - 2, frame.thickness],
          expected: 1.2,
        },
      ] as const
      for (const wall of walls) {
        const probe = makeBox(
          [column - bandWidth / 2, wall.y[0], z],
          [column + bandWidth / 2, wall.y[1], z + bandHeight],
        ) as Shape3D
        expect(
          volumeOf(holder, probe) / (bandWidth * bandHeight),
          wall.name,
        ).toBeCloseTo(wall.expected, 2)
        probe.delete()
      }
      // The side wall and the floor keep their own minimum, measured on the
      // solid: the probe bands next to the well and under its floor are
      // full material.
      const wallZ = frame.wellFloorZ + 0.5
      for (const side of [1, -1] as const) {
        const probe = makeBox(
          [side * (frame.bodyWidth / 2 - 1.2), frame.frontWall + 0.5, wallZ],
          [side * (frame.bodyWidth / 2), frame.frontWall + 1, wallZ + 0.5],
        ) as Shape3D
        expect(
          volumeOf(holder, probe) / measureVolume(probe),
          `the side wall on the ${side} side`,
        ).toBeCloseTo(1, 2)
        probe.delete()
      }
      const floorProbe = makeBox(
        [
          -frame.wellWidth / 2 + 0.01,
          frame.frontWall + 0.01,
          frame.wellFloorZ - 1.2,
        ],
        [
          frame.wellWidth / 2 - 0.01,
          frame.thickness - frame.backWall - 0.01,
          frame.wellFloorZ,
        ],
      ) as Shape3D
      expect(
        volumeOf(holder, floorProbe) / measureVolume(floorProbe),
        'the floor under the well',
      ).toBeCloseTo(1, 2)
      floorProbe.delete()
    } finally {
      holder.delete()
    }
  })

  it('keeps the side wall at its 1.2 mm minimum where the row fills the width', () => {
    // 63 × 88 with five 11.5 mm dice per row: the row spans the whole
    // usable width, so the side wall is exactly the 1.2 mm minimum — the
    // size where the minimum actually binds.
    const holderOptions = {
      cardWidth: 63,
      cardHeight: 88,
      diceSize: 11.5,
      diceCount: 35,
    }
    const frame = gameBoxDiceHolderFrame(holderOptions)
    const holder = buildGameBoxDiceHolder(holderOptions)
    try {
      // Measured above the well floor, where the side wall stands beside
      // the well.
      const z = frame.wellFloorZ + 0.5
      for (const side of [1, -1] as const) {
        const wall = span(
          side * (frame.wellWidth / 2 + 0.01),
          side * (frame.bodyWidth / 2 - 0.01),
        )
        const wallProbe = makeBox(
          [wall[0], frame.frontWall + 0.5, z],
          [wall[1], frame.frontWall + 1, z + 0.5],
        ) as Shape3D
        expect(
          volumeOf(holder, wallProbe) / measureVolume(wallProbe),
          `the side wall on the ${side} side`,
        ).toBeCloseTo(1, 2)
        wallProbe.delete()
        // The well face sits exactly one minimum wall inside the body
        // face: the band just inside the well face is empty, so no
        // thinner wall (a wider row) is possible and none is built.
        const beside = span(
          side * (frame.wellWidth / 2 - 0.15),
          side * (frame.wellWidth / 2 - 0.05),
        )
        const besideProbe = makeBox(
          [beside[0], frame.frontWall + 0.5, z],
          [beside[1], frame.frontWall + 1, z + 0.5],
        ) as Shape3D
        expect(
          volumeOf(holder, besideProbe),
          `the well face on the ${side} side`,
        ).toBeLessThan(OVERLAP_LIMIT)
        besideProbe.delete()
      }
    } finally {
      holder.delete()
    }
  })

  it('keeps the floor at its 1.2 mm minimum where the rows fill the height', () => {
    // 70 × 135 with 16 mm dice: eight rows span the whole usable height,
    // so the floor under the well is exactly the 1.2 mm minimum — the
    // size where the minimum actually binds.
    const holderOptions = {
      cardWidth: 70,
      cardHeight: 135,
      diceSize: 16,
      diceCount: 32,
    }
    const frame = gameBoxDiceHolderFrame(holderOptions)
    const holder = buildGameBoxDiceHolder(holderOptions)
    try {
      const wellY: [number, number] = [
        frame.frontWall + 0.01,
        frame.thickness - frame.backWall - 0.01,
      ]
      const floorProbe = makeBox(
        [-frame.wellWidth / 2 + 0.01, wellY[0], 0.02],
        [frame.wellWidth / 2 - 0.01, wellY[1], frame.wellFloorZ - 0.02],
      ) as Shape3D
      expect(
        volumeOf(holder, floorProbe) / measureVolume(floorProbe),
        'the floor under the well',
      ).toBeCloseTo(1, 2)
      floorProbe.delete()
      // The well floor sits exactly one minimum wall above the bed: the
      // band just above it, inside the well, is empty.
      const aboveProbe = makeBox(
        [-frame.wellWidth / 2 + 0.01, wellY[0], frame.wellFloorZ + 0.02],
        [frame.wellWidth / 2 - 0.01, wellY[1], frame.wellFloorZ + 0.12],
      ) as Shape3D
      expect(
        volumeOf(holder, aboveProbe),
        'the well above the floor',
      ).toBeLessThan(OVERLAP_LIMIT)
      aboveProbe.delete()
    } finally {
      holder.delete()
    }
  })

  it('rejects more dice than the walls leave room for', () => {
    // One more column of 8 mm dice than fits beside two 1.2 mm walls in
    // a 70 mm wide box, and one more row of 16 mm dice than fits above
    // the 1.2 mm floor of a 118 mm tall one: the layout rules bind there,
    // and the holder must refuse the extra dice instead of thinning a
    // wall or dropping the floor.
    expect(() =>
      buildGameBoxDiceHolder({
        cardWidth: 70,
        cardHeight: 120,
        diceSize: 8,
        diceCount: 92,
      }),
    ).toThrow(/dice-capacity/)
    expect(() =>
      buildGameBoxDiceHolder({
        cardWidth: 70,
        cardHeight: 118,
        diceSize: 16,
        diceCount: 28,
      }),
    ).toThrow(/dice-capacity/)
  })

  it('carries two tenons on each side', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const holder = buildGameBoxDiceHolder(options)
    try {
      const centres = gameBoxDiceHolderTenonCenters(frame)
      expect(centres).toHaveLength(2)
      // Every side of the holder carries the two tenons.
      for (const side of [1, -1] as const) {
        for (const centre of centres) {
          const band = tenonBand(
            holder,
            frame.bodyHalfWidth,
            frame.tenonOuterHalfWidth,
            centre,
            frame.height,
          )
          // The tenon is a plate as thick as a divider plate.
          expect(
            band.end - band.start,
            `the tenon at ${centre} mm on the ${side} side`,
          ).toBeCloseTo(CARD_BOX_CONFIGURATION.dividerPlateThickness, 3)
          // It sits where the layout puts it.
          expect(
            (band.start + band.end) / 2,
            `the centre of the tenon at ${centre} mm on the ${side} side`,
          ).toBeCloseTo(centre, 3)
        }
      }
    } finally {
      holder.delete()
    }
  })

  it('spreads the two tenons a whole number of slots apart', () => {
    // The die count stays inside the capacity of every case.
    const cases = [
      { diceSize: 8, diceCount: 9 },
      { diceSize: 16, diceCount: 9 },
      { diceSize: 18, diceCount: 9 },
      { diceSize: 30, diceCount: 6 },
    ]
    for (const scenario of cases) {
      const holderOptions = { ...options, ...scenario }
      const frame = gameBoxDiceHolderFrame(holderOptions)
      const holder = buildGameBoxDiceHolder(holderOptions)
      try {
        const [first, second] = gameBoxDiceHolderTenonCenters(frame)
        const firstBand = tenonBand(
          holder,
          frame.bodyHalfWidth,
          frame.tenonOuterHalfWidth,
          first!,
          frame.height,
        )
        const secondBand = tenonBand(
          holder,
          frame.bodyHalfWidth,
          frame.tenonOuterHalfWidth,
          second!,
          frame.height,
        )
        const distance =
          (secondBand.start + secondBand.end) / 2 -
          (firstBand.start + firstBand.end) / 2
        // The distance is a whole number of slots; the measurement carries
        // the tolerance of the bounding box, so the remainder is measured
        // against the nearer end of the slot pitch.
        const pitch = CARD_BOX_CONFIGURATION.dividerSlotPitch
        const remainder = distance % pitch
        expect(
          Math.min(remainder, pitch - remainder),
          `the tenon distance of a ${scenario.diceSize} mm die`,
        ).toBeCloseTo(0, 3)
        expect(distance).toBeLessThanOrEqual(frame.thickness)
      } finally {
        holder.delete()
      }
    }
  })

  it('reaches into the slot as far as a divider plate does', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const holder = buildGameBoxDiceHolder(options)
    const interior = cardBoxInteriorWidth(options.cardWidth)
    try {
      // The tenon's outer face is the divider plate's outer face.
      const bounds = boundsOf(holder)
      expect(bounds.max[0]!).toBeCloseTo(
        cardBoxDividerWidth(options.cardWidth) / 2,
        3,
      )
      // The slot is 0.25 mm deep, so the tenon stops 0.075 mm short of its
      // bottom.
      expect(
        bounds.max[0]! - interior / 2,
        'the reach of the tenon into the slot',
      ).toBeCloseTo(CARD_BOX_CONFIGURATION.dividerSlotDepth - 0.075, 3)
    } finally {
      holder.delete()
    }
  })

  it('has no grip flap or rib', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const holder = buildGameBoxDiceHolder(options)
    try {
      // Outside the body the only material is the two tenons: the volume of
      // the band beside the body is the two tenons and nothing else.
      const z = frame.wellFloorZ + 0.5
      const bandHeight = 0.5
      const outside = makeBox(
        [frame.bodyHalfWidth + 0.01, 0, z],
        [frame.tenonOuterHalfWidth - 0.01, frame.thickness, z + bandHeight],
      ) as Shape3D
      const material = volumeOf(holder, outside)
      expect(
        material /
          ((frame.tenonOuterHalfWidth - frame.bodyHalfWidth - 0.02) *
            bandHeight),
        'the material beside the holder body',
      ).toBeCloseTo(2 * CARD_BOX_CONFIGURATION.dividerPlateThickness, 2)
      outside.delete()
    } finally {
      holder.delete()
    }
  })

  it('keeps the wall between the tenon and the dice well', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const holder = buildGameBoxDiceHolder(options)
    try {
      // The tenon's root ends 0.5 mm inside the body, so at least 0.7 mm
      // of wall stand between the tenon and the well.
      const z = frame.wellFloorZ + 0.5
      for (const side of [1, -1] as const) {
        const probe = makeBox(
          [
            side *
              (frame.bodyHalfWidth - GAME_BOX_CONFIGURATION.tenonRootDepth),
            frame.frontWall + 0.5,
            z,
          ],
          [side * (frame.wellWidth / 2 + 0.01), frame.frontWall + 1, z + 0.5],
        ) as Shape3D
        expect(
          volumeOf(holder, probe) / measureVolume(probe),
          `the wall between the tenon and the well on the ${side} side`,
        ).toBeCloseTo(1, 2)
        probe.delete()
      }
    } finally {
      holder.delete()
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

describe('game-box holder with a minimum side wall', () => {
  // A dice row that exactly fills the usable width leaves a side wall of
  // exactly 1.2 mm; these inputs used to crash the holder build when the
  // relief cutters were derived from the wall thickness.
  const CASES = [
    {
      name: '63 x 88 with five 11.5 mm dice',
      cardWidth: 63,
      cardHeight: 88,
      diceSize: 11.5,
      diceCount: 5,
      modules: [{ type: 'dice', diceSize: 11.5, diceCount: 5 }],
    },
    {
      name: '48 x 120 with ten 8.5 mm dice',
      cardWidth: 48,
      cardHeight: 120,
      diceSize: 8.5,
      diceCount: 10,
      // The lone dice module needs 13.2 mm of cavity, so the assembly pairs
      // it with a cards module.
      modules: [
        { type: 'dice', diceSize: 8.5, diceCount: 10 },
        { type: 'cards', cardDepth: 20 },
      ],
    },
    {
      name: '68.9 x 120 with four 16 mm dice',
      cardWidth: 68.9,
      cardHeight: 120,
      diceSize: 16,
      diceCount: 4,
      modules: [{ type: 'dice', diceSize: 16, diceCount: 4 }],
    },
  ] as const

  it('builds the holder when the side wall is exactly the minimum thickness', async () => {
    for (const scenario of CASES) {
      const holder = buildGameBoxDiceHolder({
        cardWidth: scenario.cardWidth,
        cardHeight: scenario.cardHeight,
        diceSize: scenario.diceSize,
        diceCount: scenario.diceCount,
      })
      try {
        expect(countSolids(holder), scenario.name).toBe(1)
        const bounds = boundsOf(holder)
        expect(bounds.min[2]!, scenario.name).toBeGreaterThanOrEqual(-0.01)
      } finally {
        holder.delete()
      }
    }
  })

  it('builds the assembly when the side wall is exactly the minimum thickness', async () => {
    for (const scenario of CASES) {
      const params = moduleParameters(scenario.modules, {
        part: 'assembly',
        cardWidth: scenario.cardWidth,
        cardHeight: scenario.cardHeight,
      })
      const build = await buildGameBox(params)
      try {
        // The box, the lid, one divider per pair of card modules and one
        // holder per dice module.
        const layout = gameBoxLayout(params)
        const diceModules = layout.modules.filter(
          (module) => module.type === 'dice',
        ).length
        expect(solidsOf(build.shape).length, scenario.name).toBe(
          2 + layout.dividerCount + diceModules,
        )
      } finally {
        build.shape.delete()
      }
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
    it(`keeps the parts apart at the ${label} card size`, async () => {
      const params = moduleParameters(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 4 },
          { type: 'cards', cardDepth: 20 },
        ],
        { part: 'assembly', cardWidth, cardHeight },
      )
      const build = await buildGameBox(params)
      try {
        const solids = solidsOf(build.shape)
        expect(solids.length).toBe(await expectedPartCount(params))
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

    it(`locks every tenon into a slot at the ${label} card size`, async () => {
      const params = moduleParameters(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 4 },
          { type: 'cards', cardDepth: 20 },
        ],
        { part: 'assembly', cardWidth, cardHeight },
      )
      const layout = gameBoxLayout(params)
      const frontWallY = cardBoxInnerFrontY(gameBoxCardBoxGeometry(params))
      const wallX = cardBoxInteriorWidth(cardWidth) / 2
      const build = await buildGameBox(params)
      try {
        const solids = solidsOf(build.shape)
        const holders = holderSolids(solids, cardWidth)
        const diceModules = layout.modules.filter(
          (module) => module.type === 'dice',
        )
        expect(holders).toHaveLength(diceModules.length)
        diceModules.forEach((module, position) => {
          if (module.type !== 'dice') return
          const holder = holders[position]!
          for (const centre of module.tenonCentres) {
            const y = frontWallY + centre
            for (const side of [1, -1] as const) {
              // The tenon stands in the slot: the material between the
              // interior wall and the reach of the tenon is the tenon.
              const tenon = makeBox(
                [side * (wallX + 0.01), y - 0.4, 3],
                [side * (wallX + 0.17), y + 0.4, cardHeight],
              ) as Shape3D
              expect(
                volumeOf(holder, tenon),
                `the tenon at ${centre} mm on the ${side} side`,
              ).toBeGreaterThan(0.1)
              tenon.delete()
              // The slot is wider than the tenon: beside the tenon the wall
              // is open, so the tenon really sits in a slot.
              const beside = makeBox(
                [side * (wallX + 0.01), y + 0.43, 3],
                [side * (wallX + 0.24), y + 0.49, cardHeight],
              ) as Shape3D
              expect(
                volumeOf(build.shape, beside),
                `the slot beside the tenon at ${centre} mm on the ${side} side`,
              ).toBeLessThan(OVERLAP_LIMIT)
              beside.delete()
            }
          }
        })
      } finally {
        build.shape.delete()
      }
    })

    it(`seats the dice holder on its own tenons at the ${label} card size`, async () => {
      const params = moduleParameters(
        [
          { type: 'cards', cardDepth: 30 },
          { type: 'dice', diceSize: 16, diceCount: 4 },
          { type: 'cards', cardDepth: 20 },
        ],
        { part: 'assembly', cardWidth, cardHeight },
      )
      const layout = gameBoxLayout(params)
      const frontWallY = cardBoxInnerFrontY(gameBoxCardBoxGeometry(params))
      const build = await buildGameBox(params)
      try {
        const solids = solidsOf(build.shape)
        const holders = holderSolids(solids, cardWidth)
        expect(holders).toHaveLength(1)
        const holderBounds = boundsOf(holders[0]!)
        const module = layout.modules[1]
        if (!module || module.type !== 'dice') throw new Error('a dice module')
        // The holder stands where the layout puts it.
        expect(holderBounds.min[1]!).toBeCloseTo(
          frontWallY + module.holderStart,
          3,
        )
        expect(holderBounds.max[1]! - holderBounds.min[1]!).toBeCloseTo(
          gameBoxDiceHolderThickness(16),
          3,
        )
      } finally {
        build.shape.delete()
      }
    })
  }

  it('puts no divider next to a dice holder', async () => {
    const params = moduleParameters(
      [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 4 },
        { type: 'cards', cardDepth: 20 },
      ],
      { part: 'assembly' },
    )
    const layout = gameBoxLayout(params)
    const build = await buildGameBox(params)
    try {
      // The holder is its own divider: the cards lean on its wall.
      expect(layout.dividerCount).toBe(0)
      const solids = solidsOf(build.shape)
      const dividers = solids.filter((solid) => {
        const bounds = boundsOf(solid)
        return bounds.max[1]! - bounds.min[1]! < 1
      })
      expect(dividers).toHaveLength(0)
    } finally {
      build.shape.delete()
    }
  })

  it('seats a first module holder behind the front wall', async () => {
    const params = moduleParameters(
      [
        { type: 'dice', diceSize: 16, diceCount: 4 },
        { type: 'cards', cardDepth: 20 },
      ],
      { part: 'assembly' },
    )
    const build = await buildGameBox(params)
    try {
      const solids = solidsOf(build.shape)
      expect(solids.length).toBe(await expectedPartCount(params))
      const holders = holderSolids(solids, params.cardWidth)
      expect(holders).toHaveLength(1)
      const holderBounds = boundsOf(holders[0]!)
      const layout = gameBoxLayout(params)
      const frontWallY = cardBoxInnerFrontY(gameBoxCardBoxGeometry(params))
      const module = layout.modules[0]
      if (!module || module.type !== 'dice') throw new Error('a dice module')
      // The holder waits for the first slot, so it stands behind the front
      // wall face instead of against it.
      expect(holderBounds.min[1]!).toBeCloseTo(
        frontWallY + module.holderStart,
        3,
      )
      expect(holderBounds.min[1]!).toBeGreaterThan(frontWallY)
    } finally {
      build.shape.delete()
    }
  })
})

describe('game-box assembly with a dice module first, last or twice in a row', () => {
  /**
   * The module lists the holder may take: first, last, and two dice modules
   * one behind the other. The middle case is covered by the assembly tests
   * above.
   */
  const LAYOUTS = [
    {
      name: 'the dice module first',
      modules: [
        { type: 'dice', diceSize: 16, diceCount: 4 },
        { type: 'cards', cardDepth: 20 },
      ],
    },
    {
      name: 'the dice module last',
      modules: [
        { type: 'cards', cardDepth: 30 },
        { type: 'dice', diceSize: 16, diceCount: 4 },
      ],
    },
    {
      name: 'two dice modules in a row',
      modules: [
        { type: 'dice', diceSize: 16, diceCount: 4 },
        { type: 'dice', diceSize: 18, diceCount: 4 },
      ],
    },
  ] as const

  const SIZES = [
    ['default', 70, 120],
    ['minimum', 40, 60],
  ] as const

  for (const [label, cardWidth, cardHeight] of SIZES) {
    for (const { name, modules } of LAYOUTS) {
      it(`keeps the parts apart with ${name} at the ${label} card size`, async () => {
        const params = moduleParameters(modules, {
          part: 'assembly',
          cardWidth,
          cardHeight,
        })
        const build = await buildGameBox(params)
        try {
          const solids = solidsOf(build.shape)
          expect(solids.length).toBe(await expectedPartCount(params))
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

      it(`locks every tenon into a slot with ${name} at the ${label} card size`, async () => {
        const params = moduleParameters(modules, {
          part: 'assembly',
          cardWidth,
          cardHeight,
        })
        const layout = gameBoxLayout(params)
        const frontWallY = cardBoxInnerFrontY(gameBoxCardBoxGeometry(params))
        const wallX = cardBoxInteriorWidth(cardWidth) / 2
        const bodyHalfWidth = gameBoxDiceHolderWidth(cardWidth) / 2
        const tenonOuterHalfWidth = cardBoxDividerWidth(cardWidth) / 2
        const build = await buildGameBox(params)
        const box = await buildGameBox({ ...params, part: 'box' })
        try {
          const holders = holderSolids(solidsOf(build.shape), cardWidth)
          const diceModules = layout.modules.filter(
            (module) => module.type === 'dice',
          )
          expect(holders).toHaveLength(diceModules.length)
          diceModules.forEach((module, position) => {
            if (module.type !== 'dice') return
            const holder = holders[position]!
            for (const centre of module.tenonCentres) {
              const y = frontWallY + centre
              for (const side of [1, -1] as const) {
                // The tenon reaches into the wall: the material between the
                // interior wall and the reach of the tenon is the tenon.
                const near = side * (wallX + 0.01)
                const far = side * (wallX + 0.17)
                const reach = makeBox(
                  [Math.min(near, far), y - 0.4, 3],
                  [Math.max(near, far), y + 0.4, cardHeight],
                ) as Shape3D
                expect(
                  volumeOf(holder, reach),
                  `the tenon at ${centre} mm on the ${side} side`,
                ).toBeGreaterThan(0.1)
                reach.delete()
                // The tenon band lies in the slot band: the wall is open
                // around the tenon, so it really stands in a slot.
                const band = tenonBand(
                  holder,
                  bodyHalfWidth,
                  tenonOuterHalfWidth,
                  y,
                  cardHeight,
                )
                const slot = openBandsOfWall(
                  box.shape,
                  side,
                  wallX,
                  y,
                  cardHeight,
                ).find(
                  (candidate) =>
                    candidate.start <= band.start + 1e-6 &&
                    candidate.end >= band.end - 1e-6,
                )
                expect(
                  slot,
                  `the slot band around the tenon at ${centre} mm on the ${side} side`,
                ).toBeDefined()
              }
            }
          })
        } finally {
          build.shape.delete()
          box.shape.delete()
        }
      })
    }
  }
})
