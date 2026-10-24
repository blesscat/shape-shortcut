import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, type Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { deleteShape } from '../../src/cad-kernel/lifetime/dispose'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import { buildCardBox } from '../../src/cad-kernel/components/card-box/builder'
import { buildCardBoxDivider } from '../../src/cad-kernel/components/card-box/divider'
import { buildCardBoxCover } from '../../src/cad-kernel/components/card-box/cover'
import { cardBoxDefinition } from '../../src/features/cad/model-catalog/components/card-box'
import { countSolids } from '../../src/cad-kernel/shape-query/solids'
import {
  CARD_BOX_CONFIGURATION,
  boundsForCardBox,
  cardBoxThreeMfFileName,
  type CardBoxParameters,
} from '../../src/cad-contract/units'
import {
  exportThreeMfBytes,
  isThreeMfPackage,
  threeMfExpectationFor,
  threeMfMetaFor,
} from '../../src/cad-kernel/export'

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

function parameters(overrides: Partial<CardBoxParameters>): CardBoxParameters {
  return { ...CARD_BOX_CONFIGURATION.defaultParameters, ...overrides }
}

async function deleteBuild(build: {
  shape?: Shape3D
  body?: Shape3D
  accent?: Shape3D
  parts?: Array<{ shape: Shape3D }>
}): Promise<void> {
  const seen = new Set<Shape3D>()
  for (const candidate of [
    build.shape,
    build.body,
    build.accent,
    ...(build.parts ?? []).map((p) => p.shape),
  ]) {
    if (!candidate || seen.has(candidate)) continue
    seen.add(candidate)
    deleteShape(candidate)
  }
}

describe('card-box part builds at the parameter boundaries', () => {
  for (const [label, cardWidth, cardHeight, storageDepth] of [
    ['min', 40, 60, 20],
    ['max', 100, 150, 150],
  ] as const) {
    it(`builds all four parts at ${label} dimensions (${cardWidth}×${cardHeight}×${storageDepth})`, async () => {
      for (const part of ['box', 'lid', 'divider', 'cover'] as const) {
        const build = await buildCardBox(
          parameters({
            part,
            cardWidth,
            cardHeight,
            storageDepth,
          }),
        )
        try {
          // Accent-carrying parts export a body+accent compound; single
          // parts are one solid.
          expect(countSolids(build.shape)).toBeGreaterThanOrEqual(1)
          const bounds = build.shape.boundingBox.bounds
          expect(bounds[0]![2]!).toBeGreaterThanOrEqual(-0.01)
          expect(measureVolume(build.shape)).toBeGreaterThan(0)
        } finally {
          await deleteBuild(build)
        }
      }
    })
  }
})

describe('card-box card-size presets build with default parameters', () => {
  for (const preset of cardBoxDefinition.presets ?? []) {
    for (const part of ['assembly', 'cover'] as const) {
      it(`builds ${part} for preset ${preset.id}`, async () => {
        const build = await buildCardBox(
          parameters({
            ...(preset.overrides as Partial<CardBoxParameters>),
            part,
          }),
        )
        try {
          expect(measureVolume(build.shape)).toBeGreaterThan(0)
        } finally {
          await deleteBuild(build)
        }
      })
    }
  }
})

describe('card-box print orientation and assembly', () => {
  it('flips the lid flat-top-down for printing', async () => {
    const build = await buildCardBox(parameters({ part: 'lid' }))
    try {
      const bounds = build.shape.boundingBox.bounds
      expect(bounds[0]![2]!).toBeGreaterThanOrEqual(-0.01)
      expect(bounds[1]![2]!).toBeLessThanOrEqual(16.81)
      // The flat plate top lies on the bed: the widest cross-section (the
      // plate) sits at z ≈ 0.
      expect(bounds[0]![0]!).toBeCloseTo(-38.25, 1)
    } finally {
      await deleteBuild(build)
    }
  })

  it('assembles all four parts as separate solids in the assembled frame', async () => {
    const build = await buildCardBox(parameters({ part: 'assembly' }))
    try {
      // Box + lid contribute one solid each; the divider/cover compounds
      // carry their art glyphs as additional members.
      expect(countSolids(build.shape)).toBeGreaterThanOrEqual(4)
      const bounds = build.shape.boundingBox.bounds
      const expected = boundsForCardBox(parameters({ part: 'assembly' }))
      expect(bounds[0]![2]!).toBeGreaterThanOrEqual(-0.05)
      expect(bounds[1]![2]!).toBeLessThanOrEqual(expected.max[2]! + 0.05)
    } finally {
      await deleteBuild(build)
    }
  })
})

