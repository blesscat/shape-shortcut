import { isModelColor, isModelColors, type ModelColors } from './model-colors'
import type { DiagnosticDescriptor } from './diagnostics'

export const SCENE_FILE_KIND = 'shape-shortcut/scene' as const

export const SCENE_FILE_SCHEMA_VERSION = 2 as const

export const PLAYGROUND_SCENE_MAX_INSTANCES = 100 as const

export const PLAYGROUND_GRID_PITCH = 28 as const

export const PLAYGROUND_ROTATIONS = [0, 90, 180, 270] as const

export type PlaygroundRotation = (typeof PLAYGROUND_ROTATIONS)[number]

export type SceneGridSystem = 'opengrid'

export type ScenePlacement = {
  cellX: number
  cellY: number
  rotation: PlaygroundRotation
  /** Reserved for future stacking; MUST be null in this capability. */
  supportedBy: string | null
}

/**
 * Instance-level color override. Missing fields fall back to the scene
 * palette; invalid values are normalized away by the parser.
 */
export type SceneColorsOverride = {
  primary?: string
  secondary?: string
}

export type SceneInstanceFile = {
  label?: string
  modelId: string
  parameters: unknown
  placement?: ScenePlacementFile
  /**
   * Required in scene files: the parser rejects a scene whose instances
   * omit it. Component-workspace settings exports are not scenes and omit
   * both placements.
   */
  wallPlacement?: ScenePlacementFile
  colors?: SceneColorsOverride
}

export type ScenePlacementFile = {
  cellX: number
  cellY: number
  rotation: number
  supportedBy?: unknown
}

export type SceneFile = {
  schemaVersion: number
  kind: typeof SCENE_FILE_KIND
  grid?: { system: SceneGridSystem }
  colors?: ModelColors
  /** Scene Z height limit in mm; present exactly when a limit is set. */
  maxHeightMm?: number
  instances: SceneInstanceFile[]
}

export type SceneInstanceDiagnostic =
  | 'diagnostic.sceneFileMalformed'
  | 'diagnostic.sceneFileUnsupportedVersion'
  | 'diagnostic.sceneUnknownModel'
  | 'diagnostic.sceneInstanceInvalidParameters'
  | 'diagnostic.sceneInvalidPlacement'
  | 'diagnostic.sceneTooManyInstances'

export type SceneParseFailure = {
  valid: false
  error: DiagnosticDescriptor
}

export type SceneParseSuccess<TInstance> = {
  valid: true
  scene: {
    grid: SceneGridSystem
    colors: ModelColors
    /** Positive mm limit, or `null` when the file sets no usable limit. */
    maxHeightMm: number | null
    instances: TInstance[]
  }
}

export type SceneParseResult<TInstance> =
  SceneParseSuccess<TInstance> | SceneParseFailure

