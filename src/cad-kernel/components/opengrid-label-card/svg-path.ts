/**
 * Minimal SVG path `d` parser supporting the command subset used by the
 * bundled icon set (M, L, H, V, C, S, Q, T, A, Z and relative variants).
 * Curves are flattened to polylines with a fixed chord tolerance so the
 * result can be turned into replicad blueprints.
 */

export type PathPolygon = readonly (readonly [number, number])[]

export class SvgPathParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SvgPathParseError'
  }
}

const ARC_TAU = Math.PI * 2

type Command = {
  letter: string
  params: number[]
}

function tokenize(d: string): Command[] {
  const tokens = d.match(
    /[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g,
  )
  if (!tokens) throw new SvgPathParseError('SVG_PATH_EMPTY')

  const commands: Command[] = []
  let index = 0
  const arityFor = (letter: string): number => {
    switch (letter.toUpperCase()) {
      case 'M':
      case 'L':
      case 'T':
        return 2
      case 'H':
      case 'V':
        return 1
      case 'C':
        return 6
      case 'S':
      case 'Q':
        return 4
      case 'A':
        return 7
      case 'Z':
        return 0
      default:
        throw new SvgPathParseError(`SVG_PATH_COMMAND_INVALID:${letter}`)
    }
  }

  while (index < tokens.length) {
    const token = tokens[index]!
    let letter: string
    let arity: number
    if (/[A-Za-z]/.test(token)) {
      letter = token
      arity = arityFor(token)
      index += 1
    } else {
      // Implicit repeat: subsequent parameter groups reuse the previous
      // command; an implicit repeat of M is treated as L per the SVG spec.
      if (commands.length === 0)
        throw new SvgPathParseError('SVG_PATH_LEADING_NUMBER')
      const previous = commands[commands.length - 1]!.letter
      if (previous === 'Z' || previous === 'z') {
        // A Z command consumes no parameters; a trailing number would
        // otherwise loop forever without advancing.
        throw new SvgPathParseError('SVG_PATH_PARAMS_MISSING:Z')
      }
      if (previous === 'M' || previous === 'm') {
        // Per the SVG spec, an implicit repeat of M/m is a (relative) L.
        letter = previous === 'M' ? 'L' : 'l'
      } else {
        letter = previous
      }
      arity = arityFor(letter)
    }
    const params: number[] = []
    for (let offset = 0; offset < arity; offset += 1) {
      const value = tokens[index]
      if (value === undefined || /[A-Za-z]/.test(value)) {
        throw new SvgPathParseError(`SVG_PATH_PARAMS_MISSING:${letter}`)
      }
      params.push(Number(value))
      index += 1
    }
    commands.push({ letter, params })
  }
  return commands
}

type Point = [number, number]
function flattenCubic(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  out: Point[],
): void {
  const steps = 16
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps
    const mt = 1 - t
    const x =
      mt * mt * mt * start[0] +
      3 * mt * mt * t * control1[0] +
      3 * mt * t * t * control2[0] +
      t * t * t * end[0]
    const y =
      mt * mt * mt * start[1] +
      3 * mt * mt * t * control1[1] +
      3 * mt * t * t * control2[1] +
      t * t * t * end[1]
    out.push([x, y])
  }
}

function flattenQuadratic(
  start: Point,
  control: Point,
  end: Point,
  out: Point[],
): void {
  const steps = 12
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps
    const mt = 1 - t
    const x = mt * mt * start[0] + 2 * mt * t * control[0] + t * t * end[0]
    const y = mt * mt * start[1] + 2 * mt * t * control[1] + t * t * end[1]
    out.push([x, y])
  }
}

