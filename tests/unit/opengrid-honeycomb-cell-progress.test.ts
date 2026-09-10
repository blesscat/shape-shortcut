import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import type {
  BooleanOperationKind,
  BooleanOperationProgress,
  BooleanOperationState,
} from '../../src/cad-contract/messages'
import type { BooleanOperationReporter } from '../../src/cad-kernel/boolean-progress'
import {
  openGridOpenShelfHoneycombCellCountFor,
  openGridStackableBoxHoneycombPanelCellCountFor,
  openGridStackableCylinderHoneycombCellCountFor,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { buildOpenGridStackableCylinder } from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'
import { buildOpenGridOpenShelf } from '../../src/cad-kernel/components/opengrid-open-shelf/builder'

const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const wasmPath =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => wasmPath,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

type RecordedScope = {
  total: number | undefined
  unit: string | undefined
  events: BooleanOperationProgress[]
}

function capturingReporter(): {
  reporter: BooleanOperationReporter
  scopes: RecordedScope[]
} {
  const scopes: RecordedScope[] = []
  return {
    scopes,
    reporter: {
      createScope(total, options?) {
        const scope: RecordedScope = {
          total,
          unit: options?.unit,
          events: [],
        }
        scopes.push(scope)
        let completed = 0
        const push = (
          kind: BooleanOperationKind,
          state: BooleanOperationState,
        ): void => {
          const event: BooleanOperationProgress = { kind, state, elapsedMs: 0 }
          if (total !== undefined) {
            event.completed = completed
            event.total = total
          }
          if (options?.unit) event.unit = options.unit
          scope.events.push(event)
        }
        const measureCount = <T>(
          kind: BooleanOperationKind,
          count: number,
          operation: () => T,
        ): T => {
          push(kind, 'running')
          const result = operation()
          completed += count
          push(kind, 'completed')
          return result
        }
        return {
          measure: (kind, operation) => measureCount(kind, 1, operation),
          measureCount,
        }
      },
    },
  }
}

function cellScopes(scopes: RecordedScope[]): RecordedScope[] {
  return scopes.filter((scope) => scope.unit === 'cells')
}

function expectHonestCellProgress(
  scopes: RecordedScope[],
  expectedTotal: number,
): void {
  expect(scopes.length).toBeGreaterThan(0)
  // Each cutting phase owns one honest scope; the phases together must
  // account for every cell the parameter-derived count promises.
  expect(scopes.reduce((sum, scope) => sum + (scope.total ?? 0), 0)).toBe(
    expectedTotal,
  )
  for (const scope of scopes) {
    expect(scope.events.length).toBeGreaterThan(0)
    let previousCompleted = 0
    for (const event of scope.events) {
      expect(event.kind).toBe('cut')
      expect(event.total).toBe(scope.total)
      if (event.state === 'running') {
        // An active update carries the count completed so far.
        expect(event.completed).toBe(previousCompleted)
      } else {
        expect(event.completed as number).toBeGreaterThan(previousCompleted)
        expect(event.completed as number).toBeLessThanOrEqual(
          scope.total as number,
        )
        previousCompleted = event.completed as number
      }
    }
    const last = scope.events.at(-1)
    expect(last?.state).toBe('completed')
    expect(last?.completed).toBe(scope.total)
  }
}

function dispose(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Ignore double-disposal in tests.
  }
}

describe('honeycomb cell-unit cut progress', () => {
  it('reports stackable-box panel cuts in cells that sum to the panel count', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 1,
      y: 1,
      height: 30,
      thinShellMode: true,
      cornerSeatMode: 'none' as const,
      honeycombMode: true,
    }
    const { reporter, scopes } = capturingReporter()
    const shape = buildOpenGridStackableBox(parameters, {
      booleanOperations: reporter,
    })
    try {
      expect(shape).toBeDefined()
    } finally {
      dispose(shape)
    }
    expectHonestCellProgress(
      cellScopes(scopes),
      openGridStackableBoxHoneycombPanelCellCountFor(parameters),
    )
  }, 300_000)

  it('reports stackable-cylinder batch cuts in cells that sum to the cell count', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 56,
      height: 30,
      bottomSeatMode: 'none' as const,
      honeycombMode: true,
    }
    const { reporter, scopes } = capturingReporter()
    const shape = buildOpenGridStackableCylinder(parameters, {
      booleanOperations: reporter,
    })
    try {
      expect(shape).toBeDefined()
    } finally {
      dispose(shape)
    }
    expectHonestCellProgress(
      cellScopes(scopes),
      openGridStackableCylinderHoneycombCellCountFor(parameters),
    )
  }, 300_000)

  it('reports Open Shelf group cuts in cells that sum to the cell count', async () => {
    const parameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      x: 2,
      y: 2,
      height: 30,
      cellX: 1,
      cellZ: 1,
      honeycombMode: true,
    }
    const { reporter, scopes } = capturingReporter()
    const shape = await buildOpenGridOpenShelf(parameters, {
      booleanOperations: reporter,
    })
    try {
      expect(shape).toBeDefined()
    } finally {
      dispose(shape as unknown as Shape3D)
    }
    expectHonestCellProgress(
      cellScopes(scopes),
      openGridOpenShelfHoneycombCellCountFor(parameters),
    )
  }, 300_000)
})
