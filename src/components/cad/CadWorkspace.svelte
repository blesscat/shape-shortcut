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
  import {
    createCadWorkspaceController,
    type CadWorkspaceController,
    type CadWorkspaceControllerSnapshot,
  } from './workspace/createCadWorkspaceController'
  import { errorToastKey, toastErrorForState } from './workspace/error-toast'
  import type { Locale } from '../../i18n'

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
    class="mt-6 grid items-start grid-cols-[minmax(220px,320px)_minmax(0,1fr)] gap-4 max-cad:grid-cols-1"
    data-testid="cad-workspace"
  >
    <CadWorkspacePanel
      {locale}
      state={snapshot.state}
      modelId={snapshot.modelId}
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
  </div>
{/if}
