import { describe, expect, it } from 'vitest'

import {
  installedBoundsForOpenGridOpenConnectOrganizer,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  openGridOpenConnectShelfInstalledBoundsFor,
  TISSUE_BOX_DEFAULTS,
  tissueBoxInstalledBounds,
} from '../../src/cad-contract/units'
import { getModelDefinition } from '../../src/features/cad/model-catalog'
import {
  wallDisplayPlanFor,
  wallDisplayRotationMatrix,
  wallMountPlacementFor,
  wallReadyBoundsFor,
  withWallDisplayRotation,
} from '../../src/features/cad/playground/wall-display'
import { PLAYGROUND_GRID_PITCH } from '../../src/cad-contract/scene'
import { rotatedFootprintAABB } from '../../src/features/cad/playground/occupancy'

const ORGANIZER_PARAMETERS = {
  ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  tiltAngle: 15,
}
const SHELF_PARAMETERS = {
  ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  angle: 10,
}
const TISSUE_PARAMETERS = { ...TISSUE_BOX_DEFAULTS, tiltAngle: 15 }

function applyMatrix(
  matrix: readonly number[],
  point: readonly [number, number, number],
): [number, number, number] {
  return [
    matrix[0]! * point[0] + matrix[1]! * point[1] + matrix[2]! * point[2],
    matrix[3]! * point[0] + matrix[4]! * point[1] + matrix[5]! * point[2],
    matrix[6]! * point[0] + matrix[7]! * point[1] + matrix[8]! * point[2],
  ]
}

describe('playground wall display plans', () => {
  it('declares a wall display plan for the three OpenConnect components', () => {
    for (const modelId of [
      'opengrid-openconnect-organizer',
      'opengrid-openconnect-shelf',
      'opengrid-openconnect-tissue-box',
    ] as const) {
      expect(wallDisplayPlanFor(getModelDefinition(modelId))).not.toBeNull()
    }
  })

  it('declares no wall display plan for base-face-mounted components', () => {
    expect(wallDisplayPlanFor(getModelDefinition('opengrid-snap'))).toBeNull()
  })

  it('maps the organizer print slot face to the wall and openings upward', () => {
    const plan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-organizer'),
    )!
    const matrix = wallDisplayRotationMatrix(plan, ORGANIZER_PARAMETERS)

    // The organizer's print-frame OpenConnect face normal is +Y.
    const slotFace = applyMatrix(matrix, [0, 1, 0])
    expect(slotFace[2]).toBeLessThan(0)
    // The installed-frame up direction (cavity openings) is +Z in print.
    const openings = applyMatrix(matrix, [0, 0, 1])
    expect(openings[1]).toBeLessThan(0)
  })

  it('maps the shelf print slot face to the wall and openings upward', () => {
    const plan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-shelf'),
    )!
    const matrix = wallDisplayRotationMatrix(plan, SHELF_PARAMETERS)

    const slotFace = applyMatrix(matrix, [0, 1, 0])
    expect(slotFace[2]).toBeLessThan(0)
    const openings = applyMatrix(matrix, [0, 0, 1])
    expect(openings[1]).toBeLessThan(0)
  })

  it('maps the tissue box print slot face to the wall and openings upward', () => {
    const plan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-tissue-box'),
    )!
    const matrix = wallDisplayRotationMatrix(plan, TISSUE_PARAMETERS)

    // The tissue box faces +Y in print, so its wall-side slot normal is -Y.
    const slotFace = applyMatrix(matrix, [0, -1, 0])
    expect(slotFace[2]).toBeLessThan(0)
    const openings = applyMatrix(matrix, [0, 0, 1])
    expect(openings[1]).toBeLessThan(0)
  })

  it('derives wall-ready bounds whose mount translation sits flush', () => {
    const organizerPlan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-organizer'),
    )!
    const organizerBounds = wallReadyBoundsFor(
      organizerPlan,
      ORGANIZER_PARAMETERS,
    )
    const organizerInstalled =
      installedBoundsForOpenGridOpenConnectOrganizer(ORGANIZER_PARAMETERS)
    // The rear interface (installed max Y) becomes the lowest Z, so the
    // mount translation -min Z seats it on the wall board plane.
    expect(organizerBounds.min[2]).toBeCloseTo(
      -Math.max(...[organizerInstalled.max[1]]),
      6,
    )
    expect(organizerBounds.min[2]).toBeLessThan(0)

    const tissuePlan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-tissue-box'),
    )!
    const tissueBounds = wallReadyBoundsFor(tissuePlan, TISSUE_PARAMETERS)
    // The tissue box wall face is the installed Y=0 plane.
    expect(tissueBounds.min[2]).toBeCloseTo(0, 6)
  })

  it('spans the installed width and height, not the print depth', () => {
    const organizerPlan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-organizer'),
    )!
    const organizerInstalled =
      installedBoundsForOpenGridOpenConnectOrganizer(ORGANIZER_PARAMETERS)
    const organizerWall = wallReadyBoundsFor(
      organizerPlan,
      ORGANIZER_PARAMETERS,
    )
    expect(organizerWall.max[0] - organizerWall.min[0]).toBeCloseTo(
      organizerInstalled.max[0] - organizerInstalled.min[0],
      6,
    )
    expect(organizerWall.max[1] - organizerWall.min[1]).toBeCloseTo(
      organizerInstalled.max[2] - organizerInstalled.min[2],
      6,
    )

    const shelfPlan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-shelf'),
    )!
    const shelfInstalled =
      openGridOpenConnectShelfInstalledBoundsFor(SHELF_PARAMETERS)
    const shelfWall = wallReadyBoundsFor(shelfPlan, SHELF_PARAMETERS)
    expect(shelfWall.max[0] - shelfWall.min[0]).toBeCloseTo(
      shelfInstalled.max[0] - shelfInstalled.min[0],
      6,
    )
    expect(shelfWall.max[1] - shelfWall.min[1]).toBeCloseTo(
      shelfInstalled.max[2] - shelfInstalled.min[2],
      6,
    )

    const tissuePlan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-tissue-box'),
    )!
    const tissueInstalled = tissueBoxInstalledBounds(TISSUE_PARAMETERS)
    const tissueWall = wallReadyBoundsFor(tissuePlan, TISSUE_PARAMETERS)
    expect(tissueWall.max[0] - tissueWall.min[0]).toBeCloseTo(
      tissueInstalled.max[0] - tissueInstalled.min[0],
      6,
    )
    expect(tissueWall.max[1] - tissueWall.min[1]).toBeCloseTo(
      tissueInstalled.max[2] - tissueInstalled.min[2],
      6,
    )
  })
})

