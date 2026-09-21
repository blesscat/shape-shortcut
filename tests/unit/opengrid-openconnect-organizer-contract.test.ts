import { OPENCONNECT_ALIGNMENT_DEFAULTS } from '../../src/cad-contract/units/openconnect-alignment'
import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridOpenConnectOrganizer,
  installedBoundsForOpenGridOpenConnectOrganizer,
  openGridOpenConnectOrganizerCavityEnvelopeFor,
  openGridOpenConnectOrganizerFileName,
  openGridOpenConnectOrganizerLayoutFor,
  openGridOpenConnectOrganizerSlotOriginsFor,
  openGridOpenConnectOrganizerStlFileName,
  openGridOpenConnectOrganizerTiltAxisFor,
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  validateOpenGridOpenConnectOrganizerParameters,
  type OpenGridOpenConnectOrganizerParameters,
} from '../../src/cad-contract/units/opengrid-openconnect-organizer'

function parameters(
  overrides: Partial<OpenGridOpenConnectOrganizerParameters> = {},
): OpenGridOpenConnectOrganizerParameters {
  return {
    ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

describe('OpenGrid OpenConnect organizer contract', () => {
  it('accepts the exact typed defaults', () => {
    const value = parameters()

    expect(value).toEqual({
      ...OPENCONNECT_ALIGNMENT_DEFAULTS,
      holeCountX: 2,
      holeCountY: 2,
      holeSpacingMode: 'linked',
      holeSpacingX: 1,
      holeSpacingY: 1,
      holeShape: 'circle',
      holeDiameter: 20,
      holeWidth: 20,
      holeHeight: 20,
      holeCornerRadius: 0,
      holeDepth: 28,
      bottomThickness: 1,
      edgeThickness: 1,
      tiltAngle: 15,
    })
    expect(validateOpenGridOpenConnectOrganizerParameters(value)).toEqual({
      valid: true,
      value,
    })
  })

  it.each([
    'circle',
    'triangle',
    'square',
    'pentagon',
    'hexagon',
    'rectangle',
    'ellipse',
  ] as const)('accepts the %s cavity shape', (holeShape) => {
    expect(
      validateOpenGridOpenConnectOrganizerParameters(parameters({ holeShape }))
        .valid,
    ).toBe(true)
  })

  it('uses an inscribed diameter and fixed polygon orientation', () => {
    const square = openGridOpenConnectOrganizerCavityEnvelopeFor({
      shape: 'square',
      diameter: 10,
      width: 20,
      height: 20,
    })
    const hexagon = openGridOpenConnectOrganizerCavityEnvelopeFor({
      shape: 'hexagon',
      diameter: 10,
      width: 20,
      height: 20,
    })

    expect(square.x).toBeCloseTo(10, 8)
    expect(square.y).toBeCloseTo(10, 8)
    expect(hexagon.x).toBeGreaterThan(10)
    expect(hexagon.y).toBeCloseTo(10, 8)
  })

  it('uses the requested width and height as the exact rectangle/ellipse envelope', () => {
    for (const holeShape of ['rectangle', 'ellipse'] as const) {
      const envelope = openGridOpenConnectOrganizerCavityEnvelopeFor({
        shape: holeShape,
        diameter: 20,
        width: 30,
        height: 20,
      })

      expect(envelope.x).toBe(30)
      expect(envelope.y).toBe(20)
    }
  })

  it('keeps the corner radius inside the rectangle envelope', () => {
    const layout = openGridOpenConnectOrganizerLayoutFor(
      parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeShape: 'rectangle',
        holeWidth: 30,
        holeHeight: 20,
        holeCornerRadius: 2,
        holeSpacingMode: 'independent',
        holeSpacingX: 2,
        holeSpacingY: 4,
      }),
    )

    expect(layout.cavityEnvelope).toEqual({ x: 30, y: 20 })
    expect(layout.requiredSpan).toEqual({ x: 30, y: 20 })
    expect(layout.cavityPitch).toEqual([32, 24])
  })

  it('rejects corner radii outside 0..min(width, height) / 2 for every shape', () => {
    const invalid = [
      {
        value: parameters({ holeShape: 'rectangle', holeCornerRadius: -0.5 }),
        field: 'holeCornerRadius',
      },
      {
        value: parameters({
          holeShape: 'rectangle',
          holeWidth: 30,
          holeHeight: 20,
          holeCornerRadius: 10.5,
        }),
        field: 'holeCornerRadius',
      },
      {
        value: parameters({
          holeShape: 'circle',
          holeWidth: 30,
          holeHeight: 20,
          holeCornerRadius: 11,
        }),
        field: 'holeCornerRadius',
      },
      {
        value: parameters({
          holeShape: 'ellipse',
          holeCornerRadius: Number.NaN,
        }),
        field: 'holeCornerRadius',
      },
      {
        value: parameters({ holeShape: 'rectangle', holeWidth: 0.5 }),
        field: 'holeWidth',
      },
      {
        value: parameters({ holeShape: 'rectangle', holeHeight: 301 }),
        field: 'holeHeight',
      },
    ] as const

    for (const { value, field } of invalid) {
      const validation = validateOpenGridOpenConnectOrganizerParameters(value)
      expect(validation.valid).toBe(false)
      if (!validation.valid) {
        expect(validation.issues.map(({ field }) => field)).toContain(field)
      }
    }
    expect(
      validateOpenGridOpenConnectOrganizerParameters(
        parameters({
          holeShape: 'rectangle',
          holeWidth: 30,
          holeHeight: 20,
          holeCornerRadius: 10,
        }),
      ).valid,
    ).toBe(true)
  })

  it('centers cavities using outer-envelope spacing', () => {
    const layout = openGridOpenConnectOrganizerLayoutFor(
      parameters({
        holeCountX: 3,
        holeCountY: 2,
        holeSpacingMode: 'independent',
        holeSpacingX: 2,
        holeSpacingY: 4,
        holeDiameter: 10,
      }),
    )

    expect(layout.cavityCenters).toEqual([
      [-12, -7],
      [-12, 7],
      [0, -7],
      [0, 7],
      [12, -7],
      [12, 7],
    ])
    expect(layout.requiredSpan).toEqual({ x: 34, y: 24 })
    expect(layout.bodyDepth).toBe(26)
  })

  it('uses the selected edge on local X/Y while preserving the 28 mm width minimum', () => {
    const layout = openGridOpenConnectOrganizerLayoutFor(
      parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeDiameter: 10,
        edgeThickness: 0.4,
      }),
    )

    expect(layout.requiredSpan).toEqual({ x: 10, y: 10 })
    expect(layout.bodyWidth).toBe(28)
    expect(layout.bodyDepth).toBeCloseTo(10.8, 10)
    expect(
      (layout.bodyWidth - layout.requiredSpan.x) / 2,
    ).toBeGreaterThanOrEqual(0.4)
    expect((layout.bodyDepth - layout.requiredSpan.y) / 2).toBeCloseTo(0.4, 10)
  })

  it('uses R2.5 front corners and safely clamps thinner selected edges', () => {
    const standard = openGridOpenConnectOrganizerLayoutFor(parameters())
    const thinEdge = openGridOpenConnectOrganizerLayoutFor(
      parameters({ edgeThickness: 0.4 }),
    )

    expect(standard.frontCornerRadius).toBe(2.5)
    expect(thinEdge.frontCornerRadius).toBeCloseTo(0.4 * (2 + Math.SQRT2), 10)
  })

  it('keeps a non-degenerate straight side before shallow-body rear corners', () => {
    const layout = openGridOpenConnectOrganizerLayoutFor(
      parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeShape: 'square',
        holeDiameter: 1,
        holeDepth: 1,
        bottomThickness: 1,
        edgeThickness: 0.72,
        tiltAngle: 0,
      }),
    )

    expect(layout.bodyDepth).toBe(2.44)
    expect(layout.bodyDepth - layout.frontCornerRadius).toBeCloseTo(0.05, 10)
  })

  it('keeps the default body continuous with one centered, top-aligned socket', () => {
    const value = parameters()
    const layout = openGridOpenConnectOrganizerLayoutFor(value)
    const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION

    expect(layout.bodyThickness).toBe(29)
    expect(layout.bodyWidth).toBe(43)
    expect(layout.bodyDepth).toBe(43)
    expect(layout.connectorColumns).toBe(1)
    expect(layout.connectorRows).toBe(1)
    expect(layout.rearInterfaceWidth).toBe(43)
    expect(layout.rearInterfaceHeight).toBe(29)
    expect(openGridOpenConnectOrganizerSlotOriginsFor(value)).toEqual([
      [0, configuration.rearThickness, 15],
    ])
  })

  it('uses completed 28 mm spans and grows the second connector at 56 mm', () => {
    const layoutForWidth = (bodyWidth: number) =>
      openGridOpenConnectOrganizerLayoutFor(
        parameters({
          holeCountX: 1,
          holeCountY: 1,
          holeDiameter: bodyWidth - 8,
          edgeThickness: 4,
        }),
      )
    const layoutForHeight = (bodyThickness: number) =>
      openGridOpenConnectOrganizerLayoutFor(
        parameters({
          holeCountX: 1,
          holeCountY: 1,
          holeDepth: bodyThickness,
          bottomThickness: 0,
        }),
      )

    expect(layoutForWidth(28)).toMatchObject({
      bodyWidth: 28,
      connectorColumns: 1,
      rearInterfaceWidth: 28,
    })
    expect(layoutForWidth(55)).toMatchObject({
      bodyWidth: 55,
      connectorColumns: 1,
      rearInterfaceWidth: 55,
    })
    expect(layoutForWidth(55.9999999995)).toMatchObject({
      bodyWidth: 55.9999999995,
      connectorColumns: 1,
      rearInterfaceWidth: 55.9999999995,
    })
    expect(layoutForWidth(56)).toMatchObject({
      bodyWidth: 56,
      connectorColumns: 2,
      rearInterfaceWidth: 56,
    })
    expect(layoutForHeight(28)).toMatchObject({
      connectorRows: 1,
      rearInterfaceHeight: 28,
    })
    expect(layoutForHeight(55)).toMatchObject({
      connectorRows: 1,
      rearInterfaceHeight: 55,
    })
    expect(layoutForHeight(55.9999999995)).toMatchObject({
      connectorRows: 1,
      rearInterfaceHeight: 55.9999999995,
    })
    expect(layoutForHeight(56)).toMatchObject({
      connectorRows: 2,
      rearInterfaceHeight: 56,
    })
  })

  it('centers columns and aligns rows to the interface top', () => {
    const horizontal = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDiameter: 48,
      edgeThickness: 4,
    })
    const vertical = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDepth: 66,
      bottomThickness: 0,
    })
    const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION

    expect(openGridOpenConnectOrganizerSlotOriginsFor(horizontal)).toEqual([
      [-14, configuration.rearThickness, 15],
      [14, configuration.rearThickness, 15],
    ])
    expect(openGridOpenConnectOrganizerSlotOriginsFor(vertical)).toEqual([
      [0, configuration.rearThickness, 52],
      [0, configuration.rearThickness, 24],
    ])
  })

  it('tilts every floor-to-opening axis toward the user', () => {
    expect(openGridOpenConnectOrganizerTiltAxisFor(0)).toEqual([0, -0, 1])

    const axis = openGridOpenConnectOrganizerTiltAxisFor(30)
    expect(axis[0]).toBe(0)
    expect(axis[1]).toBeCloseTo(-0.5, 10)
    expect(axis[2]).toBeCloseTo(Math.sqrt(3) / 2, 10)
    expect(Math.hypot(...axis)).toBeCloseTo(1, 10)
  })

  it('enforces linked spacing, exact keys, ranges, and whole-degree tilt', () => {
    const invalid = [
      parameters({ holeSpacingY: 3 }),
      parameters({ holeShape: 'octagon' as never }),
      parameters({ holeCountX: 1.5 }),
      parameters({ holeDiameter: Number.NaN }),
      parameters({ holeDepth: 0 }),
      parameters({ bottomThickness: -0.1 }),
      parameters({ edgeThickness: 0.39 }),
      parameters({ tiltAngle: 45.5 }),
      parameters({ tiltAngle: 13.5 }),
      parameters({ tiltAngle: 13.0000000005 }),
      { ...parameters(), extra: true },
    ]

    for (const value of invalid) {
      expect(validateOpenGridOpenConnectOrganizerParameters(value).valid).toBe(
        false,
      )
    }
    expect(
      validateOpenGridOpenConnectOrganizerParameters(
        parameters({
          bottomThickness: 0,
          edgeThickness: 0.4,
          tiltAngle: 13,
        }),
      ).valid,
    ).toBe(true)
  })

  it('rejects layouts outside the 500 mm workspace', () => {
    const validation = validateOpenGridOpenConnectOrganizerParameters(
      parameters({
        holeCountX: 20,
        holeCountY: 20,
        holeSpacingMode: 'independent',
        holeSpacingX: 300,
        holeSpacingY: 300,
        holeShape: 'rectangle',
        holeWidth: 300,
        holeHeight: 300,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues.map(({ field }) => field)).toContain(
        'parameters',
      )
    }
  })

  it('rejects an installed wall interface above the 500 mm workspace limit', () => {
    const validation = validateOpenGridOpenConnectOrganizerParameters(
      parameters({
        holeCountX: 1,
        holeCountY: 2,
        holeDiameter: 20,
        holeDepth: 470,
        bottomThickness: 1,
        tiltAngle: 45,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues).toContainEqual(
        expect.objectContaining({ field: 'parameters' }),
      )
    }
  })

  it('reports deterministic print bounds and geometry-complete filenames', () => {
    const value = parameters({
      holeSpacingMode: 'independent',
      holeSpacingX: 2.5,
      holeSpacingY: 4,
      holeShape: 'pentagon',
      holeDiameter: 18,
      holeDepth: 30,
      bottomThickness: 3,
      edgeThickness: 4.5,
      tiltAngle: 22,
    })
    const bounds = boundsForOpenGridOpenConnectOrganizer(value)
    const installedBounds =
      installedBoundsForOpenGridOpenConnectOrganizer(value)
    const step = openGridOpenConnectOrganizerFileName(value)
    const stl = openGridOpenConnectOrganizerStlFileName(value)

    expect(bounds.min[0]).toBeCloseTo(-bounds.max[0], 8)
    expect(bounds.min[2]).toBeCloseTo(0, 8)
    expect(bounds.max[2]).toBeGreaterThan(value.holeDepth)
    expect(installedBounds.max[1]).toBeCloseTo(
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.rearThickness,
      8,
    )
    expect(installedBounds.max[2]).toBeGreaterThan(0)
    for (const token of [
      'opengrid-openconnect-organizer',
      'x2',
      'y2',
      'sm-independent',
      'sx2.5',
      'sy4',
      'pentagon',
      'd18',
      'h30',
      'b3',
      'e4.5',
      'a22',
    ]) {
      expect(step).toContain(token)
    }
    expect(step.endsWith('.step')).toBe(true)
    expect(stl).toBe(step.replace(/\.step$/, '.stl'))
  })

  it('names exports with shape-specific width/height/radius tokens', () => {
    const rectangle = openGridOpenConnectOrganizerFileName(
      parameters({
        holeShape: 'rectangle',
        holeWidth: 30,
        holeHeight: 20,
        holeCornerRadius: 2.5,
      }),
    )
    const ellipse = openGridOpenConnectOrganizerFileName(
      parameters({
        holeShape: 'ellipse',
        holeWidth: 30,
        holeHeight: 20,
      }),
    )

    expect(rectangle).toContain('rectangle-w30-h20-r2.5')
    expect(rectangle).not.toMatch(/(^|-)d\d/)
    expect(ellipse).toContain('ellipse-w30-h20')
    expect(ellipse).not.toMatch(/(^|-)d\d/)
    expect(rectangle).toContain('h28')
  })
})
