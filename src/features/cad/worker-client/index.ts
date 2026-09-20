import {
  isWorkerEvent,
  PROTOCOL_VERSION,
  type WorkerCommand,
  type WorkerCommandInput,
  type WorkerEvent,
} from '../../../cad-contract/messages'
import type {
  MeshSnapshot,
  ModelPartMeshSnapshot,
} from '../../../cad-contract/messages'

export type WorkerClientListener = (event: WorkerEvent) => void

export type WorkerClientError = {
  kind: 'worker-error' | 'worker-message-error' | 'protocol-error'
  error: Error
}

export type WorkerClientErrorListener = (error: WorkerClientError) => void

export function newOperationId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function newRequestId(): string {
  return `request-${crypto.randomUUID()}`
}

export class CadWorkerClient {
  private readonly listeners = new Set<WorkerClientListener>()
  private readonly errorListeners = new Set<WorkerClientErrorListener>()
  private readonly worker: Worker
  private disposed = false

  constructor(
    workerFactory: () => Worker = () =>
      new Worker(new URL('../../../workers/cad.worker.ts', import.meta.url), {
        type: 'module',
      }),
  ) {
    this.worker = workerFactory()
    this.worker.addEventListener('message', this.handleMessage)
    this.worker.addEventListener('error', this.handleWorkerError)
    this.worker.addEventListener('messageerror', this.handleMessageError)
  }

  onEvent(listener: WorkerClientListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onError(listener: WorkerClientErrorListener): () => void {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  send(command: WorkerCommandInput): string {
    if (this.disposed) throw new Error('Worker client has been disposed')
    const message = {
      ...command,
      version: command.version ?? PROTOCOL_VERSION,
      requestId: command.requestId ?? newRequestId(),
    } as WorkerCommand
    this.worker.postMessage(message, this.transferablesForCommand(message))
    return message.requestId
  }

  terminate(): void {
    if (this.disposed) return
    this.disposed = true
    this.worker.removeEventListener('message', this.handleMessage)
    this.worker.removeEventListener('error', this.handleWorkerError)
    this.worker.removeEventListener('messageerror', this.handleMessageError)
    this.worker.terminate()
    this.listeners.clear()
    this.errorListeners.clear()
  }

  private readonly handleMessage = (event: MessageEvent<unknown>): void => {
    if (!isWorkerEvent(event.data)) {
      this.emitError({
        kind: 'protocol-error',
        error: new Error('Worker response failed runtime validation'),
      })
      return
    }
    for (const listener of this.listeners) listener(event.data)
  }

  private readonly handleWorkerError = (event: ErrorEvent): void => {
    this.emitError({
      kind: 'worker-error',
      error: new Error(event.message || 'CAD Worker terminated unexpectedly'),
    })
  }

  private readonly handleMessageError = (): void => {
    this.emitError({
      kind: 'worker-message-error',
      error: new Error('CAD Worker message could not be cloned'),
    })
  }

  private emitError(error: WorkerClientError): void {
    for (const listener of this.errorListeners) listener(error)
  }

  private transferablesForCommand(command: WorkerCommand): Transferable[] {
    return []
  }
}

export function validateMeshSnapshot(mesh: MeshSnapshot): boolean {
  try {
    const positions = new Float32Array(mesh.positions)
    const normals = new Float32Array(mesh.normals)
    const indices = new Uint32Array(mesh.indices)
    if (positions.length === 0 || positions.length % 3 !== 0) return false
    if (
      normals.length !== positions.length ||
      indices.length === 0 ||
      indices.length % 3 !== 0
    )
      return false
    if (mesh.triangleCount !== indices.length / 3) return false
    if (!positions.every(Number.isFinite) || !normals.every(Number.isFinite)) {
      return false
    }
    if (!indices.every((index) => index < positions.length / 3)) return false
    return (
      [...mesh.bounds.min, ...mesh.bounds.max].every(Number.isFinite) &&
      mesh.bounds.min.every(
        (coordinate, index) => coordinate <= mesh.bounds.max[index],
      )
    )
  } catch {
    return false
  }
}

export function validateModelPartMeshes(
  partMeshes: readonly ModelPartMeshSnapshot[] | undefined,
  requireBodyAndText = false,
): boolean {
  if (partMeshes === undefined) return !requireBodyAndText
  const names = new Set<string>()
  for (const part of partMeshes) {
    if (
      (part.name !== 'body' && part.name !== 'text' && part.name !== 'icon') ||
      names.has(part.name) ||
      !validateMeshSnapshot(part.mesh)
    ) {
      return false
    }
    names.add(part.name)
  }
  if (!requireBodyAndText) return partMeshes.length > 0
  return names.has('body') && (names.has('text') || names.has('icon'))
}
