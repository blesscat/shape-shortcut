const THREE_MF_MODEL_NAMESPACE =
  'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
const THREE_MF_RELATIONSHIP_TYPE =
  'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel'
const THREE_MF_MODEL_CONTENT_TYPE =
  'application/vnd.ms-package.3dmanufacturing-3dmodel+xml'
const THREE_MF_RELATIONSHIPS_CONTENT_TYPE =
  'application/vnd.openxmlformats-package.relationships+xml'
const THREE_MF_MODEL_SETTINGS_CONTENT_TYPE = 'application/xml'
const THREE_MF_PROJECT_SETTINGS_ENTRY = 'Metadata/project_settings.config'
const THREE_MF_MODEL_SETTINGS_ENTRY = 'Metadata/model_settings.config'
const THREE_MF_MODEL_RELATIONSHIPS_ENTRY = '3D/_rels/3dmodel.model.rels'
const THREE_MF_OBJECT_MODEL_ENTRY = '3D/Objects/object_1.model'
const THREE_MF_IDENTITY_TRANSFORM = '1 0 0 0 1 0 0 0 1 0 0 0'
export const THREE_MF_BUILD_TRANSFORM = '1 0 0 0 1 0 0 0 1 128 128 0'
const THREE_MF_IDENTITY_MATRIX = '1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1'

/**
 * Per-model expectations for the dual-color 3MF package. The default
 * expectation describes the historical Wall Cover package so existing
 * callers keep validating it unchanged.
 */
export type ThreeMfPackageExpectation = {
  baseMaterialName: string
  baseMaterialColor: string
  accentMaterialName: string
  accentMaterialColor: string
  /** Package-level name of the second part: `text` (Wall Cover) or `icon`. */
  accentPartName: string
  /** `name` metadata of the model settings object. */
  modelSettingsName: string
  /** `source_file` metadata on both parts. */
  sourceFileName: string
  platerName: string
  filamentColors: readonly [string, string]
}

export const THREE_MF_WALL_COVER_EXPECTATION: ThreeMfPackageExpectation = {
  baseMaterialName: 'Wall Cover Body',
  baseMaterialColor: '#657080',
  accentMaterialName: 'Wall Cover Text',
  accentMaterialColor: '#F4C542',
  accentPartName: 'text',
  modelSettingsName: 'opengrid-wall-cover',
  sourceFileName: 'opengrid-wall-cover.3mf',
  platerName: 'OpenGrid Wall Cover',
  filamentColors: ['#657080', '#F4C542'],
}

export function threeMfExpectationForLabelTag(
  sourceFileName: string,
): ThreeMfPackageExpectation {
  return {
    baseMaterialName: 'Label Tag Body',
    baseMaterialColor: '#657080',
    accentMaterialName: 'Label Tag Icon',
    accentMaterialColor: '#F4C542',
    accentPartName: 'icon',
    modelSettingsName: 'opengrid-label-tag',
    sourceFileName,
    platerName: 'OpenGrid Label Tag',
    filamentColors: ['#657080', '#F4C542'],
  }
}

/**
 * Main-thread download validation expectation derived from the requested
 * file name. Label Tag 3MF file names embed their parameters under the
 * `opengrid-label-tag` prefix; every other name keeps the historical
 * Wall Cover expectation.
 */
export function threeMfExpectationForFileName(
  fileName: string,
): ThreeMfPackageExpectation {
  if (fileName.startsWith('opengrid-label-tag')) {
    return threeMfExpectationForLabelTag(fileName)
  }
  return THREE_MF_WALL_COVER_EXPECTATION
}

const REQUIRED_ENTRIES = [
  '[Content_Types].xml',
  '_rels/.rels',
  '3D/3dmodel.model',
  THREE_MF_MODEL_RELATIONSHIPS_ENTRY,
  THREE_MF_OBJECT_MODEL_ENTRY,
  THREE_MF_PROJECT_SETTINGS_ENTRY,
  THREE_MF_MODEL_SETTINGS_ENTRY,
] as const

