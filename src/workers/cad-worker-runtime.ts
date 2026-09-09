import {
  errorEvent,
  isWorkerCommand,
  PROTOCOL_VERSION,
  type WorkerCommand,
} from '../cad-contract/messages'
import { diagnostic } from '../cad-contract/diagnostics'
import type {
  CadError,
  CadErrorCode,
  CadErrorStage,
} from '../cad-contract/errors'
import { initialiseCadKernel } from '../cad-kernel/initialise'
import { CadWorkerAssetCache } from './cad-worker-assets'
import {
  exportStepCommand,
  exportStlCommand,
  exportThreeMfCommand,
} from './cad-worker-export'
import {
  emitProgress as emitProgressEvent,
  id,
  makeError,
} from './cad-worker-events'
import { generateCadCandidate } from './cad-worker-generation'
import { CadWorkerLifecycle } from './cad-worker-lifecycle'
import type {
  CadWorkerBuildOptions,
  EventSink,
  ProgressEmitter,
} from './cad-worker-types'
import { cadErrorCodeFor, cadErrorStageFor } from './error-mapping'

export type { CadWorkerBuildOptions } from './cad-worker-types'

function normalizeLegacyWorkerCommand(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value
  }
  const command = value as Record<string, unknown>
  if (
    command.kind !== 'model.generate' ||
    command.modelId !== 'opengrid-snap' ||
    typeof command.parameters !== 'object' ||
    command.parameters === null ||
    Array.isArray(command.parameters)
  ) {
    return value
  }
  const parameters = command.parameters as Record<string, unknown>
  if (parameters.topText !== 'SNAP') return value
  return {
    ...command,
    parameters: { ...parameters, topText: 'none' },
  }
}

export class CadWorkerRuntime {
  private initialized = false
  private initializing: Promise<void> | null = null
  private readonly lifecycle: CadWorkerLifecycle
  private readonly assets: CadWorkerAssetCache

  constructor(
    private readonly epoch: string = `epoch-${id()}`,
    private readonly emit: EventSink = () => undefined,
    private readonly openGridBuildOptions: CadWorkerBuildOptions = {},
  ) {
    this.lifecycle = new CadWorkerLifecycle(epoch, emit)
    this.assets = new CadWorkerAssetCache(
      () => this.lifecycle.isDisposed,
      openGridBuildOptions,
    )
  }

  async handle(value: unknown): Promise<void> {
    const normalizedValue = normalizeLegacyWorkerCommand(value)
    if (!isWorkerCommand(normalizedValue)) {
      this.emit({
        version: PROTOCOL_VERSION,
        kind: 'operation.error',
        requestId: id(),
        operationId: 'protocol',
        terminalForRequestId: 'protocol',
        stage: 'protocol',
        code: 'PROTOCOL_INVALID',
        messageId: 'diagnostic.protocolInvalid',
        recoverable: false,
      })
      return
    }
    const command = normalizedValue

    if (this.lifecycle.isDisposed && command.kind !== 'worker.dispose') {
      this.emit(
        errorEvent(
          command,
          makeError(
            'worker',
            'WORKER_TERMINATED',
            diagnostic('diagnostic.workerTerminated'),
            false,
          ),
        ),
      )
      return
    }

    try {
      switch (command.kind) {
        case 'engine.init':
          await this.initialize(command)
          return
        case 'model.generate':
          await this.generate(command)
          return
        case 'model.invalidate':
          this.invalidate(command)
          return
        case 'model.commit':
          this.commit(command)
          return
        case 'model.discard':
          this.discard(command)
          return
        case 'export.step':
          await this.exportStep(command)
          return
        case 'export.stl':
          await this.exportStl(command)
          return
        case 'export.3mf':
          await this.exportThreeMf(command)
          return
        case 'worker.dispose':
          this.dispose()
          return
      }
    } catch (error) {
      this.emit(errorEvent(command, this.toCadError(error, command)))
    }
  }

  private async initialize(
    command: Extract<WorkerCommand, { kind: 'engine.init' }>,
  ): Promise<void> {
    if (this.initialized) {
      this.ready(command)
      return
    }
    if (!this.initializing) {
      this.emitProgress(command, 'loading')
      this.initializing = initialiseCadKernel(command.asset.wasmUrl)
        .then(() => {
          if (!this.lifecycle.isDisposed) this.initialized = true
        })
        .finally(() => {
          this.initializing = null
        })
    }
    await this.initializing
    if (this.lifecycle.isDisposed) throw new Error('WORKER_TERMINATED')
    this.ready(command)
  }

  private ready(
    command: Extract<WorkerCommand, { kind: 'engine.init' }>,
  ): void {
    this.emit({
      version: PROTOCOL_VERSION,
      kind: 'engine.ready',
      requestId: command.requestId,
      operationId: command.operationId,
      workerEpoch: this.epoch,
      engine: { name: 'replicad', wasm: true },
    })
  }

