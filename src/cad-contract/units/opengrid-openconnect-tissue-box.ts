import {
  OPENCONNECT_ALIGNMENT_KEYS,
  openConnectAlignmentIssues,
  normalizedOpenConnectAlignment,
  openConnectGridOffsets,
  type OpenConnectAlignmentParameters,
} from './openconnect-alignment'
import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
import { OPENGRID_HONEYCOMB_CONFIGURATION } from './opengrid-honeycomb'

export type TissueBoxParameters = OpenConnectAlignmentParameters & {
  x: number
  y: number
  z: number
  tiltAngle: number
  outerRadius: number
  wallThickness: number
  bottomThickness: number
  slotLength: number
  slotWidth: number
  honeycombMode: boolean
}
export type TissueBoxParameterKey = keyof TissueBoxParameters
export const TISSUE_BOX_ALIGNMENT_DEFAULTS = {
  openConnectHorizontalAlignment: 'center',
  openConnectVerticalAlignment: 'bottom',
} as const
export const TISSUE_BOX_DEFAULTS: TissueBoxParameters = {
  x: 220,
  y: 120,
  z: 90,
  tiltAngle: 15,
  outerRadius: 5,
  wallThickness: 2,
  bottomThickness: 2,
  slotLength: 160,
  slotWidth: 35,
  honeycombMode: false,
  ...TISSUE_BOX_ALIGNMENT_DEFAULTS,
}
export const TISSUE_BOX_KEYS = Object.keys(
  TISSUE_BOX_DEFAULTS,
) as TissueBoxParameterKey[]
export const TISSUE_BOX_MAX_CELLS = 3000
export const TISSUE_BOX_FRAME = 5
export type TissueBoxPoint = [number, number, number]
export type TissueBoxCellPoint = [number, number]
export type TissueBoxCell = {
  wall: 'front' | 'left' | 'right' | 'bottom'
  u: number
  v: number
  /** Hexagon clipped to the protected panel, in the wall's surface coordinates. */
  polygon: TissueBoxCellPoint[]
  /** Bottom opening is clipped against the rounded dispensing-slot safety ring. */
  clipToSlotSafetyRing: boolean
}

type TissueBoxCellRectangle = {
  minimumU: number
  maximumU: number
  minimumV: number
  maximumV: number
}

const TISSUE_BOX_CELL_EPSILON = 1e-9
// Matches the shared lattice module's nonEmptyPolygons floor so micro-slivers
// are never cut.
const TISSUE_BOX_CELL_MIN_AREA = 1e-4

function hexagonPolygonAt(center: TissueBoxCellPoint): TissueBoxCellPoint[] {
  const lattice = OPENGRID_HONEYCOMB_CONFIGURATION
  const points: TissueBoxCellPoint[] = []
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 6 + (Math.PI / 3) * index
    points.push([
      center[0] + lattice.cellRadius * Math.cos(angle),
      center[1] + lattice.cellRadius * Math.sin(angle),
    ])
  }
  return points
}

function intersectCellBoundary(
  start: TissueBoxCellPoint,
  end: TissueBoxCellPoint,
  axis: 0 | 1,
  position: number,
): TissueBoxCellPoint {
  const ratio =
    (position - start[axis]) /
    (end[axis] - start[axis] || TISSUE_BOX_CELL_EPSILON)
  const point: TissueBoxCellPoint = [start[0], start[1]]
  point[axis] = position
  point[1 - axis] = start[1 - axis] + ratio * (end[1 - axis] - start[1 - axis])
  return point
}

function clipCellPolygonToBoundary(
  points: TissueBoxCellPoint[],
  axis: 0 | 1,
  position: number,
  keepLower: boolean,
): TissueBoxCellPoint[] {
  const clipped: TissueBoxCellPoint[] = []
  const inside = (point: TissueBoxCellPoint) =>
    keepLower
      ? point[axis] <= position + TISSUE_BOX_CELL_EPSILON
      : point[axis] >= position - TISSUE_BOX_CELL_EPSILON
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!
    const previous = points[(index + points.length - 1) % points.length]!
    if (inside(current)) {
      if (!inside(previous))
        clipped.push(intersectCellBoundary(previous, current, axis, position))
      clipped.push(current)
    } else if (inside(previous)) {
      clipped.push(intersectCellBoundary(previous, current, axis, position))
    }
  }
  return clipped
}

