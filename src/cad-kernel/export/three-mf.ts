import {
  DEFAULT_MODEL_COLORS,
  isModelColor,
} from '../../cad-contract/model-colors'
import type { Shape3D } from 'replicad'
import {
  isValidThreeMfPackage,
  THREE_MF_BUILD_TRANSFORM,
  THREE_MF_WALL_COVER_EXPECTATION,
  type ThreeMfPackageExpectation,
} from '../../cad-contract/three-mf'
import { PROTOTYPE_CONFIGURATION } from '../../cad-contract/units'
import { meshBRep, type MeshData } from '../mesh'

export type ThreeMfShapePart = {
export type ThreeMfShapePart = {
  name: 'body' | 'text' | 'rim' | 'icon' | 'accent'
  shape: Shape3D
}

export type ExportThreeMfOptions = {
  tolerance?: number
  angularTolerance?: number
  modelName?: string
  sourceFile?: string
  plateName?: string
  baseMaterialName?: string
  accentMaterialName?: string
  baseColor?: string
  accentColor?: string
}

export type ThreeMfPackageMeta = {
  modelSettingsName: string
  sourceFileName: string
  platerName: string
  baseMaterialName: string
  baseMaterialColor: string
  accentMaterialName: string
  accentMaterialColor: string
  accentPartName: string
}

export const THREE_MF_WALL_COVER_META: ThreeMfPackageMeta = {
  modelSettingsName: THREE_MF_WALL_COVER_EXPECTATION.modelSettingsName,
  sourceFileName: THREE_MF_WALL_COVER_EXPECTATION.sourceFileName,
  platerName: THREE_MF_WALL_COVER_EXPECTATION.platerName,
  baseMaterialName: THREE_MF_WALL_COVER_EXPECTATION.baseMaterialName,
  baseMaterialColor: THREE_MF_WALL_COVER_EXPECTATION.baseMaterialColor,
  accentMaterialName: THREE_MF_WALL_COVER_EXPECTATION.accentMaterialName,
  accentMaterialColor: THREE_MF_WALL_COVER_EXPECTATION.accentMaterialColor,
  accentPartName: THREE_MF_WALL_COVER_EXPECTATION.accentPartName,
}

const CONTAINER_THREE_MF_METAS = {
  'opengrid-stackable-cylinder': {
    platerName: 'OpenGrid Stackable Cylinder',
    baseMaterialName: 'Cylinder Body',
    accentMaterialName: 'Cylinder Rim',
  },
  'opengrid-stackable-box': {
    platerName: 'OpenGrid Stackable Box',
    baseMaterialName: 'Box Body',
    accentMaterialName: 'Box Rim',
  },
  'opengrid-organizer-box': {
    platerName: 'OpenGrid Organizer Box',
    baseMaterialName: 'Organizer Body',
    accentMaterialName: 'Organizer Rim',
  },
  'opengrid-divider': {
    platerName: 'OpenGrid Divider',
    baseMaterialName: 'Divider Body',
    accentMaterialName: 'Divider Rim',
  },
  'opengrid-openconnect-organizer': {
    platerName: 'OpenGrid OpenConnect Organizer',
    baseMaterialName: 'Organizer Body',
    accentMaterialName: 'Organizer Rim',
  },
} as const

type ContainerThreeMfModelId = keyof typeof CONTAINER_THREE_MF_METAS

/**
 * Per-model 3MF metadata for every supported dual-color export. Label
 * Tag and Label Card source file names embed the generation parameters,
 * so they are derived from the export file name.
 */
export function threeMfMetaFor(
  modelId:
    | 'opengrid-wall-cover'
    | ContainerThreeMfModelId
    | 'opengrid-label-tag'
    | 'opengrid-label-card',
  fileName: string,
): ThreeMfPackageMeta {
  if (modelId === 'opengrid-label-tag') {
    return {
      modelSettingsName: 'opengrid-label-tag',
      sourceFileName: fileName,
      platerName: 'OpenGrid Label Tag',
      baseMaterialName: 'Label Tag Body',
      baseMaterialColor: DEFAULT_MODEL_COLORS.primary,
      accentMaterialName: 'Label Tag Icon',
      accentMaterialColor: DEFAULT_MODEL_COLORS.secondary,
      accentPartName: 'icon',
    }
  }
  if (modelId === 'opengrid-label-card') {
    return {
      modelSettingsName: 'opengrid-label-card',
      sourceFileName: fileName,
      platerName: 'OpenGrid Label Card',
      baseMaterialName: 'Label Card Body',
      baseMaterialColor: DEFAULT_MODEL_COLORS.primary,
      accentMaterialName: 'Label Card Accent',
      accentMaterialColor: DEFAULT_MODEL_COLORS.secondary,
      accentPartName: 'accent',
    }
  }
  const container = modelId in CONTAINER_THREE_MF_METAS
    ? CONTAINER_THREE_MF_METAS[modelId as ContainerThreeMfModelId]
    : undefined
  if (container) {
    return {
      modelSettingsName: modelId,
      sourceFileName: fileName,
      ...container,
      baseMaterialColor: DEFAULT_MODEL_COLORS.primary,
      accentMaterialColor: DEFAULT_MODEL_COLORS.secondary,
      accentPartName: 'rim',
    }
  }
  return THREE_MF_WALL_COVER_META
}

export function threeMfExpectationFor(
  meta: ThreeMfPackageMeta,
): ThreeMfPackageExpectation {
  return {
    baseMaterialName: meta.baseMaterialName,
    baseMaterialColor: meta.baseMaterialColor,
    accentMaterialName: meta.accentMaterialName,
    accentMaterialColor: meta.accentMaterialColor,
    accentPartName: meta.accentPartName,
    modelSettingsName: meta.modelSettingsName,
    sourceFileName: meta.sourceFileName,
    platerName: meta.platerName,
    filamentColors: [meta.baseMaterialColor, meta.accentMaterialColor],
  }
}

type ZipEntry = {
  name: string
  bytes: Uint8Array
}

const TEXT_ENCODER = new TextEncoder()
const PROJECT_SETTINGS_PATH = 'Metadata/project_settings.config'
const MODEL_SETTINGS_PATH = 'Metadata/model_settings.config'
const OBJECT_MODEL_PATH = '3D/Objects/object_1.model'
const OBJECT_MODEL_RELATIONSHIPS_PATH = '3D/_rels/3dmodel.model.rels'
const OBJECT_MODEL_TARGET = `/${OBJECT_MODEL_PATH}`
const BBS_MODEL_NAMESPACE = 'http://schemas.bambulab.com/package/2021'
const PRODUCTION_NAMESPACE =
  'http://schemas.microsoft.com/3dmanufacturing/production/2015/06'
const BBS_APPLICATION = 'BambuStudio-02.08.02.61'
const IDENTITY_TRANSFORM = '1 0 0 0 1 0 0 0 1 0 0 0'
const IDENTITY_MATRIX = '1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1'
const MAIN_OBJECT_UUID = '00000001-61cb-4c03-9d28-80fed5dfa1dc'
const BODY_OBJECT_UUID = '00010000-81cb-4c03-9d28-80fed5dfa1dc'
const TEXT_OBJECT_UUID = '00010001-81cb-4c03-9d28-80fed5dfa1dc'
const BODY_COMPONENT_UUID = '00010000-b206-40ff-9872-83e8017abed1'
const TEXT_COMPONENT_UUID = '00010001-b206-40ff-9872-83e8017abed1'
const BODY_PART_UUID = 'd61eef14-56af-4be9-bec2-808d851cfa24'
const TEXT_PART_UUID = '81413479-78c8-4c21-b3e4-f05c65c66752'
const RIM_PART_UUID = '81413479-78c8-4c21-b3e4-f05c65c66753'
const BUILD_UUID = '2c7c17d8-22b5-4d84-8835-1976022ea369'
const BUILD_ITEM_UUID = '00000003-b1ec-4553-aec9-835e5b724bb4'

function finiteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`THREEMF_NON_FINITE:${label}`)
  return Number(value.toFixed(6))
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function meshXml(mesh: MeshData): string {
  if (mesh.positions.length % 3 !== 0 || mesh.indices.length % 3 !== 0) {
    throw new Error('THREEMF_MESH_INVALID')
  }
  const vertexCount = mesh.positions.length / 3
  const vertices: string[] = []
  const vertexIndices = new Map<string, number>()
  const remappedIndices: number[] = []
  // CAD tessellation duplicates vertices along face boundaries. 3MF needs
  // adjacent triangles to share indices, not merely equal coordinates.
  for (let index = 0; index < vertexCount; index += 1) {
    const offset = index * 3
    const x = finiteNumber(mesh.positions[offset]!, 'x')
    const y = finiteNumber(mesh.positions[offset + 1]!, 'y')
    const z = finiteNumber(mesh.positions[offset + 2]!, 'z')
    const key = `${x},${y},${z}`
    let sharedIndex = vertexIndices.get(key)
    if (sharedIndex === undefined) {
      sharedIndex = vertices.length
      vertexIndices.set(key, sharedIndex)
      vertices.push(`<vertex x="${x}" y="${y}" z="${z}"/>`)
    }
    remappedIndices.push(sharedIndex)
  }

  const triangles: string[] = []
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const first = mesh.indices[index]!
    const second = mesh.indices[index + 1]!
    const third = mesh.indices[index + 2]!
    if (
      [first, second, third].some(
        (index) =>
          !Number.isSafeInteger(index) || index < 0 || index >= vertexCount,
      )
    ) {
      throw new Error('THREEMF_TRIANGLE_INDEX_INVALID')
    }
    const v1 = remappedIndices[first]!
    const v2 = remappedIndices[second]!
    const v3 = remappedIndices[third]!
    if (v1 === v2 || v2 === v3 || v3 === v1) {
      throw new Error('THREEMF_MESH_INVALID')
    }
    triangles.push(`<triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`)
  }

  if (vertices.length === 0 || triangles.length === 0) {
    throw new Error('THREEMF_MESH_EMPTY')
  }
  return `<mesh><vertices>${vertices.join('')}</vertices><triangles>${triangles.join('')}</triangles></mesh>`
}

