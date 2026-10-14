<script lang="ts">
  import {
    OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    type OpenGridOpenConnectOrganizerSpacingMode,
  } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import { translate } from '../../../../i18n'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import {
    ORGANIZER_SPACING_OPTIONS,
    organizerFieldFor,
    organizerValueFor,
    spacingKeysForRawParameters,
    spacingModeForRawParameters,
  } from './organizer-parameters'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  function handleSpacingModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (!event.currentTarget.checked) return
    const value = event.currentTarget
      .value as OpenGridOpenConnectOrganizerSpacingMode
    onInputChange('holeSpacingMode', value)
    if (value === 'linked') {
      onInputChange(
        'holeSpacingY',
        rawParameters.holeSpacingX ??
          String(
            OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeSpacingX,
          ),
      )
    }
  }

  function handleLinkedSpacingChange(value: string): void {
    onInputChange('holeSpacingX', value)
    onInputChange('holeSpacingY', value)
  }
</script>

<fieldset
  class="grid gap-2 border-0 p-0"
  aria-describedby={fieldErrors.holeSpacingMode
    ? 'holeSpacingMode-error'
    : undefined}
  aria-invalid={Boolean(fieldErrors.holeSpacingMode)}
  aria-label={translate(locale, 'panel.organizerBox.spacingMode')}
  role="radiogroup"
  data-testid="opengrid-openconnect-organizer-spacing-mode"
>
  <legend class="font-[650]">
    {translate(locale, 'panel.organizerBox.spacingMode')}
  </legend>
  <div class="flex flex-wrap gap-x-4 gap-y-2">
    {#each ORGANIZER_SPACING_OPTIONS as option (option.value)}
      <label class="flex min-w-0 items-start gap-2">
        <input
          aria-label={translate(locale, option.labelKey)}
          class="mt-1 accent-primary"
          name="opengrid-openconnect-organizer-spacing-mode"
          type="radio"
          value={option.value}
          checked={spacingModeForRawParameters(rawParameters) === option.value}
          onchange={handleSpacingModeChange}
        />
        <span class="font-[650]">{translate(locale, option.labelKey)}</span>
      </label>
    {/each}
  </div>
  <span class="text-sm text-muted-foreground">
    {translate(
      locale,
      ORGANIZER_SPACING_OPTIONS.find(
        (option) => option.value === spacingModeForRawParameters(rawParameters),
      )!.descriptionKey,
    )}
  </span>
  {#if fieldErrors.holeSpacingMode}
    <span id="holeSpacingMode-error" class="text-sm text-error" role="alert">
      {formatValidationIssue(locale, fieldErrors.holeSpacingMode)}
    </span>
  {/if}
</fieldset>

{#each spacingKeysForRawParameters(rawParameters) as key (key)}
  {@const field = organizerFieldFor(key)}
  {@const value = organizerValueFor(rawParameters, field)}
  <ParameterField
    {locale}
    label={displayParameterLabel(field, locale)}
    unit={unitLabelFor(locale, field.unit)}
    changed={value !== String(field.defaultValue)}
    error={fieldErrors[field.key] ?? fieldErrors.holeSpacingY}
    errorId={`${field.key}-error`}
    onRestore={() =>
      spacingModeForRawParameters(rawParameters) === 'linked'
        ? handleLinkedSpacingChange(String(field.defaultValue))
        : onInputChange(field.key, String(field.defaultValue))}
  >
    <ParameterControl
      {locale}
      {field}
      {value}
      error={fieldErrors[field.key] ?? fieldErrors.holeSpacingY}
      onChange={(nextValue) =>
        spacingModeForRawParameters(rawParameters) === 'linked'
          ? handleLinkedSpacingChange(nextValue)
          : onInputChange(field.key, nextValue)}
    />
  </ParameterField>
{/each}
