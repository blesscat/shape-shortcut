import { describe, expect, it, vi } from 'vitest'
import {
  PROTOCOL_VERSION,
  type ExportReadyEvent,
} from '../../src/cad-contract/messages'
import { THREE_MF_BUILD_TRANSFORM } from '../../src/cad-contract/three-mf'
import {
  validateStepResponse,
  validateStlResponse,
  validateThreeMfPackage,
  validateThreeMfResponse,
  triggerFixedStepDownload,
  triggerStlDownload,
  triggerThreeMfDownload,
} from '../../src/features/cad/download'

function stepResponse(
  overrides: Record<string, unknown> = {},
): ExportReadyEvent {
  return {
    version: PROTOCOL_VERSION,
    kind: 'export.ready',
    requestId: 'response-1',
    operationId: 'export-1',
    modelRevision: 'rev-1',
    workerEpoch: 'epoch-1',
    format: 'step' as const,
    bytes: new Uint8Array([1, 2, 3]).buffer,
    mime: 'model/step' as const,
    fileName: 'box-20x30x40.step',
    ...overrides,
  } as ExportReadyEvent
}

describe('STEP response validation', () => {
  it('accepts a non-empty response for the expected revision', () => {
    expect(
      validateStepResponse(
        stepResponse(),
        'rev-1',
        'epoch-1',
        'box-20x30x40.step',
      ),
    ).toEqual({ valid: true })
  })

  const invalidCases: Array<[Record<string, unknown>, string]> = [
    [{ modelRevision: 'rev-2' }, 'revision'],
    [{ format: 'stl' }, 'metadata'],
    [{ mime: 'application/octet-stream' }, 'metadata'],
    [{ fileName: 'box.step.txt' }, 'extension'],
    [{ workerEpoch: 'epoch-2' }, 'worker epoch'],
    [{ fileName: 'box-21x30x40.step' }, 'filename'],
    [{ bytes: new ArrayBuffer(0) }, 'empty'],
  ]

  it.each(invalidCases)('rejects %s', (overrides) => {
    expect(
      validateStepResponse(
        stepResponse(overrides),
        'rev-1',
        'epoch-1',
        'box-20x30x40.step',
      ).valid,
    ).toBe(false)
  })
})

function stlResponse(
  overrides: Record<string, unknown> = {},
): ExportReadyEvent {
  const bytes = new ArrayBuffer(84 + 50)
  new DataView(bytes).setUint32(80, 1, true)
  return {
    version: PROTOCOL_VERSION,
    kind: 'export.ready',
    requestId: 'response-stl-1',
    operationId: 'export-stl-1',
    modelRevision: 'rev-1',
    workerEpoch: 'epoch-1',
    format: 'stl',
    bytes,
    mime: 'model/stl',
    fileName: 'box-20x30x40.stl',
    ...overrides,
  } as ExportReadyEvent
}

function mismatchedStlBytes(): ArrayBuffer {
  const bytes = new ArrayBuffer(84 + 50)
  new DataView(bytes).setUint32(80, 2, true)
  return bytes
}

describe('STL response validation', () => {
  it('accepts a valid binary STL response', () => {
    expect(
      validateStlResponse(
        stlResponse(),
        'rev-1',
        'epoch-1',
        'box-20x30x40.stl',
      ),
    ).toEqual({ valid: true })
  })

  const invalidCases: Array<[Record<string, unknown>, string]> = [
    [{ modelRevision: 'rev-2' }, 'revision'],
    [{ format: 'step' }, 'format'],
    [{ mime: 'application/octet-stream' }, 'metadata'],
    [{ fileName: 'box-20x30x40.step' }, 'extension'],
    [{ workerEpoch: 'epoch-2' }, 'worker epoch'],
    [{ bytes: new ArrayBuffer(84) }, 'truncated'],
    [{ bytes: mismatchedStlBytes() }, 'triangle count'],
  ]

  it.each(invalidCases)('rejects %s', (overrides) => {
    expect(
      validateStlResponse(
        stlResponse(overrides),
        'rev-1',
        'epoch-1',
        'box-20x30x40.stl',
      ).valid,
    ).toBe(false)
  })
})

