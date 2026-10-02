import { importSTEP, type Shape3D } from 'replicad'
import type {
  OpenGridParameters,
  OpenGridVariant,
} from '../../../cad-contract/units'
import {
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  OPENGRID_CONFIGURATION,
} from './profile'
import { deleteShape } from '../../lifetime/dispose'
import { fuseBalanced, fuseByStrategy } from './assembly'
import { buildFlatBridgeTile } from './bridges'
import { buildCanonicalTile, mirrorSurfaceWithinLayer } from './tiles'
import {
  assertGenerationCurrent,
  OPENGRID_PROTOTYPE_TEMPLATE_URLS,
  reportProgress,
  yieldAtSafeBoundary,
  type OpenGridBuildContext,
} from './builder'
async function buildOpenGridPrototypeShape(
  variant: OpenGridVariant,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const parameters: OpenGridParameters = {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    variant,
    rows: 1,
    columns: 1,
    chamfers: 'none',
    connectorHoles: 'none',
    screwMode: 'none',
  }
  const startedAt = performance.now()

  if (variant === 'Full' || variant === 'Lite') {
    const thickness = OPENGRID_CONFIGURATION.variants[variant].thickness
    const prototype = await buildCanonicalTile(variant, thickness, context)
    context.reportPhase?.('prototype-build', performance.now() - startedAt)
    return prototype
  }

  const layerThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  let lower: Shape3D | null = null
  let upper: Shape3D | null = null
  let bridge: Shape3D | null = null
  try {
    lower = await buildCanonicalTile('Heavy', layerThickness, context)
    const mirroredLower = mirrorSurfaceWithinLayer(lower, layerThickness)
    if (mirroredLower !== lower) deleteShape(lower)
    lower = mirroredLower

    upper = await buildCanonicalTile('Heavy', layerThickness, context)
    const translatedUpper = upper.translate(
      0,
      0,
      layerThickness + OPENGRID_CONFIGURATION.heavyGap,
    )
    if (translatedUpper !== upper) deleteShape(upper)
    upper = translatedUpper

    bridge = await fuseBalanced(
      buildFlatBridgeTile(0, 0, layerThickness, context.booleanOperations),
      context,
    )
    const prototype = await fuseBalanced([lower, bridge, upper], context)
    lower = null
    bridge = null
    upper = null
    context.reportPhase?.('prototype-build', performance.now() - startedAt)
    return prototype
  } catch (error) {
    deleteShape(lower)
    deleteShape(bridge)
    deleteShape(upper)
    throw error
  }
}

export function buildOpenGridPrototype(
  variant: OpenGridVariant,
  context: OpenGridBuildContext = {},
): Promise<Shape3D> {
  return buildOpenGridPrototypeShape(variant, context)
}

function assertPrototypeTemplateBounds(
  shape: Shape3D,
  variant: OpenGridVariant,
): void {
  const actual = shape.boundingBox
  try {
    const [actualMin, actualMax] = actual.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    const expected = boundsForOpenGrid({ variant, rows: 1, columns: 1 })
    const matches = [...actualMin, ...actualMax].every((value, index) => {
      const expectedValue = [...expected.min, ...expected.max][index]
      return Math.abs(value - expectedValue) <= 0.05
    })
    if (!matches) throw new Error('OPENGRID_TEMPLATE_INVALID_BOUNDS')
  } finally {
    actual.delete()
  }
}

export async function importOpenGridPrototypeTemplate(
  blob: Blob,
  variant: OpenGridVariant,
): Promise<Shape3D> {
  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('OPENGRID_TEMPLATE_INVALID')
  }

  try {
    assertPrototypeTemplateBounds(imported, variant)
    return imported
  } catch (error) {
    deleteShape(imported)
    throw error
  }
}

export async function loadOpenGridPrototypeTemplate(
  variant: OpenGridVariant,
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPENGRID_PROTOTYPE_TEMPLATE_URLS[variant])
  if (!response.ok) throw new Error('OPENGRID_TEMPLATE_LOAD_FAILED')
  return importOpenGridPrototypeTemplate(await response.blob(), variant)
}

async function buildPrototypeTemplateAssembly(
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  let prototype: Shape3D | null = null
  let ownsPrototype = false
  const rows: Shape3D[][] = []
  const totalCells = parameters.rows * parameters.columns
  let completed = 0

  try {
    if (context.getOpenGridPrototype) {
      prototype = await context.getOpenGridPrototype(parameters.variant)
    } else {
      prototype = await buildOpenGridPrototypeShape(parameters.variant, context)
      ownsPrototype = true
    }

    reportProgress(context, 0, totalCells)
    for (let row = 0; row < parameters.rows; row += 1) {
      const rowPieces: Shape3D[] = []
      rows.push(rowPieces)
      for (let column = 0; column < parameters.columns; column += 1) {
        assertGenerationCurrent(context)
        const [centerX, centerY] = cellCenterForOpenGrid(
          parameters,
          row,
          column,
        )
        const cloned = prototype.clone()
        const translated = cloned.translate(centerX, centerY, 0)
        if (translated !== cloned) deleteShape(cloned)
        rowPieces.push(translated)
        completed += 1
        reportProgress(context, completed, totalCells)
        await yieldAtSafeBoundary(context)
      }
    }

    const result = await fuseByStrategy(rows, 'prototype-template', context)
    rows.length = 0
    return result
  } catch (error) {
    for (const row of rows) {
      for (const piece of row) deleteShape(piece)
    }
    throw error
  } finally {
    if (ownsPrototype) deleteShape(prototype)
  }
}

export { buildPrototypeTemplateAssembly }
