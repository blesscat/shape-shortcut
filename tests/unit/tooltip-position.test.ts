import { describe, expect, it } from 'vitest'
import { computeTooltipLayout } from '../../src/features/cad/viewport/tooltip-position'

const BASE = {
  tooltipWidth: 100,
  tooltipHeight: 30,
  containerWidth: 400,
  containerHeight: 300,
}

describe('computeTooltipLayout', () => {
  it('places the tooltip at the lower-right of the pointer by default', () => {
    const layout = computeTooltipLayout({
      ...BASE,
      pointerX: 50,
      pointerY: 50,
    })
    expect(layout).toEqual({ left: 64, top: 64 })
  })

  it('flips to the left when the tooltip would overflow the right edge', () => {
    const layout = computeTooltipLayout({
      ...BASE,
      pointerX: 380,
      pointerY: 50,
    })
    expect(layout.left).toBe(380 - 14 - 100)
    expect(layout.left).toBeGreaterThanOrEqual(8)
  })

  it('flips above when the tooltip would overflow the bottom edge', () => {
    const layout = computeTooltipLayout({
      ...BASE,
      pointerX: 50,
      pointerY: 290,
    })
    expect(layout.top).toBe(290 - 14 - 30)
    expect(layout.top).toBeGreaterThanOrEqual(8)
  })

  it('clamps to the container margin when the flip would still overflow', () => {
    const layout = computeTooltipLayout({
      ...BASE,
      pointerX: -50,
      pointerY: -50,
      offset: 20,
    })
    expect(layout.left).toBe(8)
    expect(layout.top).toBe(8)
  })

  it('clamps inside the container when the pointer is beyond the edges', () => {
    const layout = computeTooltipLayout({
      ...BASE,
      pointerX: 500,
      pointerY: 400,
    })
    expect(layout.left).toBe(400 - 100 - 8)
    expect(layout.top).toBe(300 - 30 - 8)
  })

  it('keeps oversized tooltips at the margin', () => {
    const layout = computeTooltipLayout({
      ...BASE,
      tooltipWidth: 500,
      tooltipHeight: 400,
      pointerX: 200,
      pointerY: 150,
    })
    expect(layout.left).toBe(8)
    expect(layout.top).toBe(8)
  })
})
