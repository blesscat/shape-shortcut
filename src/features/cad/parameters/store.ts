import { get as getStoreValue, writable, type Subscriber } from 'svelte/store'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  legacyInnerDiameterFor,
  normalizeOpenGridLocatingSeatMode,
  normalizeOpenGridOrganizerBoxParameters,
  isOpenGridSnapParameters,
  normalizePillarParameters,
  type ModelId,
  type ModelParameterValues,
  type OpenGridLocatingSeatMode,
} from '../../../cad-contract/units'
import { normalizeOpenGridSnapParameters } from '../../../cad-contract/units'
import { getModelDefinition, modelDefinitions } from '../model-catalog'
import {
  cloneModelParameters,
  getSystemPreset,
  type OpenGridSystemContext,
} from '../system-entry-context'

export const COMPONENT_PARAMETER_STORAGE_KEY =
  'shape-shortcut.component-parameters'
export const COMPONENT_PARAMETER_STORAGE_VERSION = 2 as const
const LEGACY_COMPONENT_PARAMETER_STORAGE_VERSION = 1 as const

export type ComponentParameterStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

type ComponentParameterEntries = Partial<Record<ModelId, ModelParameterValues>>
type StorageScope = 'legacy' | OpenGridSystemContext
type ParameterBuckets = Record<StorageScope, ComponentParameterEntries>

type PersistedParameterPayload = {
  version: typeof COMPONENT_PARAMETER_STORAGE_VERSION
  values: Partial<Record<StorageScope, Record<string, unknown>>>
}

type LegacyPersistedParameterPayload = {
  version: typeof LEGACY_COMPONENT_PARAMETER_STORAGE_VERSION
  values: Record<string, unknown>
}

export type ComponentParameterStore = {
  subscribe: (subscriber: Subscriber<ComponentParameterEntries>) => () => void
  get: (modelId: ModelId) => ModelParameterValues
  set: (modelId: ModelId, parameters: ModelParameterValues) => boolean
  getSystemContext: () => OpenGridSystemContext | undefined
  setSystemContext: (context: OpenGridSystemContext | undefined) => void
  dispose: () => void
}

