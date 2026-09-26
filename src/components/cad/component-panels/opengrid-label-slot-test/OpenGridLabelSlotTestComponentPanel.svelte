<script lang="ts">
  import { opengridLabelSlotTestDefinition } from '../../../../features/cad/model-catalog'
  import {
    OPENGRID_LABEL_GRID,
    openGridLabelWidthFor,
  } from '../../../../cad-contract/units/opengrid-label-shared'
  import { translate } from '../../../../i18n'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'
  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()
  const field = opengridLabelSlotTestDefinition.parameterSchema[0]!
  let value = $derived(rawParameters.gridUnits ?? String(field.defaultValue))
</script>

<p class="m-0 text-sm leading-6 text-muted-foreground">
  {translate(locale, 'panel.labelSlotTest.details')}
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
  {translate(locale, 'panel.labelCard.unitWidth', {
    width: openGridLabelWidthFor(Number(value)),
    max: OPENGRID_LABEL_GRID.maxUnits,
  })}
</p>
