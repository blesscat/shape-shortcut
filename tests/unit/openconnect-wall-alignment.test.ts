import {
  TISSUE_BOX_DEFAULTS as tissueDefaults,
  tissueBoxLayout,
  tissueBoxSlotOrigins,
  validateTissueBoxParameters,
} from '../../src/cad-contract/units/opengrid-openconnect-tissue-box'
import { describe, expect, it } from 'vitest'
import {
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS as organizerDefaults,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS as shelfDefaults,
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION as configuration,
  openGridOpenConnectOrganizerLayoutFor,
  openGridOpenConnectOrganizerSlotOriginsFor,
  openGridOpenConnectShelfSlotOriginsFor,
  validateOpenGridOpenConnectOrganizerParameters,
  validateOpenGridOpenConnectShelfParameters,
} from '../../src/cad-contract/units'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'
import {
  COMPONENT_PARAMETER_STORAGE_KEY,
  createComponentParameterStore,
} from '../../src/features/cad/parameters'

const horizontal = ['left', 'center', 'right'] as const
const vertical = ['top', 'center', 'bottom'] as const
const combinations = horizontal.flatMap((h) =>
  vertical.map((v) => ({
    openConnectHorizontalAlignment: h,
    openConnectVerticalAlignment: v,
  })),
)

describe('OpenConnect rear-grid alignment', () => {
  it.each(combinations)(
    'positions the complete organizer grid: %j',
    (alignment) => {
      const parameters = {
        ...organizerDefaults,
        holeCountX: 3,
        holeDepth: 65,
        ...alignment,
      }
      const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
      const points = openGridOpenConnectOrganizerSlotOriginsFor(parameters)
      const pitch = configuration.gridPitch
      const xs = [...new Set(points.map((p) => p[0]))].sort((a, b) => a - b)
      const zs = [...new Set(points.map((p) => p[2]))].sort((a, b) => a - b)
      expect(points).toHaveLength(
        layout.connectorColumns * layout.connectorRows,
      )
      for (const axis of [xs, zs])
        for (let i = 1; i < axis.length; i++)
          expect(axis[i]! - axis[i - 1]!).toBeCloseTo(pitch)
      const left = xs[0]! - pitch / 2 + layout.rearInterfaceWidth / 2
      const right = layout.rearInterfaceWidth / 2 - xs.at(-1)! - pitch / 2
      const bottom = zs[0]! - pitch / 2
      const top = layout.rearInterfaceHeight - zs.at(-1)! - pitch / 2
      for (const gap of [left, right, bottom, top])
        expect(gap).toBeGreaterThanOrEqual(-1e-9)
      if (alignment.openConnectHorizontalAlignment === 'left')
        expect(left).toBeCloseTo(0)
      else if (alignment.openConnectHorizontalAlignment === 'right')
        expect(right).toBeCloseTo(0)
      else expect(left).toBeCloseTo(right)
      if (alignment.openConnectVerticalAlignment === 'top')
        expect(top).toBeCloseTo(0)
      else if (alignment.openConnectVerticalAlignment === 'bottom')
        expect(bottom).toBeCloseTo(0)
      else expect(top).toBeCloseTo(bottom)
    },
  )

  it.each(combinations)(
    'keeps fully occupied axes identical: %j',
    (alignment) => {
      const shelf = { ...shelfDefaults, columns: 2, connectorRows: 2 }
      expect(
        validateOpenGridOpenConnectShelfParameters({ ...shelf, ...alignment })
          .valid,
      ).toBe(true)
      expect(
        openGridOpenConnectShelfSlotOriginsFor({ ...shelf, ...alignment }),
      ).toEqual(openGridOpenConnectShelfSlotOriginsFor(shelf))
      const organizer = {
        ...organizerDefaults,
        holeCountX: 1,
        holeDiameter: 10,
        holeDepth: configuration.gridPitch,
        bottomThickness: 0,
      }
      expect(
        openGridOpenConnectOrganizerSlotOriginsFor({
          ...organizer,
          ...alignment,
        }),
      ).toEqual(openGridOpenConnectOrganizerSlotOriginsFor(organizer))
    },
  )

  for (const [modelId, defaults, validate] of [
    [
      'opengrid-openconnect-shelf',
      shelfDefaults,
      validateOpenGridOpenConnectShelfParameters,
    ],
    [
      'opengrid-openconnect-organizer',
      organizerDefaults,
      validateOpenGridOpenConnectOrganizerParameters,
    ],
    [
      'opengrid-openconnect-tissue-box',
      tissueDefaults,
      validateTissueBoxParameters,
    ],
  ] as const) {
    it(`${modelId} normalizes absent fields and preserves saved customization`, () => {
      const legacy = { ...defaults } as Record<string, unknown>
      delete legacy.openConnectHorizontalAlignment
      delete legacy.openConnectVerticalAlignment
      if (modelId === 'opengrid-openconnect-shelf') legacy.columns = 4
      else if (modelId === 'opengrid-openconnect-organizer')
        legacy.holeCountX = 4
      else legacy.x = 230
      const expected = {
        ...legacy,
        openConnectHorizontalAlignment: 'center',
        openConnectVerticalAlignment:
          modelId === 'opengrid-openconnect-tissue-box' ? 'bottom' : 'top',
      }
      expect(validate(legacy)).toEqual({ valid: true, value: expected })
      let saved = JSON.stringify({
        version: 2,
        values: { wall: { [modelId]: legacy } },
      })
      const storage = {
        getItem: () => saved,
        setItem: (_key: string, value: string) => {
          saved = value
        },
      }
      const store = createComponentParameterStore({
        storage,
        systemContext: 'wall',
      })
      expect(store.get(modelId)).toEqual(expected)
      store.dispose()
      expect(storage.getItem()).toContain(modelId)
    })

    it(`${modelId} round-trips and persists both choices`, () => {
      const value = {
        ...defaults,
        openConnectHorizontalAlignment: 'right' as const,
        openConnectVerticalAlignment: 'bottom' as const,
      }
      const raw = rawFromParameters(value)
      expect(raw.openConnectHorizontalAlignment).toBe('right')
      expect(raw.openConnectVerticalAlignment).toBe('bottom')
      expect(parseRawParameters(raw, modelId)).toEqual({ valid: true, value })
      let saved: string | null = null
      const storage = {
        getItem: (_key: string) => saved,
        setItem: (_key: string, next: string) => {
          saved = next
        },
      }
      const store = createComponentParameterStore({
        storage,
        systemContext: 'wall',
      })
      expect(store.set(modelId, value)).toBe(true)
      store.dispose()
      const restored = createComponentParameterStore({
        storage,
        systemContext: 'wall',
      })
      expect(restored.get(modelId)).toEqual(value)
      expect(
        JSON.parse(storage.getItem(COMPONENT_PARAMETER_STORAGE_KEY)!).values
          .wall[modelId],
      ).toEqual(value)
      restored.dispose()
    })

    it.each(['bogus', '', null, 1])(
      `${modelId} rejects explicit invalid alignment %j`,
      (invalid) => {
        for (const field of [
          'openConnectHorizontalAlignment',
          'openConnectVerticalAlignment',
        ]) {
          expect(validate({ ...defaults, [field]: invalid })).toMatchObject({
            valid: false,
            issues: expect.arrayContaining([
              expect.objectContaining({ field }),
            ]),
          })
        }
      },
    )
  }
})

