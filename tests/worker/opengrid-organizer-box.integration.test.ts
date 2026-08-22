import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  makeBox,
  measureVolume,
  setOC,
  type Edge,
  type Shape3D,
} from 'replicad'
import {
  boundsForOpenGridOrganizerBox,
  openGridOrganizerBoxDetachableIndicatorPlacementFor,
  openGridOrganizerBoxDetachableSocketPosesFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
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
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-3.8.step',
  import.meta.url,
)
const DETACHABLE_CORNER_SEAT_HOLDER_ASSET_URL = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-holder.step',
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

function readEdgeStart(edge: Edge): [number, number] {
  const point = edge.startPoint
  try {
    return [point.x ?? Number.NaN, point.y ?? Number.NaN]
  } finally {
    point.delete()
  }
}

function markerTriangleVerticesAt(
  shape: Shape3D,
  center: [number, number],
): [number, number][] | null {
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    let edges: Edge[] = []
    try {
      const [minimum, maximum] = boundingBox.bounds as [
        [number, number, number],
        [number, number, number],
      ]
      const isMarkerFloor =
        face.surface.surfaceType === 'PLANE' &&
        Math.abs(minimum[2] - configuration.indicator.depth) <= 0.02 &&
        Math.abs(maximum[2] - configuration.indicator.depth) <= 0.02 &&
        maximum[0] - minimum[0] <= configuration.indicator.width + 0.2 &&
        maximum[1] - minimum[1] <= configuration.indicator.radialLength + 0.2 &&
        minimum[0] <= center[0] &&
        maximum[0] >= center[0] &&
        minimum[1] <= center[1] &&
        maximum[1] >= center[1]
      if (!isMarkerFloor) continue
      edges = face.edges
      if (edges.length !== 3) continue
      return edges
        .map(readEdgeStart)
        .sort(([firstX, firstY], [secondX, secondY]) => {
          if (firstX !== secondX) return firstX - secondX
          return firstY - secondY
        })
    } finally {
      edges.forEach((edge) => edge.delete())
      boundingBox.delete()
      face.delete()
    }
  }
  return null
}

function markerTriangleFloorCount(shape: Shape3D): number {
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  let count = 0
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    let edges: Edge[] = []
    try {
      const [minimum, maximum] = boundingBox.bounds as [
        [number, number, number],
        [number, number, number],
      ]
      const isMarkerFloor =
        face.surface.surfaceType === 'PLANE' &&
        Math.abs(minimum[2] - configuration.indicator.depth) <= 0.02 &&
        Math.abs(maximum[2] - configuration.indicator.depth) <= 0.02 &&
        maximum[0] - minimum[0] <= configuration.indicator.width + 0.2 &&
        maximum[1] - minimum[1] <= configuration.indicator.radialLength + 0.2
      if (!isMarkerFloor) continue
      edges = face.edges
      if (edges.length === 3) count += 1
    } finally {
      edges.forEach((edge) => edge.delete())
      boundingBox.delete()
      face.delete()
    }
  }
  return count
}

