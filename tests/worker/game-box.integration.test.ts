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
  gameBoxDiceHolderGripFrame,
} from '../../src/cad-kernel/components/game-box/dice-holder'
import { gameBoxCardBoxGeometry } from '../../src/cad-kernel/components/game-box/geometry'
import {
  CARD_BOX_CONFIGURATION,
  GAME_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
  gameBoxDiceHolderOuterWidth,
  gameBoxDiceHolderThickness,
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
    const depth = gameBoxLayout(params).storageDepth
    expect(depth).toBeCloseTo(72.85, 6)
    const gameBoxBuild = buildGameBox(params)
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
      // The natural outer width (with the grip flaps) exceeds the interior.
      expect(bounds.max[0]! - bounds.min[0]!).toBeGreaterThan(interior)
      expect(bounds.max[0]! - bounds.min[0]!).toBeCloseTo(
        gameBoxDiceHolderOuterWidth(options.cardWidth),
        3,
      )
      // The surplus over the interior is the grip allowance confirmed by
      // the test print: it sets how hard the flaps press into the walls.
      expect(bounds.max[0]! - bounds.min[0]! - interior).toBeCloseTo(0.4, 3)
      // The body itself stays clear of the box walls: no material reaches
      // the interior wall, neither beside nor above the grip flaps.
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

  it('thins the front and the back wall to 0.8 mm', () => {
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
        { name: 'the front wall', y: [0, 1.5] },
        { name: 'the back wall', y: [frame.thickness - 1.5, frame.thickness] },
      ] as const
      for (const wall of walls) {
        const probe = makeBox(
          [column - bandWidth / 2, wall.y[0], z],
          [column + bandWidth / 2, wall.y[1], z + bandHeight],
        ) as Shape3D
        expect(
          volumeOf(holder, probe) / (bandWidth * bandHeight),
          wall.name,
        ).toBeCloseTo(0.8, 2)
        probe.delete()
      }
      // The side wall and the floor keep their own minimum, measured on the
      // solid: the probe bands next to the well and under its floor are
      // full material.
      // Measured above the well floor, where the side wall stands beside
      // the well, in front of the recess of the grip flap.
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
          frame.thickness - frame.frontWall - 0.01,
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
      // Measured above the well floor and below the grip zone, in front
      // of the recess of the grip flap.
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
        frame.thickness - frame.frontWall - 0.01,
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

  it('joins the flap to the body along its whole height', () => {
    const cases = [
      { name: 'default', holderOptions: options },
      {
        name: 'minimum side wall',
        holderOptions: {
          cardWidth: 63,
          cardHeight: 88,
          diceSize: 11.5,
          diceCount: 5,
        },
      },
      {
        name: 'smallest holder',
        holderOptions: {
          cardWidth: 40,
          cardHeight: 60,
          diceSize: 8,
          diceCount: 4,
        },
      },
      {
        name: 'widest dice',
        holderOptions: {
          cardWidth: 100,
          cardHeight: 150,
          diceSize: 30,
          diceCount: 6,
        },
      },
    ]
    for (const scenario of cases) {
      const frame = gameBoxDiceHolderFrame(scenario.holderOptions)
      const grip = gameBoxDiceHolderGripFrame(frame)
      const holder = buildGameBoxDiceHolder(scenario.holderOptions)
      try {
        // The front wall carries a vertical opening in front of every row
        // position, so a slice through the dice well falls into several
        // solids. The reference slices outside the grip zone count them;
        // the grip must not add a solid of its own at any height — in
        // particular within one print layer of either end of the grip
        // zone, where a rounded root would leave the flap as an island.
        const lowReference = sliceSolidCount(holder, grip.zStart - 2)
        const highReference = sliceSolidCount(holder, grip.zEnd + 2)
        const samples = [
          grip.zStart + 0.02,
          grip.zStart + 0.2,
          (grip.zStart + grip.zEnd) / 2,
          grip.zEnd - 0.2,
          grip.zEnd - 0.02,
        ]
        for (const z of samples) {
          const reference = z < frame.wellFloorZ ? lowReference : highReference
          expect(
            sliceSolidCount(holder, z),
            `${scenario.name}: the solids of the slice at ${z} mm`,
          ).toBe(reference)
        }
      } finally {
        holder.delete()
      }
    }
  })

  it('keeps the grip zone inside the end margins', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const grip = gameBoxDiceHolderGripFrame(frame)
    // The 2026-11-19 test print confirmed the end margins: the grip zone
    // is capped at the height minus 2 × 4 mm.
    expect(grip.zEnd - grip.zStart).toBeCloseTo(60, 6)
    const shortFrame = gameBoxDiceHolderFrame({
      ...options,
      cardHeight: 60,
      diceSize: 18,
      diceCount: 9,
    })
    const shortGrip = gameBoxDiceHolderGripFrame(shortFrame)
    expect(shortGrip.zEnd - shortGrip.zStart).toBeCloseTo(52, 6)
  })

  it('leaves a recess behind the grip flap with a wall behind it', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const grip = gameBoxDiceHolderGripFrame(frame)
    const holder = buildGameBoxDiceHolder(options)
    try {
      for (const side of [1, -1] as const) {
        // The recess is cut 0.8 mm into the wall and the flap never hangs
        // deeper than 0.4 mm below the wall face, so the band between the
        // recess floor and the flap's lowest reach is empty over the whole
        // length of the recess: the flap is free over its whole free
        // length and has room to fold in.
        const recess = span(
          side * (frame.bodyWidth / 2 - 0.8),
          side * (frame.bodyWidth / 2 - 0.45),
        )
        const recessProbe = makeBox(
          [recess[0], grip.recessYStart + 0.05, frame.height / 2 - 0.5],
          [recess[1], grip.recessYEnd - 0.05, frame.height / 2 + 0.5],
        ) as Shape3D
        expect(
          volumeOf(holder, recessProbe),
          `the recess on the ${side} side`,
        ).toBeLessThan(OVERLAP_LIMIT)
        recessProbe.delete()
        // The wall behind the recess is still there: the band from the
        // well face to the recess floor is full material, so the recess
        // never reaches the dice well.
        const behind = span(
          side * (frame.wellWidth / 2 + 0.01),
          side * (frame.bodyWidth / 2 - 0.8),
        )
        const behindProbe = makeBox(
          [behind[0], grip.recessYStart + 0.05, frame.height / 2 - 0.5],
          [behind[1], grip.recessYEnd - 0.05, frame.height / 2 + 0.5],
        ) as Shape3D
        expect(
          volumeOf(holder, behindProbe) / measureVolume(behindProbe),
          `the wall behind the recess on the ${side} side`,
        ).toBeCloseTo(1, 2)
        behindProbe.delete()
      }
    } finally {
      holder.delete()
    }
  })

  it('leaves the recess open past the ends of the flap', () => {
    const cases = [
      { name: 'default', holderOptions: options },
      {
        name: 'minimum side wall',
        holderOptions: {
          cardWidth: 63,
          cardHeight: 88,
          diceSize: 11.5,
          diceCount: 5,
        },
      },
      {
        name: 'smallest holder',
        holderOptions: {
          cardWidth: 40,
          cardHeight: 60,
          diceSize: 8,
          diceCount: 4,
        },
      },
    ]
    for (const scenario of cases) {
      const frame = gameBoxDiceHolderFrame(scenario.holderOptions)
      const grip = gameBoxDiceHolderGripFrame(frame)
      const holder = buildGameBoxDiceHolder(scenario.holderOptions)
      try {
        for (const side of [1, -1] as const) {
          // The recess runs 0.4 mm past each end of the flap, so the
          // bands just above and below the flap are empty across the
          // whole recess footprint: the flap's end faces touch nothing.
          for (const band of [grip.zStart, grip.zEnd]) {
            const [zLow, zHigh] =
              band === grip.zStart
                ? [band - 0.35, band - 0.05]
                : [band + 0.05, band + 0.35]
            const reach = span(
              side * (frame.bodyWidth / 2 - 0.75),
              side * (frame.bodyWidth / 2 + 0.6),
            )
            const reachProbe = makeBox(
              [reach[0], grip.recessYStart + 0.05, zLow],
              [reach[1], grip.recessYEnd - 0.05, zHigh],
            ) as Shape3D
            expect(
              volumeOf(holder, reachProbe),
              `${scenario.name}: the band past the flap end on the ${side} side at ${band} mm`,
            ).toBeLessThan(OVERLAP_LIMIT)
            reachProbe.delete()
            // The wall behind the extended recess is still there: the
            // band from the well face to the recess floor is full
            // material, so the recess still never reaches the well.
            const behind = span(
              side * (frame.wellWidth / 2 + 0.01),
              side * (frame.bodyWidth / 2 - 0.8),
            )
            const behindProbe = makeBox(
              [behind[0], grip.recessYStart + 0.05, zLow],
              [behind[1], grip.recessYEnd - 0.05, zHigh],
            ) as Shape3D
            expect(
              volumeOf(holder, behindProbe) / measureVolume(behindProbe),
              `${scenario.name}: the wall behind the band on the ${side} side at ${band} mm`,
            ).toBeCloseTo(1, 2)
            behindProbe.delete()
          }
        }
      } finally {
        holder.delete()
      }
    }
  })

  it('holds the flap on its root alone', () => {
    const cases = [
      { name: 'default', holderOptions: options },
      {
        name: 'minimum side wall',
        holderOptions: {
          cardWidth: 63,
          cardHeight: 88,
          diceSize: 11.5,
          diceCount: 5,
        },
      },
      {
        name: 'smallest holder',
        holderOptions: {
          cardWidth: 40,
          cardHeight: 60,
          diceSize: 8,
          diceCount: 4,
        },
      },
    ]
    for (const scenario of cases) {
      const frame = gameBoxDiceHolderFrame(scenario.holderOptions)
      const grip = gameBoxDiceHolderGripFrame(frame)
      const holder = buildGameBoxDiceHolder(scenario.holderOptions)
      try {
        expect(countSolids(holder), `${scenario.name}: the built holder`).toBe(
          1,
        )
        for (const side of [1, -1] as const) {
          // Sever the flap 0.5 mm past its root edge: a 0.2 mm cut along
          // the whole height whose inner face stays inside the void of
          // the recess (its floor lies 0.8 mm into the wall), so the cut
          // only crosses the flap. If the flap were fused to the wall
          // anywhere else — at its end faces — the tip would stay
          // attached and the holder would still be one solid.
          const cut = span(
            side * (frame.bodyWidth / 2 - 0.7),
            side * (frame.bodyWidth / 2 + 1),
          )
          const cutter = makeBox(
            [cut[0], grip.yStart + 0.5, -1],
            [cut[1], grip.yStart + 0.7, frame.height + 1],
          ) as Shape3D
          const severed = holder.cut(cutter)
          try {
            expect(
              countSolids(severed),
              `${scenario.name}: the solids after severing the ${side} flap`,
            ).toBe(2)
          } finally {
            severed.delete()
            cutter.delete()
          }
        }
      } finally {
        holder.delete()
      }
    }
  })

  it('pins the flap dimensions that keep the full press elastic', () => {
    const frame = gameBoxDiceHolderFrame(options)
    const grip = gameBoxDiceHolderGripFrame(frame)
    // The flap is a cantilever: its peak strain at the full press is about
    // 3·δ·t / (2·L²), with δ = 0.5 mm (natural outer width down to the
    // body width), t the plate thickness and L the free length. PLA and
    // PETG stay elastic up to roughly 2 %, so this test measures t and L
    // on the solid and holds the strain against that limit.
    const holder = buildGameBoxDiceHolder(options)
    try {
      // Beyond the wall face the material is the flap alone, so the y span
      // of the material that has risen 0.05 mm off the wall gives the free
      // length and the top of its bounding box gives the protrusion.
      const reach = makeBox(
        [frame.bodyWidth / 2 + 0.05, 0, frame.height / 2 - 0.5],
        [frame.bodyWidth / 2 + 1, frame.thickness, frame.height / 2 + 0.5],
      ) as Shape3D
      const flapOnly = holder.intersect(reach)
      const flapBounds = boundsOf(flapOnly)
      flapOnly.delete()
      reach.delete()
      const risen = 0.05
      // The material beyond the wall face + 0.05 mm starts where the flap
      // has risen 0.05 mm off the wall, 10 % of the way along its free
      // length (the natural protrusion is 0.5 mm, the fit the 2026-11-19
      // test print confirmed).
      const naturalProtrusion = 0.5
      const freeLength =
        (flapBounds.max[1]! - flapBounds.min[1]!) /
        (1 - risen / naturalProtrusion)
      expect(
        freeLength,
        'the free length of the flap along the thickness',
      ).toBeCloseTo(5, 1)
      expect(
        flapBounds.max[0]! - frame.bodyWidth / 2,
        'the protrusion of the flap',
      ).toBeCloseTo(naturalProtrusion, 2)
      // The thickness: near the tip the flap is separated from the wall,
      // so a probe reaching from the recess floor past the wall face
      // carries the flap alone.
      const probe = makeBox(
        [frame.bodyWidth / 2 - 0.75, grip.yEnd - 1, frame.height / 2 - 0.5],
        [frame.bodyWidth / 2 + 1, grip.yEnd - 0.5, frame.height / 2 + 0.5],
      ) as Shape3D
      const measuredThickness = volumeOf(holder, probe) / (0.5 * 1)
      expect(measuredThickness, 'the thickness of the flap').toBeCloseTo(0.4, 1)
      probe.delete()
      const strain =
        (3 * 0.5 * measuredThickness) / (2 * freeLength * freeLength)
      expect(strain, 'the peak strain at the full press').toBeLessThan(0.02)
    } finally {
      holder.delete()
    }
  })

  it('presses the grip flaps in to the body width', () => {
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
      // The lone dice module is 12.15 mm deep, below the supported depth,
      // so the assembly pairs it with a cards module.
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

  it('builds the holder when the side wall is exactly the minimum thickness', () => {
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

  it('builds the assembly when the side wall is exactly the minimum thickness', () => {
    for (const scenario of CASES) {
      const params = moduleParameters(scenario.modules, {
        part: 'assembly',
        cardWidth: scenario.cardWidth,
        cardHeight: scenario.cardHeight,
      })
      const build = buildGameBox(params)
      try {
        // The box, the lid, one divider per module boundary and one holder
        // per dice module.
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
