import { describe, expect, it } from 'vitest'
import {
  COMPONENT_PARAMETER_STORAGE_KEY,
  createComponentParameterStore,
} from '../../src/features/cad/parameters'
import { translate } from '../../src/i18n'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'
import { parametersForRange } from '../../src/components/cad/component-panels/opengrid-stackable-box/stackable-box-panel-logic'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  openGridStackableBoxFileName,
  openGridStackableBoxLabelMaxUnitsFor,
  openGridStackableBoxStlFileName,
  validateModelParameters,
  validateOpenGridStackableBoxParameters,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import {
  OPENGRID_LABEL_SNAP_BUMP_HEIGHTS,
  OPENGRID_LABEL_SNAP_FITS,
  openGridLabelLedgeLayoutFor,
  openGridLabelLedgeSlopePoint,
} from '../../src/cad-contract/units/opengrid-label-ledge'
import {
  boundsForOpenGridLabelLedgeTest,
  OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION,
  openGridLabelLedgeTestFileName,
  openGridLabelLedgeTestStlFileName,
  validateOpenGridLabelLedgeTestParameters,
} from '../../src/cad-contract/units/opengrid-label-ledge-test'
import {
  getSystemPreset,
  systemContextForModel,
} from '../../src/features/cad/system-entry-context'
import { OPENGRID_LABEL_CARD_HEIGHT } from '../../src/cad-contract/units/opengrid-label-shared'

type RawBox = Record<string, unknown>

function legacyBox(overrides: RawBox = {}): RawBox {
  const {
    labelSlotEnabled: _enabled,
    labelGridUnits: _units,
    labelWall: _wall,
    labelSnapFit: _fit,
    ...legacy
  } = OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS as RawBox
  return { ...legacy, ...overrides }
}

function labelled(overrides: RawBox = {}): RawBox {
  return legacyBox({ labelSlotEnabled: true, height: 25, ...overrides })
}

function normalized(value: RawBox): OpenGridStackableBoxParameters {
  const validation = validateOpenGridStackableBoxParameters(value)
  if (!validation.valid) throw new Error(JSON.stringify(validation.issues))
  return validation.value
}

function issueFields(value: RawBox): string[] {
  const validation = validateOpenGridStackableBoxParameters(value)
  return validation.valid ? [] : validation.issues.map((issue) => issue.field)
}

