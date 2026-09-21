import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { buildOpenGridLabelCardWithParts } from '../../src/cad-kernel/components/opengrid-label-card/builder'
import { assertOpenGridLabelCardShapeQuality } from '../../src/cad-kernel/components/opengrid-label-card/quality'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import {
  exportThreeMfBytes,
  isThreeMfPackage,
  threeMfExpectationFor,
  threeMfMetaFor,
} from '../../src/cad-kernel/export'
import {
  boundsForOpenGridLabelCard,
  OPENGRID_LABEL_CARD_CONFIGURATION,
  OPENGRID_LABEL_CARD_ICON_IDS,
} from '../../src/cad-contract/units'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

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

beforeAll(async () => {
  await initialiseCadKernel(WASM_PATH)
  await loadOpenGridWallCoverFont(
    readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_FONT_URL)),
  )
})

describe('OpenGrid Label Card generated geometry', () => {
  afterAll(() => undefined)

  it('builds a raised card within bounds with a protruding flush-based accent', async () => {
    const parameters = {
      widthTier: 40,
      style: 'raised',
      iconPosition: 'left',
      icon: 'gear-fill',
    } as const
    const result = await buildOpenGridLabelCardWithParts(parameters, {})
    try {
      const expected = boundsForOpenGridLabelCard(parameters)
      const body = result.parts.find((part) => part.name === 'body')!
      const accent = result.parts.find((part) => part.name === 'accent')!
      const bodyBounds = shapeBounds(body.shape)
      expect(bodyBounds[1]?.[0]).toBeCloseTo(expected.max[0], 2)
      expect(bodyBounds[1]?.[2]).toBeCloseTo(0.6, 2)
      const accentBounds = shapeBounds(accent.shape)
      expect(accentBounds[0]?.[2]).toBeCloseTo(0.6, 2)
      expect(accentBounds[1]?.[2]).toBeCloseTo(1.0, 2)
      assertOpenGridLabelCardShapeQuality(result.parts, parameters)
    } finally {
      deleteParts(result.parts)
      result.qualityShape.delete()
      result.shape.delete()
    }
  })

  it('builds a flat card with the accent flush at the plate face', async () => {
    const parameters = {
      widthTier: 30,
      style: 'flat',
      iconPosition: 'left',
      icon: 'wrench',
      text: 'M3',
    } as const
    const result = await buildOpenGridLabelCardWithParts(parameters, {})
    try {
      const accent = result.parts.find((part) => part.name === 'accent')!
      const accentBounds = shapeBounds(accent.shape)
      expect(accentBounds[1]?.[2]).toBeCloseTo(0.6, 2)
      expect(accentBounds[0]?.[2]).toBeCloseTo(0.3, 2)
      assertOpenGridLabelCardShapeQuality(result.parts, parameters)
    } finally {
      deleteParts(result.parts)
      result.qualityShape.delete()
      result.shape.delete()
    }
  })

  it(
    'extrudes every bundled icon as a non-empty card accent',
    { timeout: 180_000 },
    async () => {
      for (const iconId of OPENGRID_LABEL_CARD_ICON_IDS) {
        const parameters = {
          widthTier: 40,
          style: 'flat',
          iconPosition: 'left',
          icon: iconId,
        } as const
        const result = await buildOpenGridLabelCardWithParts(parameters, {})
        try {
          assertOpenGridLabelCardShapeQuality(result.parts, parameters)
        } finally {
          deleteParts(result.parts)
          result.qualityShape.delete()
        }
      }
    },
  )

  it('exports a structurally valid label card 3MF package', async () => {
    const parameters = {
      widthTier: 40,
      style: 'raised',
      iconPosition: 'left',
      icon: 'gear-fill',
    } as const
    const result = await buildOpenGridLabelCardWithParts(parameters, {})
    try {
      const body = result.parts.find((part) => part.name === 'body')!
      const accent = result.parts.find((part) => part.name === 'accent')!
      const fileName = 'opengrid-label-card-w40-raised-gear-fill.3mf'
      const meta = threeMfMetaFor('opengrid-label-card', fileName)
      expect(meta.accentPartName).toBe('accent')
      const bytes = await exportThreeMfBytes(
        [
          { name: 'body', shape: body.shape },
          { name: 'accent', shape: accent.shape },
        ],
        { tolerance: 0.1, angularTolerance: 0.5 },
        meta,
      )
      expect(bytes.byteLength).toBeGreaterThan(0)
      expect(isThreeMfPackage(bytes, threeMfExpectationFor(meta))).toBe(true)
      expect(isThreeMfPackage(bytes)).toBe(false)
    } finally {
      deleteParts(result.parts)
      result.qualityShape.delete()
      result.shape.delete()
    }
  })

  it('reports the shared card envelope constants', () => {
    const config = OPENGRID_LABEL_CARD_CONFIGURATION
    expect(config.plateThickness).toBe(0.6)
    expect(config.cardHeight).toBe(10)
    expect(config.raisedHeight).toBe(0.4)
  })
})

