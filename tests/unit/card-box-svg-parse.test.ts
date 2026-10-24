import { describe, expect, it } from 'vitest'
// @ts-expect-error -- jsdom is a devDependency without bundled types
import { JSDOM } from 'jsdom'

import { parseCardBoxSvg } from '../../src/features/cad/card-box-svg/parse-svg'
import { fingerprintCardBoxSvg } from '../../src/features/cad/card-box-svg/fingerprint'

if (typeof globalThis.DOMParser === 'undefined') {
  const dom = new JSDOM('')
  globalThis.DOMParser = dom.window.DOMParser
}

function filledRectSvg(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="200" height="100">',
    '  <rect x="10" y="5" width="30" height="20" fill="#ff0000"/>',
    '</svg>',
  ].join('\n')
}

describe('parseCardBoxSvg', () => {
  it('extracts a filled rect with viewBox applied', () => {
    const data = parseCardBoxSvg(filledRectSvg())
    expect(data.groups).toHaveLength(1)
    expect(data.groups[0]!.holes).toHaveLength(0)
    expect(data.width).toBe(200)
    expect(data.height).toBe(100)
    // viewBox 0 0 100 50 mapped onto 200x100 with meet: uniform scale 2.
    const outer = data.groups[0]!.outer
    expect(outer).toHaveLength(4)
    const xs = outer.map(([x]) => x)
    const ys = outer.map(([, y]) => y)
    expect(Math.min(...xs)).toBeCloseTo(20)
    expect(Math.max(...xs)).toBeCloseTo(80)
    expect(Math.min(...ys)).toBeCloseTo(10)
    expect(Math.max(...ys)).toBeCloseTo(50)
    expect(data.fingerprint).toMatch(/^[0-9a-f]{16}$/)
  })

  it('extracts a filled circle as a tessellated polygon', () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="10" fill="black"/></svg>'
    const data = parseCardBoxSvg(source)
    expect(data.groups).toHaveLength(1)
    expect(data.groups[0]!.outer.length).toBeGreaterThanOrEqual(48)
  })

  it('keeps holes from nested paths using even-odd grouping', () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
      '  <path d="M0 0 H100 V100 H0 Z M25 25 H75 V75 H25 Z" fill="black"/>',
      '</svg>',
    ].join('\n')
    const data = parseCardBoxSvg(source)
    expect(data.groups).toHaveLength(1)
    expect(data.groups[0]!.holes).toHaveLength(1)
  })

  it('applies nested g transforms', () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg">',
      '  <g transform="translate(10 20)">',
      '    <g transform="scale(2)">',
      '      <rect x="0" y="0" width="5" height="5" fill="blue"/>',
      '    </g>',
      '  </g>',
      '</svg>',
    ].join('\n')
    const data = parseCardBoxSvg(source)
    const outer = data.groups[0]!.outer
    const xs = outer.map(([x]) => x)
    const ys = outer.map(([, y]) => y)
    expect(Math.min(...xs)).toBeCloseTo(10)
    expect(Math.max(...xs)).toBeCloseTo(20)
    expect(Math.min(...ys)).toBeCloseTo(20)
    expect(Math.max(...ys)).toBeCloseTo(30)
  })

  it('rejects stroke-only artwork', () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="10" height="10" fill="none" stroke="black"/></svg>'
    expect(() => parseCardBoxSvg(source)).toThrow('CARD_BOX_SVG_STROKE_ONLY')
  })

  it('rejects text elements', () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="0">hi</text></svg>'
    expect(() => parseCardBoxSvg(source)).toThrow(
      'CARD_BOX_SVG_TEXT_UNSUPPORTED',
    )
  })

  it('rejects image elements', () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="a.png"/></svg>'
    expect(() => parseCardBoxSvg(source)).toThrow(
      'CARD_BOX_SVG_IMAGE_UNSUPPORTED',
    )
  })

  it('rejects unknown elements', () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg"><fooBar/></svg>'
    expect(() => parseCardBoxSvg(source)).toThrow(
      'CARD_BOX_SVG_UNSUPPORTED_ELEMENT',
    )
  })

  it('rejects malformed documents', () => {
    expect(() => parseCardBoxSvg('<svg><rect></not-xml')).toThrow(
      'CARD_BOX_SVG_PARSE_FAILED',
    )
  })

  it('rejects sources over the point budget', () => {
    // 400 rects of 4 points = 1600 points is fine; build enough paths to
    // exceed 12000 vertices: 4000 squares via polygon elements.
    const squares: string[] = []
    for (let index = 0; index < 4000; index += 1) {
      const x = (index % 100) * 2
      const y = Math.floor(index / 100) * 2
      squares.push(
        `<polygon points="${x},${y} ${x + 1},${y} ${x + 1},${y + 1} ${x},${y + 1}" fill="black"/>`,
      )
    }
    const source = `<svg xmlns="http://www.w3.org/2000/svg">${squares.join('')}</svg>`
    expect(() => parseCardBoxSvg(source)).toThrow('CARD_BOX_SVG_TOO_COMPLEX')
  })
})

describe('fingerprintCardBoxSvg', () => {
  it('is stable and sensitive to content', () => {
    expect(fingerprintCardBoxSvg('<svg/>')).toBe(
      fingerprintCardBoxSvg('<svg/>'),
    )
    expect(fingerprintCardBoxSvg('<svg/>')).not.toBe(
      fingerprintCardBoxSvg('<svg ></'),
    )
    expect(fingerprintCardBoxSvg('')).toMatch(/^[0-9a-f]{16}$/)
  })
})
