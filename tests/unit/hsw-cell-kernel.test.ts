import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KernelBuildContext } from '../../src/cad-kernel/model'
import type { ModelParameterValues } from '../../src/cad-contract/units'
import { OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS } from '../../src/cad-contract/units'

const mocks = vi.hoisted(() => ({
  buildBoxBRep: vi.fn(() => ({ model: 'box', delete: vi.fn() })),
  buildHswCell: vi.fn(async () => ({ model: 'hsw-cell', delete: vi.fn() })),
  buildHexagonalColumn: vi.fn(async () => ({
    model: 'hexagonal-column',
    delete: vi.fn(),
  })),
  buildPillar: vi.fn(async () => ({
    model: 'opengrid-pillar',
    delete: vi.fn(),
  })),
  buildModularGridBase: vi.fn(async () => ({
    model: 'modular-grid-base',
    delete: vi.fn(),
  })),
  buildOpenGridBRep: vi.fn(async () => ({
    model: 'opengrid',
    delete: vi.fn(),
  })),
  buildOpenGridStackableBoxAsync: vi.fn(async () => ({
    model: 'opengrid-stackable-box',
    delete: vi.fn(),
  })),
  buildOpenGridOrganizerBox: vi.fn(() => ({
    model: 'opengrid-organizer-box',
    delete: vi.fn(),
  })),
  buildOpenGridDivider: vi.fn(async () => ({
    model: 'opengrid-divider',
    delete: vi.fn(),
  })),
  buildOpenGridStackableCylinder: vi.fn(() => ({
    model: 'opengrid-stackable-cylinder',
    delete: vi.fn(),
  })),
}))

vi.mock('../../src/cad-kernel/components/box/builder', () => ({
  buildBoxBRep: mocks.buildBoxBRep,
}))

vi.mock('../../src/cad-kernel/components/hsw-cell/builder', () => ({
  buildHswCell: mocks.buildHswCell,
}))

vi.mock('../../src/cad-kernel/components/hexagonal-column/builder', () => ({
  buildHexagonalColumn: mocks.buildHexagonalColumn,
}))

vi.mock('../../src/cad-kernel/components/opengrid-pillar/builder', () => ({
  buildPillar: mocks.buildPillar,
}))

vi.mock('../../src/cad-kernel/components/modular-grid-base/builder', () => ({
  buildModularGridBase: mocks.buildModularGridBase,
}))

vi.mock('../../src/cad-kernel/components/opengrid/builder', () => ({
  buildOpenGridBRep: mocks.buildOpenGridBRep,
}))

vi.mock(
  '../../src/cad-kernel/components/opengrid-stackable-box/builder',
  () => ({
    buildOpenGridStackableBoxAsync: mocks.buildOpenGridStackableBoxAsync,
  }),
)
vi.mock(
  '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder',
  () => ({
    buildOpenGridStackableCylinder: mocks.buildOpenGridStackableCylinder,
  }),
)
vi.mock(
  '../../src/cad-kernel/components/opengrid-organizer-box/builder',
  () => ({
    buildOpenGridOrganizerBox: mocks.buildOpenGridOrganizerBox,
  }),
)

vi.mock('../../src/cad-kernel/components/opengrid-divider/builder', () => ({
  buildOpenGridDivider: mocks.buildOpenGridDivider,
}))
import {
  buildModelBRep,
  getKernelModelDefinition,
  kernelModelDefinitions,
} from '../../src/cad-kernel/model'

const context = {
  getModularGridBaseTemplate: vi.fn(async () => ({ delete: vi.fn() })),
  getHswCellTemplate: vi.fn(async () => ({ delete: vi.fn() })),
  getHexagonalColumnReference: vi.fn(async () => ({ delete: vi.fn() })),
  getOpenGridDetachableCornerSeatReference: vi.fn(async () => ({
    model: 'detachable-corner-seat-reference',
    delete: vi.fn(),
  })),
  getOpenGridDetachableCornerSeatHolderReference: vi.fn(async () => ({
    model: 'detachable-corner-seat-holder-reference',
    delete: vi.fn(),
  })),
  getOpenGridSnapReference: vi.fn(async () => ({ delete: vi.fn() })),
} as unknown as KernelBuildContext

