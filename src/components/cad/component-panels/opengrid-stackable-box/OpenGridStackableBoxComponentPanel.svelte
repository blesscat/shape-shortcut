<script lang="ts">
  import {
    displayParameterLabel,
    opengridStackableBoxDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import { calculateOpenGridStackableBoxCounts } from '../../../../features/cad/grid-dimensions'
  import GridDimensionCalculator from '../GridDimensionCalculator.svelte'
  import HoneycombSettings from './HoneycombSettings.svelte'
  import ModeRadioGroup from './ModeRadioGroup.svelte'
  import OpeningSettings from './OpeningSettings.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import TopRimSettings from './TopRimSettings.svelte'
  import type { ComponentPanelProps } from '../types'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import { translate } from '../../../../i18n'
  import {
    bottomModeForRawParameters,
    bottomModeOptions,
    seatModeForRawParameters,
    seatModeOptions,
    topRimModeForRawParameters,
    topRimModeOptions,
  } from './stackable-box-panel-logic'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  function handleDimensionCalculation(parameters: {
    rows: number
    columns: number
  }): void {
    onInputChange('x', String(parameters.columns))
    onInputChange('y', String(parameters.rows))
  }

  function modeErrorDescriptionId(): string | undefined {
    const ids: string[] = []
    if (fieldErrors.topRimMode) ids.push('topRimMode-error')
    if (fieldErrors.bottomMode) ids.push('bottomMode-error')
    return ids.length > 0 ? ids.join(' ') : undefined
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="mb-3 text-sm font-semibold text-muted-foreground"
    >{translate(locale, 'cad.presentation.dimensions')}</legend
  >
  {#each opengridStackableBoxDefinition.parameterSchema.slice(0, 3) as field (field.key)}
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
  <h3
    class="mb-0 mt-3 border-t border-border pt-4 text-sm font-semibold text-muted-foreground"
  >
    {translate(locale, 'cad.presentation.structure')}
  </h3>
  <GridDimensionCalculator
    {locale}
    calculate={calculateOpenGridStackableBoxCounts}
    description=""
    onApply={handleDimensionCalculation}
  />
  <div class="grid gap-2">
    <ModeRadioGroup
      {locale}
      {onInputChange}
      fieldKey="cornerSeatMode"
      testid="opengrid-stackable-box-seat-mode"
      radioName="opengrid-stackable-box-seat-mode"
      legendKey="panel.seat.mode"
      options={seatModeOptions}
      selectedValue={seatModeForRawParameters(rawParameters)}
      errorDescriptionIds={fieldErrors.cornerSeatMode
        ? 'cornerSeatMode-error'
        : undefined}
      ariaInvalid={Boolean(fieldErrors.cornerSeatMode)}
    />
    <label class="flex min-w-0 items-start gap-2">
      <input
        aria-describedby={fieldErrors.fullBottomHoleGrid
          ? 'fullBottomHoleGrid-error'
          : undefined}
        aria-invalid={Boolean(fieldErrors.fullBottomHoleGrid)}
        aria-label={translate(locale, 'panel.fullBottomHole')}
        class="mt-1 accent-primary"
        type="checkbox"
        checked={rawParameters.fullBottomHoleGrid === 'true'}
        onchange={(event) => {
          if (!(event.currentTarget instanceof HTMLInputElement)) return
          onInputChange(
            'fullBottomHoleGrid',
            String(event.currentTarget.checked),
          )
        }}
      />
      <span class="font-[650]">{translate(locale, 'panel.fullBottomHole')}</span
      >
    </label>
    <HoneycombSettings {locale} {rawParameters} {onInputChange} />
  </div>
  <ModeRadioGroup
    {locale}
    {onInputChange}
    fieldKey="topRimMode"
    testid="opengrid-stackable-box-top-rim-mode"
    radioName="opengrid-stackable-box-top-rim-mode"
    legendKey="panel.box.topRim"
    options={topRimModeOptions}
    selectedValue={topRimModeForRawParameters(rawParameters)}
    errorDescriptionIds={modeErrorDescriptionId()}
    ariaInvalid={Boolean(fieldErrors.topRimMode || fieldErrors.bottomMode)}
    optionTestidPrefix="opengrid-stackable-box-top-rim"
    radioDescribedby
  />
  <ModeRadioGroup
    {locale}
    {onInputChange}
    fieldKey="bottomMode"
    testid="opengrid-stackable-box-bottom-mode"
    radioName="opengrid-stackable-box-bottom-mode"
    legendKey="panel.box.bottom"
    options={bottomModeOptions}
    selectedValue={bottomModeForRawParameters(rawParameters)}
    errorDescriptionIds={modeErrorDescriptionId()}
    ariaInvalid={Boolean(fieldErrors.topRimMode || fieldErrors.bottomMode)}
    optionTestidPrefix="opengrid-stackable-box-bottom"
    radioDescribedby
  />
  {#if fieldErrors.cornerSeatMode}
    <span class="text-sm text-error" id="cornerSeatMode-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.cornerSeatMode)}</span
    >
  {/if}
  {#if fieldErrors.fullBottomHoleGrid}
    <span class="text-sm text-error" id="fullBottomHoleGrid-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.fullBottomHoleGrid)}</span
    >
  {/if}
  {#if fieldErrors.topRimMode}
    <span class="text-sm text-error" id="topRimMode-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.topRimMode)}</span
    >
  {/if}
  {#if fieldErrors.bottomMode}
    <span class="text-sm text-error" id="bottomMode-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.bottomMode)}</span
    >
  {/if}
  <TopRimSettings {locale} {rawParameters} {fieldErrors} {onInputChange} />

  <OpeningSettings {locale} {rawParameters} {fieldErrors} {onInputChange} />
</fieldset>
