<script lang="ts">
  import { HEXAGONAL_COLUMN_CONFIGURATION } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    hexagonalColumnDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'
  import { translate } from '../../../../i18n'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const defaultOrientation = HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation

  function handleOrientationChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('orientation', event.currentTarget.value)
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="mb-3 text-sm font-semibold text-muted-foreground"
    >{translate(locale, 'cad.presentation.dimensions')}</legend
  >
  <p class="m-0 text-sm text-muted-foreground">
    {translate(locale, 'panel.hexagonalColumn.description')}
  </p>
  {#each hexagonalColumnDefinition.parameterSchema as field (field.key)}
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
  <ParameterField
    {locale}
    label={translate(locale, 'panel.hexagonalColumn.orientation')}
    unit="orientation"
    changed={(rawParameters.orientation ?? defaultOrientation) !==
      defaultOrientation}
    error={fieldErrors.orientation}
    errorId="orientation-error"
    onRestore={() => onInputChange('orientation', defaultOrientation)}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.hexagonalColumn.orientation')}
      value={rawParameters.orientation ?? defaultOrientation}
      onchange={handleOrientationChange}
    >
      <option value="lying"
        >{translate(locale, 'panel.hexagonalColumn.lying')}</option
      >
      <option value="standing"
        >{translate(locale, 'panel.hexagonalColumn.standing')}</option
      >
    </select>
  </ParameterField>
</fieldset>