export function sceneFailure(
  messageId: SceneInstanceDiagnostic,
  params?: DiagnosticDescriptor['params'],
): SceneParseFailure {
  return { valid: false, error: { messageId, params } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function isRotation(value: unknown): value is PlaygroundRotation {
  return (
    isInteger(value) &&
    (PLAYGROUND_ROTATIONS as readonly number[]).includes(value)
  )
}

/**
 * Scene Z height limit in mm. A positive finite number is kept; anything
 * else — absent, zero, negative, or not a number — normalizes to no limit
 * so a malformed value never rejects an otherwise valid scene.
 */
export function parseSceneMaxHeightMm(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

function resolveSceneColors(
  value: unknown,
  fallback: ModelColors,
): ModelColors {
  if (!isRecord(value)) return { ...fallback }
  const primary =
    isModelColor(value.primary) && typeof value.primary === 'string'
      ? value.primary.toLowerCase()
      : fallback.primary
  const secondary =
    isModelColor(value.secondary) && typeof value.secondary === 'string'
      ? value.secondary.toLowerCase()
      : fallback.secondary
  return { primary, secondary }
}

/**
 * Parses the placement block shared by scene parsing and per-field
 * normalization. Returns `null` for a structurally invalid placement; an
 * absent placement stays `undefined` so callers can distinguish "no
 * placement" (editor settings export) from an invalid one.
 */
export function parseScenePlacement(
  value: unknown,
): ScenePlacement | null | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return null
  if (!isInteger(value.cellX) || !isInteger(value.cellY)) return null
  if (!isRotation(value.rotation)) return null
  if (value.supportedBy !== undefined && value.supportedBy !== null) return null
  return {
    cellX: value.cellX,
    cellY: value.cellY,
    rotation: value.rotation,
    supportedBy: null,
  }
}

export function resolveInstanceColors(
  value: unknown,
  sceneColors: ModelColors,
): ModelColors {
  if (!isRecord(value)) return { ...sceneColors }
  return {
    primary:
      typeof value.primary === 'string' && isModelColor(value.primary)
        ? value.primary.toLowerCase()
        : sceneColors.primary,
    secondary:
      typeof value.secondary === 'string' && isModelColor(value.secondary)
        ? value.secondary.toLowerCase()
        : sceneColors.secondary,
  }
}

/**
 * Structural validation of the scene envelope and instance list. Model
 * identity and parameter validation are delegated to the `parseInstance`
 * callback so this module stays free of the model registry. Instance ids are
 * assigned by the caller (`inst-1` style) and file-provided ids are ignored.
 */
export function parseSceneFile<TInstance extends object>(
  value: unknown,
  fallbackColors: ModelColors,
  parseInstance: (
    entry: unknown,
    sceneColors: ModelColors,
  ) => TInstance | { __sceneInstanceError: DiagnosticDescriptor },
): SceneParseResult<TInstance> {
  if (!isRecord(value)) return sceneFailure('diagnostic.sceneFileMalformed')
  if (value.kind !== SCENE_FILE_KIND) {
    return sceneFailure('diagnostic.sceneFileMalformed')
  }
  if (value.schemaVersion !== SCENE_FILE_SCHEMA_VERSION) {
    return sceneFailure('diagnostic.sceneFileUnsupportedVersion')
  }
  if (!Array.isArray(value.instances) || value.instances.length === 0) {
    return sceneFailure('diagnostic.sceneFileMalformed')
  }
  if (value.instances.length > PLAYGROUND_SCENE_MAX_INSTANCES) {
    return sceneFailure('diagnostic.sceneTooManyInstances', {
      max: PLAYGROUND_SCENE_MAX_INSTANCES,
    })
  }

  const grid: SceneGridSystem =
    isRecord(value.grid) && value.grid.system === 'opengrid'
      ? 'opengrid'
      : 'opengrid'
  const colors = isModelColors(value.colors)
    ? {
        primary: value.colors.primary.toLowerCase(),
        secondary: value.colors.secondary.toLowerCase(),
      }
    : resolveSceneColors(undefined, fallbackColors)

  const instances: TInstance[] = []
  for (const entry of value.instances) {
    const parsed = parseInstance(entry, colors)
    if ('__sceneInstanceError' in parsed) {
      return { valid: false, error: parsed.__sceneInstanceError }
    }
    instances.push(parsed)
  }

  return {
    valid: true,
    scene: {
      grid,
      colors,
      maxHeightMm: parseSceneMaxHeightMm(value.maxHeightMm),
      instances,
    },
  }
}

export function parseSceneInstanceCommon(
  entry: unknown,
  sceneColors: ModelColors,
): {
  label: string | null
  modelId: string
  parameters: unknown
  placement: ScenePlacement | null | undefined
  wallPlacement: ScenePlacement | null
  colors: ModelColors
  error?: DiagnosticDescriptor
} {
  if (!isRecord(entry)) {
    return {
      label: null,
      modelId: '',
      parameters: undefined,
      placement: undefined,
      wallPlacement: null,
      colors: sceneColors,
      error: { messageId: 'diagnostic.sceneFileMalformed' },
    }
  }
  // A v2 scene instance always writes both placement blocks. A v2 settings
  // file (component-workspace export) omits both because the instance is
  // unplaced; the schema-version gate has already rejected pre-v2 files, so
  // the shared absence of both blocks is the settings shape — accepted with
  // both placements null for free-cell assignment. Any other missing block
  // stays malformed.
  const settingsShape =
    entry.wallPlacement === undefined && entry.placement === undefined
  if (entry.wallPlacement === undefined && !settingsShape) {
    return {
      label: null,
      modelId: '',
      parameters: undefined,
      placement: undefined,
      wallPlacement: null,
      colors: sceneColors,
      error: { messageId: 'diagnostic.sceneFileMalformed' },
    }
  }
  const placement = parseScenePlacement(entry.placement)
  if (placement === null) {
    return {
      label: null,
      modelId: '',
      parameters: undefined,
      placement,
      wallPlacement: null,
      colors: sceneColors,
      error: { messageId: 'diagnostic.sceneInvalidPlacement' },
    }
  }
  // `parseScenePlacement` also yields `undefined` for an absent value; the
  // presence check above already rejected that case, so only the invalid
  // (`null`) result reaches this branch.
  const wallPlacement = settingsShape
    ? null
    : (parseScenePlacement(entry.wallPlacement) ?? null)
  if (wallPlacement === null && !settingsShape) {
    return {
      label: null,
      modelId: '',
      parameters: undefined,
      placement,
      wallPlacement,
      colors: sceneColors,
      error: { messageId: 'diagnostic.sceneInvalidPlacement' },
    }
  }
  const modelId =
    typeof entry.modelId === 'string' && entry.modelId.length > 0
      ? entry.modelId
      : ''
  return {
    label:
      typeof entry.label === 'string' && entry.label.trim().length > 0
        ? entry.label.trim()
        : null,
    modelId,
    parameters: entry.parameters,
    placement,
    wallPlacement,
    colors: resolveInstanceColors(entry.colors, sceneColors),
  }
}
