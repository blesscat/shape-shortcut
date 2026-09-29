import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ScenePlacement } from '../../src/cad-contract/scene'

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

import { createPlaygroundStore } from '../../src/features/cad/playground/store'

function sceneInstance(
  cellX: number,
  cellY: number,
): {
  modelId: string
  parameters: { width: number; depth: number; height: number }
  placement: ScenePlacement
} {
  return {
    modelId: 'box',
    parameters: { width: 20, depth: 30, height: 40 },
    placement: { cellX, cellY, rotation: 0, supportedBy: null },
  }
}

describe('playground store soft overlap', () => {
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
    // Two default boxes at disjoint placements: inst-1 occupies cells
    // (0,0)-(0,1); inst-2 starts far away and is moved explicitly per test.
    next.addInstance('box')
    next.addInstance('box')
    next.setPlacement('inst-1', 0, 0, 0)
    next.setPlacement('inst-2', 9, 9, 0)
    return next
  }

  it('commits an overlapping typed placement and flags both instances', () => {
    const next = setupStore()

    const result = next.setPlacement('inst-2', 0, 0, 0)
    expect(result.ok).toBe(true)

    const snapshot = next.getSnapshot()
    expect(snapshot.overlappingInstanceIds).toEqual(['inst-1', 'inst-2'])
    expect(snapshot.diagnostic).toBeNull()
    const committed = snapshot.instances.find(
      (instance) => instance.id === 'inst-2',
    )?.placement
    expect(committed).toEqual({
      cellX: 0,
      cellY: 0,
      rotation: 0,
      supportedBy: null,
    })
  })

  it('clears the overlap flags once the overlap is resolved', () => {
    const next = setupStore()

    next.setPlacement('inst-2', 0, 0, 0)
    expect(next.getSnapshot().overlappingInstanceIds).toHaveLength(2)

    next.setPlacement('inst-2', 9, 9, 0)
    expect(next.getSnapshot().overlappingInstanceIds).toEqual([])
  })

  it('answers the would-overlap query used for drag previews', () => {
    const next = setupStore()

    expect(next.validatePlacement('inst-2', 0, 0, 0)).toBe(false)
    expect(next.validatePlacement('inst-2', 5, 5, 0)).toBe(true)
  })

  it('flags parameter growth into a neighbor instead of blocking it', () => {
    const next = setupStore()

    // Adjacent: inst-2 occupies cells (1,0)-(1,1), touching inst-1's column.
    next.setPlacement('inst-2', 1, 0, 0)
    expect(next.getSnapshot().overlappingInstanceIds).toEqual([])

    // Growing inst-1's width to two cells (56 mm) reaches inst-2's column.
    next.setParameter('inst-1', 'width', '56')
    const snapshot = next.getSnapshot()
    expect(snapshot.overlappingInstanceIds).toEqual(['inst-1', 'inst-2'])
    const grown = snapshot.instances.find(
      (instance) => instance.id === 'inst-1',
    )
    expect(grown?.parameters).toMatchObject({ width: 56 })
    expect(grown?.fieldErrors).toEqual({})

    // Shrinking back resolves the overlap.
    next.setParameter('inst-1', 'width', '20')
    expect(next.getSnapshot().overlappingInstanceIds).toEqual([])

    // Deleting either side also resolves an overlap.
    next.setParameter('inst-1', 'width', '56')
    expect(next.getSnapshot().overlappingInstanceIds).toHaveLength(2)
    next.removeInstance('inst-2')
    expect(next.getSnapshot().overlappingInstanceIds).toEqual([])
  })

  it('imports a scene file with in-file conflicts instead of rejecting it', () => {
    const next = setupStore()

    const scene = {
      schemaVersion: 1,
      kind: 'shape-shortcut/scene',
      grid: { system: 'opengrid' },
      instances: [sceneInstance(0, 0), sceneInstance(0, 0)],
    }
    const imported = next.importScene(JSON.stringify(scene))
    expect(imported).toBe(true)

    const snapshot = next.getSnapshot()
    expect(snapshot.instances).toHaveLength(2)
    expect(snapshot.overlappingInstanceIds).toEqual(['inst-3', 'inst-4'])
  })
})