export type CreateComponentParameterStoreOptions = {
  storage?: ComponentParameterStorage | null
  systemContext?: OpenGridSystemContext
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function canonicalCylinderSeatModeFor(
  value: Record<string, unknown>,
): OpenGridLocatingSeatMode {
  if (Object.prototype.hasOwnProperty.call(value, 'bottomSeatMode')) {
    return (
      normalizeOpenGridLocatingSeatMode(value.bottomSeatMode) ??
      OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS.bottomSeatMode
    )
  }
  if (value.bottomHolesEnabled === false) return 'none'
  return 'detachable-corner-seat'
}

function canonicalBoxSeatModeFor(
  value: Record<string, unknown>,
): OpenGridLocatingSeatMode {
  if (Object.prototype.hasOwnProperty.call(value, 'cornerSeatMode')) {
    return (
      normalizeOpenGridLocatingSeatMode(value.cornerSeatMode) ??
      OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS.cornerSeatMode
    )
  }
  if (value.cornerBottomHoles === false) return 'none'
  return 'detachable-corner-seat'
}

function normalizeLegacyParameters(modelId: ModelId, value: unknown): unknown {
  if (modelId === 'opengrid-pillar') {
    return normalizePillarParameters(value)
  }
  if (modelId === 'opengrid-snap') {
    return normalizeOpenGridSnapParameters(value)
  }
  if (modelId === 'opengrid-organizer-box') {
    return normalizeOpenGridOrganizerBoxParameters(value)
  }
  if (modelId === 'opengrid-stackable-cylinder' && isRecord(value)) {
    const withoutLegacy: Record<string, unknown> = { ...value }
    delete withoutLegacy.bottomHolesEnabled
    delete withoutLegacy.thinBottomMode
    if (
      !Object.prototype.hasOwnProperty.call(withoutLegacy, 'innerDiameter') &&
      Object.prototype.hasOwnProperty.call(withoutLegacy, 'diameter')
    ) {
      const legacyInnerDiameter = legacyInnerDiameterFor(withoutLegacy)
      delete withoutLegacy.diameter
      if (legacyInnerDiameter !== undefined) {
        withoutLegacy.innerDiameter = legacyInnerDiameter
      }
    }
    return {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      ...withoutLegacy,
      bottomPlateMode: Object.prototype.hasOwnProperty.call(
        value,
        'bottomPlateMode',
      )
        ? value.bottomPlateMode
        : false,
      bottomSeatMode: canonicalCylinderSeatModeFor(value),
      honeycombMode: Object.prototype.hasOwnProperty.call(
        value,
        'honeycombMode',
      )
        ? value.honeycombMode
        : false,
    }
  }
  if (modelId === 'opengrid-divider' && isRecord(value)) {
    if (Object.prototype.hasOwnProperty.call(value, 'wallThickness')) {
      return value
    }
    return {
      ...value,
      wallThickness:
        OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.wallThickness,
    }
  }
  if (modelId === 'opengrid-openconnect-shelf' && isRecord(value)) {
    if (Object.prototype.hasOwnProperty.call(value, 'connectorRows')) {
      return value
    }
    return {
      ...value,
      connectorRows:
        OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS.connectorRows,
    }
  }

  if (modelId !== 'opengrid-stackable-box' || !isRecord(value)) {
    return value
  }

  const withoutLegacy = { ...value }
  delete withoutLegacy.cornerBottomHoles
  const hasFullBottomHoleGrid = Object.prototype.hasOwnProperty.call(
    value,
    'fullBottomHoleGrid',
  )
  const hasBasePlateMode = Object.prototype.hasOwnProperty.call(
    value,
    'basePlateMode',
  )
  const hasThinShellMode = Object.prototype.hasOwnProperty.call(
    value,
    'thinShellMode',
  )
  const hasHoneycombMode = Object.prototype.hasOwnProperty.call(
    value,
    'honeycombMode',
  )
  const normalized: Record<string, unknown> = {
    ...withoutLegacy,
    cornerSeatMode: canonicalBoxSeatModeFor(value),
    fullBottomHoleGrid: hasFullBottomHoleGrid
      ? value.fullBottomHoleGrid
      : false,
    basePlateMode: hasBasePlateMode ? value.basePlateMode : false,
    thinShellMode: hasThinShellMode ? value.thinShellMode : false,
    honeycombMode: hasHoneycombMode ? value.honeycombMode : false,
  }
  for (const key of OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS) {
    if (Object.prototype.hasOwnProperty.call(value, key)) continue
    normalized[key] = OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS[key]
  }
  return normalized
}

function getDefinition(modelId: ModelId) {
  const definition = getModelDefinition(modelId)
  if (!definition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
  return definition
}

function normalizeLegacyHalfCellParameters(
  modelId: ModelId,
  candidate: unknown,
): unknown {
  if (!isRecord(candidate)) return candidate
  if (modelId !== 'opengrid') return candidate
  const normalized = { ...candidate }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'halfCellX')) {
    normalized.halfCellX = 'none'
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'halfCellY')) {
    normalized.halfCellY = 'none'
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'targetWidth')) {
    normalized.targetWidth = 0
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'targetDepth')) {
    normalized.targetDepth = 0
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'fitToTarget')) {
    normalized.fitToTarget = false
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'targetFrameShape')) {
    normalized.targetFrameShape = 'none'
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'targetFrameSides')) {
    normalized.targetFrameSides = {
      top: true,
      right: true,
      bottom: true,
      left: true,
    }
  }
  return normalized
}

function getBrowserStorage(): ComponentParameterStorage | null {
  try {
    if (typeof globalThis === 'undefined' || !globalThis.localStorage) {
      return null
    }
    return globalThis.localStorage
  } catch {
    return null
  }
}

