import { describe, expect, it } from 'vitest'

import { instanceDisplayColor } from '../../src/features/cad/playground/instance-colors'

const COLORS = {
  colorHex: '#123456',
  hoverColor: '#aaaaaa',
  selectionColor: '#bbbbbb',
  conflictColor: '#ff0000',
} as const

function inputs(
  overrides: Partial<Parameters<typeof instanceDisplayColor>[0]> = {},
) {
  return {
    dragPreviewActive: false,
    dragPreviewValid: false,
    overlapping: false,
    emphasized: false,
    ...COLORS,
    ...overrides,
  }
}

describe('playground instance display color precedence', () => {
  it('returns the normal color for an unflagged, unemphasized instance', () => {
    expect(instanceDisplayColor(inputs())).toBe(COLORS.colorHex)
  })

  it('emphasizes selection and hover with the selection color', () => {
    expect(instanceDisplayColor(inputs({ emphasized: true }))).toBe(
      COLORS.selectionColor,
    )
  })

  it('marks overlapping instances with the conflict color', () => {
    expect(instanceDisplayColor(inputs({ overlapping: true }))).toBe(
      COLORS.conflictColor,
    )
  })

  it('lets the conflict color take precedence over selection and hover', () => {
    expect(
      instanceDisplayColor(inputs({ overlapping: true, emphasized: true })),
    ).toBe(COLORS.conflictColor)
  })

  it('uses the hover color for a valid drag preview even when flagged', () => {
    expect(
      instanceDisplayColor(
        inputs({
          dragPreviewActive: true,
          dragPreviewValid: true,
          overlapping: true,
          emphasized: true,
        }),
      ),
    ).toBe(COLORS.hoverColor)
  })

  it('uses the conflict color for an overlapping drag preview over emphasis', () => {
    expect(
      instanceDisplayColor(
        inputs({
          dragPreviewActive: true,
          dragPreviewValid: false,
          overlapping: false,
          emphasized: true,
        }),
      ),
    ).toBe(COLORS.conflictColor)
  })
})
