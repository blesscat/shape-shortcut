import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, type Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { deleteShape } from '../../src/cad-kernel/lifetime/dispose'
import { buildCardBox } from '../../src/cad-kernel/components/card-box/builder'
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
  type CardBoxParameters,
  type CardBoxTabPosition,
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

const { cardHeight, cardWidth } = CARD_BOX_CONFIGURATION.defaults
const TAB_HEIGHT = CARD_BOX_CONFIGURATION.dividerTabHeight
const PLATE_WIDTH = cardBoxDividerWidth(cardWidth)

function parameters(overrides: Partial<CardBoxParameters>): CardBoxParameters {
  return {
    ...CARD_BOX_CONFIGURATION.defaultParameters,
    part: 'divider',
    ...overrides,
  }
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function disposeSolids(...shapes: Shape3D[]): void {
  for (const shape of shapes) deleteShape(shape)
}

/** Highest plate point inside a thin vertical strip centered on `x`. */
function plateTopAt(plate: Shape3D, x: number): number {
  const strip = makeBox([x - 0.25, -1, -1], [x + 0.25, 300, 3]) as Shape3D
  const slice = plate.intersect(strip)
  try {
    return boundsOf(slice)[1]![1]!
  } finally {
    disposeSolids(slice, strip)
  }
}

async function buildPlate(
  position: CardBoxTabPosition,
): Promise<{ plate: Shape3D }> {
  const build = await buildCardBoxDivider(
    parameters({ dividerTabPosition: position }),
  )
  if (build.kind !== 'single') throw new Error('expected a plain divider')
  return { plate: build.shape }
}

describe('card-box divider plate', () => {
  it('matches the reference plate: 70.85 × 125 × 0.85 and 7347.9 mm³', async () => {
    const { plate } = await buildPlate('left')
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
      plate.delete()
    }
  })

  it.each([
    ['left', -30, 20],
    ['right', 30, -20],
    ['center', 0, -30],
    ['center', 0, 30],
  ] as const)(
    'rises to H + 5 only inside the %s tab (x = %d, away from it x = %d)',
    async (position, insideTab, awayFromTab) => {
      const { plate } = await buildPlate(position)
      try {
        expect(plateTopAt(plate, insideTab)).toBeCloseTo(
          cardHeight + TAB_HEIGHT,
          2,
        )
        expect(plateTopAt(plate, awayFromTab)).toBeCloseTo(cardHeight, 2)
      } finally {
        plate.delete()
      }
    },
  )

  it('leans the tab flank inward toward the top', async () => {
    const { plate } = await buildPlate('left')
    try {
      const flankBaseX = -PLATE_WIDTH / 2 + 30.5
      const flankTopX =
        flankBaseX -
        TAB_HEIGHT *
          Math.tan(
            (CARD_BOX_CONFIGURATION.dividerTabDraftDegrees * Math.PI) / 180,
          )
      // Just inside the base line the tab is gone at the top, just outside
      // the narrower top edge it is still full height.
      expect(plateTopAt(plate, flankTopX - 4)).toBeCloseTo(
        cardHeight + TAB_HEIGHT,
        2,
      )
      expect(plateTopAt(plate, flankBaseX + 3.5)).toBeCloseTo(cardHeight, 2)
    } finally {
      plate.delete()
    }
  })
})

describe('card-box divider in the assembled frame', () => {
  it('enters both side-wall slots without touching the box', async () => {
    const { plate } = await buildPlate('left')
    const box = await buildCardBox(parameters({ part: 'box' }))
    try {
      const [[minX], [maxX]] = boundsOf(plate)
      const halfInterior = cardBoxInteriorWidth(cardWidth) / 2
      const slotBottom = halfInterior + CARD_BOX_CONFIGURATION.dividerSlotDepth
      expect(maxX!).toBeGreaterThan(halfInterior + 0.1)
      expect(maxX!).toBeLessThan(slotBottom)
      expect(minX!).toBeLessThan(-halfInterior - 0.1)
      expect(minX!).toBeGreaterThan(-slotBottom)

      const standing = plate
        .rotate(90, [0, 0, 0], [1, 0, 0])
        .translate(
          0,
          CARD_BOX_CONFIGURATION.dividerPlateThickness / 2,
          CARD_BOX_CONFIGURATION.floorThickness,
        )
      const overlap = standing.intersect(box.shape)
      try {
        expect(measureVolume(overlap)).toBeLessThan(0.001)
      } finally {
        disposeSolids(overlap, standing)
      }
    } finally {
      deleteShape(plate)
      deleteShape(box.shape)
    }
  })
})

describe('card-box divider text placement', () => {
  const edgeInset = CARD_BOX_CONFIGURATION.dividerTextEdgeInset

  async function buildAccent(
    position: CardBoxTabPosition,
  ): Promise<{ body: Shape3D; accent: Shape3D }> {
    const build = await buildCardBoxDivider(
      parameters({ dividerTabPosition: position, dividerText: 'Special' }),
    )
    if (build.kind !== 'accent') throw new Error('expected an accent build')
    return build
  }

  it('starts the left-tab text 2.25 mm from the plate edge, 0.8 mm below the tab top', async () => {
    const { body, accent } = await buildAccent('left')
    try {
      const [[minX], [, maxY]] = boundsOf(accent)
      expect(minX!).toBeCloseTo(-PLATE_WIDTH / 2 + edgeInset, 1)
      expect(maxY!).toBeCloseTo(cardHeight + 4.2, 1)
    } finally {
      disposeSolids(body, accent)
    }
  })

  it('mirrors the text placement for the right tab', async () => {
    const { body, accent } = await buildAccent('right')
    try {
      const [, [maxX, maxY]] = boundsOf(accent)
      expect(maxX!).toBeCloseTo(PLATE_WIDTH / 2 - edgeInset, 1)
      expect(maxY!).toBeCloseTo(cardHeight + 4.2, 1)
    } finally {
      disposeSolids(body, accent)
    }
  })

  it('centers the center-tab text on the tab', async () => {
    const { body, accent } = await buildAccent('center')
    try {
      const [[minX], [maxX]] = boundsOf(accent)
      expect((minX! + maxX!) / 2).toBeCloseTo(0, 1)
    } finally {
      disposeSolids(body, accent)
    }
  })

  it('still rejects text wider than the tab instead of shrinking it', async () => {
    for (const position of ['left', 'center', 'right'] as const) {
      await expect(
        buildCardBoxDivider(
          parameters({
            dividerTabPosition: position,
            dividerText: 'WIDE OVERFLOWING DIVIDER TEXT',
          }),
        ),
      ).rejects.toThrow('CARD_BOX_DIVIDER_TEXT_TOO_WIDE')
    }
  })
})
