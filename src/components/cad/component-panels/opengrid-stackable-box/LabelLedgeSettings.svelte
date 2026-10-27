<script lang="ts">
  import {
    openGridStackableBoxLabelMaxUnitsFor,
    OPENGRID_STACKABLE_BOX_CONFIGURATION,
  } from '../../../../cad-contract/units'
  import {
    OPENGRID_LABEL_LEDGE,
    type OpenGridLabelSnapFit,
  } from '../../../../cad-contract/units/opengrid-label-ledge'
  import { openGridLabelWidthFor } from '../../../../cad-contract/units/opengrid-label-shared'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import { translate } from '../../../../i18n'
  import SnapFitRadioGroup from '../SnapFitRadioGroup.svelte'
  import type { ComponentPanelProps } from '../types'
  import {
    labelWallForRawParameters,
    labelWallOptions,
    rawNumberFor,
  } from './stackable-box-panel-logic'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const defaults = OPENGRID_STACKABLE_BOX_CONFIGURATION
  let enabled = $derived(rawParameters.labelSlotEnabled === 'true')
  let wall = $derived(labelWallForRawParameters(rawParameters))
  let units = $derived(
    rawParameters.labelGridUnits ?? String(defaults.defaultLabelGridUnits),
  )
  let maxUnits = $derived.by(() => {
    const x = rawNumberFor(rawParameters, 'x')
    const y = rawNumberFor(rawParameters, 'y')
    if (x === null || y === null) return 0
    return openGridStackableBoxLabelMaxUnitsFor({ x, y }, wall)
  })
  let available = $derived(maxUnits >= OPENGRID_LABEL_LEDGE.minUnits)

  function handleEnabledChange(checked: boolean): void {
    onInputChange('labelSlotEnabled', String(checked))
    if (checked && available) {
      onInputChange(
        'labelGridUnits',
        String(Math.min(defaults.defaultLabelGridUnits, maxUnits)),
      )
    }
  }

  function describedBy(): string | undefined {
    return (
      ['labelSlotEnabled', 'labelGridUnits', 'labelWall']
        .filter((key) => fieldErrors[key as keyof typeof fieldErrors])
        .map((key) => `${key}-error`)
        .join(' ') || undefined
    )
  }
</script>

<fieldset
  class="grid gap-2 rounded-lg border border-border-field p-3"
  data-testid="opengrid-stackable-box-label-panel"
  aria-describedby={describedBy()}
>
  <legend class="px-1 font-[650]"
    >{translate(locale, 'panel.boxLabel.title')}</legend
  >
  <label class="flex items-center gap-2">
    <input
      type="checkbox"
      class="accent-primary"
      checked={enabled}
      data-testid="opengrid-stackable-box-label-enabled"
      onchange={(event) => handleEnabledChange(event.currentTarget.checked)}
    />
    {translate(locale, 'panel.boxLabel.enable')}
  </label>
  <p class="m-0 text-sm text-muted-foreground">
    {translate(locale, 'panel.boxLabel.help')}
  </p>
  {#if enabled}
    <fieldset
      class="grid gap-2 border-0 p-0"
      aria-label={translate(locale, 'panel.boxLabel.wall')}
      role="radiogroup"
      data-testid="opengrid-stackable-box-label-wall"
    >
      <legend class="font-[650]"
        >{translate(locale, 'panel.boxLabel.wall')}</legend
      >
      <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
        {#each labelWallOptions as option (option.value)}
          <label class="flex min-w-0 items-start gap-2">
            <input
              class="mt-1 accent-primary"
              data-testid={`opengrid-stackable-box-label-wall-${option.value}`}
              name="opengrid-stackable-box-label-wall"
              type="radio"
              value={option.value}
              checked={wall === option.value}
              onchange={() => onInputChange('labelWall', option.value)}
            />
            <span class="font-[650]">{translate(locale, option.labelKey)}</span>
          </label>
        {/each}
      </div>
    </fieldset>
    {#if available}
      <label for="opengrid-stackable-box-label-units" class="text-sm"
        >{translate(locale, 'panel.boxLabel.units', { units })}</label
      >
      <input
        id="opengrid-stackable-box-label-units"
        type="range"
        min={OPENGRID_LABEL_LEDGE.minUnits}
        max={maxUnits}
        step="1"
        value={units}
        data-testid="opengrid-stackable-box-label-units"
        aria-invalid={Boolean(fieldErrors.labelGridUnits)}
        class="min-w-0 w-full accent-primary"
        oninput={(event) =>
          onInputChange('labelGridUnits', event.currentTarget.value)}
      />
      <p
        class="m-0 text-sm text-muted-foreground"
        data-testid="opengrid-stackable-box-label-width"
      >
        {translate(locale, 'panel.boxLabel.width', {
          width:
            Number.isFinite(Number(units)) && units.trim()
              ? openGridLabelWidthFor(Number(units))
              : '—',
          max: maxUnits,
        })}
      </p>
    {:else}
      <p
        class="m-0 text-sm text-error"
        role="status"
        data-testid="opengrid-stackable-box-label-unavailable"
      >
        {translate(locale, 'panel.boxLabel.unavailable', {
          minimum: OPENGRID_LABEL_LEDGE.minUnits,
        })}
      </p>
    {/if}
    <SnapFitRadioGroup
      {locale}
      value={rawParameters.labelSnapFit}
      testid="opengrid-stackable-box-label-snap-fit"
      radioName="opengrid-stackable-box-label-snap-fit"
      onSelect={(fit: OpenGridLabelSnapFit) =>
        onInputChange('labelSnapFit', fit)}
    />
  {/if}
  {#each ['labelSlotEnabled', 'labelGridUnits', 'labelWall'] as const as key (key)}
    {#if fieldErrors[key]}
      <span class="text-sm text-error" id={`${key}-error`} role="alert"
        >{formatValidationIssue(locale, fieldErrors[key])}</span
      >
    {/if}
  {/each}
</fieldset>
