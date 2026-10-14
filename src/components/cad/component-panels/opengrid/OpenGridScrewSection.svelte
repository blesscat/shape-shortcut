<script lang="ts">
  import {
    OPENGRID_CONFIGURATION,
    type OpenGridParameterKey,
    type OpenGridParameters,
    type ValidationIssue,
  } from '../../../../cad-contract/units'
  import type { Locale } from '../../../../i18n'
  import ParameterField from '../ParameterField.svelte'
  import { translate } from '../../../../i18n'
  import {
    applyScrewDimensionsChanges,
    applyScrewPresetChanges,
    centerScrewAvailable,
    currentScrewPreset,
    isParameterChanged,
    isScrewPreset,
    isScrewPresetOption,
    mergeOpenGridParameters,
    screwConfigurationChanged,
    screwPresetFitsCurrentBoard,
    screwPresetKeys,
  } from './panel-logic'

  type Props = {
    locale: Locale
    parameters: OpenGridParameters
    effectiveDefaults: OpenGridParameters
    fieldErrors: Partial<
      Record<OpenGridParameterKey | 'parameters', ValidationIssue>
    >
    onParametersChange: (parameters: OpenGridParameters) => void
  }

  let {
    locale,
    parameters,
    effectiveDefaults,
    fieldErrors,
    onParametersChange,
  }: Props = $props()

  let selectedScrewPreset = $derived.by(() => currentScrewPreset(parameters))
  let showAdvancedScrewSettings = $state(false)

  $effect(() => {
    showAdvancedScrewSettings = parameters.screwKind === 'custom'
  })

  function parameterChanged(field: OpenGridParameterKey): boolean {
    return isParameterChanged(parameters, effectiveDefaults, field)
  }

  function restoreParameter(field: OpenGridParameterKey): void {
    updateParameters({
      [field]: effectiveDefaults[field],
    } as Partial<OpenGridParameters>)
  }

  function restoreScrewMode(): void {
    updateParameters({ screwMode: effectiveDefaults.screwMode })
  }

  function restoreScrewConfiguration(): void {
    showAdvancedScrewSettings = false
    updateParameters(
      applyScrewDimensionsChanges(effectiveDefaults.screwKind, {
        diameter: effectiveDefaults.screwDiameter,
        headDiameter: effectiveDefaults.screwHeadDiameter,
        headInset: effectiveDefaults.screwHeadInset,
        headIsCountersunk: effectiveDefaults.screwHeadIsCountersunk,
        headCountersunkDegree: effectiveDefaults.screwHeadCountersunkDegree,
      }),
    )
  }

  function updateParameters(changes: Partial<OpenGridParameters>): void {
    onParametersChange(mergeOpenGridParameters(parameters, changes))
  }

  function updateNumber(
    field:
      | 'screwEveryRows'
      | 'screwEveryColumns'
      | 'screwDiameter'
      | 'screwHeadDiameter'
      | 'screwHeadInset'
      | 'screwHeadCountersunkDegree',
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({ [field]: Number(event.currentTarget.value) })
  }

  function updateSelect(field: 'screwKind' | 'screwMode', event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    const value = event.currentTarget.value
    if (field === 'screwKind') {
      if (!isScrewPresetOption(value)) return
      if (value === 'official-default') {
        showAdvancedScrewSettings = false
        updateParameters(
          applyScrewDimensionsChanges(
            'official-default',
            OPENGRID_CONFIGURATION.defaultScrew,
          ),
        )
      } else if (value === 'custom') {
        showAdvancedScrewSettings = true
        updateParameters({ screwKind: 'custom' })
      } else {
        showAdvancedScrewSettings = true
        updateParameters(applyScrewPresetChanges(value))
      }
      return
    }
    if (field === 'screwMode') {
      updateParameters({ screwMode: value as OpenGridParameters['screwMode'] })
    }
  }

  function updateCountersunk(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({ screwHeadIsCountersunk: event.currentTarget.checked })
  }

  function updateScrewCenter(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({ screwCenter: event.currentTarget.checked })
  }

  function updateAdvancedScrewSettings(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    showAdvancedScrewSettings = event.currentTarget.checked
  }
</script>

<ParameterField
  {locale}
  label={translate(locale, 'panel.opengrid.screwMode')}
  changed={parameterChanged('screwMode')}
  error={fieldErrors.screwMode}
  errorId="opengrid-screw-mode-error"
  restoreLabel={translate(locale, 'panel.opengrid.screwModeRestore')}
  onRestore={restoreScrewMode}
>
  <select
    class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
    aria-label={translate(locale, 'panel.opengrid.screwModeRestore')}
    aria-describedby={fieldErrors.screwMode
      ? 'opengrid-screw-mode-error'
      : undefined}
    aria-invalid={Boolean(fieldErrors.screwMode)}
    value={parameters.screwMode}
    onchange={(event) => updateSelect('screwMode', event)}
  >
    <option value="corners"
      >{translate(locale, 'panel.opengrid.screwCorners')}</option
    >
    <option value="everywhere"
      >{translate(locale, 'panel.opengrid.screwEverywhere')}</option
    >
    <option value="by-row-column"
      >{translate(locale, 'panel.opengrid.screwByRowColumn')}</option
    >
    <option value="none">{translate(locale, 'panel.opengrid.none')}</option>
  </select>
</ParameterField>

