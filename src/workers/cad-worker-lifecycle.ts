import {
  isWorkerEvent,
  PROTOCOL_VERSION,
  transferablesForEvent,
  type ModelPartMeshSnapshot,
  type WorkerCommand,
  type WorkerEvent,
} from '../cad-contract/messages'
import {
  RevisionLifetime,
  type CandidateRecord,
  type RevisionRecord,
} from '../cad-kernel/lifetime'
import { serializeMesh } from '../cad-kernel/mesh'
import { PROTOTYPE_CONFIGURATION } from '../cad-contract/units'
import type {
  EventSink,
  CandidateTerminal,
  SupersededReason,
} from './cad-worker-types'
import { emitSuperseded, id } from './cad-worker-events'

type CandidateRegistration = () => void

export class CadWorkerLifecycle {
  private latestInputGeneration = 0
  private invalidatedGeneration = 0
  private disposed = false
  private readonly lifetime: RevisionLifetime
  private readonly candidateTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >()
  // Terminal records intentionally retain only correlation metadata so duplicate
  // commit/discard messages cannot release a candidate twice or invent a new terminal id.
  private readonly candidateTerminals = new Map<string, CandidateTerminal>()

  constructor(
    private readonly epoch: string,
    private readonly emit: EventSink,
  ) {
    this.lifetime = new RevisionLifetime(
      epoch,
      PROTOTYPE_CONFIGURATION.pendingCandidateLimit,
      PROTOTYPE_CONFIGURATION.candidateTtlMs,
    )
  }

