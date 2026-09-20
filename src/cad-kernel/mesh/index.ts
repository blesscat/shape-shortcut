import { Face, getOC, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import type { MeshSnapshot } from '../../cad-contract/messages'
import type { BoxBounds } from '../../cad-contract/units'

export type MeshData = {
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
  bounds: BoxBounds
  triangleCount: number
  /**
   * Flat pairs of (startTriangle, triangleCount), one pair per B-Rep face in
   * merge order. Omitted when per-face ranges are unavailable (for example the
   * lightweight `shape.mesh()` fallback used by test doubles).
   */
  faceRanges?: Uint32Array
}

type FaceMeshData = {
  triangles: number[]
  vertices: number[]
  normals: number[]
}

type CollectedMeshData = FaceMeshData & {
  faceRanges: number[]
}

type TriangulationData = FaceMeshData | null

export const MAX_GLOBAL_MESH_FACE_COUNT = 512

export type MeshFaceProgress = {
  completed: number
  total: number
}

export type MeshFaceProgressReporter = (progress: MeshFaceProgress) => void

export type MeshOptions = {
  tolerance: number
  angularTolerance: number
  faceMeshingThreshold?: number
  reportFaceProgress?: MeshFaceProgressReporter
}

function appendNumbers(target: number[], source: number[]): void {
  for (const value of source) target.push(value)
}

function countFaces(shape: Shape3D): number {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_FACE as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let count = 0
  try {
    while (explorer.More()) {
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

function meshFacesIndividually(
  shape: Shape3D,
  options: MeshOptions,
  faceCount: number,
): FaceMeshData {
  options.reportFaceProgress?.({ completed: 0, total: faceCount })
  return collectFaceMeshData(shape, options, true, faceCount)
}

function collectFaceMeshData(
  shape: Shape3D,
  options: MeshOptions,
  meshEachFace: boolean,
  faceCount?: number,
): CollectedMeshData {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_FACE as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  const triangles: number[] = []
  const vertices: number[] = []
  const normals: number[] = []
  const faceRanges: number[] = []
  let index = 0

  try {
    while (explorer.More()) {
      const face = new Face(oc.TopoDS.Face_1(explorer.Current()))
      let faceCompleted = false
      try {
        if (meshEachFace) {
          try {
            meshFace(face, options)
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error)
            throw new Error(`MESH_FACE_INVALID:${index}:${message}`)
          }
        }
        let triangulation
        try {
          triangulation = triangulateFace(face, vertices.length / 3)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          throw new Error(`MESH_FACE_TRIANGULATION_INVALID:${index}:${message}`)
        }
        if (triangulation) {
          const triangleCount = triangulation.triangles.length / 3
          if (triangleCount > 0) {
            faceRanges.push(triangles.length / 3, triangleCount)
          }
          appendNumbers(triangles, triangulation.triangles)
          appendNumbers(vertices, triangulation.vertices)
          appendNumbers(normals, triangulation.normals)
        }
        faceCompleted = true
      } finally {
        try {
          face.delete()
        } catch {
          // Keep the primary meshing error if a subshape wrapper is already gone.
        }
        if (faceCompleted && faceCount !== undefined) {
          options.reportFaceProgress?.({
            completed: index + 1,
            total: faceCount,
          })
        }
        index += 1
        explorer.Next()
      }
    }
  } finally {
    explorer.delete()
  }

  return { triangles, vertices, normals, faceRanges }
}

function meshShapeGlobally(
  shape: Shape3D,
  options: MeshOptions,
): CollectedMeshData {
  const oc = getOC()
  const mesher = new oc.BRepMesh_IncrementalMesh_2(
    shape.wrapped,
    options.tolerance,
    false,
    options.angularTolerance,
    false,
  )
  mesher.delete()
  return collectFaceMeshData(shape, options, false)
}

function triangulateFace(face: Face, index0: number): TriangulationData {
  const oc = getOC()
  const location = new oc.TopLoc_Location_1()
  const meshPurpose = 0 as Parameters<typeof oc.BRep_Tool.Triangulation>[2]
  const triangulation = oc.BRep_Tool.Triangulation(
    face.wrapped,
    location,
    meshPurpose,
  )

  try {
    if (triangulation.IsNull()) return null

    const transformation = location.Transformation()
    const tri = triangulation.get()
    const triangles: number[] = []
    const vertices: number[] = []
    const normals: number[] = []
    let normalsArray
    let polyConnect

    try {
      const nodeCount = tri.NbNodes()
      for (let nodeIndex = 1; nodeIndex <= nodeCount; nodeIndex += 1) {
        const node = tri.Node(nodeIndex)
        const transformed = node.Transformed(transformation)
        try {
          vertices.push(transformed.X(), transformed.Y(), transformed.Z())
        } finally {
          transformed.delete()
          node.delete()
        }
      }

      normalsArray = new oc.TColgp_Array1OfDir_2(1, nodeCount)
      polyConnect = new oc.Poly_Connect_2(triangulation)
      oc.StdPrs_ToolTriangulatedShape.Normal(
        face.wrapped,
        polyConnect,
        normalsArray,
      )
      for (
        let normalIndex = normalsArray.Lower();
        normalIndex <= normalsArray.Upper();
        normalIndex += 1
      ) {
        const normal = normalsArray.Value(normalIndex)
        const transformed = normal.Transformed(transformation)
        try {
          normals.push(transformed.X(), transformed.Y(), transformed.Z())
        } finally {
          transformed.delete()
          normal.delete()
        }
      }

      const orientation = face.orientation
      const triangleCount = tri.NbTriangles()
      for (
        let triangleIndex = 1;
        triangleIndex <= triangleCount;
        triangleIndex += 1
      ) {
        const triangle = tri.Triangle(triangleIndex)
        try {
          let first = triangle.Value(1)
          let second = triangle.Value(2)
          const third = triangle.Value(3)
          if (orientation === 'backward') {
            const temporary = first
            first = second
            second = temporary
          }
          triangles.push(
            first - 1 + index0,
            second - 1 + index0,
            third - 1 + index0,
          )
        } finally {
          triangle.delete()
        }
      }
    } finally {
      polyConnect?.delete()
      normalsArray?.delete()
      transformation.delete()
    }

    return { triangles, vertices, normals }
  } finally {
    triangulation.delete()
    location.delete()
  }
}

function boundsFromPositions(positions: Float32Array): BoxBounds {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index]
    const y = positions[index + 1]
    const z = positions[index + 2]
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(minZ) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY) ||
    !Number.isFinite(maxZ)
  ) {
    throw new Error('MESH_INVALID: B-Rep mesh positions are not finite')
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
  }
}

