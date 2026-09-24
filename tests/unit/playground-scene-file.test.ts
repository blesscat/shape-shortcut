import { describe, expect, it } from 'vitest'

import { DEFAULT_MODEL_COLORS } from '../../src/cad-contract/model-colors'
import {
  PLAYGROUND_SCENE_MAX_INSTANCES,
  SCENE_FILE_KIND,
  SCENE_FILE_SCHEMA_VERSION,
} from '../../src/cad-contract/scene'
import { OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS } from '../../src/cad-contract/units'
import {
  parsePlaygroundSceneFile,
  serializePlaygroundScene,
} from '../../src/features/cad/playground/scene-file'

function sceneFileWith(instances: unknown[]): Record<string, unknown> {
  return {
    schemaVersion: SCENE_FILE_SCHEMA_VERSION,
    kind: SCENE_FILE_KIND,
    grid: { system: 'opengrid' },
    colors: { primary: '#112233', secondary: '#445566' },
    instances,
  }
}

function stackableBoxParameters(): Record<string, unknown> {
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: 2,
    y: 1,
  }
}

describe('playground scene file parsing', () => {
  it('parses a valid scene with placements and per-instance colors', () => {
    const result = parsePlaygroundSceneFile(
      sceneFileWith([
        {
          label: '底層左邊',
          modelId: 'opengrid-stackable-box',
          parameters: stackableBoxParameters(),
          placement: { cellX: 0, cellY: 1, rotation: 90, supportedBy: null },
          colors: { primary: '#22c55e' },
        },
        {
          modelId: 'box',
          parameters: { width: 20, depth: 30, height: 40 },
          placement: { cellX: -3, cellY: -2, rotation: 0, supportedBy: null },
        },
      ]),
    )
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.scene.grid).toBe('opengrid')
    expect(result.scene.colors).toEqual({
      primary: '#112233',
      secondary: '#445566',
    })
    expect(result.scene.instances).toHaveLength(2)
    const [first, second] = result.scene.instances
    expect(first.id).toBe('inst-1')
    expect(first.label).toBe('底層左邊')
    expect(first.modelId).toBe('opengrid-stackable-box')
    expect(first.placement).toEqual({
      cellX: 0,
      cellY: 1,
      rotation: 90,
      supportedBy: null,
    })
    expect(first.colors.primary).toBe('#22c55e')
    expect(first.colors.secondary).toBe('#445566')
    expect(second.placement?.cellX).toBe(-3)
    expect(second.colors).toEqual({
      primary: '#112233',
      secondary: '#445566',
    })
  })

  it('rejects non-object payloads and wrong kind', () => {
    expect(parsePlaygroundSceneFile('not-json').valid).toBe(false)
    expect(parsePlaygroundSceneFile(null).valid).toBe(false)
    const wrongKind = sceneFileWith([])
    wrongKind.kind = 'other'
    expect(parsePlaygroundSceneFile(wrongKind).valid).toBe(false)
  })

  it('rejects unsupported schema versions', () => {
    const file = sceneFileWith([
      {
        modelId: 'box',
        parameters: { width: 20, depth: 30, height: 40 },
      },
    ])
    file.schemaVersion = 99
    const result = parsePlaygroundSceneFile(file)
    expect(result.valid).toBe(false)
    if (result.valid) return
    expect(result.error.messageId).toBe(
      'diagnostic.sceneFileUnsupportedVersion',
    )
  })

  it('rejects unknown models with a diagnostic naming the model', () => {
    const result = parsePlaygroundSceneFile(
      sceneFileWith([
        {
          modelId: 'not-a-model',
          parameters: {},
        },
      ]),
    )
    expect(result.valid).toBe(false)
    if (result.valid) return
    expect(result.error.messageId).toBe('diagnostic.sceneUnknownModel')
    expect(result.error.params).toEqual({ modelId: 'not-a-model' })
  })

  it('rejects registered models with invalid parameters', () => {
    const result = parsePlaygroundSceneFile(
      sceneFileWith([
        {
          modelId: 'box',
          parameters: { width: -5, depth: 30, height: 40 },
        },
      ]),
    )
    expect(result.valid).toBe(false)
    if (result.valid) return
    expect(result.error.messageId).toBe(
      'diagnostic.sceneInstanceInvalidParameters',
    )
    expect(result.error.params).toEqual({ modelId: 'box' })
  })

  it('rejects invalid placements', () => {
    const result = parsePlaygroundSceneFile(
      sceneFileWith([
        {
          modelId: 'box',
          parameters: { width: 20, depth: 30, height: 40 },
          placement: { cellX: 0.5, cellY: 0, rotation: 0 },
        },
      ]),
    )
    expect(result.valid).toBe(false)
    if (result.valid) return
    expect(result.error.messageId).toBe('diagnostic.sceneInvalidPlacement')
  })

  it('normalizes legacy parameter values through the component validators', () => {
    const result = parsePlaygroundSceneFile(
      sceneFileWith([
        {
          modelId: 'opengrid-stackable-box',
          parameters: { ...stackableBoxParameters(), cornerSeatMode: 'hole' },
        },
      ]),
    )
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(
      (result.scene.instances[0].parameters as Record<string, unknown>)
        .cornerSeatMode,
    ).toBe('detachable-corner-seat')
  })

  it('falls back invalid instance colors to the scene palette', () => {
    const result = parsePlaygroundSceneFile(
      sceneFileWith([
        {
          modelId: 'box',
          parameters: { width: 20, depth: 30, height: 40 },
          colors: { primary: 'not-a-color' },
        },
      ]),
    )
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.scene.instances[0].colors.primary).toBe('#112233')
  })

  it('uses the default palette when the scene palette is invalid', () => {
    const file = sceneFileWith([
      {
        modelId: 'box',
        parameters: { width: 20, depth: 30, height: 40 },
      },
    ])
    file.colors = { primary: 'zzz' }
    const result = parsePlaygroundSceneFile(file)
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.scene.colors).toEqual(DEFAULT_MODEL_COLORS)
  })

  it('rejects files exceeding the instance cap without truncation', () => {
    const instances = Array.from(
      { length: PLAYGROUND_SCENE_MAX_INSTANCES + 1 },
      () => ({
        modelId: 'box',
        parameters: { width: 20, depth: 30, height: 40 },
      }),
    )
    const result = parsePlaygroundSceneFile(sceneFileWith(instances))
    expect(result.valid).toBe(false)
    if (result.valid) return
    expect(result.error.messageId).toBe('diagnostic.sceneTooManyInstances')
    expect(result.error.params).toEqual({
      max: PLAYGROUND_SCENE_MAX_INSTANCES,
    })
  })
})

