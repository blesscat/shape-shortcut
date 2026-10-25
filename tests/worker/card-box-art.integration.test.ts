import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { buildCardBoxDivider } from '../../src/cad-kernel/components/card-box/divider'
import { buildCardBoxCover } from '../../src/cad-kernel/components/card-box/cover'
import {
  cardBoxCoverSafeArea,
  cardBoxCoverStackLayout,
} from '../../src/cad-kernel/components/card-box/layout'
import { measureCardBoxText } from '../../src/cad-kernel/components/card-box/text'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
  type CardBoxParameters,
  type CardBoxSvgOutlineData,
} from '../../src/cad-contract/units'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

function baseParameters(
  overrides: Partial<CardBoxParameters> = {},
): CardBoxParameters {
  return {
    part: 'divider',
    cardWidth: CARD_BOX_CONFIGURATION.defaults.cardWidth,
    cardHeight: CARD_BOX_CONFIGURATION.defaults.cardHeight,
    storageDepth: CARD_BOX_CONFIGURATION.defaults.storageDepth,
    dividerTabPosition: CARD_BOX_CONFIGURATION.defaultTabPosition,
    dividerText: '',
    dividerStyle: CARD_BOX_CONFIGURATION.defaultStyle,
    coverTitle: '',
    coverTitleTextHeight: CARD_BOX_CONFIGURATION.coverTitleTextHeight.default,
    coverSubtitle: '',
    coverSubtitleTextHeight:
      CARD_BOX_CONFIGURATION.coverSubtitleTextHeight.default,
    coverSvgWidth: CARD_BOX_CONFIGURATION.coverSvgWidth.default,
    coverVerticalPosition: CARD_BOX_CONFIGURATION.coverVerticalPosition.default,
    coverStyle: CARD_BOX_CONFIGURATION.defaultStyle,
    usesCoverSvg: false,
    coverSvgFingerprint: '',
    ...overrides,
  }
}

