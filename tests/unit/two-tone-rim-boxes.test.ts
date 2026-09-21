import { describe, expect, it } from 'vitest'
import {
  isOpenGridDividerParameters,
  isOpenGridOpenConnectOrganizerParameters,
  openGridDividerThreeMfFileName,
  OPENGRID_DIVIDER_CONFIGURATION,
  openGridOpenConnectOrganizerThreeMfFileName,
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  openGridOrganizerBoxThreeMfFileName,
  normalizeOpenGridOrganizerBoxParameters,
  OPENGRID_ORGANIZER_BOX_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  openGridStackableBoxThreeMfFileName,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  validateOpenGridDividerParameters,
  validateOpenGridOpenConnectOrganizerParameters,
  validateOpenGridOrganizerBoxParameters,
  validateOpenGridStackableBoxParameters,
  type OpenGridDividerParameters,
  type OpenGridOpenConnectOrganizerParameters,
  type OpenGridOrganizerBoxParameters,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'
import {
  opengridDividerDefinition,
  opengridOpenConnectOrganizerDefinition,
  opengridOrganizerBoxDefinition,
  opengridStackableBoxDefinition,
} from '../../src/features/cad/model-catalog'
import type { ModelParameterValues } from '../../src/cad-contract/units'

function boxParametersWithoutRim(): Record<string, unknown> {
  const {
    topRimEnabled: _topRimEnabled,
    topRimHeight: _topRimHeight,
    ...rest
  } = OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS
  return { ...rest }
}

function boxParameters(
  overrides: Partial<OpenGridStackableBoxParameters> = {},
): OpenGridStackableBoxParameters {
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

function organizerParameters(
  overrides: Partial<OpenGridOrganizerBoxParameters> = {},
): OpenGridOrganizerBoxParameters {
  return {
    ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

function dividerParameters(
  overrides: Partial<OpenGridDividerParameters> = {},
): OpenGridDividerParameters {
  return {
    ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
    ...overrides,
  }
}

function dividerParametersWithoutRim(): Record<string, unknown> {
  const {
    topRimEnabled: _topRimEnabled,
    topRimHeight: _topRimHeight,
    ...rest
  } = dividerParameters()
  return rest
}

function openConnectOrganizerParameters(
  overrides: Partial<OpenGridOpenConnectOrganizerParameters> = {},
): OpenGridOpenConnectOrganizerParameters {
  return {
    ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

describe('two-tone rim contract parameters', () => {
  it('defaults the stackable box rim to disabled with a 2 mm height', () => {
    expect(OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.topRimEnabled).toBe(false)
    expect(OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.topRimHeight).toBe(2)
    const validation = validateOpenGridStackableBoxParameters(
      boxParametersWithoutRim(),
    )
    expect(validation).toMatchObject({
      valid: true,
      value: { topRimEnabled: false, topRimHeight: 2 },
    })
  })

  it('validates the stackable box rim height against the derived external top', () => {
    // Default: x=2,y=2,height=20 with stacking bottom (5 mm datum) and rail
    // (6.45 mm) => external top 31.45, so the bound is floor(31.45/2)=15.
    const valid = validateOpenGridStackableBoxParameters(
      boxParameters({ topRimEnabled: true, topRimHeight: 15 }),
    )
    expect(valid).toMatchObject({
      valid: true,
      value: { topRimEnabled: true, topRimHeight: 15 },
    })

    const tooHigh = validateOpenGridStackableBoxParameters(
      boxParameters({ topRimEnabled: true, topRimHeight: 16 }),
    )
    expect(tooHigh).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimHeight' }],
    })

    const tooLow = validateOpenGridStackableBoxParameters(
      boxParameters({ topRimEnabled: true, topRimHeight: 0 }),
    )
    expect(tooLow).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimHeight' }],
    })

    const nonInteger = validateOpenGridStackableBoxParameters(
      boxParameters({ topRimEnabled: true, topRimHeight: 1.5 }),
    )
    expect(nonInteger).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimHeight' }],
    })

    const nonBoolean = validateOpenGridStackableBoxParameters(
      boxParameters({ topRimEnabled: 1 as unknown as boolean }),
    )
    expect(nonBoolean).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimEnabled' }],
    })
  })

  it('builds the stackable box 3MF filename with the rim suffix only when enabled', () => {
    expect(
      openGridStackableBoxThreeMfFileName(
        boxParameters({ topRimEnabled: true, topRimHeight: 3 }),
      ),
    ).toContain('-rim3.3mf')
    expect(
      openGridStackableBoxThreeMfFileName(
        boxParameters({ topRimEnabled: false }),
      ),
    ).toBeNull()
  })

  it('defaults the organizer box rim to disabled with a 2 mm height', () => {
    expect(OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.topRimEnabled).toBe(false)
    expect(OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.topRimHeight).toBe(2)
    const validation = validateOpenGridOrganizerBoxParameters(
      organizerParameters(),
    )
    expect(validation).toMatchObject({
      valid: true,
      value: { topRimEnabled: false, topRimHeight: 2 },
    })
  })

  it('validates the organizer box rim height against the derived external top', () => {
    // Default normal mode: interfaceFloorDatum 2 + bottom 1 + depth 20 = 23 mm
    // body height, so the bound is floor(23/2)=11.
    const valid = validateOpenGridOrganizerBoxParameters(
      organizerParameters({ topRimEnabled: true, topRimHeight: 11 }),
    )
    expect(valid).toMatchObject({
      valid: true,
      value: { topRimEnabled: true, topRimHeight: 11 },
    })

    const tooHigh = validateOpenGridOrganizerBoxParameters(
      organizerParameters({ topRimEnabled: true, topRimHeight: 12 }),
    )
    expect(tooHigh).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimHeight' }],
    })

    const tooLow = validateOpenGridOrganizerBoxParameters(
      organizerParameters({ topRimEnabled: true, topRimHeight: 0 }),
    )
    expect(tooLow).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimHeight' }],
    })
  })

  it('builds the organizer box 3MF filename with the rim suffix only when enabled', () => {
    expect(
      openGridOrganizerBoxThreeMfFileName(
        organizerParameters({ topRimEnabled: true, topRimHeight: 4 }),
      ),
    ).toContain('-rim4.3mf')
    expect(
      openGridOrganizerBoxThreeMfFileName(
        organizerParameters({ topRimEnabled: false }),
      ),
    ).toBeNull()
  })

  it('rejects pre-rim canonical organizer box snapshots before normalization', () => {
    const {
      topRimEnabled: _topRimEnabled,
      topRimHeight: _topRimHeight,
      ...preRimDefaults
    } = OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS
    const validation = validateOpenGridOrganizerBoxParameters(preRimDefaults)
    expect(validation.valid).toBe(false)
  })

  it('normalizes pre-rim canonical organizer box snapshots with rim defaults', () => {
    const {
      topRimEnabled: _topRimEnabled,
      topRimHeight: _topRimHeight,
      ...preRimDefaults
    } = OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS
    const normalized = normalizeOpenGridOrganizerBoxParameters(preRimDefaults)
    expect(normalized).toMatchObject({
      topRimEnabled: false,
      topRimHeight: 2,
    })
    expect(validateOpenGridOrganizerBoxParameters(normalized)).toMatchObject({
      valid: true,
    })
  })

  it('defaults the divider rim to disabled with a 2 mm height', () => {
    const defaults = OPENGRID_DIVIDER_CONFIGURATION.defaultParameters
    expect(defaults.topRimEnabled).toBe(false)
    expect(defaults.topRimHeight).toBe(2)
    const validation = validateOpenGridDividerParameters(dividerParameters())
    expect(validation).toMatchObject({
      valid: true,
      value: { topRimEnabled: false, topRimHeight: 2 },
    })
  })

  it('validates the divider rim height against half the wall height', () => {
    const valid = validateOpenGridDividerParameters(
      dividerParameters({ height: 40, topRimEnabled: true, topRimHeight: 20 }),
    )
    expect(valid).toMatchObject({
      valid: true,
      value: { topRimEnabled: true, topRimHeight: 20 },
    })

    const tooHigh = validateOpenGridDividerParameters(
      dividerParameters({ height: 40, topRimEnabled: true, topRimHeight: 21 }),
    )
    expect(tooHigh).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimHeight' }],
    })

    const tooLow = validateOpenGridDividerParameters(
      dividerParameters({ height: 40, topRimEnabled: true, topRimHeight: 0 }),
    )
    expect(tooLow).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimHeight' }],
    })
  })

  it('builds the divider 3MF filename with the rim suffix only when enabled', () => {
    expect(
      openGridDividerThreeMfFileName(
        dividerParameters({ topRimEnabled: true, topRimHeight: 3 }),
      ),
    ).toContain('-rim3.3mf')
    expect(
      openGridDividerThreeMfFileName(
        dividerParameters({ topRimEnabled: false }),
      ),
    ).toBeNull()
  })

  it('defaults the OpenConnect organizer rim to disabled with a 2 mm height', () => {
    expect(
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.topRimEnabled,
    ).toBe(false)
    expect(OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.topRimHeight).toBe(
      2,
    )
    const validation = validateOpenGridOpenConnectOrganizerParameters(
      openConnectOrganizerParameters(),
    )
    expect(validation).toMatchObject({
      valid: true,
      value: { topRimEnabled: false, topRimHeight: 2 },
    })
  })

  it('validates the OpenConnect organizer rim height against half the body thickness', () => {
    // Default: holeDepth 28 + bottomThickness 1 = 29 mm body thickness, so
    // the bound is floor(29/2)=14.
    const valid = validateOpenGridOpenConnectOrganizerParameters(
      openConnectOrganizerParameters({
        topRimEnabled: true,
        topRimHeight: 14,
      }),
    )
    expect(valid).toMatchObject({
      valid: true,
      value: { topRimEnabled: true, topRimHeight: 14 },
    })

    const tooHigh = validateOpenGridOpenConnectOrganizerParameters(
      openConnectOrganizerParameters({
        topRimEnabled: true,
        topRimHeight: 15,
      }),
    )
    expect(tooHigh).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimHeight' }],
    })

    const tooLow = validateOpenGridOpenConnectOrganizerParameters(
      openConnectOrganizerParameters({ topRimEnabled: true, topRimHeight: 0 }),
    )
    expect(tooLow).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimHeight' }],
    })
  })

  it('builds the OpenConnect organizer 3MF filename with the rim suffix only when enabled', () => {
    expect(
      openGridOpenConnectOrganizerThreeMfFileName(
        openConnectOrganizerParameters({
          topRimEnabled: true,
          topRimHeight: 5,
        }),
      ),
    ).toContain('-rim5.3mf')
    expect(
      openGridOpenConnectOrganizerThreeMfFileName(
        openConnectOrganizerParameters({ topRimEnabled: false }),
      ),
    ).toBeNull()
    expect(
      isOpenGridOpenConnectOrganizerParameters(
        openConnectOrganizerParameters(),
      ),
    ).toBe(true)
  })

  it('accepts divider snapshots without the rim keys', () => {
    expect(isOpenGridDividerParameters(dividerParametersWithoutRim())).toBe(
      true,
    )
  })
})

