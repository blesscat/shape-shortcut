import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  boundsForOpenGridOrganizerBox,
  openGridOrganizerBoxDetachableSocketPosesFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  openGridOrganizerBoxLayoutFor,
  type OpenGridOrganizerBoxParameters,
} from '../../src/cad-contract/units'
import {
  buildModelBRep,
  type KernelBuildContext,
} from '../../src/cad-kernel/model'
import { buildOpenGridOrganizerBox } from '../../src/cad-kernel/components/opengrid-organizer-box/builder'
import { assertOpenGridOrganizerBoxGeometry } from '../../src/cad-kernel/components/opengrid-organizer-box/quality'
import { makeOpenGridStackingTopRail } from '../../src/cad-kernel/components/opengrid-stackable-box/geometry'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import {
  buildOpenGridDetachableCornerSeatFromReference,
  buildOpenGridDetachableCornerSeatSocketVoid,
  importOpenGridDetachableCornerSeatHolderReference,
  importOpenGridDetachableCornerSeatReference,
  placeOpenGridDetachableCornerSeatMaleShape,
  placeOpenGridDetachableCornerSeatSocketShape,
} from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')
const DETACHABLE_CORNER_SEAT_ASSET_URL = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-v13.step',
  import.meta.url,
)
const DETACHABLE_CORNER_SEAT_HOLDER_ASSET_URL = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-holder-11.step',
  import.meta.url,
)

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function parameters(
  overrides: Partial<OpenGridOrganizerBoxParameters> = {},
): OpenGridOrganizerBoxParameters {
  return { ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS, ...overrides }
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Keep cleanup failures from hiding the geometry assertion.
  }
}

function probeVolume(
  shape: Shape3D,
  bounds: [[number, number, number], [number, number, number]],
): number {
  const probe = makeBox(bounds[0], bounds[1])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    deleteShape(probe)
  }
}

function hasIntegratedSeatChamferAt(
  shape: Shape3D,
  center: readonly [number, number],
): boolean {
  const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION
  let found = false
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      if (found) continue
      if (face.surface.surfaceType !== 'CONE') continue
      const [minimum, maximum] = boundingBox.bounds
      const faceCenterX = (minimum[0] + maximum[0]) / 2
      const faceCenterY = (minimum[1] + maximum[1]) / 2
      const planSpan = Math.max(
        maximum[0] - minimum[0],
        maximum[1] - minimum[1],
      )
      const matchesSeatChamfer =
        Math.abs(faceCenterX - center[0]) <= 0.08 &&
        Math.abs(faceCenterY - center[1]) <= 0.08 &&
        planSpan <= configuration.integratedSeatDiameter + 0.2 &&
        minimum[2] <= configuration.integratedSeatMinZ + 0.05 &&
        maximum[2] <=
          configuration.integratedSeatMinZ +
            configuration.integratedSeatBottomChamfer +
            0.1
      if (matchesSeatChamfer) found = true
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return found
}

