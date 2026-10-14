<script lang="ts">
  import {
    displayParameterLabel,
    opengridStackableBoxDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    openGridStackableBoxOpeningBottomLengthMaximumFor,
    OPENGRID_STACKABLE_BOX_CONFIGURATION,
    type OpenGridStackableBoxOpeningDirection,
    type OpenGridStackableBoxOpeningParameterKey,
  } from '../../../../cad-contract/units'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import type { ParameterField as ParameterFieldDefinition } from '../../../../features/cad/model-catalog'
  import { translate } from '../../../../i18n'
  import {
    openingGroupHasNonDefaultValue,
    openingGroups,
    openingValueSignatureForRawParameters,
    hasNonDefaultOpeningValues,
    parametersForRange,
    rawNumberFor,
  } from './stackable-box-panel-logic'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

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

  $effect(() => {
    const signature = openingValueSignatureForRawParameters(rawParameters)
    if (signature === previousOpeningValueSignature) return
    previousOpeningValueSignature = signature

    for (const group of openingGroups) {
      openingGroupOpen[group.direction] = openingGroupHasNonDefaultValue(
        rawParameters,
        group,
      )
    }
    openingDisclosureOpen = hasNonDefaultOpeningValues(rawParameters)
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
        const depth = rawNumberFor(rawParameters, keys[0])
        const minimum =
          depth !== null && depth > 0
            ? 1
            : OPENGRID_STACKABLE_BOX_CONFIGURATION.openingBottomLengthMin
        const parameters = parametersForRange(rawParameters)
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

      const height = rawNumberFor(rawParameters, 'height')
      if (height === null) return [displayedField]
      const maximum = Math.max(field.min, Math.min(field.max, height))
      return [{ ...displayedField, max: maximum, sliderMax: maximum }]
    })
  }
</script>

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
