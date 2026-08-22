<script lang="ts">
  import {
    calculateOpenGridCounts,
    calculateOpenGridPrintPlan,
    type GridDimensionInput,
  } from '../../../../features/cad/grid-dimensions'
  import {
    OPENGRID_CONFIGURATION,
    isOpenGridParameters,
    normalizeOpenGridParameters,
    openGridBoardConfiguration,
    type HalfCellX,
    type HalfCellY,
    type OpenGridCornerFlags,
    type OpenGridParameterKey,
    type OpenGridParameters,
    type OpenGridSideFlags,
    type OpenGridScrewDimensions,
    type OpenGridScrewPreset,
  } from '../../../../cad-contract/units'
  import {
    cloneModelParameters,
    getSystemPreset,
    type OpenGridSystemContext,
  } from '../../../../features/cad/system-entry-context'
  import GridDimensionCalculator from '../GridDimensionCalculator.svelte'
  import OpenGridPrintPlanCalculator from './OpenGridPrintPlanCalculator.svelte'
  import ParameterField from '../ParameterField.svelte'
  import RestoreButton from '../RestoreButton.svelte'
  import Slider from '../Slider.svelte'
  import type { OpenGridComponentPanelProps } from '../types'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'

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
  let latticeRows = $derived(Math.max(parameters.rows - 1, 0))
  let latticeColumns = $derived(Math.max(parameters.columns - 1, 0))
  let selectedCount = $derived(parameters.customScrewPositions.length)

  type ScrewPresetOption = 'official-default' | OpenGridScrewPreset | 'custom'

  const screwPresetKeys: readonly OpenGridScrewPreset[] = [
    'm3',
    'm4',
    'm5',
    'm6',
    'm7',
  ]

  function screwDimensionsMatch(dimensions: OpenGridScrewDimensions): boolean {
    return (
      parameters.screwDiameter === dimensions.diameter &&
      parameters.screwHeadDiameter === dimensions.headDiameter &&
      parameters.screwHeadInset === dimensions.headInset &&
      parameters.screwHeadIsCountersunk === dimensions.headIsCountersunk &&
      parameters.screwHeadCountersunkDegree === dimensions.headCountersunkDegree
    )
  }

  function currentScrewPreset(): ScrewPresetOption {
    if (parameters.screwKind === 'official-default') {
      return 'official-default'
    }
    for (const preset of screwPresetKeys) {
      if (screwDimensionsMatch(OPENGRID_CONFIGURATION.screwPresets[preset])) {
        return preset
      }
    }
    return 'custom'
  }

  let selectedScrewPreset = $derived.by(() => currentScrewPreset())
  let showAdvancedScrewSettings = $state(false)

  function openGridDefinitionDefaults(): OpenGridParameters {
    return {
      ...OPENGRID_CONFIGURATION.defaultParameters,
      chamferCorners: {
        ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
      },
      connectorSides: {
        ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
      },
      customScrewPositions: [],
    }
  }

  function effectiveOpenGridDefaults(
    context: OpenGridSystemContext | undefined,
  ): OpenGridParameters {
    let defaults: unknown = openGridDefinitionDefaults()
    if (context) {
      const systemPreset = getSystemPreset('opengrid', context)
      if (systemPreset) defaults = systemPreset
    }
    if (!isOpenGridParameters(defaults)) {
      throw new Error('OPENGRID_SYSTEM_PRESET_INVALID')
    }
    return normalizeOpenGridParameters(cloneModelParameters(defaults))
  }

  let effectiveDefaults = $derived.by(() =>
    effectiveOpenGridDefaults(systemContext),
  )

  $effect(() => {
    showAdvancedScrewSettings = parameters.screwKind === 'custom'
  })

  function valuesEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) return true
    if (Array.isArray(left) && Array.isArray(right)) {
      return (
        left.length === right.length &&
        left.every((value, index) => valuesEqual(value, right[index]))
      )
    }
    if (
      typeof left === 'object' &&
      left !== null &&
      typeof right === 'object' &&
      right !== null
    ) {
      const leftRecord = left as Record<string, unknown>
      const rightRecord = right as Record<string, unknown>
      const leftKeys = Object.keys(leftRecord)
      const rightKeys = Object.keys(rightRecord)
      return (
        leftKeys.length === rightKeys.length &&
        leftKeys.every(
          (key) =>
            Object.prototype.hasOwnProperty.call(rightRecord, key) &&
            valuesEqual(leftRecord[key], rightRecord[key]),
        )
      )
    }
    return false
  }

  function parameterChanged(field: OpenGridParameterKey): boolean {
    return !valuesEqual(parameters[field], effectiveDefaults[field])
  }

  function screwConfigurationChanged(): boolean {
    return (
      parameterChanged('screwKind') ||
      parameterChanged('screwDiameter') ||
      parameterChanged('screwHeadDiameter') ||
      parameterChanged('screwHeadInset') ||
      parameterChanged('screwHeadIsCountersunk') ||
      parameterChanged('screwHeadCountersunkDegree')
    )
  }

  function restoreParameter(field: OpenGridParameterKey): void {
    const defaultValue = effectiveDefaults[field]
    updateParameters({ [field]: defaultValue } as Partial<OpenGridParameters>)
  }

  function restoreGridCount(field: 'rows' | 'columns'): void {
    const defaultValue = effectiveDefaults[field]
    updateGridCounts({
      rows: field === 'rows' ? defaultValue : parameters.rows,
      columns: field === 'columns' ? defaultValue : parameters.columns,
    })
  }

  function restoreScrewMode(): void {
    updateParameters({
      screwMode: effectiveDefaults.screwMode,
      customScrewPositions: effectiveDefaults.customScrewPositions,
    })
  }

  function restoreScrewConfiguration(): void {
    showAdvancedScrewSettings = false
    applyScrewDimensions(effectiveDefaults.screwKind, {
      diameter: effectiveDefaults.screwDiameter,
      headDiameter: effectiveDefaults.screwHeadDiameter,
      headInset: effectiveDefaults.screwHeadInset,
      headIsCountersunk: effectiveDefaults.screwHeadIsCountersunk,
      headCountersunkDegree: effectiveDefaults.screwHeadCountersunkDegree,
    })
  }

  function isScrewPreset(value: string): value is OpenGridScrewPreset {
    return screwPresetKeys.includes(value as OpenGridScrewPreset)
  }

  function isScrewPresetOption(value: string): value is ScrewPresetOption {
    return (
      value === 'official-default' || value === 'custom' || isScrewPreset(value)
    )
  }

  function screwPresetFitsCurrentBoard(
    dimensions: OpenGridScrewDimensions,
  ): boolean {
    const boardThickness =
      OPENGRID_CONFIGURATION.variants[parameters.variant].thickness
    return (
      dimensions.diameter > 0 &&
      dimensions.diameter <= dimensions.headDiameter &&
      dimensions.headDiameter <= OPENGRID_CONFIGURATION.tileInnerSize &&
      dimensions.headInset >= 0 &&
      dimensions.headInset <= boardThickness
    )
  }

  function applyScrewDimensions(
    screwKind: OpenGridParameters['screwKind'],
    dimensions: OpenGridScrewDimensions,
  ): void {
    updateParameters({
      screwKind,
      screwDiameter: dimensions.diameter,
      screwHeadDiameter: dimensions.headDiameter,
      screwHeadInset: dimensions.headInset,
      screwHeadIsCountersunk: dimensions.headIsCountersunk,
      screwHeadCountersunkDegree: dimensions.headCountersunkDegree,
    })
  }

  function applyScrewPreset(preset: OpenGridScrewPreset): void {
    applyScrewDimensions('custom', OPENGRID_CONFIGURATION.screwPresets[preset])
  }

  function clonePositions(): OpenGridParameters['customScrewPositions'] {
    return parameters.customScrewPositions.map((position) => ({ ...position }))
  }

  function centerScrewAvailable(rows: number, columns: number): boolean {
    return rows >= 2 && columns >= 2
  }

  type GridAxis = 'x' | 'y'

  function axisHasHalfCell(axis: GridAxis): boolean {
    return axis === 'x'
      ? parameters.halfCellX !== 'none'
      : parameters.halfCellY !== 'none'
  }

  function displayedGridCount(axis: GridAxis): number {
    const fullCount = axis === 'x' ? parameters.columns : parameters.rows
    return fullCount + (axisHasHalfCell(axis) ? 0.5 : 0)
  }

  function formatGridCount(axis: GridAxis): string {
    return displayedGridCount(axis).toFixed(1).replace(/\.0$/, '')
  }

  function gridCountMinimum(axis: GridAxis): number {
    return 1
  }

  function gridCountMaximum(axis: GridAxis): number {
    return (
      OPENGRID_CONFIGURATION.maxGridCount + (axisHasHalfCell(axis) ? 0.5 : 0)
    )
  }

  function fullGridCountFromSlider(axis: GridAxis, value: number): number {
    if (!axisHasHalfCell(axis)) return Math.round(value)

    // Half-cell mode exposes only 1.5, 2.5, ... as committed total counts.
    // The range keeps a 0.5 step and briefly visits the integer between two
    // valid half counts while the thumb moves in either direction.
    const currentValue = displayedGridCount(axis)
    const fullCount =
      value < currentValue ? Math.floor(value - 0.5) : Math.ceil(value - 0.5)
    return Math.max(1, fullCount)
  }

  function gridCountStep(axis: GridAxis): number {
    return axisHasHalfCell(axis) ? 0.5 : 1
  }

  function updateGridCounts(
    changes: Pick<OpenGridParameters, 'rows' | 'columns'>,
    target?: Pick<OpenGridParameters, 'targetWidth' | 'targetDepth'>,
  ): void {
    const positions = clonePositions().filter(
      (position) =>
        position.row < changes.rows && position.column < changes.columns,
    )
    updateParameters({
      ...changes,
      ...target,
      screwCenter: centerScrewAvailable(changes.rows, changes.columns)
        ? parameters.screwCenter
        : false,
      customScrewPositions: positions,
    })
  }

  function updateParameters(changes: Partial<OpenGridParameters>): void {
    const next: OpenGridParameters = {
      ...parameters,
      ...changes,
      chamferCorners: {
        ...parameters.chamferCorners,
        ...(changes.chamferCorners ?? {}),
      },
      connectorSides: {
        ...parameters.connectorSides,
        ...(changes.connectorSides ?? {}),
      },
      customScrewPositions: (
        changes.customScrewPositions ?? clonePositions()
      ).map((position) => ({ ...position })),
    }
    onParametersChange(next)
  }

  function updateNumber(
    field:
      | 'rows'
      | 'columns'
      | 'screwEvery'
      | 'screwEveryRows'
      | 'screwEveryColumns'
      | 'screwDiameter'
      | 'screwHeadDiameter'
      | 'screwHeadInset'
      | 'screwHeadCountersunkDegree',
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateNumberValue(field, event.currentTarget.value)
  }

  function updateNumberValue(
    field:
      | 'rows'
      | 'columns'
      | 'screwEvery'
      | 'screwEveryRows'
      | 'screwEveryColumns'
      | 'screwDiameter'
      | 'screwHeadDiameter'
      | 'screwHeadInset'
      | 'screwHeadCountersunkDegree',
    value: string,
  ): void {
    const numericValue = Number(value)
    if (field !== 'rows' && field !== 'columns') {
      updateParameters({ [field]: numericValue })
      return
    }

    const axis: GridAxis = field === 'columns' ? 'x' : 'y'
    const fullCount = fullGridCountFromSlider(axis, numericValue)
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

  function updateSelect(
    field:
      'variant' | 'chamfers' | 'screwKind' | 'screwMode' | 'connectorHoles',
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    const value = event.currentTarget.value
    if (field === 'variant') {
      updateParameters({ variant: value as OpenGridParameters['variant'] })
      return
    }
    if (field === 'chamfers') {
      updateParameters({ chamfers: value as OpenGridParameters['chamfers'] })
      return
    }
    if (field === 'screwKind') {
      if (!isScrewPresetOption(value)) return
      if (value === 'official-default') {
        showAdvancedScrewSettings = false
        applyScrewDimensions(
          'official-default',
          OPENGRID_CONFIGURATION.defaultScrew,
        )
      } else if (value === 'custom') {
        showAdvancedScrewSettings = true
        updateParameters({ screwKind: 'custom' })
      } else {
        showAdvancedScrewSettings = true
        applyScrewPreset(value)
      }
      return
    }
    if (field === 'screwMode') {
      const screwMode = value as OpenGridParameters['screwMode']
      updateParameters({
        screwMode,
        customScrewPositions: screwMode === 'custom' ? clonePositions() : [],
      })
      return
    }
    updateParameters({
      connectorHoles: value as OpenGridParameters['connectorHoles'],
    })
  }

  function updateCorner(field: keyof OpenGridCornerFlags, event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({
      chamferCorners: { [field]: event.currentTarget.checked },
    })
  }

  function updateSide(field: keyof OpenGridSideFlags, event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({
      connectorSides: { [field]: event.currentTarget.checked },
    })
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

  function hasPosition(row: number, column: number): boolean {
    return parameters.customScrewPositions.some(
      (position) => position.row === row && position.column === column,
    )
  }

  function togglePosition(row: number, column: number): void {
    const positions = clonePositions()
    const index = positions.findIndex(
      (position) => position.row === row && position.column === column,
    )
    if (index >= 0) {
      positions.splice(index, 1)
    } else {
      positions.push({ row, column })
    }
    updateParameters({ customScrewPositions: positions })
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

  <GridDimensionCalculator
    {locale}
    calculate={calculateGridDimensions}
    onApply={handleDimensionCalculation}
    onInvalid={onDimensionCalculationInvalid}
    testId="opengrid-target-dimension-calculator"
    initialTargetX={parameters.targetWidth > 0
      ? String(parameters.targetWidth)
      : ''}
    initialTargetY={parameters.targetDepth > 0
      ? String(parameters.targetDepth)
      : ''}
    description={translate(locale, 'panel.opengrid.targetDimensionDescription')}
  />

  <ParameterField
    {locale}
    label={translate(locale, 'panel.opengrid.fitToTarget')}
    changed={parameterChanged('fitToTarget')}
    error={fieldError('fitToTarget')}
    errorId="opengrid-fit-to-target-error"
    restoreLabel={translate(locale, 'panel.opengrid.fitToTargetRestore')}
    onRestore={() => restoreParameter('fitToTarget')}
  >
    <label class="flex min-w-0 items-start gap-2 text-sm">
      <input
        type="checkbox"
        aria-describedby={fieldError('fitToTarget')
          ? 'opengrid-fit-to-target-error'
          : undefined}
        aria-invalid={Boolean(fieldError('fitToTarget'))}
        aria-label={translate(locale, 'panel.opengrid.fitToTarget')}
        checked={parameters.fitToTarget}
        disabled={parameters.targetWidth <= 0 || parameters.targetDepth <= 0}
        onchange={updateFitToTarget}
      />
      <span>{translate(locale, 'panel.opengrid.fitToTargetDescription')}</span>
    </label>
  </ParameterField>

  <OpenGridPrintPlanCalculator
    {locale}
    calculate={calculateOpenGridPrintPlan}
    onApply={handlePrintPlanCalculation}
    onInvalid={onDimensionCalculationInvalid}
  />

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
      unit={`${formatGridCount('x')} ${translate(locale, 'unit.grid')}`}
      unitAriaLive
      changed={parameterChanged('columns')}
      error={fieldError('columns')}
      errorId="opengrid-columns-error"
      restoreLabel="X"
      onRestore={() => restoreGridCount('columns')}
    >
      <Slider
        value={displayedGridCount('x')}
        label="X"
        min={gridCountMinimum('x')}
        max={gridCountMaximum('x')}
        step={gridCountStep('x')}
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
      unit={`${formatGridCount('y')} ${translate(locale, 'unit.grid')}`}
      unitAriaLive
      changed={parameterChanged('rows')}
      error={fieldError('rows')}
      errorId="opengrid-rows-error"
      restoreLabel="Y"
      onRestore={() => restoreGridCount('rows')}
    >
      <Slider
        value={displayedGridCount('y')}
        label="Y"
        min={gridCountMinimum('y')}
        max={gridCountMaximum('y')}
        step={gridCountStep('y')}
        error={fieldError('rows')}
        describedBy={fieldError('rows') ? 'opengrid-rows-error' : undefined}
        onChange={(value) => updateNumberValue('rows', value)}
      />
    </ParameterField>
  </div>

  <p class="m-0 text-sm text-muted">
    {translate(locale, 'panel.opengrid.dimensions', {
      width,
      depth,
      thickness,
    })}
  </p>
  {#if parameters.variant === 'Hybrid'}
    <p class="m-0 text-sm text-muted" data-testid="opengrid-hybrid-description">
      {translate(locale, 'panel.opengrid.hybridDescription')}
    </p>
  {/if}

  <ParameterField
    {locale}
    label={translate(locale, 'panel.opengrid.chamfer')}
    changed={parameterChanged('chamfers')}
    restoreLabel={translate(locale, 'panel.opengrid.chamferRestore')}
    onRestore={() => restoreParameter('chamfers')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.opengrid.chamferRestore')}
      value={parameters.chamfers}
      onchange={(event) => updateSelect('chamfers', event)}
    >
      <option value="corners"
        >{translate(locale, 'panel.opengrid.chamferCorners')}</option
      >
      <option value="everywhere"
        >{translate(locale, 'panel.opengrid.chamferEverywhere')}</option
      >
      <option value="none">{translate(locale, 'panel.opengrid.none')}</option>
    </select>
  </ParameterField>

  {#if parameters.chamfers !== 'none'}
    <div class="grid gap-2 rounded-lg border border-border-card p-2">
      <span class="font-[650]"
        >{translate(locale, 'panel.opengrid.outerChamfer')}</span
      >
      <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {#each [['topLeft', 'panel.opengrid.topLeft'], ['topRight', 'panel.opengrid.topRight'], ['bottomLeft', 'panel.opengrid.bottomLeft'], ['bottomRight', 'panel.opengrid.bottomRight']] as item}
          {@const corner = item[0] as keyof OpenGridCornerFlags}
          <div class="relative min-w-0 flex items-center gap-2">
            <label class="flex min-w-0 grow items-center gap-2">
              <input
                type="checkbox"
                checked={parameters.chamferCorners[corner]}
                onchange={(event) => updateCorner(corner, event)}
              />
              {translate(locale, item[1])}
            </label>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <ParameterField
    {locale}
    label={translate(locale, 'panel.opengrid.connector')}
    changed={parameterChanged('connectorHoles')}
    error={fieldError('connectorHoles')}
    errorId="opengrid-connector-holes-error"
    restoreLabel={translate(locale, 'panel.opengrid.connectorRestore')}
    onRestore={() => restoreParameter('connectorHoles')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.opengrid.connectorRestore')}
      aria-describedby={fieldError('connectorHoles')
        ? 'opengrid-connector-holes-error'
        : undefined}
      aria-invalid={Boolean(fieldError('connectorHoles'))}
      value={parameters.connectorHoles}
      onchange={(event) => updateSelect('connectorHoles', event)}
    >
      <option value="enabled"
        >{translate(locale, 'panel.opengrid.connectorEnabled')}</option
      >
      <option value="none">{translate(locale, 'panel.opengrid.none')}</option>
    </select>
  </ParameterField>

  {#if parameters.connectorHoles === 'enabled'}
    <div class="grid gap-2 rounded-lg border border-border-card p-2">
      <span class="font-[650]"
        >{translate(locale, 'panel.opengrid.connectorSide')}</span
      >
      <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {#each [['top', 'panel.opengrid.top'], ['right', 'panel.opengrid.right'], ['bottom', 'panel.opengrid.bottom'], ['left', 'panel.opengrid.left']] as item}
          {@const side = item[0] as keyof OpenGridSideFlags}
          <div class="relative min-w-0 flex items-center gap-2">
            <label class="flex min-w-0 grow items-center gap-2">
              <input
                type="checkbox"
                checked={parameters.connectorSides[side]}
                onchange={(event) => updateSide(side, event)}
              />
              {translate(locale, item[1])}
            </label>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <ParameterField
    {locale}
    label={translate(locale, 'panel.opengrid.screwMode')}
    changed={parameterChanged('screwMode')}
    error={fieldError('screwMode')}
    errorId="opengrid-screw-mode-error"
    restoreLabel={translate(locale, 'panel.opengrid.screwModeRestore')}
    onRestore={restoreScrewMode}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.opengrid.screwModeRestore')}
      aria-describedby={fieldError('screwMode')
        ? 'opengrid-screw-mode-error'
        : undefined}
      aria-invalid={Boolean(fieldError('screwMode'))}
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
      <option value="custom"
        >{translate(locale, 'panel.opengrid.custom')}</option
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

  <ParameterField
    {locale}
    label={translate(locale, 'panel.opengrid.screwSource')}
    changed={screwConfigurationChanged()}
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
            disabled={!screwPresetFitsCurrentBoard(dimensions)}
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
      <p class="m-0 text-sm text-muted">
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

  <div class="grid gap-3">
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
      label={translate(locale, 'panel.opengrid.everyGridHole')}
      changed={parameterChanged('screwEvery')}
      restoreLabel={translate(locale, 'panel.opengrid.everyGridHoleRestore')}
      onRestore={() => restoreParameter('screwEvery')}
    >
      <input
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={translate(locale, 'panel.opengrid.everyGridHoleRestore')}
        type="number"
        min="0"
        max={OPENGRID_CONFIGURATION.maxGridCount}
        step="1"
        value={parameters.screwEvery}
        oninput={(event) => updateNumber('screwEvery', event)}
      />
    </ParameterField>
  </div>
  {#if parameters.screwMode === 'custom'}
    <div class="grid gap-2" data-testid="opengrid-custom-matrix">
      <div class="relative flex items-center justify-between gap-2">
        <span class="min-w-0 font-[650]">
          {translate(locale, 'panel.opengrid.customPositions')}
        </span>
        <div class="flex shrink-0 items-center gap-1">
          <RestoreButton
            {locale}
            label={translate(locale, 'panel.opengrid.customPositions')}
            visible={parameterChanged('customScrewPositions')}
            onRestore={() => restoreParameter('customScrewPositions')}
          />
          <span class="text-sm text-muted" aria-live="polite"
            >{translate(locale, 'panel.opengrid.selectedHoles', {
              count: selectedCount,
            })}</span
          >
        </div>
      </div>
      <p class="m-0 text-sm text-muted">
        {translate(locale, 'panel.opengrid.customPositionsDescription')}
      </p>
      {#if latticeRows === 0 || latticeColumns === 0}
        <p class="m-0 text-sm text-muted">
          {translate(locale, 'panel.opengrid.noIntersections')}
        </p>
      {:else}
        <div class="grid max-h-96 gap-2 overflow-auto pr-1">
          {#each Array.from({ length: latticeRows }) as _, row}
            {#each Array.from({ length: latticeColumns }) as _, column}
              <button
                class="rounded-lg border border-border-card px-2 py-2 text-left text-xs"
                class:border-primary={hasPosition(row, column)}
                class:bg-primary={hasPosition(row, column)}
                class:text-white={hasPosition(row, column)}
                type="button"
                aria-pressed={hasPosition(row, column)}
                aria-label={translate(locale, 'panel.opengrid.intersection', {
                  row: row + 1,
                  column: column + 1,
                })}
                onclick={() => togglePosition(row, column)}
              >
                {translate(locale, 'panel.opengrid.intersection', {
                  row: row + 1,
                  column: column + 1,
                })}
              </button>
            {/each}
          {/each}
        </div>
      {/if}
      {#if fieldError('customScrewPositions')}<span
          class="text-sm text-error"
          role="alert">{fieldErrorMessage('customScrewPositions')}</span
        >{/if}
    </div>
  {/if}

  {#each ['variant', 'chamfers', 'connectorHoles', 'screwKind', 'screwMode', 'screwCenter', 'screwEvery', 'screwDiameter', 'screwHeadDiameter', 'screwHeadInset', 'screwHeadCountersunkDegree'] as field}
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
