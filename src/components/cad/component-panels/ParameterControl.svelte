<script lang="ts">
  import {
    displayParameterLabel,
    unitLabelFor,
    type ParameterField,
  } from '../../../features/cad/model-catalog'
  import type { Locale } from '../../../i18n'
  import type { ValidationIssue } from '../../../cad-contract/units'
  import Slider from './Slider.svelte'

  type Props = {
    locale: Locale
    field: ParameterField
    value: string
    error?: ValidationIssue
    disabled?: boolean
    onChange: (value: string) => void
  }

  let {
    locale,
    field,
    value,
    error,
    disabled = false,
    onChange,
  }: Props = $props()

  let controlLabel = $derived(displayParameterLabel(field, locale))
  let unitLabel = $derived(unitLabelFor(locale, field.unit))

  let commonProps = $derived({
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${field.key}-error` : undefined,
    disabled,
    min: field.min,
    max: field.max,
    step: field.step,
  })

  function handleInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onChange(event.currentTarget.value)
  }
</script>

<div class="min-w-0">
  {#if field.control === 'range' || field.control === 'range-text'}
    <div class="grid gap-1">
      <Slider
        {value}
        label={controlLabel}
        min={field.sliderMin ?? field.min}
        max={field.sliderMax ?? field.max}
        step={field.step}
        direction={field.sliderDirection}
        {error}
        describedBy={error ? `${field.key}-error` : undefined}
        {disabled}
        {onChange}
      />
      {#if field.control === 'range'}
        <span
          aria-live="polite"
          class="text-right text-sm text-muted-foreground"
        >
          {value}
          {unitLabel}
        </span>
      {:else}
        <div class="min-w-0 flex items-center gap-2">
          <input
            {...commonProps}
            aria-label={controlLabel}
            class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
            inputmode="numeric"
            type="text"
            {value}
            oninput={handleInput}
          />
          <span class="shrink-0 text-sm text-muted-foreground">{unitLabel}</span
          >
        </div>
      {/if}
    </div>
  {:else}
    <input
      {...commonProps}
      aria-label={controlLabel}
      class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
      inputmode="numeric"
      type="text"
      {value}
      oninput={handleInput}
    />
  {/if}
</div>
