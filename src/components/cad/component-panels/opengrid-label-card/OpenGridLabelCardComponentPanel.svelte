<script lang="ts">
  import {
    OPENGRID_LABEL_CARD_CONFIGURATION,
    OPENGRID_LABEL_CARD_STACKED_GAP,
    OPENGRID_LABEL_CARD_STACKED_SAFE_HEIGHT,
    OPENGRID_LABEL_CARD_SCREW_SIDE,
    OPENGRID_LABEL_CARD_STYLES,
    normalizeOpenGridLabelCardText,
  } from '../../../../cad-contract/units'
  import {
    OPENGRID_LABEL_GRID,
    openGridLabelWidthFor,
  } from '../../../../cad-contract/units/opengrid-label-shared'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import LabelCardArtworkControls from './LabelCardArtworkControls.svelte'
  import LabelCardScrewControls from './LabelCardScrewControls.svelte'
  import LabelCardTextControls from './LabelCardTextControls.svelte'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const config = OPENGRID_LABEL_CARD_CONFIGURATION

  let rawGridUnits = $derived(
    rawParameters.gridUnits ?? String(config.defaultParameters.gridUnits),
  )
  let rawStyle = $derived(rawParameters.style ?? config.defaultParameters.style)
  let screwMode = $derived(rawParameters.screwMode === 'true')
  let hasTwoRows = $derived(
    Boolean(
      normalizeOpenGridLabelCardText(rawParameters.text ?? '') &&
      normalizeOpenGridLabelCardText(rawParameters.textLine2 ?? ''),
    ),
  )
  let screwMaxTextHeight = $derived(
    OPENGRID_LABEL_CARD_STACKED_SAFE_HEIGHT -
      OPENGRID_LABEL_CARD_STACKED_GAP -
      OPENGRID_LABEL_CARD_SCREW_SIDE.headFrontSize,
  )
  let maxTextHeight = $derived(
    screwMode
      ? Math.max(
          config.textHeight.min,
          Math.min(config.textHeight.max, screwMaxTextHeight),
        )
      : hasTwoRows
        ? config.textHeight.twoRowMax
        : config.textHeight.max,
  )

  function handleStyleInput(style: string): void {
    onInputChange('style', style)
  }

  function handleScrewModeInput(nextScrewMode: boolean): void {
    onInputChange('screwMode', nextScrewMode ? 'true' : 'false')
    if (!nextScrewMode) return
    onInputChange('text', '')
    onInputChange('textLine2', '')
    // The real-scale composition has fixed sizes; only the designation height
    // defaults (3 mm). The stored manual icon size stays untouched so toggling
    // screw mode off restores it.
    onInputChange('textHeight', String(config.screwMode.textHeight))
  }
</script>

<fieldset
  class="m-0 grid gap-3 border-0 p-0"
  data-testid="opengrid-label-card-panel"
