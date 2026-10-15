<script lang="ts">
  import {
    displayParameterLabel,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    externalOpenGridStackableBoxHeightFor,
    OPENGRID_STACKABLE_BOX_CONFIGURATION,
  } from '../../../../cad-contract/units'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import type { ParameterField as ParameterFieldDefinition } from '../../../../features/cad/model-catalog'
  import { translate } from '../../../../i18n'
  import { parametersForRange } from './stackable-box-panel-logic'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const topRimHeightField = $derived.by((): ParameterFieldDefinition => {
    const parameters = parametersForRange(rawParameters)
    const externalTop = parameters
      ? externalOpenGridStackableBoxHeightFor(parameters)
      : OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultHeight +
        OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight
    const max = Math.max(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.minTopRimHeight,
      Math.floor(externalTop / 2),
    )
    return {
      key: 'topRimHeight',
      label: 'parameter.topRimHeight',
      axis: 'Z',
      unit: 'mm',
      control: 'range-text',
      defaultValue: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultTopRimHeight,
      min: OPENGRID_STACKABLE_BOX_CONFIGURATION.minTopRimHeight,
      max,
      step: 1,
      sliderMin: OPENGRID_STACKABLE_BOX_CONFIGURATION.minTopRimHeight,
      sliderMax: max,
    }
  })
</script>

<label class="flex items-start gap-2 text-sm">
  <input
    class="mt-0.5"
    type="checkbox"
    aria-label={translate(locale, 'panel.topRim')}
    data-testid="opengrid-stackable-box-top-rim-enabled"
    checked={rawParameters.topRimEnabled === 'true'}
    onchange={(event) => {
      if (!(event.currentTarget instanceof HTMLInputElement)) return
      onInputChange('topRimEnabled', String(event.currentTarget.checked))
    }}
  />
  <span>{translate(locale, 'panel.topRim')}</span>
</label>
{#if rawParameters.topRimEnabled === 'true'}
  {@const value =
    rawParameters.topRimHeight ?? String(topRimHeightField.defaultValue)}
  <ParameterField
    {locale}
    label={displayParameterLabel(topRimHeightField, locale)}
    unit={unitLabelFor(locale, topRimHeightField.unit)}
    changed={value !== String(topRimHeightField.defaultValue)}
    error={fieldErrors.topRimHeight}
    errorId="topRimHeight-error"
    onRestore={() =>
      onInputChange('topRimHeight', String(topRimHeightField.defaultValue))}
  >
    <ParameterControl
      {locale}
      field={topRimHeightField}
      {value}
      error={fieldErrors.topRimHeight}
      onChange={(nextValue) => onInputChange('topRimHeight', nextValue)}
    />
  </ParameterField>
{/if}
