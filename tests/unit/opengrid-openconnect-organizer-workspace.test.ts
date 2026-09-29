import { OPENCONNECT_ALIGNMENT_DEFAULTS } from '../../src/cad-contract/units/openconnect-alignment'
import { describe, expect, it } from 'vitest'
import {
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  validateModelParameters,
  type OpenGridOpenConnectOrganizerParameters,
} from '../../src/cad-contract/units'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'
import {
  COMPONENT_PARAMETER_STORAGE_KEY,
  createComponentParameterStore,
} from '../../src/features/cad/parameters'
import { initialCadState } from '../../src/features/cad/state'

type MemoryStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function createMemoryStorage(): MemoryStorage {
  let value: string | null = null
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => {
      value = nextValue
    },
  }
}

function parameters(
  overrides: Partial<OpenGridOpenConnectOrganizerParameters> = {},
): OpenGridOpenConnectOrganizerParameters {
  return {
    ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

describe('OpenGrid OpenConnect organizer workspace integration', () => {
  it('round-trips the complete typed snapshot used for generation', () => {
    const value = parameters({
      holeCountX: 3,
      holeCountY: 4,
      holeSpacingMode: 'independent',
      holeSpacingX: 2.5,
      holeSpacingY: 4,
      holeShape: 'hexagon',
      holeDiameter: 18.5,
      holeWidth: 30,
      holeHeight: 20,
      holeCornerRadius: 2.5,
      holeDepth: 32,
      bottomThickness: 3.5,
      edgeThickness: 4.5,
      tiltAngle: 22,
    })
    const raw = rawFromParameters(value)

    expect(raw).toEqual({
      ...OPENCONNECT_ALIGNMENT_DEFAULTS,
      holeCountX: '3',
      holeCountY: '4',
      holeSpacingMode: 'independent',
      holeSpacingX: '2.5',
      holeSpacingY: '4',
      holeShape: 'hexagon',
      holeDiameter: '18.5',
      holeWidth: '30',
      holeHeight: '20',
      holeCornerRadius: '2.5',
      holeDepth: '32',
      bottomThickness: '3.5',
      edgeThickness: '4.5',
      tiltAngle: '22',
      topRimEnabled: 'false',
      topRimHeight: '2',
      labelSlotEnabled: 'false',
      labelGridUnits: '3',
    })
    expect(parseRawParameters(raw, 'opengrid-openconnect-organizer')).toEqual({
      valid: true,
      value,
    })
    expect(
      validateModelParameters('opengrid-openconnect-organizer', value),
    ).toEqual({
      valid: true,
      value: { modelId: 'opengrid-openconnect-organizer', parameters: value },
    })
  })

  it('rejects mismatched linked spacing, unsupported shapes, and fractional tilt', () => {
    expect(
      parseRawParameters(
        {
          ...rawFromParameters(parameters()),
          holeSpacingY: '3',
        },
        'opengrid-openconnect-organizer',
      ),
    ).toMatchObject({ valid: false, field: 'holeSpacingY' })
    expect(
      parseRawParameters(
        {
          ...rawFromParameters(parameters()),
          holeShape: 'octagon',
        },
        'opengrid-openconnect-organizer',
      ),
    ).toMatchObject({ valid: false, field: 'holeShape' })
    expect(
      parseRawParameters(
        {
          ...rawFromParameters(parameters()),
          tiltAngle: '12.5',
        },
        'opengrid-openconnect-organizer',
      ),
    ).toMatchObject({ valid: false, field: 'tiltAngle' })
  })

  it('accepts zero bottom and decimal dimensions while keeping whole-degree tilt', () => {
    const value = parameters({
      holeSpacingMode: 'independent',
      holeSpacingX: 2.25,
      holeSpacingY: 3.125,
      holeDiameter: 18.75,
      holeDepth: 27.25,
      bottomThickness: 0,
      edgeThickness: 0.4,
      tiltAngle: 12,
    })

    expect(
      parseRawParameters(
        rawFromParameters(value),
        'opengrid-openconnect-organizer',
      ),
    ).toEqual({ valid: true, value })
  })

  it('starts and restores from a fresh copy of the canonical defaults', () => {
    const first = initialCadState('opengrid-openconnect-organizer').input
    const second = initialCadState('opengrid-openconnect-organizer').input

    expect(first).toEqual(OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS)
    expect(second).toEqual(OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS)
    expect(second).not.toBe(first)
  })

  it('persists Wall values without leaking them into another system scope', () => {
    const storage = createMemoryStorage()
    const custom = parameters({
      holeCountX: 5,
      holeShape: 'pentagon',
      tiltAngle: 30,
    })
    const store = createComponentParameterStore({
      storage,
      systemContext: 'wall',
    })

    expect(store.set('opengrid-openconnect-organizer', custom)).toBe(true)
    expect(store.get('opengrid-openconnect-organizer')).toEqual(custom)
    store.setSystemContext('desk')
    expect(store.get('opengrid-openconnect-organizer')).toEqual(
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    )
    store.dispose()

    const restored = createComponentParameterStore({
      storage,
      systemContext: 'wall',
    })
    expect(restored.get('opengrid-openconnect-organizer')).toEqual(custom)
    expect(storage.getItem(COMPONENT_PARAMETER_STORAGE_KEY)).toContain(
      'opengrid-openconnect-organizer',
    )
    restored.dispose()
  })
})
