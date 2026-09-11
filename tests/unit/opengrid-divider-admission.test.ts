import { expect, it, vi } from 'vitest'
import {
  OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS,
  type OpenGridDividerParameters,
} from '../../src/cad-contract/units'
import { openGridDividerHoneycombCellCountFor } from '../../src/cad-kernel/lattice/opengrid-honeycomb'
import { buildOpenGridDivider } from '../../src/cad-kernel/components/opengrid-divider/builder'
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

const oversized: OpenGridDividerParameters = {
  left: 8,
  right: 8,
  up: 8,
  down: 8,
  height: 500,
  wallThickness: 2,
  honeycombMode: true,
}

it('rejects an oversized saving-mode divider before native allocation', async () => {
  const count = openGridDividerHoneycombCellCountFor(oversized)
  expect(count).toBeGreaterThan(OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS)
  await expect(buildOpenGridDivider(oversized)).rejects.toThrow(
    `OPENGRID_DIVIDER_HONEYCOMB_MEMORY_LIMIT:${count}:${OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS}`,
  )
  expect(allocation).not.toHaveBeenCalled()
})

it('checks stale generation after the saving-mode admission guard', async () => {
  const inBudget: OpenGridDividerParameters = {
    left: 2,
    right: 2,
    up: 0,
    down: 0,
    height: 40,
    wallThickness: 2,
    honeycombMode: true,
  }
  expect(openGridDividerHoneycombCellCountFor(inBudget)).toBeLessThan(
    OPENGRID_DIVIDER_HONEYCOMB_MAX_CELLS,
  )
  await expect(
    buildOpenGridDivider(inBudget, { isGenerationCurrent: () => false }),
  ).rejects.toThrow('STALE_GENERATION')
  expect(allocation).not.toHaveBeenCalled()
})

it('preserves the divider saving-mode error identity and stage', () => {
  const limitCode = 'OPENGRID_DIVIDER_HONEYCOMB_MEMORY_LIMIT'
  expect(cadErrorCodeFor(`${limitCode}:4000:3000`, 'model.generate')).toBe(
    limitCode,
  )
  expect(cadErrorStageFor('model.generate', `${limitCode}:4000:3000`)).toBe(
    'building',
  )
  expect(
    cadErrorCodeFor(
      'OPENGRID_DIVIDER_HONEYCOMB_INVALID:boolean FAILED',
      'model.generate',
    ),
  ).toBe('MODEL_BUILD_FAILED')
})
