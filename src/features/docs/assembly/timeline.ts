import { assemblySceneAt } from '../../../../scripts/desk-assembly/scenes.mjs'
import type {
  AssemblyDatums,
  AssemblyReadingState,
  AssemblyScene,
} from './types'

const checkpoints: Record<AssemblyScene, number[]> = {
  'direct-placement': [0.8, 3.5, 5.5],
  'snap-fixing': [0, 3.4, 4.1, 8],
  'locating-seats': [0, 3.8, 7.5],
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function progressAtReadingPosition(
  position: number,
  stops: number[],
): number {
  if (stops.length < 2 || position <= stops[0]) return 0
  const last = stops.length - 1
  if (position >= stops[last]) return 1
  for (let index = 0; index < last; index += 1) {
    if (position <= stops[index + 1]) {
      const distance = stops[index + 1] - stops[index]
      const withinStep = clamp((position - stops[index]) / distance)
      return (index + withinStep) / last
    }
  }
  return 1
}

export function assemblyReadingState(
  scene: AssemblyScene,
  progress: number,
  datums: AssemblyDatums,
  reducedMotion = false,
): AssemblyReadingState {
  const times = checkpoints[scene]
  const scaled = clamp(progress) * (times.length - 1)
  const step = Math.round(scaled)
  let from = Math.floor(scaled)
  let fraction = clamp((scaled - from - 0.1) / 0.65)
  if (reducedMotion) {
    from = step
    fraction = 0
  }
  const to = Math.min(from + 1, times.length - 1)
  const blend = fraction * fraction * (3 - 2 * fraction)
  const seconds = times[from] + (times[to] - times[from]) * blend
  let seatFocus = 0
  if (scene === 'snap-fixing') {
    const fromFocus = from === 2 ? 1 : 0
    const toFocus = to === 2 ? 1 : 0
    seatFocus = fromFocus + (toFocus - fromFocus) * blend
  }
  return { step, parts: assemblySceneAt(scene, seconds, datums), seatFocus }
}
