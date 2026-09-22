import { OPENCONNECT_ALIGNMENT_DEFAULTS } from '../../src/cad-contract/units/openconnect-alignment'
import { describe, expect, it } from 'vitest'
import {
  boundsForModel,
  boundsForOpenGridOpenConnectShelf,
  modelFileName,
  modelStlFileName,
  openGridOpenConnectShelfFrontHeightFor,
  openGridOpenConnectShelfInstalledBoundsFor,
  openGridOpenConnectShelfMaximumAngleForRows,
  openGridOpenConnectShelfRearHeightFor,
  openGridOpenConnectShelfSlotOriginsFor,
  OPENGRID_OPENCONNECT_SHELF_CONFIGURATION,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  validateModelParameters,
  validateOpenGridOpenConnectShelfParameters,
  type OpenGridOpenConnectShelfParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<OpenGridOpenConnectShelfParameters> = {},
): OpenGridOpenConnectShelfParameters {
  return {
    ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

describe('OpenGrid OpenConnect shelf contract', () => {
  it('accepts the typed default controls', () => {
    const value = parameters()

    expect(value).toEqual({
      ...OPENCONNECT_ALIGNMENT_DEFAULTS,
      columns: 3,
      rows: 3,
      connectorRows: 1,
      angle: 14,
    })
    expect(validateOpenGridOpenConnectShelfParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(
      validateModelParameters('opengrid-openconnect-shelf', value),
    ).toEqual({
      valid: true,
      value: { modelId: 'opengrid-openconnect-shelf', parameters: value },
    })
  })

  it('derives and enforces the depth-dependent angle ceiling', () => {
    expect(openGridOpenConnectShelfMaximumAngleForRows(2)).toBe(20)
    expect(openGridOpenConnectShelfMaximumAngleForRows(3)).toBe(14)
    expect(openGridOpenConnectShelfMaximumAngleForRows(4)).toBe(10)
    expect(openGridOpenConnectShelfMaximumAngleForRows(3, 2)).toBe(30)

    expect(
      validateOpenGridOpenConnectShelfParameters(
        parameters({ rows: 4, angle: 10 }),
      ).valid,
    ).toBe(true)
    expect(
      validateOpenGridOpenConnectShelfParameters(
        parameters({ rows: 4, angle: 14 }),
      ),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'angle' })],
    })
  })

  it('accepts half-degree angle steps and rejects finer fractions', () => {
    const value = parameters({ angle: 13.5 })

    expect(OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.angleStep).toBe(0.5)
    expect(validateOpenGridOpenConnectShelfParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(
      validateOpenGridOpenConnectShelfParameters(parameters({ angle: 13.25 })),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'angle' })],
    })
  })

  it.each([
    null,
    {},
    { columns: 3, rows: 3 },
    { columns: 3, rows: 3, connectorRows: 1, angle: 14, extra: true },
    { columns: 1.5, rows: 3, connectorRows: 1, angle: 14 },
    { columns: 3, rows: Number.NaN, connectorRows: 1, angle: 14 },
    { columns: 3, rows: 3, connectorRows: 1.5, angle: 14 },
    { columns: 3, rows: 3, connectorRows: 1, angle: 13.25 },
    { columns: 0, rows: 3, connectorRows: 1, angle: 14 },
    { columns: 3, rows: 11, connectorRows: 1, angle: 1 },
    { columns: 3, rows: 3, connectorRows: 11, angle: 14 },
    { columns: 3, rows: 3, connectorRows: 1, angle: 0 },
  ])('rejects malformed or out-of-range snapshot %#', (value) => {
    expect(validateOpenGridOpenConnectShelfParameters(value).valid).toBe(false)
  })

  it('derives the installed envelope and grid-aligned locked-slot origins', () => {
    const value = parameters({ columns: 2, connectorRows: 2 })
    const { gridPitch, rearThickness } =
      OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
    const rearHeight = openGridOpenConnectShelfRearHeightFor(value)

    expect(openGridOpenConnectShelfInstalledBoundsFor(value)).toEqual({
      min: [-(value.columns * gridPitch) / 2, -value.rows * gridPitch, 0],
      max: [(value.columns * gridPitch) / 2, rearThickness, rearHeight],
    })
    expect(openGridOpenConnectShelfSlotOriginsFor(value)).toEqual([
      [-gridPitch / 2, rearThickness, gridPitch / 2],
      [gridPitch / 2, rearThickness, gridPitch / 2],
      [-gridPitch / 2, rearThickness, (gridPitch * 3) / 2],
      [gridPitch / 2, rearThickness, (gridPitch * 3) / 2],
    ])
    expect(openGridOpenConnectShelfFrontHeightFor(value)).toBeCloseTo(
      rearHeight -
        value.rows * gridPitch * Math.tan((value.angle * Math.PI) / 180),
    )
  })

  it('reports tight print-oriented bounds with the sloped underside on Z=0', () => {
    const value = parameters({ connectorRows: 2 })
    const { gridPitch, rearThickness } =
      OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
    const rearHeight = openGridOpenConnectShelfRearHeightFor(value)
    const width = value.columns * gridPitch
    const depth = value.rows * gridPitch
    const radians = (value.angle * Math.PI) / 180
    const expected = {
      min: [
        -width / 2,
        -(depth * Math.cos(radians) + rearHeight * Math.sin(radians)),
        0,
      ] as [number, number, number],
      max: [
        width / 2,
        rearThickness * Math.cos(radians),
        rearHeight * Math.cos(radians) + rearThickness * Math.sin(radians),
      ] as [number, number, number],
    }

    const bounds = boundsForOpenGridOpenConnectShelf(value)
    expect(bounds.min[0]).toBeCloseTo(expected.min[0])
    expect(bounds.min[1]).toBeCloseTo(expected.min[1])
    expect(bounds.min[2]).toBeCloseTo(expected.min[2])
    expect(bounds.max[0]).toBeCloseTo(expected.max[0])
    expect(bounds.max[1]).toBeCloseTo(expected.max[1])
    expect(bounds.max[2]).toBeCloseTo(expected.max[2])
    expect(
      boundsForModel({
        modelId: 'opengrid-openconnect-shelf',
        parameters: value,
      }),
    ).toEqual(bounds)
  })

  it('uses deterministic model-specific STEP and STL names', () => {
    const model = {
      modelId: 'opengrid-openconnect-shelf' as const,
      parameters: parameters({ connectorRows: 2, angle: 13.5 }),
    }

    expect(modelFileName(model)).toBe(
      'opengrid-openconnect-shelf-c3-r3-z2-a13.5.step',
    )
    expect(modelStlFileName(model)).toBe(
      'opengrid-openconnect-shelf-c3-r3-z2-a13.5.stl',
    )
  })
})
