import { describe, expect, it } from 'vitest'
import { modelDefinitions } from '../../src/features/cad/model-catalog'
import {
  findModelPreset,
  resolvePresetParameters,
} from '../../src/features/cad/model-catalog/presets'
import type { ModelDefinition } from '../../src/features/cad/model-catalog'
import {
  CARD_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type CardBoxParameters,
} from '../../src/cad-contract/units'
import {
  cardBoxDefinition,
  opengridStackableBoxDefinition,
} from '../../src/features/cad/model-catalog'

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
    simplifiedPreview: opengridStackableBoxDefinition.simplifiedPreview,
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

/**
 * A component whose selected part only exists while the card is narrow, so a
 * preset that widens the card invalidates the part.
 */
function partBoundDefinition(): ModelDefinition {
  return fakeDefinition({
    presetBase: 'current',
    defaultParameters: {
      part: 'assembly',
      cardWidth: 70,
    } as unknown as ModelDefinition['defaultParameters'],
    presets: [
      {
        id: 'wide-card',
        labelKey: 'test.preset',
        overrides: { cardWidth: 90 },
      },
    ],
    validateParameters: (value) => {
      const record = value as { part?: string; cardWidth?: number }
      if (record.part === 'small' && (record.cardWidth ?? 0) >= 80) {
        return {
          valid: false as const,
          issues: [{ field: 'part' as const, messageId: 'PART_UNAVAILABLE' }],
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
  })
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

  it('merges onto the current parameters when the definition asks for it', () => {
    const definition = fakeDefinition({
      presetBase: 'current',
      presets: [
        {
          id: 'test-preset',
          labelKey: 'test.preset',
          overrides: { x: 5 },
        },
      ],
    })
    const preset = findModelPreset(definition, 'test-preset')
    if (!preset) throw new Error('preset missing')

    const current = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      y: 9,
      height: 12,
    }
    const resolved = resolvePresetParameters(definition, preset, current)
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.parameters).toMatchObject({ x: 5, y: 9, height: 12 })
  })

  it('retries a part that no longer exists as the assembly', () => {
    const definition = partBoundDefinition()
    const preset = findModelPreset(definition, 'wide-card')
    if (!preset) throw new Error('preset missing')

    const resolved = resolvePresetParameters(definition, preset, {
      part: 'small',
      cardWidth: 70,
    } as unknown as ModelDefinition['defaultParameters'])
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.parameters).toMatchObject({
      part: 'assembly',
      cardWidth: 90,
    })
  })

  it('does not apply a preset whose result is invalid for another reason', () => {
    const definition = fakeDefinition({
      presetBase: 'current',
      presets: [
        {
          id: 'bad-preset',
          labelKey: 'test.preset',
          overrides: { x: 999 },
        },
      ],
    })
    const preset = findModelPreset(definition, 'bad-preset')
    if (!preset) throw new Error('preset missing')

    const current = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      y: 9,
    }
    expect(resolvePresetParameters(definition, preset, current)).toEqual({
      ok: false,
    })
  })

  it('card-box keeps merging its presets onto the definition defaults', () => {
    const preset = cardBoxDefinition.presets?.[0]
    if (!preset) throw new Error('preset missing')

    const current = {
      ...cardBoxDefinition.defaultParameters,
      storageDepth: 40,
      dividerText: 'TCG',
    } as CardBoxParameters
    const resolved = resolvePresetParameters(cardBoxDefinition, preset, current)
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    const parameters = resolved.parameters as CardBoxParameters
    expect(parameters.cardWidth).toBe(70)
    expect(parameters.cardHeight).toBe(120)
    // The current values are not kept: a card-box preset resets them.
    expect(parameters.storageDepth).toBe(
      CARD_BOX_CONFIGURATION.defaults.storageDepth,
    )
    expect(parameters.dividerText).toBe('')
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

  it('lists every component that declares presets', () => {
    const withPresets = modelDefinitions.filter(
      (definition) => (definition.presets?.length ?? 0) > 0,
    )
    expect(withPresets.map((definition) => definition.id)).toEqual([
      'opengrid-stackable-box',
      'card-box',
      'game-box',
    ])
  })
})