function clipCellPolygonToRectangle(
  points: TissueBoxCellPoint[],
  rectangle: TissueBoxCellRectangle,
): TissueBoxCellPoint[] {
  let clipped = clipCellPolygonToBoundary(points, 0, rectangle.minimumU, false)
  clipped = clipCellPolygonToBoundary(clipped, 0, rectangle.maximumU, true)
  clipped = clipCellPolygonToBoundary(clipped, 1, rectangle.minimumV, false)
  return clipCellPolygonToBoundary(clipped, 1, rectangle.maximumV, true)
}

function cellPolygonArea(points: TissueBoxCellPoint[]): number {
  let area = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!
    const next = points[(index + 1) % points.length]!
    area += current[0] * next[1] - next[0] * current[1]
  }
  return Math.abs(area) / 2
}

function cellPanelRectangle(
  p: TissueBoxParameters,
  wall: TissueBoxCell['wall'],
): TissueBoxCellRectangle {
  const l = tissueBoxLayout(p)
  const lattice = OPENGRID_HONEYCOMB_CONFIGURATION
  // Rounded front corners recede the outer surface, so panels keep the full
  // radius plus the side frame away from those ends; square ends use the frame.
  // No panel may enter the perpendicular wall slabs, so the frame bands are
  // also clamped to the wall thickness.
  const cornerFrame = Math.max(
    p.outerRadius + lattice.sideFrame,
    p.wallThickness,
  )
  const sideLimit = Math.max(lattice.sideFrame, p.wallThickness)
  if (wall === 'bottom')
    return {
      minimumU: -l.width / 2 + lattice.bottomFrame,
      maximumU: l.width / 2 - lattice.bottomFrame,
      minimumV: lattice.bottomFrame,
      maximumV: l.depth - lattice.bottomFrame,
    }
  const span = wall === 'front' ? l.width : l.depth
  return {
    minimumU: wall === 'front' ? cornerFrame : sideLimit,
    maximumU: span - cornerFrame,
    minimumV: p.bottomThickness + lattice.sideFrame,
    maximumV: l.height - lattice.sideFrame,
  }
}

function distanceToSlotCenterline(
  p: TissueBoxParameters,
  u: number,
  v: number,
  layout: ReturnType<typeof tissueBoxLayout>,
): number {
  const slotCoreHalf = Math.max(0, p.slotLength / 2 - p.slotWidth / 2)
  return Math.hypot(
    Math.max(0, Math.abs(u) - slotCoreHalf),
    Math.abs(v - layout.depth / 2),
  )
}

function polygonHasOpeningOutsideSlotSafetyRing(
  p: TissueBoxParameters,
  polygon: readonly TissueBoxCellPoint[],
  layout: ReturnType<typeof tissueBoxLayout>,
): boolean {
  const safetyRing = OPENGRID_HONEYCOMB_CONFIGURATION.bottomHoleSafetyRing
  const protectedRadius = p.slotWidth / 2 + safetyRing
  return polygon.some(
    ([u, v]) =>
      distanceToSlotCenterline(p, u, v, layout) >
      protectedRadius + TISSUE_BOX_CELL_EPSILON,
  )
}

function cellMayOverlapSlotSafetyRing(
  p: TissueBoxParameters,
  u: number,
  v: number,
  layout: ReturnType<typeof tissueBoxLayout>,
): boolean {
  const lattice = OPENGRID_HONEYCOMB_CONFIGURATION
  const protectedRadius =
    p.slotWidth / 2 + lattice.bottomHoleSafetyRing + lattice.cellRadius
  return (
    distanceToSlotCenterline(p, u, v, layout) <
    protectedRadius - TISSUE_BOX_CELL_EPSILON
  )
}

function cellPolygonFitsProtectors(
  p: TissueBoxParameters,
  wall: TissueBoxCell['wall'],
  center: TissueBoxCellPoint,
  polygon: readonly TissueBoxCellPoint[],
): boolean {
  if (wall !== 'bottom') return true
  const l = tissueBoxLayout(p)
  if (!polygonHasOpeningOutsideSlotSafetyRing(p, polygon, l)) return false
  if (p.outerRadius <= 0) return true
  const [u, v] = center
  const radius = OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius
  // The two front corners of the bottom plate are rounded by outerRadius.
  // Cells reaching a corner arc must fit inside that arc inset by the bottom
  // frame, so no opening breaks the rounded surface.
  const cornerCenterY = l.depth - p.outerRadius
  const arcLimit =
    p.outerRadius - OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame - radius
  if (v + radius <= cornerCenterY) return true
  for (const sign of [-1, 1]) {
    const cornerCenterX = sign * (l.width / 2 - p.outerRadius)
    const reachesCorner =
      sign === 1 ? u + radius > cornerCenterX : u - radius < cornerCenterX
    if (
      reachesCorner &&
      Math.hypot(u - cornerCenterX, v - cornerCenterY) > arcLimit
    )
      return false
  }
  return true
}

