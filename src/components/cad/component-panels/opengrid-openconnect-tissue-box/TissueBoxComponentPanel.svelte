<script lang="ts">
  import {
    tissueBoxDefinition,
    displayParameterLabel,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    TISSUE_BOX_DEFAULTS,
    TISSUE_BOX_KEYS,
    tissueBoxCells,
    validateTissueBoxParameters,
  } from '../../../../cad-contract/units/opengrid-openconnect-tissue-box'
  import { translate } from '../../../../i18n'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import HoneycombRenderWarning from '../HoneycombRenderWarning.svelte'
  import HoneycombCellCountEstimate from '../HoneycombCellCountEstimate.svelte'
  import type { ComponentPanelProps } from '../types'
  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()
  let count = $derived.by(() => {
    const candidate = { ...TISSUE_BOX_DEFAULTS, honeycombMode: false }
    for (const key of TISSUE_BOX_KEYS) {
      if (key === 'honeycombMode') continue
      const value = rawParameters[key]
      if (value === undefined || value.trim() === '') return null
      candidate[key] = Number(value)
    }
    if (!validateTissueBoxParameters(candidate).valid) return null
    return tissueBoxCells(candidate).length
  })
</script>

<div class="grid gap-3">
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="tissue-box-help"
  >
    {translate(locale, 'panel.tissueBox.help')}
  </p>
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    {#each tissueBoxDefinition.parameterSchema as field (field.key)}
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
          onChange={(next) => onInputChange(field.key, next)}
        />
      </ParameterField>
    {/each}
  </fieldset>
  <label class="flex items-start gap-2 text-sm">
    <input
      type="checkbox"
      checked={rawParameters.honeycombMode === 'true'}
      onchange={(event) =>
        onInputChange('honeycombMode', String(event.currentTarget.checked))}
    />
    <span>{translate(locale, 'panel.openShelf.honeycomb')}</span>
    <span
      class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
      >{translate(locale, 'panel.honeycombBeta')}</span
    >
  </label>
  {#if fieldErrors.honeycombMode}<p
      class="text-sm text-destructive"
      role="alert"
    >
      {translate(locale, fieldErrors.honeycombMode.messageId)}
    </p>{/if}
  {#if rawParameters.honeycombMode === 'true'}
    <HoneycombRenderWarning {locale} />
    {#if count !== null}<HoneycombCellCountEstimate {locale} {count} />{/if}
  {/if}
</div>
