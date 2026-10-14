<script lang="ts">
  import { formatValidationIssue } from '../../../i18n/diagnostics'
  import { translate } from '../../../i18n'
  import type { Locale } from '../../../i18n'
  import type { ValidationIssue } from '../../../cad-contract/units'

  type Props = {
    locale: Locale
    name: string
    testId: string
    legendKey: string
    options: ReadonlyArray<{
      value: string
      labelKey: string
      descriptionKey: string
    }>
    currentValue: string
    error?: ValidationIssue
    errorId?: string
    onChange: (event: Event) => void
  }

  let {
    locale,
    name,
    testId,
    legendKey,
    options,
    currentValue,
    error,
    errorId,
    onChange,
  }: Props = $props()
</script>

<fieldset
  class="grid gap-2 border-0 p-0"
  aria-describedby={error ? errorId : undefined}
  aria-invalid={Boolean(error)}
  aria-label={translate(locale, legendKey)}
  role="radiogroup"
  data-testid={testId}
>
  <legend class="font-[650]">{translate(locale, legendKey)}</legend>
  <div class="flex flex-wrap gap-x-4 gap-y-2">
    {#each options as option (option.value)}
      <label class="flex min-w-0 items-start gap-2">
        <input
          aria-label={translate(locale, option.labelKey)}
          class="mt-1 accent-primary"
          {name}
          type="radio"
          value={option.value}
          checked={currentValue === option.value}
          onchange={onChange}
        />
        <span class="font-[650]">{translate(locale, option.labelKey)}</span>
      </label>
    {/each}
  </div>
  <span class="text-sm text-muted-foreground">
    {translate(
      locale,
      options.find((option) => option.value === currentValue)!.descriptionKey,
    )}
  </span>
  {#if error}
    <span id={errorId} class="text-sm text-error" role="alert">
      {formatValidationIssue(locale, error)}
    </span>
  {/if}
</fieldset>
