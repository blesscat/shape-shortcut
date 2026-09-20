import { describe, expect, it } from 'vitest'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  boundsForOpenGridDivider,
  classifyOpenGridDividerShape,
  isOpenGridDividerParameters,
  normalizeOpenGridDividerParameters,
  openGridDividerAlignmentInfoFor,
  openGridDividerArmEndpointsFor,
  openGridDividerArmStationsFor,
  openGridDividerAxisFor,
  openGridDividerBoxFitPegCentersFor,
  openGridDividerFileName,
  openGridDividerLatticeStationsFor,
  openGridDividerHoneycombMinHeightFor,
  openGridDividerPegCentersFor,
  openGridDividerPegLengthFor,
  openGridDividerPlanDimensionsFor,
  openGridDividerRetractionFor,
  openGridDividerStlFileName,
  openGridDividerTransitionHeightFor,
  validateOpenGridDividerParameters,
} from '../../src/cad-contract/units'

const DEFAULT_ALIGNMENT_FIELDS = {
  alignmentMode: 'free',
  boxFitWallGrids: 4.5,
  endClearance: 0.15,
  pegLengthMode: 'snap',
  pegDiameterIncrement: 0,
} as const

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
      ...DEFAULT_ALIGNMENT_FIELDS,
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
      ...DEFAULT_ALIGNMENT_FIELDS,
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
    const bounds = boundsForOpenGridDivider(
      normalizeOpenGridDividerParameters({
        left: 1,
        right: 1,
        up: 0,
        down: 0,
        height: 20,
        wallThickness: 2,
        honeycombMode: false,
      }),
    )

    expect(bounds).toEqual({
      min: [-25.725, -2.5, -3.8],
      max: [25.725, 2.5, 20],
    })
    expect(
      boundsForOpenGridDivider(
        normalizeOpenGridDividerParameters({
          left: 1,
          right: 1,
          up: 0,
          down: 0,
          height: 20,
          wallThickness: 2,
          pegLengthMode: 'stackable',
        }),
      ).min[2],
    ).toBe(-5)
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
      'opengrid-divider-l1-r2-u3-d4-t2-h20-a' + 'free-c0.15-psnap-i0.step',
    )
    expect(openGridDividerStlFileName(parameters)).toBe(
      'opengrid-divider-l1-r2-u3-d4-t2-h20-a' + 'free-c0.15-psnap-i0.stl',
    )
    expect(
      openGridDividerFileName({ ...parameters, honeycombMode: true }),
    ).toBe(
      'opengrid-divider-l1-r2-u3-d4-t2-h20-a' +
        'free-c0.15-psnap-i0-honeycomb.step',
    )
    expect(
      openGridDividerStlFileName({ ...parameters, honeycombMode: true }),
    ).toBe(
      'opengrid-divider-l1-r2-u3-d4-t2-h20-a' +
        'free-c0.15-psnap-i0-honeycomb.stl',
    )
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
        ...DEFAULT_ALIGNMENT_FIELDS,
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
      openGridDividerTransitionHeightFor({
        wallThickness: 1,
        height: 20,
        pegDiameterIncrement: 0,
      }),
    ).toBe(2)
    expect(
      openGridDividerTransitionHeightFor({
        wallThickness: 1,
        height: 20,
        pegDiameterIncrement: 0.3,
      }),
    ).toBe(2.1)
    expect(
      openGridDividerTransitionHeightFor({
        wallThickness: 4,
        height: 20,
        pegDiameterIncrement: 0,
      }),
    ).toBe(0.5)
    expect(
      openGridDividerTransitionHeightFor({
        wallThickness: 5,
        height: 20,
        pegDiameterIncrement: 0,
      }),
    ).toBe(0)
    expect(
      openGridDividerTransitionHeightFor({
        wallThickness: 1,
        height: 2,
        pegDiameterIncrement: 0,
      }),
    ).toBeCloseTo(
      2 -
        OPENGRID_DIVIDER_CONFIGURATION.bottomSupportHeight -
        OPENGRID_DIVIDER_CONFIGURATION.geometrySafetyMargin,
      10,
    )
  })
})

