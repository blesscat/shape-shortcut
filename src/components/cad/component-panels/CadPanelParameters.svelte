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
  import ComponentParameterPanel from './index.svelte'
  import RestoreDefaultsButton from './RestoreDefaultsButton.svelte'

  type Props = {
    locale: Locale
    modelId: ModelId
    showParameters: boolean
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
  }

  let {
    locale,
    modelId,
    showParameters,
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
  }: Props = $props()
</script>

<div class="grid gap-4" data-testid="cad-panel-parameters">
  {#if showParameters}
    <RestoreDefaultsButton {locale} onRestore={onRestoreDefaults} />
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
