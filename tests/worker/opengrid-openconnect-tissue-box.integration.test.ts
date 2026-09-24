import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  TISSUE_BOX_DEFAULTS,
  tissueBoxLayout,
  tissueBoxCells,
  tissueBoxSlotOrigins,
  tissueBoxBounds,
  tissueBoxSlotLimits,
  TISSUE_BOX_FRAME,
  type TissueBoxParameters,
} from '../../src/cad-contract/units/opengrid-openconnect-tissue-box'
import { OPENGRID_HONEYCOMB_CONFIGURATION } from '../../src/cad-contract/units/opengrid-honeycomb'
import {
  buildTissueBox,
  tissueBoxQuality,
} from '../../src/cad-kernel/components/opengrid-openconnect-tissue-box/builder'
import {
  importOpenGridOpenConnectShelfLockedSlot,
  placeOpenGridOpenConnectShelfLockedSlot,
  openGridOpenConnectShelfLockedSlotAssetUrl,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot'
import { meshBRep } from '../../src/cad-kernel/mesh'
;(globalThis as any).__dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
;(globalThis as any).require = require
beforeAll(async () => {
  const oc = await require('replicad-opencascadejs').default({
    locateFile: () =>
      require.resolve('replicad-opencascadejs/src/replicad_single.wasm'),
  })
  setOC(oc)
})
const small = {
  ...TISSUE_BOX_DEFAULTS,
  x: 70,
  y: 50,
  z: 35,
  slotLength: 45,
  slotWidth: 15,
}
async function build(p: TissueBoxParameters, extra = {}) {
  const source = await importOpenGridOpenConnectShelfLockedSlot(
    new Blob([
      readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
    ]),
  )
  try {
    return await buildTissueBox(p, {
      getLockedSlot: async () => source,
      ...extra,
    })
  } finally {
    source.delete()
  }
}
function inPrintFrame(shape: Shape3D, p: TissueBoxParameters): Shape3D {
  return shape
    .translate(0, -tissueBoxLayout(p).offsetY, 0)
    .rotate(-p.tiltAngle, [0, 0, 0], [1, 0, 0])
}
function volumeAt(
  shape: Shape3D,
  p: TissueBoxParameters,
  point: [number, number, number],
) {
  const center = point
  const probe = makeBox(
    center.map((v) => v - 0.1) as [number, number, number],
    center.map((v) => v + 0.1) as [number, number, number],
  )
  const common = shape.intersect(probe)
  try {
    return Math.abs(measureVolume(common))
  } finally {
    common.delete()
    probe.delete()
  }
}
describe('tissue box real geometry', () => {
  it.each([0, 15, 45])(
    'has open loading/dispensing paths and protected walls at %s degrees',
    async (tiltAngle) => {
      const p = { ...small, tiltAngle }
      const l = tissueBoxLayout(p)
      const shape = await build(p)
      try {
        expect(tissueBoxQuality(shape)).toEqual({ valid: true, solids: 1 })
        expect(
          volumeAt(shape, p, [0, l.depth / 2, l.height - 0.5]),
        ).toBeLessThan(1e-6)
        expect(
          volumeAt(shape, p, [0, l.depth / 2, p.bottomThickness / 2]),
        ).toBeLessThan(1e-6)
        expect(
          volumeAt(shape, p, [0, p.wallThickness + 2, p.bottomThickness / 2]),
        ).toBeGreaterThan(0.007)
        expect(
          volumeAt(shape, p, [0, l.depth - p.wallThickness / 2, l.height / 2]),
        ).toBeGreaterThan(0.007)
        expect(
          volumeAt(shape, p, [0, p.wallThickness / 2, l.height / 2]),
        ).toBeGreaterThan(0.007)
        expect(
          volumeAt(shape, p, [
            l.width / 2 - p.wallThickness / 2,
            l.depth / 2,
            l.height / 2,
          ]),
        ).toBeGreaterThan(0.007)
        const mesh = meshBRep(shape, { tolerance: 0.1, angularTolerance: 0.2 })
        expect(mesh.positions.length).toBeGreaterThan(0)
        expect((await shape.blobSTEP()).size).toBeGreaterThan(0)
        expect(shape.blobSTL({ binary: true }).size).toBeGreaterThan(0)
      } finally {
        shape.delete()
      }
    },
    180000,
  )
  it('removes wall and bottom honeycomb and reports all cells', async () => {
    const progress: any[] = []
    const solid = await build(small)
    const p = { ...small, honeycombMode: true }
    const saved = await build(p, {
      reportProgress: (value: unknown) => progress.push(value),
    })
    try {
      expect(tissueBoxQuality(saved)).toEqual({ valid: true, solids: 1 })
      expect(measureVolume(saved)).toBeLessThan(measureVolume(solid))
      const l = tissueBoxLayout(p)
      const cells = tissueBoxCells(p)
      const bottomCells = cells.filter((cell) => cell.wall === 'bottom')
      expect(bottomCells.length).toBeGreaterThan(0)
      // Half cells: clipped polygons whose centers sit outside their panel.
      const partialCells = cells.filter((cell) => {
        const us = cell.polygon.map(([u]) => u)
        const vs = cell.polygon.map(([, v]) => v)
        return (
          cell.u < Math.min(...us) ||
          cell.u > Math.max(...us) ||
          cell.v < Math.min(...vs) ||
          cell.v > Math.max(...vs)
        )
      })
      expect(partialCells.length).toBeGreaterThan(0)
      const centroidOf = (cell: (typeof cells)[number]) =>
        cell.polygon.reduce(
          (acc, [u, v]) => [
            acc[0]! + u / cell.polygon.length,
            acc[1]! + v / cell.polygon.length,
          ],
          [0, 0] as [number, number],
        )
      for (const cell of cells) {
        const centroid = centroidOf(cell)
        let point: [number, number, number] = [
          centroid[0]! - l.width / 2,
          l.depth - p.wallThickness / 2,
          centroid[1]!,
        ]
        if (cell.wall === 'left')
          point = [
            -l.width / 2 + p.wallThickness / 2,
            centroid[0]!,
            centroid[1]!,
          ]
        if (cell.wall === 'right')
          point = [
            l.width / 2 - p.wallThickness / 2,
            centroid[0]!,
            centroid[1]!,
          ]
        if (cell.wall === 'bottom')
          point = [centroid[0]!, centroid[1]!, p.bottomThickness / 2]
        expect(volumeAt(saved, p, point)).toBeLessThan(1e-6)
      }
      // A partial bottom cell is cut through the full thickness at both faces.
      const partialBottomCells = partialCells.filter(
        (cell) => cell.wall === 'bottom',
      )
      expect(partialBottomCells.length).toBeGreaterThan(0)
      const partialCentroid = centroidOf(partialBottomCells[0]!)
      for (const z of [0.02, p.bottomThickness - 0.02])
        expect(
          volumeAt(saved, p, [partialCentroid[0]!, partialCentroid[1]!, z]),
        ).toBeLessThan(1e-6)
      // Disabling saving keeps the bottom fully solid where holes would be.
      for (const cell of [bottomCells[0]!, bottomCells.at(-1)!]) {
        const centroid = centroidOf(cell)
        expect(
          volumeAt(solid, p, [
            centroid[0]!,
            centroid[1]!,
            p.bottomThickness / 2,
          ]),
        ).toBeGreaterThan(0.007)
      }
      expect(
        volumeAt(saved, p, [0, p.wallThickness / 2, l.height / 2]),
      ).toBeGreaterThan(0.007)
      expect(progress).toContainEqual(
        expect.objectContaining({
          completed: cells.length,
          total: cells.length,
          unit: 'cells',
        }),
      )
    } finally {
      solid.delete()
      saved.delete()
    }
  }, 180000)
  it('keeps bottom openings off rounded corners and the slot ring with saving on', async () => {
    const p = {
      ...small,
      x: 120,
      y: 80,
      wallThickness: 4,
      outerRadius: 20,
      honeycombMode: true,
    }
    const shape = await build(p)
    try {
      expect(tissueBoxQuality(shape)).toEqual({ valid: true, solids: 1 })
      const l = tissueBoxLayout(p)
      const bottomCells = tissueBoxCells(p).filter(
        (cell) => cell.wall === 'bottom',
      )
      expect(bottomCells.length).toBeGreaterThan(0)
      // One admitted opening passes through the full bottom thickness. Prefer
      // a complete cell so the probe sits clear of the clipped frame slivers.
      const frame = OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame
      const sample =
        bottomCells.find(
          (cell) =>
            cell.u > -l.width / 2 + frame &&
            cell.u < l.width / 2 - frame &&
            cell.v > frame &&
            cell.v < l.depth - frame,
        ) ?? bottomCells[0]!
      const sampleCentroid = sample.polygon.reduce(
        (acc, [u, v]) => [
          acc[0]! + u / sample.polygon.length,
          acc[1]! + v / sample.polygon.length,
        ],
        [0, 0] as [number, number],
      )
      for (const z of [0.02, p.bottomThickness - 0.02])
        expect(
          volumeAt(shape, p, [sampleCentroid[0]!, sampleCentroid[1]!, z]),
        ).toBeLessThan(1e-6)
      // The 2 mm ring hugging the slot and both rounded corner arcs stay solid.
      expect(
        volumeAt(shape, p, [
          0,
          l.depth / 2 + p.slotWidth / 2 + 1,
          p.bottomThickness / 2,
        ]),
      ).toBeGreaterThan(0.007)
      for (const sign of [-1, 1]) {
        expect(
          volumeAt(shape, p, [
            sign * (l.width / 2 - p.outerRadius / 2),
            l.depth - p.outerRadius / 2,
            p.bottomThickness / 2,
          ]),
        ).toBeGreaterThan(0.007)
      }
      // The thick rear wall slab stays solid: with wallThickness above the
      // side frame, clipped side cells must not notch the corner post where
      // the side wall meets the rear wall.
      for (const sign of [-1, 1]) {
        expect(
          volumeAt(shape, p, [
            sign * (l.width / 2 - p.wallThickness / 2),
            3.75,
            30,
          ]),
        ).toBeGreaterThan(0.007)
      }
    } finally {
      shape.delete()
    }
  }, 180000)
  it('clips slot-adjacent cells to the rounded 2 mm safety ring', async () => {
    const p = {
      ...small,
      x: 120,
      y: 80,
      z: 35,
      slotLength: 85,
      slotWidth: 5,
      tiltAngle: 0,
      honeycombMode: true,
    }
    const l = tissueBoxLayout(p)
    const lattice = OPENGRID_HONEYCOMB_CONFIGURATION
    const slotCoreHalf = p.slotLength / 2 - p.slotWidth / 2
    const safetyRing = lattice.bottomHoleSafetyRing
    const protectedRadius = p.slotWidth / 2 + safetyRing
    const distanceToSlot = ([u, v]: [number, number]) =>
      Math.hypot(
        Math.max(0, Math.abs(u) - slotCoreHalf),
        Math.abs(v - l.depth / 2),
      )
    const clippedCells = tissueBoxCells(p).filter(
      (cell) => cell.wall === 'bottom' && cell.clipToSlotSafetyRing,
    )
    const furthestOutsideDistance = (cell: (typeof clippedCells)[number]) =>
      Math.max(...cell.polygon.map(distanceToSlot))
    const sideCell = clippedCells
      .filter((cell) => Math.abs(cell.u) < slotCoreHalf - lattice.cellRadius)
      .sort(
        (left, right) =>
          furthestOutsideDistance(right) - furthestOutsideDistance(left),
      )[0]
    const endCell = clippedCells
      .filter((cell) => Math.abs(cell.u) > slotCoreHalf)
      .sort(
        (left, right) =>
          furthestOutsideDistance(right) - furthestOutsideDistance(left),
      )[0]
    expect(sideCell).toBeDefined()
    expect(endCell).toBeDefined()

    const openingProbe = (cell: (typeof clippedCells)[number]) => {
      const centroid = cell.polygon.reduce(
        (sum, point) => [
          sum[0] + point[0] / cell.polygon.length,
          sum[1] + point[1] / cell.polygon.length,
        ],
        [0, 0],
      )
      const vertices = [...cell.polygon].sort(
        (left, right) => distanceToSlot(right) - distanceToSlot(left),
      )
      for (const vertex of vertices) {
        for (const fraction of [0.9, 0.8, 0.7, 0.6]) {
          const point: [number, number] = [
            centroid[0] + (vertex[0] - centroid[0]) * fraction,
            centroid[1] + (vertex[1] - centroid[1]) * fraction,
          ]
          if (distanceToSlot(point) > protectedRadius + 0.25) return point
        }
      }
      throw new Error(
        `No probe point outside the slot safety ring: ${JSON.stringify({
          center: [cell.u, cell.v],
          centerDistance: distanceToSlot([cell.u, cell.v]),
          vertexDistances: cell.polygon.map(distanceToSlot),
          protectedRadius,
        })}`,
      )
    }
    const sideProbe = openingProbe(sideCell!)
    const endProbe = openingProbe(endCell!)
    const progress: any[] = []
    const shape = await build(p, {
      reportProgress: (value: unknown) => progress.push(value),
    })
    try {
      expect(tissueBoxQuality(shape)).toEqual({ valid: true, solids: 1 })
      for (const [u, v] of [sideProbe, endProbe]) {
        for (const z of [0.02, p.bottomThickness - 0.02])
          expect(volumeAt(shape, p, [u, v, z])).toBeLessThan(1e-6)
      }
      expect(
        volumeAt(shape, p, [0, l.depth / 2, p.bottomThickness / 2]),
      ).toBeLessThan(1e-6)
      expect(
        volumeAt(shape, p, [
          0,
          l.depth / 2 + protectedRadius - 0.5,
          p.bottomThickness / 2,
        ]),
      ).toBeGreaterThan(0.007)
      for (const sign of [-1, 1]) {
        expect(
          volumeAt(shape, p, [
            sign * (slotCoreHalf + protectedRadius - 0.5),
            l.depth / 2,
            p.bottomThickness / 2,
          ]),
        ).toBeGreaterThan(0.007)
      }
      expect(progress).toContainEqual(
        expect.objectContaining({
          completed: tissueBoxCells(p).length,
          total: tissueBoxCells(p).length,
          unit: 'cells',
        }),
      )
    } finally {
      shape.delete()
    }
  }, 180000)
  it('rejects stale generation before building', async () => {
    await expect(
      build(small, { isGenerationCurrent: () => false }),
    ).rejects.toThrow('STALE_GENERATION')
  })
})

it.each([0, 12.5])(
  'preserves corner radius and real locked socket cavities at R=%s',
  async (outerRadius) => {
    const p = { ...small, outerRadius, tiltAngle: 45 }
    const shape = await build(p)
    const source = await importOpenGridOpenConnectShelfLockedSlot(
      new Blob([
        readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
      ]),
    )
    try {
      const bounds = shape.boundingBox
      const expected = tissueBoxBounds(p)
      try {
        for (let axis = 0; axis < 3; axis++) {
          expect(bounds.bounds[0][axis]).toBeCloseTo(expected.min[axis]!, 3)
          expect(bounds.bounds[1][axis]).toBeCloseTo(expected.max[axis]!, 3)
        }
      } finally {
        bounds.delete()
      }
      for (const [x, y, z] of tissueBoxSlotOrigins(p)) {
        const cutter = placeOpenGridOpenConnectShelfLockedSlot(source, [
          -x,
          -y,
          z,
        ])
        const turned = inPrintFrame(cutter.rotate(180, [0, 0, 0], [0, 0, 1]), p)
        const residual = shape.intersect(turned)
        try {
          expect(Math.abs(measureVolume(residual))).toBeLessThan(0.001)
        } finally {
          residual.delete()
          turned.delete()
        }
      }
      const l = tissueBoxLayout(p)
      const cornerVolume = volumeAt(shape, p, [
        l.width / 2 - 0.3,
        l.depth - 0.3,
        l.height / 2,
      ])
      if (outerRadius === 0) expect(cornerVolume).toBeGreaterThan(0.007)
      else expect(cornerVolume).toBeLessThan(1e-6)
    } finally {
      shape.delete()
      source.delete()
    }
  },
  180000,
)

it('cancels between honeycomb batches and leaves a subsequent build usable', async () => {
  let current = true
  await expect(
    build(
      { ...small, honeycombMode: true },
      {
        isGenerationCurrent: () => current,
        reportProgress: () => {
          current = false
        },
      },
    ),
  ).rejects.toThrow('STALE_GENERATION')
  const shape = await build(small)
  try {
    expect(tissueBoxQuality(shape)).toEqual({ valid: true, solids: 1 })
  } finally {
    shape.delete()
  }
}, 180000)

it('keeps a full mounting pad around the socket on the smallest rounded box', async () => {
  const p = {
    ...small,
    x: 40,
    y: 40,
    z: 24,
    outerRadius: 10,
    tiltAngle: 45,
    slotLength: 25,
    slotWidth: 10,
  }
  const shape = await build(p)
  const rowZ = tissueBoxSlotOrigins(p)[0]![2]
  const probe = inPrintFrame(
    makeBox([-13.6, 1.9, rowZ - 0.1], [-13.4, 2.1, rowZ + 0.1]),
    p,
  )
  const common = shape.intersect(probe)
  try {
    expect(Math.abs(measureVolume(common))).toBeGreaterThan(0.007)
  } finally {
    common.delete()
    probe.delete()
    shape.delete()
  }
}, 180000)

it.each([1, 2, 5])(
  'retains the finished 5 mm frame with maximum slot extents and %s mm bottom',
  async (bottomThickness) => {
    const base = { ...small, bottomThickness, tiltAngle: 0 }
    const limits = tissueBoxSlotLimits(base)
    const p = { ...base, slotLength: limits.length, slotWidth: limits.width }
    const l = tissueBoxLayout(p)
    const shape = await build(p)
    try {
      // Immediately inside the required finished frame, including both rounded lips.
      for (const z of [0.02, bottomThickness - 0.02]) {
        for (const local of [
          [p.x / 2 - TISSUE_BOX_FRAME + 0.02, l.depth / 2, z],
          [0, p.wallThickness + TISSUE_BOX_FRAME - 0.02, z],
        ] as [number, number, number][]) {
          const center = local
          const probe = makeBox(
            center.map((v) => v - 0.005) as [number, number, number],
            center.map((v) => v + 0.005) as [number, number, number],
          )
          const common = shape.intersect(probe)
          try {
            expect(Math.abs(measureVolume(common))).toBeCloseTo(0.000001, 9)
          } finally {
            common.delete()
            probe.delete()
          }
        }
      }
    } finally {
      shape.delete()
    }
  },
  180000,
)

it.each([false, true])(
  'keeps rear corners square and the rear support flush, saving=%s',
  async (honeycombMode) => {
    const p = { ...small, outerRadius: 10, tiltAngle: 30, honeycombMode }
    const l = tissueBoxLayout(p)
    const shape = await build(p)
    try {
      for (const sign of [-1, 1]) {
        expect(
          volumeAt(shape, p, [sign * (l.width / 2 - 0.3), 0.3, l.height / 2]),
        ).toBeGreaterThan(0.007)
        expect(
          volumeAt(shape, p, [
            sign * (p.x / 2 - 0.3),
            p.wallThickness + 0.3,
            l.height / 2,
          ]),
        ).toBeLessThan(1e-6)
        expect(
          volumeAt(shape, p, [
            sign * (l.width / 2 - 0.3),
            l.depth - 0.3,
            l.height / 2,
          ]),
        ).toBeLessThan(1e-6)
        // External wedge near either outer edge, behind the box's rear wall.
        const probe = inPrintFrame(
          makeBox(
            [sign * (l.width / 2 - 0.3) - 0.1, l.plateThickness + 0.2, 1],
            [sign * (l.width / 2 - 0.3) + 0.1, l.plateThickness + 0.4, 1.2],
          ),
          p,
        )
        const common = shape.intersect(probe)
        try {
          expect(measureVolume(common)).toBeGreaterThan(0.007)
        } finally {
          common.delete()
          probe.delete()
        }
      }
      expect(tissueBoxQuality(shape)).toEqual({ valid: true, solids: 1 })
    } finally {
      shape.delete()
    }
  },
  180000,
)

it('cuts every socket of a multi-row upright grid with material between rows', async () => {
  const p = { ...small, z: 95, tiltAngle: 30 }
  const shape = await build(p)
  const source = await importOpenGridOpenConnectShelfLockedSlot(
    new Blob([
      readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
    ]),
  )
  try {
    const origins = tissueBoxSlotOrigins(p)
    expect(new Set(origins.map(([, , z]) => z)).size).toBeGreaterThan(1)
    for (const [x, y, z] of origins) {
      const cutter = inPrintFrame(
        placeOpenGridOpenConnectShelfLockedSlot(source, [-x, -y, z]).rotate(
          180,
          [0, 0, 0],
          [0, 0, 1],
        ),
        p,
      )
      const common = shape.intersect(cutter)
      try {
        expect(Math.abs(measureVolume(common))).toBeLessThan(0.001)
      } finally {
        common.delete()
        cutter.delete()
      }
    }
    const rowHeights = [...new Set(origins.map(([, , z]) => z))]
    const betweenRows = (rowHeights[0]! + rowHeights[1]!) / 2
    const probe = inPrintFrame(
      makeBox([-0.1, 1.9, betweenRows - 0.1], [0.1, 2.1, betweenRows + 0.1]),
      p,
    )
    const common = shape.intersect(probe)
    try {
      expect(measureVolume(common)).toBeGreaterThan(0.007)
    } finally {
      common.delete()
      probe.delete()
    }
    expect(tissueBoxQuality(shape)).toEqual({ valid: true, solids: 1 })
  } finally {
    shape.delete()
    source.delete()
  }
}, 180000)

it.each([0, 15, 45])(
  'places the entire dispensing bottom on the print plane at %s degrees',
  async (tiltAngle) => {
    const p = { ...small, tiltAngle }
    const shape = await build(p)
    const l = tissueBoxLayout(p)
    const faces = shape.faces
    let foundBottom = false
    try {
      for (const face of faces) {
        const box = face.boundingBox
        try {
          const [min, max] = box.bounds
          if (
            max[0]! - min[0]! > l.width - 1 &&
            max[1]! - min[1]! > l.depth - 1 &&
            Math.abs(min[2]!) < 1e-6 &&
            Math.abs(max[2]!) < 1e-6
          ) {
            const normal = face.normalAt()
            try {
              expect(normal.toTuple()[2]).toBeCloseTo(-1, 6)
            } finally {
              normal.delete()
            }
            foundBottom = true
          }
        } finally {
          box.delete()
        }
      }
      expect(foundBottom).toBe(true)
      const box = shape.boundingBox
      try {
        expect(box.bounds[0][2]).toBeCloseTo(0, 6)
      } finally {
        box.delete()
      }
    } finally {
      faces.forEach((face) => face.delete())
      shape.delete()
    }
  },
  180000,
)

it.each([0, 15, 45])(
  'makes both rear ends coplanar with the box at %s degrees',
  async (tiltAngle) => {
    const p = { ...small, tiltAngle }
    const l = tissueBoxLayout(p)
    const shape = await build(p)
    try {
      const box = shape.boundingBox
      try {
        expect(box.bounds[0][2]).toBeCloseTo(0, 6)
        expect(box.bounds[1][2]).toBeCloseTo(l.height, 6)
      } finally {
        box.delete()
      }
      // Near both X edges, away from sockets: material reaches the horizontal ends.
      for (const z of [0.2, l.height - 0.2]) {
        const backY = (-l.offsetY + z * l.sine) / l.cosine
        for (const sign of [-1, 1]) {
          expect(
            volumeAt(shape, p, [sign * (l.width / 2 - 0.3), backY + 0.4, z]),
          ).toBeGreaterThan(0.007)
        }
      }
      expect(tissueBoxQuality(shape)).toEqual({ valid: true, solids: 1 })
    } finally {
      shape.delete()
    }
  },
  180000,
)

it.each([
  ['left', 'top'],
  ['left', 'bottom'],
  ['right', 'top'],
  ['right', 'bottom'],
  ['center', 'center'],
] as const)(
  'keeps %s/%s aligned tissue sockets inside a valid body',
  async (horizontal, vertical) => {
    const p = {
      ...small,
      x: 73,
      z: 67,
      tiltAngle: 45,
      openConnectHorizontalAlignment: horizontal,
      openConnectVerticalAlignment: vertical,
    }
    const shape = await build(p)
    const source = await importOpenGridOpenConnectShelfLockedSlot(
      new Blob([
        readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
      ]),
    )
    try {
      expect(tissueBoxQuality(shape)).toEqual({ valid: true, solids: 1 })
      for (const [x, y, z] of tissueBoxSlotOrigins(p)) {
        const cutter = placeOpenGridOpenConnectShelfLockedSlot(source, [
          -x,
          -y,
          z,
        ])
        const turned = inPrintFrame(cutter.rotate(180, [0, 0, 0], [0, 0, 1]), p)
        const residual = shape.intersect(turned)
        try {
          expect(Math.abs(measureVolume(residual))).toBeLessThan(0.001)
        } finally {
          residual.delete()
          turned.delete()
        }
      }
      const bounds = shape.boundingBox
      try {
        const expected = tissueBoxBounds(p)
        for (let axis = 0; axis < 3; axis++) {
          expect(bounds.bounds[0][axis]).toBeCloseTo(expected.min[axis]!, 3)
          expect(bounds.bounds[1][axis]).toBeCloseTo(expected.max[axis]!, 3)
        }
      } finally {
        bounds.delete()
      }
    } finally {
      shape.delete()
      source.delete()
    }
  },
  120_000,
)