describe('OpenGrid divider box-fit alignment', () => {
  const defaultAlignment = OPENGRID_DIVIDER_CONFIGURATION.defaultParameters

  const roundPegCenters = (centers: [number, number][]): [number, number][] =>
    centers.map(([x, y]) => [Number(x.toFixed(10)), y] as [number, number])

  it('anchors half-integer grids at the center column and integers at ±7', () => {
    expect(openGridDividerLatticeStationsFor(4.5)).toEqual([
      -56, -28, 0, 28, 56,
    ])
    expect(openGridDividerLatticeStationsFor(5)).toEqual([
      -63, -35, -7, 7, 35, 63,
    ])
    expect(openGridDividerLatticeStationsFor(1)).toEqual([-7, 7])
    expect(openGridDividerLatticeStationsFor(0.5)).toEqual([0])
  })

  it('lands straight pegs on box holes for a 4.5 grid box', () => {
    // A legacy box-fit snapshot expresses the wall through directional arm
    // counts; validation migrates it to the wall-length parameter and
    // materializes a single horizontal arm. The retired target box grid keys
    // are tolerated and dropped.
    const parameters = normalizeOpenGridDividerParameters({
      left: 2,
      right: 2.5,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
      alignmentMode: 'box-fit',
      targetBoxGridsX: 4.5,
      targetBoxGridsY: 4.5,
    } as Record<string, unknown>)
    expect(parameters.boxFitWallGrids).toBe(4.5)
    expect(parameters.left).toBe(4.5)
    expect(parameters.right).toBe(0)
    expect(parameters).not.toHaveProperty('targetBoxGridsX')
    expect(parameters).not.toHaveProperty('targetBoxGridsY')
    // Centers are junction-relative; the junction sits at the retracted
    // inactive end, so every emitted peg still lands on a nominal hole
    // column after the envelope is centered.
    expect(
      roundPegCenters(openGridDividerBoxFitPegCentersFor(parameters)),
    ).toEqual([
      [-117.575, 0],
      [-89.575, 0],
      [-61.575, 0],
      [-33.575, 0],
      [-5.575, 0],
    ])
    const info = openGridDividerAlignmentInfoFor(parameters)
    expect(info.anchor).toBe('center')
    expect(info.centerPeg).toBe(true)
  })

  it('anchors integer grid boxes at ±7 without a center peg', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 0,
      right: 0,
      up: 0,
      down: 0,
      boxFitWallGrids: 5,
      height: 20,
      wallThickness: 2,
      alignmentMode: 'box-fit',
    })
    expect(parameters.left).toBe(5)
    expect(
      roundPegCenters(openGridDividerBoxFitPegCentersFor(parameters)),
    ).toEqual([
      [-131.575, 0],
      [-103.575, 0],
      [-75.575, 0],
      [-61.575, 0],
      [-33.575, 0],
      [-5.575, 0],
    ])
    const info = openGridDividerAlignmentInfoFor(parameters)
    expect(info.anchor).toBe('plus-minus-7')
    expect(info.centerPeg).toBe(false)
  })

  it('keeps a single box-fit arm wall-to-wall without junction peg or stub', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 0,
      right: 0,
      up: 0,
      down: 0,
      boxFitWallGrids: 4.5,
      height: 20,
      wallThickness: 2,
      alignmentMode: 'box-fit',
      endClearance: 0.15,
    })
    const stations = openGridDividerArmStationsFor(parameters, 'x')
    expect(stations.start).toBeCloseTo(-123.15, 10)
    expect(stations.end).toBe(0)
    const centers = roundPegCenters(
      openGridDividerBoxFitPegCentersFor(parameters),
    )
    expect(centers).toEqual([
      [-117.575, 0],
      [-89.575, 0],
      [-61.575, 0],
      [-33.575, 0],
      [-5.575, 0],
    ])
    expect(openGridDividerAlignmentInfoFor(parameters).anchor).toBe('center')
    expect(openGridDividerRetractionFor(parameters)).toBeCloseTo(1.425, 10)
  })

  it('derives the alignment badge from the wall grid length alone', () => {
    expect(openGridDividerAlignmentInfoFor({ boxFitWallGrids: 4.5 })).toEqual({
      anchor: 'center',
      centerPeg: true,
    })
    expect(openGridDividerAlignmentInfoFor({ boxFitWallGrids: 5 })).toEqual({
      anchor: 'plus-minus-7',
      centerPeg: false,
    })
    expect(openGridDividerAlignmentInfoFor({ boxFitWallGrids: 0.5 })).toEqual({
      anchor: 'center',
      centerPeg: true,
    })
  })

  it('ignores directional arm counts in box-fit mode while preserving them', () => {
    const base = {
      left: 0,
      right: 0,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
      alignmentMode: 'box-fit',
      boxFitWallGrids: 4.5,
    }
    // Frozen L-shaped free-mode counts must not block box-fit acceptance.
    const lShape = validateOpenGridDividerParameters({
      ...base,
      left: 2,
      up: 2,
    })
    expect(lShape.valid).toBe(true)
    expect(
      validateOpenGridDividerParameters({ ...base, left: 99, down: 3 }).valid,
    ).toBe(true)
    expect(
      validateOpenGridDividerParameters({
        ...base,
        left: 1,
        right: 1,
        up: 1,
        down: 1,
      }).valid,
    ).toBe(true)
    // The same frozen counts remain valid free-mode snapshots.
    expect(
      validateOpenGridDividerParameters({
        height: 20,
        wallThickness: 2,
        alignmentMode: 'free',
        left: 2,
        right: 0,
        up: 2,
        down: 0,
      }).valid,
    ).toBe(true)
  })

  it('range-validates alignment fields regardless of alignment mode', () => {
    const base = {
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    }
    expect(
      validateOpenGridDividerParameters({
        ...base,
        alignmentMode: 'free',
        endClearance: 0.05,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        ...base,
        alignmentMode: 'free',
        endClearance: 0.15,
      }).valid,
    ).toBe(true)
    expect(
      validateOpenGridDividerParameters({
        ...base,
        pegDiameterIncrement: 0.1,
      }).valid,
    ).toBe(true)
  })

  it('range-validates the box-fit wall grid length in both modes', () => {
    const base = {
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    }
    for (const alignmentMode of ['free', 'box-fit'] as const) {
      expect(
        validateOpenGridDividerParameters({
          ...base,
          alignmentMode,
          boxFitWallGrids: 17.5,
        }).valid,
        alignmentMode,
      ).toBe(true)
      expect(
        validateOpenGridDividerParameters({
          ...base,
          alignmentMode,
          boxFitWallGrids: 0,
        }).valid,
        alignmentMode,
      ).toBe(false)
      expect(
        validateOpenGridDividerParameters({
          ...base,
          alignmentMode,
          boxFitWallGrids: 4.25,
        }).valid,
        alignmentMode,
      ).toBe(false)
      expect(
        validateOpenGridDividerParameters({
          ...base,
          alignmentMode,
          boxFitWallGrids: 18,
        }).valid,
        alignmentMode,
      ).toBe(false)
    }
    // A wall length above the 10-grid arm cap is a legal wall value.
    const overArmCap = validateOpenGridDividerParameters({
      ...base,
      alignmentMode: 'box-fit',
      boxFitWallGrids: 12,
    })
    expect(overArmCap.valid).toBe(true)
    expect(overArmCap.valid ? [] : overArmCap.issues).toEqual([])
  })

  it('upgrades legacy snapshots with alignment defaults and validates new ranges', () => {
    const legacy = {
      left: 1.5,
      right: 1.5,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    }
    const normalized = normalizeOpenGridDividerParameters(legacy)
    expect(normalized.alignmentMode).toBe('free')
    expect(normalized.boxFitWallGrids).toBe(4.5)
    expect(normalized.pegDiameterIncrement).toBe(0)
    expect(normalized.pegLengthMode).toBe('snap')

    // A legacy box-fit snapshot migrates the wall length from the directional
    // sums and materializes a single horizontal arm.
    const migrated = normalizeOpenGridDividerParameters({
      ...legacy,
      alignmentMode: 'box-fit',
    })
    expect(migrated.boxFitWallGrids).toBe(3)
    expect(migrated.left).toBe(3)
    expect(migrated.right).toBe(0)

    expect(
      validateOpenGridDividerParameters({
        ...legacy,
        alignmentMode: 'box-fit',
        pegDiameterIncrement: 1.5,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        ...legacy,
        alignmentMode: 'box-fit',
        endClearance: 0.05,
      }).valid,
    ).toBe(false)
    // Retired target box grid keys are tolerated on input and dropped from
    // the normalized output without affecting acceptance.
    const withLegacyTargetGrids = normalizeOpenGridDividerParameters({
      ...legacy,
      targetBoxGridsX: 18,
      targetBoxGridsY: 5,
    } as Record<string, unknown>)
    expect(withLegacyTargetGrids.boxFitWallGrids).toBe(4.5)
    expect(withLegacyTargetGrids).not.toHaveProperty('targetBoxGridsX')
    expect(withLegacyTargetGrids).not.toHaveProperty('targetBoxGridsY')
    // Removed dev-era keys are tolerated on input but dropped from output.
    expect(
      normalizeOpenGridDividerParameters({ ...legacy, pegOffsetX: 1.5 })
        .pegDiameterIncrement,
    ).toBe(0)
  })

  it('resolves peg lengths from the shared box floor constants', () => {
    expect(openGridDividerPegLengthFor({ pegLengthMode: 'snap' })).toBe(3.8)
    expect(openGridDividerPegLengthFor({ pegLengthMode: 'thin-shell' })).toBe(
      OPENGRID_DIVIDER_CONFIGURATION.pegLengths['thin-shell'],
    )
    expect(OPENGRID_DIVIDER_CONFIGURATION.pegLengths['thin-shell']).toBe(2)
    expect(OPENGRID_DIVIDER_CONFIGURATION.pegLengths.stackable).toBe(5)
    expect(OPENGRID_DIVIDER_CONFIGURATION.pegDiameter).toBe(4.9)
  })
})