describe('STL browser download adapter', () => {
  it('triggers a fixed STEP asset download with its user-facing filename', () => {
    const click = vi.fn()
    const anchor = { href: '', download: '', click }
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
    })

    triggerFixedStepDownload({
      url: '/downloads/snap-half.step',
      fileName: 'Half.step',
    })

    expect(anchor).toMatchObject({
      href: '/downloads/snap-half.step',
      download: 'Half.step',
    })
    expect(click).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })

  it('triggers one download and returns Object URL cleanup', () => {
    const click = vi.fn()
    const anchor = { href: '', download: '', click }
    const createObjectURL = vi.fn(() => 'blob:stl')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
    })
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const cleanup = triggerStlDownload(stlResponse())

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(anchor).toMatchObject({
      href: 'blob:stl',
      download: 'box-20x30x40.stl',
    })
    expect(click).toHaveBeenCalledOnce()
    cleanup()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:stl')

    vi.unstubAllGlobals()
  })
})

function threeMfBytes(
  modelTransform: (xml: string) => string = (xml) => xml,
  settingsTransform: (xml: string) => string = (xml) => xml,
  projectSettingsTransform: (json: string) => string = (json) => json,
): ArrayBuffer {
  let crc = (bytes: Uint8Array): number => {
    let value = 0xffffffff
    for (const byte of bytes) {
      value ^= byte
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
      }
    }
    return (value ^ 0xffffffff) >>> 0
  }
  const encoder = new TextEncoder()
  const entries = [
    [
      '[Content_Types].xml',
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="application/xml"/></Types>`,
    ],
    [
      '_rels/.rels',
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`,
    ],
    [
      '3D/3dmodel.model',
      `<?xml version="1.0"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"><metadata name="Application">BambuStudio-02.08.02.61</metadata><metadata name="BambuStudio:3mfVersion">1</metadata><resources><object id="3" p:UUID="00000001-61cb-4c03-9d28-80fed5dfa1dc" type="model"><components><component p:path="/3D/Objects/object_1.model" objectid="1" p:UUID="00010000-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/><component p:path="/3D/Objects/object_1.model" objectid="2" p:UUID="00010001-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/></components></object></resources><build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369"><item objectid="3" p:UUID="00000003-b1ec-4553-aec9-835e5b724bb4" transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1"/></build></model>`,
    ],
    [
      '3D/_rels/3dmodel.model.rels',
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/Objects/object_1.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`,
    ],
    [
      '3D/Objects/object_1.model',
      `<?xml version="1.0"?><model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="millimeter" xml:lang="en-US" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"><metadata name="BambuStudio:3mfVersion">1</metadata><resources><basematerials id="1"><base name="Wall Cover Body" displaycolor="#657080"/><base name="Wall Cover Text" displaycolor="#F4C542"/></basematerials><object id="1" p:UUID="00010000-81cb-4c03-9d28-80fed5dfa1dc" type="model" name="body" pid="1" pindex="0"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh></object><object id="2" p:UUID="00010001-81cb-4c03-9d28-80fed5dfa1dc" type="model" name="text" pid="1" pindex="1"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh></object></resources><build/></model>`,
    ],
    [
      'Metadata/project_settings.config',
      `{"extruder_type":["Direct Drive"],"filament_colour":["#657080","#F4C542"],"filament_flow_ratio":["1","1"],"filament_map":["1","1"],"filament_settings_id":["Bambu PLA Basic @BBL A1","Bambu PLA Basic @BBL A1"],"filament_type":["PLA","PLA"],"filament_vendor":["Bambu Lab","Bambu Lab"],"filament_volume_map":["0","0"],"from":"project","name":"project_settings","nozzle_diameter":["0.4"],"nozzle_volume_type":["Standard"],"physical_extruder_map":["0"],"print_extruder_id":["1"],"print_extruder_variant":["Direct Drive Standard"],"printer_extruder_id":["1"],"printer_extruder_variant":["Direct Drive Standard"],"printer_model":"Bambu Lab A1","printer_settings_id":"Bambu Lab A1 0.4 nozzle","printer_technology":"FFF","printer_variant":"0.4","single_extruder_multi_material":"1","version":"02.08.02.61"}`,
    ],
    [
      'Metadata/model_settings.config',
      `<?xml version="1.0"?><config><object id="3"><metadata key="name" value="opengrid-wall-cover"/><metadata key="extruder" value="1"/><metadata face_count="2"/><part id="1" subtype="normal_part" uuid="d61eef14-56af-4be9-bec2-808d851cfa24"><metadata key="name" value="body"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/><metadata key="source_file" value="opengrid-wall-cover.3mf"/><metadata key="source_object_id" value="0"/><metadata key="source_volume_id" value="0"/><metadata key="source_offset_x" value="0"/><metadata key="source_offset_y" value="0"/><metadata key="source_offset_z" value="0"/><metadata key="extruder" value="1"/><mesh_stat face_count="1" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/></part><part id="2" subtype="normal_part" uuid="81413479-78c8-4c21-b3e4-f05c65c66752"><metadata key="name" value="text"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/><metadata key="source_file" value="opengrid-wall-cover.3mf"/><metadata key="source_object_id" value="1"/><metadata key="source_volume_id" value="0"/><metadata key="source_offset_x" value="0"/><metadata key="source_offset_y" value="0"/><metadata key="source_offset_z" value="0"/><metadata key="extruder" value="2"/><mesh_stat face_count="1" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/></part></object><plate><metadata key="plater_id" value="1"/><metadata key="plater_name" value="OpenGrid Wall Cover"/><metadata key="locked" value="false"/><metadata key="filament_map_mode" value="Auto For Flush"/><metadata key="filament_maps" value="1 2"/><metadata key="filament_volume_maps" value="1 1"/><model_instance><metadata key="object_id" value="3"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="1"/></model_instance></plate><assemble><assemble_item object_id="3" instance_id="0" transform="1 0 0 0 1 0 0 0 1 0 0 0" offset="0 0 0"/><assemble_item object_id="3" volume_id="0" transform="1 0 0 0 1 0 0 0 1 0 0 0"/><assemble_item object_id="3" volume_id="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/></assemble></config>`,
    ],
  ] as const
  function transformEntry(name: string, content: string): string {
    if (name === '3D/3dmodel.model') {
      return modelTransform(content).replace(
        'transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1"',
        `transform="${THREE_MF_BUILD_TRANSFORM}" printable="1"`,
      )
    }
    if (name === '3D/Objects/object_1.model') {
      return modelTransform(content)
    }
    if (name === 'Metadata/model_settings.config') {
      return settingsTransform(content)
    }
    if (name === 'Metadata/project_settings.config') {
      return projectSettingsTransform(content)
    }
    return content
  }
  const encodedEntries = entries.map(([name, content]) => {
    const nameBytes = encoder.encode(name)
    const bytes = encoder.encode(transformEntry(name, content))
    return { nameBytes, bytes, checksum: crc(bytes) }
  })
  const localSize = encodedEntries.reduce(
    (total, entry) => total + 30 + entry.nameBytes.length + entry.bytes.length,
    0,
  )
  const centralSize = encodedEntries.reduce(
    (total, entry) => total + 46 + entry.nameBytes.length,
    0,
  )
  const raw = new Uint8Array(localSize + centralSize + 22)
  const view = new DataView(raw.buffer)
  let offset = 0
  const localOffsets: number[] = []
  for (const entry of encodedEntries) {
    localOffsets.push(offset)
    view.setUint32(offset, 0x04034b50, true)
    view.setUint16(offset + 4, 20, true)
    view.setUint16(offset + 6, 0x800, true)
    view.setUint32(offset + 14, entry.checksum, true)
    view.setUint32(offset + 18, entry.bytes.length, true)
    view.setUint32(offset + 22, entry.bytes.length, true)
    view.setUint16(offset + 26, entry.nameBytes.length, true)
    raw.set(entry.nameBytes, offset + 30)
    raw.set(entry.bytes, offset + 30 + entry.nameBytes.length)
    offset += 30 + entry.nameBytes.length + entry.bytes.length
  }
  const centralOffset = offset
  encodedEntries.forEach((entry, index) => {
    view.setUint32(offset, 0x02014b50, true)
    view.setUint16(offset + 4, 20, true)
    view.setUint16(offset + 6, 20, true)
    view.setUint16(offset + 8, 0x800, true)
    view.setUint32(offset + 16, entry.checksum, true)
    view.setUint32(offset + 20, entry.bytes.length, true)
    view.setUint32(offset + 24, entry.bytes.length, true)
    view.setUint16(offset + 28, entry.nameBytes.length, true)
    view.setUint32(offset + 42, localOffsets[index]!, true)
    raw.set(entry.nameBytes, offset + 46)
    offset += 46 + entry.nameBytes.length
  })
  view.setUint32(offset, 0x06054b50, true)
  view.setUint16(offset + 8, encodedEntries.length, true)
  view.setUint16(offset + 10, encodedEntries.length, true)
  view.setUint32(offset + 12, centralSize, true)
  view.setUint32(offset + 16, centralOffset, true)
  return raw.buffer
}

