import { describe, expect, it } from 'vitest'

import type { ScenePlacement } from '../../src/cad-contract/scene'
import {
  gridPointFromWorld,
  snappedPlacementForDrag,
} from '../../src/features/cad/playground/drag-placement'

function placement(cellX: number, cellY: number): ScenePlacement {
  return { cellX, cellY, rotation: 90, supportedBy: null }
}

describe('playground drag placement', () => {
  it('maps the desktop X/Y plane to logical grid axes', () => {
    expect(gridPointFromWorld({ x: 84, y: -56, z: 123 }, 'desktop')).toEqual({
      x: 84,
      y: -56,
    })
  })

  it('maps the wall X/Z plane to logical grid axes', () => {
    expect(gridPointFromWorld({ x: 84, y: 123, z: -56 }, 'wall')).toEqual({
      x: 84,
      y: -56,
    })
  })

  it('applies snapped pointer deltas to the original cell anchor', () => {
    const original = placement(4, -3)
    const result = snappedPlacementForDrag({
      original,
      start: { x: 13, y: 17 },
      current: { x: 69, y: -11 },
    })

    expect(result).toEqual(placement(6, -4))
  })

  it('preserves the grab offset until motion crosses half a cell', () => {
    const original = placement(-2, 5)

    expect(
      snappedPlacementForDrag({
        original,
        start: { x: 27, y: 9 },
        current: { x: 40, y: -4 },
      }),
    ).toEqual(original)

    expect(
      snappedPlacementForDrag({
        original,
        start: { x: 27, y: 9 },
        current: { x: 42, y: -6 },
      }),
    ).toEqual(placement(-1, 4))
  })
})
