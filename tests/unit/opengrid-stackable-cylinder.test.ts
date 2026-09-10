import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridStackableCylinder,
  boundsForModel,
  isOpenGridStackableCylinderParameters,
  openGridStackableCylinderDerivedGeometryFor,
  openGridStackableCylinderFileName,
  openGridStackableCylinderHoleCentersFor,
  openGridStackableCylinderOpeningBottomLengthMaximumFor,
  openGridStackableCylinderOuterHoleIndexFor,
  openGridStackableCylinderStlFileName,
  OPENGRID_GRID_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  validateOpenGridStackableCylinderParameters,
  modelFileName,
  modelStlFileName,
  validateModelParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<
    Parameters<typeof boundsForOpenGridStackableCylinder>[0]
  > = {},
) {
  return {
    ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

describe('OpenGrid stackable-cylinder contract', () => {
  it('defaults and migrates to the canonical detachable locking-seat mode', () => {
    expect(
      OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultBottomSeatMode,
    ).toBe('detachable-corner-seat')
    expect(
      validateOpenGridStackableCylinderParameters({
        diameter: 60,
        height: 20,
        bottomHolesEnabled: true,
      }),
    ).toMatchObject({
      valid: true,
      value: { bottomSeatMode: 'detachable-corner-seat' },
    })
    expect(
      validateOpenGridStackableCylinderParameters({
        diameter: 60,
        height: 20,
        bottomSeatMode: 'hole',
      }),
    ).toMatchObject({
      valid: true,
      value: { bottomSeatMode: 'detachable-corner-seat' },
    })
  })

  it('uses the locking mode in normalized cylinder export identity', () => {
    const locking = parameters({
      bottomSeatMode: 'detachable-corner-seat' as never,
    })

    expect(openGridStackableCylinderFileName(locking)).toContain(
      '-seats-detachable-corner-seat-thin.step',
    )
    expect(openGridStackableCylinderStlFileName(locking)).toContain(
      '-seats-detachable-corner-seat-thin.stl',
    )
  })

  it('defaults material saving to off and preserves the opt-in boolean', () => {
    expect(OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS.honeycombMode).toBe(
      false,
    )
    const value = parameters({ honeycombMode: true })
    expect(validateOpenGridStackableCylinderParameters(value)).toEqual({
      valid: true,
      value,
    })
  })

  it('accepts honeycomb opt-in on a legacy snapshot', () => {
    const validation = validateOpenGridStackableCylinderParameters({
      diameter: 56,
      height: 30,
      honeycombMode: true,
    })

    expect(validation.valid).toBe(true)
    if (!validation.valid) return
    expect(validation.value.honeycombMode).toBe(true)
    expect(validation.value.bottomSeatMode).toBe('detachable-corner-seat')
  })
  it('keeps manual height at 500 mm while limiting the slider to 200 mm', () => {
    expect(OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.heightSliderMax).toBe(200)
    expect(
      validateOpenGridStackableCylinderParameters(parameters({ height: 500 }))
        .valid,
    ).toBe(true)
    expect(
      validateOpenGridStackableCylinderParameters(parameters({ height: 501 }))
        .valid,
    ).toBe(false)
  })

  it('accepts the exact typed inner-diameter and height snapshot', () => {
    const value = parameters()

    expect(validateOpenGridStackableCylinderParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(isOpenGridStackableCylinderParameters(value)).toBe(true)
    expect(
      isOpenGridStackableCylinderParameters({
        ...value,
        fullBottomHoleGrid: false,
      }),
    ).toBe(false)
  })

  it('rejects a non-boolean honeycomb mode', () => {
    const validation = validateOpenGridStackableCylinderParameters(
      parameters({ honeycombMode: 'true' as never }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues[0]?.field).toBe('honeycombMode')
    }
  })

  it('accepts independently configured four-direction openings', () => {
    const value = {
      ...parameters(),
      openingPlusXDepth: 8,
      openingPlusXBottomLength: 12,
      openingPlusXAngle: 70,
      openingMinusXDepth: 9,
      openingMinusXBottomLength: 11,
      openingMinusXAngle: 80,
      openingPlusYDepth: 10,
      openingPlusYBottomLength: 10,
      openingPlusYAngle: 90,
      openingMinusYDepth: 7,
      openingMinusYBottomLength: 13,
      openingMinusYAngle: 60,
    }

    expect(validateOpenGridStackableCylinderParameters(value)).toEqual({
      valid: true,
      value,
    })
  })

  it('rejects an opening that would cut into the active floor', () => {
    const validation = validateOpenGridStackableCylinderParameters(
      parameters({
        openingPlusXDepth: 26,
        openingPlusXBottomLength: 10,
        openingPlusXAngle: 90,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues[0]?.field).toBe('openingPlusXDepth')
    }
  })

  it('rejects a 90 degree opening when depth 5 only touches the fixed transitions', () => {
    const validation = validateOpenGridStackableCylinderParameters(
      parameters({
        openingPlusXDepth: 5,
        openingPlusXBottomLength: 8,
        openingPlusXAngle: 90,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues[0]?.field).toBe('openingPlusXDepth')
    }
  })

  it('limits opening depth to the configured cylinder height', () => {
    const validation = validateOpenGridStackableCylinderParameters(
      parameters({
        height: 30,
        openingPlusXDepth: 31,
        openingPlusXBottomLength: 8,
        openingPlusXAngle: 90,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues[0]).toEqual({
        field: 'openingPlusXDepth',
        messageId: 'validation.invalid',
      })
    }
  })

  it('derives a flat-bottom U-opening from depth, length, and side angle', () => {
    const input = parameters({
      height: 30,
      openingPlusXDepth: 12,
      openingPlusXBottomLength: 12,
      openingPlusXAngle: 90,
    })
    const derived = openGridStackableCylinderDerivedGeometryFor(input)
    const openings = derived.openings
    const opening = openings['+X']

    expect(opening).toMatchObject({
      enabled: true,
      bottomZ: 18,
      bottomLength: 12,
      angle: 90,
    })
    expect(opening.arcRadius).toBe(2.5)
    expect(opening.cornerRun).toBeCloseTo(2.5, 8)
    expect(opening.cornerRise).toBeCloseTo(2.5, 8)
    expect(opening.horizontalRun).toBeCloseTo(5, 8)
    expect(opening.verticalSideHeight).toBeCloseTo(7, 8)
    expect(opening.straightSideRun).toBeCloseTo(0, 8)
    expect(opening.upperWidth).toBeCloseTo(22, 8)
    expect(openings['-X']?.enabled).toBe(false)
  })

  it('uses a shallower side angle for a V-like opening while keeping the radius fixed', () => {
    const uOpening = openGridStackableCylinderDerivedGeometryFor(
      parameters({
        height: 30,
        openingPlusXDepth: 12,
        openingPlusXBottomLength: 12,
        openingPlusXAngle: 90,
      }),
    ).openings['+X']
    const vOpening = openGridStackableCylinderDerivedGeometryFor(
      parameters({
        height: 30,
        openingPlusXDepth: 8,
        openingPlusXBottomLength: 0,
        openingPlusXAngle: 45,
      }),
    ).openings['+X']

    expect(vOpening.bottomZ).toBe(22)
    expect(vOpening.arcRadius).toBe(uOpening.arcRadius)
    expect(vOpening.bottomLength).toBe(0)
    expect(vOpening.horizontalRun).toBeGreaterThan(uOpening.horizontalRun)
    expect(vOpening.upperWidth).toBeCloseTo(
      2 *
        (2.5 * 2 * Math.sin(Math.PI / 4) +
          (8 - 2 * 2.5 * (1 - Math.cos(Math.PI / 4))) / Math.tan(Math.PI / 4)),
      8,
    )
    expect(vOpening.cornerRise).toBeCloseTo(
      2.5 * (1 - Math.cos(Math.PI / 4)),
      8,
    )
    expect(vOpening.straightSideRun).toBeGreaterThan(0)
  })

  it('limits bottom length to the largest value accepted by the opening footprint', () => {
    const input = parameters({
      openingPlusXDepth: 12,
      openingPlusXBottomLength: 1,
      openingPlusXAngle: 90,
    })
    const maximum = openGridStackableCylinderOpeningBottomLengthMaximumFor(
      input,
      '+X',
    )

    const accepted = validateOpenGridStackableCylinderParameters({
      ...input,
      openingPlusXBottomLength: maximum,
    })
    expect(accepted.valid).toBe(true)

    const rejected = validateOpenGridStackableCylinderParameters({
      ...input,
      openingPlusXBottomLength: maximum + 1,
    })
    expect(rejected.valid).toBe(false)
    if (!rejected.valid) {
      expect(
        rejected.issues.some(
          (issue) => issue.field === 'openingPlusXBottomLength',
        ),
      ).toBe(true)
    }
  })

  it('reduces bottom length when an enabled neighboring opening uses the bridge', () => {
    const input = parameters({
      openingPlusXDepth: 12,
      openingPlusXBottomLength: 1,
      openingPlusXAngle: 90,
      openingPlusYDepth: 12,
      openingPlusYBottomLength: 12,
      openingPlusYAngle: 90,
    })
    const maximum = openGridStackableCylinderOpeningBottomLengthMaximumFor(
      input,
      '+X',
    )

    const accepted = validateOpenGridStackableCylinderParameters({
      ...input,
      openingPlusXBottomLength: maximum,
    })
    expect(accepted.valid).toBe(true)

    const rejected = validateOpenGridStackableCylinderParameters({
      ...input,
      openingPlusXBottomLength: maximum + 1,
    })
    expect(rejected.valid).toBe(false)
  })

  it.each([
    ['openingPlusXDepth', 8.5],
    ['openingPlusXDepth', Number.POSITIVE_INFINITY],
    ['openingPlusXBottomLength', 0],
    ['openingPlusXBottomLength', -1],
    ['openingPlusXBottomLength', 8.5],
    ['openingPlusXBottomLength', 50],
    ['openingPlusXAngle', 0],
    ['openingPlusXAngle', 91],
  ] as const)('rejects invalid opening field %s', (field, value) => {
    const validation = validateOpenGridStackableCylinderParameters(
      parameters({
        openingPlusXDepth: 12,
        openingPlusXBottomLength: 8,
        openingPlusXAngle: 90,
        [field]: value,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) expect(validation.issues[0]?.field).toBe(field)
  })

  it('omits a zero-depth direction while retaining its normalized settings', () => {
    const value = parameters({
      openingPlusXDepth: 0,
      openingPlusXBottomLength: 24,
      openingPlusXAngle: 40,
    })
    const validation = validateOpenGridStackableCylinderParameters(value)

    expect(validation).toEqual({ valid: true, value })
    if (validation.valid) {
      expect(
        openGridStackableCylinderDerivedGeometryFor(validation.value).openings[
          '+X'
        ],
      ).toMatchObject({
        enabled: false,
        depth: 0,
        bottomLength: 24,
        angle: 40,
      })
    }
  })

  it('rejects an opening footprint that removes the neighboring bridge', () => {
    const validation = validateOpenGridStackableCylinderParameters(
      parameters({
        openingPlusXDepth: 12,
        openingPlusXBottomLength: 35,
        openingPlusXAngle: 90,
        openingPlusYDepth: 12,
        openingPlusYBottomLength: 35,
        openingPlusYAngle: 90,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(
        validation.issues.some((issue) => issue.field === 'openingPlusYDepth'),
      ).toBe(true)
    }
  })

  it('normalizes legacy inner diameter and height snapshots to the thin profile', () => {
    const legacyParameters = parameters({ innerDiameter: 56, height: 30 })
    expect(
      validateOpenGridStackableCylinderParameters({
        innerDiameter: 56,
        height: 30,
      }),
    ).toEqual({
      valid: true,
      value: legacyParameters,
    })
  })

  it('migrates a legacy outer diameter with the thin wall rule', () => {
    const migrated = validateOpenGridStackableCylinderParameters({
      diameter: 60,
      height: 20,
    })
    expect(migrated).toEqual({
      valid: true,
      value: parameters({ innerDiameter: 57, height: 20 }),
    })

    const thinFlag = validateOpenGridStackableCylinderParameters({
      diameter: 60,
      height: 20,
      thinBottomMode: true,
    })
    expect(thinFlag).toEqual({
      valid: true,
      value: parameters({ innerDiameter: 57, height: 20 }),
    })

    const bottomPlate = validateOpenGridStackableCylinderParameters({
      diameter: 60,
      height: 20,
      bottomPlateMode: true,
    })
    expect(bottomPlate).toEqual({
      valid: true,
      value: parameters({
        innerDiameter: 57,
        height: 20,
        bottomPlateMode: true,
      }),
    })

    const canonicalWins = validateOpenGridStackableCylinderParameters({
      diameter: 60,
      innerDiameter: 40,
      height: 20,
    })
    expect(canonicalWins).toEqual({
      valid: true,
      value: parameters({ innerDiameter: 40, height: 20 }),
    })
  })

  it.each([
    [parameters({ innerDiameter: 19 }), 'innerDiameter'],
    [parameters({ innerDiameter: 301 }), 'innerDiameter'],
    [parameters({ innerDiameter: 56.5 }), 'innerDiameter'],
    [parameters({ height: 9 }), 'height'],
    [parameters({ height: 501 }), 'height'],
    [parameters({ height: 30.5 }), 'height'],
  ])(
    'rejects invalid %s values with a field-specific issue',
    (value, field) => {
      const validation = validateOpenGridStackableCylinderParameters(value)

      expect(validation.valid).toBe(false)
      if (!validation.valid) expect(validation.issues[0]?.field).toBe(field)
    },
  )

  it('rejects a migrated legacy outer diameter outside the inner range', () => {
    const validation = validateOpenGridStackableCylinderParameters({
      diameter: 20,
      height: 20,
    })

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues[0]?.field).toBe('innerDiameter')
    }
  })

  it.each([
    ['bottomPlateMode', 1],
    ['bottomSeatMode', 'invalid'],
  ] as const)('rejects an invalid %s value', (field, value) => {
    const validation = validateOpenGridStackableCylinderParameters({
      ...parameters(),
      [field]: value,
    })

    expect(validation.valid).toBe(false)
    if (!validation.valid) expect(validation.issues[0]?.field).toBe(field)
  })

  it('derives centered bounds and deterministic export names', () => {
    const value = parameters()

    expect(boundsForOpenGridStackableCylinder(value)).toEqual({
      min: [-29.6, -29.6, 0],
      max: [29.6, 29.6, 20],
    })
    expect(openGridStackableCylinderFileName(value)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-detachable-corner-seat-thin.step',
    )
    expect(openGridStackableCylinderStlFileName(value)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-detachable-corner-seat-thin.stl',
    )
    const model = {
      modelId: 'opengrid-stackable-cylinder' as const,
      parameters: value,
    }
    expect(boundsForModel(model)).toEqual(
      boundsForOpenGridStackableCylinder(value),
    )
    expect(modelFileName(model)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-detachable-corner-seat-thin.step',
    )
    expect(modelStlFileName(model)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-detachable-corner-seat-thin.stl',
    )
    expect(validateModelParameters(model.modelId, value)).toEqual({
      valid: true,
      value: model,
    })
  })

  it('suffixes seat and profile modes without changing model identity', () => {
    const thin = parameters()
    const noSeats = parameters({ bottomSeatMode: 'none' })
    const integrated = parameters({ bottomSeatMode: 'integrated' })
    const thinNoHoles = {
      ...thin,
      bottomSeatMode: 'none' as const,
    }

    expect(openGridStackableCylinderFileName(thin)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-detachable-corner-seat-thin.step',
    )
    expect(openGridStackableCylinderStlFileName(noSeats)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-none-thin.stl',
    )
    expect(openGridStackableCylinderFileName(thinNoHoles)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-none-thin.step',
    )
    expect(openGridStackableCylinderFileName(integrated)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-integrated-thin.step',
    )
    expect(
      openGridStackableCylinderFileName(parameters({ bottomPlateMode: true })),
    ).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-detachable-corner-seat-bottom-plate.step',
    )
  })

  it('adds a deterministic opening fingerprint only when a side opening is enabled', () => {
    const input = parameters({
      openingPlusXDepth: 8,
      openingPlusXBottomLength: 12,
      openingPlusXAngle: 70,
    })

    expect(openGridStackableCylinderFileName(input)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-detachable-corner-seat-thin-open-8-12-70_0-1-90_0-1-90_0-1-90.step',
    )
    expect(openGridStackableCylinderStlFileName(input)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-detachable-corner-seat-thin-open-8-12-70_0-1-90_0-1-90_0-1-90.stl',
    )
  })

  it('adds a deterministic honeycomb suffix only when material saving is enabled', () => {
    const value = parameters({ honeycombMode: true })

    expect(openGridStackableCylinderFileName(value)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-detachable-corner-seat-thin-honeycomb.step',
    )
    expect(openGridStackableCylinderStlFileName(value)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-detachable-corner-seat-thin-honeycomb.stl',
    )
  })

  it('places honeycomb before existing no-hole and opening suffixes', () => {
    const value = parameters({
      honeycombMode: true,
      bottomSeatMode: 'none',
      openingPlusXDepth: 8,
      openingPlusXBottomLength: 12,
      openingPlusXAngle: 70,
    })

    expect(openGridStackableCylinderFileName(value)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-none-thin-honeycomb-open-8-12-70_0-1-90_0-1-90_0-1-90.step',
    )
    expect(openGridStackableCylinderStlFileName(value)).toBe(
      'opengrid-stackable-cylinder-d56-h20-seats-none-thin-honeycomb-open-8-12-70_0-1-90_0-1-90_0-1-90.stl',
    )
  })

  it('selects the center and four outer cardinal holes at the default diameter', () => {
    expect(openGridStackableCylinderHoleCentersFor(parameters())).toEqual([
      [0, 0],
      [14, 0],
      [-14, 0],
      [0, 14],
      [0, -14],
    ])
  })

  it('keeps only the center hole when the outer layer cannot clear the edge', () => {
    expect(
      openGridStackableCylinderHoleCentersFor(
        parameters({ innerDiameter: 20 }),
      ),
    ).toEqual([[0, 0]])
  })

  it.each([
    [35, 0],
    [36, 0],
    [43, 0],
    [44, 0],
  ])(
    'selects the first flat-floor-safe outer layer at inner diameter %s',
    (innerDiameter, expectedOuterHoleCount) => {
      expect(
        openGridStackableCylinderHoleCentersFor(parameters({ innerDiameter })),
      ).toHaveLength(expectedOuterHoleCount + 1)
    },
  )

  it('preserves the existing integrated outer layer while locking uses its full envelope', () => {
    expect(
      openGridStackableCylinderHoleCentersFor(
        parameters({ innerDiameter: 47, bottomSeatMode: 'integrated' }),
      ),
    ).toHaveLength(5)
    expect(
      openGridStackableCylinderHoleCentersFor(
        parameters({
          innerDiameter: 47,
          bottomSeatMode: 'detachable-corner-seat',
        }),
      ),
    ).toHaveLength(1)
  })

  it('uses the maximum safe 14 mm layer at the largest diameter', () => {
    expect(
      openGridStackableCylinderHoleCentersFor(
        parameters({ innerDiameter: 296 }),
      ),
    ).toEqual([
      [0, 0],
      [126, 0],
      [-126, 0],
      [0, 126],
      [0, -126],
    ])
  })

  it('supports the no-seat mode without locating holes', () => {
    expect(
      openGridStackableCylinderHoleCentersFor(
        parameters({ bottomSeatMode: 'none' }),
      ),
    ).toEqual([])
  })

  it('derives the thin floor ramp and mating protrusion from fixed geometry', () => {
    const input = parameters({ innerDiameter: 56 })
    const derived = openGridStackableCylinderDerivedGeometryFor(input)
    const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION

    expect(derived.profile).toBe('thin')
    expect(derived.flatFloorZ).toBe(configuration.thinFloorThickness)
    expect(derived.bottomHoleSectionDepth).toBe(
      configuration.thinBottomHoleSectionDepth,
    )
    expect(derived.outerTransitionStartRadius).toBeCloseTo(
      derived.matingProtrusionRadius,
      8,
    )
    expect(derived.outerTransitionEndZ).toBeCloseTo(
      derived.outerTransitionStartZ +
        derived.outerTransitionEndRadius -
        derived.outerTransitionStartRadius,
      8,
    )
    const innerRampStartRadius =
      derived.outerTransitionStartRadius - derived.wallThickness * Math.SQRT2
    expect(derived.innerRampEndZ).toBeCloseTo(
      derived.outerTransitionStartZ +
        (derived.innerRadius - innerRampStartRadius),
      8,
    )
    expect(derived.flatFloorRadius).toBeCloseTo(
      derived.innerRampEndRadius - (derived.innerRampEndZ - derived.flatFloorZ),
      8,
    )
  })

  it('uses the box-aligned thin shell thickness while retaining stack clearance', () => {
    const derived = openGridStackableCylinderDerivedGeometryFor(
      parameters({ innerDiameter: 56 }),
    )

    expect(derived.flatFloorZ).toBe(2)
    expect(derived.innerRadius).toBeCloseTo(derived.radius - 1.6, 8)
    expect(derived.matingProtrusionRadius).toBeCloseTo(derived.radius - 1.8, 8)
    expect(derived.matingProtrusionRadius).toBeCloseTo(
      derived.innerRadius -
        OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.stackFitClearance,
      8,
    )
    expect(derived.bottomHoleSectionDepth).toBe(1)
  })

  it('accepts a thin opening that ends exactly at the 2 mm floor', () => {
    const validation = validateOpenGridStackableCylinderParameters(
      parameters({
        height: 20,
        openingPlusXDepth: 18,
        openingPlusXBottomLength: 8,
        openingPlusXAngle: 90,
      }),
    )

    expect(validation.valid).toBe(true)
  })

  it('derives the bottom-plate mode as a clipped outer profile', () => {
    const input = parameters({ bottomPlateMode: true })
    const derived = openGridStackableCylinderDerivedGeometryFor(input)

    expect(derived.profile).toBe('bottom-plate')
    expect(derived.floorThickness).toBe(3)
    expect(derived.bottomHoleSectionDepth).toBe(2)
    expect(derived.outerTransitionStartZ).toBe(0)
    expect(derived.outerTransitionStartRadius).toBeCloseTo(
      derived.matingProtrusionRadius,
      8,
    )
    expect(derived.lowerFootRadius).toBeCloseTo(
      derived.matingProtrusionRadius,
      8,
    )
    expect(derived.outerTransitionEndZ).toBeCloseTo(
      derived.outerTransitionEndRadius - derived.outerTransitionStartRadius,
      8,
    )
  })

  it('keeps the bottom-plate interior vertical with the outer-only hole layout', () => {
    const thinInput = parameters({ innerDiameter: 47 })
    const bottomPlateInput = parameters({
      innerDiameter: 47,
      bottomPlateMode: true,
    })
    const derived =
      openGridStackableCylinderDerivedGeometryFor(bottomPlateInput)
    const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION

    expect(derived.floorThickness).toBe(configuration.floorThickness)
    expect(derived.innerFloorFilletRadius).toBe(
      configuration.innerFloorFilletRadius,
    )
    expect(derived.innerRampEndRadius).toBe(derived.innerRadius)
    expect(derived.innerRampEndZ).toBeCloseTo(
      derived.flatFloorZ + configuration.innerFloorFilletRadius,
      8,
    )
    expect(derived.flatFloorRadius).toBeCloseTo(
      derived.innerRadius - configuration.innerFloorFilletRadius,
      8,
    )
    expect(openGridStackableCylinderOuterHoleIndexFor(bottomPlateInput)).toBe(1)
    expect(
      openGridStackableCylinderHoleCentersFor(bottomPlateInput),
    ).toHaveLength(5)
    expect(openGridStackableCylinderOuterHoleIndexFor(thinInput)).toBe(0)
    expect(openGridStackableCylinderHoleCentersFor(thinInput)).toHaveLength(1)
  })

  it('keeps the fixed geometry constants out of the user snapshot', () => {
    expect(OPENGRID_STACKABLE_CYLINDER_CONFIGURATION).toMatchObject({
      wallThickness: 2,
      thinWallThickness: 1.6,
      thinFloorThickness: 2,
      floorThickness: 3,
      bottomHoleDiameter:
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter,
      innerHoleDiameter:
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter,
      thinBottomHoleSectionDepth: 1,
      bottomHoleSectionDepth: 2,
      innerHoleSectionDepth: 1,
      innerFloorFilletRadius: 0.6,
      holeGridPitch: OPENGRID_GRID_CONFIGURATION.halfPitch,
      outerEdgeClearance: 2,
      flatFloorClearance: 2,
      bottomProtrusionInset: 2,
      stackFitClearance: 0.2,
      bottomFootBevel: 0.8,
      bottomVerticalHeight: 2.6,
      topInnerChamfer: 2,
      thinTopInnerChamfer: 1.6,
      topInnerChamferLand: 0,
      bottomOuterChamfer: 2,
    })
    expect(OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.bottomHoleDiameter).toBe(5)
  })
})
