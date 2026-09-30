import { describe, expect, it } from 'vitest'

import {
  installedBoundsForOpenGridOpenConnectOrganizer,
  openGridOpenConnectOrganizerLayoutFor,
  openGridOpenConnectOrganizerSlotOriginsFor,
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  openGridOpenConnectShelfInstalledBoundsFor,
  openGridOpenConnectShelfSlotOriginsFor,
  TISSUE_BOX_DEFAULTS,
  tissueBoxBounds,
  tissueBoxInstalledBounds,
  tissueBoxPrintPoint,
  tissueBoxSlotOrigins,
} from '../../src/cad-contract/units'
import { getModelDefinition } from '../../src/features/cad/model-catalog'
import {
  wallDisplayCellRangeFor,
  wallDisplayPlanFor,
  wallDisplayRotationMatrix,
  wallDisplayTranslationFor,
  wallMountPlacementFor,
  wallReadyBoundsFor,
  wallSocketAnchorFor,
  withWallDisplayRotation,
} from '../../src/features/cad/playground/wall-display'
import { PLAYGROUND_GRID_PITCH } from '../../src/cad-contract/scene'
import { rotatedFootprintAABB } from '../../src/features/cad/playground/occupancy'
import type { ModelBounds } from '../../src/cad-contract/units'

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
  const organizerSocketAnchor = wallSocketAnchorFor(
    organizerPlan,
    ORGANIZER_PARAMETERS,
  )!

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

  it('anchors the socket-grid span at the placement cell', () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const cellX = 3
      const cellY = -2
      const mount = wallMountPlacementFor(
        organizerWallBounds,
        { cellX, cellY, rotation },
        organizerSocketAnchor,
      )
      const spanBounds: ModelBounds = {
        min: [organizerSocketAnchor.minX, organizerSocketAnchor.minY, 0],
        max: [organizerSocketAnchor.maxX, organizerSocketAnchor.maxY, 0],
      }
      const span = rotatedFootprintAABB(spanBounds, rotation)
      expect(mount.translation[0]).toBeCloseTo(
        cellX * PLAYGROUND_GRID_PITCH - span.minX,
        6,
      )
      expect(mount.translation[2]).toBeCloseTo(
        cellY * PLAYGROUND_GRID_PITCH + span.maxY,
        6,
      )
    }
  })

  it('falls back to the body bounds anchor without declared sockets', () => {
    for (const rotation of [0, 90] as const) {
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
    const mount = wallMountPlacementFor(
      organizerWallBounds,
      { cellX, cellY, rotation: 0 },
      organizerSocketAnchor,
    )
    const center = [
      (organizerWallBounds.min[0] + organizerWallBounds.max[0]) / 2,
      (organizerWallBounds.min[1] + organizerWallBounds.max[1]) / 2,
      (organizerWallBounds.min[2] + organizerWallBounds.max[2]) / 2,
    ] as const
    const world = applyPlacement(mount.orientation, mount.translation, center)
    expect(world[1]).toBeCloseTo(
      (organizerWallBounds.max[2] - organizerWallBounds.min[2]) / 2,
      6,
    )
    expect(world[0]).toBeCloseTo(
      cellX * PLAYGROUND_GRID_PITCH + center[0] - organizerSocketAnchor.minX,
      6,
    )
    expect(world[2]).toBeCloseTo(
      cellY * PLAYGROUND_GRID_PITCH + organizerSocketAnchor.maxY - center[1],
      6,
    )
  })

  it('composes the display rotation into the mount for print-frame meshes', () => {
    const mount = wallMountPlacementFor(
      organizerWallBounds,
      {
        cellX: 0,
        cellY: 0,
        rotation: 0,
      },
      organizerSocketAnchor,
    )
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

describe('playground wall socket anchoring', () => {
  type SocketCase = {
    modelId:
      | 'opengrid-openconnect-organizer'
      | 'opengrid-openconnect-shelf'
      | 'opengrid-openconnect-tissue-box'
    parameters: Record<string, unknown>
    socketOrigins: Array<readonly [number, number, number]>
  }

  const CASES: SocketCase[] = [
    {
      modelId: 'opengrid-openconnect-organizer',
      parameters: ORGANIZER_PARAMETERS,
      socketOrigins:
        openGridOpenConnectOrganizerSlotOriginsFor(ORGANIZER_PARAMETERS),
    },
    {
      modelId: 'opengrid-openconnect-shelf',
      parameters: SHELF_PARAMETERS,
      socketOrigins: openGridOpenConnectShelfSlotOriginsFor(SHELF_PARAMETERS),
    },
    {
      modelId: 'opengrid-openconnect-tissue-box',
      parameters: TISSUE_PARAMETERS,
      socketOrigins: tissueBoxSlotOrigins(TISSUE_PARAMETERS),
    },
  ]

  /**
   * The print-frame twin of an installed-frame point: the inverse of the
   * plan's print-to-installed rotation and translation.
   */
  function printTwinFor(
    modelId: SocketCase['modelId'],
    parameters: Record<string, unknown>,
    installed: readonly [number, number, number],
  ): [number, number, number] {
    const plan = wallDisplayPlanFor(getModelDefinition(modelId))!
    const degrees = plan.printToInstalledRotXDegrees(parameters)
    const translation = plan.printToInstalledTranslationFor?.(parameters) ?? [
      0, 0, 0,
    ]
    const radians = (-degrees * Math.PI) / 180
    const cosine = Math.cos(radians)
    const sine = Math.sin(radians)
    const shifted = [
      installed[0] - translation[0],
      installed[1] - translation[1],
      installed[2] - translation[2],
    ] as const
    return [
      shifted[0],
      shifted[1] * cosine - shifted[2] * sine,
      shifted[1] * sine + shifted[2] * cosine,
    ]
  }

  function mountedSocketsFor(socketCase: SocketCase) {
    const plan = wallDisplayPlanFor(getModelDefinition(socketCase.modelId))!
    const wallBounds = wallReadyBoundsFor(plan, socketCase.parameters)
    const socketAnchor = wallSocketAnchorFor(plan, socketCase.parameters)
    const mount = wallMountPlacementFor(
      wallBounds,
      { cellX: 2, cellY: -1, rotation: 0 },
      socketAnchor,
    )
    const composed = withWallDisplayRotation(
      mount,
      wallDisplayRotationMatrix(plan, socketCase.parameters),
      wallDisplayTranslationFor(plan, socketCase.parameters),
    )
    return socketCase.socketOrigins.map((origin) => {
      const printTwin = printTwinFor(
        socketCase.modelId,
        socketCase.parameters,
        origin,
      )
      return applyPlacement(composed.orientation, composed.translation, [
        ...printTwin,
      ])
    })
  }

  it('registers every OpenConnect socket with a wall board cell center', () => {
    const anchorX = 2 * PLAYGROUND_GRID_PITCH
    const anchorY = -1 * PLAYGROUND_GRID_PITCH
    for (const socketCase of CASES) {
      for (const world of mountedSocketsFor(socketCase)) {
        // Sockets seat exactly on the board plane and land on cell centers.
        expect(world[1] / PLAYGROUND_GRID_PITCH).toBeCloseTo(0, 6)
        const cellOffsetX = (world[0] - anchorX) / PLAYGROUND_GRID_PITCH - 0.5
        const cellOffsetY = (world[2] - anchorY) / PLAYGROUND_GRID_PITCH - 0.5
        expect(Math.abs(cellOffsetX - Math.round(cellOffsetX))).toBeLessThan(
          1e-6,
        )
        expect(Math.abs(cellOffsetY - Math.round(cellOffsetY))).toBeLessThan(
          1e-6,
        )
      }
    }
  })

  it('seats the tissue box flush on the board through its translation', () => {
    // Regression: the tissue box print-to-installed transform carries an
    // offsetY translation that the mount must compose in; without it the
    // box sinks into the wall board by offsetY.
    const plan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-tissue-box'),
    )!
    const wallBounds = wallReadyBoundsFor(plan, TISSUE_PARAMETERS)
    const socketAnchor = wallSocketAnchorFor(plan, TISSUE_PARAMETERS)
    const mount = wallMountPlacementFor(
      wallBounds,
      { cellX: 0, cellY: 0, rotation: 0 },
      socketAnchor,
    )
    const composed = withWallDisplayRotation(
      mount,
      wallDisplayRotationMatrix(plan, TISSUE_PARAMETERS),
      wallDisplayTranslationFor(plan, TISSUE_PARAMETERS),
    )
    // The rear plate's bottom print corner (bounds min Y) is the interface
    // point closest to the board: it must sit exactly on the board plane.
    const plateEdge = tissueBoxBounds(TISSUE_PARAMETERS).min[1]
    const world = applyPlacement(composed.orientation, composed.translation, [
      0,
      plateEdge,
      0,
    ])
    expect(world[1]).toBeCloseTo(0, 6)
    expect(world[1]).toBeGreaterThanOrEqual(-1e-6)
  })

  it('derives the body cell range from the socket-anchored mount', () => {
    const plan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-tissue-box'),
    )!
    const range = wallDisplayCellRangeFor(plan, TISSUE_PARAMETERS, {
      cellX: 0,
      cellY: 0,
      rotation: 0,
    })
    // Defaults: an 8x3 socket grid occupying cells x 0..7, y 0..2; the
    // tilted body overhangs roughly one cell below and two cells above the
    // socket span.
    expect(range).toEqual({
      minCellX: 0,
      maxCellX: 7,
      minCellY: -1,
      maxCellY: 4,
    })
  })

  it('keeps every socket seated on the board across tilt adjustments', () => {
    // A tilt edit must leave the piece flush: the print-to-installed
    // rotation, translation, bounds, and socket anchor all re-derive from
    // the same parameters, so sockets stay on the board plane at any tilt.
    const tiltCases: SocketCase[] = [0, 15, 30, 45].flatMap((tiltAngle) => [
      {
        modelId: 'opengrid-openconnect-organizer' as const,
        parameters: { ...ORGANIZER_PARAMETERS, tiltAngle },
        socketOrigins: openGridOpenConnectOrganizerSlotOriginsFor({
          ...ORGANIZER_PARAMETERS,
          tiltAngle,
        }),
      },
      {
        modelId: 'opengrid-openconnect-tissue-box' as const,
        parameters: { ...TISSUE_PARAMETERS, tiltAngle },
        socketOrigins: tissueBoxSlotOrigins({
          ...TISSUE_PARAMETERS,
          tiltAngle,
        }),
      },
    ])
    for (const socketCase of tiltCases) {
      for (const world of mountedSocketsFor(socketCase)) {
        expect(world[1]).toBeCloseTo(0, 6)
      }
    }
  })

  it('composes the organizer builder pivot into the wall display plan', () => {
    // Regression: the builder's print frame is orientForPrint of the
    // installed frame — RotX(-tilt) after removing the installedBodyPivotZ
    // rise that placeBodyInInstalledCoordinates applies. The plan must
    // reproduce exactly that transform, or the mounted mesh rides
    // rearThickness*tan(tilt) off its installed position on the board.
    const plan = wallDisplayPlanFor(
      getModelDefinition('opengrid-openconnect-organizer'),
    )!
    for (const tiltAngle of [0, 15, 40]) {
      const parameters = { ...ORGANIZER_PARAMETERS, tiltAngle }
      const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
      const radians = (tiltAngle * Math.PI) / 180
      const cosine = Math.cos(radians)
      const sine = Math.sin(radians)
      const rise: readonly [number, number, number] = [
        0,
        0,
        layout.installedBodyPivotZ,
      ]
      // Builder print twin of an installed point: drop the rise, then undo
      // the print-to-installed rotation.
      const builderPrintTwin = (
        installed: readonly [number, number, number],
      ): [number, number, number] => {
        const shifted = [
          installed[0] - rise[0],
          installed[1] - rise[1],
          installed[2] - rise[2],
        ] as const
        return [
          shifted[0],
          shifted[1] * cosine + shifted[2] * sine,
          -shifted[1] * sine + shifted[2] * cosine,
        ]
      }
      const rotation = plan.printToInstalledRotXDegrees(parameters)
      const translation = plan.printToInstalledTranslationFor?.(parameters) ?? [
        0, 0, 0,
      ]
      expect(rotation).toBe(tiltAngle)
      expect(translation).toEqual(rise)
      const landmarks = [
        ...openGridOpenConnectOrganizerSlotOriginsFor(parameters),
        [
          layout.rearInterfaceWidth / 2,
          OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.rearThickness,
          layout.rearInterfaceHeight,
        ],
      ] as Array<readonly [number, number, number]>
      for (const installed of landmarks) {
        const printTwin = builderPrintTwin(installed)
        // The plan's own transform must carry the builder's print twin back
        // onto the authored installed point.
        const rotated = [
          printTwin[0],
          printTwin[1] * cosine - printTwin[2] * sine,
          printTwin[1] * sine + printTwin[2] * cosine,
        ] as const
        const restored = [
          rotated[0] + translation[0],
          rotated[1] + translation[1],
          rotated[2] + translation[2],
        ]
        for (let axis = 0; axis < 3; axis += 1) {
          expect(restored[axis]).toBeCloseTo(installed[axis], 9)
        }
      }
    }
  })
})
