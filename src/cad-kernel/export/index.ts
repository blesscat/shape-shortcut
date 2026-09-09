import type { Shape3D } from 'replicad'
import { PROTOTYPE_CONFIGURATION } from '../../cad-contract/units'
import { meshBRep, type MeshData } from '../mesh'

export async function exportStepBytes(shape: Shape3D): Promise<ArrayBuffer> {
  const blob = shape.blobSTEP()
  const bytes = await blob.arrayBuffer()
  if (bytes.byteLength === 0) throw new Error('STEP_EMPTY')
  return bytes
}

export type StlExportOptions = {
  tolerance: number
  angularTolerance: number
}

export async function exportStlBytes(
  shape: Shape3D,
  options: StlExportOptions = {
    tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
    angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
  },
): Promise<ArrayBuffer> {
  const nativeShape = shape as Shape3D & { wrapped?: unknown }
  if (nativeShape.wrapped !== undefined) {
    return encodeBinaryStl(meshBRep(shape, options))
  }
  const blob = shape.blobSTL({ ...options, binary: true })
  const bytes = await blob.arrayBuffer()
  if (bytes.byteLength === 0) throw new Error('STL_EMPTY')
  return bytes
}

function encodeBinaryStl(mesh: MeshData): ArrayBuffer {
  const triangleCount = mesh.indices.length / 3
  if (triangleCount === 0 || mesh.indices.length % 3 !== 0) {
    throw new Error('STL_EMPTY')
  }
  if (triangleCount > 0xffffffff) {
    throw new Error('STL_TOO_LARGE')
  }

  const buffer = new ArrayBuffer(84 + triangleCount * 50)
  const view = new DataView(buffer)
  view.setUint32(80, triangleCount, true)
  let offset = 84

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const first = mesh.indices[triangle * 3]! * 3
    const second = mesh.indices[triangle * 3 + 1]! * 3
    const third = mesh.indices[triangle * 3 + 2]! * 3
    if (
      first + 2 >= mesh.positions.length ||
      second + 2 >= mesh.positions.length ||
      third + 2 >= mesh.positions.length
    ) {
      throw new Error('STL_MESH_INVALID')
    }

    const ax = mesh.positions[first]!
    const ay = mesh.positions[first + 1]!
    const az = mesh.positions[first + 2]!
    const bx = mesh.positions[second]!
    const by = mesh.positions[second + 1]!
    const bz = mesh.positions[second + 2]!
    const cx = mesh.positions[third]!
    const cy = mesh.positions[third + 1]!
    const cz = mesh.positions[third + 2]!
    const ux = bx - ax
    const uy = by - ay
    const uz = bz - az
    const vx = cx - ax
    const vy = cy - ay
    const vz = cz - az
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const length = Math.hypot(nx, ny, nz)
    if (length > 0) {
      nx /= length
      ny /= length
      nz /= length
    }

    view.setFloat32(offset, nx, true)
    view.setFloat32(offset + 4, ny, true)
    view.setFloat32(offset + 8, nz, true)
    view.setFloat32(offset + 12, ax, true)
    view.setFloat32(offset + 16, ay, true)
    view.setFloat32(offset + 20, az, true)
    view.setFloat32(offset + 24, bx, true)
    view.setFloat32(offset + 28, by, true)
    view.setFloat32(offset + 32, bz, true)
    view.setFloat32(offset + 36, cx, true)
    view.setFloat32(offset + 40, cy, true)
    view.setFloat32(offset + 44, cz, true)
    view.setUint16(offset + 48, 0, true)
    offset += 50
  }

  return buffer
}

export {
  exportThreeMfBytes,
  isThreeMfPackage,
  type ThreeMfShapePart,
} from './three-mf'
