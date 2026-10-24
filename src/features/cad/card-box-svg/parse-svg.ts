import type {
  CardBoxSvgOutlineData,
  CardBoxSvgOutlineGroup,
  CardBoxSvgPoint,
} from '../../../cad-contract/units/card-box'
import {
  groupPolygonContours,
  parseSvgPath,
  signedArea,
  type PathPolygon,
} from '../../../cad-kernel/components/opengrid-label-card/svg-path'
import { fingerprintCardBoxSvg } from './fingerprint'

/** Maximum total vertices across all kept contours of one import. */
const CARD_BOX_SVG_MAX_POINTS = 12000

/** Minimum |signed area| for a contour to count as geometry. */
const MIN_CONTOUR_AREA = 1e-6

/** Circle/ellipse tessellation resolution. */
const ELLIPSE_SEGMENTS = 48

type Matrix = readonly [number, number, number, number, number, number]

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0]! * b[0]! + a[2]! * b[1]!,
    a[1]! * b[0]! + a[3]! * b[1]!,
    a[0]! * b[2]! + a[2]! * b[3]!,
    a[1]! * b[2]! + a[3]! * b[3]!,
    a[0]! * b[4]! + a[2]! * b[5]! + a[4]!,
    a[1]! * b[4]! + a[3]! * b[5]! + a[5]!,
  ]
}

function apply(matrix: Matrix, point: CardBoxSvgPoint): CardBoxSvgPoint {
  return [
    matrix[0]! * point[0] + matrix[2]! * point[1] + matrix[4]!,
    matrix[1]! * point[0] + matrix[3]! * point[1] + matrix[5]!,
  ]
}

function parseNumber(value: string | null): number {
  if (value === null) return Number.NaN
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

/** Parses a `transform` attribute into a single affine matrix. */
function parseTransform(attribute: string): Matrix {
  let matrix: Matrix = IDENTITY
  const transformPattern =
    /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g
  for (const match of attribute.matchAll(transformPattern)) {
    const name = match[1]!
    const numbers = match[2]!
      .split(/[\s,]+/)
      .filter((token) => token.length > 0)
      .map((token) => Number.parseFloat(token))
    if (numbers.some((value) => !Number.isFinite(value))) continue
    let next: Matrix
    switch (name) {
      case 'matrix':
        if (numbers.length < 6) continue
        next = numbers.slice(0, 6) as unknown as Matrix
        break
      case 'translate': {
        const tx = numbers[0] ?? 0
        const ty = numbers[1] ?? 0
        next = [1, 0, 0, 1, tx, ty]
        break
      }
      case 'scale': {
        const sx = numbers[0] ?? 1
        const sy = numbers[1] ?? sx
        next = [sx, 0, 0, sy, 0, 0]
        break
      }
      case 'rotate': {
        const angle = ((numbers[0] ?? 0) * Math.PI) / 180
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const rotation: Matrix = [cos, sin, -sin, cos, 0, 0]
        if (numbers.length >= 3) {
          const cx = numbers[1]!
          const cy = numbers[2]!
          next = multiply(multiply([1, 0, 0, 1, cx, cy], rotation), [
            1,
            0,
            0,
            1,
            -cx,
            -cy,
          ])
        } else {
          next = rotation
        }
        break
      }
      case 'skewX': {
        const tangent = Math.tan(((numbers[0] ?? 0) * Math.PI) / 180)
        next = [1, 0, tangent, 1, 0, 0]
        break
      }
      case 'skewY': {
        const tangent = Math.tan(((numbers[0] ?? 0) * Math.PI) / 180)
        next = [1, tangent, 0, 1, 0, 0]
        break
      }
      default:
        continue
    }
    matrix = multiply(matrix, next)
  }
  return matrix
}

type ViewBoxMapping = {
  toUserUnits: (point: CardBoxSvgPoint) => CardBoxSvgPoint
  width: number
  height: number
}

/**
 * Resolves the root viewBox (plus width/height) into a mapping from
 * viewBox coordinates to final user units. Honors the default
 * `xMidYMid meet` letterboxing; `preserveAspectRatio="none"` stretches.
 */
function viewBoxMapping(root: Element): ViewBoxMapping | null {
  const viewBoxAttribute = root.getAttribute('viewBox')
  if (viewBoxAttribute === null) return null
  const parts = viewBoxAttribute
    .split(/[\s,]+/)
    .map((token) => Number.parseFloat(token))
  if (parts.length < 4 || parts.some((value) => !Number.isFinite(value))) {
    return null
  }
  const [vbX, vbY, vbWidth, vbHeight] = parts as [
    number,
    number,
    number,
    number,
  ]
  if (vbWidth === 0 || vbHeight === 0) return null
  const rootWidth = parseNumber(root.getAttribute('width'))
  const rootHeight = parseNumber(root.getAttribute('height'))
  const stretch =
    (root.getAttribute('preserveAspectRatio') ?? '').trim().endsWith('none') &&
    Number.isFinite(rootWidth) &&
    Number.isFinite(rootHeight)
  if (stretch && rootWidth > 0 && rootHeight > 0) {
    return {
      width: rootWidth,
      height: rootHeight,
      toUserUnits: ([x, y]) => [
        (x - vbX) * (rootWidth / vbWidth),
        (y - vbY) * (rootHeight / vbHeight),
      ],
    }
  }
  if (
    Number.isFinite(rootWidth) &&
    Number.isFinite(rootHeight) &&
    rootWidth > 0 &&
    rootHeight > 0
  ) {
    const scale = Math.min(rootWidth / vbWidth, rootHeight / vbHeight)
    const offsetX = (rootWidth - vbWidth * scale) / 2
    const offsetY = (rootHeight - vbHeight * scale) / 2
    return {
      width: rootWidth,
      height: rootHeight,
      toUserUnits: ([x, y]) => [
        (x - vbX) * scale + offsetX,
        (y - vbY) * scale + offsetY,
      ],
    }
  }
  return {
    width: vbWidth,
    height: vbHeight,
    toUserUnits: ([x, y]) => [x - vbX, y - vbY],
  }
}

/**
 * Effective fill color for an element, walking inherited `fill` attributes.
 * Unspecified fill resolves to black (SVG default, i.e. filled);
 * the literal `none` marks stroke-only artwork.
 */
function effectiveFill(element: Element, inherited: string | null): string {
  const own = element.getAttribute('fill')
  if (own !== null) return own.trim()
  return inherited ?? 'rgb(0, 0, 0)'
}

function polygonPoints(
  element: Element,
  mapping: ViewBoxMapping | null,
  matrix: Matrix,
): CardBoxSvgPoint[] {
  const tokens = (element.getAttribute('points') ?? '')
    .split(/[\s,]+/)
    .filter((token) => token.length > 0)
  const points: CardBoxSvgPoint[] = []
  for (let index = 0; index + 1 < tokens.length; index += 2) {
    const x = Number.parseFloat(tokens[index]!)
    const y = Number.parseFloat(tokens[index + 1]!)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const mapped = mapping ? mapping.toUserUnits([x, y]) : ([x, y] as const)
    points.push(apply(matrix, mapped))
  }
  return points
}

function ellipsePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  mapping: ViewBoxMapping | null,
  matrix: Matrix,
): CardBoxSvgPoint[] {
  const points: CardBoxSvgPoint[] = []
  for (let index = 0; index < ELLIPSE_SEGMENTS; index += 1) {
    const angle = (index / ELLIPSE_SEGMENTS) * Math.PI * 2
    const x = cx + rx * Math.cos(angle)
    const y = cy + ry * Math.sin(angle)
    const mapped = mapping ? mapping.toUserUnits([x, y]) : ([x, y] as const)
    points.push(apply(matrix, mapped))
  }
  return points
}

