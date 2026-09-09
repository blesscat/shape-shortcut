import { describe, expect, it } from 'vitest'
import {
  cadErrorCodeFor,
  cadErrorStageFor,
} from '../../src/workers/error-mapping'

describe('CAD Worker error mapping', () => {
  it.each([
    ['MODEL_REVISION_MISSING', 'model.generate', 'MODEL_REVISION_MISSING'],
    ['WORKER_RESTARTED', 'model.generate', 'WORKER_RESTARTED'],
    ['CANDIDATE_MISSING', 'model.commit', 'CANDIDATE_ORPHANED'],
    ['CANDIDATE_CAPACITY', 'model.generate', 'CANDIDATE_CAPACITY'],
    ['GRID_TEMPLATE_INVALID_BOUNDS', 'model.generate', 'MODEL_ASSET_INVALID'],
    ['HSW_CELL_ASSET_INVALID_BOUNDS', 'model.generate', 'MODEL_ASSET_INVALID'],
    [
      'HEXAGONAL_COLUMN_ASSET_INVALID_BOUNDS',
      'model.generate',
      'MODEL_ASSET_INVALID',
    ],
    [
      'MODEL_ASSET_INVALID:hexagonal-column-reference-missing',
      'model.generate',
      'MODEL_ASSET_INVALID',
    ],
    [
      'MODEL_ASSET_CONTEXT_MISSING:opengrid-snap-remover',
      'model.generate',
      'MODEL_ASSET_INVALID',
    ],
    [
      'OPENGRID_SNAP_OPEN_CONNECT_HEAD_LOAD_FAILED',
      'model.generate',
      'MODEL_ASSET_INVALID',
    ],
    [
      'OPENGRID_WALL_COVER_ASSET_LOAD_FAILED',
      'model.generate',
      'MODEL_ASSET_INVALID',
    ],
    [
      'OPENGRID_DETACHABLE_CORNER_SEAT_REFERENCE_LOAD_FAILED',
      'model.generate',
      'MODEL_ASSET_INVALID',
    ],
    [
      'OPENGRID_DETACHABLE_CORNER_SEAT_HOLDER_REFERENCE_INVALID',
      'model.generate',
      'MODEL_ASSET_INVALID',
    ],
    [
      'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:4097',
      'model.generate',
      'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT',
    ],
    [
      'OPENGRID_DIVIDER_QUALITY_INVALID:fillet:top-edge-rounding-missing',
      'model.generate',
      'OPENGRID_DIVIDER_QUALITY_INVALID',
    ],
    ['MODEL_PARAMETERS_INVALID', 'model.generate', 'INVALID_INPUT'],
    [
      'MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder',
      'model.generate',
      'INVALID_INPUT',
    ],
    [
      'MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover',
      'model.generate',
      'INVALID_INPUT',
    ],
    [
      'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID:stepped-holes',
      'model.generate',
      'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
    ],
    [
      'OPENGRID_WALL_COVER_QUALITY_INVALID:flat-text-bounds',
      'model.generate',
      'OPENGRID_WALL_COVER_QUALITY_INVALID',
    ],
    [
      'OPENGRID_STACKABLE_CYLINDER_OPENINGS_INVALID:opening-profile',
      'model.generate',
      'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID',
    ],
    ['MESH_INVALID: empty', 'model.generate', 'MESH_INVALID'],
    ['STEP_METADATA_INVALID', 'export.step', 'STEP_METADATA_INVALID'],
    ['STL_METADATA_INVALID', 'export.stl', 'STL_METADATA_INVALID'],
    ['THREEMF_METADATA_INVALID', 'export.3mf', 'THREEMF_METADATA_INVALID'],
    ['ENGINE_NOT_READY', 'model.generate', 'ENGINE_INIT_FAILED'],
    ['unknown', 'engine.init', 'ENGINE_INIT_FAILED'],
    ['unknown', 'export.step', 'STEP_EXPORT_FAILED'],
    ['unknown', 'export.stl', 'STL_EXPORT_FAILED'],
    ['unknown', 'export.3mf', 'THREEMF_EXPORT_FAILED'],
    ['unknown', 'model.generate', 'MODEL_BUILD_FAILED'],
  ] as const)(
    'maps %s before applying the %s fallback',
    (message, commandKind, expectedCode) => {
      expect(cadErrorCodeFor(message, commandKind)).toBe(expectedCode)
    },
  )

  it('maps command kinds to their operational stages', () => {
    expect(cadErrorStageFor('engine.init')).toBe('initializing')
    expect(cadErrorStageFor('export.step')).toBe('exporting')
    expect(cadErrorStageFor('model.generate')).toBe('building')
    expect(
      cadErrorStageFor(
        'model.generate',
        'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:4097',
      ),
    ).toBe('building')
    expect(cadErrorStageFor('model.generate', 'MESH_INVALID')).toBe('meshing')
    expect(
      cadErrorStageFor(
        'model.generate',
        'OPENGRID_DETACHABLE_CORNER_SEAT_REFERENCE_LOAD_FAILED',
      ),
    ).toBe('initializing')
    expect(
      cadErrorStageFor(
        'model.generate',
        'OPENGRID_DIVIDER_QUALITY_INVALID:pegs:missing',
      ),
    ).toBe('meshing')
    expect(
      cadErrorStageFor(
        'model.generate',
        'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID:brep',
      ),
    ).toBe('meshing')
    expect(
      cadErrorStageFor(
        'model.generate',
        'OPENGRID_WALL_COVER_QUALITY_INVALID:flat-text-bounds',
      ),
    ).toBe('meshing')
    expect(cadErrorStageFor('model.commit')).toBe('worker')
  })
})
