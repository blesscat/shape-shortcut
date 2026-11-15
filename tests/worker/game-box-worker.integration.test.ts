import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as CadKernelInitialise from '../../src/cad-kernel/initialise'
import type { WorkerEvent } from '../../src/cad-contract/messages'

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: vi.fn(async () => undefined),
}))

import { CadWorkerRuntime } from '../../src/workers/cad.worker'
import {
  GAME_BOX_CONFIGURATION,
  type GameBoxParameters,
} from '../../src/cad-contract/units'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

const base = {
  version: 2 as const,
  requestId: 'game-box-request',
  operationId: 'game-box-operation',
}

function diceHolderParameters(): GameBoxParameters {
  return {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
    part: 'module2',
    module2Type: 'dice',
    module2DiceSize: 16,
    module2DiceCount: 9,
  } as GameBoxParameters
}

describe('game-box Worker runtime', () => {
  beforeAll(async () => {
    const actual = await vi.importActual<typeof CadKernelInitialise>(
      '../../src/cad-kernel/initialise',
    )
    await actual.initialiseCadKernel(WASM_PATH)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates and exports one dice holder', async () => {
    const events: WorkerEvent[] = []
    const runtime = new CadWorkerRuntime('epoch-game-box', (event) =>
      events.push(event),
    )
    await runtime.handle({
      ...base,
      kind: 'engine.init' as const,
      asset: { wasmUrl: WASM_PATH },
    })
    await runtime.handle({
      ...base,
      kind: 'model.generate' as const,
      generation: 1,
      modelId: 'game-box' as const,
      parameters: diceHolderParameters(),
      previewConfig: { tolerance: 0.05, angularTolerance: 0.2 },
    })

    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )
    expect(candidate).toBeDefined()

    await runtime.handle({
      ...base,
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-game-box',
    })
    const ready = events.find((event) => event.kind === 'model.ready')
    expect(ready).toBeDefined()

    await runtime.handle({
      ...base,
      kind: 'export.step' as const,
      modelRevision: ready!.modelRevision,
      workerEpoch: 'epoch-game-box',
      file: {
        name: 'game-box-dice-holder-70x120-d16x9.step',
        mime: 'model/step' as const,
      },
    })
    await runtime.handle({
      ...base,
      kind: 'export.stl' as const,
      modelRevision: ready!.modelRevision,
      workerEpoch: 'epoch-game-box',
      file: {
        name: 'game-box-dice-holder-70x120-d16x9.stl',
        mime: 'model/stl' as const,
      },
    })

    const exported = events.filter((event) => event.kind === 'export.ready')
    expect(exported.map((entry) => entry.fileName)).toEqual([
      'game-box-dice-holder-70x120-d16x9.step',
      'game-box-dice-holder-70x120-d16x9.stl',
    ])
    for (const entry of exported) {
      expect(entry.bytes.byteLength).toBeGreaterThan(0)
    }
  })

  it('rejects a 3MF export of a game box', async () => {
    const events: WorkerEvent[] = []
    const runtime = new CadWorkerRuntime('epoch-game-box-3mf', (event) =>
      events.push(event),
    )
    await runtime.handle({
      ...base,
      kind: 'engine.init' as const,
      asset: { wasmUrl: WASM_PATH },
    })
    await runtime.handle({
      ...base,
      kind: 'model.generate' as const,
      generation: 1,
      modelId: 'game-box' as const,
      parameters: diceHolderParameters(),
      previewConfig: { tolerance: 0.05, angularTolerance: 0.2 },
    })
    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )
    await runtime.handle({
      ...base,
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-game-box-3mf',
    })
    const ready = events.find((event) => event.kind === 'model.ready')

    await runtime.handle({
      ...base,
      kind: 'export.3mf' as const,
      modelRevision: ready!.modelRevision,
      workerEpoch: 'epoch-game-box-3mf',
      file: {
        name: 'game-box-dice-holder-70x120-d16x9.3mf',
        mime: 'model/3mf' as const,
      },
    })

    const failure = events.find((event) => event.kind === 'operation.error')
    expect(failure?.code).toBe('THREEMF_METADATA_INVALID')
  })
})