function rectPoints(
  element: Element,
  mapping: ViewBoxMapping | null,
  matrix: Matrix,
): CardBoxSvgPoint[] {
  const x = parseNumber(element.getAttribute('x')) || 0
  const y = parseNumber(element.getAttribute('y')) || 0
  const width = parseNumber(element.getAttribute('width'))
  const height = parseNumber(element.getAttribute('height'))
  if (!Number.isFinite(width) || !Number.isFinite(height)) return []
  const corners: Array<[number, number]> = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ]
  return corners.map((corner) => {
    const mapped = mapping ? mapping.toUserUnits(corner) : corner
    return apply(matrix, mapped)
  })
}

const IS_SHAPE_ELEMENT: Record<string, true> = {
  path: true,
  rect: true,
  circle: true,
  ellipse: true,
  polygon: true,
  polyline: true,
}

const IS_CONTAINER_ELEMENT: Record<string, true> = {
  svg: true,
  g: true,
  defs: true,
  clipPath: true,
}

/** Stable rejection code per non-printable artwork element. */
const FORBIDDEN_CODE_BY_ELEMENT: Record<string, string> = {
  text: 'CARD_BOX_SVG_TEXT_UNSUPPORTED',
  image: 'CARD_BOX_SVG_IMAGE_UNSUPPORTED',
}

type CollectedContours = {
  contours: PathPolygon[]
  forbiddenCode: string | null
  strokeOnly: boolean
  unsupported: string | null
}

