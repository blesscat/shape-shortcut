<script lang="ts">
  import PlaygroundViewport from '../../../features/cad/playground/PlaygroundViewport.svelte'
  import { PLAYGROUND_GRID_CELLS_DEFAULT } from '../../../features/cad/playground/grid-size'
  import PlaygroundSidebar from './PlaygroundSidebar.svelte'
  import BottomParameterDrawer from '../BottomParameterDrawer.svelte'
  import {
    createPlaygroundStore,
    type PlaygroundSnapshot,
  } from '../../../features/cad/playground/store'
  import { modelVisibleInViewMode } from '../../../features/cad/playground/wall-mount'
  import { translate, type Locale } from '../../../i18n'
  import { onMount } from 'svelte'
  import type { ModelParameterKey } from '../../../cad-contract/units'

  // Must stay identical to the `max-cad` custom variant in global.css.
  const NARROW_MEDIA_QUERY = '(max-width: 760px)'

  type Props = {
    locale: Locale
  }

  let { locale }: Props = $props()

  let store = $state<ReturnType<typeof createPlaygroundStore> | null>(null)
  let snapshot = $state<PlaygroundSnapshot | null>(null)
  let addModelId = $state('')
  let fileInput = $state<HTMLInputElement | null>(null)
  let isNarrow = $state(false)
  let drawerOpen = $state(false)
  let pillButton = $state<HTMLButtonElement | null>(null)

  const t = (key: string, values?: Record<string, string | number>) =>
    translate(locale, key, values)

  $effect(() => {
    const query = window.matchMedia(NARROW_MEDIA_QUERY)
    isNarrow = query.matches
    const onChange = (event: MediaQueryListEvent): void => {
      isNarrow = event.matches
      // Crossing the breakpoint unmounts the drawer branch; a stale open
      // flag would spring the drawer open without user intent when
      // returning to the narrow layout.
      drawerOpen = false
    }
    query.addEventListener('change', onChange)
    return () => {
      query.removeEventListener('change', onChange)
    }
  })

  function toggleDrawer(): void {
    if (drawerOpen) {
      closeDrawer()
      return
    }
    drawerOpen = true
  }

  function closeDrawer(): void {
    drawerOpen = false
    pillButton?.focus()
  }

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

  let visibleInstances = $derived(
    (snapshot?.instances ?? []).filter((instance) =>
      modelVisibleInViewMode(instance.modelId, snapshot?.viewMode ?? 'desktop'),
    ),
  )
  let selectedInstance = $derived(
    visibleInstances.find(
      (instance) => instance.id === snapshot?.selectedInstanceId,
    ) ?? null,
  )
  let viewportInstances = $derived(
    visibleInstances.map((instance) => ({
      id: instance.id,
      name: `#${instance.id.replace('inst-', '')} ${modelName(instance.modelId)}${instance.label ? ` · ${instance.label}` : ''}`,
      modelId: instance.modelId,
      parameters: instance.parameters,
      mesh: instance.mesh,
      bounds: instance.bounds,
      placement: instance.placement,
      colorPrimary: instance.colors.primary,
      meshState: instance.meshState,
      overlapping:
        snapshot?.overlappingInstanceIds.includes(instance.id) ?? false,
    })),
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
        for="playground-grid-size-x"
      >
        {t('playground.grid.title')}
      </label>
      <div class="flex items-center gap-1">
        <input
          id="playground-grid-size-x"
          class="w-16 rounded-lg border border-border-field bg-panel px-[0.5rem] py-[0.4rem] text-center text-base text-ink"
          inputmode="numeric"
          type="text"
          data-testid="playground-grid-size-x"
          aria-label={t('playground.grid.axisX')}
          value={snapshot?.gridSize.x ?? PLAYGROUND_GRID_CELLS_DEFAULT}
          onchange={(event) => {
            if (!(event.currentTarget instanceof HTMLInputElement)) return
            store?.setGridSize({
              x: Number(event.currentTarget.value),
              y: snapshot?.gridSize.y ?? PLAYGROUND_GRID_CELLS_DEFAULT,
            })
            event.currentTarget.value = String(
              store?.getSnapshot().gridSize.x ?? PLAYGROUND_GRID_CELLS_DEFAULT,
            )
          }}
        />
        <span class="text-muted-foreground">×</span>
        <input
          id="playground-grid-size-y"
          class="w-16 rounded-lg border border-border-field bg-panel px-[0.5rem] py-[0.4rem] text-center text-base text-ink"
          inputmode="numeric"
          type="text"
          data-testid="playground-grid-size-y"
          aria-label={t('playground.grid.axisY')}
          value={snapshot?.gridSize.y ?? PLAYGROUND_GRID_CELLS_DEFAULT}
          onchange={(event) => {
            if (!(event.currentTarget instanceof HTMLInputElement)) return
            store?.setGridSize({
              x: snapshot?.gridSize.x ?? PLAYGROUND_GRID_CELLS_DEFAULT,
              y: Number(event.currentTarget.value),
            })
            event.currentTarget.value = String(
              store?.getSnapshot().gridSize.x ?? PLAYGROUND_GRID_CELLS_DEFAULT,
            )
          }}
        />
      </div>
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

  {#if (snapshot?.overlappingInstanceIds.length ?? 0) > 0}
    <p
      class="m-0 text-error"
      aria-live="polite"
      data-testid="playground-overlap-warning"
    >
      {t('playground.overlapWarning', {
        count: snapshot!.overlappingInstanceIds.length,
      })}
    </p>
  {/if}

  {#if snapshot}
    <div
      class={isNarrow
        ? 'relative min-w-0'
        : 'grid min-w-0 items-start grid-cols-[minmax(240px,340px)_minmax(0,1fr)] gap-4'}
    >
      {#if !isNarrow}
        <PlaygroundSidebar
          {locale}
          {snapshot}
          {visibleInstances}
          {selectedInstance}
          bind:addModelId
          variant="panel"
          onAdd={handleAdd}
          onSelect={(instanceId) => store?.select(instanceId)}
          onParameterChange={(key, value) =>
            store?.setParameter(
              selectedInstance!.id,
              key as ModelParameterKey,
              value,
            )}
          onLabelChange={(label) =>
            store?.setLabel(selectedInstance!.id, label)}
          onPlacementChange={(cellX, cellY, rotation) =>
            store?.setPlacement(
              selectedInstance!.id,
              cellX,
              cellY,
              rotation as 0 | 90 | 180 | 270,
            )}
          onColorsChange={(primary, secondary) =>
            store?.setInstanceColors(selectedInstance!.id, {
              primary,
              secondary,
            })}
          onExport={(format) =>
            store?.exportInstance(selectedInstance!.id, format)}
          onDuplicate={() => store?.duplicateInstance(selectedInstance!.id)}
          onDelete={() => store?.removeInstance(selectedInstance!.id)}
          onRetry={() => store?.retryInstance(selectedInstance!.id)}
        />
      {/if}
      <PlaygroundViewport
        instances={viewportInstances}
        selectedInstanceId={snapshot.selectedInstanceId}
        viewMode={snapshot.viewMode}
        gridSize={snapshot.gridSize}
        {locale}
        onSelect={(instanceId) => store?.select(instanceId)}
        onValidatePlacement={(instanceId, placement) =>
          store?.validatePlacement(
            instanceId,
            placement.cellX,
            placement.cellY,
            placement.rotation,
          ) ?? false}
        onCommitPlacement={(instanceId, placement) => {
          store?.setPlacement(
            instanceId,
            placement.cellX,
            placement.cellY,
            placement.rotation,
          )
        }}
      />
      {#if isNarrow}
        <button
          bind:this={pillButton}
          class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-card bg-panel px-4 py-2 text-base font-semibold text-ink shadow-card hover:bg-page focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          data-testid="playground-sidebar-pill"
          aria-expanded={drawerOpen}
          aria-controls="playground-sidebar-drawer"
          aria-label={t('playground.drawer.open')}
          onclick={toggleDrawer}
        >
          {t('playground.drawer.title')}
        </button>
        <BottomParameterDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          label={t('playground.drawer.title')}
          closeLabel={t('playground.drawer.close')}
          testId="playground-sidebar-drawer"
        >
          <PlaygroundSidebar
            {locale}
            {snapshot}
            {visibleInstances}
            {selectedInstance}
            bind:addModelId
            variant="drawer"
            onAdd={handleAdd}
            onSelect={(instanceId) => store?.select(instanceId)}
            onParameterChange={(key, value) =>
              store?.setParameter(
                selectedInstance!.id,
                key as ModelParameterKey,
                value,
              )}
            onLabelChange={(label) =>
              store?.setLabel(selectedInstance!.id, label)}
            onPlacementChange={(cellX, cellY, rotation) =>
              store?.setPlacement(
                selectedInstance!.id,
                cellX,
                cellY,
                rotation as 0 | 90 | 180 | 270,
              )}
            onColorsChange={(primary, secondary) =>
              store?.setInstanceColors(selectedInstance!.id, {
                primary,
                secondary,
              })}
            onExport={(format) =>
              store?.exportInstance(selectedInstance!.id, format)}
            onDuplicate={() => store?.duplicateInstance(selectedInstance!.id)}
            onDelete={() => store?.removeInstance(selectedInstance!.id)}
            onRetry={() => store?.retryInstance(selectedInstance!.id)}
          />
        </BottomParameterDrawer>
      {/if}
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
