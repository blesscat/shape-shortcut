import { describe, expect, it } from 'vitest'
import {
  groupPolygonContours,
  parseSvgPath,
  signedArea,
  SvgPathParseError,
} from '../../src/cad-kernel/components/opengrid-label-tag/svg-path'

describe('label tag SVG path parser', () => {
  it('parses absolute lines into a closed square polygon', () => {
    const polygons = parseSvgPath('M0 0L4 0L4 4L0 4Z')
    expect(polygons).toHaveLength(1)
    expect(polygons[0]).toHaveLength(4)
    expect(signedArea(polygons[0]!)).toBeCloseTo(16, 6)
  })

  it('supports relative commands and implicit repeats', () => {
    const polygons = parseSvgPath('m2 2l2 0 0 2-2 0z')
    expect(polygons).toHaveLength(1)
    const polygon = polygons[0]!
    expect(polygon[0]).toEqual([2, 2])
    expect(polygon[2]).toEqual([4, 4])
  })

  it('treats implicit repeats of lowercase m as relative linetos', () => {
    const polygons = parseSvgPath('m0 0 4 0 0 4-4 0z')
    expect(polygons).toHaveLength(1)
    expect(polygons[0]).toEqual([
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ])
  })

  it('flattens cubic curves to polylines', () => {
    const polygons = parseSvgPath('M0 0C2 0 4 2 4 4')
    expect(polygons).toHaveLength(1)
    expect(polygons[0]!.length).toBeGreaterThan(4)
    const last = polygons[0]![polygons[0]!.length - 1]!
    expect(last[0]).toBeCloseTo(4, 6)
    expect(last[1]).toBeCloseTo(4, 6)
  })

  it('flattens arcs with endpoint parameterization', () => {
    const polygons = parseSvgPath('M2 0A2 2 0 1 1 1.9 0.01Z')
    expect(polygons).toHaveLength(1)
    expect(polygons[0]!.length).toBeGreaterThan(8)
  })

  it('supports horizontal and vertical shorthand', () => {
    const polygons = parseSvgPath('M1 1h3v3H1Z')
    expect(polygons[0]).toEqual([
      [1, 1],
      [4, 1],
      [4, 4],
      [1, 4],
    ])
  })

  it('splits multiple subpaths and groups holes with their outers', () => {
    const polygons = parseSvgPath('M0 0h8v8H0Z M2 2h4v4H2Z')
    expect(polygons).toHaveLength(2)
    const groups = groupPolygonContours(polygons)
    expect(groups).toHaveLength(1)
    expect(groups[0]).toHaveLength(2)
    expect(signedArea(groups[0]![0]!)).toBeGreaterThan(0)
  })

  it('attaches holes to outers declared later in path order', () => {
    // Hole first, outer second: the hole must not be dropped.
    const polygons = parseSvgPath('M2 2h4v4H2Z M0 0h8v8H0Z')
    expect(polygons).toHaveLength(2)
    const groups = groupPolygonContours(polygons)
    expect(groups).toHaveLength(1)
    expect(groups[0]).toHaveLength(2)
  })

  it('keeps islands inside holes as separate filled solids', () => {
    // Outer square, hole, island inside the hole (3-level even-odd).
    const polygons = parseSvgPath('M0 0h8v8H0Z M2 2h4v4H2Z M3 3h2v2H3Z')
    expect(polygons).toHaveLength(3)
    const groups = groupPolygonContours(polygons)
    expect(groups).toHaveLength(2)
    const outerGroup = groups.find((group) => group.length === 2)!
    expect(outerGroup[0]).toEqual(polygons[0])
    expect(outerGroup[1]).toEqual(polygons[1])
    const islandGroup = groups.find((group) => group.length === 1)!
    expect(islandGroup[0]).toEqual(polygons[2])
  })

  it('rejects unsupported commands and empty paths', () => {
    expect(() => parseSvgPath('X0 0')).toThrow(SvgPathParseError)
    expect(() => parseSvgPath('')).toThrow(SvgPathParseError)
    expect(() => parseSvgPath('M0 0')).toThrow(SvgPathParseError)
  })
})
