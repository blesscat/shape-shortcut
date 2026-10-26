<script lang="ts">
  import {
    isOpenGridLabelSnapFit,
    OPENGRID_LABEL_DEFAULT_SNAP_FIT,
    OPENGRID_LABEL_SNAP_FITS,
    type OpenGridLabelSnapFit,
  } from '../../../cad-contract/units/opengrid-label-ledge'
  import { translate, type Locale } from '../../../i18n'

  let {
    locale,
    value,
    testid,
    radioName,
    onSelect,
  }: {
    locale: Locale
    value: string | undefined
    testid: string
    radioName: string
    onSelect: (fit: OpenGridLabelSnapFit) => void
  } = $props()

  let selected = $derived(
    isOpenGridLabelSnapFit(value) ? value : OPENGRID_LABEL_DEFAULT_SNAP_FIT,
  )
</script>

<fieldset
  class="grid gap-2 border-0 p-0"
  aria-label={translate(locale, 'panel.boxLabel.fit')}
  role="radiogroup"
  data-testid={testid}
>
  <legend class="font-[650]">{translate(locale, 'panel.boxLabel.fit')}</legend>
  <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
    {#each OPENGRID_LABEL_SNAP_FITS as fit (fit)}
      <label class="flex min-w-0 items-start gap-2">
        <input
          class="mt-1 accent-primary"
          data-testid={`${testid}-${fit}`}
          name={radioName}
          type="radio"
          value={fit}
          checked={selected === fit}
          onchange={() => onSelect(fit)}
        />
        <span class="font-[650]"
          >{translate(locale, `panel.boxLabel.fit.${fit}`)}</span
        >
      </label>
    {/each}
  </div>
  <span class="text-sm text-muted-foreground"
    >{translate(locale, 'panel.boxLabel.fitHelp')}</span
  >
</fieldset>
