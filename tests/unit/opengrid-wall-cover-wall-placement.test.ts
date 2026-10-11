import { describe, expect, it } from 'vitest'

import {
  PLAYGROUND_GRID_PITCH,
  type ScenePlacement,
} from '../../src/cad-contract/scene'
import { OPENGRID_WALL_COVER_CONFIGURATION } from '../../src/cad-contract/units'
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
  type WallMountPlacement,
} from '../../src/features/cad/playground/wall-display'

type Point = readonly [number, number, number]

function mountedPoint(mount: WallMountPlacement, point: Point): Point {
  const m = mount.orientation
  const t = mount.translation
  return [
    m[0] * point[0] + m[1] * point[1] + m[2] * point[2] + t[0],
    m[3] * point[0] + m[4] * point[1] + m[5] * point[2] + t[1],
    m[6] * point[0] + m[7] * point[1] + m[8] * point[2] + t[2],
  ]
}

function characterCell(
  index: number,
  count: number,
  rotation: ScenePlacement['rotation'],
): readonly [number, number] {
  if (rotation === 90) return [0, count - 1 - index]
  if (rotation === 180) return [count - 1 - index, 0]
  if (rotation === 270) return [0, index]
  return [index, 0]
}

const rotations = [0, 90, 180, 270] as const
const coverCases = ['A', ' I A N ', '收納', 'ABCDEFGH'].flatMap((text) =>
  [true, false].flatMap((openConnect) =>
    rotations.map((rotation) => ({ text, openConnect, rotation })),
  ),
)

describe('Wall Cover grid mounting', () => {
  it.each(coverCases)(
    'centers $text with remover=$openConnect at rotation=$rotation',
    ({ text, openConnect, rotation }) => {
      const definition = getModelDefinition('opengrid-wall-cover')!
      const validation = definition.validateParameters({ text, openConnect })
      if (!validation.valid) throw new Error('invalid-test-label')
      const parameters = validation.value.parameters
      const plan = wallDisplayPlanFor(definition)
      expect(plan).not.toBeNull()
      if (!plan) throw new Error('missing-wall-cover-mount')

      const count = Array.from(text.replace(/\s/gu, '')).length
      const halfCover = OPENGRID_WALL_COVER_CONFIGURATION.coverWidth / 2
      const margin = PLAYGROUND_GRID_PITCH / 2 - halfCover
      const wallBounds = wallReadyBoundsFor(plan, parameters)
      const anchor = wallSocketAnchorFor(plan, parameters)

      for (const [cellX, cellY] of [
        [0, 0],
        [-4, 3],
      ]) {
        const placement = { cellX, cellY, rotation }
        const placeholderMount = wallMountPlacementFor(
          wallBounds,
          placement,
          anchor,
        )
        const readyMount = withWallDisplayRotation(
          placeholderMount,
          wallDisplayRotationMatrix(plan, parameters),
          wallDisplayTranslationFor(plan, parameters),
        )
        for (let index = 0; index < count; index += 1) {
          const centerX = (index - (count - 1) / 2) * PLAYGROUND_GRID_PITCH
          const center: Point = [centerX, 0, 0]
          const world = mountedPoint(readyMount, center)
          const placeholderWorld = mountedPoint(placeholderMount, center)
          const [column, row] = characterCell(index, count, rotation)
          expect(world[0]).toBeCloseTo(
            (cellX + column + 0.5) * PLAYGROUND_GRID_PITCH,
            8,
          )
          expect(world[1]).toBeCloseTo(0, 8)
          expect(world[2]).toBeCloseTo(
            (cellY + row + 0.5) * PLAYGROUND_GRID_PITCH,
            8,
          )
          for (let axis = 0; axis < 3; axis += 1) {
            expect(placeholderWorld[axis]).toBeCloseTo(world[axis], 8)
          }

          const corners = [-halfCover, halfCover].flatMap((dx) =>
            [-halfCover, halfCover].map((dy) =>
              mountedPoint(readyMount, [centerX + dx, dy, 0]),
            ),
          )
          const minX = Math.min(...corners.map((point) => point[0]))
          const maxX = Math.max(...corners.map((point) => point[0]))
          const minZ = Math.min(...corners.map((point) => point[2]))
          const maxZ = Math.max(...corners.map((point) => point[2]))
          expect(minX - (cellX + column) * PLAYGROUND_GRID_PITCH).toBeCloseTo(
            margin,
            8,
          )
          expect(
            (cellX + column + 1) * PLAYGROUND_GRID_PITCH - maxX,
          ).toBeCloseTo(margin, 8)
          expect(minZ - (cellY + row) * PLAYGROUND_GRID_PITCH).toBeCloseTo(
            margin,
            8,
          )
          expect((cellY + row + 1) * PLAYGROUND_GRID_PITCH - maxZ).toBeCloseTo(
            margin,
            8,
          )
        }

        const vertical = rotation === 90 || rotation === 270
        expect(wallDisplayCellRangeFor(plan, parameters, placement)).toEqual({
          minCellX: cellX,
          maxCellX: cellX + (vertical ? 1 : count) - 1,
          minCellY: cellY,
          maxCellY: cellY + (vertical ? count : 1) - 1,
        })
      }
    },
  )
})
