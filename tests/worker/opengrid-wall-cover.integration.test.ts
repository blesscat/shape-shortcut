import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  CompoundBlueprint,
  getOC,
  makeBox,
  measureVolume,
  textBlueprints,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import {
  buildOpenGridWallCoverWithFlatText,
  importOpenGridWallCoverReference,
  loadOpenGridWallCoverReference,
  OPEN_GRID_WALL_COVER_REFERENCE_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/builder'
import { assertOpenGridWallCoverShapeQuality } from '../../src/cad-kernel/components/opengrid-wall-cover/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  exportThreeMfBytes,
  isThreeMfPackage,
} from '../../src/cad-kernel/export'
import { OPENGRID_WALL_COVER_CONFIGURATION } from '../../src/cad-contract/units'
import { PLAYGROUND_GRID_PITCH } from '../../src/cad-contract/scene'
import { openGridSnapOpenConnectNotchSegmentsFor } from '../../src/cad-kernel/components/opengrid-snap/openconnect'
import {
  loadOpenGridWallCoverFont,
  makeOpenGridWallCoverTextGlyphShape,
  OPEN_GRID_WALL_COVER_FONT_URL,
  OPENGRID_WALL_COVER_TEXT_CONFIGURATION,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'

const wallCoverTextCases = [
  { text: 'A', coverCount: 1 },
  { text: 'IAN', coverCount: 3 },
  { text: '收納', coverCount: 2 },
  { text: '字', coverCount: 1 },
  { text: '嗎', coverCount: 1 },
  { text: '都會做', coverCount: 3 },
  { text: 'ABCDEFGH', coverCount: 8 },
] as const

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

function extent(bounds: number[][], axis: 0 | 1): number {
  return (bounds[1]?.[axis] ?? 0) - (bounds[0]?.[axis] ?? 0)
}

function volumeInBox(
  shape: Shape3D,
  min: [number, number, number],
  max: [number, number, number],
): number {
  const probe = makeBox(min, max)
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== shape) intersection.delete()
    probe.delete()
  }
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let count = 0
  try {
    while (explorer.More()) {
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

function deleteTextDrawings(drawings: ReturnType<typeof textBlueprints>): void {
  for (const drawing of drawings.blueprints) {
    if (drawing instanceof CompoundBlueprint) {
      drawing.blueprints.forEach((blueprint) => blueprint.delete())
    } else {
      drawing.delete()
    }
  }
}

function threeMfVertexBounds(xml: string): number[][] {
  const vertices = [
    ...xml.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g),
  ].map((match) => [Number(match[1]), Number(match[2]), Number(match[3])])
  if (vertices.length === 0) throw new Error('3mf-vertices-missing')
  return [
    [
      Math.min(...vertices.map((vertex) => vertex[0]!)),
      Math.min(...vertices.map((vertex) => vertex[1]!)),
      Math.min(...vertices.map((vertex) => vertex[2]!)),
    ],
    [
      Math.max(...vertices.map((vertex) => vertex[0]!)),
      Math.max(...vertices.map((vertex) => vertex[1]!)),
      Math.max(...vertices.map((vertex) => vertex[2]!)),
    ],
  ]
}

describe('OpenGrid Wall Cover supplied STEP', () => {
  beforeAll(async () => {
    await initialiseCadKernel(WASM_PATH)
    await loadOpenGridWallCoverFont(
      readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_FONT_URL)),
    )
  })

  afterAll(() => undefined)

  it('loads the supplied cover STEP as a nine-solid Lite reference', async () => {
    const reference = await loadOpenGridWallCoverReference(
      async () =>
        new Response(
          readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_REFERENCE_URL)),
          { status: 200 },
        ),
    )
    try {
      const bounds = shapeBounds(reference)
      expect(countSolids(reference)).toBe(9)
      expect(bounds[0]?.[0]).toBeCloseTo(-12.8, 2)
      expect(bounds[0]?.[1]).toBeCloseTo(-12.8, 2)
      expect(bounds[0]?.[2]).toBeCloseTo(0, 2)
      expect(bounds[1]?.[0]).toBeCloseTo(12.8, 2)
      expect(bounds[1]?.[1]).toBeCloseTo(12.8, 2)
      expect(bounds[1]?.[2]).toBeCloseTo(3.4, 2)
      expect(OPEN_GRID_WALL_COVER_REFERENCE_URL.pathname).toContain(
        'opengrid-snap-cover.step',
      )
    } finally {
      reference.delete()
    }
  })

  it('keeps cover text coplanar while retaining separate body/text parts', async () => {
    const reference = await importOpenGridWallCoverReference(
      new Blob([
        readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_REFERENCE_URL)),
      ]),
    )
    const generated = await buildOpenGridWallCoverWithFlatText(
      { text: 'A' },
      { getOpenGridWallCoverReference: async () => reference },
    )
    try {
      const bodyPart = generated.parts.find((part) => part.name === 'body')
      const textPart = generated.parts.find((part) => part.name === 'text')
      if (!bodyPart || !textPart) throw new Error('wall-cover-parts-missing')

      const bodyBounds = shapeBounds(bodyPart.shape)
      const textBounds = shapeBounds(textPart.shape)
      const expectedTop = 3.4
      const expectedBottom =
        expectedTop - OPENGRID_WALL_COVER_TEXT_CONFIGURATION.depth

      expect(countSolids(bodyPart.shape)).toBe(9)
      expect(countSolids(textPart.shape)).toBeGreaterThan(0)
      expect(textBounds[0]?.[2]).toBeCloseTo(expectedBottom, 2)
      expect(textBounds[1]?.[2]).toBeCloseTo(expectedTop, 2)
      expect(bodyBounds[1]?.[2]).toBeCloseTo(expectedTop, 2)
      expect(shapeBounds(generated.shape)[1]?.[2]).toBeCloseTo(expectedTop, 2)

      const bodyMesh = meshBRep(bodyPart.shape, {
        tolerance: 0.01,
        angularTolerance: 0.1,
      })
      const textMesh = meshBRep(textPart.shape, {
        tolerance: 0.01,
        angularTolerance: 0.1,
      })
      expect(() =>
        assertOpenGridWallCoverShapeQuality(
          generated.qualityShape,
          bodyPart.shape,
          textPart.shape,
          bodyMesh,
          textMesh,
          reference,
          { text: 'A' },
        ),
      ).not.toThrow()
    } finally {
      generated.shape.delete()
      generated.qualityShape.delete()
      for (const part of generated.parts) part.shape.delete()
      reference.delete()
    }
  })

  it('uses a large label scale for Latin and Traditional Chinese glyphs', async () => {
    const latin = await makeOpenGridWallCoverTextGlyphShape('A')
    const traditionalChinese = await makeOpenGridWallCoverTextGlyphShape('收')
    try {
      const latinBounds = shapeBounds(latin)
      const traditionalChineseBounds = shapeBounds(traditionalChinese)
      const usableLabelSize =
        OPENGRID_WALL_COVER_CONFIGURATION.coverWidth - 3.2 * 2

      expect(extent(latinBounds, 0)).toBeGreaterThan(10)
      expect(extent(latinBounds, 1)).toBeGreaterThan(12)
      expect(extent(traditionalChineseBounds, 0)).toBeGreaterThan(15)
      expect(extent(traditionalChineseBounds, 1)).toBeGreaterThan(15)
      expect(extent(traditionalChineseBounds, 0)).toBeLessThan(usableLabelSize)
      expect(extent(traditionalChineseBounds, 1)).toBeLessThan(usableLabelSize)
      expect(OPENGRID_WALL_COVER_TEXT_CONFIGURATION.fontFamily).toContain(
        'CJK TC',
      )
    } finally {
      latin.delete()
      traditionalChinese.delete()
    }
  })

  it.each(['我', '你', '嗎', '字', '體', '整', '合'] as const)(
    'preserves the complete font outline for %s',
    async (character) => {
      const actual = await makeOpenGridWallCoverTextGlyphShape(character)
      const drawings = textBlueprints(character, {
        fontSize: OPENGRID_WALL_COVER_TEXT_CONFIGURATION.fontSize,
        fontFamily: OPENGRID_WALL_COVER_TEXT_CONFIGURATION.fontFamily,
      })
      const sketches = drawings.sketchOnPlane()
      let expected: Shape3D | null = null
      try {
        expected = sketches.extrude(
          OPENGRID_WALL_COVER_TEXT_CONFIGURATION.depth,
        ) as Shape3D
        expect(measureVolume(actual)).toBeCloseTo(measureVolume(expected), 2)
      } finally {
        actual.delete()
        if (expected) expected.delete()
        for (const sketch of sketches.sketches) {
          try {
            sketch.delete()
          } catch {
            // Replicad may delete sketches while extruding them.
          }
        }
        deleteTextDrawings(drawings)
      }
    },
  )

  it.each(['我', '你', '嗎', '字', '體', '整', '合'] as const)(
    'retains the complete font outline after cover assembly for %s',
    async (character) => {
      const reference = await importOpenGridWallCoverReference(
        new Blob([
          readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_REFERENCE_URL)),
        ]),
      )
      const expected = await makeOpenGridWallCoverTextGlyphShape(character)
      const generated = await buildOpenGridWallCoverWithFlatText(
        { text: character },
        { getOpenGridWallCoverReference: async () => reference },
      )
      try {
        const textPart = generated.parts.find((part) => part.name === 'text')
        if (!textPart) throw new Error('wall-cover-text-part-missing')
        expect(measureVolume(textPart.shape)).toBeCloseTo(
          measureVolume(expected),
          2,
        )
      } finally {
        expected.delete()
        generated.shape.delete()
        generated.qualityShape.delete()
        for (const part of generated.parts) part.shape.delete()
        reference.delete()
      }
    },
  )

  it('cuts only the OpenConnect underside stepped opening from every cover', async () => {
    const reference = await importOpenGridWallCoverReference(
      new Blob([
        readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_REFERENCE_URL)),
      ]),
    )
    const text = 'IAN'
    const generated = await buildOpenGridWallCoverWithFlatText(
      { text },
      { getOpenGridWallCoverReference: async () => reference },
    )
    try {
      const bodyPart = generated.parts.find((part) => part.name === 'body')
      if (!bodyPart) throw new Error('wall-cover-body-part-missing')

      const notchSegments = openGridSnapOpenConnectNotchSegmentsFor('Lite')
      const coverStep =
        OPENGRID_WALL_COVER_CONFIGURATION.coverWidth +
        OPENGRID_WALL_COVER_CONFIGURATION.coverGap
      const centerOffset = ((Array.from(text).length - 1) * coverStep) / 2
      for (const [index] of Array.from(text).entries()) {
        const centerX = index * coverStep - centerOffset
        const notchVolumes = notchSegments.map(({ min, max }) =>
          volumeInBox(
            bodyPart.shape,
            [centerX + min[0] + 0.1, min[1] + 0.1, min[2] + 0.1],
            [centerX + max[0] - 0.1, max[1] - 0.1, max[2] - 0.1],
          ),
        )
        expect(notchVolumes.every((volume) => volume < 0.05)).toBe(true)

        const neighboringMaterialVolume = volumeInBox(
          bodyPart.shape,
          [centerX + 3, notchSegments[0]!.min[1] + 0.1, 2.0],
          [centerX + 4, notchSegments[0]!.max[1] - 0.1, 2.5],
        )
        expect(neighboringMaterialVolume).toBeGreaterThan(0.05)
      }
    } finally {
      generated.shape.delete()
      generated.qualityShape.delete()
      for (const part of generated.parts) part.shape.delete()
      reference.delete()
    }
  })

  it('can disable the OpenConnect underside stepped opening', async () => {
    const reference = await importOpenGridWallCoverReference(
      new Blob([
        readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_REFERENCE_URL)),
      ]),
    )
    const generated = await buildOpenGridWallCoverWithFlatText(
      { text: 'A', openConnect: false } as never,
      { getOpenGridWallCoverReference: async () => reference },
    )
    try {
      const bodyPart = generated.parts.find((part) => part.name === 'body')
      if (!bodyPart) throw new Error('wall-cover-body-part-missing')
      const segment = openGridSnapOpenConnectNotchSegmentsFor('Lite')[0]!
      const notchVolume = volumeInBox(
        bodyPart.shape,
        [segment.min[0] + 0.1, segment.min[1] + 0.1, segment.min[2] + 0.1],
        [segment.max[0] - 0.1, segment.max[1] - 0.1, segment.max[2] - 0.1],
      )
      expect(notchVolume).toBeGreaterThan(0.05)
    } finally {
      generated.shape.delete()
      generated.qualityShape.delete()
      for (const part of generated.parts) part.shape.delete()
      reference.delete()
    }
  })

  it.each(wallCoverTextCases)(
    'builds one independent cover for each character in $text',
    async ({ text: value, coverCount }) => {
      const reference = await importOpenGridWallCoverReference(
        new Blob([
          readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_REFERENCE_URL)),
        ]),
      )
      const generated = await buildOpenGridWallCoverWithFlatText(
        { text: value },
        { getOpenGridWallCoverReference: async () => reference },
      )
      try {
        const bodyPart = generated.parts.find((part) => part.name === 'body')
        const textPart = generated.parts.find((part) => part.name === 'text')
        if (!bodyPart || !textPart) throw new Error('wall-cover-parts-missing')

        const bounds = shapeBounds(generated.shape)
        const expectedWidth =
          (coverCount - 1) * PLAYGROUND_GRID_PITCH +
          OPENGRID_WALL_COVER_CONFIGURATION.coverWidth
        expect(bounds[0]?.[0]).toBeCloseTo(-expectedWidth / 2, 2)
        expect(bounds[1]?.[0]).toBeCloseTo(expectedWidth / 2, 2)
        expect(bounds[0]?.[1]).toBeCloseTo(-12.8, 2)
        expect(bounds[1]?.[1]).toBeCloseTo(12.8, 2)
        expect(countSolids(bodyPart.shape)).toBe(9 * coverCount)
        expect(countSolids(generated.qualityShape)).toBe(9 * coverCount)
        const bodyMesh = meshBRep(bodyPart.shape, {
          tolerance: 0.01,
          angularTolerance: 0.1,
        })
        const textMesh = meshBRep(textPart.shape, {
          tolerance: 0.01,
          angularTolerance: 0.1,
        })
        expect(textMesh.bounds.min[2]).toBeCloseTo(3.0, 2)
        expect(textMesh.bounds.max[2]).toBeCloseTo(3.4, 2)
        expect(() =>
          assertOpenGridWallCoverShapeQuality(
            generated.qualityShape,
            bodyPart.shape,
            textPart.shape,
            bodyMesh,
            textMesh,
            reference,
            { text: value },
          ),
        ).not.toThrow()

        if (
          coverCount === 1 ||
          coverCount === 2 ||
          coverCount === 3 ||
          coverCount === 8
        ) {
          const threeMf = await exportThreeMfBytes([
            { name: 'body', shape: bodyPart.shape },
            { name: 'text', shape: textPart.shape },
          ])
          const threeMfText = new TextDecoder().decode(new Uint8Array(threeMf))
          const packageBounds = threeMfVertexBounds(threeMfText)
          expect(isThreeMfPackage(threeMf)).toBe(true)
          expect(threeMfText.match(/<item objectid="3"/g)).toHaveLength(1)
          expect(threeMfText.match(/<part id="1"/g)).toHaveLength(1)
          expect(threeMfText.match(/<part id="2"/g)).toHaveLength(1)
          expect(threeMfText).toContain('key="filament_maps" value="1 2"')
          expect(packageBounds[0]?.[0]).toBeCloseTo(bounds[0]?.[0] ?? 0, 1)
          expect(packageBounds[1]?.[0]).toBeCloseTo(bounds[1]?.[0] ?? 0, 1)
          expect(packageBounds[0]?.[1]).toBeCloseTo(bounds[0]?.[1] ?? 0, 1)
          expect(packageBounds[1]?.[1]).toBeCloseTo(bounds[1]?.[1] ?? 0, 1)
          expect(packageBounds[0]?.[2]).toBeCloseTo(0, 1)
          expect(packageBounds[1]?.[2]).toBeCloseTo(3.4, 1)
        }
      } finally {
        generated.shape.delete()
        generated.qualityShape.delete()
        for (const part of generated.parts) part.shape.delete()
        reference.delete()
      }
    },
    60000,
  )
})