describe('playground wall mount placement', () => {
  const organizerPlan = wallDisplayPlanFor(
    getModelDefinition('opengrid-openconnect-organizer'),
  )!
  const organizerWallBounds = wallReadyBoundsFor(
    organizerPlan,
    ORGANIZER_PARAMETERS,
  )

  function applyPlacement(
    orientation: readonly number[],
    translation: readonly number[],
    point: readonly [number, number, number],
  ): [number, number, number] {
    const rotated = applyMatrix(orientation, point)
    return [
      rotated[0] + translation[0],
      rotated[1] + translation[1],
      rotated[2] + translation[2],
    ]
  }

  it('seats the wall-ready bounds flush on the board plane', () => {
    const mount = wallMountPlacementFor(organizerWallBounds, {
      cellX: 2,
      cellY: -1,
      rotation: 0,
    })
    const worldYMin = mount.translation[1] + organizerWallBounds.min[2]
    const worldYMax = mount.translation[1] + organizerWallBounds.max[2]
    expect(worldYMin).toBeCloseTo(0, 6)
    expect(worldYMax).toBeCloseTo(
      organizerWallBounds.max[2] - organizerWallBounds.min[2],
      6,
    )
  })

  it('anchors the mounted footprint at the placement cell', () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const cellX = 3
      const cellY = -2
      const mount = wallMountPlacementFor(organizerWallBounds, {
        cellX,
        cellY,
        rotation,
      })
      const aabb = rotatedFootprintAABB(organizerWallBounds, rotation)
      expect(mount.translation[0]).toBeCloseTo(
        cellX * PLAYGROUND_GRID_PITCH - aabb.minX,
        6,
      )
      expect(mount.translation[2]).toBeCloseTo(
        cellY * PLAYGROUND_GRID_PITCH + aabb.maxY,
        6,
      )
    }
  })

  it('keeps the wall-ready placeholder center aligned and flush', () => {
    const cellX = 1
    const cellY = 4
    const mount = wallMountPlacementFor(organizerWallBounds, {
      cellX,
      cellY,
      rotation: 0,
    })
    const center = [
      (organizerWallBounds.min[0] + organizerWallBounds.max[0]) / 2,
      (organizerWallBounds.min[1] + organizerWallBounds.max[1]) / 2,
      (organizerWallBounds.min[2] + organizerWallBounds.max[2]) / 2,
    ] as const
    const world = applyPlacement(mount.orientation, mount.translation, center)
    const aabb = rotatedFootprintAABB(organizerWallBounds, 0)
    const spanX = aabb.maxX - aabb.minX
    const spanY = aabb.maxY - aabb.minY
    expect(world[0]).toBeCloseTo(cellX * PLAYGROUND_GRID_PITCH + spanX / 2, 6)
    expect(world[1]).toBeCloseTo(
      (organizerWallBounds.max[2] - organizerWallBounds.min[2]) / 2,
      6,
    )
    expect(world[2]).toBeCloseTo(cellY * PLAYGROUND_GRID_PITCH + spanY / 2, 6)
  })

  it('composes the display rotation into the mount for print-frame meshes', () => {
    const mount = wallMountPlacementFor(organizerWallBounds, {
      cellX: 0,
      cellY: 0,
      rotation: 0,
    })
    const display = wallDisplayRotationMatrix(
      organizerPlan,
      ORGANIZER_PARAMETERS,
    )
    const composed = withWallDisplayRotation(mount, display)
    // The print-frame OpenConnect face normal (+Y) must point into the wall
    // (world -Y); the mounted tilt keeps a small world +Z lean.
    const world = applyPlacement(composed.orientation, [0, 0, 0], [0, 1, 0])
    expect(world[0]).toBeCloseTo(0, 6)
    expect(world[1]).toBeLessThan(0)
  })
})
