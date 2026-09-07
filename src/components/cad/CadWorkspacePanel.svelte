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
  import ComponentParameterPanel from './component-panels/index.svelte'
  import RestoreDefaultsButton from './component-panels/RestoreDefaultsButton.svelte'
  import { translate, type Locale } from '../../i18n'

  const ACTION_BUTTON_CLASS =
    'cursor-pointer rounded-lg border-0 bg-primary px-[0.8rem] py-[0.6rem] text-base text-white disabled:cursor-not-allowed disabled:bg-disabled'

  type Props = {
    locale: Locale
    state: CadState
    modelId: ModelId
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
    resetVersion: number
    onRestoreDefaults: () => void
  }

  let {
    locale,
    state,
    modelId,
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
    resetVersion,
    onRestoreDefaults,
  }: Props = $props()

  const t = (key: string, values?: Record<string, string | number | boolean>) =>
    translate(locale, key, values)

  function hasParameterControlsFor(modelId: ModelId): boolean {
    if (
      modelId === 'opengrid' ||
      modelId === 'opengrid-pillar' ||
      modelId === 'opengrid-wall-cover'
    ) {
      return true
    }
    return (getModelDefinition(modelId)?.parameterSchema.length ?? 0) > 0
  }
</script>

<div
  class="sticky top-4 self-start grid min-h-0 max-h-[calc(100dvh-16rem)] gap-4 overflow-y-auto rounded-2xl border border-border-card bg-panel p-4 max-cad:static max-cad:max-h-none max-cad:overflow-visible"
  data-testid="cad-workspace-panel"
>
  {#if hasParameterControlsFor(modelId)}
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
  <div class="flex flex-wrap gap-[0.6rem]">
    {#if import.meta.env.DEV}
      <button
        class={ACTION_BUTTON_CLASS}
        type="button"
        disabled={!canExport}
        onclick={() => onExport('step')}
      >
        {t('cad.action.step')}
      </button>
    {/if}
    {#if modelId !== 'opengrid-wall-cover'}
      <button
        class={ACTION_BUTTON_CLASS}
        type="button"
        disabled={!canExport}
        onclick={() => onExport('stl')}
      >
        {t('cad.action.stl')}
      </button>
    {/if}
    {#if modelId === 'opengrid-wall-cover'}
      <button
        class={ACTION_BUTTON_CLASS}
        type="button"
        disabled={!canExportThreeMf}
        onclick={() => onExport('3mf')}
      >
        {t('cad.action.threeMf')}
      </button>
    {/if}
    {#if state.status === 'recoverable-error' || state.status === 'fatal-worker-error'}
      <button class={ACTION_BUTTON_CLASS} type="button" onclick={onRetry}>
        {t('cad.action.retry')}
      </button>
    {/if}
  </div>
  {#if modelId === 'opengrid-wall-cover'}
    <p
      class="m-0 text-sm leading-6 text-muted-foreground"
      data-testid="opengrid-wall-cover-three-mf-note"
    >
      {t('cad.wallCover.threeMfNote')}
    </p>
  {/if}
</div>
