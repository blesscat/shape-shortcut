import { normalizeError } from '../../../../cad-contract/errors'
import { diagnostic } from '../../../../cad-contract/diagnostics'
import {
  OPENGRID_PREVIEW_CONFIGURATION,
  OPENGRID_OPENCONNECT_SHELF_CONFIGURATION,
  PILLAR_CONFIGURATION,
  PROTOTYPE_CONFIGURATION,
  isOpenGridParameters,
  openGridOpenConnectShelfMaximumAngleForRows,
  validateOpenGridGenerationSupport,
  validateOpenGridParameters,
  validateModelParameters,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
  type OpenGridParameters,
} from '../../../../cad-contract/units'
import { newOperationId } from '../../../../features/cad/worker-client'
import {
  errorForInput,
  parseRawParameters,
  rawFromParameters,
} from '../validation'
import type { RawParameters } from '../types'
import type { ModelGenerationHandlers, RuntimeContext } from './types'

function previewConfigForModel(modelId: ModelId) {
  if (modelId === 'opengrid') {
    return { ...OPENGRID_PREVIEW_CONFIGURATION }
  }
  return {
    tolerance: PROTOTYPE_CONFIGURATION.boundsTolerance,
    angularTolerance: 0.1,
  }
}

function isOpenConnectShelfGridCount(value: number): boolean {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  return (
    Number.isSafeInteger(value) &&
    value >= configuration.minGridCount &&
    value <= configuration.maxGridCount
  )
}

function clampOpenConnectShelfAngle(parameters: RawParameters): RawParameters {
  const rows = Number(parameters.rows)
  const connectorRows = Number(parameters.connectorRows)
  const angle = Number(parameters.angle)
  if (
    !isOpenConnectShelfGridCount(rows) ||
    !isOpenConnectShelfGridCount(connectorRows) ||
    !Number.isFinite(angle)
  ) {
    return parameters
  }

  const maximumAngle = openGridOpenConnectShelfMaximumAngleForRows(
    rows,
    connectorRows,
  )
  if (angle <= maximumAngle) return parameters
  return { ...parameters, angle: String(maximumAngle) }
}

