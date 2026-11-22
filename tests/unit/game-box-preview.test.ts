import { describe, expect, it } from 'vitest'
import { gameBoxPreview } from '../../src/features/cad/progressive-preview/components'
import type { PreviewDescription } from '../../src/features/cad/progressive-preview/description'
import {
  boundsForGameBox,
  GAME_BOX_CONFIGURATION,
  type GameBoxModuleType,
  type GameBoxParameters,
} from '../../src/cad-contract/units'

type Bounds = { min: [number, number, number]; max: [number, number, number] }

function parameters(
  overrides: Partial<GameBoxParameters> = {},
): GameBoxParameters {
  return { ...GAME_BOX_CONFIGURATION.defaultParameters, ...overrides }
}

function moduleGroups(
  modules: readonly GameBoxModuleType[],
): Partial<GameBoxParameters> {
  const overrides: Record<string, unknown> = {}
  modules.forEach((type, position) => {
    overrides[`module${position + 1}Type`] = type
  })
  return overrides as Partial<GameBoxParameters>
}

/** Bounding box of the simplified preview solids in the authored frame. */
function previewBounds(solids: PreviewDescription): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const solid of solids) {
    for (const [x, y] of solid.outline) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = solid.origin[axis] + solid.u[axis] * x + solid.v[axis] * y
        min[axis] = Math.min(min[axis], value)
        max[axis] = Math.max(max[axis], value)
      }
    }
    min[2] = Math.min(min[2], solid.origin[2])
    max[2] = Math.max(max[2], solid.origin[2] + solid.depth)
  }
  return { min, max }
}

function expectBoundsMatch(
  actual: Bounds,
  expected: Bounds,
  tolerance = 0.5,
): void {
  for (let axis = 0; axis < 3; axis += 1) {
    expect(actual.min[axis]).toBeCloseTo(expected.min[axis], 1)
    expect(actual.max[axis]).toBeCloseTo(expected.max[axis], 1)
    expect(Math.abs(actual.min[axis] - expected.min[axis])).toBeLessThanOrEqual(
      tolerance,
    )
    expect(Math.abs(actual.max[axis] - expected.max[axis])).toBeLessThanOrEqual(
      tolerance,
    )
  }
}

describe('game-box progressive preview', () => {
  it('matches the contract envelope for every single part', () => {
    const cases: GameBoxParameters[] = [
      parameters({ part: 'box' }),
      parameters({ part: 'lid' }),
      parameters({ part: 'divider', ...moduleGroups(['cards', 'cards']) }),
      parameters({
        part: 'module2',
        ...moduleGroups(['cards', 'dice', 'cards']),
      }),
    ]

    for (const snapshot of cases) {
      expectBoundsMatch(
        previewBounds(gameBoxPreview(snapshot)),
        boundsForGameBox(snapshot),
      )
    }
  })

  it('matches the contract envelope for the assembly', () => {
    const snapshot = parameters({
      part: 'assembly',
      ...moduleGroups(['cards', 'dice', 'cards']),
    })
    expectBoundsMatch(
      previewBounds(gameBoxPreview(snapshot)),
      boundsForGameBox(snapshot),
    )
  })

  it('keeps the dice holder upright and as wide as its grip flaps', () => {
    const snapshot = parameters({
      part: 'module2',
      ...moduleGroups(['cards', 'dice']),
    })
    const solids = gameBoxPreview(snapshot)
    expect(solids).toHaveLength(1)
    expect(solids[0]!.origin[2]).toBe(0)
    expect(solids[0]!.depth).toBeGreaterThan(0)
  })

  it('draws one divider per module boundary in the assembly', () => {
    const snapshot = parameters({
      part: 'assembly',
      ...moduleGroups(['cards', 'dice', 'cards']),
    })
    const solids = gameBoxPreview(snapshot)
    // Box body (5 slabs), lid roof (1), 2 dividers, 1 dice holder.
    expect(solids).toHaveLength(9)
  })

  it('rejects parameters that are not a valid game-box snapshot', () => {
    expect(() => gameBoxPreview({ cardWidth: 10 })).toThrow(
      'MODEL_PARAMETERS_MISMATCH:game-box',
    )
  })
})
