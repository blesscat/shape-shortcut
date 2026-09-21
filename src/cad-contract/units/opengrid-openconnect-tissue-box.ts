import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'
import { OPENGRID_HONEYCOMB_CONFIGURATION } from './opengrid-honeycomb'

export type TissueBoxParameters = {
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
}
export const TISSUE_BOX_KEYS = Object.keys(
  TISSUE_BOX_DEFAULTS,
) as TissueBoxParameterKey[]
export const TISSUE_BOX_MAX_CELLS = 3000
export const TISSUE_BOX_FRAME = 5
export type TissueBoxPoint = [number, number, number]
export type TissueBoxCell = {
  wall: 'front' | 'left' | 'right'
  u: number
  v: number
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
  const plateHeight = Math.max(gridPitch, height * cosine)
  return {
    width,
    depth,
    height,
    sine,
    cosine,
    plateThickness,
    supportWidth,
    plateWidth,
    offsetY: plateThickness + height * sine,
    plateHeight,
    columns: Math.max(1, Math.floor(plateWidth / gridPitch)),
    rows: Math.max(1, Math.floor(plateHeight / gridPitch)),
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
    min: [-l.width / 2, 0, 0] as TissueBoxPoint,
    max: [
      l.width / 2,
      l.offsetY + l.depth * l.cosine,
      Math.max(l.plateHeight, l.depth * l.sine + l.height * l.cosine),
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
    min: [-l.width / 2, -l.offsetY * l.cosine, 0] as TissueBoxPoint,
    max: [
      l.width / 2,
      l.depth,
      Math.max(l.height, l.offsetY * l.sine + l.plateHeight * l.cosine),
    ] as TissueBoxPoint,
  }
}

export function tissueBoxSlotOrigins(p: TissueBoxParameters): TissueBoxPoint[] {
  const l = tissueBoxLayout(p)
  const pitch = OPENGRID_GRID_CONFIGURATION.fullPitch
  const origins: TissueBoxPoint[] = []
  for (let row = 0; row < l.rows; row++) {
    for (let column = 0; column < l.columns; column++) {
      origins.push([
        (column - (l.columns - 1) / 2) * pitch,
        0,
        (row + 0.5) * pitch,
      ])
    }
  }
  return origins
}

export function tissueBoxCells(p: TissueBoxParameters): TissueBoxCell[] {
  const l = tissueBoxLayout(p)
  const lattice = OPENGRID_HONEYCOMB_CONFIGURATION
  const radius = lattice.cellRadius
  const margin = Math.max(p.outerRadius, p.wallThickness) + TISSUE_BOX_FRAME
  const cells: TissueBoxCell[] = []
  for (const wall of ['front', 'left', 'right'] as const) {
    const span = wall === 'front' ? l.width : l.depth
    let row = 0
    for (
      let v = p.bottomThickness + TISSUE_BOX_FRAME + radius;
      v <= l.height - TISSUE_BOX_FRAME - radius;
      v += lattice.rowPitch, row++
    ) {
      const offset = ((row % 2) * lattice.anchorPitch) / 2
      for (
        let u = margin + radius + offset;
        u <= span - margin - radius;
        u += lattice.anchorPitch
      ) {
        cells.push({ wall, u, v })
      }
    }
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
    Object.keys(raw).length !== TISSUE_BOX_KEYS.length ||
    TISSUE_BOX_KEYS.some((key) => !Object.hasOwn(raw, key))
  )
    issue('parameters')
  for (const key of TISSUE_BOX_KEYS) {
    if (key === 'honeycombMode') {
      if (typeof raw[key] !== 'boolean') issue(key)
    } else if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key]))
      issue(key)
  }
  if (issues.length) return { valid: false, issues }
  const p = raw as TissueBoxParameters
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
  const tokens = TISSUE_BOX_KEYS.map((key) => `${key}-${p[key]}`)
  return `opengrid-openconnect-tissue-box-${tokens.join('-')}.${extension}`
}
