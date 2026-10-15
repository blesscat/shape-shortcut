import {
  DEFAULT_MODEL_COLORS,
  type ModelColors,
} from '../../../cad-contract/model-colors'
import type {
  DiagnosticDescriptor,
  FieldDiagnostic,
} from '../../../cad-contract/diagnostics'
import {
  PLAYGROUND_SCENE_MAX_INSTANCES,
  type ScenePlacement,
} from '../../../cad-contract/scene'
import {
  PROTOTYPE_CONFIGURATION,
  type ModelBounds,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
  validateModelParameters,
} from '../../../cad-contract/units'
import {
  parseRawParameters,
  type RawParameterParseResult,
} from '../../../components/cad/workspace/validation/model-raw-parsers'
import { parameterKeysForModel } from '../../../components/cad/workspace/validation/model-parameter-keys'
import type { MeshSnapshot, WorkerEvent } from '../../../cad-contract/messages'
import {
  CadWorkerClient,
  newOperationId,
  type WorkerClientError,
} from '../worker-client'
import { getModelDefinition } from '../model-catalog'
import {
  findModelPreset,
  resolvePresetParameters,
} from '../model-catalog/presets'
import {
  cloneModelParameters,
  getSystemPreset,
  type OpenGridSystemContext,
} from '../system-entry-context'
import {
  parsePlaygroundSceneFile,
  serializePlaygroundScene,
} from './scene-file'
import { parseSceneMaxHeightMm } from '../../../cad-contract/scene'
import {
  cellsForInstance,
  findFreeAnchorCell,
  stackConflictInstanceIds,
  stackedBaseZFor,
  type PlaygroundCellRange,
  type PlaygroundCellsEntry,
  type PlaygroundStackEntry,
} from './occupancy'
import { stackingInterfaceFor } from './stacking-compatibility'
import { sceneInstanceFileName, sceneProxyCacheKey } from './filenames'
import {
  clampPlaygroundGridCells,
  loadPlaygroundGridSize,
  savePlaygroundGridSize,
  type PlaygroundGridSize,
} from './grid-size'
import { modelVisibleInViewMode } from './wall-mount'
import {
  wallDisplayCellRangeFor,
  wallDisplayPlanFor,
  wallReadyBoundsFor,
} from './wall-display'

export type PlaygroundMeshState = 'pending' | 'ready' | 'failed'

export type PlaygroundInstance = {
  id: string
  label: string | null
  modelId: ModelId
  parameters: ModelParameterValues
  rawParameters: Record<string, string>
  /**
   * Editing-time OpenGrid system context for the instance parameter panel.
   * Defaults from the scene orientation, MAY be changed by a panel system
   * switch, and is never persisted in the scene JSON.
   */
  systemContext: OpenGridSystemContext
  /** Desktop-orientation placement; the wall orientation never reads it. */
  placement: ScenePlacement | null
  /**
   * Wall-orientation placement, independent from `placement`: edits in one
   * orientation never move the instance in the other.
   */
  wallPlacement: ScenePlacement | null
  colors: ModelColors
  meshState: PlaygroundMeshState
  mesh: MeshSnapshot | null
  bounds: ModelBounds | null
  fieldErrors: Record<string, FieldDiagnostic>
  exportWorking: boolean
}

export type PlaygroundWorkerState = 'initializing' | 'ready' | 'failed'

/**
 * Scene orientation: `desktop` places instances on a horizontal grid
 * (footprint X/Y, height +Z); `wall` places them on a vertical wall board
 * (columns X, rows up +Z, protrusion +Y).
 */
export type PlaygroundViewMode = 'desktop' | 'wall'

export type PlaygroundSnapshot = {
  instances: PlaygroundInstance[]
  selectedInstanceId: string | null
  sceneColors: ModelColors
  workerState: PlaygroundWorkerState
  diagnostic: DiagnosticDescriptor | null
  /**
   * Informational outcome of the last scene import: some imported instances
   * reference components the active scene orientation does not display.
   * Cleared on orientation switch or the next import; never persisted.
   */
  importNotice: DiagnosticDescriptor | null
  viewMode: PlaygroundViewMode
  gridSize: PlaygroundGridSize
  /** Scene Z height limit in mm; `null` disables height evaluation. */
  maxHeightMm: number | null
  /**
   * Derived ids of instances participating in at least one footprint
   * overlap. Desktop orientation flags only Z-span collisions (stacked
   * pairs never conflict); wall keeps the two-dimensional rule. Recomputed
   * on every emission; never persisted.
   */
  overlappingInstanceIds: string[]
  /**
   * Derived desktop stacked base Z (mm) per placed instance id; empty in
   * wall orientation. Recomputed on every emission; never persisted.
   */
  instanceStackedZ: Record<string, number>
  /**
   * Derived ids of desktop instances whose stacked top exceeds the scene
   * height limit. Empty when no limit is set or in wall orientation; never
   * persisted.
   */
  overHeightInstanceIds: string[]
  /**
   * Monotonic counter bumped after a successful preset or restore-defaults
   * application so the mounted parameter panel remounts and every control
   * reflects the applied values. Editing-time only; never persisted.
   */
  panelResetVersion: number
}

export type PlaygroundPlacementResult =
  { ok: true } | { ok: false; diagnostic: DiagnosticDescriptor }

/**
 * Single routing point for per-orientation placement reads: `desktop`
 * resolves the desktop `placement`, `wall` resolves `wallPlacement`.
 * Rendering, occupancy, drag preview, and panel sync must read placements
 * through this accessor — never by picking the field directly.
 */
export function placementFor(
  instance: Pick<PlaygroundInstance, 'placement' | 'wallPlacement'>,
  viewMode: PlaygroundViewMode,
): ScenePlacement | null {
  return viewMode === 'wall' ? instance.wallPlacement : instance.placement
}

/**
 * Write counterpart of `placementFor`: every per-view commit goes through
 * here so a placement edit can only ever land in the addressed
 * orientation's field.
 */
function writePlacementForView(
  instance: PlaygroundInstance,
  viewMode: PlaygroundViewMode,
  placement: ScenePlacement | null,
): void {
  if (viewMode === 'wall') {
    instance.wallPlacement = placement
  } else {
    instance.placement = placement
  }
}

type PlaygroundPlacementCandidateResult =
  | {
      ok: true
      instance: PlaygroundInstance
      placement: ScenePlacement
    }
  | { ok: false; diagnostic: DiagnosticDescriptor }

