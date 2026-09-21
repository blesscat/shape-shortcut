<script lang="ts">
  import {
    OPENGRID_LABEL_HOLDER_CONFIGURATION,
    OPENGRID_LABEL_WIDTH_TIERS,
  } from '../../../../cad-contract/units'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const config = OPENGRID_LABEL_HOLDER_CONFIGURATION

  let rawWidthTier = $derived(
    rawParameters.widthTier ?? String(config.defaultParameters.widthTier),
  )
  let rawGripThickness = $derived(
    rawParameters.gripThickness ??
      String(config.defaultParameters.gripThickness),
  )

  function handleWidthTierInput(tier: number): void {
    onInputChange('widthTier', String(tier))
  }

  function handleGripThicknessInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('gripThickness', event.currentTarget.value)
  }

  function handleGripPreset(value: number): void {
    onInputChange('gripThickness', String(value))
  }
</script>

<fieldset
  class="m-0 grid gap-3 border-0 p-0"
  data-testid="opengrid-label-holder-panel"
>
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="opengrid-label-holder-details"
  >
    {translate(locale, 'panel.labelHolder.details')}
  </p>

  <div class="grid gap-1">
    <span class="text-sm text-ink">
      {translate(locale, 'parameter.widthTier')}
    </span>
    <div
      class="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={translate(locale, 'parameter.widthTier')}
      data-testid="opengrid-label-holder-width-tier"
    >
      {#each OPENGRID_LABEL_WIDTH_TIERS as tier (tier)}
        <button
          type="button"
          class="rounded-lg border px-3 py-1 text-sm"
          class:border-primary={rawWidthTier === String(tier)}
          aria-pressed={rawWidthTier === String(tier)}
          data-testid={`opengrid-label-holder-width-${tier}`}
          onclick={() => handleWidthTierInput(tier)}
        >
          {tier}
        </button>
      {/each}
    </div>
    {#if fieldErrors.widthTier}
      <span class="text-sm text-error" role="alert"
        >{formatValidationIssue(locale, fieldErrors.widthTier)}</span
      >
    {/if}
  </div>

  <ParameterField
    {locale}
    label={translate(locale, 'parameter.gripThickness')}
    changed={rawGripThickness !==
      String(config.defaultParameters.gripThickness)}
    error={fieldErrors.gripThickness}
    errorId="opengrid-label-holder-grip-error"
    restoreLabel={translate(locale, 'parameter.gripThickness')}
    onRestore={() =>
      onInputChange(
        'gripThickness',
        String(config.defaultParameters.gripThickness),
      )}
  >
    <div class="grid gap-1">
      <input
        aria-describedby="opengrid-label-holder-grip-help"
        aria-invalid={fieldErrors.gripThickness ? 'true' : undefined}
        autocomplete="off"
        class="min-w-0 rounded-lg border border-border-field bg-page px-3 py-2 text-base text-ink outline-none focus:border-primary"
        data-testid="opengrid-label-holder-grip"
        max={config.gripThicknessMax}
        min={config.gripThicknessMin}
        step={0.1}
        type="number"
        value={rawGripThickness}
        oninput={handleGripThicknessInput}
      />
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border border-border-field px-2 py-1 text-sm"
          data-testid="opengrid-label-holder-grip-preset-box"
          onclick={() => handleGripPreset(1.2)}
        >
          {translate(locale, 'panel.labelHolder.gripPresetBox')}
        </button>
        <button
          type="button"
          class="rounded-lg border border-border-field px-2 py-1 text-sm"
          data-testid="opengrid-label-holder-grip-preset-divider"
          onclick={() => handleGripPreset(2)}
        >
          {translate(locale, 'panel.labelHolder.gripPresetDivider')}
        </button>
      </div>
    </div>
  </ParameterField>
  <p
    id="opengrid-label-holder-grip-help"
    class="m-0 text-sm leading-6 text-muted-foreground"
  >
    {translate(locale, 'panel.labelHolder.gripRange', {
      min: config.gripThicknessMin,
      max: config.gripThicknessMax,
    })}
  </p>
</fieldset>