function meshFace(face: Face, options: MeshOptions): void {
  const oc = getOC()
  const mesher = new oc.BRepMesh_IncrementalMesh_2(
    face.wrapped,
    options.tolerance,
    false,
    options.angularTolerance,
    false,
  )
  mesher.delete()
}

export function meshBRep(shape: Shape3D, options: MeshOptions): MeshData {
  try {
    let faceCount: number | null = null
    try {
      faceCount = countFaces(shape)
    } catch {
      // Keep the normal adapter path usable for lightweight test doubles.
    }
    let mesh: CollectedMeshData | FaceMeshData
    const faceMeshingThreshold =
      options.faceMeshingThreshold ?? MAX_GLOBAL_MESH_FACE_COUNT
    if (faceCount !== null && faceCount > faceMeshingThreshold) {
      mesh = meshFacesIndividually(shape, options, faceCount)
    } else if (faceCount !== null) {
      mesh = meshShapeGlobally(shape, options)
    } else {
      mesh = shape.mesh(options)
    }
    const positions = new Float32Array(mesh.vertices)
    const normals = new Float32Array(mesh.normals)
    const indices = new Uint32Array(mesh.triangles)
    const faceRanges =
      'faceRanges' in mesh && mesh.faceRanges.length > 0
        ? new Uint32Array(mesh.faceRanges)
        : undefined

    if (
      positions.length === 0 ||
      indices.length === 0 ||
      indices.length % 3 !== 0
    ) {
      throw new Error('MESH_INVALID: B-Rep mesh did not contain triangles')
    }
    if (normals.length !== positions.length) {
      throw new Error('MESH_INVALID: B-Rep mesh normals do not match positions')
    }

    const bounds = boundsFromPositions(positions)

    return {
      positions,
      normals,
      indices,
      bounds,
      triangleCount: indices.length / 3,
      faceRanges,
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('MESH_INVALID:')) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`MESH_INVALID: ${message}`)
  }
}

export function cloneMesh(mesh: MeshData): MeshData {
  return {
    positions: new Float32Array(mesh.positions),
    normals: new Float32Array(mesh.normals),
    indices: new Uint32Array(mesh.indices),
    bounds: {
      min: [...mesh.bounds.min] as [number, number, number],
      max: [...mesh.bounds.max] as [number, number, number],
    },
    triangleCount: mesh.triangleCount,
    faceRanges: mesh.faceRanges ? new Uint32Array(mesh.faceRanges) : undefined,
  }
}

export function serializeMesh(mesh: MeshData): MeshSnapshot {
  const copy = cloneMesh(mesh)
  return {
    positions: copy.positions.buffer as ArrayBuffer,
    normals: copy.normals.buffer as ArrayBuffer,
    indices: copy.indices.buffer as ArrayBuffer,
    bounds: copy.bounds,
    triangleCount: copy.triangleCount,
    faceTriangleRanges: copy.faceRanges
      ? (copy.faceRanges.buffer as ArrayBuffer)
      : undefined,
  }
}
