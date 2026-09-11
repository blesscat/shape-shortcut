import { describe, expect, it } from 'vitest'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  openGridDividerArmEndpointsFor,
  openGridDividerHoneycombMinHeightFor,
  openGridDividerTransitionHeightFor,
  type OpenGridDividerParameters,
} from '../../src/cad-contract/units'
import {
  openGridDividerHoneycombCellCountFor,
  openGridDividerHoneycombCellGroupsFor,
  openGridDividerHoneycombCellLayoutFor,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb-cells'

function dividerParameters(
  overrides: Partial<OpenGridDividerParameters> = {},
): OpenGridDividerParameters {
  return {
    left: 2,
    right: 2,
    up: 0,
    down: 0,
    height: 40,
    wallThickness: 2,
    honeycombMode: true,
    ...overrides,
  }
}

function framedBoundsFor(parameters: OpenGridDividerParameters) {
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const endpoints = openGridDividerArmEndpointsFor(parameters)
  const upperWallStartZ =
    OPENGRID_DIVIDER_CONFIGURATION.bottomSupportHeight +
    openGridDividerTransitionHeightFor(parameters)
  return {
    minimumU: endpoints.left + honeycomb.sideFrame,
    maximumU: endpoints.right - honeycomb.sideFrame,
    minimumV: upperWallStartZ + honeycomb.lowerFrame,
    maximumV:
      parameters.height -
      honeycomb.topFrame -
      OPENGRID_DIVIDER_CONFIGURATION.topFilletRadius,
  }
}

describe('OpenGrid divider honeycomb cells', () => {
  it('produces framed cells inside the upper straight wall only', () => {
    const parameters = dividerParameters()
    const groups = openGridDividerHoneycombCellGroupsFor(parameters)
    expect(groups.length).toBeGreaterThan(0)

    const bounds = framedBoundsFor(parameters)
    for (const group of groups) {
      for (const polygon of group) {
        for (const [u, v] of polygon) {
          expect(u).toBeGreaterThanOrEqual(bounds.minimumU - 1e-6)
          expect(u).toBeLessThanOrEqual(bounds.maximumU + 1e-6)
          expect(v).toBeGreaterThanOrEqual(bounds.minimumV - 1e-6)
          expect(v).toBeLessThanOrEqual(bounds.maximumV + 1e-6)
        }
      }
    }
    expect(openGridDividerHoneycombCellCountFor(parameters)).toBe(groups.length)
  })

  it('counts zero cells when the saving mode is off', () => {
    expect(
      openGridDividerHoneycombCellCountFor(
        dividerParameters({ honeycombMode: false }),
      ),
    ).toBe(0)
  })

  it('keeps the wall solid when the height cannot fit one framed row', () => {
    const minHeight = openGridDividerHoneycombMinHeightFor({
      wallThickness: 2,
    })
    const parameters = dividerParameters({ height: Math.floor(minHeight) })
    expect(parameters.height).toBeLessThan(minHeight)
    expect(openGridDividerHoneycombCellGroupsFor(parameters)).toEqual([])
    expect(
      openGridDividerHoneycombCellCountFor(
        dividerParameters({
          height: Math.ceil(minHeight) + 20,
        }),
      ),
    ).toBeGreaterThan(0)
  })

  it('keeps cross-shape cells clear of the central junction on both walls', () => {
    const parameters = dividerParameters({
      left: 2,
      right: 2,
      up: 2,
      down: 0,
    })
    const layout = openGridDividerHoneycombCellLayoutFor(parameters)
    expect(layout.horizontal.length).toBeGreaterThan(0)
    expect(layout.vertical.length).toBeGreaterThan(0)

    const junctionHalfWidth =
      parameters.wallThickness / 2 +
      OPENGRID_HONEYCOMB_CONFIGURATION.ribThickness / 2
    for (const wallGroups of [layout.horizontal, layout.vertical]) {
      for (const group of wallGroups) {
        for (const polygon of group) {
          for (const [u, v] of polygon) {
            if (Math.abs(u) < junctionHalfWidth) {
              // Points inside the junction keepout must belong to a clipped
              // cell whose polygon stops at the keepout edge.
              expect(Math.abs(u)).toBeCloseTo(junctionHalfWidth, 6)
            }
            expect(v).toBeGreaterThan(
              OPENGRID_DIVIDER_CONFIGURATION.bottomSupportHeight,
            )
          }
        }
      }
    }
  })

  it('maps horizontal and vertical arms to separate layouts', () => {
    const horizontalOnly =
      openGridDividerHoneycombCellLayoutFor(dividerParameters())
    expect(horizontalOnly.horizontal.length).toBeGreaterThan(0)
    expect(horizontalOnly.vertical).toEqual([])

    const verticalOnly = openGridDividerHoneycombCellLayoutFor(
      dividerParameters({ left: 0, right: 0, up: 2, down: 2 }),
    )
    expect(verticalOnly.horizontal).toEqual([])
    expect(verticalOnly.vertical.length).toBeGreaterThan(0)
  })
})
