import { describe, expect, it } from 'vitest'
import {
  COMPONENT_PARAMETER_STORAGE_KEY,
  createComponentParameterStore,
} from '../../src/features/cad/parameters'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_SNAP_CONFIGURATION,
  OPENGRID_DIVIDER_CONFIGURATION,
  PILLAR_CONFIGURATION,
  type OpenGridParameters,
} from '../../src/cad-contract/units'

type MemoryStorage = {
  data: Map<string, string>
  writes: string[]
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function createMemoryStorage(initial?: string): MemoryStorage {
  const data = new Map<string, string>()
  const writes: string[] = []
  if (initial !== undefined) data.set(COMPONENT_PARAMETER_STORAGE_KEY, initial)

  return {
    data,
    writes,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(value)
      data.set(key, value)
    },
  }
}

function createThrowingStorage(): Pick<MemoryStorage, 'getItem' | 'setItem'> {
  return {
    getItem: () => {
      throw new Error('storage read failed')
    },
    setItem: () => {
      throw new Error('storage write failed')
    },
  }
}

function createPayload(values: Record<string, unknown>, version = 1): string {
  return JSON.stringify({ version, values })
}

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

describe('component parameter store', () => {
  it('persists organizer-box snapshots independently and rejects malformed entries', () => {
    const storage = createMemoryStorage()
    const parameters = {
      ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
      holeSpacingMode: 'independent' as const,
      holeSpacingX: 3,
      holeSpacingY: 4,
      holeShape: 'hexagon' as const,
      bottomInterfaceMode: 'detachable-corner-seat' as const,
    }
    const store = createComponentParameterStore({ storage })

    expect(store.set('opengrid-organizer-box', parameters)).toBe(true)
    expect(store.get('opengrid-organizer-box')).toEqual(parameters)

    const persisted = JSON.parse(
      storage.data.get(COMPONENT_PARAMETER_STORAGE_KEY) ?? '{}',
    ) as { values?: Record<string, Record<string, unknown>> }
    expect(persisted.values?.legacy?.['opengrid-organizer-box']).toEqual(
      parameters,
    )
    expect(persisted.values?.legacy).not.toHaveProperty(
      'opengrid-stackable-box',
    )
    store.dispose()

    const malformedStorage = createMemoryStorage(
      createPayload({
        'opengrid-organizer-box': { ...parameters, holeDepth: 0 },
      }),
    )
    const malformedStore = createComponentParameterStore({
      storage: malformedStorage,
    })
    expect(malformedStore.get('opengrid-organizer-box')).toEqual(
      OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    )
    malformedStore.dispose()
  })

  it('keeps Desk and Wall parameter snapshots in separate scopes', () => {
    const storage = createMemoryStorage()
    const deskStore = createComponentParameterStore({
      storage,
      systemContext: 'desk',
    })
    const wallStore = createComponentParameterStore({
      storage,
      systemContext: 'wall',
    })

    expect(
      deskStore.set('opengrid-snap', {
        variant: 'Lite',
        profile: 'Standard',
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
    ).toBe(true)
    expect(
      wallStore.set('opengrid-snap', {
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
      }),
    ).toBe(true)

    expect(deskStore.get('opengrid-snap')).toMatchObject({
      variant: 'Lite',
      offset: 0.2,
      fourCornerLocatingHoles: true,
    })
    expect(wallStore.get('opengrid-snap')).toMatchObject({
      variant: 'Full',
      offset: 0,
      fourCornerLocatingHoles: false,
    })

    const persisted = JSON.parse(
      storage.data.get(COMPONENT_PARAMETER_STORAGE_KEY) ?? '{}',
    ) as { version?: number; values?: Record<string, unknown> }
    expect(persisted.version).toBe(2)
    expect(persisted.values?.desk).toMatchObject({
      'opengrid-snap': expect.objectContaining({ variant: 'Lite' }),
    })
    expect(persisted.values?.wall).toMatchObject({
      'opengrid-snap': expect.objectContaining({ variant: 'Full' }),
    })

    deskStore.dispose()
    wallStore.dispose()
  })

  it('does not use an unscoped legacy value for a system route', () => {
    const storage = createMemoryStorage(
      createPayload({
        'opengrid-snap': {
          variant: 'Full',
          profile: 'Standard',
          offset: 0.2,
          footprint: 'full',
          fourCornerLocatingHoles: false,
          centerRemoverHole: false,
        },
      }),
    )
    const store = createComponentParameterStore({
      storage,
      systemContext: 'desk',
    })

    expect(store.get('opengrid-snap')).toEqual({
      variant: 'Lite',
      profile: 'Standard',
      offset: 0.25,
      footprint: 'full',
      fourCornerLocatingHoles: true,
      centerRemoverHole: true,
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    })
    store.dispose()
  })

  it('persists active Snap magnet dimensions as typed values and rejects conflicts', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })
    const squareMagnet = {
      ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
      variant: 'Full' as const,
      magnetHoleShape: 'square' as const,
      magnetHoleLength: 6,
      magnetHoleWidth: 4,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 2,
    }

    expect(store.set('opengrid-snap', squareMagnet)).toBe(true)
    expect(store.get('opengrid-snap')).toEqual(squareMagnet)

    const persisted = JSON.parse(
      storage.data.get(COMPONENT_PARAMETER_STORAGE_KEY) ?? '{}',
    ) as { values?: { legacy?: Record<string, unknown> } }
    expect(persisted.values?.legacy?.['opengrid-snap']).toEqual(squareMagnet)
    expect(persisted.values?.legacy?.['opengrid-snap']).not.toHaveProperty(
      'halfCellX',
    )

    expect(
      store.set('opengrid-snap', {
        ...squareMagnet,
        centerRemoverHole: true,
      }),
    ).toBe(false)
    expect(store.get('opengrid-snap')).toEqual(squareMagnet)

    const roundMagnet = {
      ...squareMagnet,
      magnetHoleShape: 'round' as const,
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 8,
    }
    expect(store.set('opengrid-snap', roundMagnet)).toBe(true)
    expect(store.get('opengrid-snap')).toEqual(roundMagnet)
    store.dispose()
  })

  it('uses Desk container presets only when the Desk scope has no saved value', () => {
    const legacyBox = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 20,
      thinShellMode: false,
    }
    const legacyCylinder = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 80,
      height: 45,
      thinBottomMode: false,
    }
    const storage = createMemoryStorage(
      createPayload({
        'opengrid-stackable-box': legacyBox,
        'opengrid-stackable-cylinder': legacyCylinder,
      }),
    )
    const deskStore = createComponentParameterStore({
      storage,
      systemContext: 'desk',
    })
    const legacyStore = createComponentParameterStore({ storage })

    expect(deskStore.get('opengrid-stackable-box')).toEqual({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 4,
      y: 2,
      height: 30,
      basePlateMode: false,
      thinShellMode: true,
    })
    expect(deskStore.get('opengrid-stackable-cylinder')).toEqual({
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 60,
      height: 30,
      thinBottomMode: true,
      bottomPlateMode: false,
    })
    expect(legacyStore.get('opengrid-stackable-box')).toEqual(legacyBox)
    expect(legacyStore.get('opengrid-stackable-cylinder')).toEqual(
      legacyCylinder,
    )

    const savedDeskBox = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 4,
      y: 2,
      height: 25,
    }
    const savedDeskCylinder = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 72,
      height: 35,
    }
    expect(deskStore.set('opengrid-stackable-box', savedDeskBox)).toBe(true)
    expect(
      deskStore.set('opengrid-stackable-cylinder', savedDeskCylinder),
    ).toBe(true)
    expect(deskStore.get('opengrid-stackable-box')).toEqual(savedDeskBox)
    expect(deskStore.get('opengrid-stackable-cylinder')).toEqual(
      savedDeskCylinder,
    )

    deskStore.dispose()
    legacyStore.dispose()
  })

  it('uses each component definition default when no value is stored', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })

    expect(store.get('box')).toEqual({ width: 20, depth: 30, height: 40 })
    expect(store.get('modular-grid-base')).toEqual({ rows: 1, columns: 1 })
    expect(store.get('hsw-cell')).toEqual({ rows: 1, columns: 1 })
    expect(store.get('opengrid')).toEqual(opengridParameters())
    expect(store.get('opengrid-stackable-box')).toEqual(
      OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    )
    expect(store.get('opengrid-stackable-cylinder')).toEqual(
      OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
    )
    expect(store.get('opengrid-snap')).toEqual(
      OPENGRID_SNAP_CONFIGURATION.defaultParameters,
    )
    expect(store.get('opengrid-snap-remover')).toEqual({})
    expect(store.get('opengrid-divider')).toEqual(
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
    )
    expect(store.get('opengrid-pillar')).toEqual(
      PILLAR_CONFIGURATION.defaultParameters,
    )

    store.dispose()
  })

  it('hydrates legacy OpenGrid snapshots with half-cell and target defaults', () => {
    const legacy = { ...opengridParameters() } as Record<string, unknown>
    delete legacy.halfCellX
    delete legacy.halfCellY
    delete legacy.targetWidth
    delete legacy.targetDepth
    delete legacy.fitToTarget

    const storage = createMemoryStorage(createPayload({ opengrid: legacy }))
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid')).toMatchObject({
      halfCellX: 'none',
      halfCellY: 'none',
      targetWidth: 0,
      targetDepth: 0,
      fitToTarget: false,
    })
    store.dispose()
  })

  it('restores valid typed values for every component', () => {
    const storage = createMemoryStorage(
      createPayload({
        box: { width: 25, depth: 30, height: 40 },
        'modular-grid-base': { rows: 2, columns: 3 },
        'hsw-cell': { rows: 4, columns: 2 },
        opengrid: opengridParameters({
          variant: 'Heavy',
          rows: 5,
          columns: 7,
          screwKind: 'custom',
          screwMode: 'custom',
          customScrewPositions: [{ row: 2, column: 4 }],
          connectorHoles: 'enabled',
        }),
        'opengrid-stackable-box': {
          x: 0.5,
          y: 1.5,
          height: 25,
          cornerSeatMode: 'hole',
          fullBottomHoleGrid: true,
          basePlateMode: true,
        },
        'opengrid-stackable-cylinder': { diameter: 80, height: 45 },
        'opengrid-snap': { variant: 'Lite', offset: 0.2 },
        'opengrid-divider': {
          left: 1,
          right: 1,
          up: 1.5,
          down: 0,
          height: 25,
          wallThickness: 3,
        },
        'opengrid-pillar': { mode: 'thin-shell' },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('box')).toEqual({ width: 25, depth: 30, height: 40 })
    expect(store.get('modular-grid-base')).toEqual({ rows: 2, columns: 3 })
    expect(store.get('hsw-cell')).toEqual({ rows: 4, columns: 2 })
    expect(store.get('opengrid')).toEqual(
      opengridParameters({
        variant: 'Heavy',
        rows: 5,
        columns: 7,
        screwKind: 'custom',
        screwMode: 'custom',
        customScrewPositions: [{ row: 2, column: 4 }],
        connectorHoles: 'enabled',
      }),
    )
    expect(store.get('opengrid-stackable-box')).toEqual({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 0.5,
      y: 1.5,
      height: 25,
      cornerSeatMode: 'hole',
      fullBottomHoleGrid: true,
      basePlateMode: true,
    })
    expect(store.get('opengrid-divider')).toEqual({
      left: 1,
      right: 1,
      up: 1.5,
      down: 0,
      height: 25,
      wallThickness: 3,
    })
    expect(store.get('opengrid-pillar')).toEqual({
      mode: 'thin-shell',
      offset: 0,
    })
    expect(store.get('opengrid-snap')).toEqual({
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
    })

    expect(store.get('opengrid-stackable-cylinder')).toEqual({
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 80,
      height: 45,
    })

    expect(
      store.set('opengrid-stackable-cylinder', {
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        diameter: 80,
        height: 45,
      }),
    ).toBe(true)

    const persisted = JSON.parse(
      storage.data.get(COMPONENT_PARAMETER_STORAGE_KEY) ?? '{}',
    ) as { values?: { legacy?: Record<string, unknown> } }
    expect(persisted.values?.legacy?.['opengrid-stackable-cylinder']).toEqual({
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 80,
      height: 45,
    })

    store.dispose()
  })

  it('normalizes legacy stackable-box entries and rejects invalid grid mode', () => {
    const storage = createMemoryStorage(
      createPayload({
        'opengrid-stackable-box': { x: 0.5, y: 1.5, height: 25 },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid-stackable-box')).toEqual({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 0.5,
      y: 1.5,
      height: 25,
      cornerSeatMode: 'hole',
      fullBottomHoleGrid: false,
      basePlateMode: false,
    })
    expect(
      store.set('opengrid-stackable-box', {
        x: 0.5,
        y: 1.5,
        height: 25,
        cornerSeatMode: 'hole',
        fullBottomHoleGrid: true,
        basePlateMode: false,
      }),
    ).toBe(true)
    expect(store.get('opengrid-stackable-box')).toMatchObject({
      fullBottomHoleGrid: true,
    })
    expect(
      store.set('opengrid-stackable-box', {
        x: 0.5,
        y: 1.5,
        height: 25,
        cornerSeatMode: 'hole',
        fullBottomHoleGrid: 'true' as never,
        basePlateMode: false,
      }),
    ).toBe(false)
    expect(store.get('opengrid-stackable-box')).toMatchObject({
      fullBottomHoleGrid: true,
    })
    store.dispose()
  })

  it('migrates stored seat booleans and strips them when writing canonical values', () => {
    const storage = createMemoryStorage(
      createPayload({
        'opengrid-stackable-box': {
          x: 2,
          y: 2,
          height: 20,
          cornerBottomHoles: false,
          cornerSeatMode: 'integrated',
          fullBottomHoleGrid: false,
          basePlateMode: false,
        },
        'opengrid-stackable-cylinder': {
          diameter: 60,
          height: 20,
          bottomHolesEnabled: false,
          bottomSeatMode: 'integrated',
        },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid-stackable-box')).toMatchObject({
      cornerSeatMode: 'integrated',
    })
    expect(store.get('opengrid-stackable-cylinder')).toMatchObject({
      bottomSeatMode: 'integrated',
    })

    expect(
      store.set('opengrid-stackable-box', store.get('opengrid-stackable-box')),
    ).toBe(true)
    const persisted = JSON.parse(storage.writes.at(-1) ?? '{}') as {
      values?: { legacy?: Record<string, Record<string, unknown>> }
    }
    expect(
      persisted.values?.legacy?.['opengrid-stackable-box'],
    ).not.toHaveProperty('cornerBottomHoles')
    expect(
      persisted.values?.legacy?.['opengrid-stackable-cylinder'],
    ).not.toHaveProperty('bottomHolesEnabled')

    store.dispose()
  })

  it('persists Hybrid OpenGrid parameters through a typed round-trip', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })
    const hybridParameters = opengridParameters({
      variant: 'Hybrid',
      rows: 6,
      columns: 4,
      halfCellX: 'right',
      halfCellY: 'top',
    })

    expect(store.set('opengrid', hybridParameters)).toBe(true)
    expect(store.get('opengrid')).toEqual(hybridParameters)

    const persisted = JSON.parse(
      storage.data.get(COMPONENT_PARAMETER_STORAGE_KEY) ?? '{}',
    ) as { values?: Record<string, unknown> }
    expect(persisted.values?.legacy).toMatchObject({
      opengrid: hybridParameters,
    })
    store.dispose()
  })

  it('persists bottom-plate mode as a separate cylinder profile', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })
    const bottomPlateParameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 80,
      height: 45,
      thinBottomMode: false,
      bottomPlateMode: true,
      bottomSeatMode: 'hole',
    }

    expect(
      store.set('opengrid-stackable-cylinder', bottomPlateParameters),
    ).toBe(true)
    expect(store.get('opengrid-stackable-cylinder')).toEqual(
      bottomPlateParameters,
    )

    const persisted = JSON.parse(
      storage.data.get(COMPONENT_PARAMETER_STORAGE_KEY) ?? '{}',
    ) as { values?: { legacy?: Record<string, unknown> } }
    expect(persisted.values?.legacy?.['opengrid-stackable-cylinder']).toEqual(
      bottomPlateParameters,
    )

    store.dispose()
  })

  it('migrates legacy divider snapshots to the default wall thickness', () => {
    const storage = createMemoryStorage(
      createPayload({
        'opengrid-divider': {
          left: 1,
          right: 1,
          up: 0,
          down: 0,
          height: 20,
        },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid-divider')).toEqual({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness:
        OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.wallThickness,
    })
    store.dispose()

    const invalidStorage = createMemoryStorage(
      createPayload({
        'opengrid-divider': {
          left: 1,
          right: 1,
          up: 0,
          down: 0,
          height: 20,
          wallThickness: 6,
        },
      }),
    )
    const invalidStore = createComponentParameterStore({
      storage: invalidStorage,
    })
    expect(invalidStore.get('opengrid-divider')).toEqual(
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
    )
    invalidStore.dispose()
  })

  it('isolates component entries and removes malformed or unknown values on write', () => {
    const storage = createMemoryStorage(
      createPayload({
        box: { width: 25, depth: 30, height: 40 },
        'box-normal': { x: 3, y: 4, height: 25, cornerPosts: false },
        'modular-grid-base': { rows: 0, columns: 3 },
        'hsw-cell': { rows: 4, columns: 2 },
        opengrid: {
          variant: 'Full',
          rows: 2,
          columns: 2,
          screwKind: 'custom',
          screwMode: 'custom',
          customScrewPositions: [
            { row: 0, column: 0 },
            { row: 0, column: 0 },
          ],
          connectorHoles: 'none',
        },
        'opengrid-stackable-box': { x: 0.25, y: 1, height: 10 },
        unknown: { rows: 9, columns: 9 },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('modular-grid-base')).toEqual({ rows: 1, columns: 1 })
    expect(store.get('hsw-cell')).toEqual({ rows: 4, columns: 2 })
    expect(store.get('opengrid')).toEqual(opengridParameters())

    expect(store.set('modular-grid-base', { rows: 2, columns: 3 })).toBe(true)

    expect(JSON.parse(storage.writes.at(-1) ?? '')).toEqual({
      version: 2,
      values: {
        legacy: {
          box: { width: 25, depth: 30, height: 40 },
          'modular-grid-base': { rows: 2, columns: 3 },
          'hsw-cell': { rows: 4, columns: 2 },
        },
      },
    })

    store.dispose()
  })

  it('rejects legacy board-shaped Snap entries without affecting the board entry', () => {
    const board = opengridParameters({ variant: 'Lite', rows: 2, columns: 2 })
    const storage = createMemoryStorage(
      createPayload({
        opengrid: board,
        'opengrid-snap': { ...board },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid')).toEqual(board)
    expect(store.get('opengrid-snap')).toEqual(
      OPENGRID_SNAP_CONFIGURATION.defaultParameters,
    )
    expect(
      store.set('opengrid-snap', {
        variant: 'Full',
        profile: 'Standard',
        offset: 0.25,
        footprint: 'half',
        fourCornerLocatingHoles: true,
        centerRemoverHole: false,
        magnetHoleShape: 'none',
        magnetHoleLength: 0,
        magnetHoleWidth: 0,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 0,
      }),
    ).toBe(true)
    expect(store.get('opengrid')).toEqual(board)
    expect(store.get('opengrid-snap')).toEqual({
      variant: 'Full',
      profile: 'Standard',
      offset: 0.25,
      footprint: 'half',
      fourCornerLocatingHoles: true,
      centerRemoverHole: false,
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    })
    store.dispose()
  })

  it('persists canonical footprints and rejects malformed Snap values', () => {
    const storage = createMemoryStorage(
      createPayload({
        opengrid: {
          ...opengridParameters(),
          halfCellX: 'diagonal',
        },
        'opengrid-snap': {
          ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
          allowHalfCell: true,
        },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid')).toEqual(opengridParameters())
    expect(store.get('opengrid-snap')).toEqual(
      OPENGRID_SNAP_CONFIGURATION.defaultParameters,
    )

    expect(
      store.set(
        'opengrid',
        opengridParameters({ halfCellX: 'left', halfCellY: 'top' }),
      ),
    ).toBe(true)
    expect(
      store.set('opengrid-snap', {
        ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
        profile: 'Directional',
        footprint: 'quarter',
        fourCornerLocatingHoles: true,
        centerRemoverHole: false,
      }),
    ).toBe(true)
    expect(store.get('opengrid')).toMatchObject({
      halfCellX: 'left',
      halfCellY: 'top',
    })
    expect(store.get('opengrid-snap')).toMatchObject({
      profile: 'Directional',
      footprint: 'quarter',
      fourCornerLocatingHoles: true,
    })
    expect(
      store.set('opengrid-snap', {
        ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
        profile: 'Diagonal' as never,
      }),
    ).toBe(false)
    expect(
      store.set('opengrid-snap', {
        ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
        fourCornerLocatingHoles: 'true' as never,
      }),
    ).toBe(false)
    store.dispose()
  })

  it('migrates legacy Snap axes without reading the OpenGrid board entry', () => {
    const board = opengridParameters({ variant: 'Lite', rows: 2, columns: 2 })
    const storage = createMemoryStorage(
      createPayload({
        opengrid: board,
        'opengrid-snap': {
          variant: 'Full',
          offset: 0.2,
          halfCellX: 'right',
          halfCellY: 'none',
        },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid')).toEqual(board)
    expect(store.get('opengrid-snap')).toEqual({
      variant: 'Full',
      profile: 'Standard',
      offset: 0.2,
      footprint: 'half',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    })

    expect(store.set('opengrid-snap', store.get('opengrid-snap'))).toBe(true)
    const persisted = JSON.parse(storage.writes.at(-1) ?? '{}') as {
      values?: { legacy?: Record<string, Record<string, unknown>> }
    }
    expect(persisted.values?.legacy?.opengrid).toEqual(board)
    expect(persisted.values?.legacy?.['opengrid-snap']).toEqual({
      variant: 'Full',
      profile: 'Standard',
      offset: 0.2,
      footprint: 'half',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    })
    expect(persisted.values?.legacy?.['opengrid-snap']).not.toHaveProperty(
      'halfCellX',
    )
    expect(persisted.values?.legacy?.['opengrid-snap']).not.toHaveProperty(
      'halfCellY',
    )
    store.dispose()
  })

  it('falls back to defaults for malformed payloads and unsupported versions', () => {
    const malformed = createMemoryStorage('{"version":1,"values":null}')
    const malformedStore = createComponentParameterStore({ storage: malformed })
    expect(malformedStore.get('box')).toEqual({
      width: 20,
      depth: 30,
      height: 40,
    })
    malformedStore.dispose()

    const unsupported = createMemoryStorage(
      createPayload({ box: { width: 25, depth: 30, height: 40 } }, 2),
    )
    const unsupportedStore = createComponentParameterStore({
      storage: unsupported,
    })
    expect(unsupportedStore.get('box')).toEqual({
      width: 20,
      depth: 30,
      height: 40,
    })
    expect(unsupportedStore.get('opengrid-pillar')).toEqual(
      PILLAR_CONFIGURATION.defaultParameters,
    )
    unsupportedStore.dispose()
  })

  it('migrates legacy positioning snapshots and does not overwrite them with an invalid draft', () => {
    const storage = createMemoryStorage(
      createPayload({
        'opengrid-pillar': { length: 20, baseConnection: false },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid-pillar')).toEqual({
      mode: 'positioning',
      length: 20,
      offset: 0,
    })
    expect(
      store.set('opengrid-pillar', {
        mode: 'legacy',
      } as never),
    ).toBe(false)
    expect(store.get('opengrid-pillar')).toEqual({
      mode: 'positioning',
      length: 20,
      offset: 0,
    })

    store.dispose()
  })

  it('persists the exact detachable corner-seat mode without numeric fields', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })

    expect(
      store.set('opengrid-pillar', { mode: 'detachable-corner-seat' }),
    ).toBe(true)
    expect(store.get('opengrid-pillar')).toEqual({
      mode: 'detachable-corner-seat',
    })

    const restored = createComponentParameterStore({ storage })
    expect(restored.get('opengrid-pillar')).toEqual({
      mode: 'detachable-corner-seat',
    })
    restored.dispose()
    store.dispose()
  })

  it('keeps accepted values in memory when storage read or write fails', () => {
    const store = createComponentParameterStore({
      storage: createThrowingStorage(),
    })

    expect(store.get('box')).toEqual({ width: 20, depth: 30, height: 40 })
    expect(store.set('box', { width: 25, depth: 30, height: 40 })).toBe(true)
    expect(store.get('box')).toEqual({ width: 25, depth: 30, height: 40 })

    store.dispose()
  })

  it('deep-clones OpenGrid custom positions at read and write boundaries', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })
    const parameters = opengridParameters({
      variant: 'Lite',
      rows: 3,
      columns: 3,
      screwKind: 'custom',
      screwMode: 'custom',
      customScrewPositions: [{ row: 0, column: 0 }],
      connectorHoles: 'enabled',
    })
    expect(store.set('opengrid', parameters)).toBe(true)
    parameters.customScrewPositions[0].row = 2
    const firstRead = store.get('opengrid')
    expect(firstRead).toEqual({
      ...parameters,
      customScrewPositions: [{ row: 0, column: 0 }],
    })
    if ('customScrewPositions' in firstRead) {
      firstRead.customScrewPositions[0].column = 2
    }
    expect(store.get('opengrid')).toEqual({
      ...parameters,
      customScrewPositions: [{ row: 0, column: 0 }],
    })
    store.dispose()
  })

  it('stops persistence writes after disposal', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })

    store.dispose()
    expect(store.set('box', { width: 25, depth: 30, height: 40 })).toBe(true)
    expect(storage.writes).toHaveLength(0)
  })
})
