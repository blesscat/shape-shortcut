<script lang="ts">
  import {
    OPENGRID_LABEL_CARD_CONFIGURATION,
    OPENGRID_LABEL_CARD_SCREW_DIAMETERS,
    OPENGRID_LABEL_CARD_SCREW_FRONT_ICONS,
    OPENGRID_LABEL_CARD_SCREW_HEADS,
    OPENGRID_LABEL_CARD_SCREW_LENGTH,
  } from '../../../../cad-contract/units'
  import { LABEL_CARD_ICON_PATHS } from '../../../../cad-kernel/components/opengrid-label-card/icon-paths'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import LabelCardIconGlyph from './LabelCardIconGlyph.svelte'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const config = OPENGRID_LABEL_CARD_CONFIGURATION

  let rawScrewHead = $derived(
    rawParameters.screwHead ?? config.screwMode.defaultHead,
  )
  let rawScrewDiameter = $derived(
    rawParameters.screwDiameter ?? String(config.screwMode.defaultDiameter),
  )
  let rawScrewLength = $derived(
    rawParameters.screwLength ?? String(config.screwMode.defaultLength),
  )
</script>

<div class="grid gap-1">
  <span class="text-sm text-ink">
    {translate(locale, 'panel.labelCard.screwHead')}
  </span>
  <div
    class="flex flex-wrap gap-2"
    role="radiogroup"
    aria-label={translate(locale, 'panel.labelCard.screwHead')}
    data-testid="opengrid-label-card-screw-head"
  >
    {#each OPENGRID_LABEL_CARD_SCREW_HEADS as head (head)}
      {@const iconPath =
        LABEL_CARD_ICON_PATHS[OPENGRID_LABEL_CARD_SCREW_FRONT_ICONS[head]]}
      <LabelCardIconGlyph
        {iconPath}
        selected={rawScrewHead === head}
        testid={`opengrid-label-card-screw-head-${head}`}
        text={translate(locale, `panel.labelCard.screwHead.${head}`)}
        onclick={() => onInputChange('screwHead', head)}
      />
    {/each}
  </div>
  {#if fieldErrors.screwHead}
    <span class="text-sm text-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.screwHead)}</span
    >
  {/if}
</div>

<div class="grid gap-1">
  <label for="label-card-screw-diameter" class="text-sm text-ink"
    >{translate(locale, 'panel.labelCard.screwDiameter')}</label
  >
  <select
    id="label-card-screw-diameter"
    class="rounded-lg border border-border-field bg-panel px-3 py-2"
    value={rawScrewDiameter}
    aria-invalid={Boolean(fieldErrors.screwDiameter)}
    data-testid="opengrid-label-card-screw-diameter"
    onchange={(event) =>
      onInputChange('screwDiameter', event.currentTarget.value)}
  >
    {#each OPENGRID_LABEL_CARD_SCREW_DIAMETERS as diameter (diameter)}
      <option value={String(diameter)}>M{diameter}</option>
    {/each}
  </select>
  {#if fieldErrors.screwDiameter}
    <span class="text-sm text-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.screwDiameter)}</span
    >
  {/if}
</div>

<div class="grid gap-1">
  <label for="label-card-screw-length" class="text-sm text-ink"
    >{translate(locale, 'panel.labelCard.screwLength')} · {rawScrewLength}
    mm</label
  >
  <input
    id="label-card-screw-length"
    type="range"
    min={OPENGRID_LABEL_CARD_SCREW_LENGTH.min}
    max={OPENGRID_LABEL_CARD_SCREW_LENGTH.max}
    step="1"
    value={rawScrewLength}
    data-testid="opengrid-label-card-screw-length"
    aria-invalid={Boolean(fieldErrors.screwLength)}
    class="min-w-0 w-full accent-primary"
    oninput={(event) => onInputChange('screwLength', event.currentTarget.value)}
  />
  {#if fieldErrors.screwLength}
    <span class="text-sm text-error" role="alert"
      >{formatValidationIssue(locale, fieldErrors.screwLength)}</span
    >
  {/if}
</div>
