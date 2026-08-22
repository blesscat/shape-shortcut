<script lang="ts">
  import type {
    GridDimensionErrors,
    GridDimensionInput,
    GridDimensionResult,
  } from '../../../features/cad/grid-dimensions'
  import ParameterField from './ParameterField.svelte'
  import { translate, type Locale } from '../../../i18n'

  type GridParameters = {
    rows: number
    columns: number
  }

  type ActualDimensions = {
    x: number
    y: number
  }

  type TargetDimensions = {
    x: number
    y: number
  }

  type Props = {
    locale: Locale
    calculate: (input: GridDimensionInput) => GridDimensionResult
    onApply: (
      parameters: GridParameters,
      target?: TargetDimensions,
      actualDimensions?: ActualDimensions,
    ) => void
    description?: string
    onInvalid?: () => void
    testId?: string
    initialTargetX?: string
    initialTargetY?: string
  }

  let {
    locale,
    calculate,
    onApply,
    description,
    onInvalid,
    testId = 'grid-dimension-calculator',
    initialTargetX = '',
    initialTargetY = '',
  }: Props = $props()

  let targetX = $state(initialTargetX)
  let targetY = $state(initialTargetY)
  let errors = $state<GridDimensionErrors>({})
  let actualDimensions = $state<ActualDimensions | null>(null)

  function handleTargetInput(axis: 'x' | 'y', event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return

    if (axis === 'x') {
      targetX = event.currentTarget.value
    } else {
      targetY = event.currentTarget.value
    }

    const nextErrors = { ...errors }
    delete nextErrors[axis]
    errors = nextErrors
    actualDimensions = null
  }

  function handleCalculate(): void {
    const result = calculate({ x: targetX, y: targetY })
    if (!result.valid) {
      errors = result.errors
      actualDimensions = null
      onInvalid?.()
      return
    }

    errors = {}
    actualDimensions = result.actualDimensions
    onApply(
      result.parameters,
      { x: Number(targetX), y: Number(targetY) },
      result.actualDimensions,
    )
  }

  function formatDimension(value: number): string {
    return Number(value.toFixed(2)).toString()
  }
</script>

<div
  class="grid gap-3 rounded-xl border border-border-card bg-page p-3"
  data-testid={testId}
>
  <div>
    <h3 class="m-0 text-base font-semibold">
      {translate(locale, 'panel.gridDimension.title')}
    </h3>
    {#if description}
      <p class="mt-1 mb-0 text-sm text-muted">{description}</p>
    {:else}
      <p class="mt-1 mb-0 text-sm text-muted">
        {translate(locale, 'panel.gridDimension.description')}
      </p>
    {/if}
  </div>

  <div
    class="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2"
  >
    <ParameterField
      {locale}
      label="X"
      unit="mm"
      error={errors.x}
      errorId="grid-dimension-x-error"
    >
      <input
        aria-describedby={errors.x ? 'grid-dimension-x-error' : undefined}
        aria-invalid={Boolean(errors.x)}
        aria-label={`X（${translate(locale, 'unit.mm')}）`}
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
        inputmode="decimal"
        type="text"
        value={targetX}
        oninput={(event) => handleTargetInput('x', event)}
      />
    </ParameterField>

    <ParameterField
      {locale}
      label="Y"
      unit="mm"
      error={errors.y}
      errorId="grid-dimension-y-error"
    >
      <input
        aria-describedby={errors.y ? 'grid-dimension-y-error' : undefined}
        aria-invalid={Boolean(errors.y)}
        aria-label={`Y（${translate(locale, 'unit.mm')}）`}
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
        inputmode="decimal"
        type="text"
        value={targetY}
        oninput={(event) => handleTargetInput('y', event)}
      />
    </ParameterField>
    <div class="min-w-0 pt-[1.8rem]">
      <button
        class="h-[2.725rem] shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-0 bg-primary px-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-disabled"
        type="button"
        onclick={handleCalculate}
      >
        {translate(locale, 'common.calculate')}
      </button>
    </div>
  </div>

  {#if actualDimensions}
    <p
      class="m-0 text-sm text-muted"
      data-testid="grid-dimension-result"
      aria-live="polite"
    >
      {translate(locale, 'common.calculationResult', {
        x: formatDimension(actualDimensions.x),
        y: formatDimension(actualDimensions.y),
      })}
    </p>
  {/if}
</div>
