import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridOrganizerBox,
  openGridOrganizerBoxCavityEnvelopeFor,
  openGridOrganizerBoxLayoutFor,
  openGridOrganizerBoxDetachableSocketPosesFor,
  openGridOrganizerBoxFileName,
  openGridOrganizerBoxStlFileName,
  normalizeOpenGridOrganizerBoxParameters,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  validateOpenGridOrganizerBoxParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<typeof OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS> = {},
) {
  return {
    ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

function interfaceTopFor(
  boxMode: 'normal' | 'stackable',
  cornerSeatMode: 'none' | 'detachable-corner-seat' | 'integrated',
): number {
  if (cornerSeatMode === 'integrated') {
    return OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ
  }
  if (boxMode === 'normal' && cornerSeatMode === 'detachable-corner-seat') {
    return OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.depth
  }
  if (boxMode === 'normal') return 0
  return (
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomFootChamferHeight +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomSupportBandHeight +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomStackingLeadIn +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGridSeamOpeningWidth / 2
  )
}

function legacyParameters(
  bottomInterfaceMode: 'corner-seat' | 'detachable-corner-seat' | 'stackable',
) {
  const {
    cornerSeatMode: _cornerSeatMode,
    boxMode: _boxMode,
    stackingClearanceHeight: _stackingClearanceHeight,
    wallThickness: _wallThickness,
    ...legacy
  } = OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS
  return { ...legacy, bottomInterfaceMode }
}

describe('OpenGrid organizer-box contract', () => {
  it('accepts the default typed snapshot', () => {
    const value = parameters()

    expect(validateOpenGridOrganizerBoxParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(value.holeSpacingMode).toBe('linked')
    expect(value.holeSpacingX).toBe(value.holeSpacingY)
    expect(value.bottomThickness).toBe(1)
    expect(value.wallThickness).toBe(2)
    expect(value.cornerSeatMode).toBe('detachable-corner-seat')
    expect(value.boxMode).toBe('normal')
    expect(value.stackingClearanceHeight).toBe(3.5)
  })

  it.each([
    ['corner-seat', 'integrated', 'normal', 2],
    ['detachable-corner-seat', 'detachable-corner-seat', 'normal', 2],
    ['stackable', 'none', 'stackable', 3],
  ] as const)(
    'migrates legacy %s parameters to seat %s and body %s',
    (bottomInterfaceMode, cornerSeatMode, boxMode, wallThickness) => {
      const legacy = legacyParameters(bottomInterfaceMode)
      const normalized = normalizeOpenGridOrganizerBoxParameters(legacy)

      expect(normalized).toEqual({
        ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
        cornerSeatMode,
        boxMode,
        stackingClearanceHeight: 3.5,
        wallThickness,
      })
      expect(validateOpenGridOrganizerBoxParameters(legacy).valid).toBe(false)
      expect(validateOpenGridOrganizerBoxParameters(normalized).valid).toBe(
        true,
      )
    },
  )

  it('enforces the stackable Z minimum and half-millimetre grid', () => {
    for (const stackingClearanceHeight of [3, 3.2, 3.6]) {
      const validation = validateOpenGridOrganizerBoxParameters(
        parameters({ stackingClearanceHeight }),
      )
      expect(validation.valid).toBe(false)
      if (!validation.valid) {
        expect(validation.issues.map(({ field }) => field)).toContain(
          'stackingClearanceHeight',
        )
      }
    }

    for (const stackingClearanceHeight of [3.5, 4, 12.5]) {
      expect(
        validateOpenGridOrganizerBoxParameters(
          parameters({ stackingClearanceHeight }),
        ).valid,
      ).toBe(true)
    }
  })

  it('derives centered cavities from outer-to-outer spacing', () => {
    const value = parameters({
      holeCountX: 3,
      holeCountY: 2,
      holeSpacingX: 2,
      holeSpacingY: 4,
      holeSpacingMode: 'independent',
      holeDiameter: 10,
    })

    const layout = openGridOrganizerBoxLayoutFor(value)

    expect(layout.cavityCenters).toEqual([
      [-12, -7],
      [-12, 7],
      [0, -7],
      [0, 7],
      [12, -7],
      [12, 7],
    ])
    expect(layout.requiredSpan).toEqual({ x: 34, y: 24 })
    expect(layout.gridCountX).toBeGreaterThanOrEqual(1)
    expect(layout.gridCountY).toBeGreaterThanOrEqual(1)
    expect(layout.footprint[0]).toBeGreaterThan(layout.requiredSpan.x)
    expect(layout.footprint[1]).toBeGreaterThan(layout.requiredSpan.y)
  })

  it('uses the fixed orientation and inscribed diameter for polygons', () => {
    const square = openGridOrganizerBoxCavityEnvelopeFor({
      shape: 'square',
      diameter: 10,
    })
    const hexagon = openGridOrganizerBoxCavityEnvelopeFor({
      shape: 'hexagon',
      diameter: 10,
    })

    expect(square.x).toBeCloseTo(10, 8)
    expect(square.y).toBeCloseTo(10, 8)
    expect(hexagon.x).toBeGreaterThan(10)
    expect(hexagon.y).toBeCloseTo(10, 8)
  })

  it('rejects unequal linked spacing and unsupported shapes', () => {
    expect(
      validateOpenGridOrganizerBoxParameters(
        parameters({ holeSpacingX: 2, holeSpacingY: 3 }),
      ),
    ).toMatchObject({ valid: false })

    expect(
      validateOpenGridOrganizerBoxParameters(
        parameters({ holeShape: 'octagon' as never }),
      ),
    ).toMatchObject({ valid: false })
  })

  it('rejects a cavity layout above the workspace limit', () => {
    const validation = validateOpenGridOrganizerBoxParameters(
      parameters({
        holeCountX: 20,
        holeCountY: 20,
        holeSpacingX: 300,
        holeSpacingY: 300,
        holeSpacingMode: 'independent',
        holeDiameter: 300,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues.map((issue) => issue.field)).toContain(
        'parameters',
      )
    }
  })

  it('derives bounds and export names from the full snapshot', () => {
    const value = parameters({
      holeShape: 'hexagon',
      holeDiameter: 12,
      holeDepth: 18,
      bottomThickness: 3,
      wallThickness: 3,
      cornerSeatMode: 'none',
      boxMode: 'stackable',
      stackingClearanceHeight: 4,
    })

    const bounds = boundsForOpenGridOrganizerBox(value)
    const layout = openGridOrganizerBoxLayoutFor(value)
    expect(bounds.max[0]).toBe(-bounds.min[0])
    expect(bounds.max[1]).toBe(-bounds.min[1])
    expect(bounds.min[2]).toBe(0)
    expect(layout.stacking).not.toBeNull()
    expect(layout.stacking?.riserHeight).toBeCloseTo(0.8, 8)
    expect(layout.stacking?.seatDatumZ).toBeCloseTo(
      layout.bodyHeight + value.stackingClearanceHeight,
      8,
    )
    expect(bounds.max[2]).toBeCloseTo(
      layout.bodyHeight +
        value.stackingClearanceHeight +
        (OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight - 3.2),
      8,
    )

    const step = openGridOrganizerBoxFileName(value)
    const stl = openGridOrganizerBoxStlFileName(value)
    expect(step).toContain('opengrid-organizer-box')
    expect(step).toContain('hexagon')
    expect(step).toContain('sm-linked')
    expect(step).toContain('wt3')
    expect(step).toContain('seats-none')
    expect(step).toContain('body-stackable')
    expect(step).toContain('z4')
    expect(step.endsWith('.step')).toBe(true)
    expect(stl.endsWith('.stl')).toBe(true)
    expect(
      boundsForOpenGridOrganizerBox({
        ...value,
        cornerSeatMode: 'integrated',
        boxMode: 'normal',
      }).min[2],
    ).toBe(OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ)
    expect(
      openGridOrganizerBoxFileName({
        ...value,
        holeSpacingMode: 'independent',
      }),
    ).not.toBe(step)

    const normalAtDifferentZ = openGridOrganizerBoxFileName({
      ...value,
      boxMode: 'normal',
    })
    expect(
      openGridOrganizerBoxFileName({
        ...value,
        boxMode: 'normal',
        stackingClearanceHeight: 12,
      }),
    ).toBe(normalAtDifferentZ)
  })

  it('rejects walls below the mode floors', () => {
    for (const candidate of [
      parameters({ wallThickness: 1.5 }),
      parameters({ boxMode: 'stackable', wallThickness: 2.9 }),
    ]) {
      const validation = validateOpenGridOrganizerBoxParameters(candidate)
      expect(validation.valid).toBe(false)
      if (!validation.valid) {
        expect(validation.issues.map(({ field }) => field)).toContain(
          'wallThickness',
        )
      }
    }

    expect(
      validateOpenGridOrganizerBoxParameters(
        parameters({ boxMode: 'stackable', wallThickness: 2.95 }),
      ).valid,
    ).toBe(true)
  })

  it('accepts a zero bottom thickness above the mode datum', () => {
    const value = parameters({ bottomThickness: 0 })

    expect(validateOpenGridOrganizerBoxParameters(value).valid).toBe(true)
    const layout = openGridOrganizerBoxLayoutFor(value)
    expect(layout.bodyHeight - value.holeDepth).toBe(2)
  })

  it('trades wall thickness for grid cells', () => {
    const thinWall = openGridOrganizerBoxLayoutFor(
      parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeDiameter: 20,
        wallThickness: 2,
      }),
    )
    expect(thinWall.gridCountX).toBe(1)
    expect(thinWall.gridCountY).toBe(1)
    expect(thinWall.footprint[0]).toBeCloseTo(27.85, 8)
    expect(thinWall.minimumFootprintSpan.x).toBeLessThanOrEqual(
      thinWall.footprint[0],
    )

    const boundaryWall = openGridOrganizerBoxLayoutFor(
      parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeDiameter: 20,
        wallThickness: 4,
      }),
    )
    expect(boundaryWall.gridCountX).toBe(1.5)

    const thickWall = openGridOrganizerBoxLayoutFor(
      parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeDiameter: 20,
        wallThickness: 4.5,
      }),
    )
    expect(thickWall.gridCountX).toBe(1.5)
    expect(thickWall.gridCountY).toBe(1.5)
    expect(thickWall.footprint[0]).toBeCloseTo(1.5 * 28 - 0.15, 8)
  })

  it('accepts the detachable interface with B-oriented four-corner sockets', () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      cornerSeatMode: 'detachable-corner-seat',
    })

    expect(validateOpenGridOrganizerBoxParameters(value)).toEqual({
      valid: true,
      value,
    })
    const poses = openGridOrganizerBoxDetachableSocketPosesFor(value)
    expect(poses).toHaveLength(4)
    expect(
      poses.map(({ corner, rotationDegrees }) => ({
        corner,
        rotationDegrees,
      })),
    ).toEqual([
      { corner: 'upper-left', rotationDegrees: 0 },
      { corner: 'upper-right', rotationDegrees: 90 },
      { corner: 'lower-right', rotationDegrees: 180 },
      { corner: 'lower-left', rotationDegrees: 270 },
    ])
    expect(boundsForOpenGridOrganizerBox(value).min[2]).toBe(0)
    expect(openGridOrganizerBoxFileName(value)).toContain(
      'seats-detachable-corner-seat',
    )
  })

  it('measures the cavity floor above the mode datum', () => {
    const value = parameters({
      holeDepth: 30,
      bottomThickness: 2,
      cornerSeatMode: 'detachable-corner-seat',
      boxMode: 'normal',
    })

    const layout = openGridOrganizerBoxLayoutFor(value)
    const cavityFloor = layout.bodyHeight - value.holeDepth
    const holderTop = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.depth

    expect(layout.interfaceFloorDatum).toBe(2)
    expect(cavityFloor - layout.interfaceFloorDatum).toBeCloseTo(
      value.bottomThickness,
      8,
    )
    expect(cavityFloor).toBeGreaterThan(holderTop)
  })

  it.each([
    ['normal', 'none'],
    ['normal', 'detachable-corner-seat'],
    ['normal', 'integrated'],
    ['stackable', 'none'],
    ['stackable', 'detachable-corner-seat'],
    ['stackable', 'integrated'],
  ] as const)(
    'keeps the %s/%s interfaces below the cavity floor',
    (boxMode, cornerSeatMode) => {
      const value = parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeDiameter: 10,
        holeDepth: 1,
        bottomThickness: 1,
        wallThickness: boxMode === 'stackable' ? 3 : 2,
        boxMode,
        cornerSeatMode,
      })
      const layout = openGridOrganizerBoxLayoutFor(value)
      const cavityFloor = layout.bodyHeight - value.holeDepth
      const interfaceTop = interfaceTopFor(boxMode, cornerSeatMode)

      expect(cavityFloor).toBeGreaterThan(interfaceTop)
      expect(layout.minimumFootprintSpan.x).toBeGreaterThan(
        layout.requiredSpan.x,
      )
      expect(layout.minimumFootprintSpan.y).toBeGreaterThan(
        layout.requiredSpan.y,
      )
    },
  )

  it('derives the cavity-floor datum from body mode alone', () => {
    const normalDetachable = openGridOrganizerBoxLayoutFor(
      parameters({
        boxMode: 'normal',
        cornerSeatMode: 'detachable-corner-seat',
      }),
    )
    const normalNone = openGridOrganizerBoxLayoutFor(
      parameters({ boxMode: 'normal', cornerSeatMode: 'none' }),
    )
    const normalIntegrated = openGridOrganizerBoxLayoutFor(
      parameters({ boxMode: 'normal', cornerSeatMode: 'integrated' }),
    )
    const stackableDetachable = openGridOrganizerBoxLayoutFor(
      parameters({
        boxMode: 'stackable',
        cornerSeatMode: 'detachable-corner-seat',
        wallThickness: 3,
      }),
    )

    expect(normalDetachable.interfaceFloorDatum).toBe(2)
    expect(normalNone.interfaceFloorDatum).toBe(2)
    expect(normalIntegrated.interfaceFloorDatum).toBe(2)
    expect(stackableDetachable.interfaceFloorDatum).toBe(5)
  })
})
