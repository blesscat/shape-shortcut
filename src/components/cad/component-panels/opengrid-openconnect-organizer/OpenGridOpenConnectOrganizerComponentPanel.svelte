<script lang="ts">
  import {
    openGridOpenConnectOrganizerLayoutFor,
    OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
    OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    validateOpenGridOpenConnectOrganizerParameters,
    type OpenGridOpenConnectOrganizerParameters,
    type OpenGridOpenConnectOrganizerShape,
    type OpenGridOpenConnectOrganizerSpacingMode,
  } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    opengridOpenConnectOrganizerDefinition,
    unitLabelFor,
    type ParameterField as ParameterFieldDefinition,
  } from '../../../../features/cad/model-catalog'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import { translate } from '../../../../i18n'
  import OpenConnectSettings from '../OpenConnectSettings.svelte'
  import {
    OPENGRID_LABEL_GRID,
    openGridLabelSlotLayoutFor,
    openGridLabelWidthFor,
  } from '../../../../cad-contract/units/opengrid-label-shared'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

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
    'holeWidth',
    'holeHeight',
    'holeCornerRadius',
    'holeDepth',
    'bottomThickness',
    'edgeThickness',
    'tiltAngle',
  ] as const

  const spacingOptions: ReadonlyArray<{
    value: OpenGridOpenConnectOrganizerSpacingMode
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
    value: OpenGridOpenConnectOrganizerShape
    labelKey: string
  }> = [
    { value: 'circle', labelKey: 'panel.organizerBox.shape.circle' },
    { value: 'triangle', labelKey: 'panel.organizerBox.shape.triangle' },
    { value: 'square', labelKey: 'panel.organizerBox.shape.square' },
    { value: 'pentagon', labelKey: 'panel.organizerBox.shape.pentagon' },
    { value: 'hexagon', labelKey: 'panel.organizerBox.shape.hexagon' },
    { value: 'rectangle', labelKey: 'panel.organizerBox.shape.rectangle' },
    { value: 'ellipse', labelKey: 'panel.organizerBox.shape.ellipse' },
  ]

  function fieldFor(
    key: (typeof numericKeys)[number],
  ): ParameterFieldDefinition {
    const field = opengridOpenConnectOrganizerDefinition.parameterSchema.find(
      (candidate) => candidate.key === key,
    )
    if (!field) {
      throw new Error(`OPENCONNECT_ORGANIZER_FIELD_MISSING:${key}`)
    }
    return field
  }

  function valueFor(field: ParameterFieldDefinition): string {
    return rawParameters[field.key] ?? String(field.defaultValue)
  }

  function spacingModeForRawParameters(): OpenGridOpenConnectOrganizerSpacingMode {
    return rawParameters.holeSpacingMode === 'independent'
      ? 'independent'
      : 'linked'
  }

  function shapeForRawParameters(): OpenGridOpenConnectOrganizerShape {
    const value = rawParameters.holeShape
    const supported = shapeOptions.some((option) => option.value === value)
    return supported
      ? (value as OpenGridOpenConnectOrganizerShape)
      : OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeShape
  }

  function spacingKeysForRawParameters(): ReadonlyArray<
    'holeSpacingX' | 'holeSpacingY'
  > {
    return spacingModeForRawParameters() === 'linked'
      ? ['holeSpacingX']
      : ['holeSpacingX', 'holeSpacingY']
  }

  function sizeFieldKeysForRawParameters(): ReadonlyArray<
    (typeof numericKeys)[number]
  > {
    const shape = shapeForRawParameters()
    if (shape === 'rectangle') {
      return ['holeWidth', 'holeHeight', 'holeCornerRadius']
    }
    if (shape === 'ellipse') {
      return ['holeWidth', 'holeHeight']
    }
    return ['holeDiameter']
  }

  function layoutForRawParameters() {
    const numberFor = (key: string, fallback: number): number =>
      Number(rawParameters[key] ?? String(fallback))
    const spacingMode = spacingModeForRawParameters()
    const holeSpacingX = numberFor(
      'holeSpacingX',
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeSpacingX,
    )
    const candidate = {
      holeCountX: numberFor(
        'holeCountX',
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeCountX,
      ),
      holeCountY: numberFor(
        'holeCountY',
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeCountY,
      ),
      holeSpacingMode: spacingMode,
      holeSpacingX,
      holeSpacingY: numberFor(
        'holeSpacingY',
        spacingMode === 'linked'
          ? holeSpacingX
          : OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeSpacingY,
      ),
      holeShape: shapeForRawParameters(),
      holeDiameter: numberFor(
        'holeDiameter',
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeDiameter,
      ),
      holeWidth: numberFor(
        'holeWidth',
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeWidth,
      ),
      holeHeight: numberFor(
        'holeHeight',
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeHeight,
      ),
      holeCornerRadius: numberFor(
        'holeCornerRadius',
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeCornerRadius,
      ),
      holeDepth: numberFor(
        'holeDepth',
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeDepth,
      ),
      bottomThickness: numberFor(
        'bottomThickness',
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.bottomThickness,
      ),
      edgeThickness: numberFor(
        'edgeThickness',
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.edgeThickness,
      ),
      tiltAngle: numberFor(
        'tiltAngle',
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.tiltAngle,
      ),
      topRimEnabled: rawParameters.topRimEnabled === 'true',
      topRimHeight: numberFor(
        'topRimHeight',
        OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultTopRimHeight,
      ),
    } satisfies OpenGridOpenConnectOrganizerParameters
    const validation = validateOpenGridOpenConnectOrganizerParameters(candidate)
    return validation.valid
      ? openGridOpenConnectOrganizerLayoutFor(validation.value)
      : null
  }

  const tiltField = fieldFor('tiltAngle')
  let layout = $derived(layoutForRawParameters())
  let tiltValue = $derived(valueFor(tiltField))

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

  function handleShapeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('holeShape', event.currentTarget.value)
  }

  const topRimHeightField = $derived.by((): ParameterFieldDefinition => {
    const bodyThickness =
      Number(
        rawParameters.holeDepth ??
          String(OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.holeDepth),
      ) +
      Number(
        rawParameters.bottomThickness ??
          String(
            OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.bottomThickness,
          ),
      )
    const max = Math.max(
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.minTopRimHeight,
      Math.floor(bodyThickness / 2),
    )
    return {
      key: 'topRimHeight',
      label: 'parameter.topRimHeight',
      axis: 'Z',
      unit: 'mm',
      control: 'range-text',
      defaultValue:
        OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultTopRimHeight,
      min: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.minTopRimHeight,
      max,
      step: 1,
      sliderMin: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.minTopRimHeight,
      sliderMax: max,
    }
  })
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
      {#each spacingOptions as option (option.value)}
        <label class="flex min-w-0 items-start gap-2">
          <input
            aria-label={translate(locale, option.labelKey)}
            class="mt-1 accent-primary"
            name="opengrid-openconnect-organizer-spacing-mode"
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
    {#if fieldErrors.holeSpacingMode}
      <span id="holeSpacingMode-error" class="text-sm text-error" role="alert">
        {formatValidationIssue(locale, fieldErrors.holeSpacingMode)}
      </span>
    {/if}
  </fieldset>

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

  {#each [...sizeFieldKeysForRawParameters(), 'holeDepth', 'bottomThickness', 'edgeThickness'] as fieldKey (fieldKey)}
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

  <fieldset
    class="grid gap-2 rounded-lg border border-border-field p-3"
    data-testid="organizer-label-slot-panel"
  >
    <label class="flex items-center gap-2">
      <input
        type="checkbox"
        checked={labelEnabled}
        data-testid="organizer-label-slot-enabled"
        onchange={(event) =>
          onInputChange(
            'labelSlotEnabled',
            String(event.currentTarget.checked),
          )}
      />
      {translate(locale, 'parameter.labelSlotEnabled')}
    </label>
    {#if labelEnabled}
      <label for="organizer-label-units" class="text-sm"
        >{translate(locale, 'parameter.labelGridUnits')} · {labelUnits}</label
      >
      <input
        id="organizer-label-units"
        type="range"
        min={OPENGRID_LABEL_GRID.minUnits}
        max={OPENGRID_LABEL_GRID.maxUnits}
        step="1"
        value={labelUnits}
        data-testid="organizer-label-grid-units"
        aria-invalid={Boolean(fieldErrors.labelGridUnits)}
        aria-describedby="organizer-label-fit"
        class="min-w-0 w-full accent-primary"
        oninput={(event) =>
          onInputChange('labelGridUnits', event.currentTarget.value)}
      />
      <p
        class="m-0 text-sm text-muted-foreground"
        data-testid="organizer-label-width-summary"
      >
        {translate(locale, 'panel.openConnectOrganizer.labelWidth', {
          width:
            Number.isFinite(Number(labelUnits)) && labelUnits.trim()
              ? openGridLabelWidthFor(Number(labelUnits))
              : '—',
          max: slotLayout?.maxUnits ?? 0,
        })}
      </p>
      <p class="m-0 text-sm text-muted-foreground">
        {translate(locale, 'panel.openConnectOrganizer.labelHelp')}
      </p>
      <span id="organizer-label-fit" class="text-sm text-error" role="alert">
        {#if fieldErrors.labelGridUnits}{formatValidationIssue(
            locale,
            fieldErrors.labelGridUnits,
          )}{/if}
      </span>
    {/if}
  </fieldset>

  <label class="flex items-start gap-2 text-sm">
    <input
      class="mt-0.5"
      type="checkbox"
      aria-label={translate(locale, 'panel.topRim')}
      data-testid="opengrid-openconnect-organizer-top-rim-enabled"
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