function hasBytes(raw: Uint8Array, offset: number, length: number): boolean {
  return offset >= 0 && length >= 0 && offset <= raw.length - length
}

function readUint16(view: DataView, offset: number): number | null {
  if (offset < 0 || offset + 2 > view.byteLength) return null
  return view.getUint16(offset, true)
}

function readUint32(view: DataView, offset: number): number | null {
  if (offset < 0 || offset + 4 > view.byteLength) return null
  return view.getUint32(offset, true)
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
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

function parseZip(bytes: ArrayBuffer): Map<string, Uint8Array> | null {
  const raw = new Uint8Array(bytes)
  if (raw.length < 22) return null
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  const firstEndOfCentralDirectory = Math.max(0, raw.length - 0xffff - 22)
  let endOffset = -1

  for (
    let offset = raw.length - 22;
    offset >= firstEndOfCentralDirectory;
    offset -= 1
  ) {
    if (readUint32(view, offset) !== 0x06054b50) continue
    const commentLength = readUint16(view, offset + 20)
    if (commentLength === null || offset + 22 + commentLength !== raw.length) {
      continue
    }
    endOffset = offset
    break
  }
  if (endOffset < 0) return null

  const diskNumber = readUint16(view, endOffset + 4)
  const centralDisk = readUint16(view, endOffset + 6)
  const entriesOnDisk = readUint16(view, endOffset + 8)
  const entryCount = readUint16(view, endOffset + 10)
  const centralSize = readUint32(view, endOffset + 12)
  const centralOffset = readUint32(view, endOffset + 16)
  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entriesOnDisk === null ||
    entryCount === null ||
    entriesOnDisk !== entryCount ||
    centralSize === null ||
    centralOffset === null ||
    centralOffset + centralSize !== endOffset ||
    entryCount === 0
  ) {
    return null
  }

  const entries = new Map<string, Uint8Array>()
  let cursor = centralOffset
  for (let index = 0; index < entryCount; index += 1) {
    if (!hasBytes(raw, cursor, 46) || readUint32(view, cursor) !== 0x02014b50) {
      return null
    }
    const flags = readUint16(view, cursor + 8)
    const method = readUint16(view, cursor + 10)
    const checksum = readUint32(view, cursor + 16)
    const compressedSize = readUint32(view, cursor + 20)
    const uncompressedSize = readUint32(view, cursor + 24)
    const nameLength = readUint16(view, cursor + 28)
    const extraLength = readUint16(view, cursor + 30)
    const commentLength = readUint16(view, cursor + 32)
    const diskStart = readUint16(view, cursor + 34)
    const localOffset = readUint32(view, cursor + 42)
    if (
      flags === null ||
      method !== 0 ||
      (flags & 0x1) !== 0 ||
      (flags & 0x8) !== 0 ||
      checksum === null ||
      compressedSize === null ||
      uncompressedSize === null ||
      compressedSize !== uncompressedSize ||
      nameLength === null ||
      extraLength === null ||
      commentLength === null ||
      diskStart !== 0 ||
      localOffset === null ||
      !hasBytes(raw, cursor, 46 + nameLength + extraLength + commentLength)
    ) {
      return null
    }
    const nameStart = cursor + 46
    const name = decodeUtf8(raw.slice(nameStart, nameStart + nameLength))
    if (!name || entries.has(name)) return null

    if (
      !hasBytes(raw, localOffset, 30) ||
      readUint32(view, localOffset) !== 0x04034b50
    ) {
      return null
    }
    const localFlags = readUint16(view, localOffset + 6)
    const localMethod = readUint16(view, localOffset + 8)
    const localChecksum = readUint32(view, localOffset + 14)
    const localCompressedSize = readUint32(view, localOffset + 18)
    const localUncompressedSize = readUint32(view, localOffset + 22)
    const localNameLength = readUint16(view, localOffset + 26)
    const localExtraLength = readUint16(view, localOffset + 28)
    if (
      localFlags !== flags ||
      localMethod !== method ||
      localChecksum !== checksum ||
      localCompressedSize !== compressedSize ||
      localUncompressedSize !== uncompressedSize ||
      localNameLength !== nameLength ||
      localExtraLength === null ||
      !hasBytes(
        raw,
        localOffset,
        30 + localNameLength + localExtraLength + compressedSize,
      )
    ) {
      return null
    }
    const localNameStart = localOffset + 30
    const localName = decodeUtf8(
      raw.slice(localNameStart, localNameStart + localNameLength),
    )
    if (localName !== name) return null
    const dataStart = localNameStart + localNameLength + localExtraLength
    const data = raw.slice(dataStart, dataStart + compressedSize)
    if (crc32(data) !== checksum) return null
    entries.set(name, data)
    cursor += 46 + nameLength + extraLength + commentLength
  }

  return cursor === endOffset ? entries : null
}

