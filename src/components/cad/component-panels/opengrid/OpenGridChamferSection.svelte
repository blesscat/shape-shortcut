<script lang="ts">
  import {
    type OpenGridCornerFlags,
    type OpenGridParameterKey,
    type OpenGridParameters,
    type ValidationIssue,
  } from '../../../../cad-contract/units'
  import type { Locale } from '../../../../i18n'
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
    onParametersChange: (parameters: OpenGridParameters) => void
  }

  let {
    locale,
    parameters,
    effectiveDefaults,
    fieldErrors,
    onParametersChange,
  }: Props = $props()

  function parameterChanged(field: OpenGridParameterKey): boolean {
    return isParameterChanged(parameters, effectiveDefaults, field)
  }

  function restoreParameter(field: OpenGridParameterKey): void {
    updateParameters({
      [field]: effectiveDefaults[field],
    } as Partial<OpenGridParameters>)
  }

  function updateParameters(changes: Partial<OpenGridParameters>): void {
    onParametersChange(mergeOpenGridParameters(parameters, changes))
  }

  function updateSelect(field: 'chamfers', event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    const value = event.currentTarget.value
    if (field === 'chamfers') {
      updateParameters({ chamfers: value as OpenGridParameters['chamfers'] })
    }
  }

  function updateCorner(field: keyof OpenGridCornerFlags, event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({
      chamferCorners: {
        ...parameters.chamferCorners,
        [field]: event.currentTarget.checked,
      },
    })
  }
</script>

{#if !parameters.fitToTarget}
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
{/if}
