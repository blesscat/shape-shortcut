import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_MODEL_COLORS,
  isModelColors,
  isModelColor,
} from '../../src/cad-contract/model-colors'
import {
  createModelColorStore,
  MODEL_COLORS_STORAGE_KEY,
} from '../../src/features/cad/model-colors/store'
import { colorForCadViewportPart } from '../../src/features/cad/viewport/config'

const custom = { primary: '#112233', secondary: '#aabbcc' }

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('model color preferences', () => {
  it('accepts complete hex colors including equal colors and rejects unsafe or partial input', () => {
    expect(isModelColors(custom)).toBe(true)
    expect(isModelColors({ primary: '#ABCDEF', secondary: '#ABCDEF' })).toBe(
      true,
    )
    for (const value of [
      'red',
      '#fff',
      '#12345678',
      '#12345g',
      '#123456\n',
      null,
    ])
      expect(isModelColor(value)).toBe(false)
    expect(isModelColors({ primary: custom.primary })).toBe(false)
  })

  it('persists one palette across new stores and resets independently', () => {
    const storage = memoryStorage()
    const store = createModelColorStore(storage)
    expect(store.get()).toEqual(DEFAULT_MODEL_COLORS)
    const observe = vi.fn()
    store.subscribe(observe)
    store.set(custom)
    expect(observe).toHaveBeenLastCalledWith(custom)
    expect(createModelColorStore(storage).get()).toEqual(custom)
    store.reset()
    expect(createModelColorStore(storage).get()).toEqual(DEFAULT_MODEL_COLORS)
  })

  it('does not expose mutable palette references or accept invalid updates', () => {
    const store = createModelColorStore(memoryStorage())
    const colors = { ...custom }
    store.set(colors)
    colors.primary = '#ffffff'
    store.get().primary = '#ffffff'
    store.set({ primary: 'invalid', secondary: custom.secondary })
    expect(store.get()).toEqual(custom)
  })

  it.each(['broken', '{"primary":"red","secondary":"#123456"}', 'null'])(
    'falls back for corrupt data %s',
    (value) => {
      const storage = memoryStorage()
      storage.setItem(MODEL_COLORS_STORAGE_KEY, value)
      expect(createModelColorStore(storage).get()).toEqual(DEFAULT_MODEL_COLORS)
    },
  )

  it('keeps edits usable when storage throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('full')
      },
    }
    const store = createModelColorStore(storage)
    expect(store.get()).toEqual(DEFAULT_MODEL_COLORS)
    store.set(custom)
    expect(store.get()).toEqual(custom)
  })

  it('maps body to primary and text/rim to secondary', () => {
    expect(colorForCadViewportPart('body', custom)).toBe(custom.primary)
    expect(colorForCadViewportPart('text', custom)).toBe(custom.secondary)
    expect(colorForCadViewportPart('rim', custom)).toBe(custom.secondary)
  })
})
