<script lang="ts">
  import type {
    OpenGridPrintPlanErrors,
    OpenGridPrintPlanInput,
    OpenGridPrintPlanResult,
    OpenGridPrintPlanSuccess,
  } from '../../../../features/cad/grid-dimensions'
  import ParameterField from '../ParameterField.svelte'
  import { translate, type Locale } from '../../../../i18n'

  type PrimaryPiece = {
    rows: number
    columns: number
  }

  type Props = {
    locale: Locale
    calculate: (input: OpenGridPrintPlanInput) => OpenGridPrintPlanResult
    onApply: (piece: PrimaryPiece) => void
    onInvalid?: () => void
  }

  let { locale, calculate, onApply, onInvalid }: Props = $props()

  let targetX = $state('')
  let targetY = $state('')
  let printerX = $state('')
  let printerY = $state('')
  let errors = $state<OpenGridPrintPlanErrors>({})
  let plan = $state<OpenGridPrintPlanSuccess | null>(null)

  function updateInput(
    field: keyof OpenGridPrintPlanInput,
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return

    if (field === 'targetX') targetX = event.currentTarget.value
    if (field === 'targetY') targetY = event.currentTarget.value
    if (field === 'printerX') printerX = event.currentTarget.value
    if (field === 'printerY') printerY = event.currentTarget.value

    const nextErrors = { ...errors }
    delete nextErrors[field]
    errors = nextErrors
    plan = null
  }

  function handleCalculate(): void {
    const result = calculate({ targetX, targetY, printerX, printerY })
    if (!result.valid) {
      errors = result.errors
      plan = null
      onInvalid?.()
      return
    }

    errors = {}
    plan = result
    onApply({ rows: result.primary.rows, columns: result.primary.columns })
  }

  function formatDimension(value: number): string {
    return Number(value.toFixed(2)).toString()
  }

  function groupLabel(
    role: OpenGridPrintPlanSuccess['pieceGroups'][number]['role'],
  ): string {
    if (role === 'primary')
      return translate(locale, 'panel.printPlan.role.primary')
    if (role === 'edge') return translate(locale, 'panel.printPlan.role.edge')
    return translate(locale, 'panel.printPlan.role.corner')
  }
</script>

<div
  class="grid gap-3 rounded-xl border border-border-card bg-page p-3"
  data-testid="grid-dimension-calculator"
>
  <div>
    <h3 class="m-0 text-base font-semibold">
      {translate(locale, 'panel.printPlan.title')}
    </h3>
    <p class="mt-1 mb-0 text-sm text-muted-foreground">
      {translate(locale, 'panel.printPlan.description')}
    </p>
  </div>

  <div class="grid min-w-0 gap-2">
    <div class="grid min-w-0 grid-cols-2 gap-2">
      <ParameterField
        {locale}
        label={translate(locale, 'panel.printPlan.targetX')}
        unit={translate(locale, 'unit.mm')}
        error={errors.targetX}
        errorId="opengrid-print-plan-target-x-error"
      >
        <input
          aria-describedby={errors.targetX
            ? 'opengrid-print-plan-target-x-error'
            : undefined}
          aria-invalid={Boolean(errors.targetX)}
          aria-label={`${translate(locale, 'panel.printPlan.targetX')}（${translate(locale, 'unit.mm')}）`}
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
          inputmode="decimal"
          type="text"
          value={targetX}
          oninput={(event) => updateInput('targetX', event)}
        />
      </ParameterField>

      <ParameterField
        {locale}
        label={translate(locale, 'panel.printPlan.targetY')}
        unit={translate(locale, 'unit.mm')}
        error={errors.targetY}
        errorId="opengrid-print-plan-target-y-error"
      >
        <input
          aria-describedby={errors.targetY
            ? 'opengrid-print-plan-target-y-error'
            : undefined}
          aria-invalid={Boolean(errors.targetY)}
          aria-label={`${translate(locale, 'panel.printPlan.targetY')}（${translate(locale, 'unit.mm')}）`}
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
          inputmode="decimal"
          type="text"
          value={targetY}
          oninput={(event) => updateInput('targetY', event)}
        />
      </ParameterField>
    </div>

    <div class="grid min-w-0 grid-cols-2 gap-2">
      <ParameterField
        {locale}
        label={translate(locale, 'panel.printPlan.printerX')}
        unit={translate(locale, 'unit.mm')}
        error={errors.printerX}
        errorId="opengrid-print-plan-printer-x-error"
      >
        <input
          aria-describedby={errors.printerX
            ? 'opengrid-print-plan-printer-x-error'
            : undefined}
          aria-invalid={Boolean(errors.printerX)}
          aria-label={`${translate(locale, 'panel.printPlan.printerX')}（${translate(locale, 'unit.mm')}）`}
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
          inputmode="decimal"
          type="text"
          value={printerX}
          oninput={(event) => updateInput('printerX', event)}
        />
      </ParameterField>

      <ParameterField
        {locale}
        label={translate(locale, 'panel.printPlan.printerY')}
        unit={translate(locale, 'unit.mm')}
        error={errors.printerY}
        errorId="opengrid-print-plan-printer-y-error"
      >
        <input
          aria-describedby={errors.printerY
            ? 'opengrid-print-plan-printer-y-error'
            : undefined}
          aria-invalid={Boolean(errors.printerY)}
          aria-label={`${translate(locale, 'panel.printPlan.printerY')}（${translate(locale, 'unit.mm')}）`}
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
          inputmode="decimal"
          type="text"
          value={printerY}
          oninput={(event) => updateInput('printerY', event)}
        />
      </ParameterField>
    </div>
  </div>

  <button
    class="h-[2.725rem] cursor-pointer rounded-lg border-0 bg-primary px-3 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground"
    type="button"
    onclick={handleCalculate}
  >
    {translate(locale, 'panel.printPlan.calculate')}
  </button>

  {#if plan}
    <div
      class="grid gap-2 rounded-lg border border-border-card bg-panel p-3 text-sm"
      data-testid="grid-print-plan-result"
      aria-live="polite"
    >
      <p class="m-0">
        {translate(locale, 'panel.printPlan.target', {
          columns: plan.target.columns,
          rows: plan.target.rows,
          width: formatDimension(plan.target.width),
          depth: formatDimension(plan.target.depth),
        })}
      </p>
      <p class="m-0">
        {translate(locale, 'panel.printPlan.printer', {
          columns: plan.printer.columns,
          rows: plan.printer.rows,
          width: formatDimension(plan.printer.width),
          depth: formatDimension(plan.printer.depth),
        })}
      </p>
      <p class="m-0 font-semibold">
        {translate(locale, 'panel.printPlan.primary', {
          columns: plan.primary.columns,
          rows: plan.primary.rows,
          width: formatDimension(plan.primary.width),
          depth: formatDimension(plan.primary.depth),
        })}
      </p>
      <ul class="m-0 grid gap-1 pl-5">
        {#each plan.pieceGroups as group}
          <li>
            {translate(locale, 'panel.printPlan.group', {
              role: groupLabel(group.role),
              columns: group.columns,
              rows: group.rows,
              width: formatDimension(group.width),
              depth: formatDimension(group.depth),
              quantity: group.quantity,
            })}
          </li>
        {/each}
      </ul>
      <p class="m-0 font-semibold">
        {translate(locale, 'panel.printPlan.total', {
          count: plan.totalPieces,
        })}
      </p>
      <p class="m-0 text-muted-foreground">
        {translate(locale, 'panel.printPlan.note')}
      </p>
    </div>
  {/if}
</div>
