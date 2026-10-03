<script lang="ts">
  import type { CadState } from '../../features/cad/state'
  import type {
    ModelId,
    ModelParameterKey,
    ModelParameterValues,
    OpenGridParameters,
    ValidationIssue,
  } from '../../cad-contract/units'
  import type { ExportFormat } from '../../features/cad/download'
  import type { OpenGridSystemContext } from '../../features/cad/system-entry-context'
  import { getModelDefinition } from '../../features/cad/model-catalog'
  import type { RawParameters } from './workspace/types'
  import CadPanelParameters from './component-panels/CadPanelParameters.svelte'
  import CadPanelActions from './component-panels/CadPanelActions.svelte'
  import CadPanelNotes from './component-panels/CadPanelNotes.svelte'

  type Props = {
    locale: import('../../i18n').Locale
    state: CadState
    modelId: ModelId
    showParameters: boolean
    systemContext?: OpenGridSystemContext
    parameters: ModelParameterValues
    rawParameters: RawParameters
    fieldErrors: Partial<
      Record<ModelParameterKey | 'parameters', ValidationIssue>
    >
    canExport: boolean
    canExportThreeMf: boolean
    onInputChange: (key: ModelParameterKey, value: string) => void
    onSystemContextChange: (context: OpenGridSystemContext | undefined) => void
    onOpenGridParametersChange: (parameters: OpenGridParameters) => void
    onOpenGridDimensionCalculationInvalid: () => void
    onExport: (format: ExportFormat) => void
    onRetry: () => void
    onDownloadSettings?: () => void
    resetVersion: number
    onRestoreDefaults: () => void
    onApplyPreset: (presetId: string) => void
  }

  let {
    locale,
    state,
    modelId,
    showParameters,
    systemContext,
    parameters,
    rawParameters,
    fieldErrors,
    canExport,
    canExportThreeMf,
    onInputChange,
    onSystemContextChange,
    onOpenGridParametersChange,
    onOpenGridDimensionCalculationInvalid,
    onExport,
    onRetry,
    onDownloadSettings,
    resetVersion,
    onRestoreDefaults,
    onApplyPreset,
  }: Props = $props()
  const presetsFor = (id: ModelId): ReadonlyArray<ModelPreset> =>
    getModelDefinition(id)?.presets ?? []
</script>

<div
  class="sticky top-4 self-start grid min-h-0 max-h-[calc(100dvh-16rem)] gap-4 overflow-y-auto rounded-2xl border border-border-card bg-panel p-4"
  data-testid="cad-workspace-panel"
>
  <CadPanelParameters
    {locale}
    {modelId}
    {showParameters}
    presets={presetsFor(modelId)}
    {systemContext}
    {parameters}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
    {onSystemContextChange}
    {onOpenGridParametersChange}
    {onOpenGridDimensionCalculationInvalid}
    {resetVersion}
    {onRestoreDefaults}
    {onApplyPreset}
  />
</div>
