import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import {
  buildOpenGridLabelTagWithParts,
  OPENGRID_LABEL_TAG_LAYOUT,
} from '../../src/cad-kernel/components/opengrid-label-tag/builder'
import { makeLabelTagIconShape } from '../../src/cad-kernel/components/opengrid-label-tag/icon-shape'
import { assertOpenGridLabelTagShapeQuality } from '../../src/cad-kernel/components/opengrid-label-tag/quality'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  exportThreeMfBytes,
  isThreeMfPackage,
  threeMfExpectationFor,
  threeMfMetaFor,
} from '../../src/cad-kernel/export'
import {
  boundsForOpenGridLabelTag,
  OPENGRID_LABEL_TAG_CONFIGURATION,
  OPENGRID_LABEL_TAG_ICON_IDS,
} from '../../src/cad-contract/units'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

const defaultParameters = {
  widthTier: 40,
  gripThickness: 1.2,
  icon: 'gear-fill',
} as const

function shapeBounds(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function deleteParts(parts: Array<{ name: string; shape: Shape3D }>): void {
  for (const part of parts) part.shape.delete()
}

describe('OpenGrid Label Tag generated geometry', () => {
  beforeAll(async () => {
    await initialiseCadKernel(WASM_PATH)
    await loadOpenGridWallCoverFont(
      readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_FONT_URL)),
    )
  })

  afterAll(() => undefined)

  it('builds the default tag as a flush two-part assembly within bounds', async () => {
    const result = await buildOpenGridLabelTagWithParts(defaultParameters, {})
    try {
      const expected = boundsForOpenGridLabelTag(defaultParameters)
      const body = result.parts.find((part) => part.name === 'body')!
      const accent = result.parts.find((part) => part.name === 'icon')!
      const bodyBounds = shapeBounds(body.shape)
      expect(bodyBounds[0]).toHaveLength(3)
      expect(bodyBounds[0]?.[0]).toBeCloseTo(expected.min[0], 2)
      expect(bodyBounds[0]?.[1]).toBeCloseTo(expected.min[1], 2)
      expect(bodyBounds[0]?.[2]).toBeCloseTo(expected.min[2], 2)
      expect(bodyBounds[1]?.[0]).toBeCloseTo(expected.max[0], 2)
      expect(bodyBounds[1]?.[1]).toBeCloseTo(expected.max[1], 2)
      expect(bodyBounds[1]?.[2]).toBeCloseTo(expected.max[2], 2)

      // The accent sits flush with the outward plate face (Z = 0, facing
      // away from the gripped panel) and stays within the plate footprint.
      const accentBounds = shapeBounds(accent.shape)
      expect(accentBounds[0]?.[2]).toBeCloseTo(0, 2)
      expect(accentBounds[1]?.[2]).toBeCloseTo(
        OPENGRID_LABEL_TAG_CONFIGURATION.accentDepth,
        2,
      )

      // The channel opening accepts the panel plus the fixed clearance.
      const channelSpan =
        OPENGRID_LABEL_TAG_CONFIGURATION.gripClearance +
        defaultParameters.gripThickness
      expect(channelSpan).toBeCloseTo(1.4, 6)
      expect(
        OPENGRID_LABEL_TAG_CONFIGURATION.clipEdgeEngagement,
      ).toBeGreaterThanOrEqual(5)

      assertOpenGridLabelTagShapeQuality(result.parts, defaultParameters)

      const accentMesh = meshBRep(accent.shape, {
        tolerance: 0.1,
        angularTolerance: 0.5,
      })
      expect(accentMesh.indices.length / 3).toBeGreaterThan(0)
    } finally {
      deleteParts(result.parts)
      result.qualityShape.delete()
    }
  })

  it('changes only the plate length across width tiers', async () => {
    const builds = []
    for (const widthTier of [20, 60] as const) {
      builds.push(
        buildOpenGridLabelTagWithParts({ ...defaultParameters, widthTier }, {}),
      )
    }
    const results = await Promise.all(builds)
    try {
      const boundsList = results.map((result) =>
        shapeBounds(result.parts.find((part) => part.name === 'body')!.shape),
      )
      expect(
        (boundsList[0]![1]![0] ?? 0) - (boundsList[0]![0]![0] ?? 0),
      ).toBeCloseTo(20, 2)
      expect(
        (boundsList[1]![1]![0] ?? 0) - (boundsList[1]![0]![0] ?? 0),
      ).toBeCloseTo(60, 2)
      for (const bounds of boundsList) {
        expect(bounds[0]?.[1]).toBeCloseTo(-8, 2)
        expect(bounds[1]?.[2]).toBeCloseTo(3.6, 2)
      }
    } finally {
      for (const result of results) {
        deleteParts(result.parts)
        result.qualityShape.delete()
      }
    }
  })

  it('renders every bundled icon as a non-empty flush solid', async () => {
    for (const iconId of OPENGRID_LABEL_TAG_ICON_IDS) {
      const shape = makeLabelTagIconShape(iconId)
      try {
        const bounds = shapeBounds(shape)
        expect(bounds[1]?.[2] ?? 0).toBeCloseTo(
          OPENGRID_LABEL_TAG_CONFIGURATION.accentDepth,
          2,
        )
        expect((bounds[1]?.[0] ?? 0) - (bounds[0]?.[0] ?? 0)).toBeGreaterThan(0)
        expect((bounds[1]?.[1] ?? 0) - (bounds[0]?.[1] ?? 0)).toBeGreaterThan(0)
      } finally {
        shape.delete()
      }
    }
  })

  it('keeps text glyphs in the accent part for two-part output', async () => {
    const parameters = { ...defaultParameters, text: '螺絲' }
    const result = await buildOpenGridLabelTagWithParts(parameters, {})
    try {
      expect(result.parts.map((part) => part.name)).toEqual(['body', 'icon'])
      assertOpenGridLabelTagShapeQuality(result.parts, parameters)
      const accentBounds = shapeBounds(
        result.parts.find((part) => part.name === 'icon')!.shape,
      )
      expect(accentBounds[0]?.[2]).toBeCloseTo(0, 2)
      expect(accentBounds[1]?.[2]).toBeCloseTo(
        OPENGRID_LABEL_TAG_CONFIGURATION.accentDepth,
        2,
      )
    } finally {
      deleteParts(result.parts)
      result.qualityShape.delete()
    }
  })

  it('exports a structurally valid label tag 3MF package', async () => {
    const result = await buildOpenGridLabelTagWithParts(defaultParameters, {})
    try {
      const body = result.parts.find((part) => part.name === 'body')!
      const accent = result.parts.find((part) => part.name === 'icon')!
      const fileName = 'opengrid-label-tag-w40-g1.2-gear-fill.3mf'
      const meta = threeMfMetaFor('opengrid-label-tag', fileName)
      expect(meta.accentPartName).toBe('icon')
      expect(meta.sourceFileName).toBe(fileName)
      const bytes = await exportThreeMfBytes(
        [
          { name: 'body', shape: body.shape },
          { name: 'icon', shape: accent.shape },
        ],
        { tolerance: 0.1, angularTolerance: 0.5 },
        meta,
      )
      expect(bytes.byteLength).toBeGreaterThan(0)
      expect(isThreeMfPackage(bytes, threeMfExpectationFor(meta))).toBe(true)
      // The wall-cover expectation must reject a label-tag package.
      expect(isThreeMfPackage(bytes)).toBe(false)
    } finally {
      deleteParts(result.parts)
      result.qualityShape.delete()
    }
  })

  it('uses a centered preview layout with the opening facing +Y', () => {
    const config = OPENGRID_LABEL_TAG_CONFIGURATION
    expect(config.plateThickness).toBe(0.6)
    expect(config.plateHangLength).toBe(10)
    expect(config.gripClearance).toBe(0.2)
    expect(OPENGRID_LABEL_TAG_LAYOUT.centerYShift).toBe(2)
  })
})
