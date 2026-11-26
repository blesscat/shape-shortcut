import { beforeEach, describe, expect, it } from 'vitest'

import {
  GAME_BOX_SVG_STORAGE_KEY,
  createGameBoxSvgStorage,
  loadGameBoxCoverSvgForRequest,
  resetGameBoxSvgSessionForTests,
  type GameBoxSvgStored,
} from '../../src/features/cad/game-box-cover-svg/store'
import { fingerprintGameBoxSvg } from '../../src/features/cad/game-box-cover-svg/fingerprint'

beforeEach(() => {
  resetGameBoxSvgSessionForTests()
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

function record(suffix: string): GameBoxSvgStored {
  return {
    fingerprint: fingerprintGameBoxSvg(suffix),
    outlines: {
      fingerprint: fingerprintGameBoxSvg(suffix),
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

function oversizedRecord(): GameBoxSvgStored {
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
    fingerprint: fingerprintGameBoxSvg('oversized'),
    outlines: {
      fingerprint: fingerprintGameBoxSvg('oversized'),
      width: 4000,
      height: 1,
      groups,
    },
  }
}

describe('createGameBoxSvgStorage', () => {
  it('exposes the stable storage key', () => {
    expect(GAME_BOX_SVG_STORAGE_KEY).toBe(
      'shape-shortcut:game-box-cover-svg:v1',
    )
  })

  it('persists and reloads a record', () => {
    const storage = createGameBoxSvgStorage(mapStorage())
    expect(storage.save(record('a'))).toBe('saved')
    expect(storage.load()).not.toBeNull()
    expect(storage.load()!.fingerprint).toBe(fingerprintGameBoxSvg('a'))
  })

  it('replaces on each new import', () => {
    const storage = createGameBoxSvgStorage(mapStorage())
    storage.save(record('first'))
    storage.save(record('second'))
    const loaded = storage.load()
    expect(loaded).not.toBeNull()
    expect(loaded!.fingerprint).toBe(fingerprintGameBoxSvg('second'))
  })

  it('keeps oversized payloads session-only', () => {
    const backend = mapStorage()
    const storage = createGameBoxSvgStorage(backend)
    const big = oversizedRecord()
    expect(storage.save(big)).toBe('session-only')
    // Nothing written to localStorage.
    expect(backend.getItem(GAME_BOX_SVG_STORAGE_KEY)).toBeNull()
    // But loadable within the session.
    expect(storage.load()).not.toBeNull()
    expect(storage.load()!.fingerprint).toBe(big.fingerprint)
  })

  it('falls back to null for corrupt persisted data', () => {
    const backend = mapStorage()
    backend.setItem(GAME_BOX_SVG_STORAGE_KEY, '{not json')
    const storage = createGameBoxSvgStorage(backend)
    expect(storage.load()).toBeNull()
  })

  it('falls back to null for wrong-shape persisted data', () => {
    const backend = mapStorage()
    backend.setItem(GAME_BOX_SVG_STORAGE_KEY, JSON.stringify({ nope: 1 }))
    expect(createGameBoxSvgStorage(backend).load()).toBeNull()
  })

  it('clear removes both persisted and session-only records', () => {
    const backend = mapStorage()
    const storage = createGameBoxSvgStorage(backend)
    storage.save(record('a'))
    storage.clear()
    expect(storage.load()).toBeNull()
    expect(backend.getItem(GAME_BOX_SVG_STORAGE_KEY)).toBeNull()
    const sessionStorage = createGameBoxSvgStorage(mapStorage())
    sessionStorage.save(oversizedRecord())
    sessionStorage.clear()
    expect(sessionStorage.load()).toBeNull()
  })

  it('returns null when storage is empty', () => {
    expect(createGameBoxSvgStorage(mapStorage()).load()).toBeNull()
  })
})

describe('cross-instance session sharing', () => {
  it('lets the generate-command lookup observe a session-only record', () => {
    const writer = createGameBoxSvgStorage(mapStorage())
    const outlines: GameBoxSvgStored['outlines'] = {
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
    const big: GameBoxSvgStored = {
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
    const reader = createGameBoxSvgStorage() // no backend: session copy only
    expect(reader.load()?.fingerprint).toBe('big')
    expect(loadGameBoxCoverSvgForRequest('big')?.fingerprint).toBe('big')
    expect(loadGameBoxCoverSvgForRequest('other')).toBeUndefined()
  })
})

describe('mixed-tier replacement', () => {
  it('oversized save replaces a previously persisted record', () => {
    const backend = mapStorage()
    const storage = createGameBoxSvgStorage(backend)
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
    expect(backend.getItem(GAME_BOX_SVG_STORAGE_KEY)).toBeNull()
  })
})

describe('game-box never touches the card-box key', () => {
  it('reads only its own key and leaves the card-box record untouched', () => {
    const backend = mapStorage()
    backend.setItem(
      'shape-shortcut:card-box-cover-svg:v1',
      '{"fingerprint":"old","outsets":{}}',
    )
    const storage = createGameBoxSvgStorage(backend)
    expect(storage.save(record('mine'))).toBe('saved')
    expect(storage.load()!.fingerprint).toBe(fingerprintGameBoxSvg('mine'))
    // The card-box record is exactly what this test wrote: unread, unedited.
    expect(backend.getItem('shape-shortcut:card-box-cover-svg:v1')).toBe(
      '{"fingerprint":"old","outsets":{}}',
    )
    // The game-box record lives under its own key.
    expect(backend.getItem(GAME_BOX_SVG_STORAGE_KEY)).not.toBeNull()
    storage.clear()
    expect(backend.getItem('shape-shortcut:card-box-cover-svg:v1')).toBe(
      '{"fingerprint":"old","outsets":{}}',
    )
  })

  it('loadGameBoxCoverSvgForRequest never falls back to the card-box record', () => {
    const backend = mapStorage()
    backend.setItem(
      'shape-shortcut:card-box-cover-svg:v1',
      JSON.stringify({
        version: 1,
        fingerprint: 'shared',
        outlines: {
          fingerprint: 'shared',
          width: 10,
          height: 10,
          groups: [],
        },
      }),
    )
    expect(loadGameBoxCoverSvgForRequest('shared')).toBeUndefined()
  })
})
