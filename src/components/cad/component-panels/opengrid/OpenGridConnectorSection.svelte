<script lang="ts">
  import {
    type OpenGridParameterKey,
    type OpenGridParameters,
    type OpenGridSideFlags,
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

  function updateSelect(field: 'connectorHoles', event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    const value = event.currentTarget.value
    if (field === 'connectorHoles') {
      updateParameters({
        connectorHoles: value as OpenGridParameters['connectorHoles'],
      })
    }
  }

  function updateSide(field: keyof OpenGridSideFlags, event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({
      connectorSides: {
        ...parameters.connectorSides,
        [field]: event.currentTarget.checked,
      },
    })
  }
</script>

<ParameterField
  {locale}
  label={translate(locale, 'panel.opengrid.connector')}
  changed={parameterChanged('connectorHoles')}
  error={fieldErrors.connectorHoles}
  errorId="opengrid-connector-holes-error"
  restoreLabel={translate(locale, 'panel.opengrid.connectorRestore')}
  onRestore={() => restoreParameter('connectorHoles')}
>
  <select
    class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
    aria-label={translate(locale, 'panel.opengrid.connectorRestore')}
    aria-describedby={fieldErrors.connectorHoles
      ? 'opengrid-connector-holes-error'
      : undefined}
    aria-invalid={Boolean(fieldErrors.connectorHoles)}
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