function threeMfResponse(
  overrides: Record<string, unknown> = {},
): ExportReadyEvent {
  return {
    version: PROTOCOL_VERSION,
    kind: 'export.ready',
    requestId: 'response-3mf-1',
    operationId: 'export-3mf-1',
    modelRevision: 'rev-1',
    workerEpoch: 'epoch-1',
    format: '3mf',
    bytes: threeMfBytes(),
    mime: 'model/3mf',
    fileName: 'opengrid-wall-cover.3mf',
    ...overrides,
  } as ExportReadyEvent
}

describe('3MF response validation', () => {
  it('accepts the expected multipart package markers', () => {
    expect(validateThreeMfPackage(threeMfBytes())).toBe(true)
    expect(
      validateThreeMfResponse(
        threeMfResponse(),
        'rev-1',
        'epoch-1',
        'opengrid-wall-cover.3mf',
      ),
    ).toEqual({ valid: true })
  })

  it('rejects an invalid package or metadata', () => {
    expect(validateThreeMfPackage(new ArrayBuffer(4))).toBe(false)
    const corrupted = new Uint8Array(threeMfBytes())
    corrupted[30 + new TextEncoder().encode('[Content_Types].xml').length] ^= 1
    expect(validateThreeMfPackage(corrupted.buffer)).toBe(false)
    expect(
      validateThreeMfPackage(threeMfBytes((xml) => xml.replace('v1="0"', ''))),
    ).toBe(false)
    expect(
      validateThreeMfPackage(
        threeMfBytes((xml) => xml.replace('</model>', '')),
      ),
    ).toBe(false)
    expect(
      validateThreeMfPackage(
        threeMfBytes((xml) => xml.replace('v1="0"', 'v1="3"')),
      ),
    ).toBe(false)
    expect(
      validateThreeMfPackage(
        threeMfBytes((xml) =>
          xml.replace(
            'transform="1 0 0 0 1 0 0 0 1 0 0 0"',
            'transform="2 0 0 0 1 0 0 0 1 0 0 0"',
          ),
        ),
      ),
    ).toBe(false)
    expect(
      validateThreeMfPackage(
        threeMfBytes((xml) =>
          xml.replace(
            'transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1"',
            'transform="2 0 0 0 1 0 0 0 1 0 0 0" printable="1"',
          ),
        ),
      ),
    ).toBe(false)
    expect(
      validateThreeMfPackage(
        threeMfBytes(undefined, (xml) =>
          xml.replace(
            'volume_id="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"',
            'volume_id="1" transform="2 0 0 0 1 0 0 0 1 0 0 0"',
          ),
        ),
      ),
    ).toBe(false)
    expect(
      validateThreeMfPackage(
        threeMfBytes(undefined, (xml) =>
          xml.replace(
            'key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"',
            'key="matrix" value="2 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"',
          ),
        ),
      ),
    ).toBe(false)
    expect(
      validateThreeMfPackage(
        threeMfBytes(undefined, (xml) =>
          xml.replace('metadata face_count="2"', 'metadata face_count="x"'),
        ),
      ),
    ).toBe(false)
    expect(
      validateThreeMfPackage(
        threeMfBytes(undefined, (xml) =>
          xml
            .replace('metadata face_count="2"', 'metadata face_count="3"')
            .replace('mesh_stat face_count="1"', 'mesh_stat face_count="2"'),
        ),
      ),
    ).toBe(false)
    expect(
      validateThreeMfPackage(
        threeMfBytes(undefined, undefined, (json) =>
          json.replace(
            '"printer_model":"Bambu Lab A1"',
            '"printer_model":"Unknown"',
          ),
        ),
      ),
    ).toBe(false)
    expect(
      validateThreeMfResponse(
        threeMfResponse({ mime: 'model/stl' }),
        'rev-1',
        'epoch-1',
      ).valid,
    ).toBe(false)
    expect(
      validateThreeMfResponse(
        threeMfResponse({ bytes: new Uint8Array([1]).buffer }),
        'rev-1',
        'epoch-1',
      ).valid,
    ).toBe(false)
  })

  it('rejects separate build items instead of the Bambu parent object', () => {
    const separateItemsPackage = threeMfBytes((xml) =>
      xml.replace(
        '<build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369"><item objectid="3" p:UUID="00000003-b1ec-4553-aec9-835e5b724bb4" transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1"/></build>',
        '<build><item objectid="1"/><item objectid="2"/></build>',
      ),
    )

    expect(validateThreeMfPackage(separateItemsPackage)).toBe(false)
  })

  it('rejects a package that maps both parts to the same filament slot', () => {
    const sameSlotPackage = threeMfBytes(undefined, (xml) =>
      xml.replace('key="extruder" value="2"', 'key="extruder" value="1"'),
    )

    expect(validateThreeMfPackage(sameSlotPackage)).toBe(false)
  })
})

