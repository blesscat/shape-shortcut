<script lang="ts">
  import { translate, type Locale } from '../../../i18n'
  import {
    getModelDefinition,
    modelDefinitions,
  } from '../../../features/cad/model-catalog'
  import { modelVisibleInViewMode } from '../../../features/cad/playground/wall-mount'
  import { PLAYGROUND_SCENE_MAX_INSTANCES } from '../../../cad-contract/scene'
  import {
    type PlaygroundInstance,
    type PlaygroundSnapshot,
  } from '../../../features/cad/playground/store'
  import PlaygroundInstancePanel from './PlaygroundInstancePanel.svelte'

  type Props = {
    locale: Locale
    snapshot: PlaygroundSnapshot
    visibleInstances: PlaygroundInstance[]
    selectedInstance: PlaygroundInstance | null
    addModelId: string
    variant: 'panel' | 'drawer'
    onAdd: () => void
    onSelect: (instanceId: string) => void
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
    snapshot,
    visibleInstances,
    selectedInstance,
    addModelId = $bindable(''),
    variant,
    onAdd,
    onSelect,
    onParameterChange,
    onLabelChange,
    onPlacementChange,
    onColorsChange,
    onExport,
    onDuplicate,
    onDelete,
    onRetry,
  }: Props = $props()

  const t = (key: string, values?: Record<string, string | number>) =>
    translate(locale, key, values)

  function modelName(id: string): string {
    return t(`models.model.${id}.name`)
  }

  let selectableModels = $derived(
    modelDefinitions
      .filter((definition) =>
        modelVisibleInViewMode(definition.id, snapshot.viewMode),
      )
      .map((definition) => definition.id),
  )

  $effect(() => {
    // Reset the pending add-model choice when the current orientation does
    // not offer it.
    if (addModelId && !selectableModels.includes(addModelId as never)) {
      addModelId = ''
    }
  })
</script>

<aside
  class={variant === 'panel'
    ? 'grid max-h-[calc(100dvh-14rem)] gap-4 overflow-auto rounded-2xl border border-border-card bg-panel p-4'
    : 'grid gap-4'}
  data-testid="playground-sidebar"
>
  <div class="grid gap-2">
    <label class="font-[650]" for="playground-add-model">
      {t('playground.addComponent')}
      {` (${visibleInstances.length}/${PLAYGROUND_SCENE_MAX_INSTANCES})`}
    </label>
    <div class="flex items-center gap-2">
      <select
        id="playground-add-model"
        data-testid="playground-add-model"
        bind:value={addModelId}
        class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      >
        <option value="" disabled>{t('playground.chooseModel')}</option>
        {#each selectableModels as id (id)}
          <option value={id}>{modelName(id)}</option>
        {/each}
      </select>
      <button
        class="shrink-0 rounded-lg border border-border-card bg-panel px-[0.8rem] py-[0.6rem] text-base text-ink hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="playground-add"
        disabled={!addModelId}
        onclick={onAdd}
      >
        {t('playground.add')}
      </button>
    </div>
  </div>

  {#if visibleInstances.length === 0}
    <p class="m-0 text-sm text-muted-foreground">
      {t('playground.empty')}
    </p>
  {:else}
    <ul class="m-0 grid list-none gap-1 p-0">
      {#each visibleInstances as instance (instance.id)}
        <li>
          <button
            class="w-full rounded-lg px-2 py-2 text-left text-base hover:bg-page {snapshot.selectedInstanceId ===
            instance.id
              ? 'border border-border-card bg-page font-[650]'
              : 'border border-transparent'}"
            data-testid="playground-instance-{instance.id}"
            data-state={instance.meshState}
            onclick={() => onSelect(instance.id)}
          >
            <span
              class="inline-block h-3 w-3 rounded-full align-middle"
              style:background={instance.colors.primary}
            ></span>
            {`#${instance.id.replace('inst-', '')} ${modelName(instance.modelId)}`}
            {#if instance.label}
              <span class="text-muted-foreground">· {instance.label}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if selectedInstance}
    <PlaygroundInstancePanel
      {locale}
      instance={selectedInstance}
      fields={getModelDefinition(selectedInstance.modelId)?.parameterSchema ??
        []}
      {onParameterChange}
      {onLabelChange}
      {onPlacementChange}
      {onColorsChange}
      {onExport}
      {onDuplicate}
      {onDelete}
      {onRetry}
    />
  {/if}

  {#if snapshot.workerState === 'initializing'}
    <p class="m-0 text-sm text-muted-foreground" aria-live="polite">
      {t('playground.worker.initializing')}
    </p>
  {/if}
</aside>
