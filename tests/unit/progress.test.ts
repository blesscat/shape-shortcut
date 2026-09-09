import { describe, expect, it } from 'vitest'
import {
  CAD_PROGRESS_STAGES,
  buildingProgressElapsedMs,
  booleanProgressRemaining,
  booleanProgressLabel,
  formatProgressElapsed,
  progressCountLabel,
  progressDetails,
  progressMessage,
  stageProgressElapsedMs,
} from '../../src/features/cad/progress'

describe('CAD progress messages', () => {
  it.each([
    ['loading', '正在載入 CAD engine…'],
    ['building', '正在建立 B-Rep…'],
    ['meshing', '正在產生預覽 mesh…'],
    ['exporting', '正在匯出模型…'],
  ] as const)('describes the %s stage', (stage, message) => {
    expect(progressMessage(stage)).toBe(message)
  })

  it.each([
    ['loading', 1, 'cad.progress.stage.loading.label'],
    ['building', 2, 'cad.progress.stage.building.label'],
    ['meshing', 3, 'cad.progress.stage.meshing.label'],
    ['exporting', 4, 'cad.progress.stage.exporting.label'],
  ] as const)('exposes ordered details for %s', (stage, step, labelKey) => {
    expect(progressDetails(stage)).toMatchObject({
      stage,
      step,
      totalSteps: CAD_PROGRESS_STAGES.length,
      labelKey,
    })
  })

  it('formats determinate cell progress when counters are available', () => {
    expect(
      progressCountLabel({
        stage: 'building',
        completed: 3,
        total: 10,
        unit: 'cells',
      }),
    ).toBe('3 / 10 格')
    expect(
      progressCountLabel({
        stage: 'meshing',
        completed: 42,
        total: 180,
        unit: 'faces',
      }),
    ).toBe('42 / 180 面')
    expect(progressCountLabel({ stage: 'meshing' })).toBeNull()
  })

  it('formats boolean subprogress without turning it into a stage percentage', () => {
    expect(
      booleanProgressLabel({
        stage: 'building',
        booleanOperation: {
          kind: 'fuse',
          state: 'running',
          completed: 3,
          total: 8,
          elapsedMs: 1200,
        },
      }),
    ).toBe('合併（Fuse） 3 / 8 · 剩餘 5')
    expect(
      booleanProgressRemaining({
        stage: 'building',
        booleanOperation: {
          kind: 'fuse',
          state: 'running',
          completed: 3,
          total: 8,
          elapsedMs: 1200,
        },
      }),
    ).toBe(5)
    expect(
      booleanProgressLabel({
        stage: 'building',
        booleanOperation: {
          kind: 'cut',
          state: 'running',
          completed: 128,
          total: 2016,
          unit: 'cells',
          elapsedMs: 1200,
        },
      }),
    ).toBe('切除（Cut） 128 / 2016 格 · 剩餘 1888')
    expect(
      booleanProgressLabel({
        stage: 'building',
        booleanOperation: {
          kind: 'cut',
          state: 'completed',
          completed: 2016,
          total: 2016,
          unit: 'cells',
          elapsedMs: 1200,
        },
      }),
    ).toBe('切除（Cut） 2016 / 2016 格 · 剩餘 0')
    expect(
      booleanProgressLabel({
        stage: 'building',
        booleanOperation: {
          kind: 'intersect',
          state: 'running',
          elapsedMs: 1200,
        },
      }),
    ).toBe('交集（Intersect）進行中')
    expect(
      booleanProgressRemaining({
        stage: 'building',
        booleanOperation: {
          kind: 'intersect',
          state: 'running',
          elapsedMs: 1200,
        },
      }),
    ).toBeNull()
    expect(formatProgressElapsed(61_250)).toBe('1:01')
  })

  it('keeps one cumulative elapsed value for the building stage', () => {
    expect(buildingProgressElapsedMs('building', 1_000, 4_250)).toBe(3_250)
    expect(buildingProgressElapsedMs('building', 4_000, 3_500)).toBe(0)
    expect(buildingProgressElapsedMs('meshing', 1_000, 4_250)).toBeNull()
  })

  it('tracks elapsed time for an indeterminate meshing stage', () => {
    expect(stageProgressElapsedMs('meshing', 1_000, 4_250)).toBe(3_250)
    expect(stageProgressElapsedMs('meshing', 4_000, 3_500)).toBe(0)
    expect(stageProgressElapsedMs('loading', 1_000, 4_250)).toBeNull()
  })
})