>
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="opengrid-label-card-details"
  >
    {translate(locale, 'panel.labelCard.details')}
  </p>

  <div class="grid gap-1">
    <label for="label-card-units" class="text-sm text-ink"
      >{translate(locale, 'parameter.gridUnits')} · {rawGridUnits}</label
    >
    <input
      id="label-card-units"
      type="range"
      min={OPENGRID_LABEL_GRID.minUnits}
      max={OPENGRID_LABEL_GRID.maxUnits}
      step="1"
      value={rawGridUnits}
      data-testid="opengrid-label-card-grid-units"
      aria-invalid={Boolean(fieldErrors.gridUnits)}
      aria-describedby={fieldErrors.gridUnits
        ? 'label-card-units-error'
        : undefined}
      class="min-w-0 w-full accent-primary"
      oninput={(event) => onInputChange('gridUnits', event.currentTarget.value)}
    />
    <p
      class="m-0 text-sm text-muted-foreground"
      data-testid="label-card-width-summary"
    >
      {translate(locale, 'panel.labelCard.unitWidth', {
        width:
          Number.isFinite(Number(rawGridUnits)) && rawGridUnits.trim()
            ? openGridLabelWidthFor(Number(rawGridUnits))
            : '—',
        max: OPENGRID_LABEL_GRID.maxUnits,
      })}
    </p>
    {#if fieldErrors.gridUnits}
      <span id="label-card-units-error" class="text-sm text-error" role="alert"
        >{formatValidationIssue(locale, fieldErrors.gridUnits)}</span
      >
    {/if}
  </div>

  <div class="grid gap-1">
    <span class="text-sm text-ink">
      {translate(locale, 'panel.labelCard.screwMode')}
    </span>
    <div
      class="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={translate(locale, 'panel.labelCard.screwMode')}
      data-testid="opengrid-label-card-screw-mode"
    >
      <button
        type="button"
        class="rounded-lg border px-3 py-1 text-sm"
        class:border-primary={!screwMode}
        aria-pressed={!screwMode}
        data-testid="opengrid-label-card-screw-mode-off"
        onclick={() => handleScrewModeInput(false)}
      >
        {translate(locale, 'panel.labelCard.screwMode.off')}
      </button>
      <button
        type="button"
        class="rounded-lg border px-3 py-1 text-sm"
        class:border-primary={screwMode}
        aria-pressed={screwMode}
        data-testid="opengrid-label-card-screw-mode-on"
        onclick={() => handleScrewModeInput(true)}
      >
        {translate(locale, 'panel.labelCard.screwMode.on')}
      </button>
    </div>
    {#if fieldErrors.screwMode}
      <span class="text-sm text-error" role="alert"
        >{formatValidationIssue(locale, fieldErrors.screwMode)}</span
      >
    {/if}
  </div>

  {#if screwMode}
    <LabelCardScrewControls
      {locale}
      {rawParameters}
      {fieldErrors}
      {onInputChange}
    />
  {:else}
    <LabelCardArtworkControls
      {locale}
      {rawParameters}
      {fieldErrors}
      {onInputChange}
    />
  {/if}

  <div class="grid gap-1">
    <span class="text-sm text-ink">
      {translate(locale, 'panel.labelCard.style')}
    </span>
    <div
      class="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={translate(locale, 'panel.labelCard.style')}
      data-testid="opengrid-label-card-style"
    >
      {#each OPENGRID_LABEL_CARD_STYLES as style (style)}
        <button
          type="button"
          class="rounded-lg border px-3 py-1 text-sm"
          class:border-primary={rawStyle === style}
          aria-pressed={rawStyle === style}
          data-testid={`opengrid-label-card-style-${style}`}
          onclick={() => handleStyleInput(style)}
        >
          {translate(locale, `panel.labelCard.style.${style}`)}
        </button>
      {/each}
    </div>
    {#if fieldErrors.style}
      <span class="text-sm text-error" role="alert"
        >{formatValidationIssue(locale, fieldErrors.style)}</span
      >
    {/if}
  </div>

  <div class="grid gap-1">
    <label for="label-card-text-height" class="text-sm text-ink"
      >{translate(locale, 'panel.labelCard.textHeight')} · {rawParameters.textHeight ??
        (screwMode ? config.screwMode.textHeight : config.textHeight.default)}
      mm</label
    >
    <input
      id="label-card-text-height"
      type="range"
      min={config.textHeight.min}
      max={maxTextHeight}
      step={config.textHeight.step}
      value={rawParameters.textHeight ??
        (screwMode ? config.screwMode.textHeight : config.textHeight.default)}
      class="min-w-0 w-full accent-primary"
      oninput={(event) =>
        onInputChange('textHeight', event.currentTarget.value)}
    />
    {#if hasTwoRows}<p class="m-0 text-sm text-muted-foreground">
        {translate(locale, 'panel.labelCard.twoRowHeight')}
      </p>{/if}
    {#if fieldErrors.textHeight}<span class="text-sm text-error" role="alert"
        >{formatValidationIssue(locale, fieldErrors.textHeight)}</span
      >{/if}
  </div>

  {#if !screwMode}
    <LabelCardTextControls
      {locale}
      {rawParameters}
      {fieldErrors}
      {onInputChange}
    />
  {/if}

  <p
    id="opengrid-label-card-text-help"
    class="m-0 text-sm leading-6 text-muted-foreground"
  >
    {translate(locale, 'panel.labelCard.font', {
      font: 'Noto Sans CJK TC Bold',
    })}
  </p>
</fieldset>
