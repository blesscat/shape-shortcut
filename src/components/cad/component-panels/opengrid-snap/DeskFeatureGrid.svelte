<script lang="ts">
  import {
    type ModelParameterKey,
    type OpenGridSnapParameters,
  } from '../../../../cad-contract/units'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import type { ComponentPanelProps } from '../types'
  import { clearMagnetHole } from './magnet-rules'

  type Props = ComponentPanelProps & {
    parameters: OpenGridSnapParameters
    isWallSystem: boolean
  }

  let {
    locale,
    parameters,
    rawParameters,
    fieldErrors,
    onInputChange,
    isWallSystem,
  }: Props = $props()

  function fieldError(field: ModelParameterKey | 'parameters') {
    return fieldErrors[field]
  }

  function fieldErrorMessage(field: ModelParameterKey | 'parameters') {
    const issue = fieldError(field)
    return issue ? formatValidationIssue(locale, issue) : ''
  }

  let rawFootprint = $derived(rawParameters.footprint ?? parameters.footprint)
  let rawMagnetHoleShape = $derived(
    rawParameters.magnetHoleShape ?? parameters.magnetHoleShape,
  )
  let fixedFootprintFeaturesAreDisabled = $derived(
    isWallSystem || rawFootprint !== 'full',
  )
  let magnetHoleIsActive = $derived(rawMagnetHoleShape !== 'none')
  let rawFourCornerLocatingHoles = $derived(
    rawParameters.fourCornerLocatingHoles ??
      String(parameters.fourCornerLocatingHoles),
  )
  let rawCenterRemoverHole = $derived(
    rawParameters.centerRemoverHole ?? String(parameters.centerRemoverHole),
  )

  function updateBoolean(
    key: 'fourCornerLocatingHoles' | 'centerRemoverHole',
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (fixedFootprintFeaturesAreDisabled) return
    if (event.currentTarget.checked) clearMagnetHole(onInputChange)
    onInputChange(key, String(event.currentTarget.checked))
  }
</script>

{#if !isWallSystem}
  <div class="grid grid-cols-2 gap-2">
    <div class="min-w-0">
      <label class="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          aria-label={translate(locale, 'panel.snap.locatingHoles')}
          aria-describedby={fieldError('fourCornerLocatingHoles')
            ? 'opengrid-snap-four-corner-holes-error'
            : undefined}
          aria-invalid={Boolean(fieldError('fourCornerLocatingHoles'))}
          checked={!fixedFootprintFeaturesAreDisabled &&
            !magnetHoleIsActive &&
            rawFourCornerLocatingHoles === 'true'}
          disabled={fixedFootprintFeaturesAreDisabled}
          onchange={(event) => updateBoolean('fourCornerLocatingHoles', event)}
        />
        {translate(locale, 'panel.snap.locatingHoles')}
      </label>
      {#if fixedFootprintFeaturesAreDisabled}
        <p class="m-0 text-sm text-muted-foreground" role="status">
          {translate(locale, 'panel.snap.locatingHolesInvalid')}
        </p>
      {/if}
      {#if fieldError('fourCornerLocatingHoles')}
        <span
          id="opengrid-snap-four-corner-holes-error"
          class="text-sm text-error"
          role="alert">{fieldErrorMessage('fourCornerLocatingHoles')}</span
        >
      {/if}
    </div>

    <div class="min-w-0">
      <label class="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          aria-label={translate(locale, 'panel.snap.removerHole')}
          aria-describedby={fieldError('centerRemoverHole')
            ? 'opengrid-snap-center-remover-hole-error'
            : undefined}
          aria-invalid={Boolean(fieldError('centerRemoverHole'))}
          checked={!fixedFootprintFeaturesAreDisabled &&
            !magnetHoleIsActive &&
            rawCenterRemoverHole === 'true'}
          disabled={fixedFootprintFeaturesAreDisabled}
          onchange={(event) => updateBoolean('centerRemoverHole', event)}
        />
        {translate(locale, 'panel.snap.removerHole')}
      </label>
      {#if fixedFootprintFeaturesAreDisabled}
        <p class="m-0 text-sm text-muted-foreground" role="status">
          {translate(locale, 'panel.snap.removerHoleInvalid')}
        </p>
      {/if}
      {#if fieldError('centerRemoverHole')}
        <span
          id="opengrid-snap-center-remover-hole-error"
          class="text-sm text-error"
          role="alert">{fieldErrorMessage('centerRemoverHole')}</span
        >
      {/if}
    </div>
  </div>
{/if}
