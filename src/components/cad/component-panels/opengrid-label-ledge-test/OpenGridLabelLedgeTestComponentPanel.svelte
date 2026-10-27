<script lang="ts">
  import { opengridLabelLedgeTestDefinition } from '../../../../features/cad/model-catalog'
  import {
    OPENGRID_LABEL_GRID,
    openGridLabelWidthFor,
  } from '../../../../cad-contract/units/opengrid-label-shared'
  import { OPENGRID_LABEL_LEDGE } from '../../../../cad-contract/units/opengrid-label-ledge'
  import { translate } from '../../../../i18n'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import SnapFitRadioGroup from '../SnapFitRadioGroup.svelte'
  import type { ComponentPanelProps } from '../types'
  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()
  const field = opengridLabelLedgeTestDefinition.parameterSchema[0]!
  let value = $derived(rawParameters.gridUnits ?? String(field.defaultValue))
</script>

<p class="m-0 text-sm leading-6 text-muted-foreground">
  {translate(locale, 'panel.labelLedgeTest.details')}
</p>
<ParameterField
  {locale}
  label={translate(locale, 'parameter.gridUnits')}
  error={fieldErrors.gridUnits}
  errorId="gridUnits-error"
>
  <ParameterControl
    {locale}
    {field}
    {value}
    error={fieldErrors.gridUnits}
    onChange={(value) => onInputChange('gridUnits', value)}
  />
</ParameterField>
<p class="m-0 text-sm text-muted-foreground">
  {translate(locale, 'panel.labelLedgeTest.width', {
    width: openGridLabelWidthFor(Number(value)),
    min: OPENGRID_LABEL_LEDGE.minUnits,
    max: OPENGRID_LABEL_GRID.maxUnits,
  })}
</p>
<SnapFitRadioGroup
  {locale}
  value={rawParameters.labelSnapFit}
  testid="opengrid-label-ledge-test-snap-fit"
  radioName="opengrid-label-ledge-test-snap-fit"
  onSelect={(fit) => onInputChange('labelSnapFit', fit)}
/>