function shapeBounds(shape: Shape3D): number[][] {
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

describe('card-box divider and cover art geometry', () => {
  it('builds a raised text divider with a separate proud accent', async () => {
    const result = await buildCardBoxDivider(
      baseParameters({ dividerText: 'ABC' }),
    )
    expect(result.kind).toBe('accent')
    if (result.kind !== 'accent') return
    try {
      expectClose(
        shapeBounds(result.body)[1]![2]!,
        CARD_BOX_CONFIGURATION.dividerPlateThickness,
      )
      const accentBounds = shapeBounds(result.accent)
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
      result.body.delete()
      result.accent.delete()
    }
  })

  it('builds a flat text divider with the accent flush in the recess', async () => {
    const result = await buildCardBoxDivider(
      baseParameters({ dividerText: 'ABC', dividerStyle: 'flat' }),
    )
    expect(result.kind).toBe('accent')
    if (result.kind !== 'accent') return
    try {
      const accentBounds = shapeBounds(result.accent)
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
      result.body.delete()
      result.accent.delete()
    }
  })

  it('rejects divider text wider than the tab', async () => {
    const measure = await measureCardBoxText('WIDE OVERFLOWING DIVIDER TEXT', 5)
    expect(measure).not.toBeNull()
    expect(measure!.width).toBeGreaterThan(
      CARD_BOX_CONFIGURATION.dividerTabBaseWidth - 4,
    )
    await expect(
      buildCardBoxDivider(
        baseParameters({ dividerText: 'WIDE OVERFLOWING DIVIDER TEXT' }),
      ),
    ).rejects.toThrow('CARD_BOX_DIVIDER_TEXT_TOO_WIDE')
  })

  it('builds a raised title cover within the plate envelope', async () => {
    const result = await buildCardBoxCover(
      baseParameters({ part: 'cover', coverTitle: 'CARDS' }),
    )
    expect(result.kind).toBe('accent')
    if (result.kind !== 'accent') return
    try {
      const width = cardBoxInteriorWidth(
        CARD_BOX_CONFIGURATION.defaults.cardWidth,
      )
      const bodyBounds = shapeBounds(result.body)
      expectClose(bodyBounds[0]![0]!, -width / 2)
      expectClose(bodyBounds[1]![0]!, width / 2)
      expectClose(bodyBounds[0]![1]!, 0)
      expectClose(
        bodyBounds[1]![1]!,
        CARD_BOX_CONFIGURATION.defaults.cardHeight,
      )
      expectClose(
        bodyBounds[1]![2]!,
        CARD_BOX_CONFIGURATION.coverPlateThickness,
      )
      const accentBounds = shapeBounds(result.accent)
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
        CARD_BOX_CONFIGURATION.defaults.cardHeight,
      )
    } finally {
      result.body.delete()
      result.accent.delete()
    }
  })

  it('builds a flat cover with svg, title and subtitle flush in recesses', async () => {
    const outline: CardBoxSvgOutlineData = {
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
    const result = await buildCardBoxCover(
      baseParameters({
        part: 'cover',
        coverTitle: 'CARDS',
        coverSubtitle: 'SUB',
        usesCoverSvg: true,
        coverStyle: 'flat',
      }),
      outline,
    )
    expect(result.kind).toBe('accent')
    if (result.kind !== 'accent') return
    try {
      const accentBounds = shapeBounds(result.accent)
      expectClose(
        accentBounds[0]![2]!,
        CARD_BOX_CONFIGURATION.coverPlateThickness -
          CARD_BOX_CONFIGURATION.accentDepth,
      )
      expectClose(
        accentBounds[1]![2]!,
        CARD_BOX_CONFIGURATION.coverPlateThickness,
      )
      // Svg scaled to coverSvgWidth dominates the accent width.
      expect(accentBounds[1]![0]! - accentBounds[0]![0]!).toBeCloseTo(
        CARD_BOX_CONFIGURATION.coverSvgWidth.default,
        3,
      )
    } finally {
      result.body.delete()
      result.accent.delete()
    }
  })

  it('rejects cover art exceeding the safe area', () => {
    const parameters = baseParameters({ part: 'cover' })
    const safe = cardBoxCoverSafeArea(parameters)
    // Horizontally oversized item.
    expect(() =>
      cardBoxCoverStackLayout(
        [{ kind: 'text', width: safe.maxX - safe.minX + 10, height: 8 }],
        safe,
        50,
      ),
    ).toThrow('CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA')
    // Vertically oversized stack.
    expect(() =>
      cardBoxCoverStackLayout(
        [{ kind: 'text', width: 10, height: safe.maxY - safe.minY + 1 }],
        safe,
        50,
      ),
    ).toThrow('CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA')
  })

  it('places the stack per coverVerticalPosition', () => {
    const parameters = baseParameters({ part: 'cover' })
    const safe = cardBoxCoverSafeArea(parameters)
    const items = [
      { kind: 'svg' as const, width: 20, height: 10 },
      { kind: 'text' as const, width: 10, height: 4 },
    ]
    const top = cardBoxCoverStackLayout(items, safe, 0)
    expectClose(top.placements[0]!.y + items[0]!.height, safe.maxY)
    const bottom = cardBoxCoverStackLayout(items, safe, 100)
    expectClose(bottom.placements[1]!.y, safe.minY)
    const centered = cardBoxCoverStackLayout(items, safe, 50)
    const total = 14
    const expectedTop = (safe.minY + safe.maxY) / 2 + total / 2
    expectClose(centered.placements[0]!.y + items[0]!.height, expectedTop)
    // Horizontal centering within the safe area.
    for (const layout of [top, bottom, centered]) {
      for (const placement of layout.placements) {
        expectClose(
          placement.x + placement.width / 2,
          (safe.minX + safe.maxX) / 2,
        )
      }
    }
  })
})