export function tissueBoxSlotLipRadius(p: TissueBoxParameters): number {
  return Math.min(0.4, p.bottomThickness / 4)
}

export function tissueBoxSlotLimits(p: TissueBoxParameters) {
  const margin = TISSUE_BOX_FRAME + tissueBoxSlotLipRadius(p)
  return { length: p.x - 2 * margin, width: p.y - 2 * margin }
}

export function tissueBoxLayout(p: TissueBoxParameters) {
  const width = p.x + 2 * p.wallThickness
  const depth = p.y + 2 * p.wallThickness
  const height = p.z + p.bottomThickness
  const radians = (p.tiltAngle * Math.PI) / 180
  const sine = Math.sin(radians)
  const cosine = Math.cos(radians)
  const plateThickness = 4
  const supportWidth = width
  const gridPitch = OPENGRID_GRID_CONFIGURATION.fullPitch
  const plateWidth = Math.max(gridPitch, supportWidth)
  const offsetY = plateThickness + height * sine
  const plateBottom = (-offsetY * sine) / cosine
  const plateTop = (height - offsetY * sine) / cosine
  // Full-thickness cells fit in the intersection of the two sloped end planes.
  const rowBase = ((plateThickness - offsetY) * sine) / cosine
  const plateHeight = plateTop - rowBase
  return {
    width,
    depth,
    height,
    sine,
    cosine,
    plateThickness,
    supportWidth,
    plateWidth,
    offsetY,
    plateBottom,
    plateTop,
    rowBase,
    plateHeight,
    columns: Math.max(1, Math.floor(plateWidth / gridPitch)),
    rows: Math.max(0, Math.floor((plateHeight + 1e-9) / gridPitch)),
    innerRadius: Math.max(0, p.outerRadius - p.wallThickness),
  }
}

export function tissueBoxPoint(
  p: TissueBoxParameters,
  [x, y, z]: TissueBoxPoint,
): TissueBoxPoint {
  const l = tissueBoxLayout(p)
  return [x, l.offsetY + y * l.cosine - z * l.sine, y * l.sine + z * l.cosine]
}

export function tissueBoxInstalledBounds(p: TissueBoxParameters) {
  const l = tissueBoxLayout(p)
  return {
    min: [-l.width / 2, 0, l.plateBottom] as TissueBoxPoint,
    max: [
      l.width / 2,
      l.offsetY + l.depth * l.cosine,
      l.depth * l.sine + l.height * l.cosine,
    ] as TissueBoxPoint,
  }
}

/** Transform an installed-space point to the flat-bottom preview/export frame. */
export function tissueBoxPrintPoint(
  p: TissueBoxParameters,
  [x, y, z]: TissueBoxPoint,
): TissueBoxPoint {
  const l = tissueBoxLayout(p)
  const relativeY = y - l.offsetY
  return [
    x,
    relativeY * l.cosine + z * l.sine,
    -relativeY * l.sine + z * l.cosine,
  ]
}

export function tissueBoxBounds(p: TissueBoxParameters) {
  const l = tissueBoxLayout(p)
  return {
    min: [-l.width / 2, -l.offsetY / l.cosine, 0] as TissueBoxPoint,
    max: [l.width / 2, l.depth, l.height] as TissueBoxPoint,
  }
}

export function tissueBoxSlotOrigins(p: TissueBoxParameters): TissueBoxPoint[] {
  const l = tissueBoxLayout(p)
  const pitch = OPENGRID_GRID_CONFIGURATION.fullPitch
  const alignment = normalizedOpenConnectAlignment(
    p,
    TISSUE_BOX_ALIGNMENT_DEFAULTS,
  )
  // The body faces +Y: front-view left is world +X. Keep the authored socket unmirrored.
  let horizontal = alignment.openConnectHorizontalAlignment
  if (horizontal === 'left') horizontal = 'right'
  else if (horizontal === 'right') horizontal = 'left'
  const offset = openConnectGridOffsets(
    l.plateWidth,
    l.plateHeight,
    l.columns,
    l.rows,
    pitch,
    {
      ...alignment,
      openConnectHorizontalAlignment: horizontal,
    },
  )
  const origins: TissueBoxPoint[] = []
  for (let row = 0; row < l.rows; row++) {
    for (let column = 0; column < l.columns; column++) {
      origins.push([
        offset.x + (column + 0.5) * pitch,
        0,
        l.rowBase + offset.z + (row + 0.5) * pitch,
      ])
    }
  }
  return origins
}