describe('stackable box label ledge parameters', () => {
  it('loads legacy snapshots without label keys as label off', () => {
    const parameters = normalized(legacyBox())
    expect(parameters.labelSlotEnabled).toBe(false)
    expect(openGridStackableBoxFileName(parameters)).not.toContain('-label')
    expect(openGridStackableBoxFileName(parameters)).toBe(
      'opengrid-stackable-box-2x2-h20-seats-detachable-corner-seat.step',
    )
  })

  it('adds the label token only when enabled', () => {
    const parameters = normalized(labelled())
    expect(openGridStackableBoxFileName(parameters)).toContain(
      '-label4u-back-fit-normal',
    )
    expect(openGridStackableBoxStlFileName(parameters)).toContain(
      '-label4u-back-fit-normal',
    )
    const off = normalized(labelled({ labelSlotEnabled: false }))
    expect(openGridStackableBoxFileName(off)).not.toContain('-label')
  })

  it('places the label token after honeycomb and before the opening fingerprint', () => {
    const name = openGridStackableBoxFileName(
      normalized(
        labelled({
          honeycombMode: true,
          labelWall: 'left',
          labelSnapFit: 'tight',
          labelGridUnits: 3,
          openingPlusYDepth: 5,
        }),
      ),
    )
    expect(name).toMatch(/-honeycomb-label3u-left-fit-tight-open-/)
  })

  it('ignores label values that do not matter while disabled', () => {
    const parameters = normalized(
      legacyBox({ x: 1, y: 1, labelGridUnits: 9, labelWall: 'left' }),
    )
    expect(parameters.labelSlotEnabled).toBe(false)
  })

  it('rejects malformed label values and unknown keys', () => {
    expect(issueFields(labelled({ labelWall: 'top' }))).toContain('labelWall')
    expect(issueFields(labelled({ labelSnapFit: 'snug' }))).toContain(
      'labelSnapFit',
    )
    expect(issueFields(labelled({ labelGridUnits: 2.5 }))).toContain(
      'labelGridUnits',
    )
    expect(issueFields(labelled({ labelSlotEnabled: 'yes' }))).toContain(
      'labelSlotEnabled',
    )
    expect(issueFields(labelled({ unknownKey: 1 }))).toContain('parameters')
  })

  it.each([
    { x: 2, y: 2, wall: 'back', max: 4 },
    { x: 1.5, y: 1, wall: 'front', max: 3 },
    { x: 1, y: 3, wall: 'left', max: 7 },
    { x: 1, y: 1, wall: 'back', max: 0 },
    { x: 0.5, y: 2, wall: 'front', max: 0 },
  ] as const)(
    'computes $max units for the $wall wall of a $x x $y box',
    ({ x, y, wall, max }) => {
      expect(openGridStackableBoxLabelMaxUnitsFor({ x, y }, wall)).toBe(max)
    },
  )

  it('reports an unavailable wall as a field error instead of enabling it', () => {
    const validation = validateOpenGridStackableBoxParameters(
      labelled({ x: 1, y: 1, labelGridUnits: 2 }),
    )
    expect(validation.valid).toBe(false)
    if (validation.valid) return
    expect(validation.issues[0]).toMatchObject({
      field: 'labelSlotEnabled',
      messageId: 'validation.labelWallTooNarrow',
    })
  })

  it('never silently shrinks units that no longer fit', () => {
    const validation = validateOpenGridStackableBoxParameters(
      labelled({ x: 2, y: 2, labelGridUnits: 6 }),
    )
    expect(validation.valid).toBe(false)
    if (validation.valid) return
    expect(validation.issues).toContainEqual(
      expect.objectContaining({
        field: 'labelGridUnits',
        messageId: 'validation.labelUnitsDoNotFit',
        params: { minimum: 2, maximum: 4 },
      }),
    )
  })

  it('accepts 2 units and the wall maximum', () => {
    expect(normalized(labelled({ labelGridUnits: 2 })).labelGridUnits).toBe(2)
    expect(normalized(labelled({ labelGridUnits: 4 })).labelGridUnits).toBe(4)
    expect(issueFields(labelled({ labelGridUnits: 1 }))).toContain(
      'labelGridUnits',
    )
  })

  it('rejects a label on a wall with an opening', () => {
    expect(
      issueFields(labelled({ labelWall: 'back', openingPlusYDepth: 5 })),
    ).toContain('labelWall')
    expect(
      issueFields(labelled({ labelWall: 'front', openingPlusYDepth: 5 })),
    ).toEqual([])
  })

  it('derives the minimum height from the ledge geometry', () => {
    const { minClearHeight, freeHangingHeight } = openGridLabelLedgeLayoutFor(
      4,
      'normal',
    )
    expect(issueFields(labelled({ height: minClearHeight - 1 }))).toContain(
      'height',
    )
    expect(issueFields(labelled({ height: minClearHeight }))).toEqual([])
    expect(
      issueFields(
        labelled({ height: freeHangingHeight - 1, bottomMode: 'none' }),
      ),
    ).toContain('height')
    expect(
      issueFields(labelled({ height: freeHangingHeight, bottomMode: 'none' })),
    ).toEqual([])
  })

  it('rejects a merged block that would cover bottom holes', () => {
    expect(
      issueFields(labelled({ height: 18, fullBottomHoleGrid: true })),
    ).toContain('height')
    expect(
      issueFields(labelled({ height: 23, fullBottomHoleGrid: true })),
    ).toEqual([])
  })

  it('is accepted by the model validator and keeps defaults label off', () => {
    expect(
      validateModelParameters('opengrid-stackable-box', labelled()).valid,
    ).toBe(true)
    expect(OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.labelSlotEnabled).toBe(
      false,
    )
  })
})

