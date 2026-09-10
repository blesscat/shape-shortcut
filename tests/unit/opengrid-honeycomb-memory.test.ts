import { describe, expect, it } from 'vitest'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import {
  OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_BUDGET,
  estimateOpenGridStackableBoxHoneycombMemory,
  openGridStackableBoxHoneycombSocketProtectionRadiusFor,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb'
import {
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_HONEYCOMB_CONFIGURATION,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<OpenGridStackableBoxParameters> = {},
): OpenGridStackableBoxParameters {
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: 7,
    y: 7,
    height: 60,
    honeycombMode: true,
    cornerSeatMode: 'none',
    ...overrides,
  }
}

describe('OpenGrid box honeycomb memory budget', () => {
  it('accepts a 10x10 h101 thin honeycomb box with locked seats', () => {
    const estimate = estimateOpenGridStackableBoxHoneycombMemory(
      parameters({
        x: 10,
        y: 10,
        height: 101,
        topRimMode: 'flat-top',
        bottomMode: 'thin-shell',
        cornerSeatMode: 'detachable-corner-seat',
      }),
    )
    expect(estimate.withinBudget).toBe(true)
    expect(estimate.estimatedCells).toBeLessThanOrEqual(
      OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_BUDGET,
    )
  })

  it('accepts the supported 7x7 tall-box targets', () => {
    const height60 = estimateOpenGridStackableBoxHoneycombMemory(
      parameters({ height: 60 }),
    )
    const height100 = estimateOpenGridStackableBoxHoneycombMemory(
      parameters({ height: 100 }),
    )

    expect(height60.withinBudget).toBe(true)
    expect(height100.withinBudget).toBe(true)
    expect(height100.estimatedCells).toBeLessThanOrEqual(
      OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_BUDGET,
    )
  })

  it('rejects the 10x10 h200 honeycomb candidate before building', () => {
    const estimate = estimateOpenGridStackableBoxHoneycombMemory(
      parameters({
        x: 10,
        y: 10,
        height: 200,
        topRimMode: 'flat-top',
        bottomMode: 'thin-shell',
        cornerSeatMode: 'detachable-corner-seat',
      }),
    )

    expect(estimate.withinBudget, JSON.stringify(estimate)).toBe(false)
  })

  it('rejects a candidate above the measured geometry budget before building', () => {
    const estimate = estimateOpenGridStackableBoxHoneycombMemory(
      parameters({ height: 500 }),
    )

    expect(estimate.withinBudget).toBe(false)
    expect(estimate.estimatedCells).toBeGreaterThan(
      OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_BUDGET,
    )
  })

  it('does not apply the honeycomb budget to solid mode', () => {
    const estimate = estimateOpenGridStackableBoxHoneycombMemory(
      parameters({ honeycombMode: false, height: 500 }),
    )

    expect(estimate.withinBudget).toBe(true)
    expect(estimate.estimatedCells).toBe(0)
  })

  it('protects detachable sockets through the full holder envelope and safety ring', () => {
    const parametersForDetachableSeat = parameters({
      cornerSeatMode: 'detachable-corner-seat',
    })
    const expectedRadius =
      OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.outerDiameter / 2 -
      OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.hostOverlap +
      OPENGRID_HONEYCOMB_CONFIGURATION.bottomHoleSafetyRing

    expect(
      openGridStackableBoxHoneycombSocketProtectionRadiusFor(
        parametersForDetachableSeat,
      ),
    ).toBeCloseTo(expectedRadius, 8)
  })
})
