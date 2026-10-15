<script lang="ts">
  import { translate } from '../../../../i18n'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    onInputChange,
    fieldKey,
    testid,
    radioName,
    legendKey,
    options,
    selectedValue,
    errorDescriptionIds,
    ariaInvalid,
    optionTestidPrefix,
    radioDescribedby,
  }: Pick<ComponentPanelProps, 'locale' | 'onInputChange'> & {
    fieldKey: 'cornerSeatMode' | 'topRimMode' | 'bottomMode'
    testid: string
    radioName: string
    legendKey: string
    options: ReadonlyArray<{
      value: string
      labelKey: string
      descriptionKey: string
    }>
    selectedValue: string
    errorDescriptionIds: string | undefined
    ariaInvalid: boolean
    optionTestidPrefix?: string
    radioDescribedby?: boolean
  } = $props()

  function handleModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (!event.currentTarget.checked) return
    onInputChange(fieldKey, event.currentTarget.value)
  }
</script>

<fieldset
  class="grid gap-2 border-0 p-0"
  aria-describedby={errorDescriptionIds}
  aria-invalid={ariaInvalid}
  aria-label={translate(locale, legendKey)}
  role="radiogroup"
  data-testid={testid}
>
  <legend class="font-[650]">{translate(locale, legendKey)}</legend>
  <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
    {#each options as option (option.value)}
      <label class="flex min-w-0 items-start gap-2">
        <input
          aria-describedby={radioDescribedby ? errorDescriptionIds : undefined}
          aria-label={translate(locale, option.labelKey)}
          class="mt-1 accent-primary"
          data-testid={optionTestidPrefix
            ? `${optionTestidPrefix}-${option.value}`
            : undefined}
          name={radioName}
          type="radio"
          value={option.value}
          checked={selectedValue === option.value}
          onchange={handleModeChange}
        />
        <span class="font-[650]">{translate(locale, option.labelKey)}</span>
      </label>
    {/each}
  </div>
  <span class="text-sm text-muted-foreground">
    {options.find((option) => option.value === selectedValue)?.descriptionKey
      ? translate(
          locale,
          options.find((option) => option.value === selectedValue)!
            .descriptionKey,
        )
      : ''}
  </span>
</fieldset>