export function tissueBoxCells(p: TissueBoxParameters): TissueBoxCell[] {
  const lattice = OPENGRID_HONEYCOMB_CONFIGURATION
  const radius = lattice.cellRadius
  // Horizontal inradius of the point-up hexagon: its maximum u extent.
  const hexagonHalfWidth = (Math.sqrt(3) * radius) / 2
  const cells: TissueBoxCell[] = []
  const emit = (wall: TissueBoxCell['wall'], center: TissueBoxCellPoint) => {
    const polygon = clipCellPolygonToRectangle(
      hexagonPolygonAt(center),
      cellPanelRectangle(p, wall),
    )
    if (
      polygon.length < 3 ||
      cellPolygonArea(polygon) <= TISSUE_BOX_CELL_MIN_AREA
    )
      return
    if (!cellPolygonFitsProtectors(p, wall, center, polygon)) return
    const layout = tissueBoxLayout(p)
    cells.push({
      wall,
      u: center[0],
      v: center[1],
      polygon,
      clipToSlotSafetyRing:
        wall === 'bottom' &&
        cellMayOverlapSlotSafetyRing(p, center[0], center[1], layout),
    })
  }
  // Walls follow the shared side-panel lattice: rows centered inside the
  // panel, columns on the absolute pitch, centers reaching one inradius past
  // the frame lines so partial cells are clipped flush with the frames.
  for (const wall of ['front', 'left', 'right'] as const) {
    const panel = cellPanelRectangle(p, wall)
    const centerU = (panel.minimumU + panel.maximumU) / 2
    const centerV = (panel.minimumV + panel.maximumV) / 2
    const halfU = (panel.maximumU - panel.minimumU) / 2
    const halfV = (panel.maximumV - panel.minimumV) / 2
    const minimumU = -halfU - hexagonHalfWidth + TISSUE_BOX_CELL_EPSILON
    const maximumU = halfU + hexagonHalfWidth - TISSUE_BOX_CELL_EPSILON
    const availableRowSpan = Math.max(0, halfV * 2 - radius * 2)
    const rowCount =
      Math.ceil(
        (availableRowSpan + TISSUE_BOX_CELL_EPSILON) / lattice.rowPitch,
      ) + 1
    const firstRowV = -((rowCount - 1) * lattice.rowPitch) / 2
    for (let row = 0; row < rowCount; row += 1) {
      const offset = (row % 2) * (lattice.anchorPitch / 2)
      const firstColumn = Math.ceil(
        (minimumU - offset - TISSUE_BOX_CELL_EPSILON) / lattice.anchorPitch,
      )
      const lastColumn = Math.floor(
        (maximumU - offset + TISSUE_BOX_CELL_EPSILON) / lattice.anchorPitch,
      )
      for (let column = firstColumn; column <= lastColumn; column += 1)
        emit(wall, [
          centerU + column * lattice.anchorPitch + offset,
          centerV + firstRowV + row * lattice.rowPitch,
        ])
    }
  }
  // The bottom overlaps its frame lines on every side: extend each span so
  // centers reach one inradius (u) / one circumradius (v) past the frame,
  // matching the shared lattice's boundary-overlap, and clip into half cells.
  const panel = cellPanelRectangle(p, 'bottom')
  const centerU = (panel.minimumU + panel.maximumU) / 2
  const centerV = (panel.minimumV + panel.maximumV) / 2
  const halfU = (panel.maximumU - panel.minimumU) / 2 + hexagonHalfWidth
  const halfV = (panel.maximumV - panel.minimumV) / 2 + 2 * radius
  const availableRowSpan = Math.max(0, halfV * 2 - radius * 2)
  const rowCount =
    Math.floor(
      (availableRowSpan + TISSUE_BOX_CELL_EPSILON) / lattice.rowPitch,
    ) + 1
  const firstRowV = -((rowCount - 1) * lattice.rowPitch) / 2
  for (let row = 0; row < rowCount; row += 1) {
    const offset = (row % 2) * (lattice.anchorPitch / 2)
    const firstColumn = Math.ceil(
      (-halfU - offset - TISSUE_BOX_CELL_EPSILON) / lattice.anchorPitch,
    )
    const lastColumn = Math.floor(
      (halfU - offset + TISSUE_BOX_CELL_EPSILON) / lattice.anchorPitch,
    )
    for (let column = firstColumn; column <= lastColumn; column += 1)
      emit('bottom', [
        centerU + column * lattice.anchorPitch + offset,
        centerV + firstRowV + row * lattice.rowPitch,
      ])
  }
  return cells
}

