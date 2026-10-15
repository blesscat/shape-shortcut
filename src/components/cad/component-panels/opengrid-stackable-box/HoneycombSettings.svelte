<script lang="ts">
  import { translate } from '../../../../i18n'
  import { openGridStackableBoxHoneycombPanelCellCountFor } from '../../../../cad-kernel/lattice/opengrid-honeycomb-cells'
  import { validateOpenGridStackableBoxParameters } from '../../../../cad-contract/units'
  import HoneycombCellCountEstimate from '../HoneycombCellCountEstimate.svelte'
  import HoneycombRenderWarning from '../HoneycombRenderWarning.svelte'
  import type { ComponentPanelProps } from '../types'
  import { parametersForRange } from './stackable-box-panel-logic'

  let {
    locale,
    rawParameters,
    onInputChange,
  }: Pick<ComponentPanelProps, 'locale' | 'rawParameters' | 'onInputChange'> =
    $props()

  let honeycombCellCount = $derived.by(() => {
    if (rawParameters.honeycombMode !== 'true') return null
    const candidate = parametersForRange(rawParameters)
    if (!candidate) return null
    const validation = validateOpenGridStackableBoxParameters(candidate)
    if (!validation.valid) return null
    return openGridStackableBoxHoneycombPanelCellCountFor(validation.value)
  })
</script>

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