describe('HSW kernel model registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers each component as an independent kernel definition', () => {
    expect(kernelModelDefinitions.map((definition) => definition.id)).toEqual([
      'box',
      'modular-grid-base',
      'hsw-cell',
      'hexagonal-column',
      'opengrid-pillar',
      'opengrid',
      'opengrid-stackable-box',
      'opengrid-organizer-box',
      'opengrid-stackable-cylinder',
      'opengrid-open-shelf',
      'opengrid-openconnect-shelf',
      'opengrid-openconnect-organizer',
      'opengrid-snap',
      'opengrid-wall-cover',
      'opengrid-snap-remover',
      'opengrid-divider',
    ])
    expect(getKernelModelDefinition('hsw-cell')?.id).toBe('hsw-cell')
    expect(getKernelModelDefinition('hexagonal-column')?.id).toBe(
      'hexagonal-column',
    )
  })

  it('routes HSW to its own template getter and builder', async () => {
    const shape = await buildModelBRep(
      'hsw-cell',
      { rows: 2, columns: 3 },
      context,
    )

    expect(shape).toMatchObject({ model: 'hsw-cell' })
    expect(context.getHswCellTemplate).toHaveBeenCalledOnce()
    expect(mocks.buildHswCell).toHaveBeenCalledWith(
      { rows: 2, columns: 3 },
      expect.anything(),
      context,
    )
    expect(mocks.buildModularGridBase).not.toHaveBeenCalled()
    expect(context.getModularGridBaseTemplate).not.toHaveBeenCalled()
  })

  it('preserves existing builder routes after HSW registration', async () => {
    await buildModelBRep('box', { width: 20, depth: 30, height: 40 }, context)
    await buildModelBRep('modular-grid-base', { rows: 2, columns: 2 }, context)

    expect(mocks.buildBoxBRep).toHaveBeenCalledOnce()
    expect(mocks.buildModularGridBase).toHaveBeenCalledOnce()
    expect(context.getModularGridBaseTemplate).toHaveBeenCalledOnce()
  })

  it('routes the stackable-box model without loading a Snap reference', async () => {
    const unavailableSnapReferenceLoader = vi.fn(async () => {
      throw new Error('SNAP_REFERENCE_MUST_NOT_BE_LOADED')
    })
    const shape = await buildModelBRep(
      'opengrid-stackable-box',
      {
        x: 0.5,
        y: 1,
        height: 20,
        cornerSeatMode: 'detachable-corner-seat',
        fullBottomHoleGrid: false,
        basePlateMode: false,
      },
      {
        ...context,
        getOpenGridSnapReference: unavailableSnapReferenceLoader,
      },
    )

    expect(shape).toMatchObject({ model: 'opengrid-stackable-box' })
    expect(unavailableSnapReferenceLoader).not.toHaveBeenCalled()
    expect(mocks.buildOpenGridStackableBoxAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0.5,
        y: 1,
        height: 20,
        cornerSeatMode: 'detachable-corner-seat',
        fullBottomHoleGrid: false,
        basePlateMode: false,
      }),
      expect.objectContaining({
        isGenerationCurrent: undefined,
        detachableCornerSeatReference: expect.anything(),
        detachableCornerSeatHolderReference: expect.anything(),
      }),
    )
    expect(mocks.buildOpenGridBRep).not.toHaveBeenCalled()
  })

  it('routes the custom divider to its independent builder', async () => {
    const shape = await buildModelBRep(
      'opengrid-divider',
      { left: 1, right: 1, up: 2, down: 0, height: 20, wallThickness: 2 },
      context,
    )

    expect(shape).toMatchObject({ model: 'opengrid-divider' })
    expect(mocks.buildOpenGridDivider).toHaveBeenCalledWith(
      { left: 1, right: 1, up: 2, down: 0, height: 20, wallThickness: 2 },
      expect.objectContaining({
        isGenerationCurrent: undefined,
        yieldToEventLoop: undefined,
      }),
    )
    expect(mocks.buildOpenGridBRep).not.toHaveBeenCalled()
    expect(mocks.buildOpenGridStackableBoxAsync).not.toHaveBeenCalled()
  })

  it('rejects mismatched divider parameters before dispatch', async () => {
    await expect(
      buildModelBRep(
        'opengrid-divider',
        { rows: 1, columns: 1 } as ModelParameterValues,
        context,
      ),
    ).rejects.toThrow('MODEL_PARAMETERS_INVALID')
    expect(mocks.buildOpenGridDivider).not.toHaveBeenCalled()
    expect(mocks.buildOpenGridBRep).not.toHaveBeenCalled()
  })

  it('routes the stackable-cylinder model to its dedicated builder', async () => {
    const shape = await buildModelBRep(
      'opengrid-stackable-cylinder',
      {
        innerDiameter: 56,
        height: 30,
        thinBottomMode: false,
        bottomPlateMode: false,
        bottomSeatMode: 'detachable-corner-seat',
      },
      context,
    )

    expect(shape).toMatchObject({ model: 'opengrid-stackable-cylinder' })
    expect(mocks.buildOpenGridStackableCylinder).toHaveBeenCalledWith(
      expect.objectContaining({
        innerDiameter: 56,
        height: 30,
        thinBottomMode: false,
        bottomPlateMode: false,
        bottomSeatMode: 'detachable-corner-seat',
      }),
      expect.objectContaining({
        isGenerationCurrent: undefined,
        detachableCornerSeatReference: expect.anything(),
        detachableCornerSeatHolderReference: expect.anything(),
      }),
    )
    expect(mocks.buildOpenGridStackableBoxAsync).not.toHaveBeenCalled()
    expect(mocks.buildOpenGridBRep).not.toHaveBeenCalled()
  })
  it('routes hexagonal-column only to its own reference and builder', async () => {
    const shape = await buildModelBRep(
      'hexagonal-column',
      { height: 50, count: 3, gap: 1, orientation: 'lying' },
      context,
    )

    expect(shape).toMatchObject({ model: 'hexagonal-column' })
    expect(context.getHexagonalColumnReference).toHaveBeenCalledOnce()
    expect(mocks.buildHexagonalColumn).toHaveBeenCalledWith(
      { height: 50, count: 3, gap: 1, orientation: 'lying' },
      expect.objectContaining({ reference: expect.anything() }),
    )
    expect(mocks.buildHswCell).not.toHaveBeenCalled()
    expect(mocks.buildModularGridBase).not.toHaveBeenCalled()
  })
  it('keeps the adjustable positioning pillar asset-free', async () => {
    const shape = await buildModelBRep(
      'opengrid-pillar',
      { mode: 'positioning', length: 10, offset: 0 },
      context,
    )

    expect(shape).toMatchObject({ model: 'opengrid-pillar' })
    expect(mocks.buildPillar).toHaveBeenCalledWith(
      { mode: 'positioning', length: 10, offset: 0 },
      expect.objectContaining({
        isGenerationCurrent: undefined,
        yieldToEventLoop: undefined,
      }),
    )
    expect(context.getHexagonalColumnReference).not.toHaveBeenCalled()
    expect(
      context.getOpenGridDetachableCornerSeatReference,
    ).not.toHaveBeenCalled()
  })

  it('loads the shared male reference only for the detachable pillar mode', async () => {
    const parameters = {
      mode: 'detachable-corner-seat',
      length: 3.8,
      offset: 0,
    } as const
    const shape = await buildModelBRep('opengrid-pillar', parameters, context)

    expect(shape).toMatchObject({ model: 'opengrid-pillar' })
    expect(
      context.getOpenGridDetachableCornerSeatReference,
    ).toHaveBeenCalledOnce()
    expect(mocks.buildPillar).toHaveBeenCalledWith(
      parameters,
      expect.objectContaining({
        detachableCornerSeatReference: expect.objectContaining({
          model: 'detachable-corner-seat-reference',
        }),
      }),
    )
  })

  it('loads both shared references only for the detachable organizer-box mode', async () => {
    const parameters = {
      ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
      cornerSeatMode: 'detachable-corner-seat' as const,
    }
    const shape = await buildModelBRep(
      'opengrid-organizer-box',
      parameters,
      context,
    )

    expect(shape).toMatchObject({ model: 'opengrid-organizer-box' })
    expect(
      context.getOpenGridDetachableCornerSeatHolderReference,
    ).toHaveBeenCalledOnce()
    expect(
      context.getOpenGridDetachableCornerSeatReference,
    ).toHaveBeenCalledOnce()
    expect(mocks.buildOpenGridOrganizerBox).toHaveBeenCalledWith(
      parameters,
      expect.objectContaining({
        detachableCornerSeatReference: expect.objectContaining({
          model: 'detachable-corner-seat-reference',
        }),
        detachableCornerSeatHolderReference: expect.objectContaining({
          model: 'detachable-corner-seat-holder-reference',
        }),
      }),
    )
  })
})