function readPayload(storage: ComponentParameterStorage | null): unknown {
  if (!storage) return null

  try {
    const raw = storage.getItem(COMPONENT_PARAMETER_STORAGE_KEY)
    if (raw === null) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function emptyBuckets(): ParameterBuckets {
  return { legacy: {}, desk: {}, wall: {} }
}

function validatedEntries(
  candidates: Record<string, unknown> | undefined,
): ComponentParameterEntries {
  if (!candidates) return {}
  const entries: ComponentParameterEntries = {}
  for (const definition of modelDefinitions) {
    const candidate = candidates[definition.id]
    if (candidate === undefined) continue
    const normalizedCandidate = normalizeLegacyHalfCellParameters(
      definition.id,
      normalizeLegacyParameters(definition.id, candidate),
    )

    try {
      const validation = definition.validateParameters(normalizedCandidate)
      if (!validation.valid) continue
      entries[definition.id] = cloneModelParameters(validation.value.parameters)
    } catch {
      continue
    }
  }
  return entries
}

function normalizeSystemScopedEntries(
  scope: StorageScope,
  entries: ComponentParameterEntries,
): ComponentParameterEntries {
  const snap = entries['opengrid-snap']
  if (!snap || !isOpenGridSnapParameters(snap)) return entries
  if (scope === 'desk') {
    return {
      ...entries,
      'opengrid-snap': {
        ...snap,
        openConnect: false,
      },
    }
  }
  if (scope !== 'wall') return entries
  return {
    ...entries,
    'opengrid-snap': {
      ...snap,
      footprint: 'full',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
    },
  }
}

function parametersForSystemScope(
  scope: OpenGridSystemContext | undefined,
  modelId: ModelId,
  parameters: ModelParameterValues,
): ModelParameterValues {
  if (!scope || modelId !== 'opengrid-snap') return parameters
  return (
    normalizeSystemScopedEntries(scope, { [modelId]: parameters })[modelId] ??
    parameters
  )
}

function hydrateBuckets(
  storage: ComponentParameterStorage | null,
): ParameterBuckets {
  const payload = readPayload(storage)
  if (!isRecord(payload) || !isRecord(payload.values)) return emptyBuckets()

  if (payload.version === LEGACY_COMPONENT_PARAMETER_STORAGE_VERSION) {
    return {
      ...emptyBuckets(),
      legacy: validatedEntries(payload.values),
    }
  }

  if (payload.version !== COMPONENT_PARAMETER_STORAGE_VERSION) {
    return emptyBuckets()
  }

  const values = payload.values as Partial<
    Record<StorageScope, Record<string, unknown>>
  >
  const deskEntries = normalizeSystemScopedEntries(
    'desk',
    validatedEntries(values.desk),
  )
  const wallEntries = normalizeSystemScopedEntries(
    'wall',
    validatedEntries(values.wall),
  )
  return {
    legacy: validatedEntries(values.legacy),
    desk: deskEntries,
    wall: wallEntries,
  }
}

function serializeEntries(
  entries: ComponentParameterEntries,
): Record<string, ModelParameterValues> {
  const values: Record<string, ModelParameterValues> = {}

  for (const definition of modelDefinitions) {
    const parameters = entries[definition.id]
    if (!parameters) continue

    try {
      const validation = definition.validateParameters(parameters)
      if (!validation.valid) continue
      values[definition.id] = cloneModelParameters(validation.value.parameters)
    } catch {
      continue
    }
  }

  return values
}

function serializeBuckets(buckets: ParameterBuckets): string {
  const values: Partial<
    Record<StorageScope, Record<string, ModelParameterValues>>
  > = {}
  for (const scope of ['legacy', 'desk', 'wall'] as const) {
    const entries = serializeEntries(buckets[scope])
    if (Object.keys(entries).length > 0) values[scope] = entries
  }

  const payload: PersistedParameterPayload = {
    version: COMPONENT_PARAMETER_STORAGE_VERSION,
    values,
  }
  return JSON.stringify(payload)
}

function scopeKey(context: OpenGridSystemContext | undefined): StorageScope {
  return context ?? 'legacy'
}

function persistEntries(
  storage: ComponentParameterStorage | null,
  entries: ComponentParameterEntries,
  context: OpenGridSystemContext | undefined,
): void {
  if (!storage) return

  try {
    const buckets = hydrateBuckets(storage)
    buckets[scopeKey(context)] = entries
    storage.setItem(COMPONENT_PARAMETER_STORAGE_KEY, serializeBuckets(buckets))
  } catch {
    // Browser storage is optional; the in-memory store remains authoritative.
  }
}

export function createComponentParameterStore(
  options: CreateComponentParameterStoreOptions = {},
): ComponentParameterStore {
  const storage =
    options.storage === undefined ? getBrowserStorage() : options.storage
  let activeContext = options.systemContext
  const buckets = hydrateBuckets(storage)
  const state = writable<ComponentParameterEntries>(
    buckets[scopeKey(activeContext)],
  )
  let skipInitialPersistence = true
  let disposed = false

  const unsubscribe = state.subscribe((entries) => {
    if (skipInitialPersistence) {
      skipInitialPersistence = false
      return
    }
    buckets[scopeKey(activeContext)] = entries
    persistEntries(storage, entries, activeContext)
  })

  const get = (modelId: ModelId): ModelParameterValues => {
    const definition = getDefinition(modelId)
    const parameters = getStoreValue(state)[modelId]
    if (parameters) return cloneModelParameters(parameters)

    const systemPreset = activeContext
      ? getSystemPreset(modelId, activeContext)
      : undefined
    return cloneModelParameters(systemPreset ?? definition.defaultParameters)
  }

  const set = (modelId: ModelId, parameters: ModelParameterValues): boolean => {
    const definition = getDefinition(modelId)
    const validation = definition.validateParameters(parameters)
    if (!validation.valid) return false

    const scopedParameters = parametersForSystemScope(
      activeContext,
      modelId,
      validation.value.parameters,
    )
    state.update((entries) => ({
      ...entries,
      [modelId]: cloneModelParameters(scopedParameters),
    }))
    return true
  }

  const getSystemContext = (): OpenGridSystemContext | undefined =>
    activeContext

  const setSystemContext = (
    nextContext: OpenGridSystemContext | undefined,
  ): void => {
    if (activeContext === nextContext) return
    activeContext = nextContext
    skipInitialPersistence = true
    state.set(buckets[scopeKey(activeContext)])
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    unsubscribe()
  }

  return {
    subscribe: state.subscribe,
    get,
    set,
    getSystemContext,
    setSystemContext,
    dispose,
  }
}