/**
 * Coarse tessellation for planning-grade proxies. Kept separate from both
 * the workspace preview config and the export STL config.
 */
const SCENE_PROXY_PREVIEW_CONFIG = {
  tolerance: 0.1,
  angularTolerance: 0.5,
} as const

const NESTED_PARAMETER_KEYS = [
  'chamferCorners',
  'connectorSides',
  'targetFrameSides',
] as const

function cloneParameters(
  parameters: ModelParameterValues,
): ModelParameterValues {
  const clone = { ...parameters } as Record<string, unknown>
  for (const key of NESTED_PARAMETER_KEYS) {
    const value = clone[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      clone[key] = { ...(value as Record<string, unknown>) }
    }
  }
  return clone as unknown as ModelParameterValues
}

function rawFromParameters(
  parameters: ModelParameterValues,
  modelId: ModelId,
): Record<string, string> {
  const definition = getModelDefinition(modelId)
  const raw: Record<string, string> = {}
  if (!definition) return raw
  const typed = parameters as Record<string, unknown>
  const consider = (key: string) => {
    if (raw[key] !== undefined) return
    const value = typed[key]
    if (value !== undefined) raw[key] = String(value)
  }
  for (const field of definition.parameterSchema) consider(field.key)
  // The schema enumerates the numeric ParameterField controls only; panels
  // drive enum and boolean controls through raw strings. Complete the raw
  // snapshot with the model's canonical key set so the per-model raw parser
  // always receives every canonical key. Models without raw-parser support
  // (the opengrid board, edited through its typed full-parameters setter)
  // keep their schema-derived raw.
  try {
    for (const key of parameterKeysForModel(modelId)) consider(key)
  } catch {
    // UNKNOWN_MODEL_ID from the key registry: keep schema-derived raw.
  }
  return raw
}

