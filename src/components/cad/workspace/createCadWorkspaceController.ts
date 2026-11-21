import type { ModelColors } from '../../../cad-contract/model-colors'
import type {
  ModelId,
  ModelParameterKey,
  ModelParameterValues,
  OpenGridParameters,
} from '../../../cad-contract/units'
import { initialCadState, type CadState } from '../../../features/cad/state'
import { getModelDefinition } from '../../../features/cad/model-catalog'
import {
  findModelPreset,
  presetNoticeKeyFor,
  resolvePresetParameters,
} from '../../../features/cad/model-catalog/presets'
import {
  cloneModelParameters,
  getSystemPreset,
  type OpenGridSystemContext,
} from '../../../features/cad/system-entry-context'
import type { ComponentParameterStore } from '../../../features/cad/parameters'
import type { CadProgress } from '../../../features/cad/progress'
import type { ExportFormat } from '../../../features/cad/download'
import {
  createCadWorkerRuntime,
  type CadWorkerRuntime,
} from './createCadWorkerRuntime'
import { rawFromParameters } from './validation'
import type { FieldErrors } from './runtime/types'
import type { RawParameters } from './types'

export type CadWorkspaceControllerSnapshot = {
  state: CadState
  modelId: ModelId
  rawParameters: RawParameters
  fieldErrors: FieldErrors
  progress: CadProgress | null
  canExport: boolean
  supportsThreeMf: boolean
  canExportThreeMf: boolean
  /** Present when downloads are disabled with a hint (definition-provided). */
  downloadHintKey: string | null
  /**
   * Present when a preset was not applied because it does not fit the
   * parameters the user has now.
   */
  presetNoticeKey: string | null
}

export type CadWorkspaceController = {
  getSnapshot: () => CadWorkspaceControllerSnapshot
  onInputChange: (key: ModelParameterKey, value: string) => void
  /** Applies several raw values as one snapshot. */
  onInputsChange: (values: Partial<Record<ModelParameterKey, string>>) => void
  onSystemContextChange: (context: OpenGridSystemContext | undefined) => void
  onOpenGridParametersChange: (parameters: OpenGridParameters) => void
  onOpenGridDimensionCalculationInvalid: () => void
  onRestoreDefaults: () => void
  onApplyPreset: (presetId: string) => void
  onExport: (format?: ExportFormat, colors?: ModelColors) => void
  onRetry: () => void
  dispose: () => void
}

export type CadWorkspaceControllerOptions = {
  parameterStore: ComponentParameterStore
  systemContext?: OpenGridSystemContext
}

function cloneOpenGridParameters(
  parameters: OpenGridParameters,
): OpenGridParameters {
  return {
    ...parameters,
    chamferCorners: { ...parameters.chamferCorners },
    connectorSides: { ...parameters.connectorSides },
    targetFrameSides: { ...parameters.targetFrameSides },
  }
}

function createSnapshot(
  state: CadState,
  rawParameters: RawParameters,
  fieldErrors: FieldErrors,
  progress: CadProgress | null,
  presetNoticeKey: string | null,
): CadWorkspaceControllerSnapshot {
  const downloadHintKey =
    getModelDefinition(state.modelId)?.exportBlockedHintKey?.(state.input) ??
    null
  const canExport =
    state.status === 'ready' &&
    state.exportStatus === 'idle' &&
    !state.stale &&
    downloadHintKey === null
  const supportsThreeMf =
    getModelDefinition(state.modelId)?.threeMfFileName?.(state.input) != null

  return {
    state,
    modelId: state.modelId,
    rawParameters,
    fieldErrors,
    progress,
    canExport,
    supportsThreeMf,
    canExportThreeMf: canExport && supportsThreeMf,
    downloadHintKey,
    presetNoticeKey,
  }
}

