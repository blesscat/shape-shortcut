import { describe, expect, it } from 'vitest'
import { normalizeError } from '../../src/cad-contract/errors'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  type OpenGridParameters,
} from '../../src/cad-contract/units'
import { cadReducer, initialCadState } from '../../src/features/cad/state'

function opengridParameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    ...overrides,
  }
}

describe('CAD state machine', () => {
  it('keeps a committed model stale while a newer generation is being built', () => {
    const initial = initialCadState()
    const model = {
      revision: 'rev-1',
      workerEpoch: 'epoch-1',
      generation: 1,
      modelId: 'box' as const,
      parameters: { width: 20, depth: 30, height: 40 },
      mesh: {
        positions: new Float32Array([0, 0, 0]).buffer,
        normals: new Float32Array([0, 0, 1]).buffer,
        indices: new Uint32Array([0, 0, 0]).buffer,
        bounds: {
          min: [0, 0, 0] as [number, number, number],
          max: [0, 0, 0] as [number, number, number],
        },
        triangleCount: 1,
      },
    }
    const ready = cadReducer(initial, { type: 'model-ready', model })
    const stale = cadReducer(ready, {
      type: 'input-valid',
      modelId: 'box',
      input: { width: 21, depth: 30, height: 40 },
      generation: 2,
    })
    expect(ready.status).toBe('ready')
    expect(stale.status).toBe('generating')
    expect(stale.stale).toBe(true)
    expect(stale.committed?.revision).toBe('rev-1')
    expect(stale.exportStatus).toBe('disabled')
    const replacing = cadReducer(stale, { type: 'worker-restarted' })
    expect(replacing.committed).toBe(ready.committed)
    expect(replacing.committed?.mesh).toBe(model.mesh)
    expect(replacing.committed?.parameters).toBe(model.parameters)
    expect(replacing).toMatchObject({
      status: 'loading-engine',
      stale: true,
      exportStatus: 'disabled',
      generation: 2,
    })
    expect(cadReducer(replacing, { type: 'export-end' }).exportStatus).toBe(
      'disabled',
    )
  })

  it('enters invalid-input without deleting the previous preview', () => {
    const state = cadReducer(initialCadState(), {
      type: 'input-invalid',
      modelId: 'box',
      input: { width: 20, depth: 30, height: 40 },
      generation: 1,
      error: normalizeError(new Error('bad input'), {
        stage: 'validation',
        code: 'INVALID_INPUT',
        message: { messageId: 'validation.invalid' },
      }),
    })
    expect(state.status).toBe('invalid-input')
    expect(state.exportStatus).toBe('disabled')
  })

  it('keeps an empty preview and current generation on a restart before any commit', () => {
    const state = cadReducer(
      cadReducer(initialCadState(), {
        type: 'input-valid',
        modelId: 'box',
        input: { width: 21, depth: 30, height: 40 },
        generation: 2,
      }),
      { type: 'worker-restarted' },
    )
    expect(state.status).toBe('loading-engine')
    expect(state.input).toEqual({ width: 21, depth: 30, height: 40 })
    expect(state.committed).toBeNull()
    expect(state.workerEpoch).toBeNull()
  })

  it('tracks the selected component and its component-specific input', () => {
    const state = cadReducer(initialCadState(), {
      type: 'input-valid',
      modelId: 'modular-grid-base',
      input: { rows: 2, columns: 2 },
      generation: 1,
    })

    expect(state.modelId).toBe('modular-grid-base')
    expect(state.input).toEqual({ rows: 2, columns: 2 })
    expect(state.status).toBe('generating')
  })

  it('initializes the independent HSW component with slider counts', () => {
    const state = initialCadState('hsw-cell')

    expect(state.modelId).toBe('hsw-cell')
    expect(state.input).toEqual({ rows: 1, columns: 1 })
  })

  it('initializes the independent hexagonal-column defaults', () => {
    const state = initialCadState('hexagonal-column')

    expect(state.modelId).toBe('hexagonal-column')
    expect(state.input).toEqual({
      height: 8,
      count: 1,
      gap: 1,
      orientation: 'lying',
    })
  })

  it('initializes the independent OpenGrid stackable-box defaults', () => {
    const state = initialCadState('opengrid-stackable-box')

    expect(state.modelId).toBe('opengrid-stackable-box')
    expect(state.input).toEqual(OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS)
  })

  it('initializes the independent OpenGrid organizer-box defaults', () => {
    const state = initialCadState('opengrid-organizer-box')

    expect(state.modelId).toBe('opengrid-organizer-box')
    expect(state.input).toEqual(OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS)
  })

  it('initializes the independent OpenGrid divider defaults', () => {
    const state = initialCadState('opengrid-divider')

    expect(state.modelId).toBe('opengrid-divider')
    expect(state.input).toEqual(
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
    )
  })

  it('initializes the pillar with the locking corner-seat default', () => {
    const state = initialCadState('opengrid-pillar')

    expect(state.modelId).toBe('opengrid-pillar')
    expect(state.input).toEqual({
      mode: 'detachable-corner-seat',
      length: 3.8,
      offset: 0,
    })
  })

  it('initializes the independent OpenGrid stackable-cylinder defaults', () => {
    const state = initialCadState('opengrid-stackable-cylinder')

    expect(state.modelId).toBe('opengrid-stackable-cylinder')
    expect(state.input).toEqual(OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS)
  })

  it('retains OpenGrid committed metadata while marking a newer input stale', () => {
    const parameters = opengridParameters({
      variant: 'Full',
      rows: 1,
      columns: 1,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const ready = cadReducer(initialCadState('opengrid', parameters), {
      type: 'model-ready',
      model: {
        revision: 'opengrid-revision-1',
        workerEpoch: 'epoch-opengrid',
        generation: 1,
        modelId: 'opengrid',
        parameters,
        mesh: {
          positions: new Float32Array([0, 0, 0]).buffer,
          normals: new Float32Array([0, 0, 1]).buffer,
          indices: new Uint32Array([0, 0, 0]).buffer,
          bounds: {
            min: [-14, -14, 0],
            max: [14, 14, 6.8],
          },
          triangleCount: 1,
        },
      },
    })
    const stale = cadReducer(ready, {
      type: 'input-valid',
      modelId: 'opengrid',
      input: { ...parameters, variant: 'Lite' },
      generation: 2,
    })

    expect(ready.committed).toMatchObject({
      modelId: 'opengrid',
      revision: 'opengrid-revision-1',
      parameters,
    })
    expect(stale.committed?.revision).toBe('opengrid-revision-1')
    expect(stale.stale).toBe(true)
    expect(stale.exportStatus).toBe('disabled')
  })

  it('keeps the committed OpenConnect organizer isolated from a failed candidate', () => {
    const parameters = {
      ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    }
    const committedMesh = {
      positions: new Float32Array([0, 0, 0]).buffer,
      normals: new Float32Array([0, 0, 1]).buffer,
      indices: new Uint32Array([0, 0, 0]).buffer,
      bounds: {
        min: [-28, 0, 0] as [number, number, number],
        max: [28, 32, 56] as [number, number, number],
      },
      triangleCount: 1,
    }
    const ready = cadReducer(
      initialCadState('opengrid-openconnect-organizer', parameters),
      {
        type: 'model-ready',
        model: {
          revision: 'organizer-revision-1',
          workerEpoch: 'epoch-organizer',
          generation: 1,
          modelId: 'opengrid-openconnect-organizer',
          parameters,
          mesh: committedMesh,
        },
      },
    )
    const generating = cadReducer(ready, {
      type: 'input-valid',
      modelId: 'opengrid-openconnect-organizer',
      input: { ...parameters, tiltAngle: 30 },
      generation: 2,
    })
    const failed = cadReducer(generating, {
      type: 'recoverable-error',
      error: normalizeError(new Error('candidate failed'), {
        stage: 'building',
        code: 'MODEL_BUILD_FAILED',
        message: { messageId: 'diagnostic.modelBuildFailed' },
        recoverable: true,
        generation: 2,
      }),
    })

    expect(failed).toMatchObject({
      status: 'recoverable-error',
      exportStatus: 'disabled',
      stale: true,
    })
    expect(failed.committed).toMatchObject({
      revision: 'organizer-revision-1',
      modelId: 'opengrid-openconnect-organizer',
      parameters,
      mesh: committedMesh,
    })
  })
})
