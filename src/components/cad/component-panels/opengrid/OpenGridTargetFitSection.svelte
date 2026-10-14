<script lang="ts">
  import {
    type OpenGridFrameSideFlags,
    type OpenGridParameterKey,
    type OpenGridParameters,
    type OpenGridTargetFrameShape,
    type ValidationIssue,
  } from '../../../../cad-contract/units'
  import {
    calculateOpenGridCounts,
    type GridDimensionInput,
  } from '../../../../features/cad/grid-dimensions'
  import type { Locale } from '../../../../i18n'
  import GridDimensionCalculator from '../GridDimensionCalculator.svelte'
  import ParameterField from '../ParameterField.svelte'
  import { translate } from '../../../../i18n'
  import { isParameterChanged, mergeOpenGridParameters } from './panel-logic'

  type Props = {
    locale: Locale
    parameters: OpenGridParameters
    effectiveDefaults: OpenGridParameters
    fieldErrors: Partial<
      Record<OpenGridParameterKey | 'parameters', ValidationIssue>
    >
    calculate: (
      input: GridDimensionInput,
    ) => ReturnType<typeof calculateOpenGridCounts>
    onApply: (
      changes: { rows: number; columns: number },
      target?: { x: number; y: number },
    ) => void
    onInvalid: () => void
    onParametersChange: (parameters: OpenGridParameters) => void
  }

  let {
    locale,
    parameters,
    effectiveDefaults,
    fieldErrors,
    calculate,
    onApply,
    onInvalid,
    onParametersChange,
  }: Props = $props()

  function parameterChanged(field: OpenGridParameterKey): boolean {
    return isParameterChanged(parameters, effectiveDefaults, field)
  }

  function fieldError(field: keyof OpenGridParameters | 'parameters') {
    return fieldErrors[field]
  }

  function restoreParameter(field: OpenGridParameterKey): void {
    updateParameters({
      [field]: effectiveDefaults[field],
    } as Partial<OpenGridParameters>)
  }

  function updateParameters(changes: Partial<OpenGridParameters>): void {
    onParametersChange(mergeOpenGridParameters(parameters, changes))
  }

  function updateSelect(field: 'targetFrameShape', event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    const value = event.currentTarget.value
    if (field === 'targetFrameShape') {
      updateParameters({
        targetFrameShape: value as OpenGridTargetFrameShape,
      })
    }
  }

  function updateFrameSide(
    field: keyof OpenGridFrameSideFlags,
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({
      targetFrameSides: {
        ...parameters.targetFrameSides,
        [field]: event.currentTarget.checked,
      },
    })
  }
</script>

{#if parameters.fitToTarget}
  <GridDimensionCalculator
    {locale}
    {calculate}
    {onApply}
    {onInvalid}
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
    label={translate(locale, 'panel.opengrid.targetFrameShape')}
    changed={parameterChanged('targetFrameShape')}
    error={fieldError('targetFrameShape')}
    errorId="opengrid-target-frame-shape-error"
    restoreLabel={translate(locale, 'panel.opengrid.targetFrameShapeRestore')}
    onRestore={() => restoreParameter('targetFrameShape')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.opengrid.targetFrameShapeRestore')}
      aria-describedby={fieldError('targetFrameShape')
        ? 'opengrid-target-frame-shape-error'
        : undefined}
      aria-invalid={Boolean(fieldError('targetFrameShape'))}
      value={parameters.targetFrameShape}
      onchange={(event) => updateSelect('targetFrameShape', event)}
    >
      <option value="none">{translate(locale, 'panel.opengrid.none')}</option>
      <option value="chamfer"
        >{translate(locale, 'panel.opengrid.targetFrameShapeChamfer')}</option
      >
      <option value="fillet"
        >{translate(locale, 'panel.opengrid.targetFrameShapeFillet')}</option
      >
    </select>
  </ParameterField>

  <ParameterField
    {locale}
    label={translate(locale, 'panel.opengrid.targetFrameSides')}
    changed={parameterChanged('targetFrameSides')}
    error={fieldError('targetFrameSides')}
    errorId="opengrid-target-frame-sides-error"
    restoreLabel={translate(locale, 'panel.opengrid.targetFrameSidesRestore')}
    onRestore={() => restoreParameter('targetFrameSides')}
  >
    <div
      class="grid grid-cols-1 gap-2 rounded-lg border border-border-card p-2 text-sm sm:grid-cols-2"
      data-testid="opengrid-target-frame-sides"
    >
      {#each [['top', 'panel.opengrid.top'], ['right', 'panel.opengrid.right'], ['bottom', 'panel.opengrid.bottom'], ['left', 'panel.opengrid.left']] as item}
        {@const side = item[0] as keyof OpenGridFrameSideFlags}
        <label class="flex min-w-0 items-center gap-2">
          <input
            type="checkbox"
            aria-label={`${translate(locale, 'panel.opengrid.targetFrameSides')} ${translate(locale, item[1])}`}
            checked={parameters.targetFrameSides[side]}
            onchange={(event) => updateFrameSide(side, event)}
          />
          {translate(locale, item[1])}
        </label>
      {/each}
    </div>
  </ParameterField>
{/if}
