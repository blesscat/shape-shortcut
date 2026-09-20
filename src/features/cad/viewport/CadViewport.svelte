<script lang="ts">
  import { onMount } from 'svelte'
  import { Canvas } from '@threlte/core'
  import type {
    MeshSnapshot,
    ModelPartMeshSnapshot,
  } from '../../../cad-contract/messages'
  import type { ModelParameterValues } from '../../../cad-contract/units'
  import CadViewportScene from './CadViewportScene.svelte'
  import {
    observeCadViewportTheme,
    readCadViewportTheme,
    type CadViewportTheme,
    viewportThemeForPresentation,
  } from './theme'
  import type {
    CadViewportAppearance,
    CadViewportPresentation,
  } from './presentation'
  import {
    CAD_VIEWPORT_TIMING_EVENT,
    type ViewportGeometryTiming,
  } from './geometry-timing'
  import { formatExtentValue } from './face-measure'
  import type { FaceHoverState } from './face-hover'
  import { computeTooltipLayout } from './tooltip-position'
  import { translate, type Locale } from '../../../i18n'

  type Props = {
    locale: Locale
    mesh: MeshSnapshot | null
    partMeshes?: ModelPartMeshSnapshot[]
    modelRevision: string | null
    parameters: ModelParameterValues | null
    stale: boolean
    presentation: CadViewportPresentation
    appearance?: CadViewportAppearance
    onPreparationTiming?: (timing: ViewportGeometryTiming) => void
  }

  let {
    locale,
    mesh,
    partMeshes,
    modelRevision,
    parameters,
    stale,
    presentation,
    appearance = 'light',
    onPreparationTiming,
  }: Props = $props()
  let webglSupported = $state(true)
  let observedViewportTheme = $state<CadViewportTheme>(readCadViewportTheme())
  let viewportTheme = $derived(
    viewportThemeForPresentation(
      presentation,
      observedViewportTheme,
      appearance,
    ),
  )
  let container: HTMLDivElement | undefined = $state()
  let containerWidth = $state(0)
  let containerHeight = $state(0)
  let tooltipWidth = $state(0)
  let tooltipHeight = $state(0)
  let faceHover = $state<FaceHoverState | null>(null)

  const TOOLTIP_OFFSET = 14
  const TOOLTIP_MARGIN = 8

  let tooltipLayout = $derived.by(() => {
    if (!faceHover || !container) return null
    const rect = container.getBoundingClientRect()
    return computeTooltipLayout({
      pointerX: faceHover.clientX - rect.left,
      pointerY: faceHover.clientY - rect.top,
      tooltipWidth: tooltipWidth,
      tooltipHeight: tooltipHeight,
      containerWidth: containerWidth,
      containerHeight: containerHeight,
      offset: TOOLTIP_OFFSET,
      margin: TOOLTIP_MARGIN,
    })
  })

  let faceHoverExtent = $derived(
    faceHover
      ? faceHover.bounds.min
          .map((_min, axis) =>
            formatExtentValue(
              faceHover!.bounds.max[axis] - faceHover!.bounds.min[axis],
            ),
          )
          .join(' × ')
      : null,
  )

  $effect(() => {
    modelRevision
    faceHover = null
  })

  function handleFaceHover(hover: FaceHoverState | null): void {
    faceHover = hover
  }

  function reportPreparationTiming(timing: ViewportGeometryTiming): void {
    onPreparationTiming?.(timing)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(CAD_VIEWPORT_TIMING_EVENT, {
          detail: { ...timing, modelRevision },
        }),
      )
    }
  }

  function canCreateWebGLContext(): boolean {
    if (typeof document === 'undefined') return false
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
    )
  }

  onMount(() => {
    webglSupported = canCreateWebGLContext()
    return observeCadViewportTheme((nextTheme) => {
      observedViewportTheme = nextTheme
    })
  })
</script>

<div
  bind:this={container}
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
  class={`viewport relative h-[calc(100dvh-16rem)] self-start overflow-hidden rounded-2xl border ${stale ? 'border-stale' : 'border-border-card'} bg-viewport`}
  data-testid="cad-viewport"
  data-model-revision={modelRevision ?? ''}
  data-presentation={presentation}
  role="img"
  aria-label={translate(locale, 'cad.viewport.aria')}
  onpointerleave={() => {
    faceHover = null
  }}
>
  <div id="cad-viewport-surface" class="viewport-surface">
    {#if !webglSupported}
      <div
        class="flex h-full items-center justify-center text-muted-foreground"
        role="alert"
      >
        {translate(locale, 'cad.viewport.webglUnsupported')}
      </div>
    {:else if mesh && modelRevision}
      <!-- Threlte owns the canvas lifecycle and Three.js render loop. -->
      <Canvas>
        <CadViewportScene
          {mesh}
          {partMeshes}
          {modelRevision}
          {parameters}
          {locale}
          theme={viewportTheme}
          {presentation}
          onPreparationTiming={reportPreparationTiming}
          onFaceHover={presentation === 'workspace'
            ? handleFaceHover
            : undefined}
        />
      </Canvas>
    {:else}
      <div
        class="flex h-full items-center justify-center text-muted-foreground"
      >
        {translate(locale, 'cad.viewport.empty')}
      </div>
    {/if}
  </div>
  {#if stale}
    <span
      class="absolute bottom-4 left-4 rounded-full border border-stale bg-stale-background px-[0.7rem] py-[0.35rem] text-[0.85rem] text-stale-text"
    >
      {translate(locale, 'cad.viewport.stale')}
    </span>
  {/if}
  {#if tooltipLayout && faceHover && presentation === 'workspace'}
    <div
      bind:clientWidth={tooltipWidth}
      bind:clientHeight={tooltipHeight}
      class="face-hover-tooltip pointer-events-none absolute whitespace-nowrap rounded-lg border border-border-card bg-card px-2 py-1 text-[0.72rem] font-medium text-card-foreground shadow-card"
      data-testid="cad-face-hover-tooltip"
      style:left="{tooltipLayout.left}px"
      style:top="{tooltipLayout.top}px"
    >
      <span
        aria-label={translate(locale, 'viewport.faceHover.aria')}
        class="face-hover-tooltip-label"
      >
        {`${faceHoverExtent} ${translate(locale, 'unit.mm')}`}
      </span>
    </div>
  {/if}
</div>

<style>
  .viewport {
    --viewport-radius: 2rem;
  }

  .viewport-surface {
    height: 100%;
    overflow: hidden;
    touch-action: none;
    border-radius: calc(var(--viewport-radius) - 1px);
    isolation: isolate;
  }

  .viewport :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
    border-radius: calc(var(--viewport-radius) - 1px);
  }

  .viewport :global(#cad-viewport-xyz-gizmo) {
    pointer-events: none;
  }

  .face-hover-tooltip {
    z-index: 3;
  }

  /* Tooltip numbers must stay pixel-stable across theme switches, mirroring
     the annotation labels' pinned mono stack. */
  .face-hover-tooltip-label {
    font-family:
      'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
</style>
