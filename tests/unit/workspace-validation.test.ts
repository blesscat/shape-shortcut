import { describe, expect, it } from 'vitest'
import type {
  BoxParameters,
  HexagonalColumnParameters,
  HswCellParameters,
  OpenGridDividerParameters,
  OpenGridStackableBoxParameters,
  OpenGridStackableCylinderParameters,
  OpenGridSnapParameters,
  PillarParameters,
} from '../../src/cad-contract/units'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'
import type { RawParameters } from '../../src/components/cad/workspace/types'

describe('CAD workspace validation helpers', () => {
  it('converts committed parameters to editable raw values and back', () => {
    const parameters: BoxParameters = { width: 20, depth: 30, height: 40 }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({ width: '20', depth: '30', height: '40' })
    expect(parseRawParameters(raw)).toEqual({ valid: true, value: parameters })
  })

  it('returns the first invalid dimension field and its user-facing message', () => {
    expect(
      parseRawParameters({ width: '20.5', depth: '30', height: '40' }),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'width',
    })
  })

  it('parses HSW slider snapshots as rows and columns', () => {
    const parameters: HswCellParameters = { rows: 2, columns: 3 }
    const raw = rawFromParameters(parameters)

    expect(parseRawParameters(raw, 'hsw-cell')).toEqual({
      valid: true,
      value: parameters,
    })
  })

  it('keeps contract validation for malformed external HSW snapshots', () => {
    expect(
      parseRawParameters({ rows: '0', columns: '21' }, 'hsw-cell'),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'rows',
      params: { min: 1, max: 20, unit: 'count' },
    })
    expect(
      parseRawParameters({ rows: '2.5', columns: '3' }, 'hsw-cell'),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'rows',
    })
    expect(
      parseRawParameters(
        { rows: '2', columns: '3', width: '20' } as RawParameters,
        'hsw-cell',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
    })
  })

  it('parses the independent hexagonal-column inputs and defaults', () => {
    const parameters: HexagonalColumnParameters = {
      height: 8,
      count: 1,
      gap: 1,
      orientation: 'lying',
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      height: '8',
      count: '1',
      gap: '1',
      orientation: 'lying',
    })
    expect(parseRawParameters(raw, 'hexagonal-column')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        { height: '8', count: '1', gap: '1' },
        'hexagonal-column',
      ),
    ).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        { height: '8.5', count: '1', gap: '1' },
        'hexagonal-column',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'height',
    })
  })

  it('parses decimal OpenGrid Snap offsets without accepting board fields', () => {
    const parameters: OpenGridSnapParameters = {
      variant: 'Lite',
      profile: 'Standard',
      offset: 0.2,
      footprint: 'half',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      variant: 'Lite',
      profile: 'Standard',
      offset: '0.2',
      footprint: 'half',
      fourCornerLocatingHoles: 'false',
      centerRemoverHole: 'false',
      magnetHoleShape: 'none',
      magnetHoleLength: '0',
      magnetHoleWidth: '0',
      magnetHoleDiameter: '0',
      magnetHoleThickness: '0',
    })
    expect(parseRawParameters(raw, 'opengrid-snap')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        {
          variant: 'Lite',
          offset: '0.2',
          rows: '2',
        } as RawParameters,
        'opengrid-snap',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
    })
    expect(
      parseRawParameters({ variant: 'Lite', offset: '' }, 'opengrid-snap'),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'offset',
    })
    expect(
      parseRawParameters({ variant: 'Lite', offset: '0.03' }, 'opengrid-snap'),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'offset',
    })
    expect(
      parseRawParameters({ variant: 'Lite', offset: '0.2' }, 'opengrid-snap'),
    ).toEqual({
      valid: true,
      value: {
        variant: 'Lite',
        profile: 'Standard',
        offset: 0.2,
        footprint: 'full',
        fourCornerLocatingHoles: false,
        centerRemoverHole: false,
        magnetHoleShape: 'none',
        magnetHoleLength: 0,
        magnetHoleWidth: 0,
        magnetHoleDiameter: 0,
        magnetHoleThickness: 0,
      },
    })
    expect(
      parseRawParameters(
        {
          variant: 'Lite',
          profile: 'Other',
          offset: '0.2',
        },
        'opengrid-snap',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'profile',
    })
    expect(
      parseRawParameters(
        {
          variant: 'Lite',
          offset: '0.2',
          fourCornerLocatingHoles: 'yes',
        },
        'opengrid-snap',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'fourCornerLocatingHoles',
    })
  })

  it('round-trips OpenGrid stackable-box half-cell inputs', () => {
    const parameters: OpenGridStackableBoxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 0.5,
      y: 1.5,
      height: 25,
      cornerSeatMode: 'hole',
      fullBottomHoleGrid: true,
      basePlateMode: false,
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      x: '0.5',
      y: '1.5',
      height: '25',
      cornerSeatMode: 'hole',
      fullBottomHoleGrid: 'true',
      basePlateMode: 'false',
      honeycombMode: 'false',
      thinShellMode: 'false',
      openingPlusXDepth: '0',
      openingPlusXBottomLength: '1',
      openingPlusXAngle: '90',
      openingMinusXDepth: '0',
      openingMinusXBottomLength: '1',
      openingMinusXAngle: '90',
      openingPlusYDepth: '0',
      openingPlusYBottomLength: '1',
      openingPlusYAngle: '90',
      openingMinusYDepth: '0',
      openingMinusYBottomLength: '1',
      openingMinusYAngle: '90',
    })
    expect(parseRawParameters(raw, 'opengrid-stackable-box')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        {
          x: '0.5',
          y: '1.5',
          height: '25',
          cornerSeatMode: 'hole',
          fullBottomHoleGrid: 'true',
          basePlateMode: 'false',
        },
        'opengrid-stackable-box',
      ),
    ).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        {
          x: '0.25',
          y: '1',
          height: '25',
          cornerSeatMode: 'hole',
          fullBottomHoleGrid: 'true',
          basePlateMode: 'false',
        },
        'opengrid-stackable-box',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'x',
    })
  })

  it('round-trips the shared honeycomb checkbox for both stackable boxes', () => {
    const box = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      honeycombMode: true,
    }
    const cylinder = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      honeycombMode: true,
    }

    expect(rawFromParameters(box).honeycombMode).toBe('true')
    expect(
      parseRawParameters(rawFromParameters(box), 'opengrid-stackable-box'),
    ).toEqual({
      valid: true,
      value: box,
    })
    expect(rawFromParameters(cylinder).honeycombMode).toBe('true')
    expect(
      parseRawParameters(
        rawFromParameters(cylinder),
        'opengrid-stackable-cylinder',
      ),
    ).toEqual({ valid: true, value: cylinder })
  })

  it('round-trips the mutually exclusive thin-shell mode flag', () => {
    const parameters: OpenGridStackableBoxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      thinShellMode: true,
      basePlateMode: false,
    }
    const raw = rawFromParameters(parameters)

    expect(raw.thinShellMode).toBe('true')
    expect(parseRawParameters(raw, 'opengrid-stackable-box')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        { ...raw, basePlateMode: 'true' },
        'opengrid-stackable-box',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'thinShellMode',
    })
  })

  it('round-trips independent divider arm counts and height', () => {
    const parameters: OpenGridDividerParameters = {
      left: 1,
      right: 1,
      up: 1.5,
      down: 0,
      height: 20,
      wallThickness: 2,
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      left: '1',
      right: '1',
      up: '1.5',
      down: '0',
      height: '20',
      wallThickness: '2',
    })
    expect(parseRawParameters(raw, 'opengrid-divider')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        {
          left: '1',
          right: '0',
          up: '0',
          down: '0',
          height: '20',
          wallThickness: '2',
        },
        'opengrid-divider',
      ),
    ).toEqual({
      valid: true,
      value: {
        left: 1,
        right: 0,
        up: 0,
        down: 0,
        height: 20,
        wallThickness: 2,
      },
    })
    expect(
      parseRawParameters(
        {
          left: '1.25',
          right: '1',
          up: '0',
          down: '0',
          height: '20',
          wallThickness: '2',
        },
        'opengrid-divider',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'left',
    })
  })

  it('round-trips the typed pillar mode radio value', () => {
    const parameters: PillarParameters = {
      mode: 'thin-shell',
      offset: 0.15,
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      mode: 'thin-shell',
      offset: '0.15',
    })
    expect(parseRawParameters(raw, 'opengrid-pillar')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(parseRawParameters({ mode: 'legacy' }, 'opengrid-pillar')).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'mode',
    })
    expect(parseRawParameters({}, 'opengrid-pillar')).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'mode',
    })
  })

  it('round-trips the custom-length positioning pillar mode', () => {
    const parameters: PillarParameters = {
      mode: 'positioning',
      length: 25,
      offset: 0.05,
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      mode: 'positioning',
      length: '25',
      offset: '0.05',
    })
    expect(parseRawParameters(raw, 'opengrid-pillar')).toEqual({
      valid: true,
      value: parameters,
    })
  })

  it('rejects pillar offsets that are outside the range or step', () => {
    expect(
      parseRawParameters(
        { mode: 'standard', offset: '0.03' },
        'opengrid-pillar',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'offset',
    })
    expect(
      parseRawParameters(
        { mode: 'standard', offset: '0.55' },
        'opengrid-pillar',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'offset',
    })
  })

  it('round-trips OpenGrid stackable-cylinder integer inputs', () => {
    const parameters: OpenGridStackableCylinderParameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 56,
      height: 30,
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
    const raw = rawFromParameters(parameters)

    expect(parseRawParameters(raw, 'opengrid-stackable-cylinder')).toEqual({
      valid: true,
      value: parameters,
    })
    const legacyParameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 56,
      height: 30,
    }
    expect(
      parseRawParameters(
        { diameter: '56', height: '30' },
        'opengrid-stackable-cylinder',
      ),
    ).toEqual({
      valid: true,
      value: legacyParameters,
    })
    expect(
      parseRawParameters(
        {
          diameter: '56.5',
          height: '30',
          thinBottomMode: 'false',
          bottomSeatMode: 'hole',
        },
        'opengrid-stackable-cylinder',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'diameter',
    })
  })

  it('round-trips the cylinder-only center-hook value and rejects it for Box', () => {
    const parameters: OpenGridStackableCylinderParameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      bottomSeatMode: 'center-hook',
    }
    const raw = rawFromParameters(parameters)

    expect(raw.bottomSeatMode).toBe('center-hook')
    expect(parseRawParameters(raw, 'opengrid-stackable-cylinder')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        {
          x: '2',
          y: '2',
          height: '20',
          cornerSeatMode: 'center-hook',
          fullBottomHoleGrid: 'false',
          basePlateMode: 'false',
        },
        'opengrid-stackable-box',
      ),
    ).toEqual({
      valid: false,
      messageId: 'validation.invalid',
      field: 'cornerSeatMode',
    })
  })
})
