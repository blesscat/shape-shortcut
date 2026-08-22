<script lang="ts">
  import {
    displayParameterLabel,
    opengridStackableCylinderDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    openGridStackableCylinderOpeningBottomLengthMaximumFor,
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
    OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
    type OpenGridStackableCylinderOpeningDirection,
    type OpenGridStackableCylinderOpeningParameterKey,
    type OpenGridStackableCylinderParameters,
    type OpenGridStackableCylinderSeatMode,
  } from '../../../../cad-contract/units'
  import HoneycombRenderWarning from '../HoneycombRenderWarning.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import type { ParameterField as ParameterFieldDefinition } from '../../../../features/cad/model-catalog'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import { translate } from '../../../../i18n'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()
  let thinBottomMode = $derived(rawParameters.thinBottomMode === 'true')
  let bottomPlateMode = $derived(rawParameters.bottomPlateMode === 'true')

  type CylinderMode = 'default' | 'thin' | 'bottom-plate'
  type CylinderSeatMode = OpenGridStackableCylinderSeatMode

  const seatModeOptions: ReadonlyArray<{
    value: CylinderSeatMode
    labelKey: string
    descriptionKey: string
  }> = [
    {
      value: 'none',
      labelKey: 'panel.seat.none',
      descriptionKey: 'panel.seat.noneDescription',
    },
    {
      value: 'hole',
      labelKey: 'panel.seat.hole',
      descriptionKey: 'panel.seat.holeDescription',
    },
    {
      value: 'integrated',
      labelKey: 'panel.seat.integrated',
      descriptionKey: 'panel.seat.integratedDescription',
    },
    {
      value: 'center-hook',
      labelKey: 'panel.seat.centerHook',
      descriptionKey: 'panel.seat.centerHookDescription',
    },
  ]

  function seatModeForRawParameters(): CylinderSeatMode {
    const value = rawParameters.bottomSeatMode
    if (value === 'none' || value === 'integrated' || value === 'center-hook') {
      return value
    }
    return 'hole'
  }

  function seatModeDescription(): string {
    const option = seatModeOptions.find(
      (candidate) => candidate.value === seatModeForRawParameters(),
    )
    return option ? translate(locale, option.descriptionKey) : ''
  }

  function onSeatModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (!event.currentTarget.checked) return
    onInputChange('bottomSeatMode', event.currentTarget.value)
  }

  function modeFor(isThin: boolean, isBottomPlate: boolean): CylinderMode {
    if (isBottomPlate) return 'bottom-plate'
    if (isThin) return 'thin'
    return 'default'
  }

  function modeSummary(mode: CylinderMode): string {
    if (mode === 'thin') return translate(locale, 'panel.thinShellDescription')
    return translate(locale, 'panel.stackableDescription')
  }

  function onModeChange(mode: CylinderMode): void {
    if (mode === 'thin') {
      onInputChange('bottomPlateMode', 'false')
      onInputChange('thinBottomMode', 'true')
      return
    }
    if (mode === 'bottom-plate') {
      onInputChange('thinBottomMode', 'false')
      onInputChange('bottomPlateMode', 'true')
      return
    }
    onInputChange('thinBottomMode', 'false')
    onInputChange('bottomPlateMode', 'false')
  }

  function onModeRadioChange(mode: CylinderMode, event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (!event.currentTarget.checked) return
    onModeChange(mode)
  }

  let activeMode = $derived(modeFor(thinBottomMode, bottomPlateMode))

  function floorThicknessForMode(mode: CylinderMode): number {
    if (mode === 'default') {
      return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultFloorThickness
    }
    if (mode === 'thin') {
      return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.thinFloorThickness
    }
    return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.floorThickness
  }

  const openingGroups = [
    {
      direction: '-Y',
      labelKey: 'panel.opening.direction.front',
      defaultOpen: true,
      keys: [
        'openingMinusYDepth',
        'openingMinusYBottomLength',
        'openingMinusYAngle',
      ],
    },
    {
      direction: '+Y',
      labelKey: 'panel.opening.direction.back',
      defaultOpen: false,
      keys: [
        'openingPlusYDepth',
        'openingPlusYBottomLength',
        'openingPlusYAngle',
      ],
    },
    {
      direction: '-X',
      labelKey: 'panel.opening.direction.left',
      defaultOpen: false,
      keys: [
        'openingMinusXDepth',
        'openingMinusXBottomLength',
        'openingMinusXAngle',
      ],
    },
    {
      direction: '+X',
      labelKey: 'panel.opening.direction.right',
      defaultOpen: false,
      keys: [
        'openingPlusXDepth',
        'openingPlusXBottomLength',
        'openingPlusXAngle',
      ],
    },
  ] as const

  function rawNumberFor(key: string): number | null {
    const rawValue = rawParameters[key as keyof typeof rawParameters]
    if (rawValue === undefined || rawValue.trim() === '') return null
    const value = Number(rawValue)
    return Number.isFinite(value) ? value : null
  }

  function parametersForRange(): OpenGridStackableCylinderParameters | null {
    const diameter = rawNumberFor('diameter')
    const height = rawNumberFor('height')
    if (diameter === null || height === null) return null

    const openingValues = {} as Record<
      OpenGridStackableCylinderOpeningParameterKey,
      number
    >
    for (const key of OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS) {
      const value = rawNumberFor(key)
      if (value === null) return null
      openingValues[key] = value
    }

    return {
      diameter,
      height,
      thinBottomMode: rawParameters.thinBottomMode === 'true',
      bottomPlateMode: rawParameters.bottomPlateMode === 'true',
      bottomSeatMode: seatModeForRawParameters(),
      honeycombMode: rawParameters.honeycombMode === 'true',
      ...openingValues,
    }
  }

  function fieldsFor(
    keys: readonly string[],
    direction: OpenGridStackableCylinderOpeningDirection,
    displayDirection: string,
  ): ParameterFieldDefinition[] {
    return keys.flatMap((key) => {
      const field = opengridStackableCylinderDefinition.parameterSchema.find(
        (candidate) => candidate.key === key,
      )
      if (!field) return []
      const displayedField = { ...field, axis: displayDirection }
      if (field.key.endsWith('BottomLength')) {
        const depth = rawNumberFor(keys[0] ?? '')
        const minimum =
          depth !== null && depth > 0
            ? 1
            : OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMin
        const parameters = parametersForRange()
        let calculatedMaximum = field.max
        if (parameters) {
          calculatedMaximum =
            openGridStackableCylinderOpeningBottomLengthMaximumFor(
              parameters,
              direction,
            )
        }
        const maximum = Math.max(
          minimum,
          Math.min(field.max, calculatedMaximum),
        )
        return [
          {
            ...displayedField,
            min: minimum,
            max: maximum,
            sliderMin: minimum,
            sliderMax: maximum,
          },
        ]
      }
      if (!field.key.endsWith('Depth')) return [displayedField]

      const height = Number(rawParameters.height)
      if (!Number.isFinite(height)) return [displayedField]
      const maximum = Math.max(
        field.min,
        Math.min(field.max, height - floorThicknessForMode(activeMode)),
      )
      return [{ ...displayedField, max: maximum, sliderMax: maximum }]
    })
  }
