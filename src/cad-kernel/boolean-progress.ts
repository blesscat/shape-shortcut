import type {
  BooleanOperationKind,
  BooleanOperationProgress,
  ProgressUnit,
} from '../cad-contract/messages'

export type BooleanOperationProgressSink = (
  progress: BooleanOperationProgress,
) => void

export type BooleanOperationTimingSink = (
  kind: BooleanOperationKind,
  durationMs: number,
) => void

export type BooleanOperationScopeOptions = {
  unit?: ProgressUnit
}

export type BooleanOperationScope = {
  measure: <T>(kind: BooleanOperationKind, operation: () => T) => T
  measureCount: <T>(
    kind: BooleanOperationKind,
    count: number,
    operation: () => T,
  ) => T
}

export type BooleanOperationReporter = {
  createScope: (
    total?: number,
    options?: BooleanOperationScopeOptions,
  ) => BooleanOperationScope
}

type Clock = () => number

function defaultClock(): number {
  return performance.now()
}

function validTotal(total: number | undefined): number | undefined {
  if (total === undefined) return undefined
  if (!Number.isSafeInteger(total) || total <= 0) return undefined
  return total
}

function validAdvance(count: number): number {
  return Number.isSafeInteger(count) && count > 0 ? count : 1
}

function createProgress(
  kind: BooleanOperationKind,
  state: BooleanOperationProgress['state'],
  elapsedMs: number,
  completed: number | undefined,
  total: number | undefined,
  unit: ProgressUnit | undefined,
): BooleanOperationProgress {
  const progress: BooleanOperationProgress = {
    kind,
    state,
    elapsedMs: Math.max(0, elapsedMs),
  }
  if (completed !== undefined && total !== undefined) {
    progress.completed = completed
    progress.total = total
  }
  if (unit !== undefined) progress.unit = unit
  return progress
}

export function measureBoolean<T>(
  reporter: BooleanOperationReporter | undefined,
  kind: BooleanOperationKind,
  operation: () => T,
): T {
  if (!reporter) return operation()
  return reporter.createScope().measure(kind, operation)
}

export function measureBooleanInScope<T>(
  scope: BooleanOperationScope | undefined,
  kind: BooleanOperationKind,
  operation: () => T,
): T {
  if (!scope) return operation()
  return scope.measure(kind, operation)
}

export function measureBooleanCountInScope<T>(
  scope: BooleanOperationScope | undefined,
  kind: BooleanOperationKind,
  count: number,
  operation: () => T,
): T {
  if (!scope) return operation()
  return scope.measureCount(kind, count, operation)
}

export function createBooleanOperationReporter(
  reportProgress?: BooleanOperationProgressSink,
  reportTiming?: BooleanOperationTimingSink,
  now: Clock = defaultClock,
): BooleanOperationReporter {
  return {
    createScope(total, options) {
      const normalizedTotal = validTotal(total)
      const unit = options?.unit
      let completed = 0

      const measureCount = <T>(
        kind: BooleanOperationKind,
        count: number,
        operation: () => T,
      ): T => {
        const startedAt = now()
        reportProgress?.(
          createProgress(
            kind,
            'running',
            0,
            normalizedTotal === undefined ? undefined : completed,
            normalizedTotal,
            unit,
          ),
        )

        try {
          const result = operation()
          const durationMs = Math.max(0, now() - startedAt)
          completed += validAdvance(count)
          reportProgress?.(
            createProgress(
              kind,
              'completed',
              durationMs,
              normalizedTotal === undefined ? undefined : completed,
              normalizedTotal,
              unit,
            ),
          )
          reportTiming?.(kind, durationMs)
          return result
        } catch (error) {
          reportTiming?.(kind, Math.max(0, now() - startedAt))
          throw error
        }
      }

      return {
        measure: (kind, operation) => measureCount(kind, 1, operation),
        measureCount,
      }
    },
  }
}
