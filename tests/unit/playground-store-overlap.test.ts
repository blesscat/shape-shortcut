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

import { createPlaygroundStore, type PlaygroundStore } from '../../src/features/cad/playground/store'
import { PLAYGROUND_STACK_CLEARANCE_MM } from '../../src/features/cad/playground/occupancy'
import {
  boundsForOpenGridStackableBox,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'

/** Authored top Z (mm) of a default stackable box. */
const BOX_TOP_MM = boundsForOpenGridStackableBox({
  ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
}).max[2]

/**
 * Base Z (mm) of a second default stackable box seated on the first: the
 * box mating datum minus the guide clearance plus the render gap.
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
} {
  return {
    modelId: 'opengrid-stackable-box',
    parameters: { ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS },
    placement: { cellX, cellY, rotation: 0, supportedBy: null },
  }
}

describe('playground store soft overlap', () => {
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
    // Two default stackable boxes (fully stackable interfaces) at disjoint
    // placements: inst-1 occupies cells (0,0)-(1,1); inst-2 starts far away
    // and is moved explicitly per test.
    next.addInstance('opengrid-stackable-box')
    next.addInstance('opengrid-stackable-box')
    next.setPlacement('inst-1', 0, 0, 0)
    next.setPlacement('inst-2', 9, 9, 0)
    return next
  }

  it('commits an overlapping desktop placement stacked on top without flags', () => {
    const next = setupStore()

    const result = next.setPlacement('inst-2', 0, 0, 0)
    expect(result.ok).toBe(true)

    const snapshot = next.getSnapshot()
    // Desktop stacking replaces the conflict: the later instance rests on
    // the earlier one's top (box height 40 mm) plus the fixed clearance.
    expect(snapshot.overlappingInstanceIds).toEqual([])
    expect(snapshot.instanceStackedZ['inst-1']).toBe(0)
    expect(snapshot.instanceStackedZ['inst-2']).toBeCloseTo(BOX_SEAT_Z)
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

  it('drops the stacked instance back to the floor when separated', () => {
    const next = setupStore()

    next.setPlacement('inst-2', 0, 0, 0)
    expect(next.getSnapshot().instanceStackedZ['inst-2']).toBeCloseTo(BOX_SEAT_Z)

    next.setPlacement('inst-2', 9, 9, 0)
    const snapshot = next.getSnapshot()
    expect(snapshot.overlappingInstanceIds).toEqual([])
    expect(snapshot.instanceStackedZ['inst-2']).toBe(0)
  })

  it('previews a drag onto an existing instance as a valid stack', () => {
    const next = setupStore()

    // Overlapping desktop placements stack, so the drag preview is valid.
    expect(next.validatePlacement('inst-2', 0, 0, 0)).toBe(true)
    expect(next.validatePlacement('inst-2', 5, 5, 0)).toBe(true)
  })

  it('keeps the preview Z equal to the committed Z for a non-last instance', () => {
    const next = setupStore()

    // inst-1 (first in the array) dragged onto inst-2's cells must preview
    // the committed arrangement: inst-1 grounds at Z=0 and inst-2 lifts on
    // top of it, not the other way around.
    expect(next.stackedZForPlacement('inst-1', 9, 9, 0)).toBe(0)

    next.setPlacement('inst-1', 9, 9, 0)
    const snapshot = next.getSnapshot()
    expect(snapshot.instanceStackedZ['inst-1']).toBe(0)
    expect(snapshot.instanceStackedZ['inst-2']).toBeCloseTo(BOX_SEAT_Z)
    expect(snapshot.overlappingInstanceIds).toEqual([])
  })

  it('lifts a neighbor when parameter growth reaches its column', () => {
    const next = setupStore()

    // Adjacent: the default 2x2 inst-1 spans (0,0)-(1,1); inst-2 starts at
    // its next free column (2,0)-(3,1) without touching it.
    next.setPlacement('inst-2', 2, 0, 0)
    expect(next.getSnapshot().instanceStackedZ['inst-2']).toBe(0)

    // Growing inst-1 to three cells wide reaches inst-2's column, so inst-2
    // re-derives onto inst-1's top instead of flagging.
    next.setParameter('inst-1', 'x', '3')
    const snapshot = next.getSnapshot()
    expect(snapshot.overlappingInstanceIds).toEqual([])
    expect(snapshot.instanceStackedZ['inst-2']).toBeCloseTo(BOX_SEAT_Z)
    const grown = snapshot.instances.find(
      (instance) => instance.id === 'inst-1',
    )
    expect(grown?.parameters).toMatchObject({ x: 3 })
    expect(grown?.fieldErrors).toEqual({})

    // Shrinking back settles inst-2 onto the floor again.
    next.setParameter('inst-1', 'x', '2')
    expect(next.getSnapshot().instanceStackedZ['inst-2']).toBe(0)

    // Deleting the supporter also drops the stacked instance.
    next.setParameter('inst-1', 'x', '3')
    expect(next.getSnapshot().instanceStackedZ['inst-2']).toBeCloseTo(BOX_SEAT_Z)
    next.removeInstance('inst-1')
    expect(next.getSnapshot().instanceStackedZ['inst-2']).toBe(0)
  })

  it('imports a scene file with in-file desktop overlaps as a stack', () => {
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
    expect(snapshot.overlappingInstanceIds).toEqual([])
    expect(snapshot.instanceStackedZ['inst-4']).toBeCloseTo(BOX_SEAT_Z)
  })

  it('flags only the instance whose stacked top exceeds the height limit', () => {
    const next = setupStore()
    const limit = BOX_TOP_MM + 10
    next.setSceneMaxHeightMm(limit)
    expect(next.getSnapshot().overHeightInstanceIds).toEqual([])

    next.setPlacement('inst-2', 0, 0, 0)
    // inst-1 tops out at BOX_TOP_MM (within the limit); inst-2's stacked
    // top is 2 * BOX_TOP_MM + clearance (over the limit) and is the only
    // flagged instance.
    expect(next.getSnapshot().overHeightInstanceIds).toEqual(['inst-2'])

    // Removing the limit clears the flag entirely.
    next.setSceneMaxHeightMm(null)
    expect(next.getSnapshot().overHeightInstanceIds).toEqual([])

    next.setSceneMaxHeightMm(limit)
    expect(next.getSnapshot().overHeightInstanceIds).toEqual(['inst-2'])
    // Lowering the offending stack clears the flag too.
    next.setPlacement('inst-2', 9, 9, 0)
    expect(next.getSnapshot().overHeightInstanceIds).toEqual([])
  })

  it('skips height evaluation in wall orientation', () => {
    const next = setupStore()
    next.setSceneMaxHeightMm(BOX_TOP_MM + 10)
    next.setPlacement('inst-2', 0, 0, 0)
    expect(next.getSnapshot().overHeightInstanceIds).toEqual(['inst-2'])

    next.setViewMode('wall')
    expect(next.getSnapshot().overHeightInstanceIds).toEqual([])
    expect(next.getSnapshot().instanceStackedZ).toEqual({})
  })

  it('flags incompatible overlapping desktop instances as conflicts', () => {
    // The prototype `box` has no stacking interface: overlapping pairs stay
    // grounded and flag on both sides instead of stacking.
    vi.stubGlobal('window', { location: { origin: 'http://test.local' } })
    const next = createPlaygroundStore()
    store = next
    next.addInstance('box')
    next.addInstance('box')
    next.setPlacement('inst-1', 0, 0, 0)
    next.setPlacement('inst-2', 9, 9, 0)

    const result = next.setPlacement('inst-2', 0, 0, 0)
    expect(result.ok).toBe(true)
    const snapshot = next.getSnapshot()
    expect(snapshot.overlappingInstanceIds).toEqual(['inst-1', 'inst-2'])
    expect(snapshot.instanceStackedZ['inst-2']).toBe(0)
    expect(snapshot.instanceStackedZ['inst-1']).toBe(0)

    // A compatible stack next to them is unaffected; inst-3 dropped onto
    // the interface-less box cannot stack either, so box and inst-3 flag
    // while the earlier pair's flags clear.
    next.setPlacement('inst-2', 9, 9, 0)
    next.addInstance('opengrid-stackable-box')
    next.setPlacement('inst-3', 0, 0, 0)
    expect(next.getSnapshot().overlappingInstanceIds).toEqual([
      'inst-1',
      'inst-3',
    ])
    expect(next.getSnapshot().instanceStackedZ['inst-3']).toBe(0)
  })

  it('does not flag desktop-stacked pairs after switching to wall', () => {
    const next = setupStore()
    next.setPlacement('inst-2', 0, 0, 0)
    expect(next.getSnapshot().overlappingInstanceIds).toEqual([])

    next.setViewMode('wall')
    expect(next.getSnapshot().overlappingInstanceIds).toEqual([])
  })

  it('ignores instances the active orientation does not display', () => {
    const next = setupStore()
    // A wall-system instance added while in desktop orientation stays
    // hidden: it must not occupy cells, flag conflicts, or trip the height
    // limit even though its stacked top would exceed it.
    // A limit above the visible boxes' own height (BOX_TOP_MM) but below
    // the hidden wall piece: only displayed instances are evaluated, so no
    // flag appears even though the wall piece would exceed it.
    next.setSceneMaxHeightMm(BOX_TOP_MM + 10)
    expect(next.addInstance('opengrid-openconnect-organizer')).toBe(true)
    next.setParameter('inst-3', 'holeDepth', '84')
    const snapshot = next.getSnapshot()
    expect(snapshot.instances).toHaveLength(3)
    expect(snapshot.overlappingInstanceIds).toEqual([])
    expect(snapshot.overHeightInstanceIds).toEqual([])
    expect(snapshot.instanceStackedZ['inst-3']).toBeUndefined()
  })

  it('carries the height limit through scene import and export', () => {
    const next = setupStore()
    next.setSceneMaxHeightMm(120)

    const exported = JSON.parse(next.exportSceneJson())
    expect(exported.maxHeightMm).toBe(120)

    const imported = next.importScene(next.exportSceneJson())
    expect(imported).toBe(true)
    expect(next.getSnapshot().maxHeightMm).toBe(120)

    // A file without the field imports as no limit.
    const bare = JSON.parse(next.exportSceneJson())
    delete bare.maxHeightMm
    expect(next.importScene(JSON.stringify(bare))).toBe(true)
    expect(next.getSnapshot().maxHeightMm).toBeNull()
  })

  it('occupies the installed wall footprint for wall-mount components', () => {
    const next = setupStore()
    next.setViewMode('wall')
    expect(next.addInstance('opengrid-openconnect-organizer')).toBe(true)
    expect(next.addInstance('opengrid-openconnect-organizer')).toBe(true)

    // A tall organizer: its installed height spans 4 wall rows, while the
    // print-frame depth would only span 3.
    next.setParameter('inst-3', 'holeDepth', '84')
    next.setPlacement('inst-3', 10, 0, 0)
    next.setPlacement('inst-4', 10, 2, 0)

    // Free under print-frame depth semantics, overlapping under the
    // installed wall footprint.
    expect(next.getSnapshot().overlappingInstanceIds).toEqual([
      'inst-3',
      'inst-4',
    ])
  })

  it.each([0, 90, 180, 270] as const)(
    'keeps eight centered covers adjacent without conflict at rotation %i',
    (rotation) => {
      const next = setupStore()
      next.setViewMode('wall')
      const vertical = rotation === 90 || rotation === 270
      const neighborX = -4 + (vertical ? 1 : 8)
      expect(
        next.importScene(
          JSON.stringify({
            schemaVersion: 1,
            kind: 'shape-shortcut/scene',
            instances: [
              {
                modelId: 'opengrid-wall-cover',
                parameters: { text: 'ABCDEFGH' },
                placement: {
                  cellX: -4,
                  cellY: -3,
                  rotation,
                  supportedBy: null,
                },
              },
              {
                modelId: 'opengrid-wall-cover',
                parameters: { text: 'A' },
                placement: {
                  cellX: neighborX,
                  cellY: -3,
                  rotation: 0,
                  supportedBy: null,
                },
              },
            ],
          }),
        ),
      ).toBe(true)
      expect(next.getSnapshot().overlappingInstanceIds).toEqual([])
      expect(next.validatePlacement('inst-4', neighborX, -3, 0)).toBe(true)

      const lastX = -4 + (vertical ? 0 : 7)
      const lastY = -3 + (vertical ? 7 : 0)
      next.setPlacement('inst-4', lastX, lastY, 0)
      expect(next.getSnapshot().overlappingInstanceIds).toEqual([
        'inst-3',
        'inst-4',
      ])
    },
  )
})
