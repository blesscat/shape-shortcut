import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setOC, type Shape3D } from 'replicad'

import {
  OPENGRID_CONFIGURATION,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  PROTOTYPE_CONFIGURATION,
  TISSUE_BOX_DEFAULTS,
  boundsForModel,
  validateModelParameters,
  type ModelId,
  type ModelParameterValues,
} from '../../src/cad-contract/units'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  buildScenePreviewBRep,
  parametersForScenePreview,
} from '../../src/cad-kernel/scene/proxy'
import type { KernelBuildContext } from '../../src/cad-kernel/model'
import { importHswCellTemplate } from '../../src/cad-kernel/components/hsw-cell/builder'
import { importModularGridBaseTemplate } from '../../src/cad-kernel/components/modular-grid-base/builder'
import { importOpenGridOpenConnectShelfLockedSlot } from '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot'

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
const COMPONENT_ASSETS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/cad-kernel/components',
)

const PROXY_MESH_CONFIG = { tolerance: 0.05, angularTolerance: 0.2 }

function stackableBoxParameters(): ModelParameterValues {
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    cornerSeatMode: 'none',
    honeycombMode: false,
    x: 2,
    y: 1,
    height: 40,
  } as ModelParameterValues
}

function organizerBoxParameters(): ModelParameterValues {
  return {
    ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    cornerSeatMode: 'none',
  } as ModelParameterValues
}

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
    parameters: stackableBoxParameters(),
  },
  {
    modelId: 'opengrid-organizer-box',
    parameters: organizerBoxParameters(),
  },
  {
    modelId: 'opengrid-stackable-cylinder',
    parameters: { ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS },
  },
  {
    modelId: 'opengrid-divider',
    parameters: { ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters },
  },
  {
    modelId: 'opengrid-open-shelf',
    parameters: { ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS },
  },
  {
    modelId: 'opengrid-pillar',
    parameters: {
      mode: 'positioning',
      length: 20,
      offset: 0,
    } as ModelParameterValues,
  },
  {
    modelId: 'opengrid-openconnect-shelf',
    parameters: { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS },
  },
  {
    modelId: 'opengrid-openconnect-organizer',
    parameters: { ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS },
  },
  {
    modelId: 'opengrid-openconnect-tissue-box',
    parameters: { ...TISSUE_BOX_DEFAULTS },
  },
]

const BOUNDS_TOLERANCE = 0.05

let template: Shape3D
let hswTemplate: Shape3D
let lockedSlot: Shape3D

function kernelContext(): KernelBuildContext {
  return {
    getModularGridBaseTemplate: async () => template,
    getHswCellTemplate: async () => hswTemplate,
    getOpenGridOpenConnectShelfLockedSlot: async () => lockedSlot,
    isGenerationCurrent: () => true,
  }
}

describe('scene preview B-Reps', () => {
  beforeAll(async () => {
    const openCascade = await initialiseOpenCascade({
      locateFile: () => WASM_PATH,
    })
    setOC(openCascade as Parameters<typeof setOC>[0])
    template = await importModularGridBaseTemplate(
      new Blob([
        readFileSync(
          join(
            COMPONENT_ASSETS_DIR,
            'modular-grid-base/board-cell-template.step',
          ),
        ),
      ]),
    )
    hswTemplate = await importHswCellTemplate(
      new Blob([
        readFileSync(join(COMPONENT_ASSETS_DIR, 'hsw-cell/hsw-cell.step')),
      ]),
    )
    lockedSlot = await importOpenGridOpenConnectShelfLockedSlot(
      new Blob([
        readFileSync(
          join(
            COMPONENT_ASSETS_DIR,
            'opengrid-openconnect-shelf/assets/openconnect-slot-negative-lock.step',
          ),
        ),
      ]),
    )
  })

  for (const { modelId, parameters } of CASES) {
    it(`builds a scene preview for ${modelId} whose mesh bounds match the analytic bounds`, async () => {
      const shape = await buildScenePreviewBRep(
        modelId,
        parameters,
        kernelContext(),
      )
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
      shape.delete()
    })
  }

  it('matches the hexagonal cross-section extents exactly', async () => {
    const parameters = {
      height: 40,
      count: 1,
      gap: 1,
      orientation: 'standing' as const,
    }
    const shape = await buildScenePreviewBRep(
      'hexagonal-column',
      parameters,
      kernelContext(),
    )
    const mesh = meshBRep(shape, { tolerance: 0.001, angularTolerance: 0.05 })
    const expected = boundsForModel({ modelId: 'hexagonal-column', parameters })
    expect(mesh.bounds.min[0]).toBeCloseTo(expected.min[0], 3)
    expect(mesh.bounds.max[0]).toBeCloseTo(expected.max[0], 3)
    expect(mesh.bounds.min[1]).toBeCloseTo(expected.min[1], 3)
    expect(mesh.bounds.max[1]).toBeCloseTo(expected.max[1], 3)
    shape.delete()
  })

  it('strips the material-saving feature from preview parameters', () => {
    const divider = parametersForScenePreview('opengrid-divider', {
      ...(OPENGRID_DIVIDER_CONFIGURATION.defaultParameters as Record<
        string,
        unknown
      >),
      honeycombMode: true,
    } as ModelParameterValues)
    expect((divider as Record<string, unknown>).honeycombMode).toBe(false)

    const snap = parametersForScenePreview('opengrid-snap', {
      openConnect: true,
    } as unknown as ModelParameterValues) as Record<string, unknown>
    // OpenConnect interfaces are part of the rendered geometry; only the
    // material-saving feature is stripped.
    expect(snap.openConnect).toBe(true)

    const box = parametersForScenePreview('box', {
      width: 20,
      depth: 30,
      height: 40,
    } as ModelParameterValues) as Record<string, unknown>
    expect(box).toEqual({ width: 20, depth: 30, height: 40 })
  })
})
