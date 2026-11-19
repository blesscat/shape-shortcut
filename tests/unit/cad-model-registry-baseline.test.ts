import { describe, expect, it } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  type ModelId,
  type ModelParameterValues,
} from '../../src/cad-contract/units'
import {
  buildModelBRep,
  buildModelBRepWithParts,
  getKernelModelDefinition,
  kernelModelDefinitions,
  type KernelBuildContext,
} from '../../src/cad-kernel/model'
import {
  KERNEL_MODEL_GOLDEN_ENTRIES,
  KERNEL_MODEL_WITH_PARTS_MISMATCH_IDS,
} from './cad-registry-baseline.fixture'

const GOLDEN_ENTRIES = Object.values(KERNEL_MODEL_GOLDEN_ENTRIES)

function createEmptyKernelBuildContext(): KernelBuildContext {
  return {
    getModularGridBaseTemplate: async () => {
      throw new Error('UNEXPECTED_TEMPLATE_CALL:modular-grid-base')
    },
    getHswCellTemplate: async () => {
      throw new Error('UNEXPECTED_TEMPLATE_CALL:hsw-cell')
    },
  }
}

async function expectBuildRejection(
  fn: () => Shape3D | Promise<Shape3D>,
  expectedMessage: string,
): Promise<void> {
  await expect(Promise.resolve().then(fn)).rejects.toThrow(expectedMessage)
}

describe('CAD kernel model registry golden baseline', () => {
  it('registers every known ModelId exactly once with a unique build function', () => {
    const expectedIds = GOLDEN_ENTRIES.map((entry) => entry.id).sort()
    const registeredIds = kernelModelDefinitions
      .map((definition) => definition.id)
      .sort()

    expect(kernelModelDefinitions).toHaveLength(GOLDEN_ENTRIES.length)
    expect(new Set(registeredIds).size).toBe(GOLDEN_ENTRIES.length)
    expect(registeredIds).toEqual(expectedIds)

    const uniqueBuildFunctions = new Set(
      kernelModelDefinitions.map((definition) => definition.build),
    )
    expect(uniqueBuildFunctions.size).toBe(GOLDEN_ENTRIES.length)
  })

  it.each(GOLDEN_ENTRIES)(
    'looks up $id via getKernelModelDefinition and preserves its build guard',
    async ({ id, invalidParametersError }) => {
      const fromArray = kernelModelDefinitions.find(
        (definition) => definition.id === id,
      )
      const fromLookup = getKernelModelDefinition(id)

      expect(fromArray).toBeDefined()
      expect(fromLookup).toBe(fromArray)
      expect(fromLookup?.id).toBe(id)
      expect(typeof fromLookup?.build).toBe('function')

      const invalidParameters = null as unknown as ModelParameterValues
      const context = createEmptyKernelBuildContext()

      await expectBuildRejection(
        () => fromLookup!.build(invalidParameters, context),
        invalidParametersError,
      )
      await expect(
        buildModelBRep(id, invalidParameters, context),
      ).rejects.toThrow('MODEL_PARAMETERS_INVALID')

      const expectedWithPartsError = KERNEL_MODEL_WITH_PARTS_MISMATCH_IDS.has(
        id,
      )
        ? invalidParametersError
        : 'MODEL_PARAMETERS_INVALID'
      await expect(
        buildModelBRepWithParts(id, invalidParameters, context),
      ).rejects.toThrow(expectedWithPartsError)
    },
  )

  it('returns undefined from getKernelModelDefinition for an unknown ModelId', () => {
    expect(
      getKernelModelDefinition('unknown-component-id' as ModelId),
    ).toBeUndefined()
  })

  it('preserves context-missing and configuration guards before invoking builders', async () => {
    const emptyContext = createEmptyKernelBuildContext()

    await expect(
      buildModelBRep(
        'hexagonal-column',
        { height: 8, count: 1, gap: 1, orientation: 'lying' },
        emptyContext,
      ),
    ).rejects.toThrow('MODEL_ASSET_INVALID:hexagonal-column-reference-missing')

    await expect(
      buildModelBRep(
        'opengrid-pillar',
        { mode: 'detachable-corner-seat', length: 3.8, offset: 0 },
        emptyContext,
      ),
    ).rejects.toThrow('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')

    await expect(
      buildModelBRep(
        'opengrid-stackable-box',
        {
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          cornerSeatMode: 'detachable-corner-seat',
        },
        emptyContext,
      ),
    ).rejects.toThrow('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')

    await expect(
      buildModelBRep(
        'opengrid-organizer-box',
        {
          ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
          cornerSeatMode: 'detachable-corner-seat',
        },
        emptyContext,
      ),
    ).rejects.toThrow('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')

    await expect(
      buildModelBRep(
        'opengrid-stackable-cylinder',
        {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          bottomSeatMode: 'detachable-corner-seat',
        },
        emptyContext,
      ),
    ).rejects.toThrow('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')

    await expect(
      buildModelBRep(
        'opengrid-openconnect-shelf',
        { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS },
        emptyContext,
      ),
    ).rejects.toThrow(
      'MODEL_ASSET_CONTEXT_MISSING:opengrid-openconnect-shelf-locked-slot',
    )

    await expect(
      buildModelBRep(
        'opengrid-openconnect-organizer',
        { ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS },
        emptyContext,
      ),
    ).rejects.toThrow(
      'MODEL_ASSET_CONTEXT_MISSING:opengrid-openconnect-organizer-locked-slot',
    )

    await expect(
      buildModelBRep('opengrid-snap-remover', {}, emptyContext),
    ).rejects.toThrow('MODEL_ASSET_CONTEXT_MISSING:opengrid-snap-remover')

    await expect(
      buildModelBRepWithParts(
        'opengrid-stackable-box',
        {
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          cornerSeatMode: 'detachable-corner-seat',
        },
        emptyContext,
      ),
    ).rejects.toThrow('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')

    await expect(
      buildModelBRepWithParts(
        'opengrid-organizer-box',
        {
          ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
          cornerSeatMode: 'detachable-corner-seat',
        },
        emptyContext,
      ),
    ).rejects.toThrow('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')

    await expect(
      buildModelBRepWithParts(
        'opengrid-stackable-cylinder',
        {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          bottomSeatMode: 'detachable-corner-seat',
        },
        emptyContext,
      ),
    ).rejects.toThrow('MODEL_ASSET_CONTEXT_MISSING:detachable-corner-seat')

    await expect(
      buildModelBRepWithParts(
        'opengrid-openconnect-organizer',
        { ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS },
        emptyContext,
      ),
    ).rejects.toThrow(
      'MODEL_ASSET_CONTEXT_MISSING:opengrid-openconnect-organizer-locked-slot',
    )

    const staleContext: KernelBuildContext = {
      getModularGridBaseTemplate: async () => ({}) as Shape3D,
      getHswCellTemplate: async () => ({}) as Shape3D,
      isGenerationCurrent: () => false,
    }
    await expect(
      buildModelBRep(
        'modular-grid-base',
        { rows: 2, columns: 2 },
        staleContext,
      ),
    ).rejects.toThrow('STALE_GENERATION')
    await expect(
      buildModelBRep('hsw-cell', { rows: 2, columns: 2 }, staleContext),
    ).rejects.toThrow('STALE_GENERATION')
  })
})
