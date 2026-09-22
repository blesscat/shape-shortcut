import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type ModelId,
  type ModelParameterValues,
} from '../../src/cad-contract/units'
import { exportThreeMfCommand } from '../../src/workers/cad-worker-export'

const shape = {
  mesh: () => ({
    vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    triangles: [0, 1, 2],
  }),
} as unknown as Shape3D

function exportCommand(input: {
  modelId: ModelId
  parameters: ModelParameterValues
  fileName: string
  withParts?: boolean
}) {
  return {
    version: 1,
    kind: 'export.3mf',
    requestId: 'request-1',
    operationId: 'operation-1',
    modelRevision: 'revision-1',
    workerEpoch: 'epoch-1',
    file: { name: input.fileName, mime: 'model/3mf' as const },
    generate: {
      modelId: input.modelId,
      parameters: input.parameters,
    },
  } as never
}

function exportContext() {
  const emitted: { kind: string; fileName?: string; format?: string }[] = []
  const revision: {
    modelId: ModelId
    parameters: ModelParameterValues
    shape: Shape3D
    parts?: { name: string; shape: Shape3D }[]
  } = {
    modelId: 'opengrid-divider',
    parameters: {},
    shape,
    parts: undefined,
  }
  const context = {
    epoch: 'epoch-1',
    lifecycle: {
      pin: vi.fn(() => revision),
      unpin: vi.fn(),
    },
    emit: vi.fn((event: { kind: string }) => {
      emitted.push({
        kind: event.kind,
        fileName: (event as { fileName?: string }).fileName,
        format: (event as { format?: string }).format,
      })
    }),
  }
  return { emitted, revision, context }
}

describe('worker 3MF export whitelist for container rim models', () => {
  it('exports a divider with rim enabled when parts and filename match', async () => {
    const parameters = {
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      topRimEnabled: true,
      topRimHeight: 3,
    }
    const { emitted, revision, context } = exportContext()
    revision.modelId = 'opengrid-divider'
    revision.parameters = parameters
    revision.parts = [
      { name: 'body', shape },
      { name: 'rim', shape },
    ]
    await exportThreeMfCommand(
      {
        version: 2,
        kind: 'export.3mf',
        requestId: 'request-1',
        operationId: 'operation-1',
        modelRevision: 'revision-1',
        workerEpoch: 'epoch-1',
        file: {
          name: 'opengrid-divider-l1.5-r1.5-u0-d0-t2-h20-afree-c0.15-psnap-i0-rim3.3mf',
          mime: 'model/3mf',
        },
      },
      context as never,
    )
    expect(emitted.at(-1)).toMatchObject({
      kind: 'export.ready',
      format: '3mf',
      fileName:
        'opengrid-divider-l1.5-r1.5-u0-d0-t2-h20-afree-c0.15-psnap-i0-rim3.3mf',
    })
  })

  it('rejects a divider without the rim enabled', async () => {
    const parameters = {
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      topRimEnabled: false,
    }
    const { revision, context } = exportContext()
    revision.modelId = 'opengrid-divider'
    revision.parameters = parameters
    await expect(
      exportThreeMfCommand(
        {
          version: 2,
          kind: 'export.3mf',
          requestId: 'request-1',
          operationId: 'operation-1',
          modelRevision: 'revision-1',
          workerEpoch: 'epoch-1',
          file: { name: 'anything.3mf', mime: 'model/3mf' },
        },
        context as never,
      ),
    ).rejects.toThrow('THREEMF_METADATA_INVALID')
  })

  it('rejects a filename that does not match the rim fingerprint', async () => {
    const parameters = {
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      topRimEnabled: true,
      topRimHeight: 3,
    }
    const { revision, context } = exportContext()
    revision.modelId = 'opengrid-divider'
    revision.parameters = parameters
    revision.parts = [
      { name: 'body', shape },
      { name: 'rim', shape },
    ]
    await expect(
      exportThreeMfCommand(
        {
          version: 2,
          kind: 'export.3mf',
          requestId: 'request-1',
          operationId: 'operation-1',
          modelRevision: 'revision-1',
          workerEpoch: 'epoch-1',
          file: { name: 'wrong-name.3mf', mime: 'model/3mf' },
        },
        context as never,
      ),
    ).rejects.toThrow('THREEMF_METADATA_INVALID')
  })

  it('rejects a rim revision without body and rim parts', async () => {
    const parameters = {
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      topRimEnabled: true,
      topRimHeight: 3,
    }
    const { revision, context } = exportContext()
    revision.modelId = 'opengrid-divider'
    revision.parameters = parameters
    revision.parts = undefined
    await expect(
      exportThreeMfCommand(
        {
          version: 2,
          kind: 'export.3mf',
          requestId: 'request-1',
          operationId: 'operation-1',
          modelRevision: 'revision-1',
          workerEpoch: 'epoch-1',
          file: {
            name: 'opengrid-divider-l1.5-r1.5-u0-d0-t2-h20-afree-c0.15-psnap-i0-rim3.3mf',
            mime: 'model/3mf',
          },
        },
        context as never,
      ),
    ).rejects.toThrow('THREEMF_PARTS_INVALID')
  })

  it('rejects a container without rim parts for the organizer box', async () => {
    const { revision, context } = exportContext()
    revision.modelId = 'opengrid-organizer-box'
    revision.parameters = {
      ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
      topRimEnabled: true,
      topRimHeight: 2,
    }
    await expect(
      exportThreeMfCommand(
        {
          version: 2,
          kind: 'export.3mf',
          requestId: 'request-1',
          operationId: 'operation-1',
          modelRevision: 'revision-1',
          workerEpoch: 'epoch-1',
          file: {
            name: 'opengrid-organizer-box-2x2-circle-sm-linked-d20-sx2-sy2-h20-wt2-b1-seats-detachable-corner-seat-body-normal-rim2.3mf',
            mime: 'model/3mf',
          },
        },
        context as never,
      ),
    ).rejects.toThrow('THREEMF_PARTS_INVALID')
  })

  it.each([
    [
      'opengrid-stackable-box',
      {
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        topRimEnabled: true,
        topRimHeight: 3,
      },
      'opengrid-stackable-box-2x2-h20-seats-detachable-corner-seat-rim3.3mf',
    ],
    [
      'opengrid-organizer-box',
      {
        ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
        topRimEnabled: true,
        topRimHeight: 2,
      },
      'opengrid-organizer-box-2x2-circle-sm-linked-d20-sx2-sy2-h20-wt2-b1-seats-detachable-corner-seat-body-normal-rim2.3mf',
    ],
    [
      'opengrid-openconnect-organizer',
      {
        ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
        topRimEnabled: true,
        topRimHeight: 2,
      },
      'opengrid-openconnect-organizer-x2-y2-sm-linked-sx1-sy1-circle-d20-h28-b1-e1-a15-rim2.3mf',
    ],
  ] as const)(
    'exports a two-color 3MF for %s with the rim enabled',
    async (modelId, parameters, fileName) => {
      const { emitted, revision, context } = exportContext()
      revision.modelId = modelId
      revision.parameters = parameters
      revision.parts = [
        { name: 'body', shape },
        { name: 'rim', shape },
      ]
      await exportThreeMfCommand(
        {
          version: 2,
          kind: 'export.3mf',
          requestId: 'request-1',
          operationId: 'operation-1',
          modelRevision: 'revision-1',
          workerEpoch: 'epoch-1',
          file: { name: fileName, mime: 'model/3mf' },
        },
        context as never,
      )
      expect(emitted.at(-1)).toMatchObject({
        kind: 'export.ready',
        format: '3mf',
        fileName,
      })
    },
  )
})
