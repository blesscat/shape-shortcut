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

import {
  createPlaygroundStore,
  type PlaygroundStore,
} from '../../src/features/cad/playground/store'
import { PLAYGROUND_STACK_CLEARANCE_MM } from '../../src/features/cad/playground/occupancy'
import { SCENE_FILE_SCHEMA_VERSION } from '../../src/cad-contract/scene'
import {
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'

/**
 * Base Z (mm) of a box seated directly on another default box: the box
 * mating datum minus the guide clearance plus the render gap.
 */
const BOX_SEAT_Z =
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.height +
  OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight +
  OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailInnerChamfer +
  OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailInnerVerticalHeight -
  OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingGuideClearance +
  PLAYGROUND_STACK_CLEARANCE_MM

function sceneInstance(
  cellX: number,
  cellY: number,
): {
  modelId: string
  parameters: Record<string, unknown>
  placement: ScenePlacement
  wallPlacement: ScenePlacement
} {
  return {
    modelId: 'opengrid-stackable-box',
    parameters: { ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS },
    placement: { cellX, cellY, rotation: 0, supportedBy: null },
    wallPlacement: { cellX, cellY, rotation: 0, supportedBy: null },
  }
}

/** The drag-commit call the viewport makes for a desktop drag. */
function desktopDrag(
  store: PlaygroundStore,
  instanceId: string,
  cellX: number,
  cellY: number,
) {
  const result = store.setPlacementInViewMode(
    instanceId,
    cellX,
    cellY,
    0,
    'desktop',
    { elevateToTop: true },
  )
  expect(result.ok).toBe(true)
}

/** Instance ids in scene-file order. */
function orderOf(store: PlaygroundStore): string[] {
  return store.getSnapshot().instances.map((instance) => instance.id)
}

describe('playground store desktop drag stacking priority', () => {
  let store: PlaygroundStore | null = null

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
    next.addInstance('opengrid-stackable-box')
    next.addInstance('opengrid-stackable-box')
    next.setPlacement('inst-1', 0, 0, 0)
    next.setPlacement('inst-2', 9, 9, 0)
    return next
  }

  function setupThreeStack() {
    vi.stubGlobal('window', { location: { origin: 'http://test.local' } })
    const next = createPlaygroundStore()
    store = next
    expect(next.importScene(
      JSON.stringify({
        schemaVersion: SCENE_FILE_SCHEMA_VERSION,
        kind: 'shape-shortcut/scene',
        instances: [sceneInstance(0, 0), sceneInstance(0, 0), sceneInstance(0, 0)],
      }),
    )).toBe(true)
    return next
  }

  it('seats the dragged earlier piece on the later piece', () => {
    const next = setupStore()

    // inst-1 (added first) dragged onto inst-2's cells becomes the upper
    // piece despite being earlier in the order.
    desktopDrag(next, 'inst-1', 9, 9)

    const snapshot = next.getSnapshot()
    expect(orderOf(next)).toEqual(['inst-2', 'inst-1'])
    expect(snapshot.instanceStackedZ['inst-1']).toBeCloseTo(BOX_SEAT_Z)
    expect(snapshot.instanceStackedZ['inst-2']).toBe(0)
    expect(snapshot.overlappingInstanceIds).toEqual([])
  })

  it('previews the same seat height the drop commits', () => {
    const next = setupStore()

    const previewZ = next.stackedZForPlacement('inst-1', 9, 9, 0)
    desktopDrag(next, 'inst-1', 9, 9)

    expect(previewZ).toBeCloseTo(BOX_SEAT_Z)
    expect(next.getSnapshot().instanceStackedZ['inst-1']).toBeCloseTo(previewZ)
  })

  it('keeps the wall preview at ground level', () => {
    const next = setupStore()
    next.setViewMode('wall')
    expect(next.stackedZForPlacement('inst-1', 9, 9, 0)).toBe(0)
  })

  it('collapses the upper stack when a mid piece is dragged away and does not restore it', () => {
    const next = setupThreeStack()
    // Fresh import: inst-1 (bottom), inst-2 (middle), inst-3 (top).
    const snapshot = next.getSnapshot()
    expect(snapshot.instanceStackedZ['inst-2']).toBeCloseTo(BOX_SEAT_Z)
    expect(snapshot.instanceStackedZ['inst-3']).toBeCloseTo(2 * BOX_SEAT_Z)

    // Drag the middle piece onto a spot overlapping the bottom piece's
    // footprint: the dragged piece is processed last, so it seats on the
    // highest compatible support remaining there.
    desktopDrag(next, 'inst-2', 1, 1)

    const afterDrag = next.getSnapshot()
    expect(afterDrag.instanceStackedZ['inst-2']).toBeCloseTo(2 * BOX_SEAT_Z)
    // The former top piece re-derives at the drop and settles onto the
    // next best support — the bottom piece.
    expect(afterDrag.instanceStackedZ['inst-3']).toBeCloseTo(BOX_SEAT_Z)

    // Re-dropping the middle piece at its original cells does not restore
    // the previous arrangement: it is already last, so it lands on top.
    desktopDrag(next, 'inst-2', 0, 0)
    const restored = next.getSnapshot()
    expect(restored.instanceStackedZ['inst-2']).toBeCloseTo(2 * BOX_SEAT_Z)
    expect(restored.instanceStackedZ['inst-3']).toBeCloseTo(BOX_SEAT_Z)
  })

  it('moves the instance to the end of the order even without an overlap', () => {
    const next = setupStore()

    desktopDrag(next, 'inst-1', 5, 5)

    expect(orderOf(next)).toEqual(['inst-2', 'inst-1'])
    expect(next.getSnapshot().instanceStackedZ['inst-1']).toBe(0)

    // The new order now drives stacking: inst-2 dragged onto inst-1's new
    // cells seats on inst-1 even though inst-2 was added later.
    desktopDrag(next, 'inst-2', 5, 5)
    const snapshot = next.getSnapshot()
    expect(snapshot.instanceStackedZ['inst-2']).toBeCloseTo(BOX_SEAT_Z)
    expect(snapshot.instanceStackedZ['inst-1']).toBe(0)
  })

  it('reorders before conflict derivation on an incompatible overlap', () => {
    vi.stubGlobal('window', { location: { origin: 'http://test.local' } })
    const next = createPlaygroundStore()
    store = next
    // The prototype `box` has no stacking interface: an overlap flags
    // both sides instead of stacking.
    next.addInstance('box')
    next.addInstance('box')
    next.setPlacement('inst-1', 0, 0, 0)
    next.setPlacement('inst-2', 9, 9, 0)

    desktopDrag(next, 'inst-1', 9, 9)

    const snapshot = next.getSnapshot()
    expect(orderOf(next)).toEqual(['inst-2', 'inst-1'])
    expect([...snapshot.overlappingInstanceIds].sort()).toEqual([
      'inst-1',
      'inst-2',
    ])
    expect(snapshot.instanceStackedZ['inst-1']).toBe(0)
    expect(snapshot.instanceStackedZ['inst-2']).toBe(0)
  })

  it('keeps the instance order on a wall drop', () => {
    const next = setupStore()
    next.setViewMode('wall')

    const result = next.setPlacementInViewMode('inst-1', 3, 4, 0, 'wall', {
      elevateToTop: false,
    })
    expect(result.ok).toBe(true)

    expect(orderOf(next)).toEqual(['inst-1', 'inst-2'])
  })

  it('keeps panel-driven placement edits pure (no reorder)', () => {
    const next = setupStore()

    expect(next.setPlacement('inst-1', 5, 5, 0).ok).toBe(true)

    expect(orderOf(next)).toEqual(['inst-1', 'inst-2'])
    expect(next.getSnapshot().instanceStackedZ['inst-1']).toBe(0)
  })

  it('preserves the drag-built stacking order across export and re-import', () => {
    const next = setupStore()
    desktopDrag(next, 'inst-1', 9, 9)
    const stackedZBefore = next.getSnapshot().instanceStackedZ

    const exported = next.exportSceneJson()

    vi.stubGlobal('window', { location: { origin: 'http://test.local' } })
    const fresh = createPlaygroundStore()
    // Drag order in the file becomes id order in a fresh store, so the
    // stacked Z values are compared positionally.
    const zBeforeInOrder = orderOf(next).map(
      (id) => stackedZBefore[id],
    )
    try {
      expect(fresh.importScene(exported)).toBe(true)
      const stackedZAfter = fresh.getSnapshot().instanceStackedZ
      const zAfterInOrder = orderOf(fresh).map((id) => stackedZAfter[id])
      expect(zAfterInOrder[0]).toBeCloseTo(zBeforeInOrder[0])
      expect(zAfterInOrder[1]).toBeCloseTo(zBeforeInOrder[1])
    } finally {
      fresh.dispose()
    }
  })
})