describe('tissue box rear-grid alignment', () => {
  it.each(combinations)(
    'aligns in the installed front view: %j',
    (alignment) => {
      const p = {
        ...tissueDefaults,
        x: 73,
        z: 67,
        slotLength: 45,
        slotWidth: 15,
        ...alignment,
      }
      const l = tissueBoxLayout(p)
      const pitch = configuration.gridPitch
      const points = tissueBoxSlotOrigins(p)
      expect(validateTissueBoxParameters(p).valid).toBe(true)
      expect(points).toHaveLength(l.columns * l.rows)
      const xs = points.map((point) => point[0])
      const zs = points.map((point) => point[2])
      // This holder extends toward +Y, so front-view left is world +X.
      const left = l.plateWidth / 2 - Math.max(...xs) - pitch / 2
      const right = Math.min(...xs) + l.plateWidth / 2 - pitch / 2
      const bottom = Math.min(...zs) - l.rowBase - pitch / 2
      const top = l.plateTop - Math.max(...zs) - pitch / 2
      for (const gap of [left, right, bottom, top])
        expect(gap).toBeGreaterThanOrEqual(-1e-9)
      if (alignment.openConnectHorizontalAlignment === 'left')
        expect(left).toBeCloseTo(0)
      else if (alignment.openConnectHorizontalAlignment === 'right')
        expect(right).toBeCloseTo(0)
      else expect(left).toBeCloseTo(right)
      if (alignment.openConnectVerticalAlignment === 'top')
        expect(top).toBeCloseTo(0)
      else if (alignment.openConnectVerticalAlignment === 'bottom')
        expect(bottom).toBeCloseTo(0)
      else expect(top).toBeCloseTo(bottom)
    },
  )

  it('preserves legacy bottom alignment and normalizes raw input', () => {
    const legacy = { ...tissueDefaults } as Record<string, unknown>
    delete legacy.openConnectHorizontalAlignment
    delete legacy.openConnectVerticalAlignment
    expect(validateTissueBoxParameters(legacy)).toMatchObject({
      valid: true,
      value: {
        openConnectHorizontalAlignment: 'center',
        openConnectVerticalAlignment: 'bottom',
      },
    })
    const raw = Object.fromEntries(
      Object.entries(legacy).map(([key, value]) => [key, String(value)]),
    )
    expect(
      parseRawParameters(raw, 'opengrid-openconnect-tissue-box'),
    ).toMatchObject({
      valid: true,
      value: { openConnectVerticalAlignment: 'bottom' },
    })
  })
})
