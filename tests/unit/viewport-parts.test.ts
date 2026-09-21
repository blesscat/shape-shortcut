import { describe, expect, it } from 'vitest'
import {
  CAD_VIEWPORT_CONFIG,
  colorForCadViewportPart,
  isCadViewportPartName,
} from '../../src/features/cad/viewport/config'

describe('CAD viewport named part presentation', () => {
  it('uses deterministic distinct colors for Wall Cover body and text', () => {
    expect(colorForCadViewportPart('body')).toBe(
      CAD_VIEWPORT_CONFIG.modelPartColors.body,
    )
    expect(colorForCadViewportPart('text')).toBe(
      CAD_VIEWPORT_CONFIG.modelPartColors.text,
    )
    expect(colorForCadViewportPart('body')).not.toBe(
      colorForCadViewportPart('text'),
    )
  })

  it('supports rim part name and distinct color for stackable cylinder', () => {
    expect(isCadViewportPartName('body')).toBe(true)
    expect(isCadViewportPartName('text')).toBe(true)
    expect(isCadViewportPartName('rim')).toBe(true)
    expect(isCadViewportPartName('unknown')).toBe(false)
    expect(colorForCadViewportPart('rim')).toBe(
      CAD_VIEWPORT_CONFIG.modelPartColors.rim,
    )
    expect(colorForCadViewportPart('body')).not.toBe(
      colorForCadViewportPart('rim'),
    )
  })
})