function horizontalFaceZValuesAt(
  shape: Shape3D,
  point: [number, number],
): number[] {
  const values: number[] = []
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      const [minimum, maximum] = boundingBox.bounds
      const isHorizontalPlane =
        face.surface.surfaceType === 'PLANE' && maximum[2] - minimum[2] < 1e-5
      const containsPoint =
        minimum[0] <= point[0] &&
        maximum[0] >= point[0] &&
        minimum[1] <= point[1] &&
        maximum[1] >= point[1]
      if (isHorizontalPlane && containsPoint) {
        values.push((minimum[2] + maximum[2]) / 2)
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return values
}

type MarkerSlotFootprint = {
  minimum: [number, number]
  maximum: [number, number]
}

function markerSlotFootprintAt(
  shape: Shape3D,
  center: [number, number],
): MarkerSlotFootprint | null {
  const indicator = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male.indicator
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      const [minimum, maximum] = boundingBox.bounds as [
        [number, number, number],
        [number, number, number],
      ]
      const horizontalSpan = maximum[0] - minimum[0]
      const verticalSpan = maximum[1] - minimum[1]
      const hasMarkerFootprint =
        (horizontalSpan <= indicator.radialLength + 0.2 &&
          verticalSpan <= indicator.width + 0.2) ||
        (horizontalSpan <= indicator.width + 0.2 &&
          verticalSpan <= indicator.radialLength + 0.2)
      const isMarkerFloor =
        face.surface.surfaceType === 'PLANE' &&
        Math.abs(minimum[2] - indicator.depth) <= 0.02 &&
        Math.abs(maximum[2] - indicator.depth) <= 0.02 &&
        hasMarkerFootprint &&
        minimum[0] <= center[0] &&
        maximum[0] >= center[0] &&
        minimum[1] <= center[1] &&
        maximum[1] >= center[1]
      if (isMarkerFloor) {
        return {
          minimum: [minimum[0], minimum[1]],
          maximum: [maximum[0], maximum[1]],
        }
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return null
}

describe('OpenGrid organizer-box B-Rep', () => {
  it('builds the standard top rail as a standalone perimeter solid', () => {
    const input = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDiameter: 10,
      holeDepth: 8,
      wallThickness: 3,
      cornerSeatMode: 'none',
      boxMode: 'stackable',
    })
    const layout = openGridOrganizerBoxLayoutFor(input)
    if (!layout.stacking) {
      throw new Error('EXPECTED_ORGANIZER_BOX_STACKING_LAYOUT')
    }
    const rail = makeOpenGridStackingTopRail({
      footprint: layout.footprint,
      hostTopZ: layout.bodyHeight,
      riserHeight: layout.stacking.riserHeight,
    })
    try {
      const bounds = rail.boundingBox
      try {
        expect(bounds.bounds[0][2]).toBeCloseTo(layout.bodyHeight - 0.02, 5)
        expect(bounds.bounds[1][2]).toBeCloseTo(layout.stacking.externalTopZ, 5)
      } finally {
        bounds.delete()
      }
      expect(measureVolume(rail)).toBeGreaterThan(0)
    } finally {
      deleteShape(rail)
    }
  })

  it('mates a standard Grid Box at the requested upper-bottom datum', () => {
    const input = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDiameter: 10,
      holeDepth: 8,
      wallThickness: 3,
      cornerSeatMode: 'none',
      boxMode: 'stackable',
      stackingClearanceHeight: 3.5,
    })
    const layout = openGridOrganizerBoxLayoutFor(input)
    if (!layout.stacking) {
      throw new Error('EXPECTED_ORGANIZER_BOX_STACKING_LAYOUT')
    }
    const organizer = buildOpenGridOrganizerBox(input)
    const upper = buildOpenGridStackableBox({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: layout.gridCountX,
      y: layout.gridCountY,
      height: 10,
      cornerSeatMode: 'none',
    })
    try {
      const seated = upper.clone().translate(0, 0, layout.stacking.seatDatumZ)
      const overLowered = upper
        .clone()
        .translate(
          0,
          0,
          layout.stacking.seatDatumZ -
            OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingClearance -
            0.05,
        )
      let seatedIntersection: Shape3D | null = null
      let overLoweredIntersection: Shape3D | null = null
      try {
        seatedIntersection = organizer.intersect(seated)
        overLoweredIntersection = organizer.intersect(overLowered)
        expect(measureVolume(seatedIntersection)).toBeLessThan(0.01)
        expect(measureVolume(overLoweredIntersection)).toBeGreaterThan(0.01)
      } finally {
        deleteShape(seatedIntersection)
        deleteShape(overLoweredIntersection)
        deleteShape(seated)
        deleteShape(overLowered)
      }
    } finally {
      deleteShape(organizer)
      deleteShape(upper)
    }
  }, 180_000)

  it('carries the male bottom indicator recess on the reference solid', async () => {
    const maleReference = await importOpenGridDetachableCornerSeatReference(
      new Blob([await readFile(DETACHABLE_CORNER_SEAT_ASSET_URL)], {
        type: 'model/step',
      }),
    )
    const markedMale =
      buildOpenGridDetachableCornerSeatFromReference(maleReference)
    try {
      const indicator =
        OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male.indicator
      const maleFootprint = markerSlotFootprintAt(markedMale, [0, 0])
      expect(maleFootprint).not.toBeNull()
      if (!maleFootprint) return
      expect(maleFootprint.maximum[0] - maleFootprint.minimum[0]).toBeCloseTo(
        indicator.radialLength,
        3,
      )
      expect(maleFootprint.maximum[1] - maleFootprint.minimum[1]).toBeCloseTo(
        indicator.width,
        3,
      )
    } finally {
      deleteShape(markedMale)
      deleteShape(maleReference)
    }
  }, 180_000)

  it('lays stacking seams on interior grid lines of a 2x2-cell box', async () => {
    const input = parameters({
      holeCountX: 2,
      holeCountY: 2,
      holeDiameter: 20,
      wallThickness: 3,
      cornerSeatMode: 'detachable-corner-seat',
      boxMode: 'stackable',
    })
    const [maleReference, holderReference] = await Promise.all([
      importOpenGridDetachableCornerSeatReference(
        new Blob([await readFile(DETACHABLE_CORNER_SEAT_ASSET_URL)], {
          type: 'model/step',
        }),
      ),
      importOpenGridDetachableCornerSeatHolderReference(
        new Blob([await readFile(DETACHABLE_CORNER_SEAT_HOLDER_ASSET_URL)], {
          type: 'model/step',
        }),
      ),
    ])
    const box = buildOpenGridOrganizerBox(input, {
      detachableCornerSeatReference: maleReference,
      detachableCornerSeatHolderReference: holderReference,
    })
    try {
      const layout = openGridOrganizerBoxLayoutFor(input)
      expect(layout.gridCountX).toBe(2)
      expect(layout.gridCountY).toBe(2)

      const [width, depth] = layout.footprint
      const seamX = -width / 2 + OPENGRID_STACKABLE_BOX_CONFIGURATION.gridPitch
      const seamY = -depth / 2 + OPENGRID_STACKABLE_BOX_CONFIGURATION.gridPitch
      expect(
        probeVolume(box, [
          [seamX - 0.1, 4.9, 0.05],
          [seamX + 0.1, 5.1, 0.15],
        ]),
      ).toBe(0)
      expect(
        probeVolume(box, [
          [4.9, seamY - 0.1, 0.05],
          [5.1, seamY + 0.1, 0.15],
        ]),
      ).toBe(0)
    } finally {
      deleteShape(box)
      deleteShape(maleReference)
      deleteShape(holderReference)
    }
  }, 180_000)

  it('cuts four B-oriented retaining sockets directly into one box solid', async () => {
    const [maleReference, holderReference] = await Promise.all([
      importOpenGridDetachableCornerSeatReference(
        new Blob([await readFile(DETACHABLE_CORNER_SEAT_ASSET_URL)], {
          type: 'model/step',
        }),
      ),
      importOpenGridDetachableCornerSeatHolderReference(
        new Blob([await readFile(DETACHABLE_CORNER_SEAT_HOLDER_ASSET_URL)], {
          type: 'model/step',
        }),
      ),
    ])
    const input = parameters({
      holeCountX: 1,
      holeCountY: 1,
      cornerSeatMode: 'detachable-corner-seat',
    })
    const shape = buildOpenGridOrganizerBox(input, {
      detachableCornerSeatReference: maleReference,
      detachableCornerSeatHolderReference: holderReference,
    })
    const markedMale =
      buildOpenGridDetachableCornerSeatFromReference(maleReference)
    const socketVoid =
      buildOpenGridDetachableCornerSeatSocketVoid(holderReference)
    try {
      const expected = boundsForOpenGridOrganizerBox(input)
      const actual = shape.boundingBox
      try {
        expect(actual.bounds[0][2]).toBeCloseTo(expected.min[2], 5)
        expect(actual.bounds[1][2]).toBeCloseTo(expected.max[2], 5)
      } finally {
        actual.delete()
      }

      const poses = openGridOrganizerBoxDetachableSocketPosesFor(input)
      expect(poses.map((pose) => pose.rotationDegrees)).toEqual([
        0, 90, 180, 270,
      ])

      const layout = openGridOrganizerBoxLayoutFor(input)
      const cavityCenter = layout.cavityCenters[0]
      if (!cavityCenter) {
        throw new Error('EXPECTED_ORGANIZER_BOX_CAVITY')
      }
      const horizontalFaceZValues = horizontalFaceZValuesAt(shape, cavityCenter)
      const cavityFloor = Math.max(
        ...horizontalFaceZValues.filter(
          (value) => value < layout.bodyHeight - 1e-5,
        ),
      )
      const holderTop =
        OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.depth
      expect(cavityFloor - layout.interfaceFloorDatum).toBeCloseTo(
        input.bottomThickness,
        5,
      )
      expect(cavityFloor).toBeGreaterThan(holderTop)

      for (const pose of poses) {
        const placedVoid = placeOpenGridDetachableCornerSeatSocketShape(
          socketVoid,
          pose,
        )
        const placedMale = placeOpenGridDetachableCornerSeatMaleShape(
          markedMale,
          pose,
        )
        let voidIntersection: Shape3D | null = null
        let maleIntersection: Shape3D | null = null
        try {
          voidIntersection = shape.intersect(placedVoid)
          maleIntersection = shape.intersect(placedMale)
          expect(measureVolume(voidIntersection)).toBeLessThanOrEqual(
            OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance,
          )
          expect(measureVolume(maleIntersection)).toBeLessThanOrEqual(
            OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance,
          )
        } finally {
          deleteShape(voidIntersection)
          deleteShape(maleIntersection)
          deleteShape(placedVoid)
          deleteShape(placedMale)
        }
      }

      const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
      const probeRadius =
        (configuration.female.outerDiameter +
          configuration.male.headMaxLength) /
        4
      for (const pose of poses) {
        const [x, y] = pose.center
        const rotation = (pose.rotationDegrees * Math.PI) / 180
        const [ux, uy] = [Math.cos(rotation), Math.sin(rotation)]
        const materialX = x + ux * probeRadius
        const materialY = y + uy * probeRadius
        const pocketX = x + ux * (configuration.male.headMaxLength / 4)
        const pocketY = y + uy * (configuration.male.headMaxLength / 4)
        const materialVolume = probeVolume(shape, [
          [materialX - 0.08, materialY - 0.08, 0.71],
          [materialX + 0.08, materialY + 0.08, 0.79],
        ])
        const voidVolume = probeVolume(shape, [
          [pocketX - 0.08, pocketY - 0.08, 0.71],
          [pocketX + 0.08, pocketY + 0.08, 0.79],
        ])
        expect(materialVolume, pose.corner).toBeGreaterThan(0.0001)
        expect(voidVolume, pose.corner).toBeLessThanOrEqual(
          configuration.intersectionVolumeTolerance,
        )
      }

      const shiftedMale = maleReference.translate(0, 0.5, 0)
      try {
        expect(() =>
          assertOpenGridOrganizerBoxGeometry(
            shape,
            input,
            holderReference,
            shiftedMale,
          ),
        ).toThrow(
          'OPENGRID_ORGANIZER_BOX_QUALITY_INVALID:socket-male-collision',
        )
      } finally {
        deleteShape(shiftedMale)
      }

      expect(
        probeVolume(shape, [
          [-0.2, -0.2, -1],
          [0.2, 0.2, -0.5],
        ]),
      ).toBe(0)
    } finally {
      deleteShape(socketVoid)
      deleteShape(markedMale)
      deleteShape(shape)
      deleteShape(maleReference)
      deleteShape(holderReference)
    }
  }, 180_000)

  it.each(['none', 'integrated'] as const)(
    'keeps the floor solid at socket corners in %s seat mode',
    (cornerSeatMode) => {
      const detachablePoses = openGridOrganizerBoxDetachableSocketPosesFor(
        parameters({
          holeCountX: 1,
          holeCountY: 1,
          cornerSeatMode: 'detachable-corner-seat',
        }),
      )
      const input = parameters({
        holeCountX: 1,
        holeCountY: 1,
        cornerSeatMode,
      })
      const shape = buildOpenGridOrganizerBox(input)
      try {
        for (const pose of detachablePoses) {
          const [x, y] = pose.center
          expect(
            probeVolume(shape, [
              [x - 0.1, y - 0.1, 0.6],
              [x + 0.1, y + 0.1, 0.9],
            ]),
            pose.corner,
          ).toBeGreaterThan(0)
        }
      } finally {
        deleteShape(shape)
      }
    },
  )

  it.each([
    ['normal', 'none'],
    ['normal', 'detachable-corner-seat'],
    ['normal', 'integrated'],
    ['stackable', 'none'],
    ['stackable', 'detachable-corner-seat'],
    ['stackable', 'integrated'],
  ] as const)(
    'builds one valid solid for the %s/%s combination',
    async (boxMode, cornerSeatMode) => {
      const input = parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeDiameter: 10,
        holeDepth: 8,
        wallThickness: boxMode === 'stackable' ? 3 : 2,
        boxMode,
        cornerSeatMode,
      })
      let maleReference: Shape3D | undefined
      let holderReference: Shape3D | undefined
      if (cornerSeatMode === 'detachable-corner-seat') {
        ;[maleReference, holderReference] = await Promise.all([
          importOpenGridDetachableCornerSeatReference(
            new Blob([await readFile(DETACHABLE_CORNER_SEAT_ASSET_URL)], {
              type: 'model/step',
            }),
          ),
          importOpenGridDetachableCornerSeatHolderReference(
            new Blob(
              [await readFile(DETACHABLE_CORNER_SEAT_HOLDER_ASSET_URL)],
              { type: 'model/step' },
            ),
          ),
        ])
      }

      const shape = buildOpenGridOrganizerBox(input, {
        detachableCornerSeatReference: maleReference,
        detachableCornerSeatHolderReference: holderReference,
      })
      try {
        const layout = openGridOrganizerBoxLayoutFor(input)
        const expected = boundsForOpenGridOrganizerBox(input)
        const actual = shape.boundingBox
        try {
          expect(actual.bounds[0][2]).toBeCloseTo(expected.min[2], 2)
          expect(actual.bounds[1][2]).toBeCloseTo(expected.max[2], 2)
        } finally {
          actual.delete()
        }
        expect(measureVolume(shape)).toBeGreaterThan(0)
        if (cornerSeatMode === 'detachable-corner-seat') {
          for (const pose of openGridOrganizerBoxDetachableSocketPosesFor(
            input,
          )) {
            const [x, y] = pose.center
            expect(
              probeVolume(shape, [
                [x - 0.1, y - 0.1, 0.6],
                [x + 0.1, y + 0.1, 0.9],
              ]),
              pose.corner,
            ).toBeLessThanOrEqual(
              OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance,
            )
          }
        }

        const halfWidth = layout.footprint[0] / 2
        const bottomEdgeVolume = probeVolume(shape, [
          [halfWidth - 0.1, -0.2, 0.05],
          [halfWidth + 0.2, 0.2, 0.15],
        ])
        if (boxMode === 'stackable') {
          expect(bottomEdgeVolume).toBe(0)
          expect(layout.stacking).not.toBeNull()
          const railBaseZ = layout.stacking?.railBaseZ
          if (railBaseZ === undefined) {
            throw new Error('EXPECTED_ORGANIZER_BOX_STACKING_LAYOUT')
          }
          expect(
            probeVolume(shape, [
              [halfWidth - 0.5, -0.1, railBaseZ + 0.8],
              [halfWidth - 0.3, 0.1, railBaseZ + 0.9],
            ]),
          ).toBeGreaterThan(0)
        } else {
          expect(bottomEdgeVolume).toBeGreaterThan(0)
          expect(layout.stacking).toBeNull()
        }
      } finally {
        deleteShape(shape)
        deleteShape(maleReference)
        deleteShape(holderReference)
      }
    },
    180_000,
  )

  it('raises the fixed top rail by Z without moving the cavity', () => {
    const minimumInput = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDiameter: 10,
      holeDepth: 8,
      wallThickness: 3,
      cornerSeatMode: 'none',
      boxMode: 'stackable',
      stackingClearanceHeight: 3.5,
    })
    const raisedInput = { ...minimumInput, stackingClearanceHeight: 4 }
    const minimumShape = buildOpenGridOrganizerBox(minimumInput)
    const raisedShape = buildOpenGridOrganizerBox(raisedInput)
    try {
      const minimumLayout = openGridOrganizerBoxLayoutFor(minimumInput)
      const raisedLayout = openGridOrganizerBoxLayoutFor(raisedInput)
      expect(minimumLayout.stacking?.riserHeight).toBeCloseTo(0.3, 8)
      expect(minimumLayout.stacking?.seatDatumZ).toBeCloseTo(
        minimumLayout.bodyHeight + minimumInput.stackingClearanceHeight,
        8,
      )
      expect(raisedLayout.bodyHeight).toBe(minimumLayout.bodyHeight)
      expect(raisedLayout.cavityCenters).toEqual(minimumLayout.cavityCenters)

      const minimumBounds = minimumShape.boundingBox
      const raisedBounds = raisedShape.boundingBox
      try {
        expect(
          raisedBounds.bounds[1][2] - minimumBounds.bounds[1][2],
        ).toBeCloseTo(0.5, 5)
        expect(raisedBounds.bounds[0][2]).toBeCloseTo(
          minimumBounds.bounds[0][2],
          5,
        )
      } finally {
        minimumBounds.delete()
        raisedBounds.delete()
      }

      const center = minimumLayout.cavityCenters[0]
      if (!center) throw new Error('EXPECTED_ORGANIZER_BOX_CAVITY')
      const minimumFloor = Math.max(
        ...horizontalFaceZValuesAt(minimumShape, center).filter(
          (z) => z < minimumLayout.bodyHeight,
        ),
      )
      const raisedFloor = Math.max(
        ...horizontalFaceZValuesAt(raisedShape, center).filter(
          (z) => z < raisedLayout.bodyHeight,
        ),
      )
      expect(raisedFloor).toBeCloseTo(minimumFloor, 5)
      const minimumStacking = minimumLayout.stacking
      if (!minimumStacking) {
        throw new Error('EXPECTED_ORGANIZER_BOX_STACKING_LAYOUT')
      }
      expect(
        minimumStacking.externalTopZ - minimumStacking.railBaseZ,
      ).toBeCloseTo(OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight, 8)
    } finally {
      deleteShape(minimumShape)
      deleteShape(raisedShape)
    }
  }, 180_000)

  it('builds blind circular cavities with a solid top and four-corner mode', () => {
    const input = parameters({
      holeCountX: 2,
      holeCountY: 2,
      holeDiameter: 12,
      holeDepth: 18,
      bottomThickness: 3,
      cornerSeatMode: 'integrated',
      boxMode: 'normal',
    })
    const shape = buildOpenGridOrganizerBox(input)

    try {
      const expected = boundsForOpenGridOrganizerBox(input)
      const actual = shape.boundingBox
      try {
        expect(actual.bounds[0]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.min[0], 2),
            expect.closeTo(expected.min[1], 2),
            expect.closeTo(expected.min[2], 2),
          ]),
        )
        expect(actual.bounds[1]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.max[0], 2),
            expect.closeTo(expected.max[1], 2),
            expect.closeTo(expected.max[2], 2),
          ]),
        )
      } finally {
        actual.delete()
      }

      const layout = openGridOrganizerBoxLayoutFor(input)
      const halfWidth = layout.footprint[0] / 2
      const firstCavity = layout.cavityCenters[0] ?? [0, 0]
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect(
        probeVolume(shape, [
          [
            firstCavity[0] - 0.2,
            firstCavity[1] - 0.2,
            layout.bodyHeight - input.holeDepth / 2,
          ],
          [
            firstCavity[0] + 0.2,
            firstCavity[1] + 0.2,
            layout.bodyHeight - input.holeDepth / 2 + 0.1,
          ],
        ]),
      ).toBe(0)
      expect(
        probeVolume(shape, [
          [
            firstCavity[0] - 0.2,
            firstCavity[1] - 0.2,
            layout.interfaceFloorDatum + input.bottomThickness / 2,
          ],
          [
            firstCavity[0] + 0.2,
            firstCavity[1] + 0.2,
            layout.interfaceFloorDatum + input.bottomThickness / 2 + 0.1,
          ],
        ]),
      ).toBeGreaterThan(0)
      expect(
        probeVolume(shape, [
          [halfWidth - 0.2, -0.2, layout.bodyHeight / 2],
          [halfWidth + 0.1, 0.2, layout.bodyHeight / 2 + 0.1],
        ]),
      ).toBeGreaterThan(0)

      const interfaceParameters = {
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        x: layout.gridCountX,
        y: layout.gridCountY,
        cornerSeatMode: 'integrated' as const,
        fullBottomHoleGrid: false,
        basePlateMode: false,
        thinShellMode: false,
        honeycombMode: false,
      }
      const footZ =
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ +
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatHeight / 2
      const footCenters =
        openGridStackableBoxSocketCentersFor(interfaceParameters)
      expect(footCenters).toHaveLength(4)
      for (const [x, y] of footCenters) {
        expect(hasIntegratedSeatChamferAt(shape, [x, y])).toBe(true)
        expect(
          probeVolume(shape, [
            [x - 0.2, y - 0.2, footZ - 0.05],
            [x + 0.2, y + 0.2, footZ + 0.05],
          ]),
        ).toBeGreaterThan(0)
      }
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('builds fixed-orientation hexagonal cavities with the stackable bottom', () => {
    const input = parameters({
      holeCountX: 3,
      holeCountY: 1,
      holeSpacingMode: 'independent',
      holeSpacingX: 2,
      holeSpacingY: 4,
      holeShape: 'hexagon',
      holeDiameter: 12,
      wallThickness: 3,
      cornerSeatMode: 'none',
      boxMode: 'stackable',
    })
    const shape = buildOpenGridOrganizerBox(input)

    try {
      const expected = boundsForOpenGridOrganizerBox(input)
      const actual = shape.boundingBox
      try {
        expect(actual.bounds[1][2]).toBeCloseTo(expected.max[2], 2)
        expect(actual.bounds[1][0]).toBeCloseTo(expected.max[0], 2)
        expect(actual.bounds[1][1]).toBeCloseTo(expected.max[1], 2)
      } finally {
        actual.delete()
      }

      const layout = openGridOrganizerBoxLayoutFor(input)
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect(
        probeVolume(shape, [
          [expected.max[0] - 0.1, -0.2, 0.05],
          [expected.max[0] + 0.2, 0.2, 0.15],
        ]),
      ).toBe(0)
      expect(layout.cavityCenters).toHaveLength(3)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each(['triangle', 'square', 'pentagon'] as const)(
    'builds fixed-orientation %s cavities',
    (holeShape) => {
      const input = parameters({
        holeCountX: 2,
        holeCountY: 1,
        holeShape,
        holeDiameter: 12,
        holeSpacingMode: 'independent',
        holeSpacingX: 3,
        holeSpacingY: 5,
        bottomThickness: 4,
        cornerSeatMode: 'integrated',
        boxMode: 'normal',
      })
      const shape = buildOpenGridOrganizerBox(input)

      try {
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(openGridOrganizerBoxLayoutFor(input).cavityCenters).toHaveLength(
          2,
        )
      } finally {
        deleteShape(shape)
      }
    },
  )

  it('is available through the kernel registry without loading external assets', async () => {
    const input = parameters({
      holeCountX: 1,
      holeCountY: 1,
      cornerSeatMode: 'integrated',
      boxMode: 'normal',
    })
    const context: KernelBuildContext = {
      getModularGridBaseTemplate: async () => {
        throw new Error('UNEXPECTED_TEMPLATE_LOAD')
      },
      getHswCellTemplate: async () => {
        throw new Error('UNEXPECTED_TEMPLATE_LOAD')
      },
    }
    const shape = await buildModelBRep('opengrid-organizer-box', input, context)
    try {
      expect(measureVolume(shape)).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('rejects invalid organizer-box geometry before Worker construction', async () => {
    const input = parameters({ holeDepth: 0 })
    const context: KernelBuildContext = {
      getModularGridBaseTemplate: async () => {
        throw new Error('UNEXPECTED_TEMPLATE_LOAD')
      },
      getHswCellTemplate: async () => {
        throw new Error('UNEXPECTED_TEMPLATE_LOAD')
      },
    }
    await expect(
      buildModelBRep('opengrid-organizer-box', input, context),
    ).rejects.toThrow('MODEL_PARAMETERS_INVALID')
  })
})
