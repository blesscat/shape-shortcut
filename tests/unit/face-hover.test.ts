import { describe, expect, it, vi } from 'vitest'
import {
  createFaceHoverController,
  type FaceHoverController,
  type FaceHoverControllerOptions,
  type FaceHoverPointerMove,
} from '../../src/features/cad/viewport/face-hover'
import type { FaceHoverState } from '../../src/features/cad/viewport/face-hover'

type FrameHarness = {
  run: () => void
  scheduled: () => boolean
}

function createFrameHarness(): FrameHarness & {
  schedule: FaceHoverControllerOptions['schedule']
  cancel: FaceHoverControllerOptions['cancel']
} {
  let pending: (() => void) | null = null
  return {
    schedule: (callback) => {
      pending = callback
      return 1
    },
    cancel: () => {
      pending = null
    },
    run: () => {
      const frame = pending
      pending = null
      frame?.()
    },
    scheduled: () => pending !== null,
  }
}

type DragHarness = {
  start: () => void
  end: () => void
}

function createDragHarness(): DragHarness & {
  addDragListeners: FaceHoverControllerOptions['addDragListeners']
} {
  let onDragStart: (() => void) | null = null
  let onDragEnd: (() => void) | null = null
  return {
    start: () => onDragStart?.(),
    end: () => onDragEnd?.(),
    addDragListeners: (handlers) => {
      onDragStart = handlers.onDragStart
      onDragEnd = handlers.onDragEnd
      return () => {}
    },
  }
}

type ControllerHarness = {
  frames: ReturnType<typeof createFrameHarness>
  drag: ReturnType<typeof createDragHarness>
  controller: FaceHoverController
  hovers: (FaceHoverState | null)[]
  measure: ReturnType<typeof vi.fn>
}

function createHarness(
  measureImpl: FaceHoverControllerOptions['measure'] = (faceIndex) => ({
    min: [faceIndex, 0, 0],
    max: [faceIndex + 1, 2, 3],
  }),
): ControllerHarness {
  const frames = createFrameHarness()
  const drag = createDragHarness()
  const hovers: (FaceHoverState | null)[] = []
  const measure = vi.fn(measureImpl)
  const controller = createFaceHoverController({
    measure,
    onHoverChange: (hover) => hovers.push(hover),
    schedule: frames.schedule,
    cancel: frames.cancel,
    addDragListeners: drag.addDragListeners,
  })
  return { frames, drag, controller, hovers, measure }
}

function move(
  faceIndex: number | null,
  pointerType = 'mouse',
  clientX = 10,
  clientY = 12,
): FaceHoverPointerMove {
  return { faceIndex, clientX, clientY, pointerType }
}

describe('createFaceHoverController', () => {
  it('emits hover state on the scheduled frame', () => {
    const harness = createHarness()
    harness.controller.handlePointerMove(move(3))
    expect(harness.hovers).toEqual([])
    expect(harness.frames.scheduled()).toBe(true)

    harness.frames.run()
    expect(harness.hovers).toEqual([
      {
        faceIndex: 3,
        bounds: { min: [3, 0, 0], max: [4, 2, 3] },
        clientX: 10,
        clientY: 12,
      },
    ])
    expect(harness.measure).toHaveBeenCalledWith(3)
  })

  it('coalesces multiple moves into the latest one per frame', () => {
    const harness = createHarness()
    harness.controller.handlePointerMove(move(3, 'mouse', 1, 1))
    harness.controller.handlePointerMove(move(4, 'mouse', 2, 2))
    harness.frames.run()
    expect(harness.hovers).toHaveLength(1)
    expect(harness.hovers[0]?.faceIndex).toBe(4)
    expect(harness.hovers[0]?.clientX).toBe(2)
  })

  it('emits null when the pointer is not over a face', () => {
    const harness = createHarness()
    harness.controller.handlePointerMove(move(null))
    harness.frames.run()
    expect(harness.hovers).toEqual([null])
    expect(harness.measure).not.toHaveBeenCalled()
  })

  it('ignores touch pointers', () => {
    const harness = createHarness()
    harness.controller.handlePointerMove(move(3, 'touch'))
    harness.frames.run()
    expect(harness.hovers).toEqual([])
  })

  it('suppresses hover during drag and resumes after drag end', () => {
    const harness = createHarness()
    harness.controller.handlePointerMove(move(3))
    harness.frames.run()
    expect(harness.hovers).toEqual([
      {
        faceIndex: 3,
        bounds: { min: [3, 0, 0], max: [4, 2, 3] },
        clientX: 10,
        clientY: 12,
      },
    ])

    harness.drag.start()
    expect(harness.hovers).toEqual([expect.anything(), null])
    expect(harness.frames.scheduled()).toBe(false)

    harness.controller.handlePointerMove(move(4, 'mouse', 20, 22))
    harness.frames.run()
    expect(harness.hovers).toHaveLength(2)

    harness.drag.end()
    harness.controller.handlePointerMove(move(4, 'mouse', 20, 22))
    harness.frames.run()
    expect(harness.hovers).toHaveLength(3)
    expect(harness.hovers[2]?.faceIndex).toBe(4)
    expect(harness.hovers[2]?.clientX).toBe(20)
  })

  it('emits null and cancels the pending frame on pointer leave', () => {
    const harness = createHarness()
    harness.controller.handlePointerMove(move(1))
    harness.controller.handlePointerLeave()
    expect(harness.frames.scheduled()).toBe(false)
    expect(harness.hovers).toEqual([null])

    harness.frames.run()
    expect(harness.hovers).toEqual([null])
  })

  it('does not emit after dispose', () => {
    const harness = createHarness()
    harness.controller.handlePointerMove(move(1))
    harness.controller.dispose()
    harness.frames.run()
    expect(harness.hovers).toEqual([])
  })

  it('reports null bounds as no hover', () => {
    const harness = createHarness(() => null)
    harness.controller.handlePointerMove(move(2))
    harness.frames.run()
    expect(harness.hovers).toEqual([null])
  })
})
