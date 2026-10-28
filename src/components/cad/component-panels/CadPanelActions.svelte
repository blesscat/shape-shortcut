<script lang="ts">
  import type { CadState } from '../../../features/cad/state'
  import type { ExportFormat } from '../../../features/cad/download'
  import type { ModelId } from '../../../cad-contract/units'
  import { STL_UNSUPPORTED_MODEL_IDS } from '../../../features/cad/model-catalog/export-formats'
  import { translate, type Locale } from '../../../i18n'

  const ACTION_BUTTON_CLASS =
    'cursor-pointer rounded-lg border-0 bg-primary px-[0.8rem] py-[0.6rem] text-base text-primary-foreground disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground'

  type Props = {
    compact?: boolean
    detailsOnly?: boolean
    locale: Locale
    state: CadState
    modelId: ModelId
    canExport: boolean
    supportsThreeMf: boolean
    canExportThreeMf: boolean
    downloadHintKey?: string | null
    onExport: (format: ExportFormat) => void
    onRetry: () => void
    onDownloadSettings?: () => void
  }

  let {
    compact = false,
    detailsOnly = false,
    locale,
    state,
    modelId,
    canExport,
    supportsThreeMf,
    canExportThreeMf,
    downloadHintKey = null,
    onExport,
    onRetry,
    onDownloadSettings,
  }: Props = $props()

  const t = (key: string, values?: Record<string, string | number | boolean>) =>
    translate(locale, key, values)
</script>

<div class="grid min-w-0 gap-2" data-testid="cad-panel-actions">
  {#if !compact}
    <p
      class="m-0 text-sm text-muted-foreground"
      role="status"
      data-testid="cad-current-status"
    >
      {t(`cad.presentation.status.${state.status}`)}
    </p>
  {/if}
  {#if !detailsOnly}
    {#if downloadHintKey}
      <p
        class="m-0 text-sm text-muted-foreground"
        role="status"
        data-testid="cad-download-hint"
      >
        {t(downloadHintKey)}
      </p>
    {/if}
    <div class="flex flex-wrap gap-2">
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
      {#if !STL_UNSUPPORTED_MODEL_IDS[modelId]}
        <button
          class={ACTION_BUTTON_CLASS}
          type="button"
          disabled={!canExport}
          onclick={() => onExport('stl')}
        >
          {t('cad.action.stl')}
        </button>
      {/if}
      {#if supportsThreeMf}
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
      {#if onDownloadSettings}
        <button
          class={ACTION_BUTTON_CLASS}
          type="button"
          data-testid="cad-download-settings"
          disabled={state.status !== 'ready' && state.status !== 'generating'}
          onclick={onDownloadSettings}
        >
          {t('workspace.downloadSettings')}
        </button>
      {/if}
    </div>
  {/if}
  {#if !compact}
    <details class="max-w-xs text-sm text-muted-foreground">
      <summary
        class="flex min-h-11 cursor-pointer items-center py-1 focus-visible:outline-3 focus-visible:outline-focus"
        >{t('cad.presentation.formats')}</summary
      >
      <div class="grid gap-2 pt-2">
        {#if !STL_UNSUPPORTED_MODEL_IDS[modelId]}<p class="m-0">
            {t('cad.presentation.stlHelp')}
          </p>{/if}
        {#if supportsThreeMf}<p class="m-0">
            {t('cad.presentation.threeMfHelp')}
          </p>{/if}
        {#if onDownloadSettings}<p class="m-0">
            {t('cad.presentation.settingsHelp')}
          </p>{/if}
      </div>
    </details>
  {/if}
</div>
