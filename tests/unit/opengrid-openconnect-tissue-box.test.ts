import { describe, expect, it } from 'vitest'
import {
  TISSUE_BOX_DEFAULTS as defaults,
  validateTissueBoxParameters,
  tissueBoxLayout,
  tissueBoxPoint,
  tissueBoxCells,
  tissueBoxFileName,
} from '../../src/cad-contract/units/opengrid-openconnect-tissue-box'

describe('OpenConnect tissue box contract', () => {
  it('accepts editable default internal dimensions', () => {
    expect(validateTissueBoxParameters(defaults).valid).toBe(true)
    const layout = tissueBoxLayout(defaults)
    expect(layout.width - 2 * defaults.wallThickness).toBe(defaults.x)
    expect(layout.depth - 2 * defaults.wallThickness).toBe(defaults.y)
    expect(layout.height - defaults.bottomThickness).toBe(defaults.z)
  })
  it.each([0, 15, 45])(
    'raises the front and clears the wall at %s degrees',
    (tiltAngle) => {
      const p = { ...defaults, tiltAngle }
      const layout = tissueBoxLayout(p)
      const rear = tissueBoxPoint(p, [0, 0, 0])
      const front = tissueBoxPoint(p, [0, layout.depth, 0])
      expect(front[2] - rear[2]).toBeCloseTo(
        layout.depth * Math.sin((tiltAngle * Math.PI) / 180),
      )
      expect(tissueBoxPoint(p, [0, 0, layout.height])[1]).toBeCloseTo(
        layout.plateThickness,
      )
    },
  )
  it.each([
    { x: NaN },
    { z: 0 },
    { tiltAngle: -1 },
    { tiltAngle: 1.5 },
    { outerRadius: 100 },
    { slotLength: 220 },
    { slotWidth: 160 },
    { honeycombMode: 'true' },
    { surprise: 1 },
  ])('rejects invalid input %j', (change) => {
    expect(validateTissueBoxParameters({ ...defaults, ...change }).valid).toBe(
      false,
    )
  })
  it('protects frames and bounds honeycomb work', () => {
    const cells = tissueBoxCells(defaults)
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      expect(cell.v).toBeGreaterThan(defaults.bottomThickness + 5)
      expect(cell.v).toBeLessThan(defaults.z + defaults.bottomThickness - 5)
    }
    expect(
      validateTissueBoxParameters({
        ...defaults,
        x: 400,
        y: 400,
        z: 300,
        honeycombMode: true,
      }).valid,
    ).toBe(false)
  })
  it('distinguishes every geometry parameter in export names', () => {
    const original = tissueBoxFileName(defaults, 'step')
    for (const [key, value] of Object.entries(defaults)) {
      const next = typeof value === 'boolean' ? !value : value + 1
      expect(tissueBoxFileName({ ...defaults, [key]: next }, 'step')).not.toBe(
        original,
      )
    }
  })
})

it('reserves material for the rounded dispensing lips at slot limits', () => {
  expect(
    validateTissueBoxParameters({ ...defaults, slotLength: defaults.x - 10 }),
  ).toMatchObject({
    valid: false,
    issues: expect.arrayContaining([
      expect.objectContaining({ field: 'slotLength' }),
    ]),
  })
  expect(
    validateTissueBoxParameters({ ...defaults, slotWidth: defaults.y - 10 }),
  ).toMatchObject({
    valid: false,
    issues: expect.arrayContaining([
      expect.objectContaining({ field: 'slotWidth' }),
    ]),
  })
})
