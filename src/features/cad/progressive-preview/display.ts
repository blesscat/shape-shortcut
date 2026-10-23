import type {
  MeshSnapshot,
  ModelPartMeshSnapshot,
} from '../../../cad-contract/messages'
import type { ModelParameterValues } from '../../../cad-contract/units'
import type { CadState } from '../state'
import { createSimplifiedMesh, supportsProgressivePreview } from './geometry'

export type SimplifiedStatus = 'pending' | 'invalid' | 'failed'
export type PreviewDisplay = {
  mesh: MeshSnapshot
  partMeshes?: ModelPartMeshSnapshot[]
  revision: string
  parameters: ModelParameterValues | null
  simplified: SimplifiedStatus | null
}

function committedDisplay(state: CadState): PreviewDisplay | null {
  const model = state.committed
  if (!model) return null
  return {
    mesh: model.mesh,
    partMeshes: model.partMeshes,
    revision: model.revision,
    parameters: model.parameters,
    simplified: null,
  }
}

function simplifiedStatus(state: CadState, invalid: boolean): SimplifiedStatus {
  if (invalid || state.status === 'invalid-input') return 'invalid'
  if (
    state.status === 'recoverable-error' ||
    state.status === 'fatal-worker-error'
  )
    return 'failed'
  return 'pending'
}

/** A single workspace's display cache; never writes CAD/Worker/export state. */
export function createPreviewDisplaySelector() {
  let key: string | null = null
  let cached: PreviewDisplay | null = null
  let modelId: CadState['modelId'] | null = null
  return (state: CadState, invalid = false): PreviewDisplay | null => {
    if (modelId !== state.modelId) {
      modelId = state.modelId
      key = null
      cached = null
    }
    if (!supportsProgressivePreview(state.modelId))
      return committedDisplay(state)
    if (
      state.committed &&
      !state.stale &&
      state.committed.generation === state.generation
    ) {
      key = null
      cached = null
      return committedDisplay(state)
    }
    const status = simplifiedStatus(state, invalid)
    if (status !== 'invalid') {
      const nextKey = JSON.stringify([state.modelId, state.input])
      if (nextKey !== key) {
        const mesh = createSimplifiedMesh(state.modelId, state.input)
        if (mesh) {
          cached = {
            mesh,
            revision: `simplified-${state.modelId}-${state.generation}`,
            parameters: null,
            simplified: status,
          }
          key = nextKey
        }
      }
    }
    if (!cached) return committedDisplay(state)
    return { ...cached, simplified: status }
  }
}