it.each(['left', 'right'] as const)(
  'places %s icon beside actual 7mm text',
  async (iconPosition) => {
    const { makeOpenGridLabelCardTextShape } =
      await import('../../src/cad-kernel/components/opengrid-label-card/flat-text')
    const { makeBox, measureVolume } = await import('replicad')
    const text = await makeOpenGridLabelCardTextShape('田田', { depth: 0.4 })
    const textBounds = text!.boundingBox
    try {
      expect(textBounds.bounds[1][1] - textBounds.bounds[0][1]).toBeCloseTo(
        7,
        2,
      )
    } finally {
      textBounds.delete()
      text!.delete()
    }
    const p = {
      gridUnits: 4,
      style: 'raised' as const,
      icon: 'gear-fill' as const,
      text: '田田',
      iconPosition,
    }
    const built = await buildOpenGridLabelCardWithParts(p, {})
    try {
      const accent = built.parts.find((part) => part.name === 'accent')!.shape
      for (const side of ['left', 'right']) {
        const minX = side === 'left' ? -12 : 5
        const probe = makeBox([minX, 3.2, 0.65], [minX + 7, 3.45, 0.95])
        const intersection = accent.intersect(probe)
        try {
          const volume = Math.abs(measureVolume(intersection))
          if (side === iconPosition) expect(volume).toBeLessThan(1e-5)
          else expect(volume).toBeGreaterThan(0.01)
        } finally {
          intersection.delete()
          probe.delete()
        }
      }
    } finally {
      built.shape.delete()
      built.qualityShape.delete()
      for (const part of built.parts) part.shape.delete()
    }
  },
)

it.each([4, 5.5, 7])(
  'builds centered text-only cards at %s mm height',
  async (textHeight) => {
    const parameters = {
      gridUnits: 4,
      style: 'flat',
      icon: 'none',
      iconPosition: 'right',
      text: '中文',
      textHeight,
    } as const
    const result = await buildOpenGridLabelCardWithParts(parameters, {})
    try {
      const accent = result.parts.find((part) => part.name === 'accent')!
      const bounds = shapeBounds(accent.shape)
      expect(bounds[1][1] - bounds[0][1]).toBeCloseTo(textHeight, 2)
      expect(bounds[1][0] + bounds[0][0]).toBeCloseTo(0, 2)
      assertOpenGridLabelCardShapeQuality(result.parts, parameters)
      const meta = threeMfMetaFor('opengrid-label-card', 'test.3mf')
      expect(
        isThreeMfPackage(
          await exportThreeMfBytes(result.parts, undefined, meta),
          threeMfExpectationFor(meta),
        ),
      ).toBe(true)
    } finally {
      deleteParts(result.parts)
      result.shape.delete()
      result.qualityShape.delete()
    }
  },
)
it('builds a blank card when both icon and text are absent', async () => {
  const parameters = {
    gridUnits: 4,
    style: 'raised',
    icon: 'none',
    iconPosition: 'left',
  } as const
  const result = await buildOpenGridLabelCardWithParts(parameters, {})
  try {
    expect(result.parts.map((part) => part.name)).toEqual(['body'])
    assertOpenGridLabelCardShapeQuality(result.parts, parameters)
  } finally {
    deleteParts(result.parts)
    result.shape.delete()
    result.qualityShape.delete()
  }
})

it('preserves flat Chinese card material volumes in export meshes', async () => {
  const { meshBRep } = await import('../../src/cad-kernel/mesh')
  const { measureVolume } = await import('replicad')
  const result = await buildOpenGridLabelCardWithParts(
    {
      gridUnits: 4,
      style: 'flat',
      icon: 'gear-fill',
      iconPosition: 'left',
      text: '中文',
    },
    {},
  )
  try {
    for (const part of result.parts) {
      const mesh = meshBRep(part.shape, {
        tolerance: 0.1,
        angularTolerance: 0.5,
      })
      let volume = 0
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const points = [0, 1, 2].map((j) =>
          Array.from(
            mesh.positions.slice(
              mesh.indices[i + j] * 3,
              mesh.indices[i + j] * 3 + 3,
            ),
          ),
        )
        const [a, b, c] = points
        volume +=
          (a[0] * (b[1] * c[2] - b[2] * c[1]) +
            a[1] * (b[2] * c[0] - b[0] * c[2]) +
            a[2] * (b[0] * c[1] - b[1] * c[0])) /
          6
      }
      expect(volume).toBeCloseTo(measureVolume(part.shape), 1)
      const edges = new Map<string, number>()
      const edgeDirections = new Map<string, number>()
      const pointKey = (index: number) =>
        Array.from(mesh.positions.slice(index * 3, index * 3 + 3))
          .map((value) => value.toFixed(5))
          .join(',')
      for (let i = 0; i < mesh.indices.length; i += 3) {
        for (let j = 0; j < 3; j++) {
          const a = pointKey(mesh.indices[i + j])
          const b = pointKey(mesh.indices[i + ((j + 1) % 3)])
          const key = [a, b].sort().join('|')
          edges.set(key, (edges.get(key) ?? 0) + 1)
          edgeDirections.set(
            key,
            (edgeDirections.get(key) ?? 0) + (a < b ? 1 : -1),
          )
        }
      }
      expect([...edges.values()].filter((count) => count !== 2)).toEqual([])
      expect(
        [...edgeDirections.values()].filter((value) => value !== 0),
      ).toEqual([])
    }
  } finally {
    deleteParts(result.parts)
    result.shape.delete()
    result.qualityShape.delete()
  }
})
