<script lang="ts">
  import type { Snippet } from 'svelte'
  import {
    OPENCONNECT_ALIGNMENT_DEFAULTS,
    type OpenConnectAlignmentParameters,
  } from '../../../cad-contract/units/openconnect-alignment'
  import { translate } from '../../../i18n'
  import ParameterField from './ParameterField.svelte'
  import type { ComponentPanelProps } from './types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
    children,
    defaults = OPENCONNECT_ALIGNMENT_DEFAULTS,
  }: ComponentPanelProps & {
    children?: Snippet
    defaults?: Required<OpenConnectAlignmentParameters>
  } = $props()

  const fields = [
    {
      key: 'openConnectHorizontalAlignment',
      label: 'panel.openConnect.horizontalAlignment',
      options: ['left', 'center', 'right'],
    },
    {
      key: 'openConnectVerticalAlignment',
      label: 'panel.openConnect.verticalAlignment',
      options: ['top', 'center', 'bottom'],
    },
  ] as const
</script>

<details
  class="rounded-lg border border-border-field bg-panel"
  data-testid="openconnect-settings"
>
  <summary
    class="cursor-pointer rounded-lg px-3 py-2 font-[650] focus-visible:outline-2 focus-visible:outline-primary"
    >OpenConnect</summary
  >
  <div class="grid gap-3 px-3 pb-3">
    {@render children?.()}
    {#each fields as field (field.key)}
      {@const defaultValue = defaults[field.key]}
      {@const value = rawParameters[field.key] ?? defaultValue}
      <ParameterField
        {locale}
        label={translate(locale, field.label)}
        changed={value !== defaultValue}
        error={fieldErrors[field.key]}
        errorId={`${field.key}-error`}
        onRestore={() => onInputChange(field.key, defaultValue)}
      >
        <select
          class="w-full min-w-0 rounded-lg border border-border-field bg-page px-3 py-2 text-base text-ink"
          aria-label={translate(locale, field.label)}
          aria-invalid={Boolean(fieldErrors[field.key])}
          aria-describedby={fieldErrors[field.key]
            ? `${field.key}-error`
            : undefined}
          {value}
          onchange={(event) =>
            onInputChange(field.key, event.currentTarget.value)}
        >
          {#each field.options as option}
            <option value={option}
              >{translate(locale, `panel.openConnect.align.${option}`)}</option
            >
          {/each}
        </select>
      </ParameterField>
    {/each}
  </div>
</details>