  private async generate(
    command: Extract<WorkerCommand, { kind: 'model.generate' }>,
  ): Promise<void> {
    if (!this.initialized) throw new Error('ENGINE_NOT_READY')
    if (!this.lifecycle.beginGeneration(command.generation)) {
      this.lifecycle.superseded(command, 'STALE_GENERATION')
      return
    }
    await generateCadCandidate(command, {
      epoch: this.epoch,
      assets: this.assets,
      buildOptions: this.openGridBuildOptions,
      emit: this.emit,
      emitProgress: this.emitProgress.bind(this),
      isGenerationCurrent: (generation) =>
        this.lifecycle.isGenerationCurrent(generation),
      registerCandidate: (candidate) =>
        this.lifecycle.registerCandidate(candidate),
      supersede: (candidate, reason) =>
        this.lifecycle.superseded(candidate, reason),
    })
  }

  private invalidate(
    command: Extract<WorkerCommand, { kind: 'model.invalidate' }>,
  ): void {
    this.lifecycle.invalidate(command)
  }

  private commit(
    command: Extract<WorkerCommand, { kind: 'model.commit' }>,
  ): void {
    this.lifecycle.commit(command)
  }

  private discard(
    command: Extract<WorkerCommand, { kind: 'model.discard' }>,
  ): void {
    this.lifecycle.discard(command)
  }

  private async exportStep(
    command: Extract<WorkerCommand, { kind: 'export.step' }>,
  ): Promise<void> {
    await exportStepCommand(command, {
      epoch: this.epoch,
      lifecycle: this.lifecycle,
      emit: this.emit,
    })
  }

  private async exportStl(
    command: Extract<WorkerCommand, { kind: 'export.stl' }>,
  ): Promise<void> {
    await exportStlCommand(command, {
      epoch: this.epoch,
      lifecycle: this.lifecycle,
      emit: this.emit,
    })
  }

  private async exportThreeMf(
    command: Extract<WorkerCommand, { kind: 'export.3mf' }>,
  ): Promise<void> {
    await exportThreeMfCommand(command, {
      epoch: this.epoch,
      lifecycle: this.lifecycle,
      emit: this.emit,
    })
  }

  private emitProgress(...args: Parameters<ProgressEmitter>): void {
    emitProgressEvent(this.emit, ...args)
  }

  private dispose(): void {
    if (this.lifecycle.isDisposed) return
    this.lifecycle.dispose()
    this.assets.dispose()
    this.initialized = false
    this.initializing = null
  }

  private toCadError(error: unknown, command: WorkerCommand): CadError {
    const message = error instanceof Error ? error.message : String(error)
    const code: CadErrorCode = cadErrorCodeFor(message, command.kind)
    const stage: CadErrorStage = cadErrorStageFor(command.kind, message)
    if (command.kind === 'export.stl') {
      const messageId =
        code === 'STL_METADATA_INVALID'
          ? 'diagnostic.stlMetadataInvalid'
          : 'diagnostic.stlExportFailed'
      return makeError(stage, code, diagnostic(messageId), true)
    }
    if (command.kind === 'export.3mf') {
      const messageId =
        code === 'THREEMF_METADATA_INVALID'
          ? 'diagnostic.threeMfMetadataInvalid'
          : 'diagnostic.threeMfExportFailed'
      return makeError(stage, code, diagnostic(messageId), true)
    }
    if (code === 'OPENGRID_UNSUPPORTED_CONFIGURATION') {
      return makeError(
        'validation',
        code,
        diagnostic('diagnostic.opengridUnsupported'),
        true,
      )
    }
    if (
      code === 'INVALID_INPUT' &&
      message.includes('opengrid-stackable-cylinder')
    ) {
      return makeError(
        'validation',
        code,
        diagnostic('diagnostic.cylinderParametersInvalid'),
        true,
      )
    }
    if (code === 'OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT') {
      return makeError(
        'building',
        code,
        diagnostic('diagnostic.opengridHoneycombMemoryLimit'),
        true,
      )
    }
    if (code === 'OPENGRID_HONEYCOMB_MEMORY_LIMIT') {
      return makeError(
        'building',
        code,
        diagnostic('diagnostic.honeycombMemoryLimit'),
        true,
      )
    }
    if (code === 'OPENGRID_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        diagnostic('diagnostic.opengridQualityInvalid'),
        true,
      )
    }
    if (code === 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        diagnostic('diagnostic.cylinderQualityInvalid'),
        true,
      )
    }
    if (code === 'OPENGRID_SNAP_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        diagnostic('diagnostic.snapQualityInvalid'),
        true,
      )
    }
    if (code === 'OPENGRID_WALL_COVER_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        diagnostic('diagnostic.wallCoverQualityInvalid'),
        true,
      )
    }
    if (message.includes('OPENGRID_WALL_COVER_TEXT_GLYPH_UNSUPPORTED')) {
      return makeError(
        'building',
        code,
        diagnostic('diagnostic.wallCoverGlyphUnsupported'),
        true,
      )
    }
    if (message.includes('OPENGRID_WALL_COVER_FONT_')) {
      return makeError(
        'building',
        code,
        diagnostic('diagnostic.wallCoverFontLoadFailed'),
        true,
      )
    }

    if (code === 'OPENGRID_DIVIDER_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        diagnostic('diagnostic.dividerQualityInvalid'),
        true,
      )
    }
    return makeError(
      stage,
      code,
      diagnostic('diagnostic.modelBuildFailed'),
      true,
    )
  }
}