function attribute(attributes: string, name: string): string | null {
  const match = attributes.match(new RegExp(`\\b${name}="([^"]*)"`))
  return match?.[1] ?? null
}

function numericAttribute(attributes: string, name: string): number | null {
  const value = attribute(attributes, name)
  if (value === null || value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function validContentTypes(xml: string): boolean {
  if (!/^<\?xml\b[\s\S]*?\?>\s*<Types\b[\s\S]*<\/Types>\s*$/.test(xml)) {
    return false
  }
  return (
    xml.includes(
      `<Default Extension="rels" ContentType="${THREE_MF_RELATIONSHIPS_CONTENT_TYPE}"`,
    ) &&
    xml.includes(
      `<Default Extension="model" ContentType="${THREE_MF_MODEL_CONTENT_TYPE}"`,
    ) &&
    xml.includes(
      `<Default Extension="config" ContentType="${THREE_MF_MODEL_SETTINGS_CONTENT_TYPE}"`,
    )
  )
}

function validProjectSettings(
  json: string,
  expected: ThreeMfPackageExpectation,
): boolean {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return false
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false
  }

  const settings = parsed as Record<string, unknown>
  const stringArray = (value: unknown, expected: readonly string[]): boolean =>
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((item, index) => item === expected[index])

  return (
    settings.from === 'project' &&
    settings.name === 'project_settings' &&
    settings.version === '02.08.02.61' &&
    settings.printer_model === 'Bambu Lab A1' &&
    settings.printer_technology === 'FFF' &&
    stringArray(settings.nozzle_diameter, ['0.4']) &&
    stringArray(settings.extruder_type, ['Direct Drive']) &&
    stringArray(settings.filament_colour, expected.filamentColors) &&
    stringArray(settings.filament_map, ['1', '1']) &&
    stringArray(settings.filament_volume_map, ['0', '0'])
  )
}

function validRelationships(xml: string): boolean {
  const root = xml.match(
    /^<\?xml\b[\s\S]*?\?>\s*<Relationships\b[^>]*>([\s\S]*)<\/Relationships>\s*$/,
  )
  if (!root) return false
  const relationships = root[1]!.match(/<Relationship\b[^>]*\/\s*>/g) ?? []
  if (relationships.length !== 1) return false
  const relationship = relationships[0]!
  return (
    attribute(relationship, 'Target') === '/3D/3dmodel.model' &&
    attribute(relationship, 'Type') === THREE_MF_RELATIONSHIP_TYPE
  )
}

function validModelRelationships(xml: string): boolean {
  const root = xml.match(
    /^<\?xml\b[\s\S]*?\?>\s*<Relationships\b[^>]*>([\s\S]*)<\/Relationships>\s*$/,
  )
  if (!root) return false
  const relationships = root[1]!.match(/<Relationship\b[^>]*\/\s*>/g) ?? []
  if (relationships.length !== 1) return false
  const relationship = relationships[0]!
  return (
    attribute(relationship, 'Target') === '/3D/Objects/object_1.model' &&
    attribute(relationship, 'Type') === THREE_MF_RELATIONSHIP_TYPE
  )
}

function validMesh(meshXml: string): boolean {
  const mesh = meshXml.match(
    /^\s*<mesh>\s*<vertices>([\s\S]*?)<\/vertices>\s*<triangles>([\s\S]*?)<\/triangles>\s*<\/mesh>\s*$/,
  )
  if (!mesh) return false
  const verticesXml = mesh[1]!
  const trianglesXml = mesh[2]!
  const vertexTags = verticesXml.match(/<vertex\b[^>]*\/\s*>/g) ?? []
  const triangleTags = trianglesXml.match(/<triangle\b[^>]*\/\s*>/g) ?? []
  if (
    vertexTags.length === 0 ||
    triangleTags.length === 0 ||
    verticesXml.replace(/<vertex\b[^>]*\/\s*>/g, '').trim() !== '' ||
    trianglesXml.replace(/<triangle\b[^>]*\/\s*>/g, '').trim() !== ''
  ) {
    return false
  }

  for (const tag of vertexTags) {
    const coordinates = ['x', 'y', 'z'].map((name) =>
      numericAttribute(tag, name),
    )
    if (coordinates.some((coordinate) => coordinate === null)) {
      return false
    }
  }
  for (const tag of triangleTags) {
    const indices = ['v1', 'v2', 'v3'].map((name) =>
      numericAttribute(tag, name),
    )
    if (
      indices.some(
        (index) =>
          index === null ||
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= vertexTags.length,
      ) ||
      new Set(indices).size !== 3
    ) {
      return false
    }
  }
  return true
}

function validObjectModel(
  xml: string,
  expected: ThreeMfPackageExpectation,
): boolean {
  if (
    !/^<\?xml\b[\s\S]*?\?>\s*<model\b/.test(xml) ||
    (xml.match(/<model\b/g) ?? []).length !== 1 ||
    (xml.match(/<\/model>/g) ?? []).length !== 1 ||
    !/<\/model>\s*$/.test(xml) ||
    xml.includes('<!DOCTYPE') ||
    !xml.includes(`xmlns="${THREE_MF_MODEL_NAMESPACE}"`) ||
    !xml.includes('unit="millimeter"') ||
    !xml.includes('requiredextensions="p"')
  ) {
    return false
  }

  const materialSection = xml.match(
    /<basematerials\b[^>]*>([\s\S]*?)<\/basematerials>/,
  )
  if (!materialSection || attribute(materialSection[0], 'id') !== '1') {
    return false
  }
  const materials = materialSection[1]!.match(/<base\b[^>]*\/\s*>/g) ?? []
  if (materials.length !== 2) return false
  if (
    attribute(materials[0]!, 'name') !== expected.baseMaterialName ||
    attribute(materials[0]!, 'displaycolor') !== expected.baseMaterialColor ||
    attribute(materials[1]!, 'name') !== expected.accentMaterialName ||
    attribute(materials[1]!, 'displaycolor') !== expected.accentMaterialColor
  ) {
    return false
  }

  const objects = xml.match(/<object\b([^>]*)>([\s\S]*?)<\/object>/g) ?? []
  if (objects.length !== 2) return false
  const objectById = new Map<string, { attributes: string; body: string }>()
  for (const object of objects) {
    const match = object.match(/<object\b([^>]*)>([\s\S]*?)<\/object>/)
    if (!match) return false
    const id = attribute(match[1]!, 'id')
    if (!id || objectById.has(id)) return false
    objectById.set(id, { attributes: match[1]!, body: match[2]! })
  }

  const body = objectById.get('1')
  const accent = objectById.get('2')
  if (!body || !accent) return false
  if (
    attribute(body.attributes, 'type') !== 'model' ||
    attribute(body.attributes, 'name') !== 'body' ||
    attribute(body.attributes, 'pid') !== '1' ||
    attribute(body.attributes, 'pindex') !== '0' ||
    attribute(accent.attributes, 'type') !== 'model' ||
    attribute(accent.attributes, 'name') !== expected.accentPartName ||
    attribute(accent.attributes, 'pid') !== '1' ||
    attribute(accent.attributes, 'pindex') !== '1'
  ) {
    return false
  }
  if (!validMesh(body.body) || !validMesh(accent.body)) return false
  return (
    /<build\b[^>]*\/\s*>/.test(xml) &&
    (xml.match(/<item\b[^>]*\/\s*>/g) ?? []).length === 0
  )
}

function objectModelFaceCounts(xml: string): readonly [number, number] | null {
  const objects = xml.match(/<object\b[^>]*>[\s\S]*?<\/object>/g) ?? []
  if (objects.length !== 2) return null
  const counts = objects.map(
    (object) => (object.match(/<triangle\b[^>]*\/\s*>/g) ?? []).length,
  )
  if (counts.some((count) => count <= 0 || !Number.isSafeInteger(count))) {
    return null
  }
  return [counts[0]!, counts[1]!] as const
}

function validModel(xml: string): boolean {
  if (
    !/^<\?xml\b[\s\S]*?\?>\s*<model\b/.test(xml) ||
    (xml.match(/<model\b/g) ?? []).length !== 1 ||
    (xml.match(/<\/model>/g) ?? []).length !== 1 ||
    !/<\/model>\s*$/.test(xml) ||
    xml.includes('<!DOCTYPE') ||
    !xml.includes(`xmlns="${THREE_MF_MODEL_NAMESPACE}"`) ||
    !xml.includes('unit="millimeter"') ||
    !xml.includes('requiredextensions="p"') ||
    !xml.includes('<metadata name="Application">BambuStudio-') ||
    !xml.includes('<metadata name="BambuStudio:3mfVersion">1</metadata>')
  ) {
    return false
  }

  const resources = xml.match(/<resources\b[^>]*>([\s\S]*?)<\/resources>/)
  const parentObjects = resources?.[1]!.match(
    /<object\b[^>]*>[\s\S]*?<\/object>/g,
  )
  if (!resources || !parentObjects || parentObjects.length !== 1) return false
  const parent = parentObjects[0]!.match(
    /<object\b([^>]*)>([\s\S]*?)<\/object>/,
  )
  if (!parent || attribute(parent[1]!, 'id') !== '3') return false
  if (attribute(parent[1]!, 'type') !== 'model') return false

  const components = parent[2]!.match(
    /<components\b[^>]*>([\s\S]*?)<\/components>/,
  )
  if (!components) return false
  const componentTags = components[1]!.match(/<component\b[^>]*\/\s*>/g) ?? []
  if (componentTags.length !== 2) return false
  const componentIds = componentTags.map((tag) => attribute(tag, 'objectid'))
  if (
    componentIds[0] !== '1' ||
    componentIds[1] !== '2' ||
    componentTags.some(
      (tag) =>
        attribute(tag, 'path') !== '/3D/Objects/object_1.model' ||
        attribute(tag, 'transform') !== THREE_MF_IDENTITY_TRANSFORM,
    )
  ) {
    return false
  }
  if (parent[2]!.replace(components[0], '').trim() !== '') return false

  const build = xml.match(/<build\b[^>]*>([\s\S]*?)<\/build>/)
  if (!build) return false
  const buildItems = build[1]!.match(/<item\b[^>]*\/\s*>/g) ?? []
  return (
    buildItems.length === 1 &&
    attribute(buildItems[0]!, 'objectid') === '3' &&
    attribute(buildItems[0]!, 'transform') === THREE_MF_BUILD_TRANSFORM
  )
}

function validSettingsMetadata(
  tag: string | undefined,
  key: string,
  value: string,
): boolean {
  return (
    tag !== undefined &&
    attribute(tag, 'key') === key &&
    attribute(tag, 'value') === value
  )
}

function validSettingsPart(
  xml: string,
  id: string,
  name: string,
  extruder: string,
  sourceObjectId: string,
  sourceFileName: string,
): boolean {
  const part = xml.match(/^<part\b([^>]*)>([\s\S]*?)<\/part>\s*$/)
  if (!part) return false
  const meshStat = part[2]!.match(/<mesh_stat\b[^>]*\/\s*>/)
  if (!meshStat) return false
  const metadata = part[2]!.match(/<metadata\b[^>]*\/\s*>/g) ?? []
  if (
    metadata.length !== 9 ||
    part[2]!
      .replace(/<metadata\b[^>]*\/\s*>/g, '')
      .replace(meshStat[0], '')
      .trim() !== ''
  ) {
    return false
  }
  const nameMetadata = metadata.find((tag) => attribute(tag, 'key') === 'name')
  const extruderMetadata = metadata.find(
    (tag) => attribute(tag, 'key') === 'extruder',
  )
  const metadataFor = (key: string): string | undefined =>
    metadata.find((tag) => attribute(tag, 'key') === key)
  const meshFaceCount = numericAttribute(meshStat[0]!, 'face_count')
  return (
    attribute(part[1]!, 'id') === id &&
    attribute(part[1]!, 'subtype') === 'normal_part' &&
    attribute(part[1]!, 'uuid') !== null &&
    nameMetadata !== undefined &&
    validSettingsMetadata(nameMetadata, 'name', name) &&
    extruderMetadata !== undefined &&
    validSettingsMetadata(extruderMetadata, 'extruder', extruder) &&
    validSettingsMetadata(
      metadataFor('matrix'),
      'matrix',
      THREE_MF_IDENTITY_MATRIX,
    ) &&
    validSettingsMetadata(
      metadataFor('source_file'),
      'source_file',
      sourceFileName,
    ) &&
    validSettingsMetadata(
      metadataFor('source_object_id'),
      'source_object_id',
      sourceObjectId,
    ) &&
    validSettingsMetadata(
      metadataFor('source_volume_id'),
      'source_volume_id',
      '0',
    ) &&
    validSettingsMetadata(
      metadataFor('source_offset_x'),
      'source_offset_x',
      '0',
    ) &&
    validSettingsMetadata(
      metadataFor('source_offset_y'),
      'source_offset_y',
      '0',
    ) &&
    validSettingsMetadata(
      metadataFor('source_offset_z'),
      'source_offset_z',
      '0',
    ) &&
    meshFaceCount !== null &&
    Number.isSafeInteger(meshFaceCount) &&
    meshFaceCount > 0
  )
}

function settingsPartFaceCount(xml: string): number | null {
  const meshStat = xml.match(/<mesh_stat\b([^>]*)\/\s*>/)
  if (!meshStat) return null
  const count = numericAttribute(meshStat[1]!, 'face_count')
  return count !== null && Number.isSafeInteger(count) && count > 0
    ? count
    : null
}

function validSettingsObject(
  xml: string,
  expected: ThreeMfPackageExpectation,
  expectedPartFaceCounts?: readonly [number, number],
): boolean {
  const object = xml.match(/^<object\b([^>]*)>([\s\S]*?)<\/object>\s*$/)
  if (!object) return false
  const parts = object[2]!.match(/<part\b[^>]*>[\s\S]*?<\/part>/g) ?? []
  const remainder = object[2]!
    .replace(/<part\b[^>]*>[\s\S]*?<\/part>/g, '')
    .trim()
  const metadata = remainder.match(/<metadata\b[^>]*\/\s*>/g) ?? []
  if (
    metadata.length !== 3 ||
    parts.length !== 2 ||
    remainder.replace(/<metadata\b[^>]*\/\s*>/g, '').trim() !== ''
  ) {
    return false
  }
  const faceCount = metadata.find(
    (tag) => attribute(tag, 'face_count') !== null,
  )
  const objectFaceCount = faceCount
    ? numericAttribute(faceCount, 'face_count')
    : null
  const nameMetadata = metadata.find((tag) => attribute(tag, 'key') === 'name')
  const extruderMetadata = metadata.find(
    (tag) => attribute(tag, 'key') === 'extruder',
  )
  const bodyFaceCount = settingsPartFaceCount(parts[0]!)
  const textFaceCount = settingsPartFaceCount(parts[1]!)
  return (
    attribute(object[1]!, 'id') === '3' &&
    faceCount !== undefined &&
    nameMetadata !== undefined &&
    validSettingsMetadata(nameMetadata, 'name', expected.modelSettingsName) &&
    extruderMetadata !== undefined &&
    validSettingsMetadata(extruderMetadata, 'extruder', '1') &&
    objectFaceCount !== null &&
    Number.isSafeInteger(objectFaceCount) &&
    objectFaceCount > 0 &&
    bodyFaceCount !== null &&
    textFaceCount !== null &&
    validSettingsPart(
      parts[0]!,
      '1',
      'body',
      '1',
      '0',
      expected.sourceFileName,
    ) &&
    validSettingsPart(
      parts[1]!,
      '2',
      expected.accentPartName,
      '2',
      '1',
      expected.sourceFileName,
    ) &&
    objectFaceCount === bodyFaceCount + textFaceCount &&
    (expectedPartFaceCounts === undefined ||
      (bodyFaceCount === expectedPartFaceCounts[0] &&
        textFaceCount === expectedPartFaceCounts[1]))
  )
}

function validSettingsPlate(
  xml: string,
  expected: ThreeMfPackageExpectation,
): boolean {
  const plate = xml.match(/^<plate\b([^>]*)>([\s\S]*?)<\/plate>\s*$/)
  if (!plate) return false
  const instance = plate[2]!.match(
    /<model_instance\b[^>]*>([\s\S]*?)<\/model_instance>/,
  )
  if (!instance) return false
  const remainder = plate[2]!.replace(instance[0], '').trim()
  const metadata = remainder.match(/<metadata\b[^>]*\/\s*>/g) ?? []
  if (
    metadata.length !== 6 ||
    remainder.replace(/<metadata\b[^>]*\/\s*>/g, '').trim() !== ''
  ) {
    return false
  }
  const instanceMetadata = instance[1]!.match(/<metadata\b[^>]*\/\s*>/g) ?? []
  if (instanceMetadata.length !== 3) return false
  const metadataFor = (key: string): string | undefined =>
    metadata.find((tag) => attribute(tag, 'key') === key)
  return (
    attribute(plate[1]!, 'id') === null &&
    validSettingsMetadata(metadataFor('plater_id')!, 'plater_id', '1') &&
    validSettingsMetadata(
      metadataFor('plater_name')!,
      'plater_name',
      expected.platerName,
    ) &&
    validSettingsMetadata(metadataFor('locked')!, 'locked', 'false') &&
    validSettingsMetadata(
      metadataFor('filament_map_mode')!,
      'filament_map_mode',
      'Auto For Flush',
    ) &&
    validSettingsMetadata(
      metadataFor('filament_maps')!,
      'filament_maps',
      '1 2',
    ) &&
    validSettingsMetadata(
      metadataFor('filament_volume_maps')!,
      'filament_volume_maps',
      '1 1',
    ) &&
    validSettingsMetadata(instanceMetadata[0]!, 'object_id', '3') &&
    validSettingsMetadata(instanceMetadata[1]!, 'instance_id', '0') &&
    validSettingsMetadata(instanceMetadata[2]!, 'identify_id', '1')
  )
}

function validSettingsAssemble(xml: string): boolean {
  const assemble = xml.match(/^<assemble\b[^>]*>([\s\S]*?)<\/assemble>\s*$/)
  if (!assemble) return false
  const items = assemble[1]!.match(/<assemble_item\b[^>]*\/\s*>/g) ?? []
  if (items.length !== 3) return false
  return (
    items.every((item) => attribute(item, 'object_id') === '3') &&
    items.every(
      (item) => attribute(item, 'transform') === THREE_MF_IDENTITY_TRANSFORM,
    ) &&
    attribute(items[0]!, 'instance_id') === '0' &&
    attribute(items[0]!, 'offset') === '0 0 0' &&
    attribute(items[0]!, 'volume_id') === null &&
    attribute(items[1]!, 'offset') === null &&
    attribute(items[2]!, 'offset') === null &&
    attribute(items[1]!, 'volume_id') === '0' &&
    attribute(items[2]!, 'volume_id') === '1'
  )
}

function validModelSettings(
  xml: string,
  expected: ThreeMfPackageExpectation,
  expectedPartFaceCounts?: readonly [number, number],
): boolean {
  const root = xml.match(
    /^<\?xml\b[\s\S]*?\?>\s*<config\b([^>]*)>([\s\S]*?)<\/config>\s*$/,
  )
  if (!root || root[1]!.trim() !== '') return false

  const content = root[2]!
  const objects = content.match(/<object\b[^>]*>[\s\S]*?<\/object>/g) ?? []
  const plates = content.match(/<plate\b[^>]*>[\s\S]*?<\/plate>/g) ?? []
  const assembles =
    content.match(/<assemble\b[^>]*>[\s\S]*?<\/assemble>/g) ?? []
  if (objects.length !== 1 || plates.length !== 1 || assembles.length !== 1) {
    return false
  }

  const remainder = content
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/g, '')
    .replace(/<plate\b[^>]*>[\s\S]*?<\/plate>/g, '')
    .replace(/<assemble\b[^>]*>[\s\S]*?<\/assemble>/g, '')
    .trim()
  if (remainder !== '') return false

  return (
    validSettingsObject(objects[0]!, expected, expectedPartFaceCounts) &&
    validSettingsPlate(plates[0]!, expected) &&
    validSettingsAssemble(assembles[0]!)
  )
}

