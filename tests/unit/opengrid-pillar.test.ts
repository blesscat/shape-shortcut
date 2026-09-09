import { describe, expect, it } from 'vitest'
import {
  boundsForPillar,
  pillarFileName,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  normalizePillarParameters,
  validatePillarParameters,
} from '../../src/cad-contract/units'

describe('pillar contract', () => {
  it('uses the locking corner seat as the default and the positioning geometry contract', () => {
    expect(PILLAR_CONFIGURATION).toMatchObject({
      bodyDiameter: 4.9,
      positioningDefaultLength: 10,
      positioningMinLength: 3,
      positioningMaxLength: 500,
      positioningBodyDiameter: 4.9,
      positioningLowerChamfer: 0.2,
      positioningUpperChamfer: 0.2,
      seatDefaultLength: 3.8,
      seatMinLength: 3,
      seatMaxLength: 100,
      seatLengthStep: 0.1,
      offsetMin: -1,
      offsetMax: 1,
      offsetStep: 0.1,
      defaultParameters: {
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 0,
      },
    })
    expect(PILLAR_CONFIGURATION).not.toHaveProperty('standardLength')
    expect(PILLAR_CONFIGURATION).not.toHaveProperty('thinShellLength')
  })

  it('accepts only the locking corner seat and positioning modes', () => {
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 0,
      }),
    ).toEqual({
      valid: true,
      value: { mode: 'detachable-corner-seat', length: 3.8, offset: 0 },
    })
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 4.2,
        offset: 0.1,
      }),
    ).toEqual({
      valid: true,
      value: { mode: 'detachable-corner-seat', length: 4.2, offset: 0.1 },
    })
    expect(
      validatePillarParameters({ mode: 'positioning', length: 25, offset: 0 }),
    ).toEqual({
      valid: true,
      value: { mode: 'positioning', length: 25, offset: 0 },
    })
    expect(
      validatePillarParameters({ mode: 'standard', offset: 0 }),
    ).toMatchObject({ valid: false })
    expect(
      validatePillarParameters({ mode: 'thin-shell', offset: 0 }),
    ).toMatchObject({ valid: false })
  })

  it('rejects mode-inappropriate and unsupported seat fields', () => {
    for (const value of [
      { mode: 'detachable-corner-seat' },
      { mode: 'detachable-corner-seat', length: 3.8 },
      { mode: 'detachable-corner-seat', offset: 0 },
      { mode: 'detachable-corner-seat', clearance: 0.1 },
    ]) {
      expect(validatePillarParameters(value).valid).toBe(false)
    }
  })

  it('validates the seat locating length and shared XY increment', () => {
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 3,
        offset: 0,
      }).valid,
    ).toBe(true)
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 100,
        offset: -1,
      }).valid,
    ).toBe(true)
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 1,
      }).valid,
    ).toBe(true)
    for (const length of [2.9, 100.1, 3.85, 3.888, Number.NaN]) {
      expect(
        validatePillarParameters({
          mode: 'detachable-corner-seat',
          length,
          offset: 0,
        }),
      ).toMatchObject({
        valid: false,
        issues: [expect.objectContaining({ field: 'length' })],
      })
    }
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 4.2,
        offset: 0.05,
      }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'offset' })],
    })
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 4.2,
        offset: 1.1,
      }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'offset' })],
    })
  })

  it('validates positioning length and shared XY increment', () => {
    expect(
      validatePillarParameters({ mode: 'positioning', length: 10, offset: 0.1 })
        .valid,
    ).toBe(true)
    expect(
      validatePillarParameters({ mode: 'positioning', length: 10, offset: -1 })
        .valid,
    ).toBe(true)
    expect(
      validatePillarParameters({ mode: 'positioning', length: 10, offset: 1 })
        .valid,
    ).toBe(true)
    expect(
      validatePillarParameters({
        mode: 'positioning',
        length: 10,
        offset: 0.05,
      }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'offset' })],
    })
    expect(
      validatePillarParameters({
        mode: 'positioning',
        length: 10,
        offset: -1.1,
      }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'offset' })],
    })
    expect(
      validatePillarParameters({ mode: 'positioning', length: 2, offset: 0 }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'length' })],
    })
  })

  it('rejects missing, unsupported, and removed parameter shapes', () => {
    for (const value of [
      {},
      { mode: 'legacy' },
      { mode: true },
      { mode: 'standard', offsetX: 0, offsetY: 0 },
      { mode: 'thin-shell', offset: 0 },
      { mode: 'positioning', offset: 0 },
    ]) {
      expect(validatePillarParameters(value).valid).toBe(false)
    }
  })

  it('uses the pillar offset without moving the center', () => {
    expect(
      boundsForPillar({ mode: 'positioning', length: 25, offset: 0.3 }),
    ).toEqual({
      min: [-2.6, -2.6, 0],
      max: [2.6, 2.6, 25],
    })
    expect(
      boundsForPillar({ mode: 'positioning', length: 25, offset: 1 }),
    ).toEqual({
      min: [-2.95, -2.95, 0],
      max: [2.95, 2.95, 25],
    })
    expect(
      boundsForPillar({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 0,
      }),
    ).toEqual({
      min: [-3.321716, -2.45, 0],
      max: [3.321716, 2.45, 5.3],
    })
    expect(
      boundsForPillar({
        mode: 'detachable-corner-seat',
        length: 5,
        offset: 0.3,
      }),
    ).toEqual({
      min: [-3.321716, -2.6, 0],
      max: [3.321716, 2.6, 6.5],
    })
    const negativeOffsetBounds = boundsForPillar({
      mode: 'detachable-corner-seat',
      length: 3,
      offset: -1,
    })
    expect(negativeOffsetBounds.min[0]).toBeCloseTo(-3.321716, 10)
    expect(negativeOffsetBounds.min[1]).toBeCloseTo(-1.95, 10)
    expect(negativeOffsetBounds.min[2]).toBe(0)
    expect(negativeOffsetBounds.max[0]).toBeCloseTo(3.321716, 10)
    expect(negativeOffsetBounds.max[1]).toBeCloseTo(1.95, 10)
    expect(negativeOffsetBounds.max[2]).toBe(4.5)
  })

  it('migrates legacy snapshots to the remaining modes', () => {
    expect(normalizePillarParameters({ mode: 'standard' })).toEqual({
      mode: 'detachable-corner-seat',
      length: 3.8,
      offset: 0,
    })
    expect(
      normalizePillarParameters({
        mode: 'thin-shell',
        offsetX: 0.25,
        offsetY: 0.25,
      }),
    ).toEqual({ mode: 'detachable-corner-seat', length: 3.8, offset: 0 })
    expect(
      normalizePillarParameters({ mode: 'detachable-corner-seat' }),
    ).toEqual({ mode: 'detachable-corner-seat', length: 3.8, offset: 0 })
    expect(
      normalizePillarParameters({
        mode: 'positioning',
        length: 25,
        offsetX: 0.25,
        offsetY: -0.15,
      }),
    ).toEqual({ mode: 'positioning', length: 25, offset: 0 })
    expect(
      normalizePillarParameters({ mode: 'positioning', length: 25 }),
    ).toEqual({ mode: 'positioning', length: 25, offset: 0 })
    expect(
      normalizePillarParameters({ length: 25, baseConnection: false }),
    ).toEqual({ mode: 'positioning', length: 25, offset: 0 })
    expect(normalizePillarParameters({ mode: 'positioning' })).toEqual({
      mode: 'detachable-corner-seat',
      length: 3.8,
      offset: 0,
    })
  })

  it('uses deterministic export filenames for the remaining modes', () => {
    expect(pillarFileName({ mode: 'positioning', length: 10, offset: 0 })).toBe(
      'pillar-10-positioning.step',
    )
    expect(
      pillarStlFileName({ mode: 'positioning', length: 25, offset: 0.2 }),
    ).toBe('pillar-25-positioning-xy0.2.stl')
    expect(
      pillarFileName({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 0,
      }),
    ).toBe('pillar-5.3-detachable-corner-seat.step')
    expect(
      pillarStlFileName({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 0,
      }),
    ).toBe('pillar-5.3-detachable-corner-seat.stl')
    expect(
      pillarFileName({
        mode: 'detachable-corner-seat',
        length: 5,
        offset: 0.1,
      }),
    ).toBe('pillar-6.5-detachable-corner-seat-z5-xy0.1.step')
    expect(
      pillarStlFileName({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: -0.2,
      }),
    ).toBe('pillar-5.3-detachable-corner-seat-xy-0.2.stl')
    expect(
      pillarFileName({
        mode: 'detachable-corner-seat',
        length: 4.2,
        offset: 0,
      }),
    ).toBe('pillar-5.7-detachable-corner-seat-z4.2.step')
  })
})
