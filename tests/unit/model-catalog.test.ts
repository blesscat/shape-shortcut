import { describe, expect, it } from 'vitest'
import {
  cadPathForModel,
  groupModelDefinitions,
  getModelDefinition,
  modelIdForCadPath,
  modelDefinitions,
} from '../../src/features/cad/model-catalog'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_SNAP_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  type OpenGridParameters,
} from '../../src/cad-contract/units'

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
    customScrewPositions: [],
    ...overrides,
  }
}

describe('CAD component catalog', () => {
  it('provides static preview metadata for every visible chooser model', () => {
    const visibleDefinitions = groupModelDefinitions().flatMap(
      (group) => group.definitions,
    )

    expect(visibleDefinitions.map((definition) => definition.id)).toEqual([
      'opengrid',
      'opengrid-snap',
      'opengrid-pillar',
      'opengrid-divider',
      'opengrid-stackable-box',
      'opengrid-stackable-cylinder',
      'opengrid-snap-remover',
      'opengrid-open-shelf',
      'opengrid',
      'opengrid-snap',
      'hsw-cell',
    ])

    const previewImages = visibleDefinitions.map(
      (definition) => definition.previewImage,
    )
    expect(previewImages.every((preview) => preview !== undefined)).toBe(true)

    const resolvedPreviewImages = previewImages.filter(
      (preview): preview is NonNullable<typeof preview> =>
        preview !== undefined,
    )
    expect(
      new Set(resolvedPreviewImages.map((preview) => preview.src)).size,
    ).toBe(resolvedPreviewImages.length)
    expect(
      resolvedPreviewImages.every(
        (preview) =>
          preview.src.startsWith('/model-previews/') &&
          preview.src.endsWith('.png') &&
          preview.alt.length > 0 &&
          preview.width > 0 &&
          preview.height > 0,
      ),
    ).toBe(true)
    expect(
      resolvedPreviewImages.every(
        (preview) => preview.width / preview.height === 16 / 10,
      ),
    ).toBe(true)
  })

  it('orders visible model families and omits other models from chooser groups', () => {
    const groups = groupModelDefinitions()

    expect(groups.map((group) => group.key)).toEqual(['opengrid', 'hsw'])
    expect(groups.map((group) => group.label)).toEqual([
      'models.family.opengrid',
      'models.family.hsw',
    ])

    expect(groups[0]?.definitions.map((definition) => definition.id)).toEqual([
      'opengrid',
      'opengrid-snap',
      'opengrid-pillar',
      'opengrid-divider',
      'opengrid-stackable-box',
      'opengrid-stackable-cylinder',
      'opengrid-snap-remover',
      'opengrid-open-shelf',
      'opengrid',
      'opengrid-snap',
    ])
    expect(groups[0]?.subgroups?.map((subgroup) => subgroup.key)).toEqual([
      'desk',
      'wall',
    ])
    expect(groups[1]?.definitions.map((definition) => definition.id)).toEqual([
      'hsw-cell',
    ])

    const groupedIds = groups.flatMap((group) =>
      group.definitions.map((definition) => definition.id),
    )
    expect(groupedIds).not.toEqual(
      expect.arrayContaining(['box', 'modular-grid-base', 'hexagonal-column']),
    )
  })

  it('provides family-relative selection labels without changing full names', () => {
    const expectedLabels = [
      ['opengrid', 'models.model.opengrid.selection'],
      ['opengrid-snap', 'models.model.opengrid-snap.selection'],
      ['opengrid-pillar', 'models.model.opengrid-pillar.selection'],
      ['opengrid-divider', 'models.model.opengrid-divider.selection'],
      [
        'opengrid-stackable-box',
        'models.model.opengrid-stackable-box.selection',
      ],
      [
        'opengrid-stackable-cylinder',
        'models.model.opengrid-stackable-cylinder.selection',
      ],
      ['opengrid-snap-remover', 'models.model.opengrid-snap-remover.selection'],
      ['opengrid-open-shelf', 'models.model.opengrid-open-shelf.selection'],
      ['hsw-cell', 'models.model.hsw-cell.selection'],
    ] as const

    for (const [id, selectionLabel] of expectedLabels) {
      expect(getModelDefinition(id)).toMatchObject({ selectionLabel })
    }

    expect(getModelDefinition('opengrid')?.displayName).toBe(
      'models.model.opengrid.name',
    )
    expect(getModelDefinition('opengrid-snap')?.displayName).toBe(
      'models.model.opengrid-snap.name',
    )
    expect(getModelDefinition('hsw-cell')?.displayName).toBe(
      'models.model.hsw-cell.name',
    )
  })

  it('exposes independent model definitions including OpenGrid', () => {
    expect(modelDefinitions.map((definition) => definition.id)).toEqual([
      'box',
      'modular-grid-base',
      'hsw-cell',
      'hexagonal-column',
      'opengrid',
      'opengrid-snap',
      'opengrid-pillar',
      'opengrid-divider',
      'opengrid-stackable-box',
      'opengrid-stackable-cylinder',
      'opengrid-snap-remover',
      'opengrid-open-shelf',
    ])

    const grid = getModelDefinition('modular-grid-base')
    expect(grid?.displayName).toBe('models.model.modular-grid-base.name')
    expect(grid?.selectionDescription).toBe(
      'models.model.modular-grid-base.description',
    )
    expect(grid?.parameterSchema.map((field) => field.key)).toEqual([
      'rows',
      'columns',
    ])
    expect(grid?.parameterSchema.map((field) => field.max)).toEqual([20, 20])
    expect(grid?.exportFileName({ rows: 2, columns: 3 })).toBe(
      'modular-grid-base-3x2.step',
    )
    expect(grid?.stlFileName({ rows: 2, columns: 3 })).toBe(
      'modular-grid-base-3x2.stl',
    )
    expect(grid?.validateParameters({ rows: 2, columns: 3 })).toEqual({
      valid: true,
      value: {
        modelId: 'modular-grid-base',
        parameters: { rows: 2, columns: 3 },
      },
    })
    expect(grid?.boundsForParameters({ rows: 2, columns: 3 })).toEqual({
      min: [-30, -20, 0],
      max: [30, 20, 5],
    })

    const hsw = getModelDefinition('hsw-cell')
    expect(hsw?.displayName).toBe('models.model.hsw-cell.name')
    expect(hsw?.selectionDescription).toBe('models.model.hsw-cell.description')
    expect(hsw?.parameterSchema).toEqual([
      expect.objectContaining({
        key: 'rows',
        control: 'range',
        min: 1,
        max: 20,
        step: 1,
      }),
      expect.objectContaining({
        key: 'columns',
        control: 'range',
        min: 1,
        max: 20,
        step: 1,
      }),
    ])
    expect(hsw?.exportFileName({ rows: 2, columns: 3 })).toBe(
      'hsw-cell-3x2.step',
    )
    expect(hsw?.stlFileName({ rows: 2, columns: 3 })).toBe('hsw-cell-3x2.stl')
    expect(hsw?.validateParameters({ rows: 2, columns: 3 })).toEqual({
      valid: true,
      value: { modelId: 'hsw-cell', parameters: { rows: 2, columns: 3 } },
    })
    expect(hsw?.boundsForParameters({ rows: 2, columns: 2 })).toEqual({
      min: [-23.84456659364325, -29.500000622529047, 0],
      max: [23.84456659364325, 29.500000622529047, 8],
    })

    const hexagonalColumn = getModelDefinition('hexagonal-column')
    expect(hexagonalColumn?.displayName).toBe(
      'models.model.hexagonal-column.name',
    )
    expect(hexagonalColumn?.parameterSchema).toEqual([
      expect.objectContaining({
        key: 'height',
        control: 'range-text',
        defaultValue: 8,
        min: 1,
        max: 500,
        sliderMin: 1,
        sliderMax: 200,
        step: 1,
      }),
      expect.objectContaining({
        key: 'count',
        control: 'range',
        defaultValue: 1,
        min: 1,
        max: 20,
        step: 1,
      }),
      expect.objectContaining({
        key: 'gap',
        control: 'range-text',
        defaultValue: 1,
        min: 1,
        max: 99,
        sliderMin: 1,
        sliderMax: 10,
        step: 1,
      }),
    ])
    expect(hexagonalColumn?.defaultParameters).toEqual({
      height: 8,
      count: 1,
      gap: 1,
      orientation: 'lying',
    })
    expect(
      hexagonalColumn?.exportFileName({
        height: 50,
        count: 3,
        gap: 1,
        orientation: 'lying',
      }),
    ).toBe('hexagonal-column-50x3-g1-lying.step')
    expect(
      hexagonalColumn?.stlFileName({
        height: 50,
        count: 3,
        gap: 1,
        orientation: 'lying',
      }),
    ).toBe('hexagonal-column-50x3-g1-lying.stl')
    expect(
      hexagonalColumn?.validateParameters({
        height: 50,
        count: 3,
        gap: 1,
        orientation: 'lying',
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'hexagonal-column',
        parameters: {
          height: 50,
          count: 3,
          gap: 1,
          orientation: 'lying',
        },
      },
    })
  })

  it('maps registered models to dedicated CAD routes and rejects unknown paths', () => {
    expect(cadPathForModel('box')).toBe('/cad/box')
    expect(cadPathForModel('modular-grid-base')).toBe('/cad/modular-grid-base')
    expect(cadPathForModel('hsw-cell')).toBe('/cad/hsw-cell')
    expect(cadPathForModel('hexagonal-column')).toBe('/cad/hexagonal-column')
    expect(modelIdForCadPath('/cad/box')).toBe('box')
    expect(modelIdForCadPath('/cad/modular-grid-base/')).toBe(
      'modular-grid-base',
    )
    expect(modelIdForCadPath('/cad/hsw-cell/')).toBe('hsw-cell')
    expect(modelIdForCadPath('/cad/hexagonal-column/')).toBe('hexagonal-column')
    expect(cadPathForModel('opengrid')).toBe('/cad/opengrid')
    expect(modelIdForCadPath('/cad/opengrid/')).toBe('opengrid')
    expect(cadPathForModel('opengrid-stackable-box')).toBe(
      '/cad/opengrid-stackable-box',
    )
    expect(modelIdForCadPath('/cad/opengrid-stackable-box/')).toBe(
      'opengrid-stackable-box',
    )
    expect(cadPathForModel('opengrid-snap')).toBe('/cad/opengrid-snap')
    expect(modelIdForCadPath('/cad/opengrid-snap/')).toBe('opengrid-snap')
    expect(cadPathForModel('opengrid-snap-remover')).toBe(
      '/cad/opengrid-snap-remover',
    )
    expect(modelIdForCadPath('/cad/opengrid-snap-remover/')).toBe(
      'opengrid-snap-remover',
    )
    expect(modelIdForCadPath('/cad/unknown')).toBeUndefined()
    expect(modelIdForCadPath('/cad/box-normal')).toBeUndefined()
    expect(modelIdForCadPath('/docs/box')).toBeUndefined()
  })

  it('keeps OpenGrid parameters isolated from other model definitions', () => {
    const opengrid = getModelDefinition('opengrid')
    expect(opengrid?.displayName).toBe('models.model.opengrid.name')
    expect(opengrid?.defaultParameters).toEqual(opengridParameters())
    const parameters = opengridParameters({
      variant: 'Lite' as const,
      rows: 2,
      columns: 3,
      screwKind: 'custom' as const,
      screwMode: 'custom' as const,
      customScrewPositions: [{ row: 0, column: 1 }],
      connectorHoles: 'enabled' as const,
    })
    expect(opengrid?.validateParameters(parameters)).toEqual({
      valid: true,
      value: { modelId: 'opengrid', parameters },
    })
    expect(opengrid?.boundsForParameters(parameters)).toEqual({
      min: [-42, -28, 0],
      max: [42, 28, 4],
    })
    expect(opengrid?.exportFileName(parameters)).toMatch(
      /^opengrid-lite-3x2-xnone-ynone-custom-custom-corners-enabled-[0-9a-f]{8}\.step$/,
    )
    expect(opengrid?.stlFileName(parameters)).toMatch(
      /^opengrid-lite-3x2-xnone-ynone-custom-custom-corners-enabled-[0-9a-f]{8}\.stl$/,
    )
    expect(
      getModelDefinition('modular-grid-base')?.validateParameters(parameters),
    ).toEqual({ valid: false, issues: expect.any(Array) })
    expect(getModelDefinition('box')?.validateParameters(parameters)).toEqual({
      valid: false,
      issues: expect.any(Array),
    })
  })

  it('registers Snap profiles and optional body features', () => {
    const snap = getModelDefinition('opengrid-snap')
    expect(snap?.displayName).toBe('models.model.opengrid-snap.name')
    expect(snap?.selectionDescription).toBe(
      'models.model.opengrid-snap.description',
    )
    expect(snap?.parameterSchema.map((field) => field.key)).toEqual([
      'offset',
      'magnetHoleLength',
      'magnetHoleWidth',
      'magnetHoleDiameter',
      'magnetHoleThickness',
    ])
    expect(snap?.parameterSchema[0]).toMatchObject({
      control: 'range',
      min: 0,
      max: OPENGRID_SNAP_CONFIGURATION.maxOffset,
      step: 0.05,
    })
    expect(
      snap?.parameterSchema.slice(1).map((field) => field.control),
    ).toEqual(['range', 'range', 'range', 'range'])
    expect(snap?.parameterSchema.slice(1)).toEqual([
      expect.objectContaining({
        key: 'magnetHoleLength',
        defaultValue:
          OPENGRID_SNAP_CONFIGURATION.magnetHole.defaultPlanDimension,
        min: OPENGRID_SNAP_CONFIGURATION.magnetHole.minPlanDimension,
        max: OPENGRID_SNAP_CONFIGURATION.magnetHole.maxPlanDimension,
        step: OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep,
      }),
      expect.objectContaining({
        key: 'magnetHoleWidth',
        defaultValue:
          OPENGRID_SNAP_CONFIGURATION.magnetHole.defaultPlanDimension,
        min: OPENGRID_SNAP_CONFIGURATION.magnetHole.minPlanDimension,
        max: OPENGRID_SNAP_CONFIGURATION.magnetHole.maxPlanDimension,
        step: OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep,
      }),
      expect.objectContaining({
        key: 'magnetHoleDiameter',
        defaultValue:
          OPENGRID_SNAP_CONFIGURATION.magnetHole.defaultPlanDimension,
        min: OPENGRID_SNAP_CONFIGURATION.magnetHole.minPlanDimension,
        max: OPENGRID_SNAP_CONFIGURATION.magnetHole.maxPlanDimension,
        step: OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep,
      }),
      expect.objectContaining({
        key: 'magnetHoleThickness',
        defaultValue: OPENGRID_SNAP_CONFIGURATION.magnetHole.defaultThickness,
        min: OPENGRID_SNAP_CONFIGURATION.magnetHole.minThickness,
        max: OPENGRID_SNAP_CONFIGURATION.magnetHole.maxThickness.Full,
        step: OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep,
      }),
    ])
    expect(snap?.defaultParameters).toEqual({
      variant: 'Full',
      profile: 'Standard',
      offset: 0,
      footprint: 'full',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    })
    expect(
      snap?.boundsForParameters({
        variant: 'Lite',
        profile: 'Standard',
        offset: 0.2,
        footprint: 'full',
        fourCornerLocatingHoles: false,
        centerRemoverHole: false,
        magnetHoleShape: 'none',
        magnetHoleLength: 0,
        magnetHoleWidth: 0,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 0,
      }),
    ).toEqual({
      min: [-12.9, -12.9, 0],
      max: [12.9, 12.9, 3.4],
    })
    expect(
      snap?.exportFileName({
        variant: 'Full',
        profile: 'Standard',
        offset: 0.2,
        footprint: 'full',
        fourCornerLocatingHoles: false,
        centerRemoverHole: false,
        magnetHoleShape: 'none',
        magnetHoleLength: 0,
        magnetHoleWidth: 0,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 0,
      }),
    ).toBe('opengrid-snap-standard-full-offset0.2-full-corners0-center0.step')
    expect(
      snap?.stlFileName({
        variant: 'Lite',
        profile: 'Standard',
        offset: 0.15,
        footprint: 'full',
        fourCornerLocatingHoles: false,
        centerRemoverHole: false,
        magnetHoleShape: 'none',
        magnetHoleLength: 0,
        magnetHoleWidth: 0,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 0,
      }),
    ).toBe('opengrid-snap-standard-lite-offset0.15-full-corners0-center0.stl')
    expect(
      snap?.fixedStepDownload?.({
        variant: 'Lite',
        profile: 'Directional',
        offset: 0.35,
        footprint: 'half',
        fourCornerLocatingHoles: true,
        centerRemoverHole: true,
        magnetHoleShape: 'none',
        magnetHoleLength: 0,
        magnetHoleWidth: 0,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 0,
      }),
    ).toEqual({
      url: '/downloads/snap-half.step',
      fileName: 'Half.step',
    })
    expect(
      snap?.fixedStepDownload?.({
        variant: 'Lite',
        profile: 'Directional',
        offset: 0.35,
        footprint: 'quarter',
        fourCornerLocatingHoles: true,
        centerRemoverHole: true,
        magnetHoleShape: 'none',
        magnetHoleLength: 0,
        magnetHoleWidth: 0,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 0,
      }),
    ).toEqual({
      url: '/downloads/snap-quarter.step',
      fileName: 'Quarter.step',
    })
    expect(
      snap?.fixedStepDownload?.({
        variant: 'Lite',
        profile: 'Directional',
        offset: 0.35,
        footprint: 'full',
        fourCornerLocatingHoles: true,
        centerRemoverHole: true,
        magnetHoleShape: 'none',
        magnetHoleLength: 0,
        magnetHoleWidth: 0,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 0,
      }),
    ).toBeNull()
    expect(
      snap?.validateParameters({
        variant: 'Full',
        profile: 'Directional',
        offset: 0.2,
        footprint: 'full',
        fourCornerLocatingHoles: true,
        centerRemoverHole: true,
        magnetHoleShape: 'none',
        magnetHoleLength: 0,
        magnetHoleWidth: 0,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 0,
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-snap',
        parameters: {
          variant: 'Full',
          profile: 'Directional',
          offset: 0.2,
          footprint: 'full',
          fourCornerLocatingHoles: true,
          centerRemoverHole: true,
          magnetHoleShape: 'none',
          magnetHoleLength: 0,
          magnetHoleWidth: 0,
          magnetHoleDiameter: 0,
          magnetHoleThickness: 0,
        },
      },
    })
  })

  it('exposes the independent OpenGrid stackable-box definition', () => {
    const definition = getModelDefinition('opengrid-stackable-box')

    expect(definition).toMatchObject({
      id: 'opengrid-stackable-box',
      buildKey: 'opengrid-stackable-box',
      family: 'opengrid',
      displayName: 'models.model.opengrid-stackable-box.name',
    })
    expect(definition?.parameterSchema.slice(0, 3)).toEqual([
      expect.objectContaining({
        key: 'x',
        min: 0.5,
        max: OPENGRID_STACKABLE_BOX_CONFIGURATION.maxX,
        step: 0.5,
      }),
      expect.objectContaining({
        key: 'y',
        min: 0.5,
        max: OPENGRID_STACKABLE_BOX_CONFIGURATION.maxY,
        step: 0.5,
      }),
      expect.objectContaining({
        key: 'height',
        min: 10,
        max: 500,
        step: 1,
        control: 'range-text',
        sliderMin: 10,
        sliderMax: 200,
      }),
    ])
    expect(
      definition?.parameterSchema.slice(3).map((field) => field.key),
    ).toEqual([
      'openingPlusXDepth',
      'openingPlusXBottomLength',
      'openingPlusXAngle',
      'openingMinusXDepth',
      'openingMinusXBottomLength',
      'openingMinusXAngle',
      'openingPlusYDepth',
      'openingPlusYBottomLength',
      'openingPlusYAngle',
      'openingMinusYDepth',
      'openingMinusYBottomLength',
      'openingMinusYAngle',
    ])
    expect(definition?.parameterSchema.at(5)).toMatchObject({
      key: 'openingPlusXAngle',
      unit: 'degree',
      sliderDirection: 'rtl',
    })
    expect(definition?.defaultParameters).toEqual(
      OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    )
    expect(definition?.selectionDescription).toBe(
      'models.model.opengrid-stackable-box.description',
    )
    expect(
      definition?.validateParameters({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        x: 0.5,
        y: 1,
        height: 20,
        cornerSeatMode: 'hole',
        fullBottomHoleGrid: false,
        basePlateMode: false,
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-stackable-box',
        parameters: {
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          x: 0.5,
          y: 1,
          height: 20,
          cornerSeatMode: 'hole',
          fullBottomHoleGrid: false,
          basePlateMode: false,
        },
      },
    })
    expect(
      definition?.exportFileName({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        x: 1.5,
        y: 2,
        height: 30,
        cornerSeatMode: 'hole',
        fullBottomHoleGrid: false,
        basePlateMode: false,
      }),
    ).toBe('opengrid-stackable-box-1.5x2-h30-seats-hole.step')
    expect(
      definition?.stlFileName({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        x: 1.5,
        y: 2,
        height: 30,
        cornerSeatMode: 'hole',
        fullBottomHoleGrid: false,
        basePlateMode: false,
      }),
    ).toBe('opengrid-stackable-box-1.5x2-h30-seats-hole.stl')
  })

  it('exposes the independent OpenGrid divider definition and route', () => {
    const definition = getModelDefinition('opengrid-divider')

    expect(definition).toMatchObject({
      id: 'opengrid-divider',
      buildKey: 'opengrid-divider',
      family: 'opengrid',
      displayName: 'models.model.opengrid-divider.name',
    })
    expect(definition?.parameterSchema.map((field) => field.key)).toEqual([
      'left',
      'right',
      'up',
      'down',
      'height',
      'wallThickness',
    ])
    expect(definition?.parameterSchema.slice(0, 4)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'left', min: 0, max: 10, step: 0.5 }),
        expect.objectContaining({ key: 'right', min: 0, max: 10, step: 0.5 }),
        expect.objectContaining({ key: 'up', min: 0, max: 10, step: 0.5 }),
        expect.objectContaining({ key: 'down', min: 0, max: 10, step: 0.5 }),
      ]),
    )
    expect(definition?.parameterSchema.at(-1)).toMatchObject({
      key: 'wallThickness',
      control: 'range-text',
      min: OPENGRID_DIVIDER_CONFIGURATION.minWallThickness,
      max: OPENGRID_DIVIDER_CONFIGURATION.maxWallThickness,
      step: 1,
      defaultValue:
        OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.wallThickness,
    })
    expect(definition?.parameterSchema.at(4)).toMatchObject({
      key: 'height',
      control: 'range-text',
      min: 2,
      max: 500,
      step: 1,
      sliderMin: 2,
      sliderMax: 200,
    })
    expect(definition?.selectionDescription).toBe(
      'models.model.opengrid-divider.description',
    )
    expect(definition?.defaultParameters).toEqual({
      left: 1.5,
      right: 1.5,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })
    expect(definition?.exportFileName(definition.defaultParameters)).toBe(
      'opengrid-divider-l1.5-r1.5-u0-d0-t2-h20.step',
    )
    expect(definition?.stlFileName(definition.defaultParameters)).toBe(
      'opengrid-divider-l1.5-r1.5-u0-d0-t2-h20.stl',
    )
    expect(cadPathForModel('opengrid-divider')).toBe('/cad/opengrid-divider')
    expect(modelIdForCadPath('/cad/opengrid-divider/')).toBe('opengrid-divider')
  })

  it('exposes the independent OpenGrid pillar definition and route', () => {
    const definition = getModelDefinition('opengrid-pillar')

    expect(definition).toMatchObject({
      id: 'opengrid-pillar',
      buildKey: 'opengrid-pillar',
      family: 'opengrid',
      displayName: 'models.model.opengrid-pillar.name',
    })
    expect(definition?.selectionDescription).toBe(
      'models.model.opengrid-pillar.description',
    )
    expect(definition?.parameterSchema.map((field) => field.key)).toEqual([
      'length',
      'offset',
    ])
    expect(definition?.defaultParameters).toEqual({
      mode: 'standard',
      offset: 0,
    })
    expect(
      definition?.validateParameters({
        mode: 'standard',
        offset: 0,
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-pillar',
        parameters: { mode: 'standard', offset: 0 },
      },
    })
    expect(
      definition?.boundsForParameters({
        mode: 'thin-shell',
        offset: 0,
      }),
    ).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 6],
    })
    expect(
      definition?.boundsForParameters({
        mode: 'standard',
        offset: 0,
      }),
    ).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 9],
    })
    expect(
      definition?.boundsForParameters({
        mode: 'positioning',
        length: 25,
        offset: 0.25,
      }),
    ).toEqual({
      min: [-2.625, -2.625, 0],
      max: [2.625, 2.625, 25],
    })
    expect(definition?.exportFileName({ mode: 'standard', offset: 0 })).toBe(
      'pillar-9-standard.step',
    )
    expect(definition?.stlFileName({ mode: 'thin-shell', offset: 0 })).toBe(
      'pillar-6-thin-shell.stl',
    )
    expect(cadPathForModel('opengrid-pillar')).toBe('/cad/opengrid-pillar')
    expect(modelIdForCadPath('/cad/opengrid-pillar/')).toBe('opengrid-pillar')
  })

  it('exposes the independent OpenGrid stackable-cylinder definition', () => {
    const definition = getModelDefinition('opengrid-stackable-cylinder')

    expect(definition).toMatchObject({
      id: 'opengrid-stackable-cylinder',
      buildKey: 'opengrid-stackable-cylinder',
      family: 'opengrid',
      displayName: 'models.model.opengrid-stackable-cylinder.name',
    })
    expect(definition?.parameterSchema).toHaveLength(14)
    expect(definition?.parameterSchema).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'diameter',
          min: 20,
          max: 300,
          step: 1,
          control: 'range-text',
        }),
        expect.objectContaining({
          key: 'height',
          min: 10,
          max: 500,
          step: 1,
          control: 'range-text',
          sliderMin: 10,
          sliderMax: 200,
        }),
        expect.objectContaining({
          key: 'openingPlusXAngle',
          unit: 'degree',
          min: 1,
          max: 90,
          step: 1,
          sliderDirection: 'rtl',
        }),
      ]),
    )
    expect(definition?.defaultParameters).toEqual(
      OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
    )
    expect(definition?.selectionDescription).toBe(
      'models.model.opengrid-stackable-cylinder.description',
    )
    expect(
      definition?.validateParameters({ diameter: 60, height: 20 }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-stackable-cylinder',
        parameters: {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        },
      },
    })
    expect(
      definition?.validateParameters({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        bottomSeatMode: 'center-hook',
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-stackable-cylinder',
        parameters: {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          bottomSeatMode: 'center-hook',
        },
      },
    })
    expect(
      definition?.exportFileName(
        OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      ),
    ).toBe('opengrid-stackable-cylinder-d60-h20-seats-hole.step')
    expect(
      definition?.stlFileName({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        thinBottomMode: true,
        bottomSeatMode: 'none',
      }),
    ).toBe('opengrid-stackable-cylinder-d60-h20-seats-none-thin.stl')
    expect(
      definition?.exportFileName({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        bottomPlateMode: true,
      }),
    ).toBe('opengrid-stackable-cylinder-d60-h20-seats-hole-bottom-plate.step')
  })
})
