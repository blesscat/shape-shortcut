import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGrid,
  deterministicOpenGridCustomScrewPositions,
  isOpenGridGenerationSupported,
  openGridConnectorLocationsFor,
  openGridFileName,
  openGridScrewCentersFor,
  openGridScrewLatticeDimensions,
  openGridScrewPositionsFor,
  openGridStlFileName,
  fullGridCenterOffsetX,
  fullGridCenterOffsetY,
  halfCellHostPitch,
  openGridAxisSize,
  OPENGRID_CONFIGURATION,
  validateOpenGridGenerationSupport,
  validateOpenGridParameters,
  type OpenGridParameters,
} from '../../src/cad-contract/units'
import {
  isWorkerCommand,
  PROTOCOL_VERSION,
} from '../../src/cad-contract/messages'

function parameters(
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

describe('OpenGrid contract', () => {
  it('accepts official defaults and derives the legal centered envelope', () => {
    const defaults = parameters()
    expect(OPENGRID_CONFIGURATION.maxGridCount).toBe(10)
    expect(validateOpenGridParameters(defaults)).toEqual({
      valid: true,
      value: defaults,
    })
    expect(boundsForOpenGrid(defaults)).toEqual({
      min: [-28, -28, 0],
      max: [28, 28, 4],
    })
    expect(boundsForOpenGrid({ ...defaults, rows: 10, columns: 10 })).toEqual({
      min: [-140, -140, 0],
      max: [140, 140, 4],
    })
    expect(validateOpenGridParameters({ ...defaults, rows: 11 }).valid).toBe(
      false,
    )
    expect(validateOpenGridParameters({ ...defaults, columns: 11 }).valid).toBe(
      false,
    )
  })

  it('adds a 14 mm extension for each selected half-cell axis', () => {
    const singleAxis = parameters({
      columns: 3,
      rows: 2,
      halfCellX: 'right',
    })
    const dualAxis = parameters({
      columns: 3,
      rows: 2,
      halfCellX: 'left',
      halfCellY: 'top',
    })

    expect(boundsForOpenGrid(singleAxis)).toEqual({
      min: [-49, -28, 0],
      max: [49, 28, 4],
    })
    expect(boundsForOpenGrid(dualAxis)).toEqual({
      min: [-49, -35, 0],
      max: [49, 35, 4],
    })
  })

  it('fills a target envelope with a centered remainder without changing the grid host', () => {
    const fitted = parameters({
      columns: 3,
      rows: 2,
      halfCellX: 'right',
      targetWidth: 100,
      targetDepth: 58,
      fitToTarget: true,
    })

    expect(boundsForOpenGrid(fitted)).toEqual({
      min: [-50, -29, 0],
      max: [50, 29, 4],
    })
    const nominal = parameters({
      columns: 3,
      rows: 2,
      halfCellX: 'right',
      targetWidth: 100,
      targetDepth: 58,
      fitToTarget: false,
    })
    expect(openGridConnectorLocationsFor(fitted)).toEqual(
      openGridConnectorLocationsFor(nominal),
    )
    expect(openGridScrewCentersFor(fitted)).toEqual(
      openGridScrewCentersFor(nominal),
    )
    expect(validateOpenGridParameters(fitted)).toMatchObject({
      valid: true,
      value: fitted,
    })
  })

  it('accepts a target whose centered remainder stays within one half-cell per side', () => {
    const fitted = parameters({
      columns: 3,
      rows: 3,
      targetWidth: 100,
      targetDepth: 100,
      fitToTarget: true,
    })

    expect(validateOpenGridParameters(fitted)).toMatchObject({
      valid: true,
      value: fitted,
    })
    expect(boundsForOpenGrid(fitted)).toEqual({
      min: [-50, -50, 0],
      max: [50, 50, 4],
    })
  })

  it('keeps the nominal envelope when target fitting is disabled', () => {
    const notFitted = parameters({
      columns: 3,
      rows: 2,
      halfCellX: 'right',
      targetWidth: 100,
      targetDepth: 58,
      fitToTarget: false,
    })

    expect(boundsForOpenGrid(notFitted)).toEqual({
      min: [-49, -28, 0],
      max: [49, 28, 4],
    })
  })

  it('rejects a fitted target below nominal size or beyond one half-cell remainder per side', () => {
    const defaults = parameters({
      columns: 3,
      rows: 2,
      halfCellX: 'right',
    })

    expect(
      validateOpenGridParameters({
        ...defaults,
        targetWidth: 97.99,
        targetDepth: 56,
        fitToTarget: true,
      }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridParameters({
        ...defaults,
        targetWidth: 126,
        targetDepth: 56,
        fitToTarget: true,
      }),
    ).toMatchObject({ valid: true })
    expect(
      validateOpenGridParameters({
        ...defaults,
        targetWidth: 126.01,
        targetDepth: 56,
        fitToTarget: true,
      }),
    ).toMatchObject({ valid: false })
  })

  it('separates fitted and nominal export identities', () => {
    const defaults = parameters()
    const fitted = parameters({
      targetWidth: 60,
      targetDepth: 60,
      fitToTarget: true,
    })

    expect(openGridFileName(fitted)).not.toBe(openGridFileName(defaults))
    expect(openGridStlFileName(fitted)).not.toBe(openGridStlFileName(defaults))
    expect(openGridFileName(fitted)).toContain('fit-60x60')
  })

  it('maps all side directions to centered full-grid offsets and host pitches', () => {
    expect(openGridAxisSize(2, 'none')).toBe(56)
    expect(openGridAxisSize(2, 'left')).toBe(70)
    expect(openGridAxisSize(2, 'right')).toBe(70)
    expect(openGridAxisSize(2, 'top')).toBe(70)
    expect(openGridAxisSize(2, 'bottom')).toBe(70)
    expect(fullGridCenterOffsetX('left')).toBe(7)
    expect(fullGridCenterOffsetX('right')).toBe(-7)
    expect(fullGridCenterOffsetY('top')).toBe(-7)
    expect(fullGridCenterOffsetY('bottom')).toBe(7)
    expect(halfCellHostPitch('none')).toBe(28)
    expect(halfCellHostPitch('right')).toBe(14)
    expect(halfCellHostPitch('top')).toBe(14)
  })

  it('rejects a boolean or diagonal half-cell contract', () => {
    const defaults = parameters()
    expect(
      validateOpenGridParameters({ ...defaults, allowHalfCell: true }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridParameters({ ...defaults, diagonal: 'left-top' }),
    ).toMatchObject({ valid: false })
  })

  it('keeps the pinned official profile and screw dimensions', () => {
    expect(
      Object.fromEntries(
        Object.entries(OPENGRID_CONFIGURATION.variants).map(([key, value]) => [
          key,
          value.thickness,
        ]),
      ),
    ).toEqual({ Full: 6.8, Lite: 4, Heavy: 13.8, Hybrid: 13.8 })
    expect(OPENGRID_CONFIGURATION.gridPitch).toBe(28)
    expect(OPENGRID_CONFIGURATION.tileInnerSize).toBe(25)
    expect(OPENGRID_CONFIGURATION.outsideExtrusion).toBe(0.8)
    expect(OPENGRID_CONFIGURATION.connector).toEqual({
      primaryRadius: 2.6,
      dimpleRadius: 2.7,
      separation: 2.5,
      cutoutHeight: 2.4,
      liteCutoutDistanceFromTop: 1,
    })
    expect(OPENGRID_CONFIGURATION.defaultScrew).toEqual({
      diameter: 4.1,
      headDiameter: 7.2,
      headInset: 1,
      headIsCountersunk: true,
      headCountersunkDegree: 90,
    })
  })

  it('accepts Hybrid without changing the normalized OpenGrid snapshot shape', () => {
    const hybrid = {
      ...parameters({ rows: 3, columns: 3 }),
      variant: 'Hybrid',
    }
    const validation = validateOpenGridParameters(hybrid)

    expect(validation).toMatchObject({ valid: true, value: hybrid })
    expect(boundsForOpenGrid(hybrid as OpenGridParameters).max[2]).toBe(
      OPENGRID_CONFIGURATION.variants.Hybrid.thickness,
    )
    expect(Object.keys(hybrid).sort()).toEqual(Object.keys(parameters()).sort())
  })

  it('exposes common wood screw presets without replacing the official profile', () => {
    const presets = OPENGRID_CONFIGURATION.screwPresets

    expect(Object.keys(presets)).toEqual(['m3', 'm4', 'm5', 'm6', 'm7'])
    expect(presets.m3.diameter).toBeLessThan(presets.m4.diameter)
    expect(presets.m4.diameter).toBeLessThan(presets.m5.diameter)
    expect(presets.m5.diameter).toBeLessThan(presets.m6.diameter)
    expect(presets.m6.diameter).toBeLessThan(presets.m7.diameter)
    expect(
      Object.values(presets).every(
        ({ headDiameter }) =>
          headDiameter <= OPENGRID_CONFIGURATION.tileInnerSize,
      ),
    ).toBe(true)

    for (const [preset, dimensions] of Object.entries(presets)) {
      for (const variant of Object.keys(
        OPENGRID_CONFIGURATION.variants,
      ) as OpenGridParameters['variant'][]) {
        const validation = validateOpenGridParameters(
          parameters({
            variant,
            screwKind: 'custom',
            screwDiameter: dimensions.diameter,
            screwHeadDiameter: dimensions.headDiameter,
            screwHeadInset: dimensions.headInset,
            screwHeadIsCountersunk: dimensions.headIsCountersunk,
            screwHeadCountersunkDegree: dimensions.headCountersunkDegree,
          }),
        )
        expect(validation.valid, `${preset} should fit ${variant}`).toBe(true)
      }
    }
  })

  it('requires official-default to keep the official SCAD screw dimensions', () => {
    const invalid = validateOpenGridParameters(
      parameters({
        screwKind: 'official-default',
        screwHeadIsCountersunk: false,
      }),
    )

    if (invalid.valid) {
      throw new Error('official-default accepted non-official screw dimensions')
    }
    expect(invalid.issues).toContainEqual({
      field: 'screwKind',
      messageId: 'validation.invalid',
    })
    expect(
      validateOpenGridParameters({
        ...parameters({ screwHeadIsCountersunk: false }),
        screwKind: 'custom',
      }).valid,
    ).toBe(true)
  })

  it('maps official screw modes to the internal intersection lattice', () => {
    const input = parameters({ rows: 5, columns: 5 })
    expect(openGridScrewLatticeDimensions(input)).toEqual({
      rows: 4,
      columns: 4,
    })
    expect(
      openGridScrewPositionsFor(parameters({ screwMode: 'none' })),
    ).toEqual([])
    expect(
      openGridScrewPositionsFor({ ...input, screwMode: 'everywhere' }),
    ).toHaveLength(16)
    expect(
      openGridScrewPositionsFor({
        ...input,
        screwMode: 'by-row-column',
        screwEveryRows: 2,
        screwEveryColumns: 2,
      }),
    ).toEqual([
      { row: 0, column: 0 },
      { row: 0, column: 2 },
      { row: 2, column: 0 },
      { row: 2, column: 2 },
    ])
    expect(
      openGridScrewPositionsFor({ ...input, screwMode: 'corners' }),
    ).toEqual([
      { row: 0, column: 0 },
      { row: 0, column: 3 },
      { row: 3, column: 0 },
      { row: 3, column: 3 },
    ])
    expect(
      openGridScrewCentersFor(
        parameters({ rows: 1, columns: 1, screwMode: 'corners' }),
      ),
    ).toEqual(
      expect.arrayContaining([
        [-14, -14],
        [-14, 14],
        [14, -14],
        [14, 14],
      ]),
    )
  })

  it('includes screw positions generated on selected half-cell boundaries', () => {
    const centers = openGridScrewCentersFor(
      parameters({
        rows: 1,
        columns: 1,
        halfCellX: 'right',
        halfCellY: 'top',
        screwMode: 'corners',
      }),
    )

    expect(centers).toEqual([[7, 7]])
  })

  it('uses the half-cell seam and the far full-cell corner row on a single-axis extension', () => {
    const centers = openGridScrewCentersFor(
      parameters({
        rows: 5,
        columns: 3,
        halfCellX: 'left',
        halfCellY: 'none',
        screwMode: 'corners',
      }),
    )

    expect(centers).toEqual([
      [-35, -42],
      [-35, 42],
      [21, -42],
      [21, 42],
    ])
  })

  it('keeps custom screw positions explicit when half-cell boundaries exist', () => {
    const centers = openGridScrewCentersFor(
      parameters({
        rows: 2,
        columns: 2,
        halfCellX: 'right',
        halfCellY: 'top',
        screwMode: 'custom',
        customScrewPositions: [{ row: 0, column: 0 }],
      }),
    )

    expect(centers).toEqual([[-7, -7]])
  })

  it('adds an optional center screw and a centered interval pattern', () => {
    expect(
      openGridScrewPositionsFor(
        parameters({
          rows: 2,
          columns: 2,
          screwMode: 'none',
          screwCenter: true,
          screwEvery: 0,
        }),
      ),
    ).toEqual([{ row: 0, column: 0 }])

    expect(
      openGridScrewPositionsFor(
        parameters({
          rows: 5,
          columns: 5,
          screwMode: 'none',
          screwCenter: false,
          screwEvery: 2,
        }),
      ),
    ).toEqual([
      { row: 0, column: 0 },
      { row: 0, column: 2 },
      { row: 2, column: 0 },
      { row: 2, column: 2 },
    ])

    expect(
      openGridScrewPositionsFor(
        parameters({
          rows: 2,
          columns: 2,
          screwMode: 'corners',
          screwCenter: true,
          screwEvery: 1,
        }),
      ),
    ).toEqual([{ row: 0, column: 0 }])

    expect(
      validateOpenGridParameters(
        parameters({ rows: 3, columns: 3, screwCenter: true }),
      ).valid,
    ).toBe(true)
    expect(
      validateOpenGridParameters(
        parameters({ rows: 1, columns: 3, screwCenter: true }),
      ),
    ).toMatchObject({
      valid: false,
      issues: [
        {
          field: 'screwCenter',
          messageId: 'validation.invalid',
        },
      ],
    })
    expect(
      validateOpenGridParameters(parameters({ screwEvery: -1 })).valid,
    ).toBe(false)
  })

  it('selects the nearest upper-left internal intersection for odd grids', () => {
    const cases = [
      {
        rows: 3,
        columns: 4,
        position: { row: 0, column: 1 },
        center: [0, 14],
      },
      {
        rows: 4,
        columns: 3,
        position: { row: 1, column: 0 },
        center: [-14, 0],
      },
      {
        rows: 5,
        columns: 5,
        position: { row: 1, column: 1 },
        center: [-14, 14],
      },
    ] as const

    for (const testCase of cases) {
      const input = parameters({
        rows: testCase.rows,
        columns: testCase.columns,
        screwMode: 'none',
        screwCenter: true,
      })
      expect(openGridScrewPositionsFor(input)).toEqual([testCase.position])
      expect(openGridScrewCentersFor(input)).toEqual([testCase.center])
    }

    const halfCellInput = parameters({
      rows: 3,
      columns: 3,
      halfCellX: 'right',
      halfCellY: 'top',
      screwMode: 'none',
      screwCenter: true,
    })
    expect(openGridScrewCentersFor(halfCellInput)).toContainEqual([-21, 7])
  })

  it('normalizes custom intersection positions and rejects duplicates or old fields', () => {
    const validation = validateOpenGridParameters(
      parameters({
        rows: 3,
        columns: 4,
        screwKind: 'custom',
        screwMode: 'custom',
        customScrewPositions: [
          { row: 1, column: 2 },
          { row: 0, column: 0 },
        ],
      }),
    )
    expect(validation.valid).toBe(true)
    if (validation.valid) {
      expect(validation.value.customScrewPositions).toEqual([
        { row: 0, column: 0 },
        { row: 1, column: 2 },
      ])
      expect(openGridScrewPositionsFor(validation.value)).toEqual(
        validation.value.customScrewPositions,
      )
    }
    expect(
      validateOpenGridParameters(
        parameters({
          rows: 3,
          columns: 4,
          screwKind: 'custom',
          screwMode: 'custom',
          customScrewPositions: [
            { row: 0, column: 0 },
            { row: 0, column: 0 },
          ],
        }),
      ).valid,
    ).toBe(false)
    expect(
      validateOpenGridParameters({
        ...parameters(),
        screwKind: 'legacy-m3',
      }).valid,
    ).toBe(false)
  })

  it('places connectors only on selected eligible seams', () => {
    const none = parameters({ connectorHoles: 'none' })
    expect(openGridConnectorLocationsFor(none)).toEqual([])
    const selected = parameters({
      rows: 3,
      columns: 4,
      connectorHoles: 'enabled',
      connectorSides: { top: true, right: false, bottom: true, left: false },
    })
    const locations = openGridConnectorLocationsFor(selected)
    expect(locations).toHaveLength(6)
    expect(
      locations.every(
        (location) => location.side === 'top' || location.side === 'bottom',
      ),
    ).toBe(true)

    const halfCellLocations = openGridConnectorLocationsFor(
      parameters({
        rows: 2,
        columns: 2,
        halfCellX: 'right',
        halfCellY: 'top',
        connectorHoles: 'enabled',
      }),
    )
    expect(halfCellLocations).toHaveLength(8)
    expect(halfCellLocations).toEqual(
      expect.arrayContaining([
        { side: 'top', center: [-7, 35], direction: [0, -1, 0] },
        { side: 'top', center: [21, 35], direction: [0, -1, 0] },
        { side: 'right', center: [35, -7], direction: [-1, 0, 0] },
        { side: 'right', center: [35, 21], direction: [-1, 0, 0] },
        { side: 'bottom', center: [-7, -35], direction: [0, 1, 0] },
        { side: 'bottom', center: [21, -35], direction: [0, 1, 0] },
        { side: 'left', center: [-35, -7], direction: [1, 0, 0] },
        { side: 'left', center: [-35, 21], direction: [1, 0, 0] },
      ]),
    )
  })

  it('maps each single-axis half-cell connector to its selected outer side', () => {
    const cases = [
      {
        halfCellX: 'left' as const,
        halfCellY: 'none' as const,
        side: 'left' as const,
        center: [-35, 0] as [number, number],
        direction: [1, 0, 0] as [number, number, number],
      },
      {
        halfCellX: 'right' as const,
        halfCellY: 'none' as const,
        side: 'right' as const,
        center: [35, 0] as [number, number],
        direction: [-1, 0, 0] as [number, number, number],
      },
      {
        halfCellX: 'none' as const,
        halfCellY: 'top' as const,
        side: 'top' as const,
        center: [0, 35] as [number, number],
        direction: [0, -1, 0] as [number, number, number],
      },
      {
        halfCellX: 'none' as const,
        halfCellY: 'bottom' as const,
        side: 'bottom' as const,
        center: [0, -35] as [number, number],
        direction: [0, 1, 0] as [number, number, number],
      },
    ]

    for (const testCase of cases) {
      const locations = openGridConnectorLocationsFor(
        parameters({
          rows: 2,
          columns: 2,
          halfCellX: testCase.halfCellX,
          halfCellY: testCase.halfCellY,
        }),
      )
      expect(locations).toContainEqual({
        side: testCase.side,
        center: testCase.center,
        direction: testCase.direction,
      })
    }
  })

  it('keeps the official deterministic custom fixture and removes the old block rule', () => {
    expect(deterministicOpenGridCustomScrewPositions(5, 5)).toHaveLength(4)
    expect(deterministicOpenGridCustomScrewPositions(10, 10)).toHaveLength(21)
    const legal = parameters({
      rows: 10,
      columns: 10,
      screwKind: 'custom',
      screwMode: 'everywhere',
      connectorHoles: 'enabled',
    })
    expect(validateOpenGridGenerationSupport(legal).valid).toBe(true)
    expect(isOpenGridGenerationSupported(legal)).toBe(true)
  })

  it('uses deterministic official filenames and separates invalidate from generate payloads', () => {
    const custom = parameters({
      variant: 'Full',
      rows: 5,
      columns: 5,
      screwKind: 'custom',
      screwMode: 'custom',
      customScrewPositions: deterministicOpenGridCustomScrewPositions(5, 5),
    })
    expect(openGridFileName(custom)).toMatch(
      /^opengrid-full-5x5-xnone-ynone-custom-custom-corners-enabled-[0-9a-f]{8}\.step$/,
    )
    expect(openGridStlFileName(custom)).toMatch(
      /^opengrid-full-5x5-xnone-ynone-custom-custom-corners-enabled-[0-9a-f]{8}\.stl$/,
    )

    expect(
      isWorkerCommand({
        version: PROTOCOL_VERSION,
        kind: 'model.invalidate',
        requestId: 'invalidate-1',
        operationId: 'operation-1',
        generation: 2,
        workerEpoch: 'epoch-1',
        reason: 'invalid-input',
      }),
    ).toBe(true)
    expect(
      isWorkerCommand({
        version: PROTOCOL_VERSION,
        kind: 'model.generate',
        requestId: 'generate-1',
        operationId: 'operation-2',
        generation: 2,
        modelId: 'opengrid',
        parameters: parameters(),
        previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
      }),
    ).toBe(true)
  })
})
