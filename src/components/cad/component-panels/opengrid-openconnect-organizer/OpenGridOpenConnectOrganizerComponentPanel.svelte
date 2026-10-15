<script lang="ts">
  import { translate } from '../../../../i18n'
  import {
    displayParameterLabel,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import OpenConnectSettings from '../OpenConnectSettings.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import OrganizerCavitySection from './OrganizerCavitySection.svelte'
  import OrganizerLabelSlotSettings from './OrganizerLabelSlotSettings.svelte'
  import OrganizerSpacingSection from './OrganizerSpacingSection.svelte'
  import OrganizerTopRimSection from './OrganizerTopRimSection.svelte'
  import {
    layoutForRawParameters,
    organizerFieldFor,
    organizerValueFor,
  } from './organizer-parameters'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const tiltField = organizerFieldFor('tiltAngle')
  let layout = $derived(layoutForRawParameters(rawParameters))
  let tiltValue = $derived(organizerValueFor(rawParameters, tiltField))
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="opengrid-openconnect-organizer-help"
  >
    {translate(locale, 'panel.openConnectOrganizer.description')}
  </p>

  <div
    class="grid gap-3"
    data-testid="opengrid-openconnect-organizer-hole-counts"
  >
    {#each [organizerFieldFor('holeCountX'), organizerFieldFor('holeCountY')] as field (field.key)}
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
  </div>

  <OrganizerSpacingSection
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />

  <OrganizerCavitySection
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />

  <p class="m-0 text-sm leading-6 text-muted-foreground">
    {translate(locale, 'parameter.organizerForwardTiltHelp')}
  </p>
  <ParameterField
    {locale}
    label={displayParameterLabel(tiltField, locale)}
    unit={unitLabelFor(locale, tiltField.unit)}
    changed={tiltValue !== String(tiltField.defaultValue)}
    error={fieldErrors[tiltField.key]}
    errorId={`${tiltField.key}-error`}
    onRestore={() =>
      onInputChange(tiltField.key, String(tiltField.defaultValue))}
  >
    <ParameterControl
      {locale}
      field={tiltField}
      value={tiltValue}
      error={fieldErrors[tiltField.key]}
      onChange={(nextValue) => onInputChange(tiltField.key, nextValue)}
    />
  </ParameterField>

  <OpenConnectSettings {locale} {rawParameters} {fieldErrors} {onInputChange}>
    <div
      class="rounded-lg border border-border-field bg-panel-muted px-3 py-2 text-sm"
      data-testid="opengrid-openconnect-organizer-interface-summary"
    >
      <span class="font-[650]">
        {translate(locale, 'panel.openConnectOrganizer.interfaceSummary')}
      </span>
      {#if layout}
        <span class="ml-2">
          {translate(locale, 'panel.openConnectOrganizer.interfaceValue', {
            columns: layout.connectorColumns,
            rows: layout.connectorRows,
            width: layout.rearInterfaceWidth.toFixed(2),
            height: layout.rearInterfaceHeight.toFixed(2),
          })}
        </span>
      {:else}
        <span class="ml-2 text-muted-foreground">
          {translate(locale, 'panel.openConnectOrganizer.interfaceInvalid')}
        </span>
      {/if}
    </div>
  </OpenConnectSettings>

  <OrganizerLabelSlotSettings
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
    {layout}
  />

  <OrganizerTopRimSection
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
</fieldset>
