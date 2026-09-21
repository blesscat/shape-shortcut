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
      gridUnits: 4,
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
      gridUnits: 3,
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
          gridUnits: 4,
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
      gridUnits: 4,
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

it('exports connected indexed surfaces for flat Chinese cards', async () => {
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
    const bytes = await exportThreeMfBytes(
      result.parts,
      undefined,
      threeMfMetaFor('opengrid-label-card', 'label.3mf'),
    )
    const xml = new TextDecoder().decode(bytes)
    const meshes = [...xml.matchAll(/<mesh>([\s\S]*?)<\/mesh>/g)]
    expect(meshes).toHaveLength(2)
    for (const [, mesh] of meshes) {
      const edges = new Map<string, number>()
      for (const triangle of mesh.matchAll(
        /<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\/>/g,
      )) {
        const ids = triangle.slice(1).map(Number)
        expect(new Set(ids).size).toBe(3)
        for (let i = 0; i < 3; i++) {
          const key = [ids[i], ids[(i + 1) % 3]].sort((a, b) => a - b).join(',')
          edges.set(key, (edges.get(key) ?? 0) + 1)
        }
      }
      expect(edges.size).toBeGreaterThan(0)
      expect([...edges.values()].filter((count) => count !== 2)).toEqual([])
    }
  } finally {
    deleteParts(result.parts)
    result.shape.delete()
    result.qualityShape.delete()
  }
})

it('keeps the camera icon upright with its indicator at upper left', async () => {
  const { makeLabelCardIconShape } =
    await import('../../src/cad-kernel/components/opengrid-label-card/icon-shape')
  const { makeBox, measureVolume } = await import('replicad')
  const camera = makeLabelCardIconShape('camera', 0.3)
  try {
    for (const [x, y, occupied] of [
      [-2.06, 0.56, true],
      [-2.06, -0.56, false],
      [1.6, 2.1, false],
      [1.6, -2.1, true],
    ] as const) {
      const probe = makeBox(
        [x - 0.04, y - 0.04, 0.05],
        [x + 0.04, y + 0.04, 0.25],
      )
      const intersection = camera.intersect(probe)
      try {
        const volume = Math.abs(measureVolume(intersection))
        if (occupied) expect(volume).toBeGreaterThan(0.001)
        else expect(volume).toBeLessThan(1e-6)
      } finally {
        intersection.delete()
        probe.delete()
      }
    }
  } finally {
    camera.delete()
  }
})

it.each([
  ['left', 'right', 'none', 'left'],
  ['center', 'left', 'drive-phillips', 'left'],
  ['right', 'center', 'hole-counterbore', 'right'],
] as const)(
  'aligns top %s and bottom %s independently beside %s',
  async (textAlignment, textLine2Alignment, icon, iconPosition) => {
    const { makeBox } = await import('replicad')
    const { OPENGRID_LABEL_GRID, openGridLabelWidthFor } =
      await import('../../src/cad-contract/units/opengrid-label-shared')
    const parameters = {
      gridUnits: 4,
      style: 'raised',
      icon,
      iconPosition,
      text: '田',
      textLine2: 'M3',
      textHeight: 4,
      textAlignment,
      textLine2Alignment,
    } as const
    const result = await buildOpenGridLabelCardWithParts(parameters, {})
    try {
      assertOpenGridLabelCardShapeQuality(result.parts, parameters)
      const accent = result.parts.find((part) => part.name === 'accent')!.shape
      const half =
        openGridLabelWidthFor(parameters.gridUnits) / 2 -
        OPENGRID_LABEL_GRID.artworkSideInset
      let left = -half,
        right = half
      if (icon !== 'none') {
        const iconSpace =
          OPENGRID_LABEL_GRID.iconSize + OPENGRID_LABEL_GRID.iconTextGap
        if (iconPosition === 'left') left += iconSpace
        else right -= iconSpace
      }
      for (const [top, alignment] of [
        [true, textAlignment],
        [false, textLine2Alignment],
      ] as const) {
        const clip = makeBox(
          [left - 0.001, top ? 0 : -5, 0.6],
          [right + 0.001, top ? 5 : 0, 1],
        )
        const row = accent.intersect(clip)
        try {
          const bounds = shapeBounds(row)
          expect(bounds[1][1] - bounds[0][1]).toBeCloseTo(
            parameters.textHeight,
            2,
          )
          if (alignment === 'left') expect(bounds[0][0]).toBeCloseTo(left, 2)
          if (alignment === 'center')
            expect((bounds[0][0] + bounds[1][0]) / 2).toBeCloseTo(
              (left + right) / 2,
              2,
            )
          if (alignment === 'right') expect(bounds[1][0]).toBeCloseTo(right, 2)
          if (top)
            expect(bounds[0][1]).toBeCloseTo(
              OPENGRID_LABEL_CARD_CONFIGURATION.textRowGap / 2,
              2,
            )
          else
            expect(bounds[1][1]).toBeCloseTo(
              -OPENGRID_LABEL_CARD_CONFIGURATION.textRowGap / 2,
              2,
            )
        } finally {
          row.delete()
          clip.delete()
        }
      }
      expect(
        isThreeMfPackage(
          await exportThreeMfBytes(
            result.parts,
            undefined,
            threeMfMetaFor('opengrid-label-card', 'rows.3mf'),
          ),
          threeMfExpectationFor(
            threeMfMetaFor('opengrid-label-card', 'rows.3mf'),
          ),
        ),
      ).toBe(true)
    } finally {
      deleteParts(result.parts)
      result.shape.delete()
      result.qualityShape.delete()
    }
  },
)
