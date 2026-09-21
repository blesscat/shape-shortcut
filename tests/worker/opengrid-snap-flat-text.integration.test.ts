import { DEFAULT_MODEL_COLORS } from '../../src/cad-contract/model-colors'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getOC, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import {
  buildOpenGridWallCoverWithFlatText,
  importOpenGridWallCoverReference,
  OPEN_GRID_WALL_COVER_REFERENCE_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/builder'
import { assertOpenGridWallCoverShapeQuality } from '../../src/cad-kernel/components/opengrid-wall-cover/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  exportThreeMfBytes,
  isThreeMfPackage,
} from '../../src/cad-kernel/export'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
  OPENGRID_WALL_COVER_TEXT_CONFIGURATION,
  openGridWallCoverTextTopZ,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import { THREE_MF_BUILD_TRANSFORM } from '../../src/cad-contract/three-mf'

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

function wallCoverReferenceBlob(): Blob {
  return new Blob([
    readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_REFERENCE_URL)),
  ])
}

describe('OpenGrid Wall Cover flat text POC', () => {
  beforeAll(async () => {
    await initialiseCadKernel(WASM_PATH)
    await loadOpenGridWallCoverFont(
      readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_FONT_URL)),
    )
  })

  afterAll(() => undefined)

  it('keeps SNAP text coplanar while retaining body and text parts', async () => {
    const reference = await importOpenGridWallCoverReference(
      wallCoverReferenceBlob(),
    )
    const generated = await buildOpenGridWallCoverWithFlatText(
      { text: 'SNAP' },
      { getOpenGridWallCoverReference: async () => reference },
    )
    try {
      const bodyPart = generated.parts.find((part) => part.name === 'body')
      const textPart = generated.parts.find((part) => part.name === 'text')
      if (!bodyPart || !textPart) throw new Error('flat-text-parts-missing')

      const bodyBounds = shapeBounds(bodyPart.shape)
      const textBounds = shapeBounds(textPart.shape)
      const expectedTop = openGridWallCoverTextTopZ()
      const expectedBottom =
        expectedTop - OPENGRID_WALL_COVER_TEXT_CONFIGURATION.depth
      const expectedWidth = 4 * 25.6 + 3 * 3
      expect(shapeBounds(generated.shape)[0]?.[0]).toBeCloseTo(
        -expectedWidth / 2,
        2,
      )
      expect(shapeBounds(generated.shape)[1]?.[0]).toBeCloseTo(
        expectedWidth / 2,
        2,
      )
      expect(countSolids(bodyPart.shape)).toBe(9 * 4)
      expect(countSolids(textPart.shape)).toBeGreaterThan(0)
      expect(textBounds[0]?.[2]).toBeCloseTo(expectedBottom, 2)
      expect(textBounds[1]?.[2]).toBeCloseTo(expectedTop, 2)
      expect(bodyBounds[1]?.[2]).toBeCloseTo(expectedTop, 2)
      expect(shapeBounds(generated.shape)[1]?.[2]).toBeCloseTo(expectedTop, 2)

      const baseMesh = meshBRep(bodyPart.shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      const qualityMesh = meshBRep(generated.qualityShape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      expect(baseMesh.triangleCount).toBeGreaterThan(0)
      const textMesh = meshBRep(textPart.shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      expect(() =>
        assertOpenGridWallCoverShapeQuality(
          generated.qualityShape,
          bodyPart.shape,
          textPart.shape,
          qualityMesh,
          textMesh,
          reference,
          { text: 'SNAP' },
        ),
      ).not.toThrow()

      const threeMf = await exportThreeMfBytes([
        { name: 'body', shape: bodyPart.shape },
        { name: 'text', shape: textPart.shape },
      ])
      expect(isThreeMfPackage(threeMf)).toBe(true)
      const threeMfText = new TextDecoder().decode(new Uint8Array(threeMf))
      expect(threeMfText).toContain('3D/3dmodel.model')
      expect(threeMfText).toContain('3D/Objects/object_1.model')
      expect(threeMfText).toContain('<object id="3"')
      expect(threeMfText).toContain('<component')
      expect(threeMfText).toContain(
        `transform="${THREE_MF_BUILD_TRANSFORM}" printable="1"`,
      )
      expect(threeMfText).toContain('Metadata/project_settings.config')
      expect(threeMfText).toContain('Metadata/model_settings.config')
      expect(threeMfText).toMatch(/"printer_model"\s*:\s*"Bambu Lab A1"/)
      expect(threeMfText).toContain(
        `"filament_colour": ["${DEFAULT_MODEL_COLORS.primary}", "${DEFAULT_MODEL_COLORS.secondary}"]`,
      )
      expect(threeMfText).toContain('Wall Cover Body')
      expect(threeMfText).toContain('Wall Cover Text')
      expect(threeMfText).toContain('opengrid-wall-cover.3mf')
      expect(threeMfText).toContain('key="filament_maps" value="1 2"')
      expect(threeMfText).toContain('<part id="1"')
      expect(threeMfText).toContain('<part id="2"')
      expect(threeMfText).toContain('<model_instance>')
      expect(threeMfText).toContain('<assemble_item')
      expect(threeMfText).toContain('key="extruder" value="1"')
      expect(threeMfText).toContain('key="extruder" value="2"')
    } finally {
      generated.shape.delete()
      generated.qualityShape.delete()
      for (const part of generated.parts) part.shape.delete()
      reference.delete()
    }
  }, 30000)
})
