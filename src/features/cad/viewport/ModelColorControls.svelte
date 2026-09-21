<script lang="ts">
  import {
    DEFAULT_MODEL_COLORS,
    isModelColor,
    type ModelColors,
  } from '../../../cad-contract/model-colors'
  import { translate, type Locale } from '../../../i18n'

  type Props = {
    locale: Locale
    colors: ModelColors
    onChange: (colors: ModelColors) => void
  }
  let { locale, colors, onChange }: Props = $props()
  const id = $props.id()
  let open = $state(false)
  let trigger: HTMLButtonElement
  let container: HTMLDivElement
  let primaryHex = $state('')
  let secondaryHex = $state('')
  $effect(() => {
    primaryHex = colors.primary
  })
  $effect(() => {
    secondaryHex = colors.secondary
  })

  function updateColor(role: keyof ModelColors, value: string): void {
    if (isModelColor(value))
      onChange({ ...colors, [role]: value.toLowerCase() })
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (
      open &&
      event.key === 'Escape' &&
      container?.contains(document.activeElement)
    ) {
      open = false
      trigger?.focus()
    }
  }

  function handlePointerdown(event: PointerEvent): void {
    if (
      open &&
      event.target instanceof Node &&
      !container?.contains(event.target)
    )
      open = false
  }
</script>

<svelte:window onkeydown={handleKeydown} onpointerdown={handlePointerdown} />

<div
  bind:this={container}
  class="absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] text-sm text-ink"
>
  <button
    bind:this={trigger}
    type="button"
    class="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border-field bg-panel px-3 py-2 font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    aria-expanded={open}
    aria-controls={`${id}-palette`}
    onclick={() => {
      open = !open
    }}
  >
    <span class="flex -space-x-1" aria-hidden="true">
      <span
        class="size-4 rounded-full border border-border-field"
        style:background-color={colors.primary}
      ></span>
      <span
        class="size-4 rounded-full border border-border-field"
        style:background-color={colors.secondary}
      ></span>
    </span>
    {translate(locale, 'viewport.colors.title')}
  </button>
  {#if open}
    <div
      id={`${id}-palette`}
      class="mt-2 grid max-h-[calc(100dvh-21rem)] w-64 max-w-full gap-3 overflow-y-auto rounded-xl border border-border-card bg-panel p-3 shadow-card"
    >
      <p class="m-0 text-xs leading-5 text-muted-foreground">
        {translate(locale, 'viewport.colors.scope')}
      </p>
      <div class="grid grid-cols-[1fr_2.75rem_6rem] items-center gap-2">
        <label for={`${id}-primary`}
          >{translate(locale, 'viewport.colors.primary')}</label
        >
        <input
          id={`${id}-primary`}
          type="color"
          value={colors.primary}
          class="h-10 w-11 cursor-pointer rounded border border-border-field bg-page p-1"
          oninput={(event) => updateColor('primary', event.currentTarget.value)}
        />
        <input
          aria-label={`${translate(locale, 'viewport.colors.primary')} HEX`}
          aria-invalid={!isModelColor(primaryHex)}
          type="text"
          spellcheck={false}
          maxlength="7"
          class="h-10 min-w-0 rounded border border-border-field bg-page px-2 font-mono text-xs focus-visible:outline-focus"
          bind:value={primaryHex}
          oninput={(event) => updateColor('primary', event.currentTarget.value)}
          onblur={() => {
            primaryHex = colors.primary
          }}
        />
        <label for={`${id}-secondary`}
          >{translate(locale, 'viewport.colors.secondary')}</label
        >
        <input
          id={`${id}-secondary`}
          type="color"
          value={colors.secondary}
          class="h-10 w-11 cursor-pointer rounded border border-border-field bg-page p-1"
          oninput={(event) =>
            updateColor('secondary', event.currentTarget.value)}
        />
        <input
          aria-label={`${translate(locale, 'viewport.colors.secondary')} HEX`}
          aria-invalid={!isModelColor(secondaryHex)}
          type="text"
          spellcheck={false}
          maxlength="7"
          class="h-10 min-w-0 rounded border border-border-field bg-page px-2 font-mono text-xs focus-visible:outline-focus"
          bind:value={secondaryHex}
          oninput={(event) =>
            updateColor('secondary', event.currentTarget.value)}
          onblur={() => {
            secondaryHex = colors.secondary
          }}
        />
      </div>
      <p class="m-0 text-xs leading-5 text-muted-foreground">
        {translate(locale, 'viewport.colors.secondaryHint')}
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="min-h-10 cursor-pointer rounded-lg border border-border-field bg-page px-2 focus-visible:outline-focus"
          onclick={() =>
            onChange({ primary: colors.secondary, secondary: colors.primary })}
          >{translate(locale, 'viewport.colors.swap')}</button
        >
        <button
          type="button"
          class="min-h-10 cursor-pointer rounded-lg border border-border-field bg-page px-2 focus-visible:outline-focus"
          onclick={() => onChange({ ...DEFAULT_MODEL_COLORS })}
          >{translate(locale, 'viewport.colors.reset')}</button
        >
      </div>
    </div>
  {/if}
</div>