describe('label ledge layout', () => {
  it('shares the 12 mm card height and keeps every point below the rim datum', () => {
    const layout = openGridLabelLedgeLayoutFor(4, 'normal')
    expect(layout.cardBottomS - layout.cardTopS).toBe(
      OPENGRID_LABEL_CARD_HEIGHT,
    )
    const [, railTopZ] = openGridLabelLedgeSlopePoint(
      layout,
      layout.cardTopS - 0.2,
      layout.projection,
    )
    expect(railTopZ).toBeLessThanOrEqual(0)
    expect(layout.wallTopZ).toBeLessThanOrEqual(-1)
    expect(layout.minClearHeight).toBeLessThan(layout.freeHangingHeight)
    expect(layout.leadInEndS).toBeLessThan(layout.slopeLength)
  })

  it('maps fits to bump heights', () => {
    expect(OPENGRID_LABEL_SNAP_BUMP_HEIGHTS).toEqual({
      loose: 0.5,
      normal: 0.6,
      tight: 0.7,
    })
    for (const fit of OPENGRID_LABEL_SNAP_FITS) {
      expect(openGridLabelLedgeLayoutFor(3, fit).bumpHeight).toBe(
        OPENGRID_LABEL_SNAP_BUMP_HEIGHTS[fit],
      )
    }
  })
})

describe('label ledge test coupon contract', () => {
  const defaults = OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION.defaultParameters

  it('defaults to 3 units at normal fit and names exports with both', () => {
    expect(defaults).toEqual({ gridUnits: 3, labelSnapFit: 'normal' })
    expect(openGridLabelLedgeTestFileName(defaults)).toBe(
      'opengrid-label-ledge-test-3u-fit-normal.step',
    )
    expect(openGridLabelLedgeTestStlFileName(defaults)).toBe(
      'opengrid-label-ledge-test-3u-fit-normal.stl',
    )
  })

  it.each([1, 11, 2.5, '3', undefined])('rejects units %s', (gridUnits) => {
    expect(
      validateOpenGridLabelLedgeTestParameters({ ...defaults, gridUnits })
        .valid,
    ).toBe(false)
  })

  it('accepts 2 through 10 units and every fit, rejects other keys', () => {
    for (const gridUnits of [2, 10]) {
      for (const labelSnapFit of OPENGRID_LABEL_SNAP_FITS) {
        expect(
          validateOpenGridLabelLedgeTestParameters({ gridUnits, labelSnapFit })
            .valid,
        ).toBe(true)
      }
    }
    expect(
      validateOpenGridLabelLedgeTestParameters({ ...defaults, extra: 1 }).valid,
    ).toBe(false)
    expect(
      validateOpenGridLabelLedgeTestParameters({ gridUnits: 3 }).valid,
    ).toBe(false)
    expect(
      validateOpenGridLabelLedgeTestParameters({
        ...defaults,
        labelSnapFit: 'snug',
      }).valid,
    ).toBe(false)
  })

  it('reports upright bounds starting at Z=0', () => {
    const bounds = boundsForOpenGridLabelLedgeTest(defaults)
    expect(bounds.min[2]).toBe(0)
    expect(bounds.max[2]).toBeGreaterThan(20)
    expect(bounds.max[0] - bounds.min[0]).toBeGreaterThan(30)
  })

  it('validates through the model validator', () => {
    expect(
      validateModelParameters('opengrid-label-ledge-test', defaults).valid,
    ).toBe(true)
    expect(
      validateModelParameters('opengrid-label-ledge-test', { gridUnits: 3 })
        .valid,
    ).toBe(false)
  })
})

describe('label ledge system contexts', () => {
  it('offers the coupon in the Desk context only', () => {
    expect(systemContextForModel('opengrid-label-ledge-test', 'desk')).toBe(
      'desk',
    )
    expect(
      systemContextForModel('opengrid-label-ledge-test', 'wall'),
    ).toBeUndefined()
    expect(getSystemPreset('opengrid-label-ledge-test', 'desk')).toEqual(
      OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION.defaultParameters,
    )
    expect(getSystemPreset('opengrid-label-ledge-test', 'wall')).toBeUndefined()
  })

  it('leaves the label off in the Desk box preset', () => {
    const preset = getSystemPreset('opengrid-stackable-box', 'desk')
    expect(preset).toMatchObject({ labelSlotEnabled: false })
  })
})

