<script lang="ts">
  import { translate } from '../../../../i18n'
  import {
    boxDefinition,
    displayParameterLabel,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="mb-3 text-sm font-semibold text-muted-foreground"
    >{translate(locale, 'cad.presentation.dimensions')}</legend
  >
  {#each boxDefinition.parameterSchema as field (field.key)}
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
