<script lang="ts">
  import type { CadState } from '../../../features/cad/state'
  import type { ExportFormat } from '../../../features/cad/download'
  import type { ModelId } from '../../../cad-contract/units'
  import { STL_UNSUPPORTED_MODEL_IDS } from '../../../features/cad/model-catalog/export-formats'
  import { translate, type Locale } from '../../../i18n'

  const ACTION_BUTTON_CLASS =
    'cursor-pointer rounded-lg border-0 bg-primary px-[0.8rem] py-[0.6rem] text-base text-white disabled:cursor-not-allowed disabled:bg-disabled'

  type Props = {
    locale: Locale
    state: CadState
    modelId: ModelId
    canExport: boolean
    supportsThreeMf: boolean
    canExportThreeMf: boolean
    onExport: (format: ExportFormat) => void
    onRetry: () => void
    onDownloadSettings?: () => void
  }

  let {
    locale,
    state,
    modelId,
    canExport,
    supportsThreeMf,
    canExportThreeMf,
    onExport,
    onRetry,
    onDownloadSettings,
  }: Props = $props()

  const t = (key: string, values?: Record<string, string | number | boolean>) =>
    translate(locale, key, values)
</script>

<div class="flex flex-wrap gap-[0.6rem]" data-testid="cad-panel-actions">
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
