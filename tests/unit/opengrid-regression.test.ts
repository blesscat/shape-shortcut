import { describe, expect, it } from 'vitest'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridParameters,
} from '../../src/cad-contract/units'
import {
  cadPathForModel,
  getModelDefinition,
} from '../../src/features/cad/model-catalog'
import { getKernelModelDefinition } from '../../src/cad-kernel/model'
import { createComponentParameterStore } from '../../src/features/cad/parameters'

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

function officialParameters(): OpenGridParameters {
  return {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
  }
}

describe('existing OpenGrid regression contract', () => {
  it('keeps the official and stackable model routes, parameters, and exports', () => {
    const official = getModelDefinition('opengrid')
    const stackable = getModelDefinition('opengrid-stackable-box')
    const officialValues = officialParameters()
    const stackableValues = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 0.5,
      y: 1.5,
      height: 20,
      cornerSeatMode: 'detachable-corner-seat',
      fullBottomHoleGrid: false,
      bottomMode: 'stacking',
    }

    expect(cadPathForModel('opengrid')).toBe('/cad/opengrid')
    expect(cadPathForModel('opengrid-stackable-box')).toBe(
      '/cad/opengrid-stackable-box',
    )
    expect(official?.buildKey).toBe('opengrid')
    expect(stackable?.buildKey).toBe('opengrid-stackable-box')
    expect(official?.validateParameters(officialValues)).toEqual({
      valid: true,
      value: { modelId: 'opengrid', parameters: officialValues },
    })
    expect(stackable?.validateParameters(stackableValues)).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-stackable-box',
        parameters: stackableValues,
      },
    })
    expect(official?.exportFileName(officialValues)).toBe(
      'opengrid-lite-2x2-xnone-ynone-official-default-corners-corners-enabled.step',
    )
    expect(official?.stlFileName(officialValues)).toBe(
      'opengrid-lite-2x2-xnone-ynone-official-default-corners-corners-enabled.stl',
    )
    expect(stackable?.exportFileName(stackableValues)).toBe(
      'opengrid-stackable-box-0.5x1.5-h20-seats-detachable-corner-seat.step',
    )
    expect(stackable?.stlFileName(stackableValues)).toBe(
      'opengrid-stackable-box-0.5x1.5-h20-seats-detachable-corner-seat.stl',
    )
  })

  it('keeps existing kernel builders registered separately from the divider', () => {
    const official = getKernelModelDefinition('opengrid')
    const stackable = getKernelModelDefinition('opengrid-stackable-box')
    const divider = getKernelModelDefinition('opengrid-divider')

    expect(official?.id).toBe('opengrid')
    expect(stackable?.id).toBe('opengrid-stackable-box')
    expect(divider?.id).toBe('opengrid-divider')
    expect(official?.build).not.toBe(stackable?.build)
    expect(official?.build).not.toBe(divider?.build)
    expect(stackable?.build).not.toBe(divider?.build)
  })

  it('keeps existing OpenGrid persistence entries isolated from divider values', () => {
    const store = createComponentParameterStore({
      storage: createMemoryStorage(),
    })
    const officialValues = officialParameters()
    const stackableValues = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 1,
      y: 2,
      height: 30,
      cornerSeatMode: 'detachable-corner-seat',
      fullBottomHoleGrid: false,
      bottomMode: 'stacking',
    }

    expect(store.set('opengrid', officialValues)).toBe(true)
    expect(store.set('opengrid-stackable-box', stackableValues)).toBe(true)
    expect(
      store.set('opengrid-divider', {
        left: 1,
        right: 1,
        up: 2,
        down: 0,
        height: 25,
        wallThickness: 3,
      }),
    ).toBe(true)

    expect(store.get('opengrid')).toEqual(officialValues)
    expect(store.get('opengrid-stackable-box')).toEqual(stackableValues)
    expect(store.get('opengrid-divider')).toEqual({
      left: 1,
      right: 1,
      up: 2,
      down: 0,
      height: 25,
      wallThickness: 3,
      honeycombMode: false,
    })
    store.dispose()
  })
})
