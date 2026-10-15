<script lang="ts">
  import {
    OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    type OpenGridOpenConnectOrganizerLayout,
  } from '../../../../cad-contract/units'
  import {
    OPENGRID_LABEL_GRID,
    openGridLabelSlotLayoutFor,
    openGridLabelWidthFor,
  } from '../../../../cad-contract/units/opengrid-label-shared'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import { translate } from '../../../../i18n'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
    layout,
  }: ComponentPanelProps & {
    layout: OpenGridOpenConnectOrganizerLayout | null
  } = $props()

  let labelEnabled = $derived(rawParameters.labelSlotEnabled === 'true')
  let labelUnits = $derived(
    rawParameters.labelGridUnits ??
      String(OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS.labelGridUnits),
  )
  let slotLayout = $derived(
    layout ? openGridLabelSlotLayoutFor(layout, Number(labelUnits)) : null,
  )
</script>

<fieldset
  class="grid gap-2 rounded-lg border border-border-field p-3"
  data-testid="organizer-label-slot-panel"
>
  <label class="flex items-center gap-2">
    <input
      type="checkbox"
      checked={labelEnabled}
      data-testid="organizer-label-slot-enabled"
      onchange={(event) =>
        onInputChange('labelSlotEnabled', String(event.currentTarget.checked))}
    />
    {translate(locale, 'parameter.labelSlotEnabled')}
  </label>
  {#if labelEnabled}
    <label for="organizer-label-units" class="text-sm"
      >{translate(locale, 'parameter.labelGridUnits')} · {labelUnits}</label
    >
    <input
      id="organizer-label-units"
      type="range"
      min={OPENGRID_LABEL_GRID.minUnits}
      max={OPENGRID_LABEL_GRID.maxUnits}
      step="1"
      value={labelUnits}
      data-testid="organizer-label-grid-units"
      aria-invalid={Boolean(fieldErrors.labelGridUnits)}
      aria-describedby="organizer-label-fit"
      class="min-w-0 w-full accent-primary"
      oninput={(event) =>
        onInputChange('labelGridUnits', event.currentTarget.value)}
    />
    <p
      class="m-0 text-sm text-muted-foreground"
      data-testid="organizer-label-width-summary"
    >
      {translate(locale, 'panel.openConnectOrganizer.labelWidth', {
        width:
          Number.isFinite(Number(labelUnits)) && labelUnits.trim()
            ? openGridLabelWidthFor(Number(labelUnits))
            : '—',
        max: slotLayout?.maxUnits ?? 0,
      })}
    </p>
    <p class="m-0 text-sm text-muted-foreground">
      {translate(locale, 'panel.openConnectOrganizer.labelHelp')}
    </p>
    <span id="organizer-label-fit" class="text-sm text-error" role="alert">
      {#if fieldErrors.labelGridUnits}{formatValidationIssue(
          locale,
          fieldErrors.labelGridUnits,
        )}{/if}
    </span>
  {/if}
</fieldset>
