<script lang="ts">
  import { translate, type Locale } from '../../../i18n'
  import type { ParameterField as ParameterFieldDefinition } from '../../../features/cad/model-catalog'
  import {
    displayParameterLabel,
    unitLabelFor,
  } from '../../../features/cad/model-catalog'
  import ParameterControl from '../component-panels/ParameterControl.svelte'
  import ParameterField from '../component-panels/ParameterField.svelte'
  import type { PlaygroundInstance } from '../../../features/cad/playground/store'

  type Props = {
    locale: Locale
    instance: PlaygroundInstance
    fields: ReadonlyArray<ParameterFieldDefinition>
    onParameterChange: (key: string, value: string) => void
    onLabelChange: (label: string) => void
    onPlacementChange: (cellX: number, cellY: number, rotation: number) => void
    onColorsChange: (primary: string, secondary: string) => void
    onExport: (format: 'step' | 'stl') => void
    onDuplicate: () => void
    onDelete: () => void
    onRetry: () => void
  }

  let {
    locale,
    instance,
    fields,
    onParameterChange,
    onLabelChange,
    onPlacementChange,
    onColorsChange,
    onExport,
    onDuplicate,
    onDelete,
    onRetry,
  }: Props = $props()

  let cellX = $state('')
  let cellY = $state('')
  let rotation = $state(0)
  let lastPlacementSignature = $state('')

  /**
   * Component-page help text: the panel description shown by the component's
   * own workspace; components whose panels have no description fall back to
   * the model description from the catalog.
   */
  const PANEL_HELP_KEYS: Partial<Record<string, string>> = {
    'hexagonal-column': 'panel.hexagonalColumn.description',
    'hsw-cell': 'panel.hswCell.description',
    'modular-grid-base': 'panel.modularGridBase.description',
    'opengrid-organizer-box': 'panel.organizerBox.description',
    'opengrid-openconnect-organizer': 'panel.openConnectOrganizer.description',
    'opengrid-openconnect-shelf': 'panel.openConnectShelf.description',
    'opengrid-openconnect-tissue-box': 'panel.tissueBox.help',
    'opengrid-open-shelf': 'panel.openShelf.description',
  }

  let helpKey = $derived(
    PANEL_HELP_KEYS[instance.modelId] ??
      `models.model.${instance.modelId}.description`,
  )

  $effect(() => {
    // Resync the placement inputs only when the selected instance changes or
    // its committed placement actually changes; unrelated store emissions
    // must not clobber values the user is still editing.
    const committed = instance.placement
    const signature = `${instance.id}:${committed ? `${committed.cellX},${committed.cellY},${committed.rotation}` : 'none'}`
    if (signature === lastPlacementSignature) return
    lastPlacementSignature = signature
    cellX = String(committed?.cellX ?? 0)
    cellY = String(committed?.cellY ?? 0)
    rotation = committed?.rotation ?? 0
  })

  function commitPlacement(): void {
    if (cellX.trim() === '' || cellY.trim() === '') return
    const parsedX = Number(cellX)
    const parsedY = Number(cellY)
    if (!Number.isInteger(parsedX) || !Number.isInteger(parsedY)) return
    onPlacementChange(parsedX, parsedY, rotation)
  }

  function stepPlacement(axis: 'x' | 'y', delta: number): void {
    const raw = axis === 'x' ? cellX : cellY
    const parsed = Number(raw)
    if (raw.trim() === '' || !Number.isInteger(parsed)) return
    const nextX = axis === 'x' ? parsed + delta : Number(cellX)
    const nextY = axis === 'y' ? parsed + delta : Number(cellY)
    if (!Number.isInteger(nextX) || !Number.isInteger(nextY)) return
    if (axis === 'x') cellX = String(nextX)
    else cellY = String(nextY)
    onPlacementChange(nextX, nextY, rotation)
  }

  const STEP_BUTTON_CLASS =
    'w-8 shrink-0 rounded-md border border-border-field bg-panel text-center text-base leading-none text-ink hover:bg-page disabled:cursor-not-allowed disabled:opacity-50'

  function handleColorInput(which: 'primary' | 'secondary', value: string) {
    return which === 'primary'
      ? onColorsChange(value, instance.colors.secondary)
      : onColorsChange(instance.colors.primary, value)
  }
</script>

