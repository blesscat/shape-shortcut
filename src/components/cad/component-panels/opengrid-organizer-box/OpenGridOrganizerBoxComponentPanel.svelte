<script lang="ts">
  import {
    displayParameterLabel,
    opengridOrganizerBoxDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    openGridOrganizerBoxLayoutFor,
    type OpenGridLocatingSeatMode,
    type OpenGridOrganizerBoxBoxMode,
    type OpenGridOrganizerBoxParameters,
    type OpenGridOrganizerBoxShape,
    type OpenGridOrganizerBoxSpacingMode,
    validateOpenGridOrganizerBoxParameters,
  } from '../../../../cad-contract/units'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import { translate } from '../../../../i18n'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import type { ParameterField as ParameterFieldDefinition } from '../../../../features/cad/model-catalog'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const numericKeys = [
    'holeCountX',
    'holeCountY',
    'holeSpacingX',
    'holeSpacingY',
    'holeDiameter',
    'holeDepth',
    'bottomThickness',
    'wallThickness',
    'stackingClearanceHeight',
  ] as const

  const spacingOptions: ReadonlyArray<{
    value: OpenGridOrganizerBoxSpacingMode
    labelKey: string
    descriptionKey: string
  }> = [
    {
      value: 'linked',
      labelKey: 'panel.organizerBox.spacingLinked',
      descriptionKey: 'panel.organizerBox.spacingLinkedDescription',
    },
    {
      value: 'independent',
      labelKey: 'panel.organizerBox.spacingIndependent',
      descriptionKey: 'panel.organizerBox.spacingIndependentDescription',
    },
  ]

  const shapeOptions: ReadonlyArray<{
    value: OpenGridOrganizerBoxShape
    labelKey: string
  }> = [
    { value: 'circle', labelKey: 'panel.organizerBox.shape.circle' },
    { value: 'triangle', labelKey: 'panel.organizerBox.shape.triangle' },
    { value: 'square', labelKey: 'panel.organizerBox.shape.square' },
    { value: 'pentagon', labelKey: 'panel.organizerBox.shape.pentagon' },
    { value: 'hexagon', labelKey: 'panel.organizerBox.shape.hexagon' },
  ]

  const seatOptions: ReadonlyArray<{
    value: OpenGridLocatingSeatMode
    labelKey: string
    descriptionKey: string
  }> = [
    {
      value: 'none',
      labelKey: 'panel.seat.none',
      descriptionKey: 'panel.seat.noneDescription',
    },
    {
      value: 'detachable-corner-seat',
      labelKey: 'panel.seat.detachableCornerSeat',
      descriptionKey: 'panel.seat.detachableCornerSeatDescription',
    },
    {
      value: 'integrated',
      labelKey: 'panel.seat.integrated',
      descriptionKey: 'panel.seat.integratedDescription',
    },
  ]

  const bodyOptions: ReadonlyArray<{
    value: OpenGridOrganizerBoxBoxMode
    labelKey: string
    descriptionKey: string
  }> = [
    {
      value: 'normal',
      labelKey: 'panel.organizerBox.body.normal',
      descriptionKey: 'panel.organizerBox.body.normalDescription',
    },
    {
      value: 'stackable',
      labelKey: 'panel.organizerBox.body.stackable',
      descriptionKey: 'panel.organizerBox.body.stackableDescription',
    },
  ]

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

  function spacingModeForRawParameters(): OpenGridOrganizerBoxSpacingMode {
    return rawParameters.holeSpacingMode === 'independent'
      ? 'independent'
      : 'linked'
  }

  function shapeForRawParameters(): OpenGridOrganizerBoxShape {
    const value = rawParameters.holeShape
    return shapeOptions.some((option) => option.value === value)
      ? (value as OpenGridOrganizerBoxShape)
      : OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeShape
  }

  function seatModeForRawParameters(): OpenGridLocatingSeatMode {
    const value = rawParameters.cornerSeatMode
    const supported = seatOptions.some((option) => option.value === value)
    if (supported) return value as OpenGridLocatingSeatMode
    return OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.cornerSeatMode
  }

  function bodyModeForRawParameters(): OpenGridOrganizerBoxBoxMode {
    return rawParameters.boxMode === 'stackable' ? 'stackable' : 'normal'
  }

  function spacingKeysForRawParameters(): ReadonlyArray<
    'holeSpacingX' | 'holeSpacingY'
  > {
    return spacingModeForRawParameters() === 'linked'
      ? ['holeSpacingX']
      : ['holeSpacingX', 'holeSpacingY']
  }

  function wallFieldFor(): ParameterFieldDefinition {
    const field = fieldFor('wallThickness')
    if (bodyModeForRawParameters() !== 'stackable') return field
    const stackableUiFloor = 3
    if (field.min >= stackableUiFloor) return field
    return { ...field, min: stackableUiFloor, sliderMin: stackableUiFloor }
  }

  const wallField = $derived(wallFieldFor())
  const wallValue = $derived(valueFor(wallField))

  function layoutForRawParameters() {
    const numberFor = (key: string, fallback: number): number =>
      Number(rawParameters[key] ?? String(fallback))
    const candidate = {
      holeCountX: numberFor(
        'holeCountX',
        OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeCountX,
      ),
      holeCountY: numberFor(
        'holeCountY',
        OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeCountY,
      ),
      holeSpacingMode: spacingModeForRawParameters(),
      holeSpacingX: numberFor(
        'holeSpacingX',
        OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeSpacingX,
      ),
      holeSpacingY: numberFor(
        'holeSpacingY',
        spacingModeForRawParameters() === 'linked'
          ? Number(
              rawParameters.holeSpacingX ??
                OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeSpacingX,
            )
          : OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeSpacingY,
      ),
      holeShape: shapeForRawParameters(),
      holeDiameter: numberFor(
        'holeDiameter',
        OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeDiameter,
      ),
      holeDepth: numberFor(
        'holeDepth',
        OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.holeDepth,
      ),
      bottomThickness: numberFor(
        'bottomThickness',
        OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.bottomThickness,
      ),
      wallThickness: numberFor(
        'wallThickness',
        OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.wallThickness,
      ),
      cornerSeatMode: seatModeForRawParameters(),
      boxMode: bodyModeForRawParameters(),
      stackingClearanceHeight: numberFor(
        'stackingClearanceHeight',
        OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS.stackingClearanceHeight,
      ),
    } satisfies OpenGridOrganizerBoxParameters
    const validation = validateOpenGridOrganizerBoxParameters(candidate)
    return validation.valid
      ? openGridOrganizerBoxLayoutFor(validation.value)
      : null
  }

  let layout = $derived(layoutForRawParameters())

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
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p class="text-sm text-muted-foreground">
    {translate(locale, 'panel.organizerBox.description')}
  </p>

  <fieldset
    class="grid gap-2 border-0 p-0"
    aria-describedby={fieldErrors.cornerSeatMode
      ? 'cornerSeatMode-error'
      : undefined}
    aria-invalid={Boolean(fieldErrors.cornerSeatMode)}
    aria-label={translate(locale, 'panel.seat.mode')}
    role="radiogroup"
    data-testid="opengrid-organizer-box-seat-mode"
  >
    <legend class="font-[650]">{translate(locale, 'panel.seat.mode')}</legend>
    <div class="flex flex-wrap gap-x-4 gap-y-2">
      {#each seatOptions as option (option.value)}
        <label class="flex min-w-0 items-start gap-2">
          <input
            aria-label={translate(locale, option.labelKey)}
            class="mt-1 accent-primary"
            name="opengrid-organizer-box-seat-mode"
            type="radio"
            value={option.value}
            checked={seatModeForRawParameters() === option.value}
            onchange={handleSeatModeChange}
          />
          <span class="font-[650]">{translate(locale, option.labelKey)}</span>
        </label>
      {/each}
    </div>
    <span class="text-sm text-muted-foreground">
      {translate(
        locale,
        seatOptions.find(
          (option) => option.value === seatModeForRawParameters(),
        )!.descriptionKey,
      )}
    </span>
    {#if fieldErrors.cornerSeatMode}
      <span id="cornerSeatMode-error" class="text-sm text-error" role="alert">
        {formatValidationIssue(locale, fieldErrors.cornerSeatMode)}
      </span>
    {/if}
  </fieldset>

  <fieldset
    class="grid gap-2 border-0 p-0"
    aria-describedby={fieldErrors.boxMode ? 'boxMode-error' : undefined}
    aria-invalid={Boolean(fieldErrors.boxMode)}
    aria-label={translate(locale, 'panel.boxMode')}
    role="radiogroup"
    data-testid="opengrid-organizer-box-body-mode"
  >
    <legend class="font-[650]">{translate(locale, 'panel.boxMode')}</legend>
    <div class="flex flex-wrap gap-x-4 gap-y-2">
      {#each bodyOptions as option (option.value)}
        <label class="flex min-w-0 items-start gap-2">
          <input
            aria-label={translate(locale, option.labelKey)}
            class="mt-1 accent-primary"
            name="opengrid-organizer-box-body-mode"
            type="radio"
            value={option.value}
            checked={bodyModeForRawParameters() === option.value}
            onchange={handleBodyModeChange}
          />
          <span class="font-[650]">{translate(locale, option.labelKey)}</span>
        </label>
      {/each}
    </div>
    <span class="text-sm text-muted-foreground">
      {translate(
        locale,
        bodyOptions.find(
          (option) => option.value === bodyModeForRawParameters(),
        )!.descriptionKey,
      )}
    </span>
    {#if fieldErrors.boxMode}
      <span id="boxMode-error" class="text-sm text-error" role="alert">
        {formatValidationIssue(locale, fieldErrors.boxMode)}
      </span>
    {/if}
  </fieldset>

  {#if bodyModeForRawParameters() === 'stackable'}
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

  <fieldset
    class="grid gap-2 border-0 p-0"
    aria-label={translate(locale, 'panel.organizerBox.spacingMode')}
    role="radiogroup"
    data-testid="opengrid-organizer-box-spacing-mode"
  >
    <legend class="font-[650]">
      {translate(locale, 'panel.organizerBox.spacingMode')}
    </legend>
    <div class="flex flex-wrap gap-x-4 gap-y-2">
      {#each spacingOptions as option (option.value)}
        <label class="flex min-w-0 items-start gap-2">
          <input
            aria-label={translate(locale, option.labelKey)}
            class="mt-1 accent-primary"
            name="opengrid-organizer-box-spacing-mode"
            type="radio"
            value={option.value}
            checked={spacingModeForRawParameters() === option.value}
            onchange={handleSpacingModeChange}
          />
          <span class="font-[650]">{translate(locale, option.labelKey)}</span>
        </label>
      {/each}
    </div>
    <span class="text-sm text-muted-foreground">
      {translate(
        locale,
        spacingOptions.find(
          (option) => option.value === spacingModeForRawParameters(),
        )!.descriptionKey,
      )}
    </span>
  </fieldset>

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
    {#each spacingKeysForRawParameters() as key (key)}
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
          spacingModeForRawParameters() === 'linked'
            ? handleLinkedSpacingChange(String(field.defaultValue))
            : onInputChange(field.key, String(field.defaultValue))}
      >
        <ParameterControl
          {locale}
          {field}
          {value}
          error={fieldErrors[field.key] ?? fieldErrors.holeSpacingY}
          onChange={(nextValue) =>
            spacingModeForRawParameters() === 'linked'
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
      value={shapeForRawParameters()}
      onchange={handleShapeChange}
    >
      {#each shapeOptions as option (option.value)}
        <option value={option.value}
          >{translate(locale, option.labelKey)}</option
        >
      {/each}
    </select>
  </ParameterField>

  {#each [fieldFor('holeDiameter'), fieldFor('holeDepth'), fieldFor('bottomThickness')] as field (field.key)}
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
</fieldset>
