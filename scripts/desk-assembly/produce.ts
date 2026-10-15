import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { measureVolume, type Shape3D } from 'replicad'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_SNAP_CONFIGURATION,
  PILLAR_CONFIGURATION,
  normalizeOpenGridParameters,
} from '../../src/cad-contract/units'
import { buildOpenGridBRep } from '../../src/cad-kernel/components/opengrid/builder'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { buildPillar } from '../../src/cad-kernel/components/opengrid-pillar/builder'
import {
  buildOpenGridSnap,
  importOpenGridSnapReference,
  OPENGRID_SNAP_REFERENCE_URLS,
} from '../../src/cad-kernel/components/opengrid-snap/builder'
import {
  importOpenGridDetachableCornerSeatReference,
  importOpenGridDetachableCornerSeatHolderReference,
  OPEN_GRID_DETACHABLE_CORNER_SEAT_REFERENCE_URL,
  OPEN_GRID_DETACHABLE_CORNER_SEAT_HOLDER_REFERENCE_URL,
} from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'
import { meshBRep } from '../../src/cad-kernel/mesh'
import { assemblySceneAt } from './scenes.mjs'

async function blob(url: URL): Promise<Blob> {
  return new Blob([await readFile(url)])
}

function overlap(
  a: Shape3D,
  b: Shape3D,
  x = 0,
  y = 0,
  z = 0,
  degrees = 0,
): number {
  const placed = b
    .clone()
    .rotate(degrees, [0, 0, 0], [0, 0, 1])
    .translate(x, y, z)
  const intersection = a.intersect(placed)
  try {
    return Math.abs(measureVolume(intersection))
  } finally {
    intersection.delete()
    placed.delete()
  }
}