function downloadBytes(bytes: ArrayBuffer, fileName: string, mime: string) {
  const blob = new Blob([bytes], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Informational import outcome: how many imported instances reference
 * components the active scene orientation does not display. `null` when
 * every imported instance is visible in the current orientation.
 */
function orientationNoticeFor(
  imported: PlaygroundInstance[],
  viewMode: PlaygroundViewMode,
): DiagnosticDescriptor | null {
  const hiddenCount = imported.filter(
    (instance) => !modelVisibleInViewMode(instance.modelId, viewMode),
  ).length
  if (hiddenCount === 0) return null
  return {
    messageId:
      viewMode === 'desktop'
        ? 'playground.import.hiddenInWallMode'
        : 'playground.import.hiddenInDesktopMode',
    params: { count: hiddenCount },
  }
}

type PendingOperation = {
  instanceId: string
  kind: 'generate' | 'export'
  /**
   * The cache key pinned at enqueue time. Generate operations send the
   * pinned parameter snapshot, so the completion/failure of an operation can
   * always clean up exactly the pending-set entry it introduced — even when
   * the instance has moved on to different parameters in the meantime.
   */
  cacheKey: string
  resolve: () => void
}

export type PlaygroundStore = {
  subscribe: (listener: (snapshot: PlaygroundSnapshot) => void) => () => void
  getSnapshot: () => PlaygroundSnapshot
  setDiagnostic: (diagnostic: DiagnosticDescriptor | null) => void
  select: (instanceId: string | null) => void
  setViewMode: (viewMode: PlaygroundViewMode) => void
  setGridSize: (size: PlaygroundGridSize) => void
  setSceneMaxHeightMm: (maxHeightMm: number | null) => void
  addInstance: (modelId: ModelId) => boolean
  removeInstance: (instanceId: string) => void
  duplicateInstance: (instanceId: string) => boolean
  retryInstance: (instanceId: string) => void
  setLabel: (instanceId: string, label: string) => void
  validatePlacement: (
    instanceId: string,
    cellX: number,
    cellY: number,
    rotation: ScenePlacement['rotation'],
  ) => boolean
  /**
   * Derived desktop stacked base Z (mm) for a candidate placement; 0 in
   * wall orientation or for structurally unevaluable candidates.
   */
  stackedZForPlacement: (
    instanceId: string,
    cellX: number,
    cellY: number,
    rotation: ScenePlacement['rotation'],
  ) => number
  setPlacement: (
    instanceId: string,
    cellX: number,
    cellY: number,
    rotation: ScenePlacement['rotation'],
  ) => PlaygroundPlacementResult
  /**
   * Drag-commit path: writes only the addressed orientation's placement,
   * leaving the other orientation untouched.
   */
  setPlacementInViewMode: (
    instanceId: string,
    cellX: number,
    cellY: number,
    rotation: ScenePlacement['rotation'],
    viewMode: PlaygroundViewMode,
  ) => PlaygroundPlacementResult
  setParameter: (
    instanceId: string,
    key: ModelParameterKey,
    rawValue: string,
  ) => void
  setInstanceParameters: (
    instanceId: string,
    parameters: ModelParameterValues,
  ) => void
  setInstanceSystemContext: (
    instanceId: string,
    context: OpenGridSystemContext,
  ) => void
  applyPreset: (instanceId: string, presetId: string) => void
  restoreInstanceParameters: (instanceId: string) => void
  markDimensionCalculationInvalid: (instanceId: string) => void
  setInstanceColors: (instanceId: string, colors: ModelColors) => void
  setSceneColors: (colors: ModelColors) => void
  importScene: (text: string) => boolean
  exportSceneJson: () => string
  exportInstance: (instanceId: string, format: 'step' | 'stl') => boolean
  dispose: () => void
}

export function createPlaygroundStore(): PlaygroundStore {
  let instances: PlaygroundInstance[] = []
  let selectedInstanceId: string | null = null
  let sceneColors: ModelColors = { ...DEFAULT_MODEL_COLORS }
  let workerState: PlaygroundWorkerState = 'initializing'
  let diagnostic: DiagnosticDescriptor | null = null
  let importNotice: DiagnosticDescriptor | null = null
  let disposed = false
  let engineReady = false
  let nextInstanceNumber = 1
  let viewMode: PlaygroundViewMode = 'desktop'
  let gridSize = loadPlaygroundGridSize()
  let maxHeightMm: number | null = null
  let panelResetVersion = 0

  const listeners = new Set<(snapshot: PlaygroundSnapshot) => void>()
  const readyCache = new Map<
    string,
    { mesh: MeshSnapshot; bounds: ModelBounds }
  >()
  const pendingCacheKeys = new Set<string>()
  const pendingOperations = new Map<string, PendingOperation>()
  const operationTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
  const generationTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const engineWaiters: Array<(ready: boolean) => void> = []
  let queue: Array<() => void> = []
  let processing = false
  let engineInitOperationId: string | null = null
  let engineInitTimeout: ReturnType<typeof setTimeout> | null = null

  const emit = () => {
    const snapshot = current()
    for (const listener of listeners) listener(snapshot)
  }

  const getInstance = (instanceId: string) =>
    instances.find((instance) => instance.id === instanceId)

  const boundsFor = (instance: PlaygroundInstance): ModelBounds | null => {
    if (instance.bounds) return instance.bounds
    const definition = getModelDefinition(instance.modelId)
    if (!definition) return null
    return definition.boundsForParameters(instance.parameters)
  }

  /**
   * Cells an instance occupies, relative to its placement anchor (only the
   * rotation matters) in the given orientation. Wall display plans anchor
   * on the OpenConnect socket grid, so the mounted body footprint —
   * including overhang past the socket span — drives occupancy; every
   * other component keeps the min-corner anchored X/Y extent in both
   * orientations.
   */
  const relativeCellsFor = (
    instance: PlaygroundInstance,
    rotation: ScenePlacement['rotation'],
    mode: PlaygroundViewMode = viewMode,
  ): PlaygroundCellRange | null => {
    if (mode === 'wall') {
      const plan = wallDisplayPlanFor(getModelDefinition(instance.modelId))
      if (plan) {
        return wallDisplayCellRangeFor(plan, instance.parameters, {
          cellX: 0,
          cellY: 0,
          rotation,
        })
      }
    }
    const bounds = boundsFor(instance)
    if (!bounds) return null
    return cellsForInstance({
      bounds,
      placement: { cellX: 0, cellY: 0, rotation, supportedBy: null },
    })
  }

  /** Analytic bounds for the given parameters, used to seed placeholders. */
  const analyticBounds = (
    modelId: ModelId,
    parameters: ModelParameterValues,
  ): ModelBounds | null => {
    const definition = getModelDefinition(modelId)
    if (!definition) return null
    return definition.boundsForParameters(parameters)
  }

  // Occupancy keeps every placed instance, including failed ones: a failed
  // generation still occupies its planned footprint and a retry must not
  // start from an overlap. Instances the given orientation does not
  // display neither render nor occupy cells, so they stay out of every
  // derivation. A `candidate` replaces the excluded instance at its stored
  // array slot so preview derivations see the same stacking order the
  // committed derivation will use.
  const placedStackEntries = (
    excludeId?: string,
    candidate?: PlaygroundStackEntry,
    mode: PlaygroundViewMode = viewMode,
  ): PlaygroundStackEntry[] =>
    instances.flatMap((instance) => {
      if (candidate && instance.id === excludeId) return [candidate]
      const placement = placementFor(instance, mode)
      if (instance.id === excludeId || placement === null) return []
      if (!modelVisibleInViewMode(instance.modelId, mode)) return []
      const relativeCells = relativeCellsFor(instance, placement.rotation, mode)
      if (!relativeCells) return []
      const bounds = boundsFor(instance)
      return [
        {
          id: instance.id,
          relativeCells,
          placement,
          heightMm: bounds ? bounds.max[2] : null,
          stacking: stackingInterfaceFor(instance.modelId, instance.parameters),
        },
      ]
    })

  /**
   * Derived orientation-aware conflict state: in both orientations only
   * displayed instances participate. Overlapping footprints conflict unless
   * their stacking interfaces are compatible — desktop additionally
   * requires the stacked Z spans to intersect (compatible pairs stack, so
   * they never intersect); wall has no Z stacking, so incompatible overlaps
   * flag directly. Also derives desktop stacked base Z and height-limit
   * exceeders.
   */
  const deriveConflictState = (): {
    conflictIds: string[]
    stackedZ: Record<string, number>
    overHeightIds: string[]
  } => {
    const entries = placedStackEntries()
    if (typeof process !== 'undefined' && process.env.DEBUG_CONFLICTS)
      console.log('DBG', viewMode, JSON.stringify(entries))
    if (viewMode !== 'desktop') {
      return {
        conflictIds: [...stackConflictInstanceIds(entries, { zAware: false })],
        stackedZ: {},
        overHeightIds: [],
      }
    }
    const { baseZ, matings } = stackedBaseZFor(entries)
    const stackedZ: Record<string, number> = {}
    for (const [id, z] of baseZ) stackedZ[id] = z
    const limit = maxHeightMm
    const overHeightIds =
      limit === null
        ? []
        : instances.flatMap((instance) => {
            if (placementFor(instance, viewMode) === null) return []
            if (!modelVisibleInViewMode(instance.modelId, viewMode)) return []
            const bounds = boundsFor(instance)
            if (!bounds) return []
            return (baseZ.get(instance.id) ?? 0) + bounds.max[2] > limit
              ? [instance.id]
              : []
          })
    return {
      conflictIds: [
        ...stackConflictInstanceIds(entries, {
          zAware: true,
          precomputedBaseZ: baseZ,
          matings,
        }),
      ],
      stackedZ,
      overHeightIds,
    }
  }

  /**
   * Occupied-cell entries of the instances displayed in `mode`, for
   * free-cell scans: only visible instances participate, exactly like the
   * runtime occupancy derivations.
   */
  const occupiedEntriesForView = (
    mode: PlaygroundViewMode,
    excludeId?: string,
  ): PlaygroundCellsEntry[] =>
    instances.flatMap((instance) => {
      if (instance.id === excludeId) return []
      const placement = placementFor(instance, mode)
      if (placement === null) return []
      if (!modelVisibleInViewMode(instance.modelId, mode)) return []
      const relativeCells = relativeCellsFor(instance, placement.rotation, mode)
      if (!relativeCells) return []
      return [{ id: instance.id, relativeCells, placement }]
    })

  /**
   * Assigns a free anchor cell in one orientation, writing only that
   * orientation's placement field. Components without evaluable bounds
   * stay unplaced in that orientation.
   */
  const assignPlacementForView = (
    instance: PlaygroundInstance,
    mode: PlaygroundViewMode,
  ): void => {
    const relativeCells = relativeCellsFor(instance, 0, mode)
    if (!relativeCells) {
      writePlacementForView(instance, mode, null)
      return
    }
    const free = findFreeAnchorCell(
      relativeCells,
      occupiedEntriesForView(mode, instance.id),
    )
    writePlacementForView(instance, mode, {
      cellX: free.cellX,
      cellY: free.cellY,
      rotation: 0,
      supportedBy: null,
    })
  }

  /**
   * Each scene orientation that displays the component gets an independent
   * free-cell scan against that orientation's occupied cells; orientations
   * never copy placements from each other. Orientations that do not
   * display the component still receive a scanned placement so the file
   * shape stays uniform.
   */
  const assignPlacement = (instance: PlaygroundInstance): void => {
    for (const mode of ['desktop', 'wall'] as const) {
      assignPlacementForView(instance, mode)
    }
  }

  const validatePlacementCandidate = (
    instanceId: string,
    cellX: number,
    cellY: number,
    rotation: ScenePlacement['rotation'],
    mode: PlaygroundViewMode = viewMode,
  ): PlaygroundPlacementCandidateResult => {
    const instance = getInstance(instanceId)
    if (!instance) {
      return {
        ok: false,
        diagnostic: { messageId: 'diagnostic.sceneFileMalformed' },
      }
    }
    if (!Number.isInteger(cellX) || !Number.isInteger(cellY)) {
      return {
        ok: false,
        diagnostic: { messageId: 'diagnostic.sceneInvalidPlacement' },
      }
    }
    if (!relativeCellsFor(instance, rotation, mode)) {
      return {
        ok: false,
        diagnostic: { messageId: 'diagnostic.sceneInvalidPlacement' },
      }
    }
    const placement: ScenePlacement = {
      cellX,
      cellY,
      rotation,
      supportedBy: null,
    }

    return { ok: true, instance, placement }
  }

  /**
   * Builds the stack entries a candidate placement participates in: the
   * candidate replaces the moved instance at its stored array slot, so the
   * preview derivation matches the committed one exactly.
   */
  const candidateStackEntries = (
    instance: PlaygroundInstance,
    placement: ScenePlacement,
    mode: PlaygroundViewMode = viewMode,
  ): PlaygroundStackEntry[] | null => {
    const relativeCells = relativeCellsFor(instance, placement.rotation, mode)
    if (!relativeCells) return null
    const bounds = boundsFor(instance)
    return placedStackEntries(
      instance.id,
      {
        id: instance.id,
        relativeCells,
        placement,
        heightMm: bounds ? bounds.max[2] : null,
        stacking: stackingInterfaceFor(instance.modelId, instance.parameters),
      },
      mode,
    )
  }

  /**
   * Whether this candidate placement would be flagged. On the desktop the
   * candidate stacks onto overlapping instances, so only an overlap with an
   * unresolved-height instance flags; wall placements keep the
   * two-dimensional rule. Used for drag-preview coloring only — commits
   * accept overlapping placements. Returns false for structurally
   * unevaluable candidates (unknown instance, non-integer cells, missing
   * bounds) as well; drag candidates never hit that branch.
   */
  const placementOverlaps = (
    instance: PlaygroundInstance,
    placement: ScenePlacement,
    mode: PlaygroundViewMode = viewMode,
  ): boolean => {
    const entries = candidateStackEntries(instance, placement, mode)
    if (!entries) return false
    const { matings } = stackedBaseZFor(entries)
    return stackConflictInstanceIds(entries, {
      zAware: mode === 'desktop',
      matings,
    }).has(instance.id)
  }

  /**
   * Shared placement commit: validates and writes the placement of the
   * addressed orientation only. `setPlacement` keeps its historical
   * active-orientation behavior for tests and internal callers; the drag
   * commit reaches this through `setPlacementInViewMode` with the view the
   * gesture started in.
   */
  const commitPlacementInView = (
    mode: PlaygroundViewMode,
    instanceId: string,
    cellX: number,
    cellY: number,
    rotation: ScenePlacement['rotation'],
  ): PlaygroundPlacementResult => {
    const result = validatePlacementCandidate(
      instanceId,
      cellX,
      cellY,
      rotation,
      mode,
    )
    if (!result.ok) {
      diagnostic = result.diagnostic
      emit()
      return result
    }
    // Overlapping placements commit; the derived overlap warning on the
    // snapshot flags them instead of a rejection.
    writePlacementForView(result.instance, mode, result.placement)
    diagnostic = null
    emit()
    return { ok: true }
  }

  const cacheKeyFor = (instance: PlaygroundInstance): string =>
    sceneProxyCacheKey(instance.modelId, instance.parameters)

  const clearOperationTimeout = (operationId: string) => {
    const timeout = operationTimeouts.get(operationId)
    if (timeout) {
      clearTimeout(timeout)
      operationTimeouts.delete(operationId)
    }
  }

  const finishOperation = (operationId: string) => {
    const pending = pendingOperations.get(operationId)
    if (!pending) return
    pendingOperations.delete(operationId)
    clearOperationTimeout(operationId)
    pending.resolve()
  }

  const failOperation = (operationId: string) => {
    const pending = pendingOperations.get(operationId)
    if (!pending) return
    // Only generate operations own pending-set entries; exports require a
    // ready (cached) key, which can never be in the pending set.
    if (pending.kind === 'generate') {
      // Clean up exactly the pending-set entry this operation introduced; the
      // instance's current key may already belong to a newer generation.
      pendingCacheKeys.delete(pending.cacheKey)
      // Every instance deduped onto this operation shares its fate; leaving
      // any of them pending would strand a placeholder with no retry.
      for (const instance of instances) {
        if (
          instance.meshState === 'pending' &&
          cacheKeyFor(instance) === pending.cacheKey
        ) {
          instance.meshState = 'failed'
        }
      }
    }
    const instance = getInstance(pending.instanceId)
    if (instance) {
      instance.exportWorking = false
    }
    finishOperation(operationId)
    emit()
  }

  const ensureEngine = (): Promise<boolean> => {
    if (engineReady) return Promise.resolve(true)
    if (workerState === 'failed' || disposed) return Promise.resolve(false)
    return new Promise((resolve) => {
      engineWaiters.push(resolve)
    })
  }

  const failWorker = (): void => {
    workerState = 'failed'
    engineReady = false
    for (const instance of instances) {
      if (instance.meshState === 'pending') instance.meshState = 'failed'
      instance.exportWorking = false
    }
    pendingOperations.clear()
    pendingCacheKeys.clear()
    for (const timeout of operationTimeouts.values()) clearTimeout(timeout)
    operationTimeouts.clear()
    queue = []
    processing = false
    emit()
    for (const resolve of engineWaiters.splice(0)) resolve(false)
  }

  const drainQueue = (): void => {
    if (processing || disposed) return
    const next = queue.shift()
    if (!next) return
    processing = true
    next()
  }

  const runOnWorker = (
    instanceId: string,
    kind: PendingOperation['kind'],
    cacheKey: string,
    send: (operationId: string) => void,
  ): void => {
    void ensureEngine().then((ready) => {
      if (!ready || disposed) {
        const instance = getInstance(instanceId)
        if (instance) {
          if (kind === 'generate' && cacheKeyFor(instance) === cacheKey) {
            instance.meshState = 'failed'
          }
          instance.exportWorking = false
        }
        pendingCacheKeys.delete(cacheKey)
        processing = false
        emit()
        void drainQueue()
        return
      }
      const operationId = newOperationId(
        kind === 'generate' ? 'scene-generate' : 'scene-export',
      )
      pendingOperations.set(operationId, {
        instanceId,
        kind,
        cacheKey,
        resolve: () => {
          processing = false
          void drainQueue()
        },
      })
      operationTimeouts.set(
        operationId,
        setTimeout(() => {
          failOperation(operationId)
        }, PROTOTYPE_CONFIGURATION.operationTimeoutMs),
      )
      send(operationId)
    })
  }

  const handleEvent = (event: WorkerEvent): void => {
    if (disposed) return
    if (event.kind === 'engine.ready') {
      engineReady = true
      workerState = 'ready'
      if (engineInitTimeout) {
        clearTimeout(engineInitTimeout)
        engineInitTimeout = null
      }
      emit()
      for (const resolve of engineWaiters.splice(0)) resolve(true)
      return
    }
    if (event.kind === 'operation.error') {
      if (
        engineInitOperationId &&
        event.operationId === engineInitOperationId
      ) {
        failWorker()
        return
      }
      if (pendingOperations.has(event.operationId)) {
        failOperation(event.operationId)
      }
      return
    }
    if (event.kind === 'scene.instance.ready') {
      // Cache under the *requested* parameters so a stale completion for
      // superseded parameters can never poison the current key.
      const eventKey = sceneProxyCacheKey(event.modelId, event.parameters)
      readyCache.set(eventKey, { mesh: event.mesh, bounds: event.bounds })
      // Only the operation that owns this completion may release the pending
      // set entry; a late duplicate of an already-failed op must not release
      // a key a newer generation has re-registered.
      const owningOperation = pendingOperations.get(event.operationId)
      if (owningOperation && owningOperation.kind === 'generate') {
        pendingCacheKeys.delete(owningOperation.cacheKey)
      }
      // Deliver to every pending (or previously failed) instance whose
      // current parameters match the delivered mesh; instances that moved on
      // stay pending for their own generation.
      for (const instance of instances) {
        if (
          (instance.meshState === 'pending' ||
            instance.meshState === 'failed') &&
          cacheKeyFor(instance) === eventKey
        ) {
          instance.mesh = event.mesh
          instance.bounds = event.bounds
          instance.meshState = 'ready'
        }
      }
      finishOperation(event.operationId)
      emit()
      return
    }
    if (event.kind === 'scene.instance.export.ready') {
      const instance = getInstance(event.instanceId)
      if (instance) instance.exportWorking = false
      downloadBytes(event.bytes, event.fileName, event.mime)
      finishOperation(event.operationId)
      emit()
      return
    }
  }

  const handleClientError = (_clientError: WorkerClientError): void => {
    if (disposed) return
    failWorker()
  }

  const client = new CadWorkerClient()
  client.onEvent(handleEvent)
  client.onError(handleClientError)
  engineInitOperationId = newOperationId('engine-init')
  client.send({
    kind: 'engine.init',
    operationId: engineInitOperationId,
    asset: {
      wasmUrl: new URL('/replicad_single.wasm', window.location.origin).href,
    },
  })
  engineInitTimeout = setTimeout(() => {
    if (!engineReady && !disposed) failWorker()
  }, PROTOTYPE_CONFIGURATION.engineInitializationTimeoutMs)

  /**
   * Debounces proxy generation per instance so slider/typing bursts only
   * enqueue the final value (design D7, mirroring the workspace convention).
   */
  const scheduleGenerate = (instance: PlaygroundInstance): void => {
    if (disposed) return
    const existingTimer = generationTimers.get(instance.id)
    if (existingTimer) clearTimeout(existingTimer)
    generationTimers.set(
      instance.id,
      setTimeout(() => {
        generationTimers.delete(instance.id)
        sendGenerate(instance)
      }, PROTOTYPE_CONFIGURATION.inputDebounceMs),
    )
  }

  const sendGenerate = (instance: PlaygroundInstance): void => {
    if (disposed) return
    // Pin the parameter snapshot and its cache key at enqueue time so the
    // pending-set entry, the sent payload, and the completion cleanup always
    // refer to the same generation — even if the instance's parameters change
    // while the request waits in the serial queue.
    const pinnedParameters = cloneParameters(instance.parameters)
    const cacheKey = sceneProxyCacheKey(instance.modelId, pinnedParameters)
    const cached = readyCache.get(cacheKey)
    if (cached) {
      instance.mesh = cached.mesh
      instance.bounds = cached.bounds
      instance.meshState = 'ready'
      emit()
      return
    }
    if (pendingCacheKeys.has(cacheKey)) {
      // The in-flight generation will deliver to every pending instance
      // with this key when it completes; nothing to queue.
      instance.meshState = 'pending'
      emit()
      return
    }
    instance.meshState = 'pending'
    pendingCacheKeys.add(cacheKey)
    emit()
    queue.push(() => {
      // Skip operations whose instance was removed while queued; release the
      // pinned key and fail key-matched pending siblings so nothing strands.
      if (!getInstance(instance.id)) {
        pendingCacheKeys.delete(cacheKey)
        for (const candidate of instances) {
          if (
            candidate.meshState === 'pending' &&
            cacheKeyFor(candidate) === cacheKey
          ) {
            candidate.meshState = 'failed'
          }
        }
        processing = false
        emit()
        void drainQueue()
        return
      }
      runOnWorker(instance.id, 'generate', cacheKey, (operationId) => {
        client.send({
          kind: 'scene.instance.generate',
          operationId,
          instanceId: instance.id,
          modelId: instance.modelId,
          parameters: pinnedParameters,
          previewConfig: SCENE_PROXY_PREVIEW_CONFIG,
        })
      })
    })
    drainQueue()
  }

  /**
   * Commits a validated full parameter set: syncs raw inputs and analytic
   * bounds, adopts a cached mesh when one exists for the new parameters,
   * and otherwise schedules debounced regeneration. Single emission point
   * shared by the raw-input, typed, preset, and restore-defaults paths.
   */
  const commitParameters = (
    instance: PlaygroundInstance,
    parameters: ModelParameterValues,
  ): void => {
    instance.fieldErrors = {}
    instance.parameters = cloneParameters(parameters)
    instance.rawParameters = rawFromParameters(
      instance.parameters,
      instance.modelId,
    )
    instance.bounds = analyticBounds(instance.modelId, instance.parameters)
    // A ready mesh is authored for the previous parameters; mounting it
    // under the new wall display plan would mis-seat it (a tilt change
    // floats the plate off the board until regeneration catches up). Adopt
    // an already-cached mesh for the new parameters immediately, otherwise
    // drop to the parameter-consistent placeholder for the debounced
    // generation instead of rendering the stale mesh.
    const cached = readyCache.get(cacheKeyFor(instance))
    const pendingTimer = generationTimers.get(instance.id)
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      generationTimers.delete(instance.id)
    }
    if (cached) {
      instance.mesh = cached.mesh
      instance.bounds = cached.bounds
      instance.meshState = 'ready'
    } else {
      instance.meshState = 'pending'
    }
    diagnostic = null
    emit()
    if (!cached) scheduleGenerate(instance)
  }

  const current = (): PlaygroundSnapshot => {
    const derived = deriveConflictState()
    return {
      instances: instances.map((instance) => ({ ...instance })),
      selectedInstanceId,
      sceneColors: { ...sceneColors },
      viewMode,
      gridSize: { ...gridSize },
      maxHeightMm,
      workerState,
      diagnostic: diagnostic ? { ...diagnostic } : null,
      importNotice: importNotice ? { ...importNotice } : null,
      overlappingInstanceIds: derived.conflictIds,
      instanceStackedZ: derived.stackedZ,
      overHeightInstanceIds: derived.overHeightIds,
      panelResetVersion,
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      listener(current())
      return () => listeners.delete(listener)
    },
    getSnapshot: current,
    setDiagnostic(next) {
      diagnostic = next
      emit()
    },
    select(instanceId) {
      selectedInstanceId = instanceId
      emit()
    },
    setViewMode(next) {
      viewMode = next
      // The notice describes visibility under the previous orientation.
      importNotice = null
      // A selection from the other system's component list would render as
      // hidden in the newly active orientation.
      if (
        selectedInstanceId !== null &&
        !modelVisibleInViewMode(getInstance(selectedInstanceId)!.modelId, next)
      ) {
        selectedInstanceId = null
      }
      emit()
    },
    setGridSize(size) {
      const next = {
        x: clampPlaygroundGridCells(size.x),
        y: clampPlaygroundGridCells(size.y),
      }
      if (next.x === gridSize.x && next.y === gridSize.y) return
      gridSize = next
      savePlaygroundGridSize(gridSize)
      emit()
    },
    setSceneMaxHeightMm(value) {
      const next = parseSceneMaxHeightMm(value)
      if (next === maxHeightMm) return
      maxHeightMm = next
      emit()
    },
    addInstance(modelId) {
      if (disposed || instances.length >= PLAYGROUND_SCENE_MAX_INSTANCES) {
        diagnostic = {
          messageId: 'diagnostic.sceneTooManyInstances',
          params: { max: PLAYGROUND_SCENE_MAX_INSTANCES },
        }
        emit()
        return false
      }
      const definition = getModelDefinition(modelId)
      if (!definition) return false
      const parameters = cloneParameters(definition.defaultParameters)
      const instance: PlaygroundInstance = {
        id: `inst-${nextInstanceNumber}`,
        label: null,
        modelId,
        parameters,
        rawParameters: rawFromParameters(parameters, modelId),
        // Scene orientation maps 1:1 onto the OpenGrid system context.
        systemContext: viewMode === 'wall' ? 'wall' : 'desk',
        placement: null,
        wallPlacement: null,
        colors: { ...sceneColors },
        meshState: 'pending',
        mesh: null,
        bounds: analyticBounds(modelId, parameters),
        fieldErrors: {},
        exportWorking: false,
      }
      nextInstanceNumber += 1
      instances.push(instance)
      assignPlacement(instance)
      selectedInstanceId = instance.id
      diagnostic = null
      emit()
      scheduleGenerate(instance)
      return true
    },
    removeInstance(instanceId) {
      instances = instances.filter((instance) => instance.id !== instanceId)
      const pendingTimer = generationTimers.get(instanceId)
      if (pendingTimer) {
        clearTimeout(pendingTimer)
        generationTimers.delete(instanceId)
      }
      if (selectedInstanceId === instanceId) selectedInstanceId = null
      emit()
    },
    duplicateInstance(instanceId) {
      if (disposed || instances.length >= PLAYGROUND_SCENE_MAX_INSTANCES) {
        diagnostic = {
          messageId: 'diagnostic.sceneTooManyInstances',
          params: { max: PLAYGROUND_SCENE_MAX_INSTANCES },
        }
        emit()
        return false
      }
      const source = getInstance(instanceId)
      if (!source) return false
      const instance: PlaygroundInstance = {
        id: `inst-${nextInstanceNumber}`,
        label: source.label ? `${source.label}-copy` : null,
        modelId: source.modelId,
        parameters: cloneParameters(source.parameters),
        rawParameters: { ...source.rawParameters },
        systemContext: source.systemContext,
        placement: null,
        wallPlacement: null,
        colors: { ...source.colors },
        meshState: 'pending',
        mesh: null,
        bounds: source.bounds,
        fieldErrors: {},
        exportWorking: false,
      }
      nextInstanceNumber += 1
      instances.push(instance)
      assignPlacement(instance)
      selectedInstanceId = instance.id
      emit()
      scheduleGenerate(instance)
      return true
    },
    retryInstance(instanceId) {
      const instance = getInstance(instanceId)
      if (!instance || instance.meshState !== 'failed') return
      sendGenerate(instance)
    },
    setLabel(instanceId, label) {
      const instance = getInstance(instanceId)
      if (!instance) return
      const trimmed = label.trim()
      instance.label = trimmed.length > 0 ? trimmed : null
      emit()
    },
    validatePlacement(instanceId, cellX, cellY, rotation) {
      const result = validatePlacementCandidate(
        instanceId,
        cellX,
        cellY,
        rotation,
      )
      if (!result.ok) return false
      return !placementOverlaps(result.instance, result.placement)
    },
    stackedZForPlacement(instanceId, cellX, cellY, rotation) {
      if (viewMode !== 'desktop') return 0
      if (!Number.isInteger(cellX) || !Number.isInteger(cellY)) return 0
      const instance = getInstance(instanceId)
      if (!instance) return 0
      const entries = candidateStackEntries(instance, {
        cellX,
        cellY,
        rotation,
        supportedBy: null,
      })
      if (!entries) return 0
      return stackedBaseZFor(entries).baseZ.get(instanceId) ?? 0
    },
    setPlacement(instanceId, cellX, cellY, rotation) {
      return commitPlacementInView(viewMode, instanceId, cellX, cellY, rotation)
    },
    setPlacementInViewMode(instanceId, cellX, cellY, rotation, targetView) {
      return commitPlacementInView(
        targetView,
        instanceId,
        cellX,
        cellY,
        rotation,
      )
    },
    setParameter(instanceId, key, rawValue) {
      const instance = getInstance(instanceId)
      if (!instance) return
      const definition = getModelDefinition(instance.modelId)
      if (!definition) return
      // Raw-first like the workspace: the per-model raw parser owns type
      // interpretation, so enum and boolean edits keep their literal values
      // (no blanket Number() coercion) and multi-step panel edits accumulate
      // before validation sees the combined snapshot.
      const candidateRawParameters = {
        ...instance.rawParameters,
        [key]: rawValue,
      }
      let parsed: RawParameterParseResult
      try {
        parsed = parseRawParameters(candidateRawParameters, instance.modelId)
      } catch (error) {
        // Only the key registry's UNKNOWN_MODEL_ID (the opengrid board,
        // edited through its typed full-parameters setter) may fall back to
        // the previous typed merge; its schema is all-numeric, so numeric
        // coercion is exact. Anything else is a parser bug — rethrow it so
        // the enum-NaN class this change fixed cannot silently resurrect.
        if (!(
          error instanceof Error &&
          error.message.startsWith('UNKNOWN_MODEL_ID:')
        )) {
          throw error
        }
        const candidateParameters = {
          ...instance.parameters,
          [key]: Number(rawValue),
        } as ModelParameterValues
        const validation = validateModelParameters(
          instance.modelId,
          candidateParameters,
        )
        if (!validation.valid) {
          instance.fieldErrors = {}
          for (const issue of validation.issues) {
            instance.fieldErrors[issue.field] = issue
          }
          emit()
          return
        }
        commitParameters(instance, validation.value.parameters)
        return
      }
      if (!parsed.valid) {
        instance.rawParameters = candidateRawParameters
        // Every panel binds per-field errors, so a field-less rejection
        // (e.g. derived footprint overflowing the workspace) surfaces on
        // the edited control — the workspace input handler's convention.
        const field = parsed.field ?? key
        instance.fieldErrors = {
          [field]: {
            field,
            messageId: parsed.messageId,
            ...(parsed.params ? { params: parsed.params } : {}),
          },
        }
        emit()
        return
      }
      commitParameters(instance, parsed.value)
    },
    setInstanceParameters(instanceId, parameters) {
      const instance = getInstance(instanceId)
      if (!instance) return
      const definition = getModelDefinition(instance.modelId)
      if (!definition) return
      const validation = definition.validateParameters(
        cloneParameters(parameters),
      )
      if (!validation.valid) {
        instance.fieldErrors = {}
        for (const issue of validation.issues) {
          instance.fieldErrors[issue.field] = issue
        }
        emit()
        return
      }
      commitParameters(instance, validation.value.parameters)
    },
    setInstanceSystemContext(instanceId, context) {
      const instance = getInstance(instanceId)
      if (!instance || instance.systemContext === context) return
      instance.systemContext = context
      emit()
    },
    applyPreset(instanceId, presetId) {
      const instance = getInstance(instanceId)
      if (!instance) return
      const definition = getModelDefinition(instance.modelId)
      if (!definition) return
      const preset = findModelPreset(definition, presetId)
      if (!preset) {
        if (import.meta.env.DEV) {
          console.error(`UNKNOWN_MODEL_PRESET:${instance.modelId}:${presetId}`)
        }
        return
      }
      const resolved = resolvePresetParameters(definition, preset)
      if (!resolved.ok) {
        if (import.meta.env.DEV) {
          console.error(`MODEL_PRESET_INVALID:${instance.modelId}:${presetId}`)
        }
        return
      }
      // Bump before committing so the same emission remounts the panel and
      // shows the applied values; a failed application never reaches here.
      panelResetVersion += 1
      commitParameters(instance, resolved.parameters)
    },
    restoreInstanceParameters(instanceId) {
      const instance = getInstance(instanceId)
      if (!instance) return
      const definition = getModelDefinition(instance.modelId)
      if (!definition) return
      const systemPreset = instance.systemContext
        ? getSystemPreset(instance.modelId, instance.systemContext)
        : undefined
      const next = cloneModelParameters(
        systemPreset ?? definition.defaultParameters,
      )
      const validation = definition.validateParameters(cloneParameters(next))
      if (!validation.valid) return
      panelResetVersion += 1
      commitParameters(instance, validation.value.parameters)
    },
    markDimensionCalculationInvalid(instanceId) {
      const instance = getInstance(instanceId)
      if (!instance) return
      // Mirrors the workspace input-invalid path: surface a parameters-level
      // diagnostic and stop the debounced generation scheduled for the
      // current parameters. The next valid edit clears the diagnostic via
      // commitParameters.
      const pendingTimer = generationTimers.get(instance.id)
      if (pendingTimer) {
        clearTimeout(pendingTimer)
        generationTimers.delete(instance.id)
      }
      instance.fieldErrors = {
        ...instance.fieldErrors,
        parameters: { field: 'parameters', messageId: 'validation.invalid' },
      }
      // Cancelling the debounce must not strand an already-pending
      // placeholder with no timer and no recovery path; the instance's
      // parameters are still valid, so re-arm its generation.
      if (instance.meshState === 'pending') scheduleGenerate(instance)
      emit()
    },
    setInstanceColors(instanceId, colors) {
      const instance = getInstance(instanceId)
      if (!instance) return
      instance.colors = { ...colors }
      emit()
    },
    setSceneColors(colors) {
      sceneColors = { ...colors }
      emit()
    },
    importScene(text) {
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        diagnostic = { messageId: 'diagnostic.sceneFileMalformed' }
        importNotice = null
        emit()
        return false
      }
      // A missing or invalid scene palette must fall back to the shared
      // default palette, not to the palette of the scene being replaced.
      const result = parsePlaygroundSceneFile(parsed, DEFAULT_MODEL_COLORS)
      if (!result.valid) {
        diagnostic = result.error
        importNotice = null
        emit()
        return false
      }
      const candidateInstances: PlaygroundInstance[] =
        result.scene.instances.map((data) => {
          const instance: PlaygroundInstance = {
            id: `inst-${nextInstanceNumber}`,
            label: data.label,
            modelId: data.modelId,
            parameters: data.parameters,
            rawParameters: rawFromParameters(data.parameters, data.modelId),
            // Scene orientation maps 1:1 onto the OpenGrid system context;
            // a file-carried context is intentionally not restored.
            systemContext: viewMode === 'wall' ? 'wall' : 'desk',
            placement: data.placement,
            wallPlacement: data.wallPlacement,
            colors: { ...data.colors },
            meshState: 'pending',
            mesh: null,
            bounds: analyticBounds(data.modelId, data.parameters),
            fieldErrors: {},
            exportWorking: false,
          }
          nextInstanceNumber += 1
          return instance
        })
      const withAutoPlacement: PlaygroundInstance[] = candidateInstances.map(
        (instance) => ({ ...instance }),
      )
      // Imported instances missing a placement in one orientation get an
      // independent free-cell scan for that orientation against its
      // occupied cells (visible instances only); file-carried placements in
      // the other orientation are never copied.
      for (const mode of ['desktop', 'wall'] as const) {
        for (const instance of withAutoPlacement) {
          if (placementFor(instance, mode)) continue
          const relativeCells = relativeCellsFor(instance, 0, mode)
          if (!relativeCells) {
            writePlacementForView(instance, mode, null)
            continue
          }
          const free = findFreeAnchorCell(
            relativeCells,
            occupiedEntriesForView(mode, instance.id),
          )
          writePlacementForView(instance, mode, {
            cellX: free.cellX,
            cellY: free.cellY,
            rotation: 0,
            supportedBy: null,
          })
        }
      }
      // In-file placement conflicts import with the derived overlap warning
      // instead of rejecting the whole file; every other failure above
      // leaves the current scene untouched. Debounce timers of replaced
      // instances must not fire afterwards, so the clear happens only after
      // every rejection point.
      for (const timer of generationTimers.values()) clearTimeout(timer)
      generationTimers.clear()
      instances = withAutoPlacement
      sceneColors = { ...result.scene.colors }
      maxHeightMm = result.scene.maxHeightMm
      selectedInstanceId = instances[0]?.id ?? null
      diagnostic = null
      importNotice = orientationNoticeFor(instances, viewMode)
      emit()
      for (const instance of instances) scheduleGenerate(instance)
      return true
    },
    exportSceneJson() {
      return JSON.stringify(
        serializePlaygroundScene(
          sceneColors,
          instances.map((instance) => ({
            label: instance.label,
            modelId: instance.modelId,
            parameters: instance.parameters,
            placement: instance.placement,
            wallPlacement: instance.wallPlacement,
            colors: instance.colors,
          })),
          { maxHeightMm },
        ),
        null,
        2,
      )
    },
    exportInstance(instanceId, format) {
      const instance = getInstance(instanceId)
      if (
        !instance ||
        instance.meshState !== 'ready' ||
        instance.exportWorking
      ) {
        return false
      }
      const definition = getModelDefinition(instance.modelId)
      const index = instances.findIndex((entry) => entry.id === instanceId) + 1
      const baseName =
        format === 'step'
          ? (definition?.exportFileName(instance.parameters) ??
            `instance-${index}.step`)
          : (definition?.stlFileName(instance.parameters) ??
            `instance-${index}.stl`)
      const fileName = sceneInstanceFileName(baseName, {
        label: instance.label,
        index,
      })
      // Pin the exported parameters so a queued export always matches the
      // geometry the user saw when clicking the action.
      const pinnedParameters = cloneParameters(instance.parameters)
      const exportKey = sceneProxyCacheKey(instance.modelId, pinnedParameters)
      instance.exportWorking = true
      emit()
      queue.push(() => {
        // Skip operations whose instance was removed while queued.
        if (!getInstance(instanceId)) {
          processing = false
          void drainQueue()
          return
        }
        runOnWorker(instanceId, 'export', exportKey, (operationId) => {
          client.send({
            kind:
              format === 'step'
                ? 'scene.instance.export.step'
                : 'scene.instance.export.stl',
            operationId,
            instanceId,
            modelId: instance.modelId,
            parameters: pinnedParameters,
            format,
            file: {
              name: fileName,
              mime:
                format === 'step'
                  ? PROTOTYPE_CONFIGURATION.stepMime
                  : PROTOTYPE_CONFIGURATION.stlMime,
            },
          })
        })
      })
      drainQueue()
      return true
    },
    dispose() {
      disposed = true
      for (const timer of generationTimers.values()) clearTimeout(timer)
      generationTimers.clear()
      for (const timer of operationTimeouts.values()) clearTimeout(timer)
      operationTimeouts.clear()
      if (engineInitTimeout) {
        clearTimeout(engineInitTimeout)
        engineInitTimeout = null
      }
      client.terminate()
      listeners.clear()
    },
  }
}
