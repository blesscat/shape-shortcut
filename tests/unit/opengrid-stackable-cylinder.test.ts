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
  OPENGRID_LOCATING_SEAT_MODES,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  validateOpenGridStackableBoxParameters,
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
    expect(validation.value.bottomSeatMode).toBe('hole')
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

  it('accepts the exact typed outer-diameter and height snapshot', () => {
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

  it('normalizes legacy diameter and height snapshots to the default profile', () => {
    const legacyParameters = parameters({ diameter: 56, height: 30 })
    expect(
      validateOpenGridStackableCylinderParameters({ diameter: 56, height: 30 }),
    ).toEqual({
      valid: true,
      value: legacyParameters,
    })
  })

  it.each([
    [parameters({ diameter: 19 }), 'diameter'],
    [parameters({ diameter: 301 }), 'diameter'],
    [parameters({ diameter: 56.5 }), 'diameter'],
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

  it.each([
    ['thinBottomMode', 'true'],
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

  it('accepts the cylinder-only center hook without widening the shared seat contract', () => {
    const value = parameters({ bottomSeatMode: 'center-hook' })

    expect(validateOpenGridStackableCylinderParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(boundsForOpenGridStackableCylinder(value).min[2]).toBe(
      OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.centerHookMinZ,
    )
    expect(openGridStackableCylinderOuterHoleIndexFor(value)).toBe(0)
    expect(openGridStackableCylinderHoleCentersFor(value)).toEqual([])
    expect(openGridStackableCylinderFileName(value)).toContain(
      '-seats-center-hook',
    )
    expect(openGridStackableCylinderStlFileName(value)).toContain(
      '-seats-center-hook',
    )
    expect(OPENGRID_LOCATING_SEAT_MODES).toEqual(['none', 'hole', 'integrated'])

    const boxValidation = validateOpenGridStackableBoxParameters({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      cornerSeatMode: 'center-hook' as never,
    })
    expect(boxValidation.valid).toBe(false)
  })

  it('rejects selecting thin and bottom-plate modes together', () => {
    const validation = validateOpenGridStackableCylinderParameters(
      parameters({ thinBottomMode: true, bottomPlateMode: true }),
    )

    expect(validation).toEqual({
      valid: false,
      issues: [
        {
          field: 'parameters',
          messageId: 'validation.invalid',
        },
      ],
    })
  })

  it('derives centered bounds and deterministic export names', () => {
    const value = parameters()

    expect(boundsForOpenGridStackableCylinder(value)).toEqual({
      min: [-30, -30, 0],
      max: [30, 30, 20],
    })
    expect(openGridStackableCylinderFileName(value)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-hole.step',
    )
    expect(openGridStackableCylinderStlFileName(value)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-hole.stl',
    )
    const model = {
      modelId: 'opengrid-stackable-cylinder' as const,
      parameters: value,
    }
    expect(boundsForModel(model)).toEqual(
      boundsForOpenGridStackableCylinder(value),
    )
    expect(modelFileName(model)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-hole.step',
    )
    expect(modelStlFileName(model)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-hole.stl',
    )
    expect(validateModelParameters(model.modelId, value)).toEqual({
      valid: true,
      value: model,
    })
  })

  it('suffixes seat and profile modes without changing model identity', () => {
    const thin = parameters({ thinBottomMode: true })
    const noSeats = parameters({ bottomSeatMode: 'none' })
    const integrated = parameters({ bottomSeatMode: 'integrated' })
    const thinNoHoles = {
      ...thin,
      bottomSeatMode: 'none' as const,
    }

    expect(openGridStackableCylinderFileName(thin)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-hole-thin.step',
    )
    expect(openGridStackableCylinderStlFileName(noSeats)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-none.stl',
    )
    expect(openGridStackableCylinderFileName(thinNoHoles)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-none-thin.step',
    )
    expect(openGridStackableCylinderFileName(integrated)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-integrated.step',
    )
    expect(
      openGridStackableCylinderFileName(parameters({ bottomPlateMode: true })),
    ).toBe('opengrid-stackable-cylinder-d60-h20-seats-hole-bottom-plate.step')
  })

  it('adds a deterministic opening fingerprint only when a side opening is enabled', () => {
    const input = parameters({
      openingPlusXDepth: 8,
      openingPlusXBottomLength: 12,
      openingPlusXAngle: 70,
    })

    expect(openGridStackableCylinderFileName(input)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-hole-open-8-12-70_0-1-90_0-1-90_0-1-90.step',
    )
    expect(openGridStackableCylinderStlFileName(input)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-hole-open-8-12-70_0-1-90_0-1-90_0-1-90.stl',
    )
  })

  it('adds a deterministic honeycomb suffix only when material saving is enabled', () => {
    const value = parameters({ honeycombMode: true })

    expect(openGridStackableCylinderFileName(value)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-hole-honeycomb.step',
    )
    expect(openGridStackableCylinderStlFileName(value)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-hole-honeycomb.stl',
    )
  })

  it('places honeycomb before existing no-hole and opening suffixes', () => {
    const value = parameters({
      honeycombMode: true,
      thinBottomMode: true,
      bottomSeatMode: 'none',
      openingPlusXDepth: 8,
      openingPlusXBottomLength: 12,
      openingPlusXAngle: 70,
    })

    expect(openGridStackableCylinderFileName(value)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-none-thin-honeycomb-open-8-12-70_0-1-90_0-1-90_0-1-90.step',
    )
    expect(openGridStackableCylinderStlFileName(value)).toBe(
      'opengrid-stackable-cylinder-d60-h20-seats-none-thin-honeycomb-open-8-12-70_0-1-90_0-1-90_0-1-90.stl',
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
      openGridStackableCylinderHoleCentersFor(parameters({ diameter: 20 })),
    ).toEqual([[0, 0]])
  })

  it.each([
    [39, 0],
    [40, 4],
    [47, 4],
    [48, 4],
  ])(
    'selects the first flat-floor-safe outer layer at diameter %s',
    (diameter, expectedOuterHoleCount) => {
      expect(
        openGridStackableCylinderHoleCentersFor(parameters({ diameter })),
      ).toHaveLength(expectedOuterHoleCount + 1)
    },
  )

  it('uses the maximum safe 14 mm layer at the largest diameter', () => {
    expect(
      openGridStackableCylinderHoleCentersFor(parameters({ diameter: 300 })),
    ).toEqual([
      [0, 0],
      [140, 0],
      [-140, 0],
      [0, 140],
      [0, -140],
    ])
  })

  it.each([
    [39, 0],
    [40, 0],
    [47, 0],
    [48, 0],
    [49, 4],
  ])(
    'selects the thin-mode outer layer at diameter %s',
    (diameter, expectedOuterHoleCount) => {
      expect(
        openGridStackableCylinderHoleCentersFor(
          parameters({ diameter, thinBottomMode: true }),
        ),
      ).toHaveLength(expectedOuterHoleCount + 1)
    },
  )

  it('supports the no-seat mode without locating holes', () => {
    expect(
      openGridStackableCylinderHoleCentersFor(
        parameters({ bottomSeatMode: 'none' }),
      ),
    ).toEqual([])
  })

  it('derives the default floor fillet and mating protrusion from fixed geometry', () => {
    const input = parameters({ diameter: 56 })
    const derived = openGridStackableCylinderDerivedGeometryFor(input)
    const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION

    expect(derived.profile).toBe('default')
    expect(derived.flatFloorZ).toBe(configuration.defaultFloorThickness)
    expect(derived.innerRampEndRadius).toBe(derived.innerRadius)
    expect(derived.innerRampEndZ).toBeCloseTo(
      configuration.defaultFloorThickness +
        configuration.innerFloorFilletRadius,
      8,
    )
    expect(derived.flatFloorRadius).toBeCloseTo(
      derived.innerRadius - configuration.innerFloorFilletRadius,
      8,
    )
    expect(derived.matingProtrusionRadius).toBeCloseTo(
      derived.innerRadius - configuration.stackFitClearance,
      8,
    )
    expect(derived.outerTransitionStartRadius).toBeCloseTo(
      derived.matingProtrusionRadius,
      8,
    )
  })

  it('derives the thin floor ramp independently from the default profile', () => {
    const input = parameters({ diameter: 56, thinBottomMode: true })
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
      parameters({ diameter: 56, thinBottomMode: true }),
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
        thinBottomMode: true,
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

  it('keeps the bottom-plate interior vertical and uses the default hole layout', () => {
    const defaultInput = parameters({ diameter: 47 })
    const bottomPlateInput = parameters({
      diameter: 47,
      bottomPlateMode: true,
    })
    const derived =
      openGridStackableCylinderDerivedGeometryFor(bottomPlateInput)
    const defaultDerived =
      openGridStackableCylinderDerivedGeometryFor(defaultInput)
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
    expect(openGridStackableCylinderOuterHoleIndexFor(bottomPlateInput)).toBe(
      openGridStackableCylinderOuterHoleIndexFor(defaultInput),
    )
    expect(
      openGridStackableCylinderHoleCentersFor(bottomPlateInput),
    ).toHaveLength(openGridStackableCylinderHoleCentersFor(defaultInput).length)
    expect(defaultDerived.innerFloorFilletRadius).toBe(
      configuration.innerFloorFilletRadius,
    )
  })

  it('keeps the fixed geometry constants out of the user snapshot', () => {
    expect(OPENGRID_STACKABLE_CYLINDER_CONFIGURATION).toMatchObject({
      wallThickness: 2,
      thinWallThickness: 1.6,
      defaultFloorThickness: 5,
      thinFloorThickness: 2,
      floorThickness: 3,
      bottomHoleDiameter:
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter,
      innerHoleDiameter:
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter,
      defaultBottomHoleSectionDepth: 4,
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
