import { describe, expect, it } from 'vitest'
import {
  assemblyReadingState,
  progressAtReadingPosition,
} from '../../src/features/docs/assembly/timeline'

const datums = { directBoxZ: 1.68, snapZ: 0.6, fixedBoxZ: 4 }

describe('reading-controlled printable assemblies', () => {
  it('maps unevenly spaced explanations to the same step progress in either direction', () => {
    const stops = [100, 300, 800, 1100]
    expect(progressAtReadingPosition(-200, stops)).toBe(0)
    expect(progressAtReadingPosition(300, stops)).toBeCloseTo(1 / 3)
    expect(progressAtReadingPosition(550, stops)).toBeCloseTo(0.5)
    expect(progressAtReadingPosition(1100, stops)).toBe(1)
    expect(progressAtReadingPosition(2000, stops)).toBe(1)
    for (const position of [1000, 550, 300, 100]) {
      const progress = progressAtReadingPosition(position, stops)
      expect(progress).toBeGreaterThanOrEqual(0)
      expect(progress).toBeLessThanOrEqual(1)
    }
  })

  it('seats four Snaps before inspecting and installing the integrated-seat box', () => {
    const snaps = assemblyReadingState('snap-fixing', 1 / 3, datums)
    expect(snaps.parts.filter((part) => part.mesh === 'snap')).toHaveLength(4)
    for (const part of snaps.parts.filter((part) => part.mesh === 'snap')) {
      expect(part.position[2]).toBe(datums.snapZ)
    }
    const inspection = assemblyReadingState('snap-fixing', 2 / 3, datums)
    expect(inspection.seatFocus).toBe(1)
    expect(
      inspection.parts.find((part) => part.mesh === 'box-none'),
    ).toBeUndefined()
    expect(
      inspection.parts.find((part) => part.mesh === 'box-integrated')!
        .position[2],
    ).toBeGreaterThan(datums.fixedBoxZ)
    const final = assemblyReadingState('snap-fixing', 1, datums)
    expect(
      final.parts.find((part) => part.mesh === 'box-integrated')!.position[2],
    ).toBe(datums.fixedBoxZ)
    expect(final.seatFocus).toBe(0)
  })

  it('holds completed connections and is independent of playback history', () => {
    const earlier = assemblyReadingState('snap-fixing', 0.3, datums)
    expect(earlier.parts).toEqual(
      assemblyReadingState('snap-fixing', 1 / 3, datums).parts,
    )
    assemblyReadingState('snap-fixing', 1, datums)
    expect(assemblyReadingState('snap-fixing', 0.3, datums)).toEqual(earlier)
  })

  it('uses discrete stable poses for reduced motion', () => {
    const first = assemblyReadingState('snap-fixing', 0.02, datums, true)
    expect(assemblyReadingState('snap-fixing', 0.12, datums, true)).toEqual(
      first,
    )
    const middle = assemblyReadingState('snap-fixing', 0.4, datums, true)
    expect(middle).toEqual(
      assemblyReadingState('snap-fixing', 1 / 3, datums, true),
    )
  })

  it('keeps the direct trial seat-free and shows removable placement', () => {
    const resting = assemblyReadingState('direct-placement', 0.5, datums)
    expect(resting.parts.map((part) => part.mesh)).toEqual([
      'board',
      'box-none',
    ])
    expect(resting.parts[1].position[2]).toBe(datums.directBoxZ)
    expect(
      assemblyReadingState('direct-placement', 1, datums).parts[1].position[2],
    ).toBeGreaterThan(datums.directBoxZ)
  })

  it('inserts matching detachable seats before the clockwise underside turn', () => {
    const inserted = assemblyReadingState('locating-seats', 0.5, datums)
    const locked = assemblyReadingState('locating-seats', 1, datums)
    for (const seat of locked.parts.filter((part) => part.mesh === 'seat')) {
      const before = inserted.parts.find((part) => part.id === seat.id)!
      expect(seat.position).toEqual(before.position)
      expect(seat.rotationZ - before.rotationZ).toBeCloseTo(Math.PI / 2)
    }
  })
})
