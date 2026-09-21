import type { BoxBounds } from '../../../cad-contract/units'

export type FaceHoverState = {
  faceIndex: number
  bounds: BoxBounds
  clientX: number
  clientY: number
}

export type FaceHoverPointerMove = {
  faceIndex: number | null
  clientX: number
  clientY: number
  pointerType: string
}

export type FaceHoverController = {
  handlePointerMove: (move: FaceHoverPointerMove) => void
  handlePointerLeave: () => void
  dispose: () => void
}

type ScheduleCallback = (callback: () => void) => unknown
type CancelCallback = (handle: unknown) => void

export type FaceHoverControllerOptions = {
  measure: (faceIndex: number) => BoxBounds | null
  onHoverChange: (hover: FaceHoverState | null) => void
  schedule?: ScheduleCallback
  cancel?: CancelCallback
  addDragListeners?: (handlers: {
    onDragStart: () => void
    onDragEnd: () => void
  }) => () => void
}

export function createFaceHoverController(
  options: FaceHoverControllerOptions,
): FaceHoverController {
  const {
    measure,
    onHoverChange,
    schedule = (callback) => requestAnimationFrame(callback),
    cancel = (handle) => cancelAnimationFrame(handle as number),
    addDragListeners = defaultAddDragListeners,
  } = options

  let latest: FaceHoverPointerMove | null = null
  let frame: unknown = null
  let dragging = false
  const removeDragListeners = addDragListeners({
    onDragStart: () => {
      dragging = true
      cancelPendingFrame()
      latest = null
      onHoverChange(null)
    },
    onDragEnd: () => {
      dragging = false
    },
  })

  function cancelPendingFrame(): void {
    if (frame !== null) {
      cancel(frame)
      frame = null
    }
  }

  function processFrame(): void {
    frame = null
    if (dragging) return
    const move = latest
    latest = null
    if (!move || move.faceIndex === null) {
      onHoverChange(null)
      return
    }
    const bounds = measure(move.faceIndex)
    onHoverChange(
      bounds
        ? {
            faceIndex: move.faceIndex,
            bounds,
            clientX: move.clientX,
            clientY: move.clientY,
          }
        : null,
    )
  }

  return {
    handlePointerMove(move): void {
      if (move.pointerType === 'touch') return
      latest = move
      if (frame === null) {
        frame = schedule(processFrame)
      }
    },
    handlePointerLeave(): void {
      cancelPendingFrame()
      latest = null
      onHoverChange(null)
    },
    dispose(): void {
      cancelPendingFrame()
      latest = null
      removeDragListeners()
    },
  }
}

function defaultAddDragListeners(handlers: {
  onDragStart: () => void
  onDragEnd: () => void
}): () => void {
  if (typeof window === 'undefined') return () => {}
  const handlePointerUp = (): void => handlers.onDragEnd()
  window.addEventListener('pointerdown', handlers.onDragStart, {
    capture: true,
  })
  window.addEventListener('pointerup', handlePointerUp, { capture: true })
  window.addEventListener('pointercancel', handlePointerUp, {
    capture: true,
  })
  return () => {
    window.removeEventListener('pointerdown', handlers.onDragStart, {
      capture: true,
    })
    window.removeEventListener('pointerup', handlePointerUp, {
      capture: true,
    })
    window.removeEventListener('pointercancel', handlePointerUp, {
      capture: true,
    })
  }
}