describe('label ledge persistence', () => {
  function memoryStorage(initial?: string) {
    const data = new Map<string, string>()
    if (initial !== undefined)
      data.set(COMPONENT_PARAMETER_STORAGE_KEY, initial)
    return {
      data,
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    }
  }

  it('persists box and coupon tightness independently', () => {
    const storage = memoryStorage()
    const store = createComponentParameterStore({
      storage,
      systemContext: 'desk',
    })
    expect(
      store.set(
        'opengrid-stackable-box',
        normalized(labelled({ labelSnapFit: 'tight' })),
      ),
    ).toBe(true)
    expect(
      store.set('opengrid-label-ledge-test', {
        gridUnits: 5,
        labelSnapFit: 'loose',
      }),
    ).toBe(true)
    store.dispose()

    const reloaded = createComponentParameterStore({
      storage,
      systemContext: 'desk',
    })
    expect(reloaded.get('opengrid-stackable-box')).toMatchObject({
      labelSlotEnabled: true,
      labelSnapFit: 'tight',
    })
    expect(reloaded.get('opengrid-label-ledge-test')).toEqual({
      gridUnits: 5,
      labelSnapFit: 'loose',
    })
    reloaded.dispose()
  })

  it('loads a saved box snapshot without label keys as label off', () => {
    const storage = memoryStorage(
      JSON.stringify({
        version: 2,
        values: { legacy: { 'opengrid-stackable-box': legacyBox() } },
      }),
    )
    const store = createComponentParameterStore({ storage })
    expect(store.get('opengrid-stackable-box')).toMatchObject({
      labelSlotEnabled: false,
      labelGridUnits: 4,
      labelWall: 'back',
      labelSnapFit: 'normal',
    })
    store.dispose()
  })
})

describe('label ledge localized labels', () => {
  it('shows the word and bump height for each tightness option', () => {
    const labels = (locale: 'zh-Hant' | 'en') =>
      OPENGRID_LABEL_SNAP_FITS.map((fit) =>
        translate(locale, `panel.boxLabel.fit.${fit}`),
      )
    expect(labels('zh-Hant')).toEqual(['鬆 0.5 mm', '標準 0.6 mm', '緊 0.7 mm'])
    expect(labels('en')).toEqual([
      'Loose 0.5 mm',
      'Normal 0.6 mm',
      'Tight 0.7 mm',
    ])
  })

  it('reuses the opening wording for the label wall', () => {
    const walls = ['front', 'back', 'left', 'right'] as const
    expect(
      walls.map((wall) =>
        translate('zh-Hant', `panel.opening.direction.${wall}`),
      ),
    ).toEqual(['前方', '後方', '左方', '右方'])
    expect(
      walls.map((wall) => translate('en', `panel.opening.direction.${wall}`)),
    ).toEqual(['Front', 'Back', 'Left', 'Right'])
  })
})

describe('label ledge raw parameters', () => {
  it('parses legacy raw box input without label keys as label off', () => {
    const raw = rawFromParameters(normalized(legacyBox()))
    const {
      labelSlotEnabled: _enabled,
      labelGridUnits: _units,
      labelWall: _wall,
      labelSnapFit: _fit,
      ...legacyRaw
    } = raw
    expect(parseRawParameters(legacyRaw, 'opengrid-stackable-box')).toEqual({
      valid: true,
      value: normalized(legacyBox()),
    })
  })

  it('round-trips an enabled box label and the coupon through raw strings', () => {
    const box = normalized(
      labelled({
        labelWall: 'right',
        labelSnapFit: 'loose',
        labelGridUnits: 3,
      }),
    )
    const rawBox = rawFromParameters(box)
    expect(rawBox).toMatchObject({
      labelSlotEnabled: 'true',
      labelGridUnits: '3',
      labelWall: 'right',
      labelSnapFit: 'loose',
    })
    expect(parseRawParameters(rawBox, 'opengrid-stackable-box')).toEqual({
      valid: true,
      value: box,
    })
    expect(parametersForRange(rawBox)).toMatchObject({
      labelSlotEnabled: true,
      labelWall: 'right',
      labelSnapFit: 'loose',
    })
    const coupon = { gridUnits: 5, labelSnapFit: 'tight' } as const
    const rawCoupon = rawFromParameters(coupon)
    expect(rawCoupon).toEqual({ gridUnits: '5', labelSnapFit: 'tight' })
    expect(parseRawParameters(rawCoupon, 'opengrid-label-ledge-test')).toEqual({
      valid: true,
      value: coupon,
    })
  })

  it('reports invalid raw label values without shrinking units', () => {
    const raw = rawFromParameters(normalized(labelled({ labelGridUnits: 4 })))
    const result = parseRawParameters(
      { ...raw, labelGridUnits: '6' },
      'opengrid-stackable-box',
    )
    expect(result).toMatchObject({ valid: false, field: 'labelGridUnits' })
  })
})
