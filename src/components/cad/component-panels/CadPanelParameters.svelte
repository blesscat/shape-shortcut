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
  import { translate } from '../../../i18n'
  import type { ModelPreset } from '../../../features/cad/model-catalog'
  import ComponentParameterPanel from './index.svelte'
  import PresetButtonRow from './PresetButtonRow.svelte'

  type Props = {
    locale: Locale
    modelId: ModelId
    showParameters: boolean
    presets: ReadonlyArray<ModelPreset>
    /** Shown when a preset was not applied because it does not fit. */
    presetNoticeKey?: string | null
    systemContext?: OpenGridSystemContext
    parameters: ModelParameterValues
    rawParameters: RawParameters
    fieldErrors: Partial<
      Record<ModelParameterKey | 'parameters', ValidationIssue>
    >
    onInputChange: (key: ModelParameterKey, value: string) => void
    onInputsChange: (values: Partial<Record<ModelParameterKey, string>>) => void
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
    presetNoticeKey = null,
    systemContext,
    parameters,
    rawParameters,
    fieldErrors,
    onInputChange,
    onInputsChange,
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
    {#key resetVersion}
      <ComponentParameterPanel
        {locale}
        {modelId}
        {systemContext}
        {parameters}
        {rawParameters}
        {fieldErrors}
        {onInputChange}
        {onInputsChange}
        {onSystemContextChange}
        {onOpenGridParametersChange}
        {onOpenGridDimensionCalculationInvalid}
      />
    {/key}
    <PresetButtonRow
      {locale}
      {presets}
      onRestore={onRestoreDefaults}
      {onApplyPreset}
    />
    {#if presetNoticeKey}
      <p
        class="m-0 text-sm text-error"
        role="alert"
        data-testid="cad-preset-notice"
      >
        {translate(locale, presetNoticeKey)}
      </p>
    {/if}
  {/if}
</div>
