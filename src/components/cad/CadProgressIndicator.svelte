<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import {
    CAD_PROGRESS_STAGES,
    booleanProgressLabel,
    formatProgressElapsed,
    progressCountLabel,
    progressDetails,
    stageProgressElapsedMs,
    type CadProgress,
    type CadProgressDetails,
  } from '../../features/cad/progress'
  import { translate, type Locale } from '../../i18n'

  type Props = {
    progress: CadProgress
    locale: Locale
  }

  function getValueMin(hasCounters: boolean): number {
    if (hasCounters) return 0
    return 1
  }

  function getValueMax(
    progress: CadProgress,
    current: CadProgressDetails,
    hasCounters: boolean,
  ): number {
    if (!hasCounters) return current.totalSteps
    return progress.total ?? 1
  }

  function getValueNow(
    progress: CadProgress,
    current: CadProgressDetails,
    hasCounters: boolean,
  ): number {
    if (!hasCounters) return current.step
    return progress.completed ?? 0
  }

  function getValueText(
    current: CadProgressDetails,
    currentLabel: string,
    countLabel: string | null,
    booleanLabel: string | null,
    stageElapsedLabel: string | null,
    locale: Locale,
  ): string {
    let valueText = translate(locale, 'cad.progress.step', {
      label: currentLabel,
      step: current.step,
      total: current.totalSteps,
    })
    if (countLabel !== null)
      valueText = translate(locale, 'cad.progress.count', {
        label: currentLabel,
        count: countLabel,
      })
    if (booleanLabel !== null)
      valueText = translate(locale, 'cad.progress.withDetail', {
        value: valueText,
        detail: booleanLabel,
      })
    if (stageElapsedLabel !== null)
      valueText = translate(locale, 'cad.progress.withDetail', {
        value: valueText,
        detail: stageElapsedLabel,
      })
    return valueText
  }

  function stageElapsedDescription(
    stage: CadProgress['stage'],
    elapsedLabel: string | null,
    locale: Locale,
  ): string | null {
    if (elapsedLabel === null) return null
    if (stage === 'building')
      return translate(locale, 'cad.progress.elapsed.building', {
        elapsed: elapsedLabel,
      })
    if (stage === 'meshing')
      return translate(locale, 'cad.progress.elapsed.meshing', {
        elapsed: elapsedLabel,
      })
    return null
  }

  function clockNow(): number {
    if (typeof performance !== 'undefined') return performance.now()
    return Date.now()
  }

  let { progress, locale }: Props = $props()
  let now = $state(clockNow())
  let trackedStage = untrack(() => progress.stage)
  let trackedOperationId = untrack(() => progress.operationId)
  let stageStartedAt = $state<number | null>(
    untrack(() =>
      progress.stage === 'building' || progress.stage === 'meshing'
        ? now
        : null,
    ),
  )
  let current = $derived(progressDetails(progress.stage))
  let currentLabel = $derived(translate(locale, current.labelKey))
  let countLabel = $derived(progressCountLabel(progress, locale))
  let booleanLabel = $derived(booleanProgressLabel(progress, locale))
  let stageElapsedMs = $derived.by(() => {
    return stageProgressElapsedMs(progress.stage, stageStartedAt, now)
  })
  let stageElapsedLabel = $derived(
    stageElapsedMs === null ? null : formatProgressElapsed(stageElapsedMs),
  )
  let stageElapsedDescriptionText = $derived(
    stageElapsedDescription(progress.stage, stageElapsedLabel, locale),
  )
  let hasCounters = $derived(countLabel !== null)
  let valueMin = $derived(getValueMin(hasCounters))
  let valueMax = $derived(getValueMax(progress, current, hasCounters))
  let valueNow = $derived(getValueNow(progress, current, hasCounters))
  let completion = $derived((valueNow / valueMax) * 100)
  let valueText = $derived(
    getValueText(
      current,
      currentLabel,
      countLabel,
      booleanLabel,
      stageElapsedDescriptionText,
      locale,
    ),
  )

  onMount(() => {
    const timer = window.setInterval(() => {
      now = clockNow()
    }, 250)
    return () => window.clearInterval(timer)
  })

  $effect(() => {
    const stage = progress.stage
    const operationId = progress.operationId
    if (stage === trackedStage && operationId === trackedOperationId) return
    trackedStage = stage
    trackedOperationId = operationId
    stageStartedAt = stage === 'building' || stage === 'meshing' ? now : null
  })

  function getMarkerClassName(
    progressStage: CadProgress['stage'],
    currentStage: CadProgress['stage'],
  ): string {
    if (progressStage === currentStage)
      return 'bg-primary text-primary-foreground'
    return 'bg-border-card text-ink'
  }
</script>

<section
  aria-label={translate(locale, 'cad.progress.aria')}
  class="fixed bottom-4 right-4 z-40 grid w-[min(24rem,calc(100vw-2rem))] gap-2 rounded-2xl border border-border-card bg-panel p-4 shadow-card"
  data-testid="cad-progress"
>
  <div class="flex items-center justify-between gap-4 text-sm">
    <strong class="text-ink">{translate(locale, 'cad.progress.title')}</strong>
    <span class="text-muted-foreground" data-testid="cad-progress-count"
      >{countLabel ?? `${current.step} / ${current.totalSteps}`}</span
    >
  </div>
  {#if booleanLabel !== null}
    <p
      class="m-0 text-sm text-muted-foreground"
      data-testid="cad-progress-boolean"
    >
      {booleanLabel}
    </p>
  {/if}
  {#if stageElapsedDescriptionText !== null}
    <p
      class="m-0 text-sm text-muted-foreground"
      data-testid="cad-progress-elapsed"
    >
      {stageElapsedDescriptionText}
    </p>
  {/if}
  <div
    aria-label={currentLabel}
    aria-valuemax={valueMax}
    aria-valuemin={valueMin}
    aria-valuenow={valueNow}
    aria-valuetext={valueText}
    class="h-2 overflow-hidden rounded-full bg-progress-track"
    role="progressbar"
  >
    <div
      aria-hidden="true"
      class="h-full rounded-full bg-progress-fill transition-[width] duration-300"
      style:width={`${completion}%`}
    ></div>
  </div>
  <ol class="grid grid-cols-4 gap-1 text-xs text-muted-foreground">
    {#each CAD_PROGRESS_STAGES as progressStage (progressStage)}
      {@const details = progressDetails(progressStage)}
      {@const isCurrent = progressStage === current.stage}
      {@const isComplete = details.step < current.step}
      {@const markerClassName = getMarkerClassName(
        progressStage,
        current.stage,
      )}
      <li
        aria-current={isCurrent ? 'step' : undefined}
        class="grid justify-items-center gap-1 text-center"
        data-stage={progressStage}
      >
        <span
          aria-hidden="true"
          class={`grid h-5 w-5 place-items-center rounded-full text-[0.7rem] font-semibold ${markerClassName}`}
          >{isComplete ? '✓' : details.step}</span
        >
        <span>{translate(locale, details.labelKey)}</span>
      </li>
    {/each}
  </ol>
  <details class="text-xs text-muted-foreground">
    <summary
      class="flex min-h-11 cursor-pointer items-center py-1 focus-visible:outline-3 focus-visible:outline-focus"
      >{translate(locale, 'cad.presentation.progressHelp')}</summary
    >
    <p class="mb-0 mt-2 leading-relaxed">
      {translate(locale, 'cad.presentation.progressExplanation')}
    </p>
  </details>
</section>
