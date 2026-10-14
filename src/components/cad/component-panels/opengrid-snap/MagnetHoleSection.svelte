<script lang="ts">
  import {
    type ModelParameterKey,
    type OpenGridSnapParameters,
  } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    opengridSnapDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import { translate } from '../../../../i18n'
  import type { ComponentPanelProps } from '../types'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import { magnetDimensionKeys } from './magnet-rules'

  type Props = ComponentPanelProps & {
    parameters: OpenGridSnapParameters
  }

  let { locale, parameters, rawParameters, fieldErrors, onInputChange }: Props =
    $props()

  const magnetLengthField = opengridSnapDefinition.parameterSchema.find(
    (field) => field.key === 'magnetHoleLength',
  )!
  const magnetWidthField = opengridSnapDefinition.parameterSchema.find(
    (field) => field.key === 'magnetHoleWidth',
  )!
  const magnetDiameterField = opengridSnapDefinition.parameterSchema.find(
    (field) => field.key === 'magnetHoleDiameter',
  )!
  const magnetThicknessField = opengridSnapDefinition.parameterSchema.find(
    (field) => field.key === 'magnetHoleThickness',
  )!

  function fieldError(field: ModelParameterKey | 'parameters') {
    return fieldErrors[field]
  }

  let rawFootprint = $derived(rawParameters.footprint ?? parameters.footprint)
  let rawMagnetHoleShape = $derived(
    rawParameters.magnetHoleShape ?? parameters.magnetHoleShape,
  )
  let rawMagnetHoleLength = $derived(
    rawParameters.magnetHoleLength ?? String(parameters.magnetHoleLength),
  )
  let rawMagnetHoleWidth = $derived(
    rawParameters.magnetHoleWidth ?? String(parameters.magnetHoleWidth),
  )
  let rawMagnetHoleDiameter = $derived(
    rawParameters.magnetHoleDiameter ?? String(parameters.magnetHoleDiameter),
  )
  let rawMagnetHoleThickness = $derived(
    rawParameters.magnetHoleThickness ?? String(parameters.magnetHoleThickness),
  )
  let magnetHoleIsActive = $derived(rawMagnetHoleShape !== 'none')
  let magnetFeaturesAreDisabled = $derived(rawFootprint !== 'full')
  let magnetControlsAreDisabled = $derived(magnetFeaturesAreDisabled)
  let magnetDimensionControlsAreDisabled = $derived(
    magnetControlsAreDisabled || !magnetHoleIsActive,
  )

  function initializeMagnetDimension(
    key: (typeof magnetDimensionKeys)[number],
    rawValue: string,
    minimum: number,
    defaultValue: number,
  ): void {
    const numericValue = Number(rawValue)
    if (!Number.isFinite(numericValue) || numericValue < minimum) {
      onInputChange(key, String(defaultValue))
    }
  }

  function updateMagnetShape(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    if (magnetControlsAreDisabled) return
    const shape = event.currentTarget.value
    if (shape !== 'none' && shape !== 'square' && shape !== 'round') return

    onInputChange('magnetHoleShape', shape)
    if (shape === 'none') {
      for (const key of magnetDimensionKeys) onInputChange(key, '0')
      return
    }

    onInputChange('fourCornerLocatingHoles', 'false')
    onInputChange('centerRemoverHole', 'false')
    initializeMagnetDimension(
      'magnetHoleThickness',
      rawMagnetHoleThickness,
      magnetThicknessField.min,
      magnetThicknessField.defaultValue,
    )
    if (shape === 'square') {
      initializeMagnetDimension(
        'magnetHoleLength',
        rawMagnetHoleLength,
        magnetLengthField.min,
        magnetLengthField.defaultValue,
      )
      initializeMagnetDimension(
        'magnetHoleWidth',
        rawMagnetHoleWidth,
        magnetWidthField.min,
        magnetWidthField.defaultValue,
      )
      onInputChange('magnetHoleDiameter', '0')
    } else {
      initializeMagnetDimension(
        'magnetHoleDiameter',
        rawMagnetHoleDiameter,
        magnetDiameterField.min,
        magnetDiameterField.defaultValue,
      )
      onInputChange('magnetHoleLength', '0')
      onInputChange('magnetHoleWidth', '0')
    }
  }
