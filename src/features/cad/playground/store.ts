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
import type { MeshSnapshot, WorkerEvent } from '../../../cad-contract/messages'
import {
  CadWorkerClient,
  newOperationId,
  type WorkerClientError,
} from '../worker-client'
import { getModelDefinition } from '../model-catalog'
import {
  parsePlaygroundSceneFile,
  serializePlaygroundScene,
} from './scene-file'
import { findFreeAnchorCell, firstPlacementConflict } from './occupancy'
import { sceneInstanceFileName, sceneProxyCacheKey } from './filenames'
import {
  clampPlaygroundGridCells,
  loadPlaygroundGridSize,
  savePlaygroundGridSize,
  type PlaygroundGridSize,
} from './grid-size'
import { modelVisibleInViewMode } from './wall-mount'

export type PlaygroundMeshState = 'pending' | 'ready' | 'failed'

export type PlaygroundInstance = {
  id: string
  label: string | null
  modelId: ModelId
  parameters: ModelParameterValues
  rawParameters: Record<string, string>
  placement: ScenePlacement | null
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
  viewMode: PlaygroundViewMode
  gridSize: PlaygroundGridSize
}

export type PlaygroundPlacementResult =
  { ok: true } | { ok: false; diagnostic: DiagnosticDescriptor }

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
  for (const field of definition.parameterSchema) {
    const value = (parameters as Record<string, unknown>)[field.key]
    if (value !== undefined) raw[field.key] = String(value)
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
  addInstance: (modelId: ModelId) => boolean
  removeInstance: (instanceId: string) => void
  duplicateInstance: (instanceId: string) => boolean
  retryInstance: (instanceId: string) => void
  setLabel: (instanceId: string, label: string) => void
  setPlacement: (
    instanceId: string,
    cellX: number,
    cellY: number,
    rotation: ScenePlacement['rotation'],
  ) => PlaygroundPlacementResult
  setParameter: (
    instanceId: string,
    key: ModelParameterKey,
    rawValue: string,
  ) => void
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
  let disposed = false
  let engineReady = false
  let nextInstanceNumber = 1
  let viewMode: PlaygroundViewMode = 'desktop'
  let gridSize = loadPlaygroundGridSize()

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
    const current: PlaygroundSnapshot = {
      instances: instances.map((instance) => ({ ...instance })),
      selectedInstanceId,
      sceneColors: { ...sceneColors },
      viewMode,
      gridSize: { ...gridSize },
      workerState,
      diagnostic: diagnostic ? { ...diagnostic } : null,
    }
    for (const listener of listeners) listener(current)
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
   * The footprint an instance occupies on the active plane. Every component
   * mounts by its base face, so the footprint is the authored X/Y extent in
   * both orientations.
   */
  const effectiveFootprintBounds = (
    instance: PlaygroundInstance,
  ): ModelBounds | null => boundsFor(instance)

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
  // start from an overlap.
  const placedEntries = (excludeId?: string) =>
    instances
      .filter(
        (instance) => instance.id !== excludeId && instance.placement !== null,
      )
      .map((instance) => ({
        id: instance.id,
        bounds: boundsFor(instance),
        placement: instance.placement,
      }))
      .filter(
        (
          entry,
        ): entry is {
          id: string
          bounds: ModelBounds
          placement: ScenePlacement
        } => entry.bounds !== null && entry.placement !== null,
      )

  const assignPlacement = (instance: PlaygroundInstance): void => {
    const bounds = boundsFor(instance)
    if (!bounds) {
      instance.placement = null
      return
    }
    const free = findFreeAnchorCell(bounds, placedEntries(instance.id))
    instance.placement = {
      cellX: free.cellX,
      cellY: free.cellY,
      rotation: 0,
      supportedBy: null,
    }
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

  const current = (): PlaygroundSnapshot => ({
    instances: instances.map((instance) => ({ ...instance })),
    selectedInstanceId,
    sceneColors: { ...sceneColors },
    viewMode,
    gridSize: { ...gridSize },
    workerState,
    diagnostic: diagnostic ? { ...diagnostic } : null,
  })

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
        placement: null,
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
        placement: null,
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
    setPlacement(instanceId, cellX, cellY, rotation) {
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
      const bounds = effectiveFootprintBounds(instance)
      if (!bounds) {
        return {
          ok: false,
          diagnostic: { messageId: 'diagnostic.sceneInvalidPlacement' },
        }
      }
      const candidate: ScenePlacement = {
        cellX,
        cellY,
        rotation,
        supportedBy: null,
      }
      const conflict = firstPlacementConflict([
        ...placedEntries(instanceId),
        { id: instanceId, bounds, placement: candidate },
      ])
      if (conflict) {
        const rejection: DiagnosticDescriptor = {
          messageId: 'diagnostic.scenePlacementConflict',
        }
        diagnostic = rejection
        emit()
        return { ok: false, diagnostic: rejection }
      }
      instance.placement = candidate
      diagnostic = null
      emit()
      return { ok: true }
    },
    setParameter(instanceId, key, rawValue) {
      const instance = getInstance(instanceId)
      if (!instance) return
      const definition = getModelDefinition(instance.modelId)
      if (!definition) return
      if (!definition.parameterSchema.some((field) => field.key === key)) return
      const candidateParameters = {
        ...instance.parameters,
        [key]: Number(rawValue),
      } as ModelParameterValues
      const validation = validateModelParameters(
        instance.modelId,
        candidateParameters,
      )
      instance.rawParameters = { ...instance.rawParameters, [key]: rawValue }
      if (!validation.valid) {
        instance.fieldErrors = {}
        for (const issue of validation.issues) {
          instance.fieldErrors[issue.field] = issue
        }
        emit()
        return
      }
      instance.fieldErrors = {}
      instance.parameters = cloneParameters(validation.value.parameters)
      instance.rawParameters = rawFromParameters(
        instance.parameters,
        instance.modelId,
      )
      instance.bounds = analyticBounds(instance.modelId, instance.parameters)
      diagnostic = null
      emit()
      scheduleGenerate(instance)
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
        emit()
        return false
      }
      // A missing or invalid scene palette must fall back to the shared
      // default palette, not to the palette of the scene being replaced.
      const result = parsePlaygroundSceneFile(parsed, DEFAULT_MODEL_COLORS)
      if (!result.valid) {
        diagnostic = result.error
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
            placement: data.placement,
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
      for (const instance of withAutoPlacement) {
        if (!instance.placement) {
          const bounds = instance.bounds
          if (!bounds) {
            instance.placement = null
            continue
          }
          const free = findFreeAnchorCell(
            bounds,
            withAutoPlacement
              .filter(
                (other) => other.id !== instance.id && other.placement !== null,
              )
              .map((other) => ({
                id: other.id,
                bounds: other.bounds,
                placement: other.placement,
              }))
              .filter(
                (
                  entry,
                ): entry is {
                  id: string
                  bounds: ModelBounds
                  placement: ScenePlacement
                } => entry.bounds !== null && entry.placement !== null,
              ),
          )
          instance.placement = {
            cellX: free.cellX,
            cellY: free.cellY,
            rotation: 0,
            supportedBy: null,
          }
        }
      }
      const placed = withAutoPlacement.filter(
        (
          instance,
        ): instance is PlaygroundInstance & {
          placement: ScenePlacement
          bounds: ModelBounds
        } => instance.placement !== null && instance.bounds !== null,
      )
      if (firstPlacementConflict(placed)) {
        diagnostic = { messageId: 'diagnostic.scenePlacementConflict' }
        emit()
        return false
      }
      // Debounce timers of replaced instances must not fire afterwards; the
      // clear happens only after every rejection point so a failed import
      // leaves the current scene untouched.
      for (const timer of generationTimers.values()) clearTimeout(timer)
      generationTimers.clear()
      instances = withAutoPlacement
      sceneColors = { ...result.scene.colors }
      selectedInstanceId = instances[0]?.id ?? null
      diagnostic = null
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
            colors: instance.colors,
          })),
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
