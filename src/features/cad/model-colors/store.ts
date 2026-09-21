import {
  DEFAULT_MODEL_COLORS,
  isModelColors,
  type ModelColors,
} from '../../../cad-contract/model-colors'

export const MODEL_COLORS_STORAGE_KEY = 'shape-shortcut:model-colors:v1'
type ColorStorage = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): ColorStorage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function createModelColorStore(
  storage: ColorStorage | undefined = browserStorage(),
) {
  let colors = { ...DEFAULT_MODEL_COLORS }
  const listeners = new Set<(colors: ModelColors) => void>()
  try {
    const saved: unknown = JSON.parse(
      storage?.getItem(MODEL_COLORS_STORAGE_KEY) ?? 'null',
    )
    if (isModelColors(saved))
      colors = {
        primary: saved.primary.toLowerCase(),
        secondary: saved.secondary.toLowerCase(),
      }
  } catch {
    // A blocked or corrupt preference must not prevent the workspace from opening.
  }

  function set(next: ModelColors): void {
    if (!isModelColors(next)) return
    colors = {
      primary: next.primary.toLowerCase(),
      secondary: next.secondary.toLowerCase(),
    }
    try {
      storage?.setItem(MODEL_COLORS_STORAGE_KEY, JSON.stringify(colors))
    } catch {
      // Keep editing usable in memory when browser storage is unavailable.
    }
    for (const listener of listeners) listener({ ...colors })
  }

  return {
    get: (): ModelColors => ({ ...colors }),
    set,
    reset: () => set(DEFAULT_MODEL_COLORS),
    subscribe(listener: (colors: ModelColors) => void) {
      listeners.add(listener)
      listener({ ...colors })
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
