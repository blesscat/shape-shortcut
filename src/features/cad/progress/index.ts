import type {
  BooleanOperationKind,
  BooleanOperationProgress,
  ProgressUnit,
} from '../../../cad-contract/messages'
import { DEFAULT_LOCALE, translate, type Locale } from '../../../i18n'

export type CadProgressStage = 'loading' | 'building' | 'meshing' | 'exporting'

export type CadProgress = {
  stage: CadProgressStage
  operationId?: string
  completed?: number
  total?: number
  unit?: ProgressUnit
  booleanOperation?: BooleanOperationProgress
}

export type CadProgressDetails = {
  stage: CadProgressStage
  labelKey: string
  messageKey: string
  step: number
  totalSteps: number
}

export const CAD_PROGRESS_STAGES: ReadonlyArray<CadProgressStage> = [
  'loading',
  'building',
  'meshing',
  'exporting',
]

const PROGRESS_DEFINITIONS: Record<
  CadProgressStage,
  Pick<CadProgressDetails, 'labelKey' | 'messageKey'>
> = {
  loading: {
    labelKey: 'cad.progress.stage.loading.label',
    messageKey: 'cad.progress.stage.loading.message',
  },
  building: {
    labelKey: 'cad.progress.stage.building.label',
    messageKey: 'cad.progress.stage.building.message',
  },
  meshing: {
    labelKey: 'cad.progress.stage.meshing.label',
    messageKey: 'cad.progress.stage.meshing.message',
  },
  exporting: {
    labelKey: 'cad.progress.stage.exporting.label',
    messageKey: 'cad.progress.stage.exporting.message',
  },
}

const PROGRESS_UNIT_KEYS: Record<ProgressUnit, string> = {
  cells: 'cad.progress.unit.cells',
  batches: 'cad.progress.unit.batches',
  steps: 'cad.progress.unit.steps',
  columns: 'cad.progress.unit.columns',
  faces: 'cad.progress.unit.faces',
}

const BOOLEAN_OPERATION_KEYS: Record<BooleanOperationKind, string> = {
  fuse: 'cad.progress.boolean.fuse',
  cut: 'cad.progress.boolean.cut',
  intersect: 'cad.progress.boolean.intersect',
}

export function progressDetails(stage: CadProgressStage): CadProgressDetails {
  return {
    stage,
    ...PROGRESS_DEFINITIONS[stage],
    step: CAD_PROGRESS_STAGES.indexOf(stage) + 1,
    totalSteps: CAD_PROGRESS_STAGES.length,
  }
}

export function progressMessage(stage: CadProgressStage): string {
  return translate(DEFAULT_LOCALE, progressDetails(stage).messageKey)
}

export function progressMessageFor(
  stage: CadProgressStage,
  locale: Locale,
): string {
  return translate(locale, progressDetails(stage).messageKey)
}

export function progressCountLabel(
  progress: CadProgress,
  locale: Locale = DEFAULT_LOCALE,
): string | null {
  if (
    progress.completed === undefined ||
    progress.total === undefined ||
    progress.unit === undefined
  )
    return null
  return `${progress.completed} / ${progress.total} ${translate(locale, PROGRESS_UNIT_KEYS[progress.unit])}`
}

export function booleanProgressRemaining(progress: CadProgress): number | null {
  const operation = progress.booleanOperation
  if (
    !operation ||
    operation.completed === undefined ||
    operation.total === undefined
  )
    return null
  return Math.max(0, operation.total - operation.completed)
}

export function booleanProgressLabel(
  progress: CadProgress,
  locale: Locale = DEFAULT_LOCALE,
): string | null {
  const operation = progress.booleanOperation
  if (!operation) return null

  const label = translate(locale, BOOLEAN_OPERATION_KEYS[operation.kind])
  const unitSuffix =
    operation.unit === undefined
      ? ''
      : ` ${translate(locale, PROGRESS_UNIT_KEYS[operation.unit])}`
  if (operation.completed !== undefined && operation.total !== undefined) {
    const remaining = booleanProgressRemaining(progress)
    if (remaining === null)
      return `${label} ${operation.completed} / ${operation.total}${unitSuffix}`
    return `${label} ${operation.completed} / ${operation.total}${unitSuffix} · ${translate(locale, 'cad.progress.remaining', { remaining })}`
  }
  return `${label}${translate(locale, 'cad.progress.running')}`
}

export function formatProgressElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function buildingProgressElapsedMs(
  stage: CadProgressStage,
  startedAt: number | null,
  now: number,
): number | null {
  if (stage !== 'building') return null
  return stageProgressElapsedMs(stage, startedAt, now)
}

export function stageProgressElapsedMs(
  stage: CadProgressStage,
  startedAt: number | null,
  now: number,
): number | null {
  if (stage !== 'building' && stage !== 'meshing') return null
  if (startedAt === null) return null
  return Math.max(0, now - startedAt)
}