export function createCadWorkspaceController(
  modelId: ModelId,
  onChange: (snapshot: CadWorkspaceControllerSnapshot) => void,
  options: CadWorkspaceControllerOptions,
): CadWorkspaceController {
  const definition = getModelDefinition(modelId)
  if (!definition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
  let systemContext = options.systemContext

  const initialParameters = options.parameterStore.get(modelId)
  let state = initialCadState(modelId, initialParameters)
  let rawParameters = rawFromParameters(initialParameters)
  let fieldErrors: FieldErrors = {}
  let progress: CadProgress | null = null
  let presetNoticeKey: string | null = null

  const snapshot = (): CadWorkspaceControllerSnapshot =>
    createSnapshot(state, rawParameters, fieldErrors, progress, presetNoticeKey)

  const emit = () => {
    onChange(snapshot())
  }

  const runtime: CadWorkerRuntime = createCadWorkerRuntime({
    initialState: state,
    initialRawParameters: rawParameters,
    setState: (nextState) => {
      state = nextState
      emit()
    },
    setRawParameters: (nextParameters) => {
      rawParameters = nextParameters
      emit()
    },
    setPersistedParameters: (selectedModelId, parameters) => {
      options.parameterStore.set(selectedModelId, parameters)
    },
    setFieldErrors: (nextErrors) => {
      fieldErrors = nextErrors
      emit()
    },
    setProgress: (nextProgress) => {
      progress = nextProgress
      emit()
    },
  })

  /**
   * Drops the notice of an unapplied preset: the user changed the
   * parameters, so the old notice no longer describes the current state.
   */
  const clearPresetNotice = (): void => {
    if (presetNoticeKey === null) return
    presetNoticeKey = null
    emit()
  }

  const applyParameters = (parameters: ModelParameterValues): void => {
    // Restoring the defaults and an applied preset write the parameters
    // through here, so a notice from an unapplied preset never outlives the
    // parameters it described.
    clearPresetNotice()
    if (modelId === 'opengrid') {
      runtime.handleOpenGridParametersChange(
        cloneOpenGridParameters(parameters as OpenGridParameters),
      )
      return
    }

    for (const [key, value] of Object.entries(parameters)) {
      runtime.handleInputChange(key as ModelParameterKey, String(value))
    }
  }

  const onRestoreDefaults = (): void => {
    const systemPreset = systemContext
      ? getSystemPreset(modelId, systemContext)
      : undefined
    applyParameters(
      cloneModelParameters(systemPreset ?? definition.defaultParameters),
    )
  }

  const onApplyPreset = (presetId: string): void => {
    const preset = findModelPreset(definition, presetId)
    if (!preset) {
      if (import.meta.env.DEV) {
        console.error(`UNKNOWN_MODEL_PRESET:${modelId}:${presetId}`)
      }
      return
    }
    // The current parameters are the base of the preset, so a preset that
    // changes only the card size keeps everything else the user has set.
    const resolved = resolvePresetParameters(definition, preset, state.input)
    if (!resolved.ok) {
      const noticeKey = presetNoticeKeyFor(definition)
      if (noticeKey) {
        // The preset does not fit the current parameters: they are kept and
        // the user is told why the preset was not applied.
        presetNoticeKey = noticeKey
        emit()
        return
      }
      if (import.meta.env.DEV) {
        console.error(`MODEL_PRESET_INVALID:${modelId}:${presetId}`)
      }
      return
    }
    applyParameters(resolved.parameters)
  }

  const handleInputChange = (key: ModelParameterKey, value: string): void => {
    clearPresetNotice()
    runtime.handleInputChange(key, value)
  }

  const handleInputsChange = (
    values: Partial<Record<ModelParameterKey, string>>,
  ): void => {
    clearPresetNotice()
    runtime.handleInputsChange(values)
  }

  const onSystemContextChange = (
    nextContext: OpenGridSystemContext | undefined,
  ): void => {
    if (systemContext === nextContext) return
    systemContext = nextContext
    options.parameterStore.setSystemContext(nextContext)
    runtime.handleParametersScopeChange(
      cloneModelParameters(options.parameterStore.get(modelId)),
    )
  }

  emit()

  return {
    getSnapshot: snapshot,
    onInputChange: handleInputChange,
    onInputsChange: handleInputsChange,
    onSystemContextChange,
    onOpenGridParametersChange: runtime.handleOpenGridParametersChange,
    onOpenGridDimensionCalculationInvalid:
      runtime.handleOpenGridDimensionCalculationInvalid,
    onRestoreDefaults,
    onApplyPreset,
    onExport: runtime.handleExport,
    onRetry: runtime.handleRetry,
    dispose: runtime.dispose,
  }
}
