import type { ModelColors } from '../../../cad-contract/model-colors'
import type {
  ModelId,
  ModelParameterKey,
  OpenGridParameters,
} from '../../../cad-contract/units'
import { initialCadState, type CadState } from '../../../features/cad/state'
import { getModelDefinition } from '../../../features/cad/model-catalog'
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
  canExportThreeMf: boolean
}

export type CadWorkspaceController = {
  getSnapshot: () => CadWorkspaceControllerSnapshot
  onInputChange: (key: ModelParameterKey, value: string) => void
  onSystemContextChange: (context: OpenGridSystemContext | undefined) => void
  onOpenGridParametersChange: (parameters: OpenGridParameters) => void
  onOpenGridDimensionCalculationInvalid: () => void
  onRestoreDefaults: () => void
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
): CadWorkspaceControllerSnapshot {
  const canExport =
    state.status === 'ready' && state.exportStatus === 'idle' && !state.stale
  const canExportThreeMf =
    canExport &&
    getModelDefinition(state.modelId)?.threeMfFileName?.(state.input) != null

  return {
    state,
    modelId: state.modelId,
    rawParameters,
    fieldErrors,
    progress,
    canExport,
    canExportThreeMf,
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

  const emit = () => {
    onChange(createSnapshot(state, rawParameters, fieldErrors, progress))
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

  const onRestoreDefaults = (): void => {
    const systemPreset = systemContext
      ? getSystemPreset(modelId, systemContext)
      : undefined
    const defaultParameters = cloneModelParameters(
      systemPreset ?? definition.defaultParameters,
    )
    if (modelId === 'opengrid') {
      runtime.handleOpenGridParametersChange(
        cloneOpenGridParameters(defaultParameters as OpenGridParameters),
      )
      return
    }

    for (const [key, value] of Object.entries(defaultParameters)) {
      runtime.handleInputChange(key as ModelParameterKey, String(value))
    }
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
    getSnapshot: () =>
      createSnapshot(state, rawParameters, fieldErrors, progress),
    onInputChange: runtime.handleInputChange,
    onSystemContextChange,
    onOpenGridParametersChange: runtime.handleOpenGridParametersChange,
    onOpenGridDimensionCalculationInvalid:
      runtime.handleOpenGridDimensionCalculationInvalid,
    onRestoreDefaults,
    onExport: runtime.handleExport,
    onRetry: runtime.handleRetry,
    dispose: runtime.dispose,
  }
}
