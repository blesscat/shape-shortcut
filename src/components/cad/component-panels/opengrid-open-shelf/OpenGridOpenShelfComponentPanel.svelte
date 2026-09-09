<script lang="ts">
  import {
    displayParameterLabel,
    opengridOpenShelfDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    openGridOpenShelfCellSpaceFor,
    OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
    validateOpenGridOpenShelfParameters,
    type OpenGridOpenShelfParameters,
  } from '../../../../cad-contract/units'
  import { openGridOpenShelfHoneycombCellCountFor } from '../../../../cad-kernel/lattice/opengrid-honeycomb-cells'
  import HoneycombCellCountEstimate from '../HoneycombCellCountEstimate.svelte'
  import HoneycombRenderWarning from '../HoneycombRenderWarning.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import { translate } from '../../../../i18n'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const OPEN_SHELF_PARAMETER_KEYS = [
    'x',
    'y',
    'height',
    'cellX',
    'cellZ',
    'angle',
  ] as const satisfies readonly Exclude<
    keyof OpenGridOpenShelfParameters,
    'honeycombMode'
  >[]

  function parametersForDisplay(): OpenGridOpenShelfParameters | null {
    if (Object.keys(fieldErrors).length > 0) return null
    const candidate: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      honeycombMode: rawParameters.honeycombMode === 'true',
    }
    for (const key of OPEN_SHELF_PARAMETER_KEYS) {
      const rawValue = rawParameters[key]
      if (rawValue === undefined || rawValue.trim() === '') continue
      const value = Number(rawValue)
      if (!Number.isFinite(value)) return null
      candidate[key] = value
    }
    const validation = validateOpenGridOpenShelfParameters(candidate)
    return validation.valid ? validation.value : null
  }

  function formatDimension(value: number): string {
    return Number(value.toFixed(2)).toString()
  }

  let cellSpace = $derived.by(() => {
    const parameters = parametersForDisplay()
    if (!parameters) return null
    return {
      parameters,
      space: openGridOpenShelfCellSpaceFor(parameters),
    }
  })

  let honeycombCellCount = $derived.by(() => {
    if (rawParameters.honeycombMode !== 'true') return null
    const parameters = parametersForDisplay()
    if (!parameters) return null
    return openGridOpenShelfHoneycombCellCountFor(parameters)
  })
</script>

<div class="grid gap-3">
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="opengrid-open-shelf-help"
  >
    {translate(locale, 'panel.openShelf.description')}
  </p>
  {#if cellSpace}
    <div
      class="grid gap-1 rounded-lg border border-border-card bg-page px-3 py-2 text-sm text-muted-foreground"
      data-testid="opengrid-open-shelf-cell-space"
    >
      <p class="m-0 font-[650] text-ink">
        {translate(locale, 'panel.openShelf.cellSpace.title')}
      </p>
      <p class="m-0">
        {translate(locale, 'panel.openShelf.cellSpace.dimensions', {
          width: formatDimension(cellSpace.space.width),
          depth: formatDimension(cellSpace.space.depth),
          columns: cellSpace.parameters.cellX,
          layers: cellSpace.parameters.cellZ,
        })}
      </p>
      {#if cellSpace.parameters.angle > 0}
        <p class="m-0">
          {translate(locale, 'panel.openShelf.cellSpace.wedge', {
            front: formatDimension(cellSpace.space.wedge.front),
            back: formatDimension(cellSpace.space.wedge.rear),
          })}
        </p>
      {/if}
      <p class="m-0">
        {translate(locale, 'panel.openShelf.cellSpace.regular', {
          layers: cellSpace.parameters.cellZ,
          height: formatDimension(cellSpace.space.regular.front),
        })}
      </p>
    </div>
  {/if}
  <label class="flex items-start gap-2 text-sm">
    <input
      class="mt-0.5"
      type="checkbox"
      aria-label={translate(locale, 'panel.openShelf.honeycomb')}
      data-testid="opengrid-open-shelf-honeycomb-mode"
      checked={rawParameters.honeycombMode === 'true'}
      onchange={(event) => {
        if (!(event.currentTarget instanceof HTMLInputElement)) return
        onInputChange('honeycombMode', String(event.currentTarget.checked))
      }}
    />
    <span>{translate(locale, 'panel.openShelf.honeycomb')}</span>
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
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    {#each opengridOpenShelfDefinition.parameterSchema as field (field.key)}
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
  </fieldset>
</div>