{#if parameters.screwMode === 'by-row-column'}
  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <ParameterField
      {locale}
      label={translate(locale, 'panel.opengrid.everyRows')}
      changed={parameterChanged('screwEveryRows')}
      restoreLabel={translate(locale, 'panel.opengrid.everyRows')}
      onRestore={() => restoreParameter('screwEveryRows')}
    >
      <input
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={translate(locale, 'panel.opengrid.everyRows')}
        type="number"
        min="1"
        max={OPENGRID_CONFIGURATION.maxGridCount}
        step="1"
        value={parameters.screwEveryRows}
        oninput={(event) => updateNumber('screwEveryRows', event)}
      />
    </ParameterField>
    <ParameterField
      {locale}
      label={translate(locale, 'panel.opengrid.everyColumns')}
      changed={parameterChanged('screwEveryColumns')}
      restoreLabel={translate(locale, 'panel.opengrid.everyColumns')}
      onRestore={() => restoreParameter('screwEveryColumns')}
    >
      <input
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={translate(locale, 'panel.opengrid.everyColumns')}
        type="number"
        min="1"
        max={OPENGRID_CONFIGURATION.maxGridCount}
        step="1"
        value={parameters.screwEveryColumns}
        oninput={(event) => updateNumber('screwEveryColumns', event)}
      />
    </ParameterField>
  </div>
{/if}

<div class="grid gap-1 text-sm">
  <label class="flex min-w-0 grow items-center gap-2">
    <input
      type="checkbox"
      aria-label={translate(locale, 'panel.opengrid.centerScrew')}
      checked={parameters.screwCenter}
      disabled={!centerScrewAvailable(parameters.rows, parameters.columns)}
      onchange={updateScrewCenter}
    />
    {translate(locale, 'panel.opengrid.centerScrew')}
  </label>
</div>

<ParameterField
  {locale}
  label={translate(locale, 'panel.opengrid.screwSource')}
  changed={screwConfigurationChanged(parameters, effectiveDefaults)}
  restoreLabel={translate(locale, 'panel.opengrid.screwSourceRestore')}
  onRestore={restoreScrewConfiguration}
>
  <select
    class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
    aria-label={translate(locale, 'panel.opengrid.screwSourceRestore')}
    value={selectedScrewPreset}
    onchange={(event) => updateSelect('screwKind', event)}
  >
    <option value="official-default">
      {translate(locale, 'panel.opengrid.officialDefault')}
    </option>
    <optgroup label={translate(locale, 'panel.opengrid.woodScrewGroup')}>
      {#each screwPresetKeys as preset}
        {@const dimensions = OPENGRID_CONFIGURATION.screwPresets[preset]}
        <option
          value={preset}
          disabled={!screwPresetFitsCurrentBoard(
            parameters.variant,
            dimensions,
          )}
        >
          {translate(locale, 'panel.opengrid.woodScrewOption', {
            size: preset.toUpperCase(),
            diameter: dimensions.diameter,
            headDiameter: dimensions.headDiameter,
          })}
        </option>
      {/each}
    </optgroup>
    <option value="custom"
      >{translate(locale, 'panel.opengrid.customSize')}</option
    >
  </select>
  {#if isScrewPreset(selectedScrewPreset)}
    <p class="m-0 text-sm text-muted-foreground">
      {translate(locale, 'panel.opengrid.woodScrewDescription')}
    </p>
  {/if}
</ParameterField>

{#if parameters.screwKind === 'custom'}
  <label class="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      aria-label={translate(locale, 'panel.opengrid.advanced')}
      checked={showAdvancedScrewSettings}
      onchange={updateAdvancedScrewSettings}
    />
    {translate(locale, 'panel.opengrid.advanced')}
  </label>

  {#if showAdvancedScrewSettings}
    <div class="grid gap-2" data-testid="opengrid-advanced-screw-settings">
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          aria-label={translate(locale, 'panel.opengrid.countersink')}
          checked={parameters.screwHeadIsCountersunk}
          onchange={updateCountersunk}
        />
        {translate(locale, 'panel.opengrid.countersink')}
      </label>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ParameterField
          {locale}
          label={translate(locale, 'panel.opengrid.throughDiameter')}
        >
          <input
            class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
            aria-label={translate(locale, 'panel.opengrid.throughDiameter')}
            type="number"
            min="0.1"
            step="0.1"
            value={parameters.screwDiameter}
            oninput={(event) => updateNumber('screwDiameter', event)}
          />
        </ParameterField>
        <ParameterField
          {locale}
          label={translate(locale, 'panel.opengrid.headDiameter')}
        >
          <input
            class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
            aria-label={translate(locale, 'panel.opengrid.headDiameter')}
            type="number"
            min="0.1"
            step="0.1"
            value={parameters.screwHeadDiameter}
            oninput={(event) => updateNumber('screwHeadDiameter', event)}
          />
        </ParameterField>
        <ParameterField
          {locale}
          label={translate(locale, 'panel.opengrid.headInset')}
        >
          <input
            class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
            aria-label={translate(locale, 'panel.opengrid.headInset')}
            type="number"
            min="0"
            step="0.1"
            value={parameters.screwHeadInset}
            oninput={(event) => updateNumber('screwHeadInset', event)}
          />
        </ParameterField>
        <ParameterField
          {locale}
          label={translate(locale, 'panel.opengrid.countersinkAngle')}
        >
          <input
            class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
            aria-label={translate(locale, 'panel.opengrid.countersinkAngle')}
            type="number"
            min="1"
            max="179"
            step="1"
            value={parameters.screwHeadCountersunkDegree}
            oninput={(event) =>
              updateNumber('screwHeadCountersunkDegree', event)}
          />
        </ParameterField>
      </div>
    </div>
  {/if}
{/if}
