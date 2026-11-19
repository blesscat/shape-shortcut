import { describe, expect, it } from 'vitest'
import {
  cadErrorCodeFor,
  cadErrorStageFor,
} from '../../src/workers/error-mapping'

describe('CAD error mapping order-sensitive rule pairs', () => {
  describe('error code precedence', () => {
    it('matches OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID before OPENGRID_ORGANIZER_BOX_', () => {
      expect(
        cadErrorCodeFor(
          'OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID',
          'model.generate',
        ),
      ).toBe('INVALID_INPUT')
      expect(
        cadErrorStageFor(
          'model.generate',
          'OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID',
        ),
      ).toBe('meshing')
      expect(
        cadErrorCodeFor(
          'OPENGRID_ORGANIZER_BOX_QUALITY_FAILED',
          'model.generate',
        ),
      ).toBe('OPENGRID_QUALITY_INVALID')
      expect(
        cadErrorStageFor(
          'model.generate',
          'OPENGRID_ORGANIZER_BOX_QUALITY_FAILED',
        ),
      ).toBe('meshing')
    })

    it.each([
      'OPENGRID_SNAP_HOLD_REFERENCE_MISSING',
      'OPENGRID_SNAP_HOLD_REFERENCE_INVALID',
      'OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED',
    ])('matches %s before OPENGRID_SNAP_HOLD_', (message) => {
      expect(cadErrorCodeFor(message, 'model.generate')).toBe(
        'MODEL_ASSET_INVALID',
      )
    })

    it('falls through to OPENGRID_QUALITY_INVALID for non-reference OPENGRID_SNAP_HOLD_ messages', () => {
      expect(
        cadErrorCodeFor(
          'OPENGRID_SNAP_HOLD_INTERFACE_DIAMETER_MISMATCH',
          'model.generate',
        ),
      ).toBe('OPENGRID_QUALITY_INVALID')
    })

    it('matches OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT before OPENGRID_STACKABLE_BOX_', () => {
      expect(
        cadErrorCodeFor(
          'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:4097',
          'model.generate',
        ),
      ).toBe('OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT')
      expect(
        cadErrorCodeFor(
          'OPENGRID_STACKABLE_BOX_THICK_SHELL_INVALID',
          'model.generate',
        ),
      ).toBe('OPENGRID_QUALITY_INVALID')
    })
  })

  describe('error stage precedence', () => {
    it('matches OPENGRID_SNAP_HOLD_REFERENCE_ before OPENGRID_SNAP_HOLD_', () => {
      expect(
        cadErrorStageFor(
          'model.generate',
          'OPENGRID_SNAP_HOLD_REFERENCE_MISSING',
        ),
      ).toBe('initializing')
      expect(
        cadErrorStageFor(
          'model.generate',
          'OPENGRID_SNAP_HOLD_REFERENCE_INVALID',
        ),
      ).toBe('initializing')
      expect(
        cadErrorStageFor(
          'model.generate',
          'OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED',
        ),
      ).toBe('initializing')
      expect(
        cadErrorStageFor(
          'model.generate',
          'OPENGRID_SNAP_HOLD_INTERFACE_DIAMETER_MISMATCH',
        ),
      ).toBe('meshing')
    })

    it('matches OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT before OPENGRID_STACKABLE_BOX_', () => {
      expect(
        cadErrorStageFor(
          'model.generate',
          'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT:4097',
        ),
      ).toBe('building')
      expect(
        cadErrorStageFor(
          'model.generate',
          'OPENGRID_STACKABLE_BOX_THICK_SHELL_INVALID',
        ),
      ).toBe('meshing')
    })
  })
})
