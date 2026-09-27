import { describe, expect, it } from 'vitest'

import {
  sanitizeSceneLabel,
  sceneInstanceFileName,
  sceneProxyCacheKey,
} from '../../src/features/cad/playground/filenames'

describe('playground export file names', () => {
  it('sanitizes labels into file-safe segments', () => {
    expect(sanitizeSceneLabel('底層 左邊')).toBe('底層-左邊')
    expect(sanitizeSceneLabel('a/b\\c:d*e?"<>|')).toBe('a-b-c-d-e')
    expect(sanitizeSceneLabel('  --x--  ')).toBe('x')
  })

  it('suffixes labeled instances with the sanitized label', () => {
    expect(
      sceneInstanceFileName('opengrid-stackable-box-2x1-h40.step', {
        label: '底層左邊',
        index: 3,
      }),
    ).toBe('opengrid-stackable-box-2x1-h40-底層左邊.step')
  })

  it('falls back to the instance index for unlabeled instances', () => {
    expect(
      sceneInstanceFileName('box-20x30x40.stl', { label: null, index: 2 }),
    ).toBe('box-20x30x40-2.stl')
  })

  it('keeps identical instances collision-free', () => {
    const base = 'box-20x30x40.step'
    const first = sceneInstanceFileName(base, { label: null, index: 1 })
    const second = sceneInstanceFileName(base, { label: null, index: 2 })
    expect(first).not.toBe(second)
  })

  it('uses the index when the sanitized label empties out', () => {
    expect(
      sceneInstanceFileName('box-20x30x40.step', { label: '///', index: 4 }),
    ).toBe('box-20x30x40-4.step')
  })
})

describe('scene proxy cache keys', () => {
  it('is stable across key order', () => {
    const a = sceneProxyCacheKey('box', {
      width: 20,
      depth: 30,
      height: 40,
    } as never)
    const b = sceneProxyCacheKey('box', {
      height: 40,
      depth: 30,
      width: 20,
    } as never)
    expect(a).toBe(b)
  })

  it('differs across parameters and models', () => {
    const base = sceneProxyCacheKey('box', {
      width: 20,
      depth: 30,
      height: 40,
    } as never)
    expect(
      sceneProxyCacheKey('box', { width: 21, depth: 30, height: 40 } as never),
    ).not.toBe(base)
    expect(
      sceneProxyCacheKey('opengrid-stackable-box', {
        width: 20,
        depth: 30,
        height: 40,
      } as never),
    ).not.toBe(base)
  })
})