</script>

<ParameterField
  {locale}
  label={translate(locale, 'panel.snap.magnetHole')}
  error={fieldError('magnetHoleShape')}
  errorId="opengrid-snap-magnet-hole-shape-error"
>
  <select
    class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
    aria-label={translate(locale, 'panel.snap.magnetHoleAria')}
    aria-describedby={fieldError('magnetHoleShape')
      ? 'opengrid-snap-magnet-hole-shape-error'
      : undefined}
    aria-invalid={Boolean(fieldError('magnetHoleShape'))}
    value={rawMagnetHoleShape}
    disabled={magnetControlsAreDisabled}
    onchange={updateMagnetShape}
  >
    <option value="none">{translate(locale, 'panel.snap.magnetNone')}</option>
    <option value="square"
      >{translate(locale, 'panel.snap.magnetSquare')}</option
    >
    <option value="round">{translate(locale, 'panel.snap.magnetRound')}</option>
  </select>
  {#if magnetControlsAreDisabled}
    <p class="m-0 text-sm text-muted-foreground" role="status">
      {translate(locale, 'panel.snap.magnetHoleInvalid')}
    </p>
  {/if}
</ParameterField>

{#if rawMagnetHoleShape === 'square' || rawMagnetHoleShape === 'round'}
  <div class="grid grid-cols-2 gap-2">
    {#if rawMagnetHoleShape === 'square'}
      <ParameterField
        {locale}
        label={displayParameterLabel(magnetLengthField, locale)}
        unit={unitLabelFor(locale, magnetLengthField.unit)}
        error={fieldError('magnetHoleLength')}
        errorId="opengrid-snap-magnet-hole-length-error"
      >
        <ParameterControl
          {locale}
          field={magnetLengthField}
          value={rawMagnetHoleLength}
          error={fieldError('magnetHoleLength')}
          disabled={magnetDimensionControlsAreDisabled}
          onChange={(nextValue) => onInputChange('magnetHoleLength', nextValue)}
        />
      </ParameterField>
      <ParameterField
        {locale}
        label={displayParameterLabel(magnetWidthField, locale)}
        unit={unitLabelFor(locale, magnetWidthField.unit)}
        error={fieldError('magnetHoleWidth')}
        errorId="opengrid-snap-magnet-hole-width-error"
      >
        <ParameterControl
          {locale}
          field={magnetWidthField}
          value={rawMagnetHoleWidth}
          error={fieldError('magnetHoleWidth')}
          disabled={magnetDimensionControlsAreDisabled}
          onChange={(nextValue) => onInputChange('magnetHoleWidth', nextValue)}
        />
      </ParameterField>
    {:else}
      <ParameterField
        {locale}
        label={displayParameterLabel(magnetDiameterField, locale)}
        unit={unitLabelFor(locale, magnetDiameterField.unit)}
        error={fieldError('magnetHoleDiameter')}
        errorId="opengrid-snap-magnet-hole-diameter-error"
      >
        <ParameterControl
          {locale}
          field={magnetDiameterField}
          value={rawMagnetHoleDiameter}
          error={fieldError('magnetHoleDiameter')}
          disabled={magnetDimensionControlsAreDisabled}
          onChange={(nextValue) =>
            onInputChange('magnetHoleDiameter', nextValue)}
        />
      </ParameterField>
    {/if}
    <ParameterField
      {locale}
      label={displayParameterLabel(magnetThicknessField, locale)}
      unit={unitLabelFor(locale, magnetThicknessField.unit)}
      error={fieldError('magnetHoleThickness')}
      errorId="opengrid-snap-magnet-hole-thickness-error"
    >
      <ParameterControl
        {locale}
        field={magnetThicknessField}
        value={rawMagnetHoleThickness}
        error={fieldError('magnetHoleThickness')}
        disabled={magnetDimensionControlsAreDisabled}
        onChange={(nextValue) =>
          onInputChange('magnetHoleThickness', nextValue)}
      />
    </ParameterField>
  </div>
{/if}
