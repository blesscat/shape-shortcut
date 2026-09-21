<script lang="ts">
  import {
    openGridOpenConnectShelfMaximumAngleForRows,
    OPENGRID_OPENCONNECT_SHELF_CONFIGURATION,
  } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    opengridOpenConnectShelfDefinition,
    unitLabelFor,
    type ParameterField as ParameterFieldDefinition,
  } from '../../../../features/cad/model-catalog'
  import { translate } from '../../../../i18n'
  import OpenConnectSettings from '../OpenConnectSettings.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  function gridCountForMaximumAngle(
    key: 'rows' | 'connectorRows',
    fallback: number,
  ): number {
    const count = Number(rawParameters[key])
    if (
      Number.isSafeInteger(count) &&
      count >= configuration.minGridCount &&
      count <= configuration.maxGridCount
    ) {
      return count
    }
    return fallback
  }

  function fieldForDisplay(
    field: ParameterFieldDefinition,
    maximumAngle: number,
  ): ParameterFieldDefinition {
    if (field.key !== 'angle') return field
    return {
      ...field,
      max: maximumAngle,
      sliderMax: maximumAngle,
    }
  }

  let rows = $derived(
    gridCountForMaximumAngle('rows', configuration.defaultRows),
  )
  let connectorRows = $derived(
    gridCountForMaximumAngle(
      'connectorRows',
      configuration.defaultConnectorRows,
    ),
  )
  let maximumAngle = $derived(
    openGridOpenConnectShelfMaximumAngleForRows(rows, connectorRows),
  )
  let parameterSchema = $derived(
    opengridOpenConnectShelfDefinition.parameterSchema.map((field) =>
      fieldForDisplay(field, maximumAngle),
    ),
  )
</script>

<div class="grid gap-3">
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="opengrid-openconnect-shelf-help"
  >
    {translate(locale, 'panel.openConnectShelf.description')}
  </p>
  <p
    class="m-0 rounded-lg border border-border-card bg-page px-3 py-2 text-sm text-muted-foreground"
    data-testid="opengrid-openconnect-shelf-angle-limit"
  >
    {translate(locale, 'panel.openConnectShelf.maximumAngle', {
      rows,
      connectorRows,
      maximum: maximumAngle,
    })}
  </p>
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    {#each parameterSchema.filter((field) => field.key !== 'connectorRows') as field (field.key)}
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
  <OpenConnectSettings {locale} {rawParameters} {fieldErrors} {onInputChange}>
    {#each parameterSchema.filter((field) => field.key === 'connectorRows') as field (field.key)}
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
  </OpenConnectSettings>
</div>
