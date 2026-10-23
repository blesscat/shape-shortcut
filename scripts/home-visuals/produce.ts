import { readFile, writeFile } from 'node:fs/promises'
import { measureVolume, type Shape3D } from 'replicad'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  normalizeOpenGridParameters,
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
    organizer: { ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS },
    shelf: { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS },
  }
  const lockedSlot = await importOpenGridOpenConnectShelfLockedSlot(
    new Blob([await readFile(openGridOpenConnectShelfLockedSlotAssetUrl)]),
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
    await writeFile(output, JSON.stringify({ meshes, settings, placements }))
  } finally {
    for (const shape of Object.values(shapes)) shape.delete()
    lockedSlot.delete()
  }
}
