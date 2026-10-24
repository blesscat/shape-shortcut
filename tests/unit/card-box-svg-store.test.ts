import { beforeEach, describe, expect, it } from 'vitest'

import {
  CARD_BOX_SVG_STORAGE_KEY,
  createCardBoxSvgStorage,
  loadCardBoxCoverSvgForRequest,
  resetCardBoxSvgSessionForTests,
  type CardBoxSvgStored,
} from '../../src/features/cad/card-box-svg/store'
import { fingerprintCardBoxSvg } from '../../src/features/cad/card-box-svg/fingerprint'

beforeEach(() => {
  resetCardBoxSvgSessionForTests()
})

function mapStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  }
}

function record(suffix: string): CardBoxSvgStored {
  return {
    fingerprint: fingerprintCardBoxSvg(suffix),
    outlines: {
      fingerprint: fingerprintCardBoxSvg(suffix),
      width: 10,
      height: 10,
      groups: [
        {
          outer: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
          holes: [],
        },
      ],
    },
  }
}

function oversizedRecord(): CardBoxSvgStored {
  const groups = Array.from({ length: 4000 }, (_, index) => ({
    outer: [
      [index, 0],
      [index + 0.5, 0],
      [index + 0.5, 0.5],
      [index, 0.5],
    ] as const,
    holes: [],
  }))
  return {
    fingerprint: fingerprintCardBoxSvg('oversized'),
    outlines: {
      fingerprint: fingerprintCardBoxSvg('oversized'),
      width: 4000,
      height: 1,
      groups,
    },
  }
}

describe('createCardBoxSvgStorage', () => {
  it('exposes the stable storage key', () => {
    expect(CARD_BOX_SVG_STORAGE_KEY).toBe(
      'shape-shortcut:card-box-cover-svg:v1',
    )
  })

  it('persists and reloads a record', () => {
    const storage = createCardBoxSvgStorage(mapStorage())
    expect(storage.save(record('a'))).toBe('saved')
    expect(storage.load()).not.toBeNull()
    expect(storage.load()!.fingerprint).toBe(fingerprintCardBoxSvg('a'))
  })

  it('replaces on each new import', () => {
    const storage = createCardBoxSvgStorage(mapStorage())
    storage.save(record('first'))
    storage.save(record('second'))
    const loaded = storage.load()
    expect(loaded).not.toBeNull()
    expect(loaded!.fingerprint).toBe(fingerprintCardBoxSvg('second'))
  })

  it('keeps oversized payloads session-only', () => {
    const backend = mapStorage()
    const storage = createCardBoxSvgStorage(backend)
    const big = oversizedRecord()
    expect(storage.save(big)).toBe('session-only')
    // Nothing written to localStorage.
    expect(backend.getItem(CARD_BOX_SVG_STORAGE_KEY)).toBeNull()
    // But loadable within the session.
    expect(storage.load()).not.toBeNull()
    expect(storage.load()!.fingerprint).toBe(big.fingerprint)
  })

  it('falls back to null for corrupt persisted data', () => {
    const backend = mapStorage()
    backend.setItem(CARD_BOX_SVG_STORAGE_KEY, '{not json')
    const storage = createCardBoxSvgStorage(backend)
    expect(storage.load()).toBeNull()
  })

  it('falls back to null for wrong-shape persisted data', () => {
    const backend = mapStorage()
    backend.setItem(CARD_BOX_SVG_STORAGE_KEY, JSON.stringify({ nope: 1 }))
    expect(createCardBoxSvgStorage(backend).load()).toBeNull()
  })

  it('clear removes both persisted and session-only records', () => {
    const backend = mapStorage()
    const storage = createCardBoxSvgStorage(backend)
    storage.save(record('a'))
    storage.clear()
    expect(storage.load()).toBeNull()
    expect(backend.getItem(CARD_BOX_SVG_STORAGE_KEY)).toBeNull()
    const sessionStorage = createCardBoxSvgStorage(mapStorage())
    sessionStorage.save(oversizedRecord())
    sessionStorage.clear()
    expect(sessionStorage.load()).toBeNull()
  })

  it('returns null when storage is empty', () => {
    expect(createCardBoxSvgStorage(mapStorage()).load()).toBeNull()
  })
})

describe('cross-instance session sharing', () => {
  it('lets the generate-command lookup observe a session-only record', () => {
    const writer = createCardBoxSvgStorage(mapStorage())
    const outlines: CardBoxSvgStored['outlines'] = {
      fingerprint: 'big',
      width: 100,
      height: 100,
      groups: [
        {
          outer: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
          holes: [],
        },
      ],
    }
    const big: CardBoxSvgStored = {
      fingerprint: 'big',
      outlines: {
        ...outlines,
        groups: Array.from({ length: 4 }, () => ({
          outer: Array.from(
            { length: 12000 },
            (_, i) =>
              [(i % 100) as number, Math.floor(i / 100) as number] as [
                number,
                number,
              ],
          ),
          holes: [],
        })),
      },
    }
    expect(writer.save(big)).toBe('session-only')
    const reader = createCardBoxSvgStorage() // no backend: session copy only
    expect(reader.load()?.fingerprint).toBe('big')
    expect(loadCardBoxCoverSvgForRequest('big')?.fingerprint).toBe('big')
    expect(loadCardBoxCoverSvgForRequest('other')).toBeUndefined()
  })
})

describe('mixed-tier replacement', () => {
  it('oversized save replaces a previously persisted record', () => {
    const backend = mapStorage()
    const storage = createCardBoxSvgStorage(backend)
    const small = {
      fingerprint: 'small',
      outlines: {
        fingerprint: 'small',
        width: 10,
        height: 10,
        groups: [
          {
            outer: [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
            ] as [number, number][],
            holes: [],
          },
        ],
      },
    }
    expect(storage.save(small)).toBe('saved')
    const hugeOutlines = {
      fingerprint: 'huge',
      width: 10,
      height: 10,
      groups: Array.from({ length: 4 }, () => ({
        outer: Array.from(
          { length: 12000 },
          (_, i) =>
            [(i % 100) as number, Math.floor(i / 100) as number] as [
              number,
              number,
            ],
        ),
        holes: [],
      })),
    }
    expect(storage.save({ fingerprint: 'huge', outlines: hugeOutlines })).toBe(
      'session-only',
    )
    // The stale persisted record must not shadow the session record.
    expect(storage.load()?.fingerprint).toBe('huge')
    expect(backend.getItem(CARD_BOX_SVG_STORAGE_KEY)).toBeNull()
  })
})