export async function produceAssembly(output: string): Promise<void> {
  if (!output) throw new Error('Pass a temporary JSON output path')
  const male = await importOpenGridDetachableCornerSeatReference(
    await blob(OPEN_GRID_DETACHABLE_CORNER_SEAT_REFERENCE_URL),
  )
  const female = await importOpenGridDetachableCornerSeatHolderReference(
    await blob(OPEN_GRID_DETACHABLE_CORNER_SEAT_HOLDER_REFERENCE_URL),
  )
  const snapReference = await importOpenGridSnapReference(
    await blob(OPENGRID_SNAP_REFERENCE_URLS.Standard.Lite),
    'Lite',
  )
  const boardSettings = normalizeOpenGridParameters({
    ...OPENGRID_CONFIGURATION.defaultParameters,
    rows: 2,
    columns: 2,
    variant: 'Lite',
    chamfers: 'none',
    screwMode: 'none',
    connectorHoles: 'none',
  })
  const boxSettings = {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: 2,
    y: 2,
    topRimMode: 'stacking-rail' as const,
    bottomMode: 'stacking' as const,
  }
  const snapSettings = {
    ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
    fourCornerLocatingHoles: true,
  }
  const settings = {
    board: boardSettings,
    'box-none': { ...boxSettings, cornerSeatMode: 'none' as const },
    'box-integrated': { ...boxSettings, cornerSeatMode: 'integrated' as const },
    'box-detachable': {
      ...boxSettings,
      cornerSeatMode: 'detachable-corner-seat' as const,
    },
    snap: snapSettings,
    seat: { ...PILLAR_CONFIGURATION.defaultParameters },
  }
  const context = {
    detachableCornerSeatReference: male,
    detachableCornerSeatHolderReference: female,
  }
  const shapes: Record<string, Shape3D> = {}
  try {
    shapes.board = await buildOpenGridBRep(settings.board)
    shapes['box-none'] = buildOpenGridStackableBox(settings['box-none'])
    shapes['box-integrated'] = buildOpenGridStackableBox(
      settings['box-integrated'],
    )
    shapes['box-detachable'] = buildOpenGridStackableBox(
      settings['box-detachable'],
      context,
    )
    shapes.snap = await buildOpenGridSnap(settings.snap, {
      getOpenGridSnapReference: async () => snapReference,
    })
    shapes.seat = await buildPillar(settings.seat, {
      detachableCornerSeatReference: male,
    })
    let low = 0.275
    let high = 4.1
    for (let i = 0; i < 16; i += 1) {
      const mid = (low + high) / 2
      if (overlap(shapes.board, shapes['box-none'], 0, 0, mid) > 1e-5) low = mid
      else high = mid
    }
    // Lite Board top is 4 mm; the printable Lite Snap is 3.4 mm tall.
    const datums = { directBoxZ: high, snapZ: 0.6, fixedBoxZ: 4 }
    const verification: Record<string, number> = {}
    const clear = (name: string, volume: number) => {
      assert(volume < 1e-5, `${name}: interference ${volume} mm³`)
      verification[name] = volume
    }
    const blocked = (name: string, volume: number) => {
      assert(volume > 0.01, `${name}: expected supporting/locking contact`)
      verification[name] = volume
    }
    assert(
      high > 1 && high < 2,
      'Direct resting must follow current foot relief',
    )
    for (const lift of [0, 0.2, 2, 28]) {
      clear(
        `direct-lift-${lift}`,
        overlap(shapes.board, shapes['box-none'], 0, 0, high + lift),
      )
    }
    blocked(
      'direct-below-rest',
      overlap(shapes.board, shapes['box-none'], 0, 0, high - 0.05),
    )
    blocked(
      'direct-lateral-support',
      overlap(shapes.board, shapes['box-none'], 1, 0, high),
    )
    for (const snap of assemblySceneAt('snap-fixing', 9, datums).filter(
      (part) => part.mesh === 'snap',
    )) {
      const [x, y, z] = snap.position
      clear(`${snap.id}-board`, overlap(shapes.board, shapes.snap, x, y, z))
      clear(
        `${snap.id}-box`,
        overlap(
          shapes.snap,
          shapes['box-integrated'],
          -x,
          -y,
          datums.fixedBoxZ - z,
        ),
      )
    }
    blocked(
      'snap-below-seat',
      overlap(shapes.board, shapes.snap, -14, -14, 0.55),
    )
    blocked(
      'fixed-box-below-rest',
      overlap(shapes.snap, shapes['box-integrated'], 14, 14, 3.35),
    )
    clear(
      'fixed-box-board',
      overlap(shapes.board, shapes['box-integrated'], 0, 0, datums.fixedBoxZ),
    )
    for (const time of [0, 2, 4, 5.75, 8]) {
      for (const seat of assemblySceneAt('locating-seats', time, datums).filter(
        (part) => part.mesh === 'seat',
      )) {
        const [x, y, z] = seat.position
        clear(
          `${seat.id}-time-${time}`,
          overlap(
            shapes['box-detachable'],
            shapes.seat,
            x + 36,
            y,
            z,
            (seat.rotationZ * 180) / Math.PI,
          ),
        )
      }
    }
    blocked(
      'locked-seat-resists-pull',
      overlap(shapes['box-detachable'], shapes.seat, -21, 21, -4, 90),
    )
    console.log(
      `Verified ${Object.keys(verification).length} native assembly contacts; direct rest Z=${high.toFixed(5)} mm`,
    )
    const meshes: Record<string, unknown> = {}
    for (const [id, shape] of Object.entries(shapes)) {
      const data = meshBRep(shape, { tolerance: 0.06, angularTolerance: 0.15 })
      meshes[id] = {
        positions: Array.from(data.positions),
        normals: Array.from(data.normals),
        indices: Array.from(data.indices),
        bounds: data.bounds,
        triangleCount: data.triangleCount,
      }
    }
    await writeFile(
      output,
      JSON.stringify({
        meshes,
        datums,
        verification,
        settings,
      }),
    )
  } finally {
    for (const shape of Object.values(shapes)) shape.delete()
    male.delete()
    female.delete()
    snapReference.delete()
  }
}