  private rememberCandidateTerminal(
    candidateId: string,
    terminal: CandidateTerminal,
  ): void {
    this.candidateTerminals.set(candidateId, terminal)
    while (
      this.candidateTerminals.size >
      PROTOTYPE_CONFIGURATION.pendingCandidateLimit
    ) {
      const oldestCandidateId = this.candidateTerminals.keys().next().value
      if (oldestCandidateId === undefined) break
      this.candidateTerminals.delete(oldestCandidateId)
    }
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  get latestGeneration(): number {
    return this.latestInputGeneration
  }

  beginGeneration(generation: number): boolean {
    const isRegenerationAfterInvalidation =
      generation === this.latestInputGeneration &&
      this.invalidatedGeneration === generation
    if (
      generation < this.latestInputGeneration ||
      (generation === this.latestInputGeneration &&
        !isRegenerationAfterInvalidation)
    ) {
      return false
    }
    this.latestInputGeneration = generation
    this.invalidatedGeneration = 0
    this.lifetime.pruneCommitsBeforeGeneration(this.latestInputGeneration)
    return true
  }

  isGenerationCurrent(generation: number): boolean {
    return (
      !this.disposed &&
      generation === this.latestInputGeneration &&
      this.invalidatedGeneration !== generation
    )
  }

  registerCandidate(candidate: CandidateRecord): CandidateRegistration {
    const evicted = this.lifetime.addCandidate(candidate)
    for (const old of evicted) this.finalizeCandidate(old, 'CANDIDATE_CAPACITY')
    const expired = this.lifetime.cleanupExpired(this.latestInputGeneration)
    for (const old of expired) {
      this.finalizeCandidate(
        old,
        old.generation < this.latestInputGeneration
          ? 'STALE_GENERATION'
          : 'CANDIDATE_EXPIRED',
      )
    }

    this.scheduleCandidateCleanup(candidate)
    return () => {
      this.clearCandidateTimer(candidate.candidateId)
      this.lifetime.discardCandidate(candidate.candidateId)
    }
  }

  invalidate(
    command: Extract<WorkerCommand, { kind: 'model.invalidate' }>,
  ): void {
    if (command.workerEpoch !== this.epoch) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    if (command.generation < this.latestInputGeneration) {
      this.emit({
        version: PROTOCOL_VERSION,
        kind: 'model.invalidated',
        requestId: id(),
        operationId: command.operationId,
        generation: command.generation,
        workerEpoch: this.epoch,
      })
      return
    }
    if (command.generation > this.latestInputGeneration) {
      this.latestInputGeneration = command.generation
      this.lifetime.pruneCommitsBeforeGeneration(this.latestInputGeneration)
    }
    this.invalidatedGeneration = command.generation
    const expired = this.lifetime.cleanupExpired(command.generation, true)
    for (const old of expired) {
      this.finalizeCandidate(
        old,
        old.generation <= command.generation
          ? 'STALE_GENERATION'
          : 'CANDIDATE_EXPIRED',
      )
    }
    this.emit({
      version: PROTOCOL_VERSION,
      kind: 'model.invalidated',
      requestId: id(),
      operationId: command.operationId,
      generation: command.generation,
      workerEpoch: this.epoch,
    })
  }

  commit(command: Extract<WorkerCommand, { kind: 'model.commit' }>): void {
    if (command.workerEpoch !== this.epoch) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    const terminal = this.candidateTerminals.get(command.candidateId)
    if (terminal) return
    const candidate = this.lifetime.getCandidate(command.candidateId)
    if (
      candidate &&
      (candidate.generation < this.latestInputGeneration ||
        this.invalidatedGeneration === candidate.generation)
    ) {
      const removed = this.lifetime.discardCandidate(command.candidateId)
      if (removed) this.finalizeCandidate(removed, 'STALE_GENERATION')
      return
    }
    if (
      command.generation !== this.latestInputGeneration ||
      this.invalidatedGeneration === command.generation
    ) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    const previousCommit = this.lifetime.getCommit(command.operationId)
    if (previousCommit) {
      this.readyFromRevision(command, previousCommit.revision)
      return
    }
    if (
      !candidate ||
      candidate.workerEpoch !== this.epoch ||
      candidate.generation !== this.latestInputGeneration
    ) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    const revision = this.lifetime.commitCandidate(command.candidateId)
    this.clearCandidateTimer(command.candidateId)
    this.readyFromRevision(command, revision)
  }

  discard(command: Extract<WorkerCommand, { kind: 'model.discard' }>): void {
    if (command.workerEpoch !== this.epoch) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    const terminal = this.candidateTerminals.get(command.candidateId)
    if (terminal) return
    const candidate = this.lifetime.discardCandidate(command.candidateId)
    if (!candidate) return
    this.finalizeCandidate(candidate, 'CANDIDATE_ORPHANED')
  }

  pin(modelRevision: string): RevisionRecord {
    return this.lifetime.pin(modelRevision)
  }

  unpin(modelRevision: string): void {
    this.lifetime.unpin(modelRevision)
  }

  superseded(
    command: { operationId: string; requestId: string; generation?: number },
    reason: SupersededReason,
  ): void {
    emitSuperseded(this.emit, command, reason, this.latestInputGeneration)
  }

  dispose(): void {
    this.clearCandidateTimers()
    this.candidateTerminals.clear()
    this.lifetime.dispose()
    this.disposed = true
    this.invalidatedGeneration = 0
  }

  private readyFromRevision(
    command: Extract<WorkerCommand, { kind: 'model.commit' }>,
    revision: RevisionRecord,
  ): void {
    let readyEvent: WorkerEvent
    let readyMesh: ReturnType<typeof serializeMesh> | undefined
    let readyPartMeshes: ModelPartMeshSnapshot[] | undefined
    try {
      if (
        revision.modelId === 'opengrid-wall-cover' ||
        (revision.modelId === 'opengrid-stackable-cylinder' &&
          'topRimEnabled' in revision.parameters &&
          revision.parameters.topRimEnabled)
      ) {
        readyMesh = serializeMesh(revision.mesh)
      }
      readyPartMeshes = revision.partMeshes?.map((part) => ({
        name: part.name as 'body' | 'text' | 'rim',
        mesh: serializeMesh(part.mesh),
      }))
      const candidateEvent: WorkerEvent = {
        version: PROTOCOL_VERSION,
        kind: 'model.ready',
        requestId: id(),
        operationId: command.operationId,
        generation: revision.generation,
        modelRevision: revision.modelRevision,
        workerEpoch: this.epoch,
        modelId: revision.modelId,
        parameters: revision.parameters,
        ...(readyMesh ? { mesh: readyMesh } : {}),
        partMeshes: readyPartMeshes,
        bounds: revision.mesh.bounds,
        previewTiming: revision.previewTiming,
      }
      if (!isWorkerEvent(candidateEvent)) throw new Error('MESH_INVALID')
      readyEvent = candidateEvent
    } catch (error) {
      this.lifetime.abortRevision(revision.modelRevision)
      throw error
    }
    const transferables: Transferable[] = transferablesForEvent(readyEvent)
    this.emit(readyEvent, transferables)
  }

  private finalizeCandidate(
    candidate: CandidateRecord,
    reason: SupersededReason,
  ): void {
    this.clearCandidateTimer(candidate.candidateId)
    const terminal = {
      operationId: candidate.operationId,
      requestId: candidate.requestId,
      generation: candidate.generation,
      reason,
    } satisfies CandidateTerminal
    this.rememberCandidateTerminal(candidate.candidateId, terminal)
    this.emit({
      version: PROTOCOL_VERSION,
      kind: 'operation.superseded',
      requestId: id(),
      operationId: terminal.operationId,
      terminalForRequestId: terminal.requestId,
      generation: terminal.generation,
      reason: terminal.reason,
    })
  }

  private scheduleCandidateCleanup(candidate: CandidateRecord): void {
    this.clearCandidateTimer(candidate.candidateId)
    const delay = Math.max(
      0,
      candidate.createdAt + PROTOTYPE_CONFIGURATION.candidateTtlMs - Date.now(),
    )
    const timer = setTimeout(() => {
      const remaining =
        candidate.createdAt +
        PROTOTYPE_CONFIGURATION.candidateTtlMs -
        Date.now()
      if (remaining > 0) {
        this.scheduleCandidateCleanup(candidate)
        return
      }
      const expired = this.lifetime.cleanupExpired(this.latestInputGeneration)
      for (const old of expired) {
        this.finalizeCandidate(
          old,
          old.generation < this.latestInputGeneration
            ? 'STALE_GENERATION'
            : 'CANDIDATE_EXPIRED',
        )
      }
    }, delay)
    this.candidateTimers.set(candidate.candidateId, timer)
  }

  private clearCandidateTimer(candidateId: string): void {
    const timer = this.candidateTimers.get(candidateId)
    if (timer) clearTimeout(timer)
    this.candidateTimers.delete(candidateId)
  }

  private clearCandidateTimers(): void {
    for (const timer of this.candidateTimers.values()) clearTimeout(timer)
    this.candidateTimers.clear()
  }
}
