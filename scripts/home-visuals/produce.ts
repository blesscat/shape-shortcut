import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { measureVolume, type Shape3D } from 'replicad'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  normalizeOpenGridParameters,
  openGridOpenConnectOrganizerLayoutFor,
  openGridOpenConnectOrganizerSlotOriginsFor,
  openGridOpenConnectShelfSlotOriginsFor,
  type OpenGridSnapParameters,
} from '../../src/cad-contract/units'
import { buildOpenGridBRep } from '../../src/cad-kernel/components/opengrid/builder'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { buildOpenGridStackableCylinder } from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'
import { buildOpenGridOpenConnectOrganizer } from '../../src/cad-kernel/components/opengrid-openconnect-organizer/builder'
import { buildOpenGridOpenConnectShelf } from '../../src/cad-kernel/components/opengrid-openconnect-shelf/builder'
import {
  importOpenGridOpenConnectShelfLockedSlot,
  openGridOpenConnectShelfLockedSlotAssetUrl,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot'
import { getSystemPreset } from '../../src/features/cad/system-entry-context'
import {
  buildOpenGridSnap,
  importOpenGridSnapReference,
  importOpenGridSnapOpenConnectHead,
  OPENGRID_SNAP_REFERENCE_URLS,
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_URL,
} from '../../src/cad-kernel/components/opengrid-snap/builder'
import { meshBRep } from '../../src/cad-kernel/mesh'

export async function produceHomeVisuals(output: string) {
  const settings = {
    board: normalizeOpenGridParameters({
      ...OPENGRID_CONFIGURATION.defaultParameters,
      columns: 6,
      rows: 4,
      variant: 'Lite',
      screwMode: 'none',
      chamfers: 'none',
      connectorHoles: 'none',
    }),
    box: {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 2,
      height: 36,
      cornerSeatMode: 'none' as const,
      bottomMode: 'stacking' as const,
      topRimMode: 'stacking-rail' as const,
    },
    tray: {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 2,
      height: 22,
      cornerSeatMode: 'none' as const,
      bottomMode: 'stacking' as const,
      topRimMode: 'stacking-rail' as const,
    },
    cylinder: {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 40,
      height: 62,
      bottomSeatMode: 'none' as const,
    },
    wallBoard: normalizeOpenGridParameters({
      ...OPENGRID_CONFIGURATION.defaultParameters,
      columns: 8,
      rows: 6,
      variant: 'Full',
      chamfers: 'none',
      connectorHoles: 'none',
    }),
    wallSnap: {
      ...(getSystemPreset('opengrid-snap', 'wall') as OpenGridSnapParameters),
      openConnect: true,
    },
    organizer: { ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS },
    squareOrganizer: {
      ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
      holeShape: 'rectangle' as const,
      holeCountX: 2,
      holeCountY: 1,
      holeWidth: 24,
      holeHeight: 24,
      holeDepth: 36,
      holeCornerRadius: 3,
    },
    smallShelf: {
      ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
      columns: 2,
      rows: 2,
    },
    shelf: { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS },
  }
  const lockedSlot = await importOpenGridOpenConnectShelfLockedSlot(
    new Blob([await readFile(openGridOpenConnectShelfLockedSlotAssetUrl)]),
  )
  const snapReference = await importOpenGridSnapReference(
    new Blob([await readFile(OPENGRID_SNAP_REFERENCE_URLS.Standard.Full)]),
    'Full',
  )
  const snapHead = await importOpenGridSnapOpenConnectHead(
    new Blob([await readFile(OPENGRID_SNAP_OPEN_CONNECT_HEAD_URL)]),
  )
  const context = { getLockedSlot: async () => lockedSlot }
  const shapes: Record<string, Shape3D> = {}
  try {
    shapes.board = await buildOpenGridBRep(settings.board)
    shapes.box = buildOpenGridStackableBox(settings.box)
    shapes.tray = buildOpenGridStackableBox(settings.tray)
    shapes.cylinder = buildOpenGridStackableCylinder(settings.cylinder)
    shapes.organizer = await buildOpenGridOpenConnectOrganizer(
      settings.organizer,
      context,
    )
    shapes.shelf = await buildOpenGridOpenConnectShelf(settings.shelf, context)
    shapes.wallBoard = await buildOpenGridBRep(settings.wallBoard)
    shapes.wallSnap = await buildOpenGridSnap(settings.wallSnap, {
      getOpenGridSnapReference: async () => snapReference,
      getOpenGridSnapOpenConnectHead: async () => snapHead,
    })
    shapes.squareOrganizer = await buildOpenGridOpenConnectOrganizer(
      settings.squareOrganizer,
      context,
    )
    shapes.smallShelf = await buildOpenGridOpenConnectShelf(
      settings.smallShelf,
      context,
    )
    // Return print-oriented meshes to installed coordinates before placing them.
    for (const id of ['organizer', 'squareOrganizer'] as const) {
      const layout = openGridOpenConnectOrganizerLayoutFor(settings[id])
      shapes[id] = shapes[id]!.rotate(
        settings[id].tiltAngle,
        [0, 0, 0],
        [1, 0, 0],
      ).translate(0, 0, layout.installedBodyPivotZ)
    }
    for (const id of ['shelf', 'smallShelf'] as const) {
      shapes[id] = shapes[id]!.rotate(-settings[id].angle, [0, 0, 0], [1, 0, 0])
    }
    shapes.wallBoard = shapes.wallBoard
      .rotate(90, [0, 0, 0], [1, 0, 0])
      .translate(0, 0, 84)
    shapes.wallSnap = shapes.wallSnap.rotate(90, [0, 0, 0], [1, 0, 0])
    const wallParts = [
      { mesh: 'wallBoard', color: '#d4c5b4', position: [0, 0, 0] },
    ]
    const mounting = [
      {
        mesh: 'organizer',
        color: '#7eaa99',
        firstX: -70,
        firstZ: 126,
        slots: openGridOpenConnectOrganizerSlotOriginsFor(settings.organizer),
      },
      {
        mesh: 'squareOrganizer',
        color: '#a8b9c3',
        firstX: -70,
        firstZ: 70,
        slots: openGridOpenConnectOrganizerSlotOriginsFor(
          settings.squareOrganizer,
        ),
      },
      {
        mesh: 'shelf',
        color: '#dc927b',
        firstX: 14,
        firstZ: 42,
        slots: openGridOpenConnectShelfSlotOriginsFor(settings.shelf),
      },
      {
        mesh: 'smallShelf',
        color: '#e9bd74',
        firstX: 42,
        firstZ: 126,
        slots: openGridOpenConnectShelfSlotOriginsFor(settings.smallShelf),
      },
    ]
    for (const entry of mounting) {
      const first = entry.slots[0]!
      // Full Board/Snap front lies at y=-6.8. Match the socket's rear datum.
      const position = [
        entry.firstX - first[0],
        -6.8 - first[1],
        entry.firstZ - first[2],
      ]
      wallParts.push({ mesh: entry.mesh, color: entry.color, position })
      for (const slot of entry.slots) {
        const x = slot[0] + position[0]!
        const z = slot[2] + position[2]!
        assert(
          Math.abs((x + 98) % 28) < 1e-6 && Math.abs((z - 14) % 28) < 1e-6,
          'Connector must align with a Board cell',
        )
        assert(
          x >= -98 && x <= 98 && z >= 14 && z <= 154,
          'Connector outside Board',
        )
        wallParts.push({
          mesh: 'wallSnap',
          color: '#c8aa7a',
          position: [x, 0, z],
        })
      }
    }
    const wallClearances: Record<string, number> = {}
    const installedAccessories = wallParts.filter(
      (part) => part.mesh !== 'wallBoard' && part.mesh !== 'wallSnap',
    )
    for (const item of installedAccessories) {
      const placed = shapes[item.mesh]!.clone().translate(
        ...(item.position as [number, number, number]),
      )
      const intersection = shapes.wallBoard.intersect(placed)
      const volume = Math.abs(measureVolume(intersection))
      intersection.delete()
      placed.delete()
      assert(
        volume < 0.1,
        `${item.mesh} interferes with the Wall Board: ${volume} mm³`,
      )
      wallClearances[item.mesh] = volume
    }
    const placements = { boxZ: 0, trayZ: 0, cylinderZ: 0 }
    for (const [id, x, y] of [
      ['box', -56, 28],
      ['tray', -56, -28],
      ['cylinder', 14, 20],
    ] as const) {
      let low = 0
      let high = 5
      for (let iteration = 0; iteration < 20; iteration += 1) {
        const z = (low + high) / 2
        const placed = shapes[id]!.clone().translate(x, y, z)
        const intersection = shapes.board!.intersect(placed)
        const volume = Math.abs(measureVolume(intersection))
        intersection.delete()
        placed.delete()
        if (volume > 1e-5) low = z
        else high = z
      }
      placements[`${id}Z`] = high
    }
    const meshes: Record<string, unknown> = {}
    for (const [id, shape] of Object.entries(shapes)) {
      const mesh = meshBRep(shape, { tolerance: 0.08, angularTolerance: 0.2 })
      meshes[id] = {
        positions: Array.from(mesh.positions),
        normals: Array.from(mesh.normals),
        indices: Array.from(mesh.indices),
        bounds: mesh.bounds,
      }
    }
    await writeFile(
      output,
      JSON.stringify({
        meshes,
        settings,
        placements,
        wallParts,
        wallClearances,
      }),
    )
  } finally {
    for (const shape of Object.values(shapes)) shape.delete()
    lockedSlot.delete()
    snapReference.delete()
    snapHead.delete()
  }
}
