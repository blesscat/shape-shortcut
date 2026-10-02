import { importSTEP, type Shape3D } from 'replicad'
import type { ModelBounds } from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'

type Point3D = readonly [number, number, number]

export const OPENGRID_OPENCONNECT_SLOT_SOURCE_BOUNDS: ModelBounds = {
  min: [-13, -13.2, 0],
  max: [8.6, 9, 2.7],
}

const OPENGRID_OPENCONNECT_SLOT_ASSEMBLY_ROTATION_DEGREES = 180
const OPENGRID_OPENCONNECT_SLOT_ASSEMBLY_ROTATION_AXIS: Point3D = [0, 1, 0]
const OPENGRID_OPENCONNECT_SLOT_ASSEMBLY_ROTATION_ORIGIN: Point3D = [
  0,
  0,
  (OPENGRID_OPENCONNECT_SLOT_SOURCE_BOUNDS.min[2] +
    OPENGRID_OPENCONNECT_SLOT_SOURCE_BOUNDS.max[2]) /
    2,
]

export const openGridOpenConnectShelfLockedSlotAssetUrl = new URL(
  './assets/openconnect-slot-negative-lock.step',
  import.meta.url,
)

function boundsForShape(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function sourceBoundsMatch(shape: Shape3D, tolerance = 0.001): boolean {
  const actual = boundsForShape(shape)
  const expected = [
    OPENGRID_OPENCONNECT_SLOT_SOURCE_BOUNDS.min,
    OPENGRID_OPENCONNECT_SLOT_SOURCE_BOUNDS.max,
  ]
  return actual.every((point, pointIndex) =>
    point.every(
      (coordinate, coordinateIndex) =>
        Math.abs(coordinate - expected[pointIndex]![coordinateIndex]!) <=
        tolerance,
    ),
  )
}

export function transformOpenGridOpenConnectShelfSlotPoint(
  source: Point3D,
  origin: Point3D,
): [number, number, number] {
  const assembledZ =
    2 * OPENGRID_OPENCONNECT_SLOT_ASSEMBLY_ROTATION_ORIGIN[2] - source[2]
  return [
    -source[0] + origin[0],
    -assembledZ + origin[1],
    source[1] + origin[2],
  ]
}

export function openGridOpenConnectShelfSlotBoundsForOrigin(
  origin: Point3D,
): ModelBounds {
  const source = OPENGRID_OPENCONNECT_SLOT_SOURCE_BOUNDS
  const corners: Point3D[] = []
  for (const x of [source.min[0], source.max[0]]) {
    for (const y of [source.min[1], source.max[1]]) {
      for (const z of [source.min[2], source.max[2]]) {
        corners.push([x, y, z])
      }
    }
  }
  const transformed = corners.map((corner) =>
    transformOpenGridOpenConnectShelfSlotPoint(corner, origin),
  )
  return {
    min: [
      Math.min(...transformed.map((point) => point[0])),
      Math.min(...transformed.map((point) => point[1])),
      Math.min(...transformed.map((point) => point[2])),
    ],
    max: [
      Math.max(...transformed.map((point) => point[0])),
      Math.max(...transformed.map((point) => point[1])),
      Math.max(...transformed.map((point) => point[2])),
    ],
  }
}

export async function importOpenGridOpenConnectShelfLockedSlot(
  blob: Blob,
): Promise<Shape3D> {
  let imported: Shape3D | null = null
  try {
    imported = (await importSTEP(blob)).asShape3D()
    if (imported.isNull || !sourceBoundsMatch(imported)) {
      throw new Error('OPENGRID_OPENCONNECT_SLOT_ASSET_INVALID')
    }
    return imported
  } catch (error) {
    deleteShape(imported)
    if (
      error instanceof Error &&
      error.message === 'OPENGRID_OPENCONNECT_SLOT_ASSET_INVALID'
    ) {
      throw error
    }
    throw new Error('OPENGRID_OPENCONNECT_SLOT_ASSET_INVALID')
  }
}

export async function loadOpenGridOpenConnectShelfLockedSlot(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(openGridOpenConnectShelfLockedSlotAssetUrl)
  if (!response.ok) {
    throw new Error('OPENGRID_OPENCONNECT_SLOT_ASSET_LOAD_FAILED')
  }
  return importOpenGridOpenConnectShelfLockedSlot(await response.blob())
}

export function placeOpenGridOpenConnectShelfLockedSlot(
  source: Shape3D,
  origin: Point3D,
): Shape3D {
  let current: Shape3D | null = source.clone()
  try {
    // Match the assembled OpenConnect head direction used by OpenGrid Snap,
    // then stand the compatible locked socket upright on the rear plate.
    const assembled = current.rotate(
      OPENGRID_OPENCONNECT_SLOT_ASSEMBLY_ROTATION_DEGREES,
      [...OPENGRID_OPENCONNECT_SLOT_ASSEMBLY_ROTATION_ORIGIN],
      [...OPENGRID_OPENCONNECT_SLOT_ASSEMBLY_ROTATION_AXIS],
    )
    if (assembled !== current) deleteShape(current)
    current = assembled
    const upright = current.rotate(90, [0, 0, 0], [1, 0, 0])
    if (upright !== current) deleteShape(current)
    current = upright
    const translated = current.translate(origin[0], origin[1], origin[2])
    if (translated !== current) deleteShape(current)
    current = translated
    return current
  } catch (error) {
    deleteShape(current)
    throw error
  }
}
