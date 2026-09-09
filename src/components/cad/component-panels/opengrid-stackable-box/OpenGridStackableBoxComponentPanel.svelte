<script lang="ts">
  import {
    displayParameterLabel,
    opengridStackableBoxDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    openGridStackableBoxOpeningBottomLengthMaximumFor,
    validateOpenGridStackableBoxParameters,
    OPENGRID_STACKABLE_BOX_CONFIGURATION,
    OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
    type OpenGridStackableBoxOpeningDirection,
    type OpenGridStackableBoxOpeningParameterKey,
    type OpenGridStackableBoxParameters,
  } from '../../../../cad-contract/units'
  import { openGridStackableBoxHoneycombPanelCellCountFor } from '../../../../cad-kernel/lattice/opengrid-honeycomb-cells'
  import { calculateOpenGridStackableBoxCounts } from '../../../../features/cad/grid-dimensions'
  import GridDimensionCalculator from '../GridDimensionCalculator.svelte'
  import HoneycombCellCountEstimate from '../HoneycombCellCountEstimate.svelte'
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

  function handleDimensionCalculation(parameters: {
    rows: number
    columns: number
  }): void {
    onInputChange('x', String(parameters.columns))
    onInputChange('y', String(parameters.rows))
  }

  type BoxMode = 'default' | 'thin-shell'
  type BoxSeatMode = 'none' | 'detachable-corner-seat' | 'integrated'

  const seatModeOptions: ReadonlyArray<{
    value: BoxSeatMode
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

  function seatModeForRawParameters(): BoxSeatMode {
    const value = rawParameters.cornerSeatMode
    if (value === 'none' || value === 'integrated') return value
    return 'detachable-corner-seat'
  }

  function handleSeatModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (!event.currentTarget.checked) return
    onInputChange('cornerSeatMode', event.currentTarget.value)
  }

  function handleModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    const mode = event.currentTarget.value as BoxMode
    onInputChange('basePlateMode', 'false')
    onInputChange('thinShellMode', String(mode === 'thin-shell'))
  }

  function modeErrorDescriptionId(): string | undefined {
    const ids: string[] = []
    if (fieldErrors.basePlateMode) ids.push('basePlateMode-error')
    if (fieldErrors.thinShellMode) ids.push('thinShellMode-error')
    return ids.length > 0 ? ids.join(' ') : undefined
  }

  const openingGroups = [
    {
      direction: '-Y',
      labelKey: 'panel.opening.direction.front',
      keys: [
        'openingMinusYDepth',
        'openingMinusYBottomLength',
        'openingMinusYAngle',
      ],
    },
    {
      direction: '+Y',
      labelKey: 'panel.opening.direction.back',
      keys: [
        'openingPlusYDepth',
        'openingPlusYBottomLength',
        'openingPlusYAngle',
      ],
    },
    {
      direction: '-X',
      labelKey: 'panel.opening.direction.left',
      keys: [
        'openingMinusXDepth',
        'openingMinusXBottomLength',
        'openingMinusXAngle',
      ],
    },
    {
      direction: '+X',
      labelKey: 'panel.opening.direction.right',
      keys: [
        'openingPlusXDepth',
        'openingPlusXBottomLength',
        'openingPlusXAngle',
      ],
    },
  ] as const

  type OpeningGroupOpenState = Record<
    OpenGridStackableBoxOpeningDirection,
    boolean
  >

  let openingDisclosureOpen = $state(false)
  let openingGroupOpen = $state<OpeningGroupOpenState>({
    '-Y': false,
    '+Y': false,
    '-X': false,
    '+X': false,
  })
  let previousOpeningValueSignature: string | undefined

  function rawNumberFor(key: string): number | null {
    const rawValue = rawParameters[key as keyof typeof rawParameters]
    if (rawValue === undefined || rawValue.trim() === '') return null
    const value = Number(rawValue)
    return Number.isFinite(value) ? value : null
  }

  function openingGroupHasNonDefaultValue(
    group: (typeof openingGroups)[number],
  ): boolean {
    return group.keys.some((key) => {
      const rawValue = rawParameters[key]
      if (rawValue === undefined || rawValue.trim() === '') return false
      const value = Number(rawValue)
      if (!Number.isFinite(value)) return true
      return value !== OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS[key]
    })
  }

  function hasNonDefaultOpeningValues(): boolean {
    return openingGroups.some(openingGroupHasNonDefaultValue)
  }

  function openingValueSignatureForRawParameters(): string {
    return OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS.map(
      (key) => rawParameters[key] ?? '',
    ).join('|')
  }

  $effect(() => {
    const signature = openingValueSignatureForRawParameters()
    if (signature === previousOpeningValueSignature) return
    previousOpeningValueSignature = signature

    for (const group of openingGroups) {
      openingGroupOpen[group.direction] = openingGroupHasNonDefaultValue(group)
    }
    openingDisclosureOpen = hasNonDefaultOpeningValues()
  })

  function parametersForRange(): OpenGridStackableBoxParameters | null {
    const x = rawNumberFor('x')
    const y = rawNumberFor('y')
    const height = rawNumberFor('height')
    if (x === null || y === null || height === null) return null

    const openingValues = {} as Record<
      OpenGridStackableBoxOpeningParameterKey,
      number
    >
    for (const key of OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS) {
      openingValues[key] =
        rawNumberFor(key) ?? OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS[key]
    }

    return {
      x,
      y,
      height,
      cornerSeatMode: seatModeForRawParameters(),
      fullBottomHoleGrid: rawParameters.fullBottomHoleGrid === 'true',
      basePlateMode: rawParameters.basePlateMode === 'true',
      thinShellMode: rawParameters.thinShellMode === 'true',
      honeycombMode: rawParameters.honeycombMode === 'true',
      ...openingValues,
    }
  }

  let honeycombCellCount = $derived.by(() => {
    if (rawParameters.honeycombMode !== 'true') return null
    const candidate = parametersForRange()
    if (!candidate) return null
    const validation = validateOpenGridStackableBoxParameters(candidate)
    if (!validation.valid) return null
    return openGridStackableBoxHoneycombPanelCellCountFor(validation.value)
  })

  function fieldsFor(
    keys: readonly OpenGridStackableBoxOpeningParameterKey[],
    direction: OpenGridStackableBoxOpeningDirection,
    displayDirection: string,
  ): ParameterFieldDefinition[] {
    return keys.flatMap((key) => {
      const field = opengridStackableBoxDefinition.parameterSchema.find(
        (candidate) => candidate.key === key,
      )
      if (!field) return []
      const displayedField = { ...field, axis: displayDirection }
      if (field.key.endsWith('BottomLength')) {
        const depth = rawNumberFor(keys[0])
        const minimum =
          depth !== null && depth > 0
            ? 1
            : OPENGRID_STACKABLE_BOX_CONFIGURATION.openingBottomLengthMin
        const parameters = parametersForRange()
        let calculatedMaximum = field.max
        if (parameters) {
          calculatedMaximum = openGridStackableBoxOpeningBottomLengthMaximumFor(
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

      const height = rawNumberFor('height')
      if (height === null) return [displayedField]
      const maximum = Math.max(field.min, Math.min(field.max, height))
      return [{ ...displayedField, max: maximum, sliderMax: maximum }]
    })
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <GridDimensionCalculator
    {locale}
    calculate={calculateOpenGridStackableBoxCounts}
    description=""
    onApply={handleDimensionCalculation}
  />
  <div class="grid gap-2">
    <fieldset
      class="grid gap-2 border-0 p-0"
      aria-describedby={fieldErrors.cornerSeatMode
        ? 'cornerSeatMode-error'
        : undefined}
      aria-invalid={Boolean(fieldErrors.cornerSeatMode)}
      aria-label={translate(locale, 'panel.seat.mode')}
      role="radiogroup"
      data-testid="opengrid-stackable-box-seat-mode"
    >
      <legend class="font-[650]">{translate(locale, 'panel.seat.mode')}</legend>
      <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
        {#each seatModeOptions as option (option.value)}
          <label class="flex min-w-0 items-start gap-2">
            <input
              aria-label={translate(locale, option.labelKey)}
              class="mt-1 accent-primary"
              name="opengrid-stackable-box-seat-mode"
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
        {seatModeOptions.find(
          (option) => option.value === seatModeForRawParameters(),
        )?.descriptionKey
          ? translate(
              locale,
              seatModeOptions.find(
                (option) => option.value === seatModeForRawParameters(),
              )!.descriptionKey,
            )
          : ''}
      </span>
    </fieldset>
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
    <label class="flex min-w-0 items-start gap-2">
      <input
        class="mt-1 accent-primary"
        type="checkbox"
        aria-label={translate(locale, 'panel.honeycomb')}
        data-testid="opengrid-stackable-box-honeycomb-mode"
        checked={rawParameters.honeycombMode === 'true'}
        onchange={(event) => {
          if (!(event.currentTarget instanceof HTMLInputElement)) return
          onInputChange('honeycombMode', String(event.currentTarget.checked))
        }}
      />
      <span class="font-[650]">{translate(locale, 'panel.honeycomb')}</span>
      <span
        class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
      >
        {translate(locale, 'panel.honeycombBeta')}
      </span>
    </label>
    {#if rawParameters.honeycombMode === 'true'}
      <HoneycombRenderWarning {locale} />
      {#if honeycombCellCount !== null}
        <HoneycombCellCountEstimate count={honeycombCellCount} {locale} />
      {/if}
    {/if}
  </div>
  <div
    aria-describedby={modeErrorDescriptionId()}
    aria-invalid={Boolean(
      fieldErrors.basePlateMode || fieldErrors.thinShellMode,
    )}
    aria-label={translate(locale, 'panel.boxMode')}
    class="grid gap-1"
    role="radiogroup"
  >
    <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
      <label class="flex min-w-0 items-start gap-2">
        <input
          aria-describedby={modeErrorDescriptionId()}
          aria-label={translate(locale, 'panel.thinShell')}
          class="mt-1 accent-primary"
          data-testid="opengrid-stackable-box-thin-shell-mode"
          name="opengrid-stackable-box-mode"
          type="radio"
          value="thin-shell"
          checked={rawParameters.thinShellMode === 'true'}
          onchange={handleModeChange}
        />
        <span class="font-[650]">{translate(locale, 'panel.thinShell')}</span>
      </label>
      <label class="flex min-w-0 items-start gap-2">
        <input
          aria-describedby={modeErrorDescriptionId()}
          aria-label={translate(locale, 'panel.stackable')}
          class="mt-1 accent-primary"
          data-testid="opengrid-stackable-box-default-mode"
          name="opengrid-stackable-box-mode"
          type="radio"
          value="default"
          checked={rawParameters.basePlateMode !== 'true' &&
            rawParameters.thinShellMode !== 'true'}
          onchange={handleModeChange}
        />
        <span class="font-[650]">{translate(locale, 'panel.stackable')}</span>
      </label>
    </div>
    {#if rawParameters.thinShellMode === 'true'}
      <span class="text-sm text-muted-foreground">
        {translate(locale, 'panel.thinShellDescription')}
      </span>
    {:else}
      <span class="text-sm text-muted-foreground">
        {translate(locale, 'panel.stackableDescription')}
      </span>
    {/if}
  </div>
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
  {#if fieldErrors.basePlateMode}
    <span class="text-sm text-error" id="basePlateMode-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.basePlateMode)}</span
    >
  {/if}
  {#if fieldErrors.thinShellMode}
    <span class="text-sm text-error" id="thinShellMode-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.thinShellMode)}</span
    >
  {/if}
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
  <details
    class="grid gap-3 rounded-lg border border-border-field p-3"
    data-testid="opengrid-stackable-box-opening-disclosure"
    bind:open={openingDisclosureOpen}
  >
    <summary class="cursor-pointer font-[650]">
      {translate(locale, 'panel.opening.settings')}
    </summary>
    <div class="grid gap-3 pt-1">
      {#each openingGroups as group (group.direction)}
        <details
          class="grid gap-3 rounded-lg border border-border-field p-3"
          data-direction={group.direction}
          data-testid={`opengrid-stackable-box-opening-group-${group.direction}`}
          bind:open={openingGroupOpen[group.direction]}
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
