import { describe, expect, it, vi } from 'vitest'
import { createBooleanOperationReporter } from '../../src/cad-kernel/boolean-progress'
import { PreviewTimingRecorder } from '../../src/cad-contract/preview-timing'

describe('boolean operation progress reporter', () => {
  it('reports honest running/completed counts and cumulative timing', () => {
    const progress = vi.fn()
    const timing = vi.fn()
    const times = [100, 140, 200, 230]
    const reporter = createBooleanOperationReporter(
      progress,
      timing,
      () => times.shift() ?? 230,
    )
    const scope = reporter.createScope(2)

    expect(scope.measure('fuse', () => 'first')).toBe('first')
    expect(scope.measure('fuse', () => 'second')).toBe('second')

    expect(progress.mock.calls).toEqual([
      [
        {
          kind: 'fuse',
          state: 'running',
          completed: 0,
          total: 2,
          elapsedMs: 0,
        },
      ],
      [
        {
          kind: 'fuse',
          state: 'completed',
          completed: 1,
          total: 2,
          elapsedMs: 40,
        },
      ],
      [
        {
          kind: 'fuse',
          state: 'running',
          completed: 1,
          total: 2,
          elapsedMs: 0,
        },
      ],
      [
        {
          kind: 'fuse',
          state: 'completed',
          completed: 2,
          total: 2,
          elapsedMs: 30,
        },
      ],
    ])
    expect(timing).toHaveBeenNthCalledWith(1, 'fuse', 40)
    expect(timing).toHaveBeenNthCalledWith(2, 'fuse', 30)
  })

  it('uses elapsed-only progress for unknown totals and never completes failures', () => {
    const progress = vi.fn()
    const timing = vi.fn()
    const reporter = createBooleanOperationReporter(
      progress,
      timing,
      vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(18),
    )
    const scope = reporter.createScope()

    expect(() =>
      scope.measure('cut', () => {
        throw new Error('native cut failed')
      }),
    ).toThrow('native cut failed')

    expect(progress).toHaveBeenCalledTimes(1)
    expect(progress).toHaveBeenCalledWith({
      kind: 'cut',
      state: 'running',
      elapsedMs: 0,
    })
    expect(timing).toHaveBeenCalledWith('cut', 8)
  })

  it('advances a known total by the explicit count of measureCount', () => {
    const progress = vi.fn()
    const timing = vi.fn()
    const times = [100, 160, 220, 280]
    const reporter = createBooleanOperationReporter(
      progress,
      timing,
      () => times.shift() ?? 280,
    )
    const scope = reporter.createScope(2016, { unit: 'cells' })

    expect(scope.measureCount('cut', 128, () => 'batch')).toBe('batch')
    expect(scope.measureCount('cut', 1888, () => 'rest')).toBe('rest')

    expect(progress.mock.calls).toEqual([
      [
        {
          kind: 'cut',
          state: 'running',
          completed: 0,
          total: 2016,
          unit: 'cells',
          elapsedMs: 0,
        },
      ],
      [
        {
          kind: 'cut',
          state: 'completed',
          completed: 128,
          total: 2016,
          unit: 'cells',
          elapsedMs: 60,
        },
      ],
      [
        {
          kind: 'cut',
          state: 'running',
          completed: 128,
          total: 2016,
          unit: 'cells',
          elapsedMs: 0,
        },
      ],
      [
        {
          kind: 'cut',
          state: 'completed',
          completed: 2016,
          total: 2016,
          unit: 'cells',
          elapsedMs: 60,
        },
      ],
    ])
    expect(timing).toHaveBeenNthCalledWith(1, 'cut', 60)
    expect(timing).toHaveBeenNthCalledWith(2, 'cut', 60)
  })

  it('keeps measure at a one-unit advance when a scope declares a unit', () => {
    const progress = vi.fn()
    const times = [100, 130, 160, 190, 220, 250]
    const reporter = createBooleanOperationReporter(
      progress,
      undefined,
      () => times.shift() ?? 250,
    )
    const scope = reporter.createScope(3, { unit: 'cells' })

    scope.measureCount('cut', 2, () => 'pair')
    scope.measure('cut', () => 'single')

    expect(progress).toHaveBeenLastCalledWith({
      kind: 'cut',
      state: 'completed',
      completed: 3,
      total: 3,
      unit: 'cells',
      elapsedMs: 30,
    })
  })

  it('records boolean durations as cumulative preview diagnostics', () => {
    const recorder = new PreviewTimingRecorder(() => 100)
    recorder.recordBoolean('fuse', 12)
    recorder.recordBoolean('fuse', 8)
    recorder.recordBoolean('cut', 5)

    expect(recorder.snapshot()).toMatchObject({
      booleanMs: 25,
      booleanFuseMs: 20,
      booleanCutMs: 5,
      booleanIntersectMs: null,
    })
  })
})