describe('card-box two-color 3MF', () => {
  it('exports a raised divider with text as a body/accent package', async () => {
    const params = parameters({
      part: 'divider',
      dividerText: 'TCG',
      dividerStyle: 'raised',
    })
    const build = await buildCardBoxDivider(params)
    try {
      if (build.kind !== 'accent') throw new Error('expected accent build')
      const fileName = cardBoxThreeMfFileName(params)
      expect(fileName).toMatch(/\.3mf$/)
      const meta = threeMfMetaFor('card-box', fileName!)
      const bytes = await exportThreeMfBytes(
        [
          { name: 'body', shape: build.body },
          { name: 'accent', shape: build.accent },
        ],
        {
          tolerance: 0.001,
          angularTolerance: 0.1,
          modelName: 'card-box',
          sourceFile: fileName!,
        },
        meta,
      )
      expect(isThreeMfPackage(bytes, threeMfExpectationFor(meta))).toBe(true)
    } finally {
      await deleteBuild(build)
    }
  })

  it('exports a flat cover with art as a body/accent package', async () => {
    const params = parameters({
      part: 'cover',
      coverStyle: 'flat',
      coverSubtitle: ' collection',
    })
    const build = await buildCardBoxCover(params)
    try {
      if (build.kind !== 'accent') throw new Error('expected accent build')
      const fileName = cardBoxThreeMfFileName(params)
      const meta = threeMfMetaFor('card-box', fileName!)
      const bytes = await exportThreeMfBytes(
        [
          { name: 'body', shape: build.body },
          { name: 'accent', shape: build.accent },
        ],
        {
          tolerance: 0.001,
          angularTolerance: 0.1,
          modelName: 'card-box',
          sourceFile: fileName!,
        },
        meta,
      )
      expect(isThreeMfPackage(bytes, threeMfExpectationFor(meta))).toBe(true)
    } finally {
      await deleteBuild(build)
    }
  })

  it('builds blank divider and cover as single parts', async () => {
    const blankDivider = await buildCardBoxDivider(
      parameters({ part: 'divider' }),
    )
    const blankCover = await buildCardBoxCover(
      parameters({ part: 'cover', coverTitle: '' }),
    )
    try {
      expect(blankDivider.kind).toBe('single')
      expect(blankCover.kind).toBe('single')
    } finally {
      await deleteBuild(blankDivider)
      await deleteBuild(blankCover)
    }
  })

  it('exports accent-carrying parts as combined geometry larger than the body', async () => {
    const build = await buildCardBoxDivider(
      parameters({ part: 'divider', dividerText: 'TCG' }),
    )
    try {
      if (build.kind !== 'accent') throw new Error('expected accent build')
      const combined = await buildCardBox(
        parameters({ part: 'divider', dividerText: 'TCG' }),
      )
      try {
        expect(measureVolume(combined.shape)).toBeGreaterThan(
          measureVolume(build.body),
        )
        expect(combined.parts).toHaveLength(2)
      } finally {
        await deleteBuild(combined)
      }
    } finally {
      await deleteBuild(build)
    }
  })

  it('cuts the lid rail groove flat through the mid band (z 115.92..118.08)', async () => {
    const build = await buildCardBox(parameters({ part: 'lid' }))
    try {
      // Inside the groove band (x 36.45..37.45) at a non-detent y: the
      // groove flat spans z 115.92..118.08, so this slab must be empty.
      const probe = makeBox([36.5, 19.9, 116.5], [37.4, 20.1, 117.5]) as Shape3D
      const intersection = build.shape.intersect(probe)
      try {
        expect(measureVolume(intersection)).toBeLessThan(0.001)
      } finally {
        intersection.delete()
        probe.delete()
      }
    } finally {
      await deleteBuild(build)
    }
  })

  it('throws a localized-coded error for divider text that cannot fit the tab', async () => {
    await expect(
      buildCardBoxDivider(
        parameters({
          part: 'divider',
          dividerText: 'THIS TEXT IS FAR TOO LONG TO FIT',
        }),
      ),
    ).rejects.toThrow('CARD_BOX_DIVIDER_TEXT_TOO_WIDE')
  })
})
