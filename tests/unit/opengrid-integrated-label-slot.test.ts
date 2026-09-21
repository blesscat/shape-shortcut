import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridLabelCard,
  OPENGRID_LABEL_CARD_CONFIGURATION,
  validateOpenGridLabelCardParameters,
} from '../../src/cad-contract/units/opengrid-label-card'
import {
  boundsForOpenGridOpenConnectOrganizer,
  openGridOpenConnectOrganizerFileName,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  validateOpenGridOpenConnectOrganizerParameters,
} from '../../src/cad-contract/units/opengrid-openconnect-organizer'

const organizer = OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS
const card = OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters

describe('integrated label units and front fit', () => {
  it.each([1, 3, 5, 10])(
    'makes a %i-unit card with unchanged height and thickness',
    (gridUnits) => {
      const validation = validateOpenGridLabelCardParameters({
        ...card,
        gridUnits,
      })
      expect(validation.valid).toBe(true)
      if (!validation.valid) throw new Error('card rejected')
      const bounds = boundsForOpenGridLabelCard(validation.value)
      expect(bounds.max[0] - bounds.min[0]).toBe(gridUnits * 10)
      expect(bounds.max[1] - bounds.min[1]).toBe(
        OPENGRID_LABEL_CARD_CONFIGURATION.cardHeight,
      )
    },
  )

  it('normalizes legacy card widths and rejects conflicting width controls', () => {
    expect(
      validateOpenGridLabelCardParameters({
        widthTier: 30,
        style: 'flat',
        icon: 'wrench',
      }),
    ).toMatchObject({
      valid: true,
      value: { gridUnits: 3, style: 'flat', icon: 'wrench' },
    })
    expect(
      validateOpenGridLabelCardParameters({ widthTier: 30, gridUnits: 3 })
        .valid,
    ).toBe(false)
    for (const gridUnits of [0, 1.5, 50, Infinity, '3', null, undefined]) {
      expect(
        validateOpenGridLabelCardParameters({ ...card, gridUnits }).valid,
      ).toBe(false)
    }
  })

  it('rejects text that cannot fit a narrow card instead of changing its width', () => {
    expect(
      validateOpenGridLabelCardParameters({
        ...card,
        gridUnits: 1,
        text: 'ABCDEF',
      }),
    ).toMatchObject({ valid: false, issues: [{ field: 'text' }] })
    expect(
      validateOpenGridLabelCardParameters({
        ...card,
        gridUnits: 6,
        text: 'ABCDEF',
      }).valid,
    ).toBe(true)
  })

  it('adds label defaults to a fully legacy organizer without losing dimensions', () => {
    const legacy: Record<string, unknown> = { ...organizer, tiltAngle: 25 }
    delete legacy.labelSlotEnabled
    delete legacy.labelGridUnits
    expect(
      validateOpenGridOpenConnectOrganizerParameters(legacy),
    ).toMatchObject({
      valid: true,
      value: { tiltAngle: 25, labelSlotEnabled: false, labelGridUnits: 3 },
    })
    expect(
      validateOpenGridOpenConnectOrganizerParameters({
        ...legacy,
        labelSlotEnabled: true,
      }).valid,
    ).toBe(false)
  })

  it('accepts three units but rejects four on the default flat front', () => {
    expect(
      validateOpenGridOpenConnectOrganizerParameters({
        ...organizer,
        labelSlotEnabled: true,
        labelGridUnits: 3,
      }).valid,
    ).toBe(true)
    expect(
      validateOpenGridOpenConnectOrganizerParameters({
        ...organizer,
        labelSlotEnabled: true,
        labelGridUnits: 4,
      }),
    ).toMatchObject({ valid: false, issues: [{ field: 'labelGridUnits' }] })
  })

  it('checks height only while enabled and rejects malformed label controls', () => {
    const shallow = {
      ...organizer,
      holeDepth: 2,
      labelSlotEnabled: true,
      labelGridUnits: 1,
    }
    expect(validateOpenGridOpenConnectOrganizerParameters(shallow).valid).toBe(
      false,
    )
    expect(
      validateOpenGridOpenConnectOrganizerParameters({
        ...shallow,
        labelSlotEnabled: false,
      }).valid,
    ).toBe(true)
    expect(
      validateOpenGridOpenConnectOrganizerParameters({
        ...organizer,
        labelSlotEnabled: 'false',
        labelGridUnits: 1,
      }).valid,
    ).toBe(false)
  })

  it('extends only the outward print extent and names the enabled slot', () => {
    const disabled = {
      ...organizer,
      labelSlotEnabled: false,
      labelGridUnits: 3,
    }
    const enabled = { ...disabled, labelSlotEnabled: true }
    const oldBounds = boundsForOpenGridOpenConnectOrganizer(disabled)
    const newBounds = boundsForOpenGridOpenConnectOrganizer(enabled)
    expect(newBounds.min[1]).toBeLessThan(oldBounds.min[1])
    expect(newBounds.min[2]).toBe(oldBounds.min[2])
    expect(newBounds.max).toEqual(oldBounds.max)
    expect(openGridOpenConnectOrganizerFileName(enabled)).toContain('label3')
    expect(openGridOpenConnectOrganizerFileName(disabled)).not.toContain(
      'label',
    )
  })
})

describe('label workspace round trips', () => {
  it('round-trips slot controls and rejects invalid raw values', async () => {
    const { rawFromParameters, parseRawParameters } =
      await import('../../src/components/cad/workspace/validation')
    const parameters = {
      ...organizer,
      labelSlotEnabled: true,
      labelGridUnits: 3,
    }
    const raw = rawFromParameters(parameters)
    expect(raw.labelSlotEnabled).toBe('true')
    expect(raw.labelGridUnits).toBe('3')
    expect(
      parseRawParameters(raw, 'opengrid-openconnect-organizer'),
    ).toMatchObject({ valid: true, value: parameters })
    expect(
      parseRawParameters(
        { ...raw, labelSlotEnabled: 'yes' },
        'opengrid-openconnect-organizer',
      ).valid,
    ).toBe(false)
    expect(
      parseRawParameters(
        { ...raw, labelGridUnits: '4' },
        'opengrid-openconnect-organizer',
      ).valid,
    ).toBe(false)
  })

  it.each([
    { gridUnits: '3', widthTier: '40' },
    { widthTier: '30' },
    { gridUnits: '3', unexpected: '1' },
  ])('rejects unsupported raw card keys: %j', async (raw) => {
    const { parseRawParameters } =
      await import('../../src/components/cad/workspace/validation')
    expect(parseRawParameters(raw, 'opengrid-label-card').valid).toBe(false)
  })

  it('round-trips card grid units without restoring the width tiers', async () => {
    const { rawFromParameters, parseRawParameters } =
      await import('../../src/components/cad/workspace/validation')
    const parameters = { ...card, gridUnits: 5 }
    const raw = rawFromParameters(parameters)
    expect(raw.gridUnits).toBe('5')
    expect(raw).not.toHaveProperty('widthTier')
    expect(parseRawParameters(raw, 'opengrid-label-card')).toMatchObject({
      valid: true,
      value: { gridUnits: 5 },
    })
  })
})
