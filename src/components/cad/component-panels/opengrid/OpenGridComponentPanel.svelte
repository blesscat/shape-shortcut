<script lang="ts">
  import {
    calculateOpenGridCounts,
    calculateOpenGridPrintPlan,
    type GridDimensionInput,
  } from '../../../../features/cad/grid-dimensions'
  import {
    OPENGRID_CONFIGURATION,
    openGridBoardConfiguration,
    type HalfCellX,
    type HalfCellY,
    type OpenGridParameterKey,
    type OpenGridParameters,
  } from '../../../../cad-contract/units'
  import OpenGridChamferSection from './OpenGridChamferSection.svelte'
  import OpenGridConnectorSection from './OpenGridConnectorSection.svelte'
  import OpenGridPrintPlanCalculator from './OpenGridPrintPlanCalculator.svelte'
  import OpenGridScrewSection from './OpenGridScrewSection.svelte'
  import OpenGridTargetFitSection from './OpenGridTargetFitSection.svelte'
  import ParameterField from '../ParameterField.svelte'
  import Slider from '../Slider.svelte'
  import type { OpenGridComponentPanelProps } from '../types'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import {
    axisHasHalfCell,
    centerScrewAvailable,
    displayedGridCount,
    effectiveOpenGridDefaults,
    formatGridCount,
    fullGridCountFromSlider,
    gridCountMaximum,
    gridCountMinimum,
    gridCountStep,
    isParameterChanged,
    mergeOpenGridParameters,
    type GridAxis,
  } from './panel-logic'

  let {
    locale,
    parameters,
    systemContext,
    fieldErrors,
    onParametersChange,
    onDimensionCalculationInvalid,
  }: OpenGridComponentPanelProps = $props()

  let board = $derived(openGridBoardConfiguration(parameters))
  let width = $derived(board.width)
  let depth = $derived(board.depth)
  let thickness = $derived(
    OPENGRID_CONFIGURATION.variants[parameters.variant]?.thickness ?? 0,
  )

  let effectiveDefaults = $derived.by(() =>
    effectiveOpenGridDefaults(systemContext),
  )

  function parameterChanged(field: OpenGridParameterKey): boolean {
    return isParameterChanged(parameters, effectiveDefaults, field)
  }

  function updateParameters(changes: Partial<OpenGridParameters>): void {
    onParametersChange(mergeOpenGridParameters(parameters, changes))
  }

  function restoreParameter(field: OpenGridParameterKey): void {
    updateParameters({
      [field]: effectiveDefaults[field],
    } as Partial<OpenGridParameters>)
  }

  function restoreGridCount(field: 'rows' | 'columns'): void {
    const defaultValue = effectiveDefaults[field]
    updateGridCounts({
      rows: field === 'rows' ? defaultValue : parameters.rows,
      columns: field === 'columns' ? defaultValue : parameters.columns,
    })
  }

  function updateGridCounts(
    changes: Pick<OpenGridParameters, 'rows' | 'columns'>,
    target?: Pick<OpenGridParameters, 'targetWidth' | 'targetDepth'>,
  ): void {
    updateParameters({
      ...changes,
      ...target,
      screwCenter: centerScrewAvailable(changes.rows, changes.columns)
        ? parameters.screwCenter
        : false,
    })
  }

  function updateNumberValue(field: 'rows' | 'columns', value: string): void {
    const numericValue = Number(value)
    const axis: GridAxis = field === 'columns' ? 'x' : 'y'
    const fullCount = fullGridCountFromSlider(axis, numericValue, {
      hasHalfCell: axisHasHalfCell(parameters, axis),
      currentValue: displayedGridCount(parameters, axis),
    })
    updateGridCounts({
      rows: field === 'rows' ? fullCount : parameters.rows,
      columns: field === 'columns' ? fullCount : parameters.columns,
    })
  }

  function handlePrintPlanCalculation(changes: {
    rows: number
    columns: number
  }): void {
    // The plan's primary piece dimensions replace the single-board target.
    // Disable target fitting so the saved target does not invalidate or
    // prevent generation of the selected primary piece.
    updateParameters({ ...changes, fitToTarget: false })
  }

  function calculateGridDimensions(input: GridDimensionInput) {
    return calculateOpenGridCounts({
      ...input,
      halfCellX: parameters.halfCellX,
      halfCellY: parameters.halfCellY,
    })
  }

  function handleDimensionCalculation(
    changes: { rows: number; columns: number },
    target?: { x: number; y: number },
  ): void {
    updateGridCounts(
      changes,
      target ? { targetWidth: target.x, targetDepth: target.y } : undefined,
    )
  }

  function updateFitToTarget(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({ fitToTarget: event.currentTarget.checked })
  }

  function updateHalfCellX(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    updateParameters({ halfCellX: event.currentTarget.value as HalfCellX })
  }

  function updateHalfCellY(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    updateParameters({ halfCellY: event.currentTarget.value as HalfCellY })
  }

  function updateSelect(field: 'variant', event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    const value = event.currentTarget.value
    if (field === 'variant') {
      updateParameters({ variant: value as OpenGridParameters['variant'] })
    }
  }

  function fieldError(field: keyof OpenGridParameters | 'parameters') {
    return fieldErrors[field]
  }

  function fieldErrorMessage(field: keyof OpenGridParameters | 'parameters') {
    const issue = fieldError(field)
    return issue ? formatValidationIssue(locale, issue) : ''
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0" data-testid="opengrid-panel">
  <ParameterField
    {locale}
    label={translate(locale, 'panel.opengrid.fitToTarget')}
    changed={parameterChanged('fitToTarget')}
    error={fieldError('fitToTarget')}
    errorId="opengrid-fit-to-target-error"
    restoreLabel={translate(locale, 'panel.opengrid.fitToTargetRestore')}
    onRestore={() => restoreParameter('fitToTarget')}
  >
    <div class="grid gap-1">
      <label class="flex min-w-0 items-center gap-2 text-sm">
        <input
          type="checkbox"
          aria-describedby={fieldError('fitToTarget')
            ? 'opengrid-fit-to-target-description opengrid-fit-to-target-error'
            : 'opengrid-fit-to-target-description'}
          aria-invalid={Boolean(fieldError('fitToTarget'))}
          aria-label={translate(locale, 'panel.opengrid.fitToTargetAria')}
          checked={parameters.fitToTarget}
          onchange={updateFitToTarget}
        />
        <span>{translate(locale, 'panel.opengrid.fitToTargetCheckbox')}</span>
        <span
          class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
        >
          {translate(locale, 'panel.opengrid.fitToTargetBeta')}
        </span>
      </label>
      <p
        id="opengrid-fit-to-target-description"
        class="m-0 pl-6 text-sm text-muted-foreground"
        data-testid="opengrid-fit-to-target-description"
      >
        {translate(locale, 'panel.opengrid.fitToTargetDescription')}
      </p>
    </div>
  </ParameterField>

  <OpenGridTargetFitSection
    {locale}
    {parameters}
    {effectiveDefaults}
    {fieldErrors}
    calculate={calculateGridDimensions}
    onApply={handleDimensionCalculation}
    onInvalid={onDimensionCalculationInvalid}
    {onParametersChange}
  />

  {#if !parameters.fitToTarget}
    <OpenGridPrintPlanCalculator
      {locale}
      calculate={calculateOpenGridPrintPlan}
      onApply={handlePrintPlanCalculation}
      onInvalid={onDimensionCalculationInvalid}
    />
  {/if}

  <ParameterField
    {locale}
    label={translate(locale, 'panel.opengrid.profile')}
    changed={parameterChanged('variant')}
    error={fieldError('variant')}
    errorId="opengrid-variant-error"
    restoreLabel={translate(locale, 'panel.opengrid.profileAria')}
    onRestore={() => restoreParameter('variant')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.opengrid.profileAria')}
      aria-describedby={fieldError('variant')
        ? 'opengrid-variant-error'
        : undefined}
      aria-invalid={Boolean(fieldError('variant'))}
      value={parameters.variant}
      onchange={(event) => updateSelect('variant', event)}
    >
      <option value="Lite"
        >{translate(locale, 'panel.opengrid.variant.lite')}</option
      >
      <option value="Full"
        >{translate(locale, 'panel.opengrid.variant.full')}</option
      >
      <option value="Heavy"
        >{translate(locale, 'panel.opengrid.variant.heavy')}</option
      >
      <option value="Hybrid"
        >{translate(locale, 'panel.opengrid.variant.hybrid')}</option
      >
    </select>
  </ParameterField>

  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <ParameterField
      {locale}
      label={translate(locale, 'panel.opengrid.halfX')}
      changed={parameterChanged('halfCellX')}
      error={fieldError('halfCellX')}
      errorId="opengrid-half-cell-x-error"
      restoreLabel={translate(locale, 'panel.opengrid.halfXRestore')}
      onRestore={() => restoreParameter('halfCellX')}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={translate(locale, 'panel.opengrid.halfXRestore')}
        aria-describedby={fieldError('halfCellX')
          ? 'opengrid-half-cell-x-error'
          : undefined}
        aria-invalid={Boolean(fieldError('halfCellX'))}
        value={parameters.halfCellX}
        onchange={updateHalfCellX}
      >
        <option value="none">{translate(locale, 'panel.opengrid.none')}</option>
        <option value="left">{translate(locale, 'panel.opengrid.left')}</option>
        <option value="right"
          >{translate(locale, 'panel.opengrid.right')}</option
        >
      </select>
    </ParameterField>

    <ParameterField
      {locale}
      label={translate(locale, 'panel.opengrid.halfY')}
      changed={parameterChanged('halfCellY')}
      error={fieldError('halfCellY')}
      errorId="opengrid-half-cell-y-error"
      restoreLabel={translate(locale, 'panel.opengrid.halfYRestore')}
      onRestore={() => restoreParameter('halfCellY')}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={translate(locale, 'panel.opengrid.halfYRestore')}
        aria-describedby={fieldError('halfCellY')
          ? 'opengrid-half-cell-y-error'
          : undefined}
        aria-invalid={Boolean(fieldError('halfCellY'))}
        value={parameters.halfCellY}
        onchange={updateHalfCellY}
      >
        <option value="none">{translate(locale, 'panel.opengrid.none')}</option>
        <option value="top">{translate(locale, 'panel.opengrid.top')}</option>
        <option value="bottom"
          >{translate(locale, 'panel.opengrid.bottom')}</option
        >
      </select>
    </ParameterField>
  </div>

  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <ParameterField
      {locale}
      label="X"
      unit={`${formatGridCount(parameters, 'x')} ${translate(locale, 'unit.grid')}`}
      unitAriaLive
      changed={parameterChanged('columns')}
      error={fieldError('columns')}
      errorId="opengrid-columns-error"
      restoreLabel="X"
      onRestore={() => restoreGridCount('columns')}
    >
      <Slider
        value={displayedGridCount(parameters, 'x')}
        label="X"
        min={gridCountMinimum()}
        max={gridCountMaximum(parameters, 'x')}
        step={gridCountStep(parameters, 'x')}
        error={fieldError('columns')}
        describedBy={fieldError('columns')
          ? 'opengrid-columns-error'
          : undefined}
        onChange={(value) => updateNumberValue('columns', value)}
      />
    </ParameterField>
    <ParameterField
      {locale}
      label="Y"
      unit={`${formatGridCount(parameters, 'y')} ${translate(locale, 'unit.grid')}`}
      unitAriaLive
      changed={parameterChanged('rows')}
      error={fieldError('rows')}
      errorId="opengrid-rows-error"
      restoreLabel="Y"
      onRestore={() => restoreGridCount('rows')}
    >
      <Slider
        value={displayedGridCount(parameters, 'y')}
        label="Y"
        min={gridCountMinimum()}
        max={gridCountMaximum(parameters, 'y')}
        step={gridCountStep(parameters, 'y')}
        error={fieldError('rows')}
        describedBy={fieldError('rows') ? 'opengrid-rows-error' : undefined}
        onChange={(value) => updateNumberValue('rows', value)}
      />
    </ParameterField>
  </div>

  <p class="m-0 text-sm text-muted-foreground">
    {translate(locale, 'panel.opengrid.dimensions', {
      width,
      depth,
      thickness,
    })}
  </p>
  {#if parameters.variant === 'Hybrid'}
    <p
      class="m-0 text-sm text-muted-foreground"
      data-testid="opengrid-hybrid-description"
    >
      {translate(locale, 'panel.opengrid.hybridDescription')}
    </p>
  {/if}

  <OpenGridChamferSection
    {locale}
    {parameters}
    {effectiveDefaults}
    {fieldErrors}
    {onParametersChange}
  />

  <OpenGridConnectorSection
    {locale}
    {parameters}
    {effectiveDefaults}
    {fieldErrors}
    {onParametersChange}
  />

  <OpenGridScrewSection
    {locale}
    {parameters}
    {effectiveDefaults}
    {fieldErrors}
    {onParametersChange}
  />

  {#each ['variant', 'chamfers', 'connectorHoles', 'screwKind', 'screwMode', 'screwCenter', 'screwDiameter', 'screwHeadDiameter', 'screwHeadInset', 'screwHeadCountersunkDegree'] as field}
    {#if fieldError(field as keyof OpenGridParameters)}<span
        class="text-sm text-error"
        role="alert"
        >{fieldErrorMessage(field as keyof OpenGridParameters)}</span
      >{/if}
  {/each}
  {#if fieldError('parameters')}<span class="text-sm text-error" role="alert"
      >{fieldErrorMessage('parameters')}</span
    >{/if}
</fieldset>
