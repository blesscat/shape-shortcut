<script lang="ts">
  import PlaygroundViewport from '../../../features/cad/playground/PlaygroundViewport.svelte'
  import PlaygroundInstancePanel from './PlaygroundInstancePanel.svelte'
  import { PLAYGROUND_SCENE_MAX_INSTANCES } from '../../../cad-contract/scene'
  import {
    createPlaygroundStore,
    type PlaygroundSnapshot,
  } from '../../../features/cad/playground/store'
  import {
    getModelDefinition,
    modelDefinitions,
  } from '../../../features/cad/model-catalog'
  import { translate, type Locale } from '../../../i18n'
  import { onMount } from 'svelte'
  import type { ModelParameterKey } from '../../../cad-contract/units'

  type Props = {
    locale: Locale
  }

  let { locale }: Props = $props()

  let store = $state<ReturnType<typeof createPlaygroundStore> | null>(null)
  let snapshot = $state<PlaygroundSnapshot | null>(null)
  let addModelId = $state('')
  let fileInput = $state<HTMLInputElement | null>(null)

  const t = (key: string, values?: Record<string, string | number>) =>
    translate(locale, key, values)

  onMount(() => {
    const nextStore = createPlaygroundStore()
    store = nextStore
    const unsubscribe = nextStore.subscribe((next) => {
      snapshot = next
    })
    return () => {
      unsubscribe()
      nextStore.dispose()
      store = null
    }
  })

  let selectableModels = $derived(
    modelDefinitions.map((definition) => definition.id),
  )
  let selectedInstance = $derived(
    snapshot?.instances.find(
      (instance) => instance.id === snapshot?.selectedInstanceId,
    ) ?? null,
  )

  function modelName(id: string): string {
    return t(`models.model.${id}.name`)
  }

  function handleAdd(): void {
    if (!store || !addModelId) return
    store.addInstance(addModelId as never)
  }

  function handleImportFile(event: Event): void {
    const input = event.currentTarget
    if (!(input instanceof HTMLInputElement)) return
    const file = input.files?.[0]
    input.value = ''
    if (!file || !store) return
    void file.text().then((text) => {
      store?.importScene(text)
    })
  }

  function handleExportScene(): void {
    if (!store) return
    const blob = new Blob([store.exportSceneJson()], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'playground-scene.json'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
</script>

<div class="grid gap-4" data-testid="playground">
  <header class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="m-0 text-3xl font-semibold leading-tight">
      {t('playground.title')}
    </h1>
    <div class="flex flex-wrap items-center gap-2">
      <div
        class="flex items-center gap-1 rounded-lg border border-border-card bg-panel p-1"
        role="group"
        aria-label={t('playground.viewMode.title')}
      >
        <button
          class="rounded-md px-3 py-1 text-base {snapshot?.viewMode ===
          'desktop'
            ? 'bg-page font-[650] text-ink'
            : 'text-muted-foreground hover:text-ink'}"
          data-testid="playground-mode-desktop"
          aria-pressed={snapshot?.viewMode === 'desktop'}
          onclick={() => store?.setViewMode('desktop')}
        >
          {t('playground.viewMode.desktop')}
        </button>
        <button
          class="rounded-md px-3 py-1 text-base {snapshot?.viewMode === 'wall'
            ? 'bg-page font-[650] text-ink'
            : 'text-muted-foreground hover:text-ink'}"
          data-testid="playground-mode-wall"
          aria-pressed={snapshot?.viewMode === 'wall'}
          onclick={() => store?.setViewMode('wall')}
        >
          {t('playground.viewMode.wall')}
        </button>
      </div>
      <label
        class="flex items-center gap-2 text-base text-muted-foreground"
        for="playground-grid-cells"
      >
        {t('playground.grid.title')}
      </label>
      <input
        id="playground-grid-cells"
        class="w-20 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.4rem] text-center text-base text-ink"
        inputmode="numeric"
        type="text"
        data-testid="playground-grid-cells"
        value={snapshot?.gridCells ?? 50}
        onchange={(event) => {
          if (!(event.currentTarget instanceof HTMLInputElement)) return
          store?.setGridCells(Number(event.currentTarget.value))
          event.currentTarget.value = String(
            store?.getSnapshot().gridCells ?? 50,
          )
        }}
      />
      <input
        bind:this={fileInput}
        class="hidden"
        type="file"
        accept="application/json,.json"
        data-testid="playground-import-input"
        onchange={handleImportFile}
      />
      <button
        class="rounded-lg border border-border-card bg-panel px-[0.8rem] py-[0.6rem] text-base text-ink hover:bg-page"
        data-testid="playground-import"
        onclick={() => fileInput?.click()}
      >
        {t('playground.scene.import')}
      </button>
      <button
        class="rounded-lg border border-border-card bg-panel px-[0.8rem] py-[0.6rem] text-base text-ink hover:bg-page"
        data-testid="playground-export-scene"
        onclick={handleExportScene}
      >
        {t('playground.scene.export')}
      </button>
    </div>
  </header>

  {#if snapshot?.diagnostic}
    <p class="m-0 text-error" role="alert" data-testid="playground-diagnostic">
      {t(snapshot.diagnostic.messageId, snapshot.diagnostic.params)}
    </p>
  {/if}

  {#if snapshot}
    <div
      class="grid items-start grid-cols-[minmax(240px,340px)_minmax(0,1fr)] gap-4 max-cad:grid-cols-1"
    >
      <aside
        class="grid max-h-[calc(100dvh-14rem)] gap-4 overflow-auto rounded-2xl border border-border-card bg-panel p-4"
        data-testid="playground-sidebar"
      >
        <div class="grid gap-2">
          <label class="font-[650]" for="playground-add-model">
            {t('playground.addComponent')}
            {` (${snapshot.instances.length}/${PLAYGROUND_SCENE_MAX_INSTANCES})`}
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
              onclick={handleAdd}
            >
              {t('playground.add')}
            </button>
          </div>
        </div>

        {#if snapshot.instances.length === 0}
          <p class="m-0 text-sm text-muted-foreground">
            {t('playground.empty')}
          </p>
        {:else}
          <ul class="m-0 grid list-none gap-1 p-0">
            {#each snapshot.instances as instance (instance.id)}
              <li>
                <button
                  class="w-full rounded-lg px-2 py-2 text-left text-base hover:bg-page {snapshot.selectedInstanceId ===
                  instance.id
                    ? 'border border-border-card bg-page font-[650]'
                    : 'border border-transparent'}"
                  data-testid="playground-instance-{instance.id}"
                  data-state={instance.meshState}
                  onclick={() => store?.select(instance.id)}
                >
                  <span
                    class="inline-block h-3 w-3 rounded-full align-middle"
                    style:background={instance.colors.primary}
                  ></span>
                  {`#${instance.id.replace('inst-', '')} ${modelName(instance.modelId)}`}
                  {#if instance.label}
                    <span class="text-muted-foreground">· {instance.label}</span
                    >
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
            fields={getModelDefinition(selectedInstance.modelId)
              ?.parameterSchema ?? []}
            onParameterChange={(key, value) =>
              store?.setParameter(
                selectedInstance.id,
                key as ModelParameterKey,
                value,
              )}
            onLabelChange={(label) =>
              store?.setLabel(selectedInstance.id, label)}
            onPlacementChange={(cellX, cellY, rotation) =>
              store?.setPlacement(
                selectedInstance.id,
                cellX,
                cellY,
                rotation as 0 | 90 | 180 | 270,
              )}
            onColorsChange={(primary, secondary) =>
              store?.setInstanceColors(selectedInstance.id, {
                primary,
                secondary,
              })}
            onExport={(format) =>
              store?.exportInstance(selectedInstance.id, format)}
            onDuplicate={() => store?.duplicateInstance(selectedInstance.id)}
            onDelete={() => store?.removeInstance(selectedInstance.id)}
            onRetry={() => store?.retryInstance(selectedInstance.id)}
          />
        {/if}

        {#if snapshot.workerState === 'initializing'}
          <p class="m-0 text-sm text-muted-foreground" aria-live="polite">
            {t('playground.worker.initializing')}
          </p>
        {/if}
      </aside>

      <PlaygroundViewport
        instances={snapshot.instances.map((instance) => ({
          id: instance.id,
          name: `#${instance.id.replace('inst-', '')} ${modelName(instance.modelId)}${instance.label ? ` · ${instance.label}` : ''}`,
          modelId: instance.modelId,
          parameters: instance.parameters,
          mesh: instance.mesh,
          bounds: instance.bounds,
          placement: instance.placement,
          colorPrimary: instance.colors.primary,
          meshState: instance.meshState,
        }))}
        selectedInstanceId={snapshot.selectedInstanceId}
        viewMode={snapshot.viewMode}
        gridCells={snapshot.gridCells}
        onSelect={(instanceId) => store?.select(instanceId)}
      />
    </div>
  {:else}
    <div class="rounded-2xl border border-border-card bg-panel p-5">
      <h2 class="mb-4 text-2xl font-semibold leading-tight">
        {t('playground.loading')}
      </h2>
      <p class="m-0 leading-normal">{t('playground.description')}</p>
    </div>
  {/if}
</div>
