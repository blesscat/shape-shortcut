import { describe, expect, it } from 'vitest'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  boundsForOpenGridDivider,
  classifyOpenGridDividerShape,
  isOpenGridDividerParameters,
  normalizeOpenGridDividerParameters,
  openGridDividerArmEndpointsFor,
  openGridDividerAxisFor,
  openGridDividerFileName,
  openGridDividerHoneycombMinHeightFor,
  openGridDividerPegCentersFor,
  openGridDividerPlanDimensionsFor,
  openGridDividerStlFileName,
  openGridDividerTransitionHeightFor,
  validateOpenGridDividerParameters,
} from '../../src/cad-contract/units'

describe('OpenGrid divider contract', () => {
  it('keeps manual height at 500 mm while limiting the slider to 200 mm', () => {
    expect(OPENGRID_DIVIDER_CONFIGURATION.heightSliderMax).toBe(200)
    expect(
      validateOpenGridDividerParameters({
        left: 1,
        right: 1,
        up: 0,
        down: 0,
        height: 500,
        wallThickness: 2,
      }).valid,
    ).toBe(true)
    expect(
      validateOpenGridDividerParameters({
        left: 1,
        right: 1,
        up: 0,
        down: 0,
        height: 501,
        wallThickness: 2,
      }).valid,
    ).toBe(false)
  })

  it('accepts selectable wall thickness and exposes profile dimensions', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })

    expect(parameters).toEqual({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
      honeycombMode: false,
    })
    expect(openGridDividerPlanDimensionsFor(parameters)).toMatchObject({
      wallThickness: 2,
      baseWallWidth: OPENGRID_DIVIDER_CONFIGURATION.wallWidth,
    })
  })

  it('rejects fractional and out-of-range wall thickness', () => {
    const base = {
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
    }

    expect(
      validateOpenGridDividerParameters({ ...base, wallThickness: 1.5 }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridDividerParameters({ ...base, wallThickness: 0 }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridDividerParameters({ ...base, wallThickness: 6 }),
    ).toMatchObject({ valid: false })
    for (const wallThickness of [1, 2, 3, 4, 5]) {
      expect(
        validateOpenGridDividerParameters({ ...base, wallThickness }).valid,
      ).toBe(true)
    }
  })

  it('accepts the default horizontal two-grid divider', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness:
        OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.wallThickness,
    })

    expect(parameters).toEqual({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness:
        OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.wallThickness,
      honeycombMode: false,
    })
    expect(classifyOpenGridDividerShape(parameters)).toBe('straight')
    expect(openGridDividerAxisFor(parameters)).toBe('horizontal')
    expect(isOpenGridDividerParameters(parameters)).toBe(true)
  })

  it('derives L, T, cross, and vertical straight shapes from active arms', () => {
    expect(
      classifyOpenGridDividerShape({
        left: 0,
        right: 1,
        up: 0,
        down: 0,
      }),
    ).toBe('single')
    expect(
      openGridDividerAxisFor({
        left: 0,
        right: 1,
        up: 0,
        down: 0,
      }),
    ).toBe('horizontal')
    expect(
      classifyOpenGridDividerShape({
        left: 1,
        right: 0,
        up: 2,
        down: 0,
      }),
    ).toBe('L')
    expect(
      classifyOpenGridDividerShape({
        left: 1,
        right: 1,
        up: 2,
        down: 0,
      }),
    ).toBe('T')
    expect(
      classifyOpenGridDividerShape({
        left: 1,
        right: 1,
        up: 1,
        down: 1,
      }),
    ).toBe('cross')
    expect(
      openGridDividerAxisFor({
        left: 0,
        right: 0,
        up: 1,
        down: 1,
      }),
    ).toBe('vertical')
  })

  it('rejects incomplete, off-step, negative, and oversized snapshots', () => {
    expect(OPENGRID_DIVIDER_CONFIGURATION.maxArmCount).toBe(10)
    expect(
      validateOpenGridDividerParameters({
        left: 0,
        right: 0,
        up: 0,
        down: 0,
        height: 20,
        wallThickness: 2,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: 1.25,
        right: 1,
        up: 0,
        down: 0,
        height: 20,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: -1,
        right: 1,
        up: 0,
        down: 0,
        height: 20,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
        right: 0,
        up: 0.5,
        down: 0,
        height: 20,
        wallThickness: 2,
      }).valid,
    ).toBe(true)
    expect(
      validateOpenGridDividerParameters({
        left: 10.5,
        right: 0,
        up: 0.5,
        down: 0,
        height: 20,
        wallThickness: 2,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: 10,
        right: 0,
        up: 0.5,
        down: 0,
        height: 20,
        wallThickness: 2,
      }).valid,
    ).toBe(true)
    expect(
      validateOpenGridDividerParameters({
        left: 10,
        right: 10,
        up: 0,
        down: 0,
        height: 20,
        wallThickness: 2,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: 18,
        right: 18,
        up: 0,
        down: 0,
        height: 20,
        wallThickness: 2,
      }).valid,
    ).toBe(false)
  })

  it('uses official 28 mm full-grid lengths and sparse deterministic peg centers', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1.5,
      right: 2.5,
      up: 4.5,
      down: 0,
      height: 20,
      wallThickness: 2,
    })

    expect(openGridDividerPlanDimensionsFor(parameters)).toMatchObject({
      wallHeight: 20,
      totalHeight: 23.8,
    })
    expect(openGridDividerPlanDimensionsFor(parameters).width).toBeCloseTo(
      107.45,
      10,
    )
    expect(openGridDividerPlanDimensionsFor(parameters).depth).toBeCloseTo(
      126.225,
      10,
    )
    expect(openGridDividerArmEndpointsFor(parameters)).toEqual({
      left: -39.725,
      right: 67.725,
      up: 123.725,
      down: 0,
    })
    const centers = openGridDividerPegCentersFor(parameters)
    const { pegCenterSpacing } = OPENGRID_DIVIDER_CONFIGURATION
    expect(centers).toEqual([
      [0, 0],
      [-pegCenterSpacing, 0],
      [pegCenterSpacing, 0],
      [pegCenterSpacing * 2, 0],
      [0, pegCenterSpacing],
      [0, pegCenterSpacing * 2],
      [0, pegCenterSpacing * 3],
      [0, pegCenterSpacing * 4],
    ])
    expect(new Set(centers.map(([x, y]) => `${x},${y}`)).size).toBe(
      centers.length,
    )
  })

  it('keeps a 3x3 cross to the central peg only', () => {
    expect(
      openGridDividerPegCentersFor({
        left: 1,
        right: 1,
        up: 1,
        down: 1,
      }),
    ).toEqual([[0, 0]])
  })

  it('returns centered bounds including the shared 3.8 mm peg extension', () => {
    const bounds = boundsForOpenGridDivider({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
      honeycombMode: false,
    })

    expect(bounds).toEqual({
      min: [-25.725, -2.5, -3.8],
      max: [25.725, 2.5, 20],
    })
  })

  it('creates deterministic STEP and STL names', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1,
      right: 2,
      up: 3,
      down: 4,
      height: 20,
      wallThickness: 2,
    })

    expect(openGridDividerFileName(parameters)).toBe(
      'opengrid-divider-l1-r2-u3-d4-t2-h20.step',
    )
    expect(openGridDividerStlFileName(parameters)).toBe(
      'opengrid-divider-l1-r2-u3-d4-t2-h20.stl',
    )
    expect(
      openGridDividerFileName({ ...parameters, honeycombMode: true }),
    ).toBe('opengrid-divider-l1-r2-u3-d4-t2-h20-honeycomb.step')
    expect(
      openGridDividerStlFileName({ ...parameters, honeycombMode: true }),
    ).toBe('opengrid-divider-l1-r2-u3-d4-t2-h20-honeycomb.stl')
    expect(
      openGridDividerFileName({ ...parameters, wallThickness: 1 }),
    ).not.toBe(openGridDividerFileName(parameters))
    expect(
      openGridDividerStlFileName({ ...parameters, wallThickness: 5 }),
    ).not.toBe(openGridDividerStlFileName(parameters))
  })

  it('accepts the six-field legacy snapshot and normalizes honeycombMode off', () => {
    const validation = validateOpenGridDividerParameters({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })

    expect(validation).toEqual({
      valid: true,
      value: {
        left: 1,
        right: 1,
        up: 0,
        down: 0,
        height: 20,
        wallThickness: 2,
        honeycombMode: false,
      },
    })
  })

  it('accepts an explicit honeycombMode and rejects non-boolean values', () => {
    const base = {
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    }

    expect(
      validateOpenGridDividerParameters({ ...base, honeycombMode: true }).valid,
    ).toBe(true)
    const invalid = validateOpenGridDividerParameters({
      ...base,
      honeycombMode: 'true',
    })
    expect(invalid.valid).toBe(false)
    if (!invalid.valid) {
      expect(invalid.issues).toEqual([
        { field: 'honeycombMode', messageId: 'validation.invalid' },
      ])
    }
    expect(
      validateOpenGridDividerParameters({
        ...base,
        honeycombMode: true,
        extra: 1,
      }).valid,
    ).toBe(false)
  })

  it('derives the honeycomb minimum height from the framed upper wall', () => {
    const expectedFor = (wallThickness: number): number => {
      const { bottomSupportHeight, geometrySafetyMargin, wallWidth } =
        OPENGRID_DIVIDER_CONFIGURATION
      const upperWallStartZ =
        bottomSupportHeight + (wallWidth - wallThickness) / 2
      return (
        upperWallStartZ +
        OPENGRID_HONEYCOMB_CONFIGURATION.lowerFrame +
        OPENGRID_HONEYCOMB_CONFIGURATION.minimumPanelSpan +
        OPENGRID_HONEYCOMB_CONFIGURATION.topFrame +
        OPENGRID_DIVIDER_CONFIGURATION.topFilletRadius +
        geometrySafetyMargin
      )
    }

    expect(openGridDividerHoneycombMinHeightFor({ wallThickness: 2 })).toBe(
      expectedFor(2),
    )
    expect(openGridDividerHoneycombMinHeightFor({ wallThickness: 5 })).toBe(
      expectedFor(5),
    )
    expect(
      openGridDividerHoneycombMinHeightFor({ wallThickness: 5 }),
    ).toBeLessThan(openGridDividerHoneycombMinHeightFor({ wallThickness: 1 }))
    expect(OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS).toBe(3000)
  })

  it('uses a 45-degree transition height when the profile has room', () => {
    expect(
      openGridDividerTransitionHeightFor({ wallThickness: 1, height: 20 }),
    ).toBe(2)
    expect(
      openGridDividerTransitionHeightFor({ wallThickness: 4, height: 20 }),
    ).toBe(0.5)
    expect(
      openGridDividerTransitionHeightFor({ wallThickness: 5, height: 20 }),
    ).toBe(0)
    expect(
      openGridDividerTransitionHeightFor({ wallThickness: 1, height: 2 }),
    ).toBeCloseTo(
      2 -
        OPENGRID_DIVIDER_CONFIGURATION.bottomSupportHeight -
        OPENGRID_DIVIDER_CONFIGURATION.geometrySafetyMargin,
      10,
    )
  })
})
