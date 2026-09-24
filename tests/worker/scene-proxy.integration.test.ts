import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setOC } from 'replicad'

import {
  HSW_CELL_CONFIGURATION,
  OPENGRID_CONFIGURATION,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_SNAP_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_WALL_COVER_CONFIGURATION,
  PILLAR_CONFIGURATION,
  PROTOTYPE_CONFIGURATION,
  TISSUE_BOX_DEFAULTS,
  boundsForModel,
  validateModelParameters,
  type ModelId,
  type ModelParameterValues,
} from '../../src/cad-contract/units'
import { meshBRep } from '../../src/cad-kernel/mesh'
import { buildProxyBRep } from '../../src/cad-kernel/scene/proxy'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const WASM_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../node_modules/replicad-opencascadejs/src/replicad_single.wasm',
)

const PROXY_MESH_CONFIG = { tolerance: 0.001, angularTolerance: 0.05 }

const CASES: Array<{ modelId: ModelId; parameters: ModelParameterValues }> = [
  {
    modelId: 'box',
    parameters: { ...PROTOTYPE_CONFIGURATION.defaultDimensions },
  },
  { modelId: 'modular-grid-base', parameters: { rows: 2, columns: 3 } },
  { modelId: 'hsw-cell', parameters: { rows: 2, columns: 2 } },
  {
    modelId: 'hexagonal-column',
    parameters: { height: 40, count: 2, gap: 2, orientation: 'standing' },
  },
  {
    modelId: 'hexagonal-column',
    parameters: { height: 40, count: 2, gap: 2, orientation: 'lying' },
  },
  {
    modelId: 'opengrid',
    parameters: { ...OPENGRID_CONFIGURATION.defaultParameters },
  },
  {
    modelId: 'opengrid-stackable-box',
    parameters: {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 1,
      height: 40,
    },
  },
  {
    modelId: 'opengrid-organizer-box',
    parameters: { ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS },
  },
  {
    modelId: 'opengrid-stackable-cylinder',
    parameters: { ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS },
  },
  {
    modelId: 'opengrid-snap',
    parameters: { ...OPENGRID_SNAP_CONFIGURATION.defaultParameters },
  },
  {
    modelId: 'opengrid-wall-cover',
    parameters: { ...OPENGRID_WALL_COVER_CONFIGURATION.defaultParameters },
  },
  { modelId: 'opengrid-snap-remover', parameters: {} },
  {
    modelId: 'opengrid-divider',
    parameters: { ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters },
  },
  {
    modelId: 'opengrid-pillar',
    parameters: { ...PILLAR_CONFIGURATION.defaultParameters },
  },
  {
    modelId: 'opengrid-open-shelf',
    parameters: { ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS },
  },
  {
    modelId: 'opengrid-openconnect-shelf',
    parameters: { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS },
  },
  {
    modelId: 'opengrid-openconnect-organizer',
    parameters: {
      ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    },
  },
  {
    modelId: 'opengrid-openconnect-tissue-box',
    parameters: { ...TISSUE_BOX_DEFAULTS },
  },
]

const BOUNDS_TOLERANCE = 0.01
/**
 * Envelope proxies must stay far below any full-detail triangle count
 * (full OpenGrid components mesh in the tens of thousands); the coarse
 * cylinder tessellation dominates this budget.
 */
const MAX_PROXY_TRIANGLE_COUNT = 2500

describe('scene proxy B-Reps', () => {
  beforeAll(async () => {
    const openCascade = await initialiseOpenCascade({
      locateFile: () => WASM_PATH,
    })
    setOC(openCascade as Parameters<typeof setOC>[0])
  })

  for (const { modelId, parameters } of CASES) {
    it(`builds an envelope proxy for ${modelId} whose mesh bounds and triangle budget match the analytic envelope`, () => {
      const shape = buildProxyBRep(modelId, parameters)
      const mesh = meshBRep(shape, PROXY_MESH_CONFIG)
      const validation = validateModelParameters(modelId, parameters)
      if (!validation.valid) throw new Error('INVALID_TEST_PARAMETERS')
      const expected = boundsForModel(validation.value)
      for (let axis = 0; axis < 3; axis += 1) {
        expect(mesh.bounds.min[axis]).toBeGreaterThanOrEqual(
          expected.min[axis] - BOUNDS_TOLERANCE,
        )
        expect(mesh.bounds.max[axis]).toBeLessThanOrEqual(
          expected.max[axis] + BOUNDS_TOLERANCE,
        )
      }
      expect(mesh.triangleCount).toBeLessThanOrEqual(MAX_PROXY_TRIANGLE_COUNT)
      shape.delete()
    })
  }

  it('matches the hexagonal cross-section extents exactly', () => {
    const parameters = {
      height: 40,
      count: 1,
      gap: 1,
      orientation: 'standing' as const,
    }
    const shape = buildProxyBRep('hexagonal-column', parameters)
    const mesh = meshBRep(shape, PROXY_MESH_CONFIG)
    const expected = boundsForModel({ modelId: 'hexagonal-column', parameters })
    expect(mesh.bounds.min[0]).toBeCloseTo(expected.min[0], 3)
    expect(mesh.bounds.max[0]).toBeCloseTo(expected.max[0], 3)
    expect(mesh.bounds.min[1]).toBeCloseTo(expected.min[1], 3)
    expect(mesh.bounds.max[1]).toBeCloseTo(expected.max[1], 3)
    shape.delete()
  })
})