<div class="grid gap-4" data-testid="playground-instance-panel">
  <p
    class="m-0 text-sm leading-normal text-muted-foreground"
    data-testid="playground-instance-help"
  >
    {translate(locale, helpKey)}
  </p>

  <div class="grid gap-[0.3rem]">
    <label class="font-[650]" for="playground-label">
      {translate(locale, 'playground.instance.label')}
    </label>
    <input
      id="playground-label"
      class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      type="text"
      value={instance.label ?? ''}
      placeholder={translate(locale, 'playground.instance.labelPlaceholder')}
      oninput={(event) => {
        if (!(event.currentTarget instanceof HTMLInputElement)) return
        onLabelChange(event.currentTarget.value)
      }}
    />
  </div>

  <fieldset class="grid gap-2 rounded-xl border border-border-card p-3">
    <legend class="px-1 font-[650]">
      {translate(locale, 'playground.placement.title')}
    </legend>
    <div class="flex items-center gap-2">
      <label class="shrink-0" for="playground-cell-x">
        {translate(locale, 'playground.placement.cellX')}
      </label>
      <div class="flex w-full items-center gap-1">
        <button
          class={STEP_BUTTON_CLASS}
          type="button"
          aria-label={translate(locale, 'playground.placement.stepDown', {
            axis: 'X',
          })}
          onclick={() => stepPlacement('x', -1)}
        >
          −
        </button>
        <input
          id="playground-cell-x"
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.4rem] text-center text-base text-ink"
          inputmode="numeric"
          type="text"
          bind:value={cellX}
          onchange={commitPlacement}
        />
        <button
          class={STEP_BUTTON_CLASS}
          type="button"
          aria-label={translate(locale, 'playground.placement.stepUp', {
            axis: 'X',
          })}
          onclick={() => stepPlacement('x', 1)}
        >
          +
        </button>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <label class="shrink-0" for="playground-cell-y">
        {translate(locale, 'playground.placement.cellY')}
      </label>
      <div class="flex w-full items-center gap-1">
        <button
          class={STEP_BUTTON_CLASS}
          type="button"
          aria-label={translate(locale, 'playground.placement.stepDown', {
            axis: 'Y',
          })}
          onclick={() => stepPlacement('y', -1)}
        >
          −
        </button>
        <input
          id="playground-cell-y"
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.4rem] text-center text-base text-ink"
          inputmode="numeric"
          type="text"
          bind:value={cellY}
          onchange={commitPlacement}
        />
        <button
          class={STEP_BUTTON_CLASS}
          type="button"
          aria-label={translate(locale, 'playground.placement.stepUp', {
            axis: 'Y',
          })}
          onclick={() => stepPlacement('y', 1)}
        >
          +
        </button>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <label class="shrink-0" for="playground-rotation">
        {translate(locale, 'playground.placement.rotation')}
      </label>
      <select
        id="playground-rotation"
        bind:value={rotation}
        onchange={commitPlacement}
        class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      >
        {#each [0, 90, 180, 270] as option (option)}
          <option value={option}>{option}°</option>
        {/each}
      </select>
    </div>
  </fieldset>

  {#if fields.length > 0}
    <fieldset class="grid gap-3 rounded-xl border border-border-card p-3">
      <legend class="px-1 font-[650]">
        {translate(locale, 'playground.parameters.title')}
      </legend>
      {#each fields as field (field.key)}
        <div data-testid={`playground-param-${field.key}`}>
          <ParameterField
            {locale}
            label={displayParameterLabel(field, locale)}
            unit={unitLabelFor(locale, field.unit)}
            error={instance.fieldErrors[field.key]}
            errorId={`${field.key}-playground-error`}
          >
            <ParameterControl
              {locale}
              {field}
              value={instance.rawParameters[field.key] ?? ''}
              error={instance.fieldErrors[field.key]}
              errorId={`${field.key}-playground-error`}
              onChange={(value) => onParameterChange(field.key, value)}
            />
          </ParameterField>
        </div>
      {/each}
    </fieldset>
  {/if}

  <fieldset class="grid gap-2 rounded-xl border border-border-card p-3">
    <legend class="px-1 font-[650]">
      {translate(locale, 'playground.colors.title')}
    </legend>
    <div class="flex items-center gap-2">
      <label class="shrink-0" for="playground-color-primary">
        {translate(locale, 'viewport.colors.primary')}
      </label>
      <input
        id="playground-color-primary"
        type="color"
        value={instance.colors.primary}
        oninput={(event) => {
          if (!(event.currentTarget instanceof HTMLInputElement)) return
          handleColorInput('primary', event.currentTarget.value)
        }}
      />
      <label class="shrink-0" for="playground-color-secondary">
        {translate(locale, 'viewport.colors.secondary')}
      </label>
      <input
        id="playground-color-secondary"
        type="color"
        value={instance.colors.secondary}
        oninput={(event) => {
          if (!(event.currentTarget instanceof HTMLInputElement)) return
          handleColorInput('secondary', event.currentTarget.value)
        }}
      />
    </div>
  </fieldset>

  <div class="flex flex-wrap items-center gap-2">
    {#if import.meta.env.DEV}
      <button
        class="rounded-lg border border-border-card bg-panel px-[0.8rem] py-[0.6rem] text-base text-ink hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="playground-export-step"
        disabled={instance.meshState !== 'ready' || instance.exportWorking}
        onclick={() => onExport('step')}
      >
        {translate(locale, 'playground.export.step')}
      </button>
    {/if}
    <button
      class="rounded-lg border border-border-card bg-panel px-[0.8rem] py-[0.6rem] text-base text-ink hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
      data-testid="playground-export-stl"
      disabled={instance.meshState !== 'ready' || instance.exportWorking}
      onclick={() => onExport('stl')}
    >
      {translate(locale, 'playground.export.stl')}
    </button>
    {#if instance.exportWorking}
      <span class="text-sm text-muted-foreground" aria-live="polite">
        {translate(locale, 'playground.export.working')}
      </span>
    {/if}
    <button
      class="rounded-lg border border-border-card bg-panel px-[0.8rem] py-[0.6rem] text-base text-ink hover:bg-page"
      onclick={onDuplicate}
    >
      {translate(locale, 'playground.instance.duplicate')}
    </button>
    <button
      class="rounded-lg border border-border-card bg-panel px-[0.8rem] py-[0.6rem] text-base text-ink hover:bg-page"
      onclick={onDelete}
    >
      {translate(locale, 'playground.instance.delete')}
    </button>
    {#if instance.meshState === 'failed'}
      <button
        class="rounded-lg border border-border-card bg-panel px-[0.8rem] py-[0.6rem] text-base text-ink hover:bg-page"
        data-testid="playground-instance-retry"
        onclick={onRetry}
      >
        {translate(locale, 'playground.instance.retry')}
      </button>
      <span class="text-sm text-error" role="alert">
        {translate(locale, 'playground.instance.failed')}
      </span>
    {/if}
  </div>
</div>