function collectShapePolygons(
  element: Element,
  mapping: ViewBoxMapping | null,
  matrix: Matrix,
): PathPolygon[] {
  switch (element.localName) {
    case 'path': {
      const d = element.getAttribute('d')
      if (d === null) return []
      const subpaths = parseSvgPath(d)
      return subpaths.map((subpath) =>
        subpath.map((point) => {
          const mapped = mapping ? mapping.toUserUnits(point) : point
          return apply(matrix, mapped)
        }),
      )
    }
    case 'rect':
      return [rectPoints(element, mapping, matrix)]
    case 'circle': {
      const cx = parseNumber(element.getAttribute('cx')) || 0
      const cy = parseNumber(element.getAttribute('cy')) || 0
      const r = parseNumber(element.getAttribute('r'))
      if (!Number.isFinite(r) || r <= 0) return []
      return [ellipsePoints(cx, cy, r, r, mapping, matrix)]
    }
    case 'ellipse': {
      const cx = parseNumber(element.getAttribute('cx')) || 0
      const cy = parseNumber(element.getAttribute('cy')) || 0
      const rx = parseNumber(element.getAttribute('rx'))
      const ry = parseNumber(element.getAttribute('ry'))
      if (!Number.isFinite(rx) || !Number.isFinite(ry)) return []
      return [ellipsePoints(cx, cy, rx, ry, mapping, matrix)]
    }
    case 'polygon':
    case 'polyline':
      return [polygonPoints(element, mapping, matrix)]
    default:
      return []
  }
}

function collect(
  element: Element,
  mapping: ViewBoxMapping | null,
  matrix: Matrix,
  inheritedFill: string | null,
  result: CollectedContours,
): void {
  const localName = element.localName
  const forbidden = FORBIDDEN_CODE_BY_ELEMENT[localName]
  if (forbidden !== undefined) {
    result.forbiddenCode ??= forbidden
    return
  }
  if (IS_SHAPE_ELEMENT[localName] === undefined) {
    if (IS_CONTAINER_ELEMENT[localName] === undefined) {
      result.unsupported ??= 'CARD_BOX_SVG_UNSUPPORTED_ELEMENT'
    }
    for (const child of Array.from(element.children)) {
      // defs/clipPath content is never rendered directly; skip it.
      const renderable = localName === 'svg' || localName === 'g'
      if (renderable) {
        collect(
          child,
          mapping,
          multiply(
            matrix,
            parseTransform(child.getAttribute('transform') ?? ''),
          ),
          effectiveFill(child, inheritedFill),
          result,
        )
      }
    }
    return
  }
  if (effectiveFill(element, inheritedFill) === 'none') {
    result.strokeOnly = true
    return
  }
  try {
    for (const polygon of collectShapePolygons(element, mapping, matrix)) {
      if (polygon.length >= 3) result.contours.push(polygon)
    }
  } catch {
    throw new Error('CARD_BOX_SVG_PARSE_FAILED')
  }
}

function contentBounds(contours: readonly PathPolygon[]): {
  width: number
  height: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const contour of contours) {
    for (const [x, y] of contour) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (!Number.isFinite(minX)) return { width: 0, height: 0 }
  return { width: maxX - minX, height: maxY - minY }
}

/**
 * Parses card-box cover SVG source into cleaned outline groups.
 *
 * Coordinates are SVG user units (viewBox applied, transforms resolved,
 * Y still pointing down); the kernel flips and scales later. Only filled
 * shapes are kept; stroke-only artwork, text/image elements, unknown
 * elements and oversized geometry are rejected with stable error codes.
 */
export function parseCardBoxSvg(source: string): CardBoxSvgOutlineData {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml')
  const parseError = document.querySelector('parsererror')
  if (parseError !== null) throw new Error('CARD_BOX_SVG_PARSE_FAILED')
  const root = document.documentElement
  if (root === null || root.localName !== 'svg') {
    throw new Error('CARD_BOX_SVG_PARSE_FAILED')
  }
  const mapping = viewBoxMapping(root)
  const result: CollectedContours = {
    contours: [],
    forbiddenCode: null,
    strokeOnly: false,
    unsupported: null,
  }
  collect(
    root,
    mapping,
    parseTransform(root.getAttribute('transform') ?? ''),
    null,
    result,
  )
  if (result.forbiddenCode !== null) throw new Error(result.forbiddenCode)
  if (result.unsupported !== null) throw new Error(result.unsupported)
  if (result.strokeOnly) throw new Error('CARD_BOX_SVG_STROKE_ONLY')

  const kept: PathPolygon[] = []
  let totalPoints = 0
  for (const contour of result.contours) {
    if (Math.abs(signedArea(contour)) < MIN_CONTOUR_AREA) continue
    totalPoints += contour.length
    if (totalPoints > CARD_BOX_SVG_MAX_POINTS) {
      throw new Error('CARD_BOX_SVG_TOO_COMPLEX')
    }
    kept.push(contour)
  }
  if (kept.length === 0) throw new Error('CARD_BOX_SVG_STROKE_ONLY')

  const groups: CardBoxSvgOutlineGroup[] = groupPolygonContours(kept).map(
    (group): CardBoxSvgOutlineGroup => ({
      outer: group[0]!,
      holes: group.slice(1) as unknown as CardBoxSvgOutlineGroup['holes'],
    }),
  )

  const size = mapping ?? contentBounds(kept)
  return {
    fingerprint: fingerprintCardBoxSvg(source),
    width: size.width,
    height: size.height,
    groups,
  }
}
