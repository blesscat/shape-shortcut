<script lang="ts">
  import type {
    ModelId,
    ModelParameterKey,
    ModelParameterValues,
    OpenGridParameters,
    ValidationIssue,
  } from '../../../cad-contract/units'
  import type { OpenGridSystemContext } from '../../../features/cad/system-entry-context'
  import type { RawParameters } from '../workspace/types'
  import type { Locale } from '../../../i18n'
  import type { ModelPreset } from '../../../features/cad/model-catalog'
  import ComponentParameterPanel from './index.svelte'
  import PresetButtonRow from './PresetButtonRow.svelte'

  type Props = {
    locale: Locale
    modelId: ModelId
    showParameters: boolean
    presets: ReadonlyArray<ModelPreset>
    systemContext?: OpenGridSystemContext
    parameters: ModelParameterValues
    rawParameters: RawParameters
    fieldErrors: Partial<
      Record<ModelParameterKey | 'parameters', ValidationIssue>
    >
    onInputChange: (key: ModelParameterKey, value: string) => void
    onSystemContextChange: (context: OpenGridSystemContext | undefined) => void
    onOpenGridParametersChange: (parameters: OpenGridParameters) => void
    onOpenGridDimensionCalculationInvalid: () => void
    resetVersion: number
    onRestoreDefaults: () => void
    onApplyPreset: (presetId: string) => void
  }

  let {
    locale,
    modelId,
    showParameters,
    presets,
    systemContext,
    parameters,
    rawParameters,
    fieldErrors,
    onInputChange,
    onSystemContextChange,
    onOpenGridParametersChange,
    onOpenGridDimensionCalculationInvalid,
    resetVersion,
    onRestoreDefaults,
    onApplyPreset,
  }: Props = $props()
</script>

<div class="grid gap-4" data-testid="cad-panel-parameters">
  {#if showParameters}
    <PresetButtonRow
      {locale}
      {presets}
      onRestore={onRestoreDefaults}
      {onApplyPreset}
    />
    {#key resetVersion}
      <ComponentParameterPanel
        {locale}
        {modelId}
        {systemContext}
        {parameters}
        {rawParameters}
        {fieldErrors}
        {onInputChange}
        {onSystemContextChange}
        {onOpenGridParametersChange}
        {onOpenGridDimensionCalculationInvalid}
      />
    {/key}
  {/if}
</div>
