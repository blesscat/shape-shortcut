<script lang="ts">
  import {
    displayParameterLabel,
    opengridOrganizerBoxDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    type OpenGridOrganizerBoxBoxMode,
    type OpenGridOrganizerBoxSpacingMode,
  } from '../../../../cad-contract/units'
  import { translate } from '../../../../i18n'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import ParameterRadioGroup from '../ParameterRadioGroup.svelte'
  import type { ComponentPanelProps } from '../types'
  import {
    bodyModeForRawParameters,
    bodyOptions,
    layoutFor,
    numericKeys,
    seatModeForRawParameters,
    seatOptions,
    shapeForRawParameters,
    shapeOptions,
    sizeSectionFieldKeysForRawParameters,
    spacingKeysForRawParameters,
    spacingModeForRawParameters,
    spacingOptions,
    topRimHeightFieldFor,
  } from './panel-model'
  import type { ParameterField as ParameterFieldDefinition } from '../../../../features/cad/model-catalog'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  function fieldFor(
    key: (typeof numericKeys)[number],
  ): ParameterFieldDefinition {
    const field = opengridOrganizerBoxDefinition.parameterSchema.find(
      (candidate) => candidate.key === key,
    )
    if (!field) throw new Error(`ORGANIZER_BOX_FIELD_MISSING:${key}`)
    return field
  }

  function valueFor(field: ParameterFieldDefinition): string {
    return rawParameters[field.key] ?? String(field.defaultValue)
  }

  function wallFieldFor(): ParameterFieldDefinition {
    const field = fieldFor('wallThickness')
    if (bodyModeForRawParameters(rawParameters) !== 'stackable') return field
    const stackableUiFloor = 3
    if (field.min >= stackableUiFloor) return field
    return { ...field, min: stackableUiFloor, sliderMin: stackableUiFloor }
  }

  const wallField = $derived(wallFieldFor())
  const wallValue = $derived(valueFor(wallField))

  let layout = $derived(layoutFor(rawParameters))

  function handleSpacingModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (!event.currentTarget.checked) return
    const value = event.currentTarget.value as OpenGridOrganizerBoxSpacingMode
    onInputChange('holeSpacingMode', value)
    if (value === 'linked') {
      onInputChange(
        'holeSpacingY',
        rawParameters.holeSpacingX ??
          String(OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeSpacingX),
      )
    }
  }

  function handleLinkedSpacingChange(value: string): void {
    onInputChange('holeSpacingX', value)
    onInputChange('holeSpacingY', value)
  }

  function handleShapeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('holeShape', event.currentTarget.value)
  }

  function handleSeatModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (!event.currentTarget.checked) return
    onInputChange('cornerSeatMode', event.currentTarget.value)
  }

  function handleBodyModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (!event.currentTarget.checked) return
    const value = event.currentTarget.value as OpenGridOrganizerBoxBoxMode
    onInputChange('boxMode', value)
    if (value === 'stackable') {
      const current = Number(
        rawParameters.wallThickness ??
          String(OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.wallThickness),
      )
      if (current < 3) onInputChange('wallThickness', '3')
    }
  }

  const topRimHeightField = $derived(topRimHeightFieldFor(layout))
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p class="text-sm text-muted-foreground">
    {translate(locale, 'panel.organizerBox.description')}
  </p>

  <ParameterRadioGroup
    {locale}
    name="opengrid-organizer-box-seat-mode"
    testId="opengrid-organizer-box-seat-mode"
    legendKey="panel.seat.mode"
    options={seatOptions}
    currentValue={seatModeForRawParameters(rawParameters)}
    error={fieldErrors.cornerSeatMode}
    errorId="cornerSeatMode-error"
    onChange={handleSeatModeChange}
  />

  <ParameterRadioGroup
    {locale}
    name="opengrid-organizer-box-body-mode"
    testId="opengrid-organizer-box-body-mode"
    legendKey="panel.boxMode"
    options={bodyOptions}
    currentValue={bodyModeForRawParameters(rawParameters)}
    error={fieldErrors.boxMode}
    errorId="boxMode-error"
    onChange={handleBodyModeChange}
  />

  {#if bodyModeForRawParameters(rawParameters) === 'stackable'}
    {@const field = fieldFor('stackingClearanceHeight')}
    {@const value = valueFor(field)}
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
  {/if}

  <div class="grid gap-3" data-testid="opengrid-organizer-box-hole-counts">
    {#each [fieldFor('holeCountX'), fieldFor('holeCountY')] as field (field.key)}
      {@const value = valueFor(field)}
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

  <ParameterRadioGroup
    {locale}
    name="opengrid-organizer-box-spacing-mode"
    testId="opengrid-organizer-box-spacing-mode"
    legendKey="panel.organizerBox.spacingMode"
    options={spacingOptions}
    currentValue={spacingModeForRawParameters(rawParameters)}
    onChange={handleSpacingModeChange}
  />

  <div
    class="rounded-lg border border-border-field bg-panel-muted px-3 py-2 text-sm"
    data-testid="opengrid-organizer-box-layout-summary"
  >
    <span class="font-[650]">
      {translate(locale, 'panel.organizerBox.layoutSummary')}
    </span>
    {#if layout}
      <span class="ml-2">
        {translate(locale, 'panel.organizerBox.layoutValue', {
          x: layout.gridCountX,
          y: layout.gridCountY,
          width: layout.footprint[0].toFixed(2),
          depth: layout.footprint[1].toFixed(2),
        })}
      </span>
    {:else}
      <span class="ml-2 text-muted-foreground">
        {translate(locale, 'panel.organizerBox.layoutInvalid')}
      </span>
    {/if}
  </div>

  <div class="grid gap-3">
    {#each spacingKeysForRawParameters(rawParameters) as key (key)}
      {@const field = fieldFor(key)}
      {@const value = valueFor(field)}
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
  </div>

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
      {#each shapeOptions as option (option.value)}
        <option value={option.value}
          >{translate(locale, option.labelKey)}</option
        >
      {/each}
    </select>
  </ParameterField>

  {#each sizeSectionFieldKeysForRawParameters(rawParameters) as fieldKey (fieldKey)}
    {@const field = fieldFor(fieldKey)}
    {@const value = valueFor(field)}
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
    label={displayParameterLabel(wallField, locale)}
    unit={unitLabelFor(locale, wallField.unit)}
    changed={wallValue !== String(wallField.defaultValue)}
    error={fieldErrors.wallThickness}
    errorId="wallThickness-error"
    onRestore={() =>
      onInputChange(
        'wallThickness',
        String(Math.max(wallField.defaultValue, wallField.min)),
      )}
  >
    <ParameterControl
      {locale}
      field={wallField}
      value={wallValue}
      error={fieldErrors.wallThickness}
      onChange={(nextValue) => onInputChange('wallThickness', nextValue)}
    />
  </ParameterField>

  <label class="flex items-start gap-2 text-sm">
    <input
      class="mt-0.5"
      type="checkbox"
      aria-label={translate(locale, 'panel.topRim')}
      data-testid="opengrid-organizer-box-top-rim-enabled"
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
</fieldset>
