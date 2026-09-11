<script lang="ts">
  import {
    displayParameterLabel,
    opengridDividerDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    OPENGRID_DIVIDER_CONFIGURATION,
    OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS,
    openGridDividerHoneycombMinHeightFor,
    validateOpenGridDividerParameters,
    type OpenGridDividerParameters,
  } from '../../../../cad-contract/units'
  import { openGridDividerHoneycombCellGroupsFor } from '../../../../cad-kernel/lattice/opengrid-honeycomb-cells'
  import HoneycombCellCountEstimate from '../HoneycombCellCountEstimate.svelte'
  import HoneycombRenderWarning from '../HoneycombRenderWarning.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import { translate } from '../../../../i18n'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const DIVIDER_PARAMETER_KEYS = [
    'left',
    'right',
    'up',
    'down',
    'height',
    'wallThickness',
  ] as const satisfies readonly Exclude<
    keyof OpenGridDividerParameters,
    'honeycombMode'
  >[]

  function parametersForDisplay(): OpenGridDividerParameters | null {
    if (Object.keys(fieldErrors).length > 0) return null
    const candidate: OpenGridDividerParameters = {
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      honeycombMode: rawParameters.honeycombMode === 'true',
    }
    for (const key of DIVIDER_PARAMETER_KEYS) {
      const rawValue = rawParameters[key]
      if (rawValue === undefined || rawValue.trim() === '') continue
      const value = Number(rawValue)
      if (!Number.isFinite(value)) return null
      candidate[key] = value
    }
    const validation = validateOpenGridDividerParameters(candidate)
    return validation.valid ? validation.value : null
  }

  let savingMode = $derived.by(() => {
    const parameters = parametersForDisplay()
    if (!parameters) return null
    const cellCount = openGridDividerHoneycombCellGroupsFor(parameters).length
    return {
      cellCount,
      tooSmall:
        parameters.height < openGridDividerHoneycombMinHeightFor(parameters),
      overLimit: cellCount > OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS,
    }
  })

  // Gating must not trap an already-enabled saving mode: a checked toggle
  // stays usable so the hint's "turn off material-saving mode" remains
  // reachable; only enabling at a gated size is blocked.
  let honeycombDisabled = $derived(
    savingMode !== null &&
      (savingMode.tooSmall || savingMode.overLimit) &&
      rawParameters.honeycombMode !== 'true',
  )
</script>

<div class="grid gap-3">
  <label class="flex items-start gap-2 text-sm">
    <input
      class="mt-0.5"
      type="checkbox"
      aria-label={translate(locale, 'panel.divider.honeycomb')}
      data-testid="opengrid-divider-honeycomb-mode"
      checked={rawParameters.honeycombMode === 'true'}
      disabled={honeycombDisabled}
      onchange={(event) => {
        if (!(event.currentTarget instanceof HTMLInputElement)) return
        onInputChange('honeycombMode', String(event.currentTarget.checked))
      }}
    />
    <span>{translate(locale, 'panel.divider.honeycomb')}</span>
    <span
      class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
    >
      {translate(locale, 'panel.honeycombBeta')}
    </span>
  </label>
  {#if savingMode?.tooSmall}
    <p
      class="m-0 text-sm text-muted-foreground"
      data-testid="opengrid-divider-honeycomb-too-small"
    >
      {translate(locale, 'panel.divider.honeycombTooSmall')}
    </p>
  {:else if savingMode?.overLimit}
    <p
      class="m-0 text-sm text-muted-foreground"
      data-testid="opengrid-divider-honeycomb-too-large"
    >
      {translate(locale, 'panel.divider.honeycombTooLarge', {
        max: OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS,
      })}
    </p>
  {:else if rawParameters.honeycombMode === 'true'}
    <HoneycombRenderWarning {locale} />
    {#if savingMode !== null}
      <HoneycombCellCountEstimate count={savingMode.cellCount} {locale} />
    {/if}
  {/if}
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    {#each opengridDividerDefinition.parameterSchema as field (field.key)}
      {@const value = rawParameters[field.key] ?? String(field.defaultValue)}
      <ParameterField
        {locale}
        label={displayParameterLabel(field, locale)}
        unit={unitLabelFor(locale, field.unit)}
        changed={value !== String(field.defaultValue)}
        error={fieldErrors[field.key]}
        errorId={`${field.key}-error`}
        onRestore={() => onInputChange(field.key, String(field.defaultValue))}
      >
        <ParameterControl
          {locale}
          {field}
          {value}
          error={fieldErrors[field.key]}
          onChange={(nextValue) => onInputChange(field.key, nextValue)}
        />
      </ParameterField>
    {/each}
  </fieldset>
</div>
