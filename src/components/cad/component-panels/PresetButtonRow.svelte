<script lang="ts">
  import type { ModelPreset } from '../../../features/cad/model-catalog'
  import RestoreDefaultsButton from './RestoreDefaultsButton.svelte'
  import { translate, type Locale } from '../../../i18n'

  type Props = {
    locale: Locale
    presets: ReadonlyArray<ModelPreset>
    onRestore: () => void
    onApplyPreset: (presetId: string) => void
  }

  let { locale, presets, onRestore, onApplyPreset }: Props = $props()
</script>

<div class="flex w-full flex-wrap gap-2">
  <RestoreDefaultsButton {locale} onRestore={onRestore} />
  {#each presets as preset (preset.id)}
    <button
      class="min-w-0 flex-1 basis-24 cursor-pointer rounded-lg border border-border-field bg-panel px-3 py-2 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      type="button"
      aria-label={translate(locale, preset.labelKey)}
      data-testid={`cad-preset-${preset.id}`}
      onclick={() => onApplyPreset(preset.id)}
    >
      {translate(locale, preset.labelKey)}
    </button>
  {/each}
</div>
