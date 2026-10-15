export type AssemblyScene =
  'direct-placement' | 'snap-fixing' | 'locating-seats'

export type AssemblyDatums = {
  directBoxZ: number
  snapZ: number
  fixedBoxZ: number
}

export type AssemblyPart = {
  id: string
  mesh: string
  position: number[]
  rotationZ: number
}

export type MeshAttribute = { offset: number; count: number }

export type AssemblyManifest = {
  version: number
  asset: string
  byteLength: number
  sha256: string
  datums: AssemblyDatums
  meshes: Record<
    string,
    {
      positions: MeshAttribute
      normals: MeshAttribute
      indices: MeshAttribute
    }
  >
}

export type AssemblyAssets = { manifest: AssemblyManifest; bytes: ArrayBuffer }

export type AssemblyReadingState = {
  step: number
  parts: AssemblyPart[]
  seatFocus: number
}