function objectModelXml(
  parts: readonly { name: string; mesh: MeshData }[],
  meta: ThreeMfPackageMeta,
): string {
  const objects = parts
    .map((part, index) => {
      const uuid = index === 0 ? BODY_OBJECT_UUID : TEXT_OBJECT_UUID
      return `<object id="${index + 1}" p:UUID="${uuid}" type="model" name="${xmlEscape(part.name)}" pid="1" pindex="${index}">${meshXml(part.mesh)}</object>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="millimeter" xml:lang="en-US" xmlns:BambuStudio="${BBS_MODEL_NAMESPACE}" xmlns:p="${PRODUCTION_NAMESPACE}" requiredextensions="p">
  <metadata name="BambuStudio:3mfVersion">1</metadata>
  <resources>
    <basematerials id="1">
      <base name="${xmlEscape(meta.baseMaterialName)}" displaycolor="${meta.baseMaterialColor}" />
      <base name="${xmlEscape(meta.accentMaterialName)}" displaycolor="${meta.accentMaterialColor}" />
    </basematerials>
    ${objects}
  </resources>
  <build />
</model>`
}

function modelXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="${BBS_MODEL_NAMESPACE}" xmlns:p="${PRODUCTION_NAMESPACE}" requiredextensions="p">
  <metadata name="Application">${BBS_APPLICATION}</metadata>
  <metadata name="BambuStudio:3mfVersion">1</metadata>
  <resources>
    <object id="3" p:UUID="${MAIN_OBJECT_UUID}" type="model">
      <components>
        <component p:path="${OBJECT_MODEL_TARGET}" objectid="1" p:UUID="${BODY_COMPONENT_UUID}" transform="${IDENTITY_TRANSFORM}" />
        <component p:path="${OBJECT_MODEL_TARGET}" objectid="2" p:UUID="${TEXT_COMPONENT_UUID}" transform="${IDENTITY_TRANSFORM}" />
      </components>
    </object>
  </resources>
  <build p:UUID="${BUILD_UUID}">
    <item objectid="3" p:UUID="${BUILD_ITEM_UUID}" transform="${THREE_MF_BUILD_TRANSFORM}" printable="1" />
  </build>
</model>`
}

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
  <Default Extension="config" ContentType="application/xml" />
</Types>`
}

function projectSettingsJson(meta: ThreeMfPackageMeta): string {
  return `{
  "extruder_type": ["Direct Drive"],
  "filament_colour": ["${meta.baseMaterialColor}", "${meta.accentMaterialColor}"],
  "filament_flow_ratio": ["1", "1"],
  "filament_map": ["1", "1"],
  "filament_settings_id": ["Bambu PLA Basic @BBL A1", "Bambu PLA Basic @BBL A1"],
  "filament_type": ["PLA", "PLA"],
  "filament_vendor": ["Bambu Lab", "Bambu Lab"],
  "filament_volume_map": ["0", "0"],
  "from": "project",
  "name": "project_settings",
  "nozzle_diameter": ["0.4"],
  "nozzle_volume_type": ["Standard"],
  "physical_extruder_map": ["0"],
  "print_extruder_id": ["1"],
  "print_extruder_variant": ["Direct Drive Standard"],
  "printer_extruder_id": ["1"],
  "printer_extruder_variant": ["Direct Drive Standard"],
  "printer_model": "Bambu Lab A1",
  "printer_settings_id": "Bambu Lab A1 0.4 nozzle",
  "printer_technology": "FFF",
  "printer_variant": "0.4",
  "single_extruder_multi_material": "1",
  "version": "02.08.02.61"
}`
}

function modelSettingsXml(
  parts: readonly { name: string; mesh: MeshData }[],
  meta: ThreeMfPackageMeta,
): string {
  const bodyFaceCount = parts[0]!.mesh.indices.length / 3
  const accentFaceCount = parts[1]!.mesh.indices.length / 3
  const accentPartUuid =
    parts[1]!.name === 'rim' ? RIM_PART_UUID : TEXT_PART_UUID
  return `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="3">
    <metadata key="name" value="${xmlEscape(meta.modelSettingsName)}" />
    <metadata key="extruder" value="1" />
    <metadata face_count="${bodyFaceCount + accentFaceCount}" />
    <part id="1" subtype="normal_part" uuid="${BODY_PART_UUID}">
      <metadata key="name" value="${xmlEscape(parts[0]!.name)}" />
      <metadata key="matrix" value="${IDENTITY_MATRIX}" />
      <metadata key="source_file" value="${xmlEscape(meta.sourceFileName)}" />
      <metadata key="source_object_id" value="0" />
      <metadata key="source_volume_id" value="0" />
      <metadata key="source_offset_x" value="0" />
      <metadata key="source_offset_y" value="0" />
      <metadata key="source_offset_z" value="0" />
      <metadata key="extruder" value="1" />
      <mesh_stat face_count="${bodyFaceCount}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0" />
    </part>
      <metadata key="source_file" value="${xmlEscape(meta.sourceFileName)}" />
      <metadata key="source_object_id" value="1" />
      <metadata key="source_volume_id" value="0" />
      <metadata key="source_offset_x" value="0" />
      <metadata key="source_offset_y" value="0" />
      <metadata key="source_offset_z" value="0" />
      <metadata key="extruder" value="2" />
      <mesh_stat face_count="${accentFaceCount}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0" />
    </part>
  </object>
  <plate>
    <metadata key="plater_id" value="1" />
    <metadata key="plater_name" value="${xmlEscape(meta.platerName)}" />
    <metadata key="locked" value="false" />
    <metadata key="filament_map_mode" value="Auto For Flush" />
    <metadata key="filament_maps" value="1 2" />
    <metadata key="filament_volume_maps" value="1 1" />
    <model_instance>
      <metadata key="object_id" value="3" />
      <metadata key="instance_id" value="0" />
      <metadata key="identify_id" value="1" />
    </model_instance>
  </plate>
  <assemble>
    <assemble_item object_id="3" instance_id="0" transform="${IDENTITY_TRANSFORM}" offset="0 0 0" />
    <assemble_item object_id="3" volume_id="0" transform="${IDENTITY_TRANSFORM}" />
    <assemble_item object_id="3" volume_id="1" transform="${IDENTITY_TRANSFORM}" />
  </assemble>
</config>`
}

function modelRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="${OBJECT_MODEL_TARGET}" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`
}

function relationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true)
}

function zipStore(entries: readonly ZipEntry[]): ArrayBuffer {
  if (entries.length === 0) throw new Error('THREEMF_PACKAGE_EMPTY')
  const encodedEntries = entries.map((entry) => ({
    ...entry,
    nameBytes: TEXT_ENCODER.encode(entry.name),
    checksum: crc32(entry.bytes),
  }))
  const localSize = encodedEntries.reduce(
    (total, entry) => total + 30 + entry.nameBytes.length + entry.bytes.length,
    0,
  )
  const centralSize = encodedEntries.reduce(
    (total, entry) => total + 46 + entry.nameBytes.length,
    0,
  )
  const endSize = 22
  const bytes = new Uint8Array(localSize + centralSize + endSize)
  const view = new DataView(bytes.buffer)
  let offset = 0
  const centralRecords: Array<{
    offset: number
    entry: (typeof encodedEntries)[number]
  }> = []

  for (const entry of encodedEntries) {
    const localOffset = offset
    centralRecords.push({ offset: localOffset, entry })
    writeUint32(view, offset, 0x04034b50)
    writeUint16(view, offset + 4, 20)
    writeUint16(view, offset + 6, 0x800)
    writeUint16(view, offset + 8, 0)
    writeUint16(view, offset + 10, 0)
    writeUint16(view, offset + 12, 0)
    writeUint32(view, offset + 14, entry.checksum)
    writeUint32(view, offset + 18, entry.bytes.length)
    writeUint32(view, offset + 22, entry.bytes.length)
    writeUint16(view, offset + 26, entry.nameBytes.length)
    writeUint16(view, offset + 28, 0)
    bytes.set(entry.nameBytes, offset + 30)
    bytes.set(entry.bytes, offset + 30 + entry.nameBytes.length)
    offset += 30 + entry.nameBytes.length + entry.bytes.length
  }

  const centralOffset = offset
  for (const record of centralRecords) {
    const { entry } = record
    writeUint32(view, offset, 0x02014b50)
    writeUint16(view, offset + 4, 20)
    writeUint16(view, offset + 6, 20)
    writeUint16(view, offset + 8, 0x800)
    writeUint16(view, offset + 10, 0)
    writeUint16(view, offset + 12, 0)
    writeUint16(view, offset + 14, 0)
    writeUint32(view, offset + 16, entry.checksum)
    writeUint32(view, offset + 20, entry.bytes.length)
    writeUint32(view, offset + 24, entry.bytes.length)
    writeUint16(view, offset + 28, entry.nameBytes.length)
    writeUint16(view, offset + 30, 0)
    writeUint16(view, offset + 32, 0)
    writeUint16(view, offset + 34, 0)
    writeUint16(view, offset + 36, 0)
    writeUint32(view, offset + 38, 0)
    writeUint32(view, offset + 42, record.offset)
    bytes.set(entry.nameBytes, offset + 46)
    offset += 46 + entry.nameBytes.length
  }

  writeUint32(view, offset, 0x06054b50)
  writeUint16(view, offset + 4, 0)
  writeUint16(view, offset + 6, 0)
  writeUint16(view, offset + 8, encodedEntries.length)
  writeUint16(view, offset + 10, encodedEntries.length)
  writeUint32(view, offset + 12, centralSize)
  writeUint32(view, offset + 16, centralOffset)
  writeUint16(view, offset + 20, 0)

  return bytes.slice().buffer
}

export async function exportThreeMfBytes(
  parts: readonly ThreeMfShapePart[],
  options: ExportThreeMfOptions = {},
): Promise<ArrayBuffer> {
  if (
    parts.length !== 2 ||
    parts[0]?.name !== 'body' ||
    (parts[1]?.name !== 'text' &&
      parts[1]?.name !== 'rim' &&
      parts[1]?.name !== 'icon' &&
      parts[1]?.name !== 'accent')
  ) {
    throw new Error('THREEMF_PARTS_INVALID')
  }

  const modelName =
    options.modelName ??
    (parts[1]?.name === 'rim'
      ? 'opengrid-stackable-cylinder'
      : parts[1]?.name === 'icon'
        ? 'opengrid-label-tag'
        : parts[1]?.name === 'accent'
          ? 'opengrid-label-card'
          : 'opengrid-wall-cover')
  const sourceFile = options.sourceFile ?? `${modelName}.3mf`
  const baseMeta = threeMfMetaFor(
    modelName as Parameters<typeof threeMfMetaFor>[0],
    sourceFile,
  )
  if (parts[1]?.name !== baseMeta.accentPartName) {
    throw new Error('THREEMF_PARTS_INVALID')
  }
  const plateName = options.plateName ?? baseMeta.platerName
  const baseMaterialName = options.baseMaterialName ?? baseMeta.baseMaterialName
  const accentMaterialName =
    options.accentMaterialName ?? baseMeta.accentMaterialName
  const baseColor = options.baseColor ?? DEFAULT_MODEL_COLORS.primary
  const accentColor = options.accentColor ?? DEFAULT_MODEL_COLORS.secondary
  if (!isModelColor(baseColor) || !isModelColor(accentColor)) {
    throw new Error('THREEMF_METADATA_INVALID')
  }

  const meshOptions = {
    tolerance: options.tolerance ?? PROTOTYPE_CONFIGURATION.stlTolerance,
    angularTolerance:
      options.angularTolerance ?? PROTOTYPE_CONFIGURATION.stlAngularTolerance,
  }

  const meshes = parts.map((part) => ({
    name: part.name,
    mesh: meshBRep(part.shape, meshOptions),
  }))

  const meta: ThreeMfPackageMeta = {
    modelSettingsName: baseMeta.modelSettingsName,
    sourceFileName: sourceFile,
    platerName: plateName,
    baseMaterialName,
    baseMaterialColor: baseColor,
    accentMaterialName,
    accentMaterialColor: accentColor,
    accentPartName: baseMeta.accentPartName,
  }

  const model = TEXT_ENCODER.encode(modelXml())
  const objectModel = TEXT_ENCODER.encode(objectModelXml(meshes, meta))
  const entries: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      bytes: TEXT_ENCODER.encode(contentTypesXml()),
    },
    {
      name: '_rels/.rels',
      bytes: TEXT_ENCODER.encode(relationshipsXml()),
    },
    { name: '3D/3dmodel.model', bytes: model },
    {
      name: OBJECT_MODEL_RELATIONSHIPS_PATH,
      bytes: TEXT_ENCODER.encode(modelRelationshipsXml()),
    },
    { name: OBJECT_MODEL_PATH, bytes: objectModel },
    {
      name: PROJECT_SETTINGS_PATH,
      bytes: TEXT_ENCODER.encode(projectSettingsJson(meta)),
    },
    {
      name: MODEL_SETTINGS_PATH,
      bytes: TEXT_ENCODER.encode(modelSettingsXml(meshes, meta)),
    },
  ]
  const bytes = zipStore(entries)
  if (bytes.byteLength === 0) throw new Error('THREEMF_EMPTY')
  return bytes
}

export function isThreeMfPackage(
  bytes: ArrayBuffer,
  expectation?: ThreeMfPackageExpectation,
): boolean {
  return isValidThreeMfPackage(bytes, expectation)
}
