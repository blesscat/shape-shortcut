import { describe, expect, it } from 'vitest'

import { isBoardSubstrateModel } from '../../src/features/cad/viewport/board-parts'

describe('board substrate models (Part D v2 board tokens)', () => {
  it('treats the OpenGrid board as a substrate', () => {
    expect(isBoardSubstrateModel('opengrid')).toBe(true)
  })

  it('keeps the snap colored like a regular part', () => {
    expect(isBoardSubstrateModel('opengrid-snap')).toBe(false)
  })

  it('leaves non-base parts and unknown ids untouched', () => {
    expect(isBoardSubstrateModel('box')).toBe(false)
    expect(isBoardSubstrateModel('opengrid-organizer-box')).toBe(false)
    expect(isBoardSubstrateModel('opengrid-snap-remover')).toBe(false)
    expect(isBoardSubstrateModel('no-such-model')).toBe(false)
  })
})
