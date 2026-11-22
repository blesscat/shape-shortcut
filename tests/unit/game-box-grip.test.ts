import { describe, expect, it } from 'vitest'
import { filletCornerArc } from '../../src/cad-kernel/components/game-box/grip'

describe('grip flap corner fillet', () => {
  it('sets the tangent length from the interior angle, r / tan(θ/2)', () => {
    // A right-angled corner: the tangent points sit one radius away on
    // both edges and the arc reaches r·(√2 − 1)/√2 into the corner along
    // the bisector.
    const right = filletCornerArc(
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      0.15,
    )
    expect(right.start.x).toBeCloseTo(-0.15, 6)
    expect(right.start.y).toBeCloseTo(0, 6)
    expect(right.end.x).toBeCloseTo(0, 6)
    expect(right.end.y).toBeCloseTo(0.15, 6)
    expect(right.mid.x).toBeCloseTo(-0.043934, 5)
    expect(right.mid.y).toBeCloseTo(0.043934, 5)

    // A 60° corner: the tangent length grows to r·√3, so the arc stays
    // tangent to both shallow edges instead of cutting the corner off.
    const shallow = filletCornerArc(
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: -0.5, y: Math.sqrt(3) / 2 },
      0.15,
    )
    expect(shallow.start.x).toBeCloseTo(-0.15 * Math.sqrt(3), 6)
    expect(shallow.start.y).toBeCloseTo(0, 6)
    expect(shallow.end.x).toBeCloseTo((-0.15 * Math.sqrt(3)) / 2, 6)
    expect(shallow.end.y).toBeCloseTo(0.225, 6)
    expect(shallow.mid.x).toBeCloseTo(-0.129904, 5)
    expect(shallow.mid.y).toBeCloseTo(0.075, 5)
  })
})