</script>

<fieldset
  class="m-0 grid gap-3 border-0 p-0"
  aria-label={translate(locale, 'panel.boxMode')}
>
  <div
    class="flex items-center gap-4 whitespace-nowrap"
    data-testid="opengrid-cylinder-mode-options"
  >
    <label class="flex items-center gap-2 text-sm">
      <input
        type="radio"
        name="opengrid-stackable-cylinder-bottom-mode"
        aria-label={translate(locale, 'panel.thinShell')}
        checked={activeMode === 'thin'}
        onchange={(event) => onModeRadioChange('thin', event)}
      />
      <span>{translate(locale, 'panel.thinShell')}</span>
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input
        type="radio"
        name="opengrid-stackable-cylinder-bottom-mode"
        aria-label={translate(locale, 'panel.stackable')}
        checked={activeMode === 'default'}
        onchange={(event) => onModeRadioChange('default', event)}
      />
      <span>{translate(locale, 'panel.stackable')}</span>
    </label>
  </div>
  <p
    class="m-0 text-sm text-muted"
    data-testid="opengrid-cylinder-mode-description"
    aria-live="polite"
  >
    {modeSummary(activeMode)}
  </p>
  <fieldset
    class="grid gap-2 border-0 p-0"
    aria-describedby={fieldErrors.bottomSeatMode
      ? 'bottomSeatMode-error'
      : undefined}
    aria-invalid={Boolean(fieldErrors.bottomSeatMode)}
    aria-label={translate(locale, 'panel.seat.mode')}
    role="radiogroup"
    data-testid="opengrid-stackable-cylinder-seat-mode"
  >
    <legend class="font-[650]">{translate(locale, 'panel.seat.mode')}</legend>
    <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
      {#each seatModeOptions as option (option.value)}
        <label class="flex items-start gap-2 text-sm">
          <input
            class="mt-0.5"
            type="radio"
            name="opengrid-stackable-cylinder-seat-mode"
            aria-label={translate(locale, option.labelKey)}
            value={option.value}
            checked={seatModeForRawParameters() === option.value}
            onchange={onSeatModeChange}
          />
          <span>{translate(locale, option.labelKey)}</span>
        </label>
      {/each}
    </div>
    <span class="text-sm text-muted">
      {seatModeDescription()}
    </span>
    {#if fieldErrors.bottomSeatMode}
      <span class="text-sm text-error" id="bottomSeatMode-error" role="alert">
        {formatValidationIssue(locale, fieldErrors.bottomSeatMode)}
      </span>
    {/if}
  </fieldset>
  <label class="flex items-start gap-2 text-sm">
    <input
      class="mt-0.5"
      type="checkbox"
      aria-label={translate(locale, 'panel.honeycomb')}
      data-testid="opengrid-stackable-cylinder-honeycomb-mode"
      checked={rawParameters.honeycombMode === 'true'}
      onchange={(event) => {
        if (!(event.currentTarget instanceof HTMLInputElement)) return
        onInputChange('honeycombMode', String(event.currentTarget.checked))
      }}
    />
    <span>{translate(locale, 'panel.honeycomb')}</span>
  </label>
  {#if rawParameters.honeycombMode === 'true'}
    <HoneycombRenderWarning {locale} />
  {/if}
  {#each opengridStackableCylinderDefinition.parameterSchema.slice(0, 2) as field (field.key)}
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
  <details
    class="grid gap-3 rounded-lg border border-border-field p-3"
    data-testid="opengrid-cylinder-opening-disclosure"
  >
    <summary class="cursor-pointer font-[650]">
      {translate(locale, 'panel.opening.settings')}
    </summary>
    <div class="grid gap-3 pt-1">
      {#each openingGroups as group (group.direction)}
        <details
          class="grid gap-3 rounded-lg border border-border-field p-3"
          data-direction={group.direction}
          data-testid={`opengrid-cylinder-opening-group-${group.direction}`}
          open={group.defaultOpen}
        >
          <summary class="cursor-pointer font-[650]">
            {translate(locale, group.labelKey)}
          </summary>
          <fieldset class="grid gap-3 border-0 p-0 pt-1">
            {#each fieldsFor(group.keys, group.direction, translate(locale, group.labelKey)) as field (field.key)}
              {@const value =
                rawParameters[field.key] ?? String(field.defaultValue)}
              <ParameterField
                {locale}
                label={displayParameterLabel(field, locale)}
                unit={unitLabelFor(locale, field.unit)}
                changed={value !== String(field.defaultValue)}
                error={fieldErrors[field.key]}
                errorId={`${field.key}-error`}
                onRestore={() =>
                  onInputChange(field.key, String(field.defaultValue))}
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
        </details>
      {/each}
    </div>
  </details>
</fieldset>