function flattenArc(
  current: Point,
  rxRaw: number,
  ryRaw: number,
  angleDegrees: number,
  largeArc: number,
  sweep: number,
  end: Point,
  out: Point[],
): void {
  const rx = Math.abs(rxRaw)
  const ry = Math.abs(ryRaw)
  if (rx === 0 || ry === 0) {
    out.push(end)
    return
  }
  const phi = (angleDegrees * Math.PI) / 180
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const dx = (current[0] - end[0]) / 2
  const dy = (current[1] - end[1]) / 2
  const x1 = cosPhi * dx + sinPhi * dy
  const y1 = -sinPhi * dx + cosPhi * dy

  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  const scale = lambda > 1 ? Math.sqrt(lambda) : 1
  const rxScaled = rx * scale
  const ryScaled = ry * scale

  const sign = largeArc === sweep ? -1 : 1
  const numerator =
    rxScaled * rxScaled * ryScaled * ryScaled -
    rxScaled * rxScaled * y1 * y1 -
    ryScaled * ryScaled * x1 * x1
  const denominator =
    rxScaled * rxScaled * y1 * y1 + ryScaled * ryScaled * x1 * x1
  const coefficient = sign * Math.sqrt(Math.max(numerator / denominator, 0))
  const cxp = (coefficient * rxScaled * y1) / ryScaled
  const cyp = (-coefficient * ryScaled * x1) / rxScaled

  const cx = cosPhi * cxp - sinPhi * cyp + (current[0] + end[0]) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (current[1] + end[1]) / 2

  const angleFor = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy
    const length = Math.hypot(ux, uy) * Math.hypot(vx, vy)
    const clamped = Math.min(Math.max(dot / (length || 1), -1), 1)
    const angle = Math.acos(clamped)
    return ux * vy - uy * vx < 0 ? -angle : angle
  }

  const theta1 = angleFor(1, 0, (x1 - cxp) / rxScaled, (y1 - cyp) / ryScaled)
  let deltaTheta = angleFor(
    (x1 - cxp) / rxScaled,
    (y1 - cyp) / ryScaled,
    (-x1 - cxp) / rxScaled,
    (-y1 - cyp) / ryScaled,
  )
  if (sweep === 0 && deltaTheta > 0) deltaTheta -= ARC_TAU
  if (sweep === 1 && deltaTheta < 0) deltaTheta += ARC_TAU

  const segments = Math.max(2, Math.ceil((Math.abs(deltaTheta) / ARC_TAU) * 24))
  for (let step = 1; step <= segments; step += 1) {
    const theta = theta1 + (deltaTheta * step) / segments
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)
    out.push([
      cx + rxScaled * cosTheta * cosPhi - ryScaled * sinTheta * sinPhi,
      cy + rxScaled * cosTheta * sinPhi + ryScaled * sinTheta * cosPhi,
    ])
  }
}

/** Parses a path `d` string into closed subpath polygons (flattened). */
export function parseSvgPath(d: string): PathPolygon[] {
  const commands = tokenize(d)
  const subpaths: Point[][] = []
  let current: Point = [0, 0]
  let start: Point = [0, 0]
  let active: Point[] | null = null
  let previousControl: Point | null = null
  let previousLetter = ''

  for (const { letter, params } of commands) {
    const relative = letter >= 'a' && letter <= 'z'
    const upper = letter.toUpperCase()

    if (upper !== 'C' && upper !== 'S' && upper !== 'Q' && upper !== 'T') {
      previousControl = null
    }

    if (upper === 'M') {
      const point: Point = relative
        ? [current[0] + params[0]!, current[1] + params[1]!]
        : [params[0]!, params[1]!]
      if (active && active.length > 1) subpaths.push(active)
      active = [point]
      current = point
      start = point
      previousLetter = upper
      continue
    }
    if (upper === 'Z') {
      if (active && active.length > 1) {
        subpaths.push(active)
        active = null
      }
      current = start
      previousLetter = upper
      continue
    }
    if (!active) {
      // Movement without an initial M: treat the current point as start.
      active = [current]
      start = current
    }
    const target: Point[] = active

    const emit = (points: Point[]): void => {
      for (const point of points) target.push(point)
      if (points.length > 0) current = points[points.length - 1]!
    }

    switch (upper) {
      case 'L':
      case 'T': {
        if (upper === 'T') {
          // Smooth quadratic: reflect the previous control point.
          const control: Point =
            previousLetter === 'Q' || previousLetter === 'T'
              ? (previousControl ?? current)
              : current
          const end: Point = relative
            ? [current[0] + params[0]!, current[1] + params[1]!]
            : [params[0]!, params[1]!]
          previousControl = control
          const buffer: Point[] = []
          flattenQuadratic(current, control, end, buffer)
          emit(buffer)
          break
        }
        const end: Point = relative
          ? [current[0] + params[0]!, current[1] + params[1]!]
          : [params[0]!, params[1]!]
        emit([end])
        break
      }
      case 'H': {
        const x = relative ? current[0] + params[0]! : params[0]!
        emit([[x, current[1]]])
        break
      }
      case 'V': {
        const y = relative ? current[1] + params[0]! : params[0]!
        emit([[current[0], y]])
        break
      }
      case 'C': {
        const c1: Point = relative
          ? [current[0] + params[0]!, current[1] + params[1]!]
          : [params[0]!, params[1]!]
        const c2: Point = relative
          ? [current[0] + params[2]!, current[1] + params[3]!]
          : [params[2]!, params[3]!]
        const end: Point = relative
          ? [current[0] + params[4]!, current[1] + params[5]!]
          : [params[4]!, params[5]!]
        previousControl = c2
        const buffer: Point[] = []
        flattenCubic(current, c1, c2, end, buffer)
        emit(buffer)
        break
      }
      case 'S': {
        const c1: Point =
          previousLetter === 'C' || previousLetter === 'S'
            ? (previousControl ?? current)
            : current
        const c2: Point = relative
          ? [current[0] + params[0]!, current[1] + params[1]!]
          : [params[0]!, params[1]!]
        const end: Point = relative
          ? [current[0] + params[2]!, current[1] + params[3]!]
          : [params[2]!, params[3]!]
        previousControl = c2
        const buffer: Point[] = []
        flattenCubic(current, c1, c2, end, buffer)
        emit(buffer)
        break
      }
      case 'Q': {
        const control: Point = relative
          ? [current[0] + params[0]!, current[1] + params[1]!]
          : [params[0]!, params[1]!]
        const end: Point = relative
          ? [current[0] + params[2]!, current[1] + params[3]!]
          : [params[2]!, params[3]!]
        previousControl = control
        const buffer: Point[] = []
        flattenQuadratic(current, control, end, buffer)
        emit(buffer)
        break
      }
      case 'A': {
        const end: Point = relative
          ? [current[0] + params[5]!, current[1] + params[6]!]
          : [params[5]!, params[6]!]
        const buffer: Point[] = []
        flattenArc(
          current,
          params[0]!,
          params[1]!,
          params[2]!,
          params[3]!,
          params[4]!,
          end,
          buffer,
        )
        emit(buffer)
        break
      }
      default:
        throw new SvgPathParseError(`SVG_PATH_COMMAND_INVALID:${letter}`)
    }
    previousLetter = upper
  }

  if (active && active.length > 1) subpaths.push(active)

  const polygons: PathPolygon[] = []
  for (const subpath of subpaths) {
    const cleaned = subpath.filter(
      (point, index) =>
        index === 0 ||
        Math.hypot(
          point[0] - subpath[index - 1]![0],
          point[1] - subpath[index - 1]![1],
        ) > 1e-9,
    )
    if (cleaned.length >= 3) polygons.push(cleaned)
  }
  if (polygons.length === 0) throw new SvgPathParseError('SVG_PATH_NO_GEOMETRY')
  return polygons
}

