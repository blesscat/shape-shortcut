<script lang="ts">
  import {
    displayParameterLabel,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import { translate } from '../../../../i18n'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import {
    ORGANIZER_SHAPE_OPTIONS,
    organizerFieldFor,
    organizerValueFor,
    shapeForRawParameters,
    sizeSectionFieldKeysForRawParameters,
  } from './organizer-parameters'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  function handleShapeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('holeShape', event.currentTarget.value)
  }
</script>

<ParameterField
  {locale}
  label={translate(locale, 'parameter.organizerHoleShape')}
  error={fieldErrors.holeShape}
  errorId="holeShape-error"
>
  <select
    aria-describedby={fieldErrors.holeShape ? 'holeShape-error' : undefined}
    aria-invalid={Boolean(fieldErrors.holeShape)}
    aria-label={translate(locale, 'parameter.organizerHoleShape')}
    class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
    value={shapeForRawParameters(rawParameters)}
    onchange={handleShapeChange}
  >
    {#each ORGANIZER_SHAPE_OPTIONS as option (option.value)}
      <option value={option.value}>
        {translate(locale, option.labelKey)}
      </option>
    {/each}
  </select>
</ParameterField>

<p
  class="m-0 text-sm leading-6 text-muted-foreground"
  data-testid="opengrid-openconnect-organizer-thickness-help"
>
  {translate(locale, 'parameter.organizerThicknessHelp')}
</p>

{#each sizeSectionFieldKeysForRawParameters(rawParameters) as fieldKey (fieldKey)}
  {@const field = organizerFieldFor(fieldKey)}
  {@const value = organizerValueFor(rawParameters, field)}
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
