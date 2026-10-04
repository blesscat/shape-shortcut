import { describe, expect, it } from 'vitest'
import { modelDefinitions } from '../../src/features/cad/model-catalog'
import {
  findModelPreset,
  resolvePresetParameters,
} from '../../src/features/cad/model-catalog/presets'
import type { ModelDefinition } from '../../src/features/cad/model-catalog'
import { OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS } from '../../src/cad-contract/units'
import { opengridStackableBoxDefinition } from '../../src/features/cad/model-catalog'

function fakeDefinition(
  overrides: Partial<ModelDefinition> = {},
): ModelDefinition {
  return {
    id: 'opengrid-stackable-box',
    buildKey: 'opengrid-stackable-box',
    family: 'opengrid',
    displayName: 'models.model.opengrid-stackable-box.name',
    selectionLabel: 'models.model.opengrid-stackable-box.selection',
    selectionDescription: 'models.model.opengrid-stackable-box.description',
    parameterSchema: [],
    previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
    defaultParameters: { ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS },
    validateParameters: (value) => {
      if (
        typeof value === 'object' &&
        value !== null &&
        'x' in value &&
        (value as { x: unknown }).x === 999
      ) {
        return {
          valid: false as const,
          issues: [{ field: 'x' as const, messageId: 'OUT_OF_RANGE' }],
        }
      }
      return {
        valid: true as const,
        value: {
          modelId: 'opengrid-stackable-box' as const,
          parameters: value as typeof OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        },
      }
    },
    boundsForParameters: () => ({
      min: [0, 0, 0],
      max: [0, 0, 0],
    }),
    exportFileName: () => 'box.step',
    stlFileName: () => 'box.stl',
    ...overrides,
  }
}

describe('resolvePresetParameters', () => {
  it('merges overrides onto defaultParameters and keeps unrelated defaults', () => {
    const definition = fakeDefinition({
      presets: [
        {
          id: 'test-preset',
          labelKey: 'test.preset',
          overrides: { x: 3, y: 3 },
        },
      ],
    })
    const preset = findModelPreset(definition, 'test-preset')
    expect(preset).toBeDefined()
    if (!preset) return

    const resolved = resolvePresetParameters(definition, preset)
    expect(resolved).toEqual({
      ok: true,
      parameters: expect.objectContaining({ x: 3, y: 3 }),
    })
    if (!resolved.ok) return
    const parameters =
      resolved.parameters as typeof OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS
    expect(parameters.height).toBe(
      OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.height,
    )
    expect(parameters.cornerSeatMode).toBe(
      OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.cornerSeatMode,
    )
  })

  it('does not mutate the definition defaultParameters', () => {
    const definition = fakeDefinition({
      presets: [
        {
          id: 'test-preset',
          labelKey: 'test.preset',
          overrides: { x: 3, y: 3 },
        },
      ],
    })
    const preset = findModelPreset(definition, 'test-preset')
    if (!preset) throw new Error('preset missing')

    resolvePresetParameters(definition, preset)
    resolvePresetParameters(definition, preset)

    const defaults =
      definition.defaultParameters as typeof OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS
    expect(defaults.x).toBe(OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.x)
    expect(defaults.y).toBe(OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.y)
  })

  it('returns ok:false when the merged parameters fail validation', () => {
    const definition = fakeDefinition({
      presets: [
        {
          id: 'bad-preset',
          labelKey: 'test.preset',
          overrides: { x: 999, y: 3 },
        },
      ],
    })
    const preset = findModelPreset(definition, 'bad-preset')
    if (!preset) throw new Error('preset missing')

    expect(resolvePresetParameters(definition, preset)).toEqual({ ok: false })
  })

  it('returns ok:false when the validator throws', () => {
    const definition = fakeDefinition({
      presets: [
        {
          id: 'throwing-preset',
          labelKey: 'test.preset',
          overrides: { x: 3, y: 3 },
        },
      ],
      validateParameters: () => {
        throw new Error('validator crashed')
      },
    })
    const preset = findModelPreset(definition, 'throwing-preset')
    if (!preset) throw new Error('preset missing')

    expect(resolvePresetParameters(definition, preset)).toEqual({ ok: false })
  })

  it('returns undefined from findModelPreset for unknown ids', () => {
    expect(findModelPreset(fakeDefinition(), 'missing')).toBeUndefined()
  })
})

describe('catalog presets', () => {
  it('every declared preset resolves to valid parameters', () => {
    for (const definition of modelDefinitions) {
      for (const preset of definition.presets ?? []) {
        const resolved = resolvePresetParameters(definition, preset)
        expect(
          resolved.ok,
          `preset ${definition.id}/${preset.id} must validate`,
        ).toBe(true)
      }
    }
  })

  it('stackable box ships exactly one desk-style 3x3 test preset', () => {
    expect(opengridStackableBoxDefinition.presets).toHaveLength(1)
    const preset = opengridStackableBoxDefinition.presets?.[0]
    expect(preset?.id).toBe('3x3-desk-style')
    const resolved = preset
      ? resolvePresetParameters(opengridStackableBoxDefinition, preset)
      : undefined
    expect(resolved).toMatchObject({
      ok: true,
      parameters: {
        x: 3,
        y: 3,
        height: 30,
        topRimMode: 'flat-top',
        bottomMode: 'thin-shell',
      },
    })
  })

  it('only the stackable box declares presets in this change', () => {
    const withPresets = modelDefinitions.filter(
      (definition) => (definition.presets?.length ?? 0) > 0,
    )
    expect(withPresets.map((definition) => definition.id)).toEqual([
      'opengrid-stackable-box',
    ])
  })
})
