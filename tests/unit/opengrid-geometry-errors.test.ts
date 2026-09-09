import { describe, expect, it } from 'vitest'
import { toGeometryError } from '../../src/cad-kernel/geometry-errors'

describe('toGeometryError', () => {
  it('preserves Error instances unchanged', () => {
    const original = new Error('OPENGRID_SOMETHING_INVALID')
    expect(toGeometryError(original)).toBe(original)
  })

  it('wraps raw numeric engine exceptions with a diagnosable prefix', () => {
    const error = toGeometryError(2017256088)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('OCCT_EXCEPTION:2017256088')
  })

  it('wraps string, boolean, bigint, null and undefined throws', () => {
    expect(toGeometryError('boom').message).toBe('OCCT_EXCEPTION:boom')
    expect(toGeometryError(false).message).toBe('OCCT_EXCEPTION:false')
    expect(toGeometryError(1n).message).toBe('OCCT_EXCEPTION:1')
    expect(toGeometryError(null).message).toBe('OCCT_EXCEPTION:null')
    expect(toGeometryError(undefined).message).toBe('OCCT_EXCEPTION:undefined')
  })

  it('keeps a readable description for objects that survive JSON', () => {
    expect(toGeometryError({ code: 7 }).message).toBe(
      'OCCT_EXCEPTION:{"code":7}',
    )
  })
})