export type TissueBoxValidation =
  | { valid: true; value: TissueBoxParameters }
  | {
      valid: false
      issues: {
        field: TissueBoxParameterKey | 'parameters'
        messageId: 'validation.invalid'
      }[]
    }

export function validateTissueBoxParameters(
  value: unknown,
): TissueBoxValidation {
  const issues: Extract<TissueBoxValidation, { valid: false }>['issues'] = []
  const issue = (field: TissueBoxParameterKey | 'parameters') =>
    issues.push({ field, messageId: 'validation.invalid' })
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }
  const raw = value as Record<string, unknown>
  if (
    Object.keys(raw).some(
      (key) => !TISSUE_BOX_KEYS.includes(key as TissueBoxParameterKey),
    ) ||
    TISSUE_BOX_KEYS.some(
      (key) =>
        !OPENCONNECT_ALIGNMENT_KEYS.includes(
          key as (typeof OPENCONNECT_ALIGNMENT_KEYS)[number],
        ) && !Object.hasOwn(raw, key),
    )
  )
    issue('parameters')
  for (const alignmentIssue of openConnectAlignmentIssues(raw))
    issue(alignmentIssue.field)
  for (const key of TISSUE_BOX_KEYS) {
    if (
      key === 'openConnectHorizontalAlignment' ||
      key === 'openConnectVerticalAlignment'
    )
      continue
    if (key === 'honeycombMode') {
      if (typeof raw[key] !== 'boolean') issue(key)
    } else if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key]))
      issue(key)
  }
  if (issues.length) return { valid: false, issues }
  const p = {
    ...raw,
    ...normalizedOpenConnectAlignment(
      raw as OpenConnectAlignmentParameters,
      TISSUE_BOX_ALIGNMENT_DEFAULTS,
    ),
  } as TissueBoxParameters
  for (const key of ['x', 'y'] as const)
    if (p[key] < 40 || p[key] > 400) issue(key)
  if (p.z < 20 || p.z > 300) issue('z')
  for (const key of ['wallThickness', 'bottomThickness'] as const)
    if (p[key] < 1 || p[key] > 5) issue(key)
  if (!Number.isInteger(p.tiltAngle) || p.tiltAngle < 0 || p.tiltAngle > 45)
    issue('tiltAngle')
  if (p.outerRadius < 0 || p.outerRadius > Math.min(p.x, p.y) / 4)
    issue('outerRadius')
  const slotLimits = tissueBoxSlotLimits(p)
  if (p.slotWidth < 5 || p.slotWidth > slotLimits.width) issue('slotWidth')
  if (p.slotLength < p.slotWidth + 2 || p.slotLength > slotLimits.length)
    issue('slotLength')
  if (issues.length) return { valid: false, issues }
  if (tissueBoxLayout(p).rows < 1) issue('z')
  const envelopes = [tissueBoxBounds(p), tissueBoxInstalledBounds(p)]
  if (
    envelopes.some((bounds) =>
      bounds.max.some((max, index) => max - bounds.min[index]! > 500),
    )
  )
    issue('parameters')
  if (p.honeycombMode && tissueBoxCells(p).length > TISSUE_BOX_MAX_CELLS)
    issue('honeycombMode')
  if (issues.length) return { valid: false, issues }
  return { valid: true, value: { ...p } }
}

export function isTissueBoxParameters(
  value: unknown,
): value is TissueBoxParameters {
  return validateTissueBoxParameters(value).valid
}

export function tissueBoxFileName(
  p: TissueBoxParameters,
  extension: 'step' | 'stl',
): string {
  const normalized = {
    ...p,
    ...normalizedOpenConnectAlignment(p, TISSUE_BOX_ALIGNMENT_DEFAULTS),
  }
  const tokens = TISSUE_BOX_KEYS.map((key) => {
    if (key === 'openConnectHorizontalAlignment') return `ha-${normalized[key]}`
    if (key === 'openConnectVerticalAlignment') return `va-${normalized[key]}`
    return `${key}-${normalized[key]}`
  })
  return `opengrid-openconnect-tissue-box-${tokens.join('-')}.${extension}`
}