export function createModelGenerationHandlers(
  context: RuntimeContext,
): ModelGenerationHandlers {
  const sendInvalidate: ModelGenerationHandlers['sendInvalidate'] = (
    generation,
    reason,
  ) => {
    const client = context.refs.client.current
    const workerEpoch = context.refs.workerEpoch.current
    if (!client || !workerEpoch) {
      context.refs.session.current.invalidGeneration = generation
      return
    }
    context.refs.session.current.invalidGeneration = undefined
    client.send({
      kind: 'model.invalidate',
      operationId: newOperationId('invalidate'),
      generation,
      workerEpoch,
      reason,
    })
  }

  const sendGenerate: ModelGenerationHandlers['sendGenerate'] = (
    modelId,
    parameters,
    generation,
    operationId = newOperationId('model'),
  ) => {
    const client = context.refs.client.current
    if (!client) return
    if (modelId === 'opengrid' && isOpenGridParameters(parameters)) {
      const support = validateOpenGridGenerationSupport(parameters)
      if (!support.valid) {
        context.clearProgress()
        const issue = support.issues[0] ?? {
          field: 'parameters' as const,
          messageId: 'validation.invalid',
        }
        context.setFieldErrors({ parameters: issue })
        context.dispatch({
          type: 'input-invalid',
          modelId,
          input: parameters,
          generation,
          error: normalizeError(
            new Error('OPENGRID_UNSUPPORTED_CONFIGURATION'),
            {
              stage: 'validation',
              code: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
              message: diagnostic('diagnostic.opengridUnsupported'),
              recoverable: true,
              generation,
              operationId,
            },
          ),
        })
        sendInvalidate(generation, 'invalid-input')
        return
      }
    }
    const requestId = client.send({
      kind: 'model.generate',
      operationId,
      generation,
      modelId,
      parameters,
      previewConfig: previewConfigForModel(modelId),
    })
    context.refs.operations.current.set(operationId, {
      kind: 'model',
      generation,
      modelId,
      parameters,
      requestId,
    })
    context.setOperationProgress(operationId, { stage: 'building' })
    context.setOperationTimeout(
      operationId,
      PROTOTYPE_CONFIGURATION.modelGenerationTimeoutMs,
      () => {
        context.recoverWorker(
          normalizeError(undefined, {
            stage: 'worker',
            code: 'WORKER_TIMEOUT',
            message: diagnostic('diagnostic.modelBuildFailed'),
            recoverable: true,
            generation,
            operationId,
          }),
          client,
        )
      },
    )
  }

  const queueModelGeneration = (
    modelId: ModelId,
    parameters: ModelParameterValues,
    generation: number,
    valid = true,
  ) => {
    context.refs.exportRequest.current = null
    for (const [operationId, operation] of context.refs.operations.current) {
      if (operation.kind === 'init') continue
      context.clearTimer(operationId)
      context.clearOperationProgress(operationId)
      context.refs.operations.current.delete(operationId)
    }
    if (context.refs.debounce.current)
      clearTimeout(context.refs.debounce.current)
    context.refs.debounce.current = setTimeout(() => {
      context.refs.debounce.current = null
      if (
        context.refs.disposed.current ||
        generation !== context.refs.latestGeneration.current
      )
        return
      if (!valid) {
        context.refs.session.current.pending = null
        sendInvalidate(generation, 'invalid-input')
        return
      }
      context.dispatch({ type: 'generation-start', generation })
      context.refs.startWorker.current(false, {
        modelId,
        parameters,
        generation,
      })
    }, PROTOTYPE_CONFIGURATION.inputDebounceMs)
  }

  const handleInputChange = (key: ModelParameterKey, value: string) => {
    const modelId = context.refs.state.current.modelId
    let next = { ...context.refs.rawParameters.current, [key]: value }
    if (modelId === 'opengrid-pillar' && key === 'mode') {
      // Both pillar modes share the length/offset keys with different
      // semantics, so a mode switch resets them to the target mode's defaults.
      next =
        value === 'detachable-corner-seat'
          ? {
              mode: value,
              length: String(PILLAR_CONFIGURATION.seatDefaultLength),
              offset: '0',
            }
          : {
              mode: value,
              length: String(PILLAR_CONFIGURATION.positioningDefaultLength),
              offset: '0',
            }
    }
    if (
      modelId === 'opengrid-openconnect-shelf' &&
      (key === 'rows' || key === 'connectorRows')
    ) {
      next = clampOpenConnectShelfAngle(next)
    }
    context.refs.rawParameters.current = next
    context.setRawParameters(next)
    const generation = context.refs.latestGeneration.current + 1
    context.refs.latestGeneration.current = generation
    const parsed = parseRawParameters(next, modelId)
    if (!parsed.valid) {
      context.clearProgress()
      const issue = {
        field: parsed.field ?? key,
        messageId: parsed.messageId,
        ...(parsed.params ? { params: parsed.params } : {}),
      }
      context.setFieldErrors({ [issue.field]: issue })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: context.refs.state.current.input,
        generation,
        error: errorForInput(issue),
      })
      queueModelGeneration(
        modelId,
        context.refs.state.current.input,
        generation,
        false,
      )
      return
    }

    context.setPersistedParameters(modelId, parsed.value)
    context.setFieldErrors({})
    context.dispatch({
      type: 'input-valid',
      modelId,
      input: parsed.value,
      generation,
    })
    queueModelGeneration(modelId, parsed.value, generation)
  }

  const handleParametersScopeChange = (
    parameters: ModelParameterValues,
  ): void => {
    const modelId = context.refs.state.current.modelId
    const generation = context.refs.latestGeneration.current + 1
    context.refs.latestGeneration.current = generation
    const validation = validateModelParameters(modelId, parameters)
    if (!validation.valid) {
      context.clearProgress()
      const firstIssue = validation.issues[0] ?? {
        field: 'parameters' as const,
        messageId: 'validation.invalid',
      }
      context.setFieldErrors({ [firstIssue.field]: firstIssue })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: context.refs.state.current.input,
        generation,
        error: errorForInput(firstIssue),
      })
      queueModelGeneration(
        modelId,
        context.refs.state.current.input,
        generation,
        false,
      )
      return
    }

    const nextParameters = validation.value.parameters
    context.refs.rawParameters.current = rawFromParameters(nextParameters)
    context.setRawParameters(context.refs.rawParameters.current)
    context.setPersistedParameters(modelId, nextParameters)
    context.setFieldErrors({})
    context.dispatch({
      type: 'input-valid',
      modelId,
      input: nextParameters,
      generation,
    })
    queueModelGeneration(modelId, nextParameters, generation)
  }

  const handleOpenGridParametersChange = (
    parameters: OpenGridParameters,
  ): void => {
    const generation = context.refs.latestGeneration.current + 1
    context.refs.latestGeneration.current = generation
    const modelId = context.refs.state.current.modelId
    const validation = validateOpenGridParameters(parameters)
    if (!validation.valid) {
      context.clearProgress()
      const firstIssue = validation.issues[0]
      context.setFieldErrors({
        [firstIssue?.field ?? 'parameters']: firstIssue ?? {
          field: 'parameters',
          messageId: 'validation.invalid',
        },
      })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: parameters,
        generation,
        error: errorForInput(
          firstIssue ?? {
            field: 'parameters',
            messageId: 'validation.invalid',
          },
        ),
      })
      queueModelGeneration(
        modelId,
        context.refs.state.current.input,
        generation,
        false,
      )
      return
    }

    const support = validateOpenGridGenerationSupport(validation.value)
    if (!support.valid) {
      context.clearProgress()
      const issue = support.issues[0] ?? {
        field: 'parameters' as const,
        messageId: 'validation.invalid',
      }
      context.setFieldErrors({ parameters: issue })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: validation.value,
        generation,
        error: normalizeError(new Error('OPENGRID_UNSUPPORTED_CONFIGURATION'), {
          stage: 'validation',
          code: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
          message: diagnostic('diagnostic.opengridUnsupported'),
          recoverable: true,
          generation,
        }),
      })
      queueModelGeneration(
        modelId,
        context.refs.state.current.input,
        generation,
        false,
      )
      return
    }

    context.setPersistedParameters(modelId, validation.value)
    context.setFieldErrors({})
    context.dispatch({
      type: 'input-valid',
      modelId,
      input: validation.value,
      generation,
    })
    queueModelGeneration(modelId, validation.value, generation)
  }

  const handleOpenGridDimensionCalculationInvalid = (): void => {
    const generation = context.refs.latestGeneration.current + 1
    context.refs.latestGeneration.current = generation
    if (context.refs.debounce.current) {
      clearTimeout(context.refs.debounce.current)
      context.refs.debounce.current = null
    }
    context.clearProgress()
    context.dispatch({
      type: 'input-invalid',
      modelId: 'opengrid',
      input: context.refs.state.current.input,
      generation,
      error: errorForInput({
        field: 'parameters',
        messageId: 'validation.invalid',
      }),
    })
    queueModelGeneration(
      'opengrid',
      context.refs.state.current.input,
      generation,
      false,
    )
  }

  return {
    sendGenerate,
    sendInvalidate,
    handleInputChange,
    handleParametersScopeChange,
    handleOpenGridParametersChange,
    handleOpenGridDimensionCalculationInvalid,
  }
}