describe('two-tone rim workspace raw parameters and catalog export names', () => {
  it('round-trips rim raw parameters for the stackable box', () => {
    const raw = rawFromParameters({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      topRimEnabled: true,
      topRimHeight: 5,
    })
    expect(raw.topRimEnabled).toBe('true')
    expect(raw.topRimHeight).toBe('5')
    expect(parseRawParameters(raw, 'opengrid-stackable-box')).toEqual({
      valid: true,
      value: expect.objectContaining({
        topRimEnabled: true,
        topRimHeight: 5,
      }),
    })
  })

  it('hydrates missing divider rim raw parameters with defaults', () => {
    const result = parseRawParameters(
      {
        left: '1',
        right: '0',
        up: '0',
        down: '0',
        height: '20',
        wallThickness: '2',
      },
      'opengrid-divider',
    )
    expect(result).toEqual({
      valid: true,
      value: expect.objectContaining({
        topRimEnabled: false,
        topRimHeight: 2,
      }),
    })
  })

  it('rejects out-of-range divider rim raw parameters', () => {
    const result = parseRawParameters(
      {
        left: '1',
        right: '0',
        up: '0',
        down: '0',
        height: '20',
        wallThickness: '2',
        topRimEnabled: 'true',
        topRimHeight: '11',
      },
      'opengrid-divider',
    )
    expect(result).toMatchObject({
      valid: false,
      field: 'topRimHeight',
    })
  })

  it('hydrates missing OpenConnect organizer rim raw parameters with defaults', () => {
    const {
      topRimEnabled: _enabled,
      topRimHeight: _height,
      ...preRim
    } = OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS
    const raw = rawFromParameters(preRim)
    const result = parseRawParameters(raw, 'opengrid-openconnect-organizer')
    expect(result).toEqual({
      valid: true,
      value: expect.objectContaining({
        topRimEnabled: false,
        topRimHeight: 2,
      }),
    })
  })

  it('reports threeMfFileName per container definition only with the rim enabled', () => {
    const catalog = {
      divider: opengridDividerDefinition,
      organizer: opengridOrganizerBoxDefinition,
      stackableBox: opengridStackableBoxDefinition,
      openConnectOrganizer: opengridOpenConnectOrganizerDefinition,
    }
    const enabledParameters: Record<string, ModelParameterValues> = {
      divider: {
        ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
        topRimEnabled: true,
        topRimHeight: 4,
      },
      organizer: {
        ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
        topRimEnabled: true,
        topRimHeight: 6,
      },
      stackableBox: {
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        topRimEnabled: true,
        topRimHeight: 7,
      },
      openConnectOrganizer: {
        ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
        topRimEnabled: true,
        topRimHeight: 3,
      },
    }
    const disabledParameters: Record<string, ModelParameterValues> = {
      divider: {
        ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
        topRimEnabled: false,
      },
      organizer: {
        ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
        topRimEnabled: false,
      },
      stackableBox: {
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        topRimEnabled: false,
      },
      openConnectOrganizer: {
        ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
        topRimEnabled: false,
      },
    }
    for (const key of Object.keys(catalog)) {
      const enabled = catalog[key as keyof typeof catalog].threeMfFileName?.(
        enabledParameters[key]!,
      )
      const disabled = catalog[key as keyof typeof catalog].threeMfFileName?.(
        disabledParameters[key]!,
      )
      expect(enabled).toMatch(/-rim\d+\.3mf$/)
      expect(disabled).toBeNull()
    }
  })
})

describe('rim height bound only applies while the rim is enabled', () => {
  it('accepts shallow OpenConnect organizer bodies with the hydrated default', () => {
    const validation = validateOpenGridOpenConnectOrganizerParameters(
      openConnectOrganizerParameters({
        holeDepth: 1,
        bottomThickness: 1,
        tiltAngle: 0,
        holeCountX: 1,
        holeCountY: 1,
        holeShape: 'square',
        holeDiameter: 1,
        edgeThickness: 0.72,
      }),
    )
    expect(validation).toMatchObject({
      valid: true,
      value: { topRimEnabled: false, topRimHeight: 2 },
    })
  })

  it('accepts an out-of-range divider height while the rim is disabled', () => {
    const validation = validateOpenGridDividerParameters(
      dividerParameters({ height: 4, topRimEnabled: false, topRimHeight: 2 }),
    )
    expect(validation).toMatchObject({ valid: true })
  })

  it('rejects an out-of-range divider height once the rim is enabled', () => {
    const validation = validateOpenGridDividerParameters(
      dividerParameters({ height: 3, topRimEnabled: true, topRimHeight: 2 }),
    )
    expect(validation).toMatchObject({
      valid: false,
      issues: [{ field: 'topRimHeight' }],
    })
  })
})
