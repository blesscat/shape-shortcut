<script lang="ts">
  import {
    OPENGRID_LABEL_CARD_CONFIGURATION,
    OPENGRID_LABEL_CARD_ICON_IDS,
    OPENGRID_LABEL_CARD_LAYOUTS,
  } from '../../../../cad-contract/units'
  import { LABEL_CARD_ICON_PATHS } from '../../../../cad-kernel/components/opengrid-label-card/icon-paths'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import { alignments } from './alignments'
  import LabelCardIconGlyph from './LabelCardIconGlyph.svelte'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const config = OPENGRID_LABEL_CARD_CONFIGURATION

  let rawIcon = $derived(rawParameters.icon ?? config.defaultParameters.icon)
  let rawLayout = $derived(
    rawParameters.layout ?? config.defaultParameters.layout,
  )
  let rawGroupAlign = $derived(
    rawParameters.groupAlign ?? config.defaultParameters.groupAlign,
  )
  let rawIconSize = $derived(
    rawParameters.iconSize ?? String(config.defaultParameters.iconSize),
  )

  function handleIconInput(icon: string): void {
    onInputChange('icon', icon)
  }

  function handleLayoutInput(nextLayout: string): void {
    onInputChange('layout', nextLayout)
    if (nextLayout === 'stacked') {
      // Stacked layout only supports a single text row.
      onInputChange('textLine2', '')
    }
  }
</script>

<div class="grid gap-1">
  <span class="text-sm text-ink">
    {translate(locale, 'panel.labelCard.layout')}
  </span>
  <div
    class="flex flex-wrap gap-2"
    role="radiogroup"
    aria-label={translate(locale, 'panel.labelCard.layout')}
    data-testid="opengrid-label-card-layout"
  >
    {#each OPENGRID_LABEL_CARD_LAYOUTS as layoutOption (layoutOption)}
      <button
        type="button"
        class="rounded-lg border px-3 py-1 text-sm"
        class:border-primary={rawLayout === layoutOption}
        aria-pressed={rawLayout === layoutOption}
        data-testid={`opengrid-label-card-layout-${layoutOption}`}
        onclick={() => handleLayoutInput(layoutOption)}
      >
        {translate(locale, `panel.labelCard.layout.${layoutOption}`)}
      </button>
    {/each}
  </div>
  {#if fieldErrors.layout}
    <span class="text-sm text-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.layout)}</span
    >
  {/if}
</div>

{#if rawLayout === 'inline'}
  <div class="grid gap-1">
    <span class="text-sm text-ink">
      {translate(locale, 'panel.labelCard.groupAlign')}
    </span>
    <div
      class="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={translate(locale, 'panel.labelCard.groupAlign')}
      data-testid="opengrid-label-card-group-align"
    >
      {#each alignments as align (align)}
        <button
          type="button"
          class="rounded-lg border px-3 py-1 text-sm"
          class:border-primary={rawGroupAlign === align}
          aria-pressed={rawGroupAlign === align}
          data-testid={`opengrid-label-card-group-align-${align}`}
          onclick={() => onInputChange('groupAlign', align)}
        >
          {translate(locale, `panel.labelCard.groupAlign.${align}`)}
        </button>
      {/each}
    </div>
  </div>
{/if}

<div class="grid gap-1">
  <label for="label-card-icon-size" class="text-sm text-ink"
    >{translate(locale, 'panel.labelCard.iconSize')} · {rawIconSize}
    mm</label
  >
  <input
    id="label-card-icon-size"
    type="range"
    min={config.iconSize.min}
    max={config.iconSize.max}
    step={config.iconSize.step}
    value={rawIconSize}
    data-testid="opengrid-label-card-icon-size"
    aria-invalid={Boolean(fieldErrors.iconSize)}
    aria-describedby={fieldErrors.iconSize
      ? 'label-card-icon-size-error'
      : undefined}
    class="min-w-0 w-full accent-primary"
    oninput={(event) => onInputChange('iconSize', event.currentTarget.value)}
  />
  {#if fieldErrors.iconSize}
    <span
      id="label-card-icon-size-error"
      class="text-sm text-error"
      role="alert">{formatValidationIssue(locale, fieldErrors.iconSize)}</span
    >
  {/if}
</div>

<div class="grid gap-1">
  <label for="label-card-icon-position"
    >{translate(locale, 'panel.labelCard.iconPosition')}</label
  >
  <select
    id="label-card-icon-position"
    disabled={rawIcon === 'none'}
    class="rounded-lg border border-border-field bg-panel px-3 py-2"
    value={rawParameters.iconPosition ?? 'left'}
    onchange={(event) =>
      onInputChange('iconPosition', event.currentTarget.value)}
  >
    <option value="left"
      >{translate(locale, 'panel.labelCard.iconPosition.left')}</option
    >
    <option value="right"
      >{translate(locale, 'panel.labelCard.iconPosition.right')}</option
    >
  </select>
</div>

<div class="grid gap-1">
  <span class="text-sm text-ink">
    {translate(locale, 'panel.labelCard.icon')}
  </span>
  <div
    class="grid grid-cols-4 gap-2 sm:grid-cols-5"
    role="radiogroup"
    aria-label={translate(locale, 'panel.labelCard.icon')}
    data-testid="opengrid-label-card-icon-gallery"
  >
    {#each OPENGRID_LABEL_CARD_ICON_IDS as iconId (iconId)}
      {@const iconPath = LABEL_CARD_ICON_PATHS[iconId]}
      <LabelCardIconGlyph
        {iconPath}
        selected={rawIcon === iconId}
        testid={`opengrid-label-card-icon-${iconId}`}
        text={translate(locale, `panel.labelCard.icon.${iconId}`)}
        ariaLabel={translate(locale, `panel.labelCard.icon.${iconId}`)}
        onclick={() => handleIconInput(iconId)}
      />
    {/each}
  </div>
  {#if fieldErrors.icon}
    <span class="text-sm text-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.icon)}</span
    >
  {/if}
</div>
