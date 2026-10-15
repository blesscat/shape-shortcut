import { describe, expect, it } from 'vitest'
import {
  assemblySceneAt,
  assemblyScenes,
} from '../../scripts/desk-assembly/scenes.mjs'

const datums = { directBoxZ: 1.68, snapZ: 0.4, fixedBoxZ: 4 }

describe('actual CAD assembly choreography', () => {
  it('uses only the two starter prints and demonstrates lifting away', () => {
    const resting = assemblySceneAt('direct-placement', 3.5, datums)
    expect(resting.map((part) => part.mesh)).toEqual(['board', 'box-none'])
    expect(resting[1].position).toEqual([0, 0, datums.directBoxZ])
    const lifted = assemblySceneAt('direct-placement', 5.7, datums)[1]
    expect(lifted.position[2]).toBeGreaterThan(datums.directBoxZ + 20)
    expect(assemblySceneAt('direct-placement', 8, datums)[1].position[2]).toBe(
      datums.directBoxZ,
    )
  })

  it('seats all four Snaps before lowering the integrated-seat box', () => {
    const beforeBox = assemblySceneAt('snap-fixing', 3.8, datums)
    const snaps = beforeBox.filter((part) => part.mesh === 'snap')
    expect(snaps).toHaveLength(4)
    expect(snaps.map((part) => part.position)).toEqual([
      [-14, -14, datums.snapZ],
      [14, -14, datums.snapZ],
      [-14, 14, datums.snapZ],
      [14, 14, datums.snapZ],
    ])
    expect(
      beforeBox.find((part) => part.mesh === 'box-integrated')?.position[2],
    ).toBeGreaterThan(datums.fixedBoxZ + 20)
    const final = assemblySceneAt('snap-fixing', 9, datums)
    expect(
      final.find((part) => part.mesh === 'box-integrated')?.position[2],
    ).toBe(datums.fixedBoxZ)
  })

  it('inserts separate seats into a matching box then turns clockwise viewed below', () => {
    const inserted = assemblySceneAt('locating-seats', 4, datums)
    const locked = assemblySceneAt('locating-seats', 8, datums)
    expect(
      locked.filter((part) => part.mesh === 'box-detachable'),
    ).toHaveLength(1)
    expect(
      locked.filter((part) => part.mesh === 'box-integrated'),
    ).toHaveLength(1)
    expect(locked.filter((part) => part.mesh === 'box-none')).toHaveLength(0)
    const seats = locked.filter((part) => part.mesh === 'seat')
    expect(seats).toHaveLength(4)
    for (const seat of seats) {
      const earlier = inserted.find((part) => part.id === seat.id)!
      expect(seat.position).toEqual(earlier.position)
      // Positive world-Z is clockwise when the underside camera faces +Z.
      expect(seat.rotationZ - earlier.rotationZ).toBeCloseTo(Math.PI / 2)
    }
  })

  it('clamps seeks to stable endpoints for every short clip', () => {
    for (const scene of assemblyScenes) {
      expect(assemblySceneAt(scene.id, -1, datums)).toEqual(
        assemblySceneAt(scene.id, 0, datums),
      )
      expect(assemblySceneAt(scene.id, scene.duration + 1, datums)).toEqual(
        assemblySceneAt(scene.id, scene.duration, datums),
      )
    }
  })
})
