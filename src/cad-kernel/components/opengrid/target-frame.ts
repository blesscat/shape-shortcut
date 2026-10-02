import { makeBox, type Edge, type Shape3D } from 'replicad'
import type { OpenGridParameters } from '../../../cad-contract/units'
import {
  openGridNominalBoardConfiguration,
  openGridPhysicalBoundsFor,
  OPENGRID_CONFIGURATION,
} from './profile'
import { deleteShape } from '../../lifetime/dispose'
import { fuseBalanced } from './assembly'
import type { OpenGridBuildContext } from './builder'
const TARGET_FRAME_EPSILON = 0.000001
const TARGET_FRAME_OVERLAP = 0.2
const TARGET_FRAME_CHAMFER_SIZE = Math.sqrt(
  OPENGRID_CONFIGURATION.intersectionDistance ** 2 * 2,
)
const TARGET_FRAME_FILLET_RADIUS = 5

type Point3D = [number, number, number]

type TargetFrameActiveSides = {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

type TargetFrameGeometry = {
  bounds: ReturnType<typeof openGridPhysicalBoundsFor>
  nominal: ReturnType<typeof openGridNominalBoardConfiguration>
  activeSides: TargetFrameActiveSides
  corners: Point3D[]
  cornerExtensions: Map<string, number>
}

function closeTargetFrameCoordinate(first: number, second: number): boolean {
  return Math.abs(first - second) <= 0.05
}

function readTargetFramePoint(point: {
  toTuple: () => Point3D
  delete: () => void
}): Point3D {
  try {
    return point.toTuple()
  } finally {
    point.delete()
  }
}

function targetFrameGeometryFor(
  parameters: OpenGridParameters,
): TargetFrameGeometry {
  const nominal = openGridNominalBoardConfiguration(parameters)
  const bounds = openGridPhysicalBoundsFor(parameters)
  const sides = parameters.targetFrameSides
  const nominalMinX = -nominal.width / 2
  const nominalMaxX = nominal.width / 2
  const nominalMinY = -nominal.depth / 2
  const nominalMaxY = nominal.depth / 2
  const activeSides: TargetFrameActiveSides = {
    left: sides.left && nominalMinX - bounds.min[0] > TARGET_FRAME_EPSILON,
    right: sides.right && bounds.max[0] - nominalMaxX > TARGET_FRAME_EPSILON,
    bottom: sides.bottom && nominalMinY - bounds.min[1] > TARGET_FRAME_EPSILON,
    top: sides.top && bounds.max[1] - nominalMaxY > TARGET_FRAME_EPSILON,
  }
  const cornersByKey = new Map<string, Point3D>()
  const cornerExtensions = new Map<string, number>()

  const addCorner = (x: number, y: number, extension: number): void => {
    const key = `${x}:${y}`
    cornersByKey.set(key, [x, y, 0])
    const currentExtension = cornerExtensions.get(key)
    cornerExtensions.set(
      key,
      currentExtension === undefined
        ? extension
        : Math.min(currentExtension, extension),
    )
  }

  const leftExtension = nominalMinX - bounds.min[0]
  const rightExtension = bounds.max[0] - nominalMaxX
  const bottomExtension = nominalMinY - bounds.min[1]
  const topExtension = bounds.max[1] - nominalMaxY
  if (activeSides.left) {
    addCorner(bounds.min[0], bounds.min[1], leftExtension)
    addCorner(bounds.min[0], bounds.max[1], leftExtension)
  }
  if (activeSides.right) {
    addCorner(bounds.max[0], bounds.min[1], rightExtension)
    addCorner(bounds.max[0], bounds.max[1], rightExtension)
  }
  if (activeSides.bottom) {
    addCorner(bounds.min[0], bounds.min[1], bottomExtension)
    addCorner(bounds.max[0], bounds.min[1], bottomExtension)
  }
  if (activeSides.top) {
    addCorner(bounds.min[0], bounds.max[1], topExtension)
    addCorner(bounds.max[0], bounds.max[1], topExtension)
  }

  return {
    bounds,
    nominal,
    activeSides,
    corners: [...cornersByKey.values()],
    cornerExtensions,
  }
}

function targetFramePartsFor(parameters: OpenGridParameters): Shape3D[] {
  if (!parameters.fitToTarget) return []

  const geometry = targetFrameGeometryFor(parameters)
  const { bounds, nominal, activeSides } = geometry
  if (!Object.values(activeSides).some(Boolean)) return []

  const nominalMinX = -nominal.width / 2
  const nominalMaxX = nominal.width / 2
  const nominalMinY = -nominal.depth / 2
  const nominalMaxY = nominal.depth / 2
  const parts: Shape3D[] = []

  try {
    if (activeSides.left) {
      parts.push(
        makeBox(
          [bounds.min[0], bounds.min[1], bounds.min[2]],
          [nominalMinX + TARGET_FRAME_OVERLAP, bounds.max[1], bounds.max[2]],
        ),
      )
    }
    if (activeSides.right) {
      parts.push(
        makeBox(
          [nominalMaxX - TARGET_FRAME_OVERLAP, bounds.min[1], bounds.min[2]],
          [bounds.max[0], bounds.max[1], bounds.max[2]],
        ),
      )
    }
    if (activeSides.bottom) {
      parts.push(
        makeBox(
          [bounds.min[0], bounds.min[1], bounds.min[2]],
          [bounds.max[0], nominalMinY + TARGET_FRAME_OVERLAP, bounds.max[2]],
        ),
      )
    }
    if (activeSides.top) {
      parts.push(
        makeBox(
          [bounds.min[0], nominalMaxY - TARGET_FRAME_OVERLAP, bounds.min[2]],
          [bounds.max[0], bounds.max[1], bounds.max[2]],
        ),
      )
    }

    return parts
  } catch (error) {
    for (const part of parts) deleteShape(part)
    throw error
  }
}

function targetFrameCornerCutSize(extension: number): number {
  return Math.min(
    TARGET_FRAME_CHAMFER_SIZE,
    Math.max(TARGET_FRAME_OVERLAP * 2, extension * 2),
  )
}

function applyTargetFrameChamfers(
  frame: Shape3D,
  geometry: TargetFrameGeometry,
): Shape3D {
  let current = frame
  try {
    for (const corner of geometry.corners) {
      const key = `${corner[0]}:${corner[1]}`
      const extension = geometry.cornerExtensions.get(key) ?? 0
      const side = targetFrameCornerCutSize(extension)
      const cutter = makeBox(
        [
          corner[0] - side / 2,
          corner[1] - side / 2,
          geometry.bounds.min[2] - 0.01,
        ],
        [
          corner[0] + side / 2,
          corner[1] + side / 2,
          geometry.bounds.max[2] + 0.01,
        ],
      )
      const rotated = cutter.rotate(45, [corner[0], corner[1], 0], [0, 0, 1])
      if (rotated !== cutter) deleteShape(cutter)
      const cut = current.cut(rotated, { optimisation: 'none' })
      if (cut !== current) deleteShape(current)
      deleteShape(rotated)
      current = cut
    }
    return current
  } catch (error) {
    deleteShape(current)
    throw error
  }
}

function targetFrameFilletRadius(geometry: TargetFrameGeometry): number {
  const extensions = [...geometry.cornerExtensions.values()].filter(
    (extension) => extension > TARGET_FRAME_EPSILON,
  )
  if (extensions.length === 0) return 0
  // Keep the fillet inside the narrowest physical frame strip while allowing
  // the requested beta radius on normal target-frame widths.
  return Math.min(TARGET_FRAME_FILLET_RADIUS, ...extensions)
}

function isTargetFrameOuterVerticalEdge(
  edge: Edge,
  geometry: TargetFrameGeometry,
): boolean {
  if (edge.geomType !== 'LINE') return false
  const start = readTargetFramePoint(edge.startPoint)
  const end = readTargetFramePoint(edge.endPoint)
  const height = geometry.bounds.max[2] - geometry.bounds.min[2]
  const hasVerticalSpan = Math.abs(Math.abs(start[2] - end[2]) - height) <= 0.05
  const hasStableXY =
    closeTargetFrameCoordinate(start[0], end[0]) &&
    closeTargetFrameCoordinate(start[1], end[1])
  if (!hasVerticalSpan || !hasStableXY) return false

  return geometry.corners.some(
    (corner) =>
      closeTargetFrameCoordinate(start[0], corner[0]) &&
      closeTargetFrameCoordinate(start[1], corner[1]),
  )
}

function applyTargetFrameFillet(
  frame: Shape3D,
  geometry: TargetFrameGeometry,
): Shape3D {
  const radius = targetFrameFilletRadius(geometry)
  if (radius <= TARGET_FRAME_EPSILON) return frame
  const rounded = frame.fillet((edge) =>
    isTargetFrameOuterVerticalEdge(edge, geometry) ? radius : null,
  )
  if (rounded !== frame) deleteShape(frame)
  return rounded
}

function applyTargetFrameCornerShape(
  frame: Shape3D,
  parameters: OpenGridParameters,
  geometry: TargetFrameGeometry,
): Shape3D {
  if (parameters.targetFrameShape === 'chamfer') {
    return applyTargetFrameChamfers(frame, geometry)
  }
  if (parameters.targetFrameShape === 'fillet') {
    return applyTargetFrameFillet(frame, geometry)
  }
  return frame
}

async function addTargetFrame(
  source: Shape3D,
  parameters: OpenGridParameters,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const frameParts = targetFramePartsFor(parameters)
  if (frameParts.length === 0) return source
  let frame: Shape3D | null = null
  try {
    frame = await fuseBalanced(frameParts, context)
    const geometry = targetFrameGeometryFor(parameters)
    frame = applyTargetFrameCornerShape(frame, parameters, geometry)
    const result = await fuseBalanced([source, frame], context)
    frame = null
    return result
  } catch (error) {
    deleteShape(frame)
    throw error
  }
}

export { addTargetFrame }