export function isValidThreeMfPackage(
  bytes: ArrayBuffer,
  expectation: ThreeMfPackageExpectation = THREE_MF_WALL_COVER_EXPECTATION,
): boolean {
  const entries = parseZip(bytes)
  if (!entries || entries.size !== REQUIRED_ENTRIES.length) return false
  for (const name of REQUIRED_ENTRIES) {
    if (!entries.has(name)) return false
  }
  const contentTypes = decodeUtf8(entries.get(REQUIRED_ENTRIES[0]!)!)
  const relationships = decodeUtf8(entries.get(REQUIRED_ENTRIES[1]!)!)
  const model = decodeUtf8(entries.get(REQUIRED_ENTRIES[2]!)!)
  const modelRelationships = decodeUtf8(entries.get(REQUIRED_ENTRIES[3]!)!)
  const objectModel = decodeUtf8(entries.get(REQUIRED_ENTRIES[4]!)!)
  const projectSettings = decodeUtf8(entries.get(REQUIRED_ENTRIES[5]!)!)
  const modelSettings = decodeUtf8(entries.get(REQUIRED_ENTRIES[6]!)!)
  const objectModelIsValid =
    objectModel !== null && validObjectModel(objectModel, expectation)
  const objectModelCounts =
    objectModel !== null ? objectModelFaceCounts(objectModel) : null
  return (
    contentTypes !== null &&
    relationships !== null &&
    model !== null &&
    modelRelationships !== null &&
    objectModel !== null &&
    projectSettings !== null &&
    modelSettings !== null &&
    validContentTypes(contentTypes) &&
    validRelationships(relationships) &&
    validModelRelationships(modelRelationships) &&
    validModel(model) &&
    objectModelIsValid &&
    objectModelCounts !== null &&
    validProjectSettings(projectSettings, expectation) &&
    validModelSettings(modelSettings, expectation, objectModelCounts)
  )
}