describe('playground scene file serialization', () => {
  it('round trips instances through serialize and parse', () => {
    const sceneFile = serializePlaygroundScene(
      { primary: '#112233', secondary: '#445566' },
      [
        {
          label: '左邊',
          modelId: 'opengrid-stackable-box',
          parameters: stackableBoxParameters(),
          placement: {
            cellX: 0,
            cellY: 0,
            rotation: 180,
            supportedBy: null,
          },
          colors: { primary: '#22c55e', secondary: '#445566' },
        },
      ],
    )
    const text = JSON.stringify(sceneFile)
    const result = parsePlaygroundSceneFile(JSON.parse(text))
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.scene.instances[0].label).toBe('左邊')
    expect(result.scene.instances[0].placement?.rotation).toBe(180)
    expect(result.scene.instances[0].colors.primary).toBe('#22c55e')
  })

  it('omits placement for settings-file instances', () => {
    const sceneFile = serializePlaygroundScene(DEFAULT_MODEL_COLORS, [
      {
        label: null,
        modelId: 'box',
        parameters: { width: 20, depth: 30, height: 40 },
        placement: null,
        colors: DEFAULT_MODEL_COLORS,
      },
    ])
    expect(sceneFile.instances).toHaveLength(1)
    expect(sceneFile.instances[0].placement).toBeUndefined()
    expect(sceneFile.instances[0].label).toBeUndefined()
  })
})