/** Unsigned area; sign reveals winding orientation. */
export function signedArea(polygon: PathPolygon): number {
  let total = 0
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!
    const b = polygon[(index + 1) % polygon.length]!
    total += a[0] * b[1] - b[0] * a[1]
  }
  return total / 2
}

function pointInPolygon(
  point: readonly [number, number],
  polygon: PathPolygon,
): boolean {
  let inside = false
  for (
    let index = 0, j = polygon.length - 1;
    index < polygon.length;
    j = index++
  ) {
    const a = polygon[index]!
    const b = polygon[j]!
    const intersects =
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    if (intersects) inside = !inside
  }
  return inside
}

/**
 * Groups subpath polygons into printable solid groups using even-odd
 * containment. Returns a flat list of `[outer, ...holes]` groups: a polygon
 * at even containment depth is a filled outer (its odd-depth direct children
 * are its holes); an island inside a hole (even depth) becomes its own solid
 * group, matching even-odd fill semantics. Runs in two passes so a hole may
 * be declared before its outer contour.
 */
export function groupPolygonContours(
  polygons: readonly PathPolygon[],
): PathPolygon[][] {
  const parentIndex: number[] = []
  const areas = polygons.map((polygon) => Math.abs(signedArea(polygon)))
  for (let index = 0; index < polygons.length; index += 1) {
    const reference = polygons[index]![0]!
    let parent = -1
    let parentArea = Infinity
    for (let other = 0; other < polygons.length; other += 1) {
      if (other === index) continue
      // The immediate parent is the tightest (smallest-area) container.
      if (
        areas[other]! > areas[index]! &&
        areas[other]! < parentArea &&
        pointInPolygon(reference, polygons[other]!)
      ) {
        parent = other
        parentArea = areas[other]!
      }
    }
    parentIndex[index] = parent
  }

  const depthFor = (index: number): number => {
    let depth = 0
    let cursor = parentIndex[index]!
    while (cursor >= 0) {
      depth += 1
      cursor = parentIndex[cursor]!
    }
    return depth
  }

  const groups: PathPolygon[][] = []
  const groupIndexFor: number[] = []
  for (let index = 0; index < polygons.length; index += 1) {
    if (depthFor(index) % 2 === 0) {
      groupIndexFor[index] = groups.length
      groups.push([polygons[index]!])
    } else {
      groupIndexFor[index] = -1
    }
  }
  for (let index = 0; index < polygons.length; index += 1) {
    if (depthFor(index) % 2 === 0) continue
    const parent = parentIndex[index]!
    const group = groups[groupIndexFor[parent]!]
    if (!group) {
      throw new SvgPathParseError('SVG_PATH_CONTOUR_NESTING_INVALID')
    }
    group.push(polygons[index]!)
  }
  return groups
}
