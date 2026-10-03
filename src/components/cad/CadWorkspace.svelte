<script lang="ts">
  import {
    DEFAULT_MODEL_COLORS,
    type ModelColors,
  } from '../../cad-contract/model-colors'
  import { createModelColorStore } from '../../features/cad/model-colors/store'

  import { onMount } from 'svelte'
  import type {
    ModelId,
    ModelParameterKey,
    OpenGridParameters,
  } from '../../cad-contract/units'
  import type { CadError } from '../../cad-contract/errors'
  import type { ExportFormat } from '../../features/cad/download'
  import {
    createComponentParameterStore,
    type ComponentParameterStore,
  } from '../../features/cad/parameters'
  import { getModelDefinition } from '../../features/cad/model-catalog'
  import CadViewport from '../../features/cad/viewport/CadViewport.svelte'
  import {
    viewportAppearanceForSearch,
    viewportPresentationForSearch,
    type CadViewportAppearance,
    type CadViewportPresentation,
  } from '../../features/cad/viewport/presentation'
  import {
    parseSystemContext,
    systemContextForModel,
    type OpenGridSystemContext,
  } from '../../features/cad/system-entry-context'
  import { serializePlaygroundScene } from '../../features/cad/playground/scene-file'
  import CadProgressIndicator from './CadProgressIndicator.svelte'
  import CadErrorToast from './CadErrorToast.svelte'
  import CadWorkspacePanel from './CadWorkspacePanel.svelte'
  import BottomParameterDrawer from './BottomParameterDrawer.svelte'
  import CadPanelParameters from './component-panels/CadPanelParameters.svelte'
  import CadPanelActions from './component-panels/CadPanelActions.svelte'
  import CadPanelNotes from './component-panels/CadPanelNotes.svelte'
  import {
    createCadWorkspaceController,
    type CadWorkspaceController,
    type CadWorkspaceControllerSnapshot,
  } from './workspace/createCadWorkspaceController'
  import { errorToastKey, toastErrorForState } from './workspace/error-toast'
  import { translate, type Locale } from '../../i18n'

  // Must stay identical to the `max-cad` custom variant in global.css.
  const NARROW_MEDIA_QUERY = '(max-width: 760px)'

  type Props = {
    modelId: ModelId
    locale: Locale
  }

  let { modelId, locale }: Props = $props()
  let colors = $state<ModelColors>({ ...DEFAULT_MODEL_COLORS })
  let colorStore: ReturnType<typeof createModelColorStore> | undefined
  let snapshot = $state<CadWorkspaceControllerSnapshot | null>(null)
  let dismissedErrorToastKey = $state<string | null>(null)
  let toastError = $state<CadError | null>(null)
  let resetVersion = $state(0)
  let presentation = $state<CadViewportPresentation>('workspace')
  let appearance = $state<CadViewportAppearance>('light')
  let systemContext = $state<OpenGridSystemContext | undefined>(undefined)
  let controller: CadWorkspaceController | null = null
  let parameterStore: ComponentParameterStore | null = null
  let isNarrow = $state(false)
  let drawerOpen = $state(false)
  let pillButton = $state<HTMLButtonElement | null>(null)

  const t = (key: string, values?: Record<string, string | number | boolean>) =>
    translate(locale, key, values)

  function hasParameterControlsFor(id: ModelId): boolean {
    if (
      id === 'opengrid' ||
      id === 'opengrid-pillar' ||
      id === 'opengrid-wall-cover' ||
      id === 'opengrid-label-card'
    ) {
      return true
    }
    return (getModelDefinition(id)?.parameterSchema.length ?? 0) > 0
  }

  let showParameters = $derived(
    snapshot ? hasParameterControlsFor(snapshot.modelId) : false,
  )

  type DrawerStatus = 'none' | 'stale' | 'invalid'

  let drawerStatus = $derived.by<DrawerStatus>(() => {
    if (!snapshot) return 'none'
    // Field errors are the actionable signal and win over the stale marker
    // that an invalid snapshot also sets on the committed preview.
    if (Object.keys(snapshot.fieldErrors).length > 0) return 'invalid'
    if (snapshot.state.stale) return 'stale'
    return 'none'
  })

  $effect(() => {
    const query = window.matchMedia(NARROW_MEDIA_QUERY)
    isNarrow = query.matches
    const onChange = (event: MediaQueryListEvent): void => {
      isNarrow = event.matches
      // Crossing the breakpoint unmounts the drawer branch; a stale open
      // flag would spring the drawer open (and steal focus) without user
      // intent when returning to the narrow layout.
      drawerOpen = false
    }
    query.addEventListener('change', onChange)
    return () => {
      query.removeEventListener('change', onChange)
    }
  })

  function openDrawer(): void {
    drawerOpen = true
  }

  function closeDrawer(): void {
    drawerOpen = false
    pillButton?.focus()
  }

  function updateSnapshot(nextSnapshot: CadWorkspaceControllerSnapshot): void {
    const previousErrorKey = errorToastKey(
      snapshot ? toastErrorForState(snapshot.state) : null,
    )
    const nextError = toastErrorForState(nextSnapshot.state)
    const nextErrorKey = errorToastKey(nextError)
    if (previousErrorKey !== nextErrorKey) dismissedErrorToastKey = null
    toastError = nextErrorKey === dismissedErrorToastKey ? null : nextError
    snapshot = nextSnapshot
  }

  onMount(() => {
    colorStore = createModelColorStore()
    const unsubscribeColors = colorStore.subscribe((next) => {
      colors = next
    })
    presentation = viewportPresentationForSearch(window.location.search)
    appearance = viewportAppearanceForSearch(window.location.search)
    systemContext = systemContextForModel(
      modelId,
      parseSystemContext(window.location.search),
    )
    parameterStore = createComponentParameterStore({ systemContext })
    controller = createCadWorkspaceController(
      modelId,
      (nextSnapshot) => {
        updateSnapshot(nextSnapshot)
      },
      { parameterStore, systemContext },
    )

    return () => {
      unsubscribeColors()
      controller?.dispose()
      controller = null
      parameterStore?.dispose()
      parameterStore = null
    }
  })

  function handleInputChange(key: ModelParameterKey, value: string): void {
    controller?.onInputChange(key, value)
  }

  function handleSystemContextChange(
    nextContext: OpenGridSystemContext | undefined,
  ): void {
    systemContext = nextContext
    controller?.onSystemContextChange(nextContext)
  }

  function handleOpenGridParametersChange(
    parameters: OpenGridParameters,
  ): void {
    controller?.onOpenGridParametersChange(parameters)
  }

  function handleOpenGridDimensionCalculationInvalid(): void {
    controller?.onOpenGridDimensionCalculationInvalid()
  }

  function handleExport(format: ExportFormat): void {
    controller?.onExport(format, colors)
  }

  function handleRetry(): void {
    controller?.onRetry()
  }

  function dismissErrorToast(): void {
    dismissedErrorToastKey = errorToastKey(toastError)
    toastError = null
  }

  function handleRestoreDefaults(): void {
    controller?.onRestoreDefaults()
    resetVersion += 1
  }

  function handleDownloadSettings(): void {
    const current = snapshot
    if (!current) return
    if (
      current.state.status !== 'ready' &&
      current.state.status !== 'generating'
    )
      return
    const sceneFile = serializePlaygroundScene(colors, [
      {
        label: null,
        modelId: current.state.modelId,
        parameters: current.state.input,
        placement: null,
        colors,
      },
    ])
    const blob = new Blob([JSON.stringify(sceneFile, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${current.state.modelId}-settings.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
</script>

{#if snapshot}
  <div
    class="mt-6 min-w-0 {isNarrow
      ? 'relative'
      : 'grid items-start grid-cols-[minmax(220px,320px)_minmax(0,1fr)] gap-4'}"
    data-testid="cad-workspace"
  >
    {#if !isNarrow}
      <CadWorkspacePanel
        {locale}
        state={snapshot.state}
        modelId={snapshot.modelId}
        {showParameters}
        {systemContext}
        parameters={snapshot.state.input}
        rawParameters={snapshot.rawParameters}
        fieldErrors={snapshot.fieldErrors}
        canExport={snapshot.canExport}
        canExportThreeMf={snapshot.canExportThreeMf}
        onInputChange={handleInputChange}
        onSystemContextChange={handleSystemContextChange}
        onOpenGridParametersChange={handleOpenGridParametersChange}
        onOpenGridDimensionCalculationInvalid={handleOpenGridDimensionCalculationInvalid}
        onExport={handleExport}
        onRetry={handleRetry}
        {resetVersion}
        onRestoreDefaults={handleRestoreDefaults}
        onDownloadSettings={handleDownloadSettings}
      />
    {/if}
    <CadViewport
      {locale}
      {colors}
      onColorsChange={(next) => colorStore?.set(next)}
      mesh={snapshot.state.committed?.mesh ?? null}
      partMeshes={snapshot.state.committed?.partMeshes}
      modelRevision={snapshot.state.committed?.revision ?? null}
      parameters={snapshot.state.committed?.parameters ?? null}
      stale={snapshot.state.stale}
      {presentation}
      {appearance}
    />
    {#if snapshot.progress}
      <CadProgressIndicator progress={snapshot.progress} {locale} />
    {/if}
    {#if toastError}
      <CadErrorToast
        error={toastError}
        onDismiss={dismissErrorToast}
        {locale}
      />
    {/if}
    {#if isNarrow}
      <div
        class="absolute top-3 end-3 z-40 flex max-w-[calc(100%-1.5rem)] justify-end"
        data-testid="cad-actions-cluster"
      >
        <CadPanelActions
          {locale}
          state={snapshot.state}
          modelId={snapshot.modelId}
          parameters={snapshot.state.input}
          canExport={snapshot.canExport}
          canExportThreeMf={snapshot.canExportThreeMf}
          onExport={handleExport}
          onRetry={handleRetry}
          onDownloadSettings={handleDownloadSettings}
        />
      </div>
      {#if showParameters}
        <button
          bind:this={pillButton}
          class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-card bg-panel px-4 py-2 text-base font-semibold text-ink shadow-card hover:bg-page focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          data-testid="cad-params-pill"
          aria-expanded={drawerOpen}
          aria-controls="cad-params-drawer"
          aria-label={t('cad.drawer.open')}
          onclick={openDrawer}
        >
          {#if drawerStatus === 'stale'}
            <span class="size-2 rounded-full bg-stale" aria-hidden="true"
            ></span>
          {:else if drawerStatus === 'invalid'}
            <span class="size-2 rounded-full bg-error" aria-hidden="true"
            ></span>
          {/if}
          {t('cad.drawer.title')}
          <span class="sr-only" aria-live="polite">
            {drawerStatus === 'stale'
              ? t('cad.drawer.status.stale')
              : drawerStatus === 'invalid'
                ? t('cad.drawer.status.invalid')
                : ''}
          </span>
        </button>
        <BottomParameterDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          label={t('cad.drawer.title')}
          closeLabel={t('cad.drawer.close')}
          testId="cad-params-drawer"
        >
          <CadPanelParameters
            {locale}
            modelId={snapshot.modelId}
            {showParameters}
            {systemContext}
            parameters={snapshot.state.input}
            rawParameters={snapshot.rawParameters}
            fieldErrors={snapshot.fieldErrors}
            onInputChange={handleInputChange}
            onSystemContextChange={handleSystemContextChange}
            onOpenGridParametersChange={handleOpenGridParametersChange}
            onOpenGridDimensionCalculationInvalid={handleOpenGridDimensionCalculationInvalid}
            {resetVersion}
            onRestoreDefaults={handleRestoreDefaults}
          />
          <CadPanelNotes {locale} modelId={snapshot.modelId} />
        </BottomParameterDrawer>
      {/if}
    {/if}
  </div>
{/if}
