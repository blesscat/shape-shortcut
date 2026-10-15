<script lang="ts">
  import {
    type ModelParameterKey,
    type OpenGridSnapParameters,
    type OpenGridSnapFootprint,
    type ValidationIssue,
  } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    opengridSnapDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import type { OpenGridSystemContext } from '../../../../features/cad/system-entry-context'
  import { translate, type Locale } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import type { RawParameters } from '../../workspace/types'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import DeskFeatureGrid from './DeskFeatureGrid.svelte'
  import MagnetHoleSection from './MagnetHoleSection.svelte'
  import { clearMagnetHole } from './magnet-rules'

  type Props = {
    locale: Locale
    parameters: OpenGridSnapParameters
    rawParameters: RawParameters
    fieldErrors: Partial<
      Record<ModelParameterKey | 'parameters', ValidationIssue>
    >
    onInputChange: (key: ModelParameterKey, value: string) => void
    systemContext?: OpenGridSystemContext
    onSystemContextChange: (context: OpenGridSystemContext | undefined) => void
  }

  let {
    locale,
    parameters,
    rawParameters,
    fieldErrors,
    onInputChange,
    systemContext,
    onSystemContextChange,
  }: Props = $props()

  const offsetField = opengridSnapDefinition.parameterSchema[0]!

  function fieldError(field: ModelParameterKey | 'parameters') {
    return fieldErrors[field]
  }

  function fieldErrorMessage(field: ModelParameterKey | 'parameters') {
    const issue = fieldError(field)
    return issue ? formatValidationIssue(locale, issue) : ''
  }

  let rawOffset = $derived(rawParameters.offset ?? String(parameters.offset))
  let rawProfile = $derived(rawParameters.profile ?? parameters.profile)
  let rawFootprint = $derived(rawParameters.footprint ?? parameters.footprint)
  let isWallSystem = $derived(systemContext === 'wall')
  let showDeskSystemControls = $derived(!isWallSystem)
  let offsetIsAdjustable = $derived(isWallSystem || rawFootprint === 'full')
  let displayedOffset = $derived(
    offsetIsAdjustable ? rawOffset : String(offsetField.defaultValue),
  )
  let rawOpenConnect = $derived(
    rawParameters.openConnect ?? String(parameters.openConnect),
  )
  function updateFootprint(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    if (isWallSystem) return
    const footprint = event.currentTarget.value as OpenGridSnapFootprint
    onInputChange('footprint', footprint)
    if (footprint !== 'full') {
      onInputChange('offset', String(offsetField.defaultValue))
      onInputChange('fourCornerLocatingHoles', 'false')
      onInputChange('centerRemoverHole', 'false')
      clearMagnetHole(onInputChange)
    }
  }

  function restoreOffset(): void {
    onInputChange('offset', String(offsetField.defaultValue))
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0" data-testid="opengrid-snap-panel">
  <div
    class="grid gap-2"
    role="radiogroup"
    aria-label={translate(locale, 'panel.snap.systemAria')}
    data-testid="opengrid-snap-system"
  >
    <span class="text-sm font-medium text-ink">
      {translate(locale, 'panel.snap.system')}
    </span>
    <label class="flex items-center gap-2 text-sm text-ink">
      <input
        type="radio"
        name="opengrid-snap-system"
        value="desk"
        checked={systemContext === 'desk'}
        onchange={() => onSystemContextChange('desk')}
      />
      {translate(locale, 'panel.snap.systemDesk')}
    </label>
    <label class="flex items-center gap-2 text-sm text-ink">
      <input
        type="radio"
        name="opengrid-snap-system"
        value="wall"
        checked={systemContext === 'wall'}
        onchange={() => onSystemContextChange('wall')}
      />
      {translate(locale, 'panel.snap.systemWall')}
    </label>
  </div>

  <ParameterField
    {locale}
    label={translate(locale, 'panel.snap.variant')}
    error={fieldError('variant')}
    errorId="opengrid-snap-variant-error"
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.snap.variantAria')}
      aria-describedby={fieldError('variant')
        ? 'opengrid-snap-variant-error'
        : undefined}
      aria-invalid={Boolean(fieldError('variant'))}
      value={rawParameters.variant ?? parameters.variant}
      onchange={(event) => {
        if (event.currentTarget instanceof HTMLSelectElement) {
          onInputChange('variant', event.currentTarget.value)
        }
      }}
    >
      <option value="Lite">{translate(locale, 'panel.snap.variantLite')}</option
      >
      <option value="Full">{translate(locale, 'panel.snap.variantFull')}</option
      >
    </select>
  </ParameterField>

  <ParameterField
    {locale}
    label={translate(locale, 'panel.snap.geometry')}
    error={fieldError('profile')}
    errorId="opengrid-snap-profile-error"
    onRestore={() => onInputChange('profile', 'Standard')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.snap.geometryAria')}
      aria-describedby={fieldError('profile')
        ? 'opengrid-snap-profile-error'
        : undefined}
      aria-invalid={Boolean(fieldError('profile'))}
      value={rawProfile}
      onchange={(event) => {
        if (event.currentTarget instanceof HTMLSelectElement) {
          onInputChange('profile', event.currentTarget.value)
        }
      }}
    >
      <option value="Standard"
        >{translate(locale, 'panel.snap.profileStandard')}</option
      >
      <option value="Directional"
        >{translate(locale, 'panel.snap.profileDirectional')}</option
      >
    </select>
  </ParameterField>

  <ParameterField
    {locale}
    label={displayParameterLabel(offsetField, locale)}
    unit={unitLabelFor(locale, offsetField.unit)}
    changed={offsetIsAdjustable &&
      rawOffset !== String(offsetField.defaultValue)}
    error={fieldError('offset')}
    errorId="opengrid-snap-offset-error"
    onRestore={offsetIsAdjustable ? restoreOffset : undefined}
  >
    <ParameterControl
      {locale}
      field={offsetField}
      value={displayedOffset}
      error={fieldError('offset')}
      disabled={!offsetIsAdjustable}
      onChange={(nextValue) => onInputChange('offset', nextValue)}
    />
    {#if !offsetIsAdjustable}
      <p class="m-0 text-sm text-muted-foreground" role="status">
        {translate(locale, 'panel.snap.invalidOffset')}
      </p>
    {/if}
  </ParameterField>

  {#if showDeskSystemControls}
    <ParameterField
      {locale}
      label={translate(locale, 'panel.snap.footprint')}
      error={fieldError('footprint')}
      errorId="opengrid-snap-footprint-error"
      onRestore={() => onInputChange('footprint', 'full')}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={translate(locale, 'panel.snap.footprintAria')}
        aria-describedby={fieldError('footprint')
          ? 'opengrid-snap-footprint-error'
          : undefined}
        aria-invalid={Boolean(fieldError('footprint'))}
        value={rawFootprint}
        onchange={updateFootprint}
      >
        <option value="full"
          >{translate(locale, 'panel.snap.footprintFull')}</option
        >
        <option value="half"
          >{translate(locale, 'panel.snap.footprintHalf')}</option
        >
        <option value="quarter"
          >{translate(locale, 'panel.snap.footprintQuarter')}</option
        >
      </select>
      {#if rawFootprint === 'quarter'}
        <p class="m-0 text-sm text-error" role="status">
          {translate(locale, 'panel.snap.experimental')}
        </p>
      {/if}
    </ParameterField>
  {:else}
    <ParameterField {locale} label={translate(locale, 'panel.snap.footprint')}>
      <p
        class="m-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      >
        {translate(locale, 'panel.snap.footprintFull')}
      </p>
    </ParameterField>
  {/if}

  {#if isWallSystem}
    <label class="flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        aria-label={translate(locale, 'panel.snap.openConnect')}
        aria-describedby={fieldError('openConnect')
          ? 'opengrid-snap-open-connect-error'
          : undefined}
        aria-invalid={Boolean(fieldError('openConnect'))}
        checked={rawOpenConnect === 'true'}
        onchange={(event) => {
          if (event.currentTarget instanceof HTMLInputElement) {
            onInputChange('openConnect', String(event.currentTarget.checked))
          }
        }}
      />
      {translate(locale, 'panel.snap.openConnect')}
    </label>
    {#if fieldError('openConnect')}
      <span
        id="opengrid-snap-open-connect-error"
        class="text-sm text-error"
        role="alert">{fieldErrorMessage('openConnect')}</span
      >
    {/if}
  {/if}

  <MagnetHoleSection
    {locale}
    {parameters}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />

  <DeskFeatureGrid
    {locale}
    {parameters}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
    {isWallSystem}
  />
</fieldset>
