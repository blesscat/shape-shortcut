import { beforeEach, expect, it, vi } from 'vitest'
import {
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_OPEN_SHELF_HONEYCOMB_MAX_CELLS,
} from '../../src/cad-contract/units'
import { openGridOpenShelfHoneycombCellCountFor } from '../../src/cad-kernel/lattice/opengrid-honeycomb'
import { buildOpenGridOpenShelf } from '../../src/cad-kernel/components/opengrid-open-shelf/builder'
import {
  cadErrorCodeFor,
  cadErrorStageFor,
} from '../../src/workers/error-mapping'

const allocation = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NATIVE_ALLOCATION_STARTED')
  }),
)
vi.mock('replicad', async (original) => ({
  ...(await original<typeof import('replicad')>()),
  makeBox: allocation,
}))

const oversized = {
  ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  x: 5,
  y: 8,
  height: 100,
  honeycombMode: true,
}
beforeEach(() => {
  allocation.mockClear()
})

it('rejects an oversized saving-mode shelf before native allocation', async () => {
  const count = openGridOpenShelfHoneycombCellCountFor(oversized)
  expect(count).toBeGreaterThan(OPENGRID_OPEN_SHELF_HONEYCOMB_MAX_CELLS)
  await expect(buildOpenGridOpenShelf(oversized)).rejects.toThrow(
    `OPENGRID_HONEYCOMB_MEMORY_LIMIT:${count}:${OPENGRID_OPEN_SHELF_HONEYCOMB_MAX_CELLS}`,
  )
  expect(allocation).not.toHaveBeenCalled()
})

it('allows the solid counterpart to begin native construction', async () => {
  await expect(
    buildOpenGridOpenShelf({ ...oversized, honeycombMode: false }),
  ).rejects.toThrow('NATIVE_ALLOCATION_STARTED')
  expect(allocation).toHaveBeenCalledOnce()
})

it('allows an in-budget saving-mode shelf to begin native construction', async () => {
  await expect(
    buildOpenGridOpenShelf({
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      honeycombMode: true,
    }),
  ).rejects.toThrow('NATIVE_ALLOCATION_STARTED')
  expect(allocation).toHaveBeenCalledOnce()
})

it('preserves input validation and stale-generation precedence', async () => {
  await expect(buildOpenGridOpenShelf({ ...oversized, x: -1 })).rejects.toThrow(
    'INVALID_INPUT',
  )
  await expect(
    buildOpenGridOpenShelf(oversized, { isGenerationCurrent: () => false }),
  ).rejects.toThrow('STALE_GENERATION')
  expect(allocation).not.toHaveBeenCalled()
})

it.each([
  'OPENGRID_HONEYCOMB_MEMORY_LIMIT',
  'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT',
])('preserves the %s error identity and stage', (code) => {
  expect(cadErrorCodeFor(`${code}:9999`, 'model.generate')).toBe(code)
  expect(cadErrorStageFor('model.generate', `${code}:9999`)).toBe('building')
})