describe('3MF browser download adapter', () => {
  it('triggers one download and returns Object URL cleanup', () => {
    const click = vi.fn()
    const anchor = { href: '', download: '', click }
    const createObjectURL = vi.fn(() => 'blob:3mf')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
    })
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const cleanup = triggerThreeMfDownload(threeMfResponse())

    expect(anchor).toMatchObject({
      href: 'blob:3mf',
      download: 'opengrid-wall-cover.3mf',
    })
    expect(click).toHaveBeenCalledOnce()
    cleanup()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:3mf')

    vi.unstubAllGlobals()
  })
})

describe('3MF custom palette metadata', () => {
  const recolor = (value: string) =>
    value.replaceAll('#657080', '#123abc').replaceAll('#F4C542', '#def456')
  it('accepts matching arbitrary colors', () => {
    expect(
      validateThreeMfPackage(threeMfBytes(recolor, undefined, recolor)),
    ).toBe(true)
  })
  it('accepts equal colors without merging parts', () => {
    const equal = (value: string) =>
      value.replaceAll('#657080', '#abcdef').replaceAll('#F4C542', '#abcdef')
    expect(validateThreeMfPackage(threeMfBytes(equal, undefined, equal))).toBe(
      true,
    )
  })
  it('compares colors case-insensitively', () => {
    expect(
      validateThreeMfPackage(
        threeMfBytes(recolor, undefined, (value) =>
          recolor(value).replaceAll('#123abc', '#123ABC'),
        ),
      ),
    ).toBe(true)
  })
  it('rejects disagreement even when both sides use formerly allowed colors', () => {
    expect(
      validateThreeMfPackage(
        threeMfBytes(undefined, undefined, (value) =>
          value.replaceAll('#F4C542', '#f59e0b'),
        ),
      ),
    ).toBe(false)
  })
  it('rejects malformed colors', () => {
    const invalid = (value: string) => value.replaceAll('#657080', '#gggggg')
    expect(
      validateThreeMfPackage(threeMfBytes(invalid, undefined, invalid)),
    ).toBe(false)
  })
})
