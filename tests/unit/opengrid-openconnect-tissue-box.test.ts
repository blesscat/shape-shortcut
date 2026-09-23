import { OPENGRID_GRID_CONFIGURATION } from '../../src/cad-contract/units/opengrid-grid'
import { OPENGRID_HONEYCOMB_CONFIGURATION } from '../../src/cad-contract/units/opengrid-honeycomb'
import { describe, expect, it } from 'vitest'
import {
  TISSUE_BOX_DEFAULTS as defaults,
  validateTissueBoxParameters,
  tissueBoxLayout,
  tissueBoxPoint,
  tissueBoxPrintPoint,
  tissueBoxBounds,
  tissueBoxInstalledBounds,
  tissueBoxCells,
  tissueBoxFileName,
  tissueBoxSlotOrigins,
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
  it('protects shared frames, rounded corners and the slot ring', () => {
    const lattice = OPENGRID_HONEYCOMB_CONFIGURATION
    const radius = lattice.cellRadius
    const sideFrame = lattice.sideFrame
    const bottomFrame = lattice.bottomFrame
    const cornerFrame = defaults.outerRadius + sideFrame
    const fullHexagonArea = ((3 * Math.sqrt(3)) / 2) * radius * radius
    const l = tissueBoxLayout(defaults)
    const cells = tissueBoxCells(defaults)
    const wallCells = cells.filter((cell) => cell.wall !== 'bottom')
    const bottomCells = cells.filter((cell) => cell.wall === 'bottom')
    expect(wallCells.length).toBeGreaterThan(0)
    expect(bottomCells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      const panel = cellPanelOf(cell.wall)
      for (const [u, v] of cell.polygon) {
        expect(u).toBeGreaterThanOrEqual(panel.minimumU - 1e-9)
        expect(u).toBeLessThanOrEqual(panel.maximumU + 1e-9)
        expect(v).toBeGreaterThanOrEqual(panel.minimumV - 1e-9)
        expect(v).toBeLessThanOrEqual(panel.maximumV + 1e-9)
      }
      expect(cell.polygon.length).toBeGreaterThanOrEqual(3)
    }
    function cellPanelOf(wall: 'front' | 'left' | 'right' | 'bottom') {
      if (wall === 'bottom')
        return {
          minimumU: -l.width / 2 + bottomFrame,
          maximumU: l.width / 2 - bottomFrame,
          minimumV: bottomFrame,
          maximumV: l.depth - bottomFrame,
        }
      const span = wall === 'front' ? l.width : l.depth
      const cornerLimit = Math.max(cornerFrame, defaults.wallThickness)
      const sideLimit = Math.max(sideFrame, defaults.wallThickness)
      return {
        minimumU: wall === 'front' ? cornerLimit : sideLimit,
        maximumU: span - cornerLimit,
        minimumV: defaults.bottomThickness + sideFrame,
        maximumV: l.height - sideFrame,
      }
    }
    // Half cells: clipped polygons exist whose centers sit outside the panel.
    const partial = cells.filter((cell) => {
      const panel = cellPanelOf(cell.wall)
      return (
        cell.u < panel.minimumU ||
        cell.u > panel.maximumU ||
        cell.v < panel.minimumV ||
        cell.v > panel.maximumV
      )
    })
    expect(partial.length).toBeGreaterThan(0)
    const polygonAreaOf = (cell: (typeof cells)[number]) =>
      Math.abs(
        cell.polygon.reduce(
          (sum, [u, v], index) =>
            sum +
            u * cell.polygon[(index + 1) % cell.polygon.length]![1] -
            cell.polygon[(index + 1) % cell.polygon.length]![0]! * v,
          0,
        ),
      ) / 2
    for (const cell of partial)
      expect(polygonAreaOf(cell)).toBeLessThan(fullHexagonArea - 1e-9)
    // Wall polygons stay out of the frame bands; areas stay within a hexagon.
    for (const cell of wallCells) {
      const area = polygonAreaOf(cell)
      expect(area).toBeGreaterThan(1e-4)
      expect(area).toBeLessThanOrEqual(fullHexagonArea + 1e-9)
    }
    // Wall slabs clamp the panels: openings never notch the perpendicular
    // walls when wallThickness exceeds the side frame.
    const thick = { ...defaults, wallThickness: 4 }
    const thickLayout = tissueBoxLayout(thick)
    for (const cell of tissueBoxCells(thick)) {
      if (cell.wall === 'bottom') continue
      const span = cell.wall === 'front' ? thickLayout.width : thickLayout.depth
      const limit = Math.max(
        cell.wall === 'front' ? thick.outerRadius + sideFrame : sideFrame,
        thick.wallThickness,
      )
      expect(Math.min(...cell.polygon.map(([u]) => u))).toBeGreaterThanOrEqual(
        limit - 1e-9,
      )
      expect(Math.max(...cell.polygon.map(([u]) => u))).toBeLessThanOrEqual(
        span - limit + 1e-9,
      )
    }
    const slotCoreHalf = defaults.slotLength / 2 - defaults.slotWidth / 2
    const slotClearance = defaults.slotWidth / 2 + lattice.bottomHoleSafetyRing
    const distanceToSlot = ([u, v]: [number, number]) =>
      Math.hypot(
        Math.max(0, Math.abs(u) - slotCoreHalf),
        Math.abs(v - l.depth / 2),
      )
    expect(bottomCells.some((cell) => cell.clipToSlotSafetyRing)).toBe(true)
    for (const cell of bottomCells) {
      const centerDistance = distanceToSlot([cell.u, cell.v])
      expect(centerDistance + radius).toBeGreaterThan(slotClearance)
      expect(Math.max(...cell.polygon.map(distanceToSlot))).toBeGreaterThan(
        slotClearance,
      )
      if (cell.clipToSlotSafetyRing) {
        expect(centerDistance).toBeLessThan(slotClearance + radius)
      }
    }
    // Rounded front ends reserve the full outer radius; square rear ends do not.
    const front = wallCells.filter((cell) => cell.wall === 'front')
    const frontPanel = cellPanelOf('front')
    expect(
      Math.min(...front.flatMap((cell) => cell.polygon.map(([u]) => u))),
    ).toBeCloseTo(frontPanel.minimumU, 6)
    const sides = wallCells.filter((cell) => cell.wall !== 'front')
    expect(
      Math.min(...sides.flatMap((cell) => cell.polygon.map(([u]) => u))),
    ).toBeCloseTo(sideFrame, 6)
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
  it('plans partial bottom cells beside the dispensing-slot safety ring', () => {
    const lattice = OPENGRID_HONEYCOMB_CONFIGURATION
    const layout = tissueBoxLayout(defaults)
    const slotCoreHalf = defaults.slotLength / 2 - defaults.slotWidth / 2
    const clearance = defaults.slotWidth / 2 + lattice.bottomHoleSafetyRing
    const distanceToSlot = ([u, v]: [number, number]) =>
      Math.hypot(
        Math.max(0, Math.abs(u) - slotCoreHalf),
        Math.abs(v - layout.depth / 2),
      )
    const slotAdjacentCells = tissueBoxCells(defaults).filter((cell) => {
      if (cell.wall !== 'bottom') return false
      const distances = cell.polygon.map(distanceToSlot)
      return (
        Math.min(...distances) < clearance && Math.max(...distances) > clearance
      )
    })

    expect(slotAdjacentCells.length).toBeGreaterThan(0)
  })
  it('keeps bottom cells inside the rounded front corner arcs', () => {
    const lattice = OPENGRID_HONEYCOMB_CONFIGURATION
    const radius = lattice.cellRadius
    const bottomFrame = lattice.bottomFrame
    for (const outerRadius of [0, 5, 20, 30]) {
      const p = { ...defaults, outerRadius }
      const l = tissueBoxLayout(p)
      const bottomCells = tissueBoxCells(p).filter(
        (cell) => cell.wall === 'bottom',
      )
      expect(bottomCells.length).toBeGreaterThan(0)
      for (const cell of bottomCells) {
        for (const sign of [-1, 1] as const) {
          const cornerCenterX = sign * (l.width / 2 - outerRadius)
          const cornerCenterY = l.depth - outerRadius
          const reachesCornerSquare =
            cell.v + radius > cornerCenterY &&
            (sign === 1
              ? cell.u + radius > cornerCenterX
              : cell.u - radius < cornerCenterX)
          if (!reachesCornerSquare) continue
          expect(
            Math.hypot(cell.u - cornerCenterX, cell.v - cornerCenterY) + radius,
          ).toBeLessThanOrEqual(outerRadius - bottomFrame + 1e-9)
        }
      }
    }
    expect(
      Math.min(
        ...tissueBoxCells({ ...defaults, outerRadius: 20 })
          .filter((cell) => cell.wall === 'front')
          .flatMap((cell) => cell.polygon.map(([u]) => u)),
      ),
    ).toBeCloseTo(20 + lattice.sideFrame, 6)
  })
  it('distinguishes every geometry parameter in export names', () => {
    const original = tissueBoxFileName(defaults, 'step')
    for (const [key, value] of Object.entries(defaults)) {
      let next: string | number | boolean
      if (typeof value === 'boolean') next = !value
      else if (typeof value === 'number') next = value + 1
      else next = key === 'openConnectHorizontalAlignment' ? 'left' : 'top'
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

it('fills both mounting axes without shrinking the rear plate for R', () => {
  const l = tissueBoxLayout(defaults)
  const origins = tissueBoxSlotOrigins(defaults)
  const pitch = OPENGRID_GRID_CONFIGURATION.fullPitch
  const columns = Math.floor(l.plateWidth / pitch)
  const rows = Math.floor(l.plateHeight / pitch)
  expect(rows).toBeGreaterThan(1)
  expect(origins).toHaveLength(columns * rows)
  expect(new Set(origins.map(([x]) => x)).size).toBe(columns)
  expect(new Set(origins.map(([, , z]) => z)).size).toBe(rows)
  for (let row = 0; row < rows; row++) {
    const rowPoints = origins.filter(
      ([, , z]) => Math.abs(z - (l.rowBase + (row + 0.5) * pitch)) < 1e-8,
    )
    expect(rowPoints).toHaveLength(columns)
    expect(rowPoints[0]![0] + rowPoints.at(-1)![0]).toBeCloseTo(0)
  }
  expect(l.plateWidth).toBe(l.width)
  expect(l.supportWidth).toBe(l.width)
  expect(tissueBoxLayout({ ...defaults, outerRadius: 20 }).plateWidth).toBe(
    l.plateWidth,
  )
})

it('retains a full single mounting row on a short tilted box', () => {
  const p = { ...defaults, z: 24, tiltAngle: 45 }
  const origins = tissueBoxSlotOrigins(p)
  expect(new Set(origins.map(([, , z]) => z)).size).toBe(1)
})

it.each([0, 15, 45])(
  'maps installed box corners back to flat print coordinates at %s degrees',
  (tiltAngle) => {
    const p = { ...defaults, tiltAngle }
    const l = tissueBoxLayout(p)
    for (const point of [
      [0, 0, 0],
      [0, l.depth, 0],
      [l.width / 2, 0, l.height],
    ] as [number, number, number][]) {
      const printed = tissueBoxPrintPoint(p, tissueBoxPoint(p, point))
      for (let axis = 0; axis < 3; axis++)
        expect(printed[axis]).toBeCloseTo(point[axis]!, 8)
    }
    expect(tissueBoxBounds(p).min[2]).toBe(0)
    if (tiltAngle > 0)
      expect(tissueBoxBounds(p)).not.toEqual(tissueBoxInstalledBounds(p))
  },
)

it.each([0, 15, 45])(
  'fits full socket cells between flush ends at %s degrees',
  (tiltAngle) => {
    const p = { ...defaults, tiltAngle }
    const l = tissueBoxLayout(p)
    const half = OPENGRID_GRID_CONFIGURATION.fullPitch / 2
    for (const [x, , z] of tissueBoxSlotOrigins(p)) {
      for (const y of [0, l.plateThickness]) {
        for (const dz of [-half, half]) {
          const printed = tissueBoxPrintPoint(p, [x, y, z + dz])
          expect(printed[2]).toBeGreaterThanOrEqual(-1e-8)
          expect(printed[2]).toBeLessThanOrEqual(l.height + 1e-8)
        }
      }
    }
    expect(tissueBoxBounds(p).max[2]).toBe(l.height)
  },
)

it.each([0, 15, 45])(
  'rejects a Z too short for one complete flush row at %s degrees',
  (tiltAngle) => {
    expect(
      validateTissueBoxParameters({
        ...defaults,
        z: 20,
        bottomThickness: 1,
        tiltAngle,
      }),
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([expect.objectContaining({ field: 'z' })]),
    })
  },
)

it('accepts the first complete row at the height boundary for every supported angle', () => {
  const pitch = OPENGRID_GRID_CONFIGURATION.fullPitch
  for (let tiltAngle = 0; tiltAngle <= 45; tiltAngle++) {
    const base = { ...defaults, tiltAngle }
    const l = tissueBoxLayout(base)
    const minimumZ =
      pitch * l.cosine + l.plateThickness * l.sine - base.bottomThickness
    expect(validateTissueBoxParameters({ ...base, z: minimumZ }).valid).toBe(
      true,
    )
    expect(
      validateTissueBoxParameters({ ...base, z: minimumZ - 0.01 }).valid,
    ).toBe(false)
  }
})

it('keeps alignment filenames usable for decimal dimensions and normalizes legacy names', () => {
  const p = {
    ...defaults,
    x: 220.125,
    y: 120.125,
    z: 90.125,
    outerRadius: 5.125,
    wallThickness: 2.125,
    bottomThickness: 2.125,
    slotLength: 160.125,
    slotWidth: 35.125,
  }
  expect(validateTissueBoxParameters(p).valid).toBe(true)
  expect(tissueBoxFileName(p, 'step').length).toBeLessThan(256)
  const legacy = { ...p }
  delete legacy.openConnectHorizontalAlignment
  delete legacy.openConnectVerticalAlignment
  expect(tissueBoxFileName(legacy, 'step')).toBe(tissueBoxFileName(p, 'step'))
})