function rotateBottomViewPoint(
  point: [number, number],
  rotationDegrees: number,
): [number, number] {
  const radians = (rotationDegrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return [
    point[0] * cosine - point[1] * sine,
    point[0] * sine + point[1] * cosine,
  ]
}

function markerVerticesRelativeTo(
  vertices: readonly [number, number][],
  center: [number, number],
): [number, number][] {
  return vertices
    .map(([x, y]) => [x - center[0], y - center[1]] as [number, number])
    .sort(([firstX, firstY], [secondX, secondY]) => {
      if (firstX !== secondX) return firstX - secondX
      return firstY - secondY
    })
}

describe('OpenGrid organizer-box B-Rep', () => {
  it('places each female marker on its locked reference-arrow side', async () => {
    const input = parameters({
      holeCountX: 1,
      holeCountY: 1,
      bottomInterfaceMode: 'detachable-corner-seat',
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
    const markedMale =
      buildOpenGridDetachableCornerSeatFromReference(maleReference)
    const box = buildOpenGridOrganizerBox(input, {
      detachableCornerSeatReference: maleReference,
      detachableCornerSeatHolderReference: holderReference,
    })
    try {
      const maleVertices = markerTriangleVerticesAt(markedMale, [0, 0])
      expect(maleVertices).not.toBeNull()
      if (!maleVertices) return
      const maleRelativeVertices = markerVerticesRelativeTo(
        maleVertices,
        [0, 0],
      )
      const maleApex = [...maleRelativeVertices].sort(
        ([firstX], [secondX]) => secondX - firstX,
      )[0]
      expect(maleApex?.[0]).toBeCloseTo(
        OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.indicator.radialLength /
          2,
        3,
      )
      expect(maleApex?.[1]).toBeCloseTo(0, 3)

      for (const pose of openGridOrganizerBoxDetachableSocketPosesFor(input)) {
        const placement =
          openGridOrganizerBoxDetachableIndicatorPlacementFor(pose)
        const femaleVertices = markerTriangleVerticesAt(box, placement.center)
        expect(femaleVertices, pose.corner).not.toBeNull()
        if (!femaleVertices) continue

        const expectedVertices = markerVerticesRelativeTo(
          maleVertices.map((vertex) =>
            rotateBottomViewPoint(
              vertex,
              pose.rotationDegrees +
                OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.indicator
                  .lockRotationDegrees +
                180,
            ),
          ),
          [0, 0],
        )
        const actualVertices = markerVerticesRelativeTo(
          femaleVertices,
          placement.center,
        )
        expect(actualVertices, pose.corner).toHaveLength(3)
        actualVertices.forEach((actual, index) => {
          const expected = expectedVertices[index]
          expect(actual[0], pose.corner).toBeCloseTo(expected?.[0] ?? NaN, 3)
          expect(actual[1], pose.corner).toBeCloseTo(expected?.[1] ?? NaN, 3)
        })
      }
    } finally {
      deleteShape(box)
      deleteShape(markedMale)
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
      bottomInterfaceMode: 'detachable-corner-seat',
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
      expect(markerTriangleFloorCount(shape)).toBe(4)

      for (const pose of poses) {
        const indicator =
          openGridOrganizerBoxDetachableIndicatorPlacementFor(pose)
        const recessProbe = probeVolume(shape, [
          [indicator.center[0] - 0.08, indicator.center[1] - 0.08, 0.05],
          [indicator.center[0] + 0.08, indicator.center[1] + 0.08, 0.13],
        ])
        const materialProbe = probeVolume(shape, [
          [indicator.center[0] - 0.08, indicator.center[1] - 0.08, 0.17],
          [indicator.center[0] + 0.08, indicator.center[1] + 0.08, 0.25],
        ])
        expect(recessProbe, pose.corner).toBeLessThanOrEqual(
          OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance,
        )
        expect(materialProbe, pose.corner).toBeGreaterThan(0)
        expect(
          horizontalFaceZValuesAt(shape, indicator.center).some(
            (z) =>
              Math.abs(
                z -
                  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.indicator.depth,
              ) <= 0.02,
          ),
          pose.corner,
        ).toBe(true)
      }

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
      expect(cavityFloor - holderTop).toBeCloseTo(input.bottomThickness, 5)

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

      const fixedWorldSpaceTabProbes = [
        { corner: 'upper-left', material: [-15, 15], void: [-13, 15] },
        { corner: 'upper-right', material: [13, 13], void: [13, 15] },
        { corner: 'lower-right', material: [15, -15], void: [13, -15] },
        { corner: 'lower-left', material: [-13, -13], void: [-13, -15] },
      ] as const
      for (const probe of fixedWorldSpaceTabProbes) {
        const materialVolume = probeVolume(shape, [
          [probe.material[0] - 0.08, probe.material[1] - 0.08, 0.71],
          [probe.material[0] + 0.08, probe.material[1] + 0.08, 0.79],
        ])
        const voidVolume = probeVolume(shape, [
          [probe.void[0] - 0.08, probe.void[1] - 0.08, 0.71],
          [probe.void[0] + 0.08, probe.void[1] + 0.08, 0.79],
        ])
        expect(materialVolume, probe.corner).toBeGreaterThan(0.0001)
        expect(voidVolume, probe.corner).toBeLessThanOrEqual(
          OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance,
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

  it.each(['corner-seat', 'stackable'] as const)(
    'does not add detachable marker floors in %s mode',
    (bottomInterfaceMode) => {
      const input = parameters({
        holeCountX: 1,
        holeCountY: 1,
        bottomInterfaceMode,
      })
      const shape = buildOpenGridOrganizerBox(input)
      try {
        expect(markerTriangleFloorCount(shape)).toBe(0)
      } finally {
        deleteShape(shape)
      }
    },
  )

  it('builds blind circular cavities with a solid top and four-corner mode', () => {
    const input = parameters({
      holeCountX: 2,
      holeCountY: 2,
      holeDiameter: 12,
      holeDepth: 18,
      bottomThickness: 3,
      bottomInterfaceMode: 'corner-seat',
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
      bottomInterfaceMode: 'stackable',
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
        bottomInterfaceMode: 'corner-seat',
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
      bottomInterfaceMode: 'corner-seat',
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
