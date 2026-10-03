import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ModelId } from '../../src/cad-contract/units'

const sentCommands = vi.hoisted(() => [] as unknown[])

vi.mock('../../src/features/cad/worker-client', () => {
  let operationCounter = 0
  return {
    CadWorkerClient: class {
      onEvent() {
        return () => {}
      }
      onError() {
        return () => {}
      }
      send(command: unknown) {
        sentCommands.push(command)
      }
      terminate() {}
    },
    newOperationId: (prefix: string) => `${prefix}-${(operationCounter += 1)}`,
  }
})

import { getModelDefinition } from '../../src/features/cad/model-catalog'
import { createPlaygroundStore } from '../../src/features/cad/playground/store'

const WALL_ONLY_MODEL: ModelId = 'opengrid-openconnect-tissue-box'
const DESK_MODEL: ModelId = 'box'

function sceneFileWith(...modelIds: ModelId[]): string {
  return JSON.stringify({
    schemaVersion: 1,
    kind: 'shape-shortcut/scene',
    grid: { system: 'opengrid' },
    instances: modelIds.map((modelId) => {
      const definition = getModelDefinition(modelId)
      if (!definition) throw new Error(`unknown test model ${modelId}`)
      return {
        modelId,
        parameters: JSON.parse(JSON.stringify(definition.defaultParameters)),
      }
    }),
  })
}

describe('playground store import orientation notice', () => {
  let store: ReturnType<typeof createPlaygroundStore> | null = null

  afterEach(() => {
    store?.dispose()
    store = null
    vi.unstubAllGlobals()
    sentCommands.length = 0
  })

  function setupStore() {
    vi.stubGlobal('window', { location: { origin: 'http://test.local' } })
    const next = createPlaygroundStore()
    store = next
    return next
  }

  it('shows no notice when every imported instance is visible', () => {
    const next = setupStore()

    expect(next.importScene(sceneFileWith(DESK_MODEL))).toBe(true)

    const snapshot = next.getSnapshot()
    expect(snapshot.importNotice).toBeNull()
    expect(snapshot.diagnostic).toBeNull()
  })

  it('notifies when every imported instance belongs to the wall orientation', () => {
    const next = setupStore()

    expect(next.importScene(sceneFileWith(WALL_ONLY_MODEL))).toBe(true)

    const snapshot = next.getSnapshot()
    expect(snapshot.importNotice).toEqual({
      messageId: 'playground.import.hiddenInWallMode',
      params: { count: 1 },
    })
    expect(snapshot.diagnostic).toBeNull()
  })

  it('counts only the hidden instances in a mixed-orientation file', () => {
    const next = setupStore()

    expect(
      next.importScene(sceneFileWith(DESK_MODEL, WALL_ONLY_MODEL, DESK_MODEL)),
    ).toBe(true)

    const snapshot = next.getSnapshot()
    expect(snapshot.importNotice).toEqual({
      messageId: 'playground.import.hiddenInWallMode',
      params: { count: 1 },
    })
    expect(snapshot.instances).toHaveLength(3)
  })

  it('notifies about desktop-only instances imported in wall orientation', () => {
    const next = setupStore()
    next.setViewMode('wall')

    expect(next.importScene(sceneFileWith(DESK_MODEL))).toBe(true)

    expect(next.getSnapshot().importNotice).toEqual({
      messageId: 'playground.import.hiddenInDesktopMode',
      params: { count: 1 },
    })
  })

  it('clears the notice when the orientation switches', () => {
    const next = setupStore()

    expect(next.importScene(sceneFileWith(WALL_ONLY_MODEL))).toBe(true)
    expect(next.getSnapshot().importNotice).not.toBeNull()

    next.setViewMode('wall')
    expect(next.getSnapshot().importNotice).toBeNull()
  })

  it('never shows the notice for a rejected import', () => {
    const next = setupStore()

    expect(next.importScene('not json')).toBe(false)
    expect(next.getSnapshot().importNotice).toBeNull()
    expect(next.getSnapshot().diagnostic).not.toBeNull()

    // A later successful import sets the notice; a following rejection must
    // clear it instead of keeping the stale notice around.
    expect(next.importScene(sceneFileWith(WALL_ONLY_MODEL))).toBe(true)
    expect(next.getSnapshot().importNotice).not.toBeNull()
    expect(next.importScene('not json')).toBe(false)
    expect(next.getSnapshot().importNotice).toBeNull()
    expect(next.getSnapshot().diagnostic).not.toBeNull()
  })
})
