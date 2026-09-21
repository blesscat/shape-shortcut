import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkerEvent } from '../../src/cad-contract/messages'
import {
  modelFileName,
  modelStlFileName,
  openGridLabelCardThreeMfFileName,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  type ModelId,
  type ModelParameterValues,
} from '../../src/cad-contract/units'
import { threeMfExpectationFor } from '../../src/cad-kernel/export'
import type { RevisionRecord } from '../../src/cad-kernel/lifetime'
import type { EventSink } from '../../src/workers/cad-worker-types'

const mocks = vi.hoisted(() => ({
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
  exportThreeMfBytes: vi.fn(),
  isThreeMfPackage: vi.fn(),
}))

vi.mock('../../src/cad-kernel/export', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/cad-kernel/export')>()),
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
  exportThreeMfBytes: mocks.exportThreeMfBytes,
  isThreeMfPackage: mocks.isThreeMfPackage,
}))

import {
  exportStepCommand,
  exportStlCommand,
  exportThreeMfCommand,
} from '../../src/workers/cad-worker-export'

const parameters = { width: 20, depth: 30, height: 40 }
const model = { modelId: 'box' as const, parameters }

function revision(
  modelId: ModelId = 'box',
  revisionParameters: ModelParameterValues = parameters,
): RevisionRecord {
  return {
    modelRevision: 'revision-1',
    operationId: 'operation-1',
    generation: 1,
    workerEpoch: 'epoch-1',
    modelId,
    parameters: revisionParameters,
    shape: {} as RevisionRecord['shape'],
    mesh: {} as RevisionRecord['mesh'],
    previewTiming: {} as RevisionRecord['previewTiming'],
    exportPins: 0,
  }
}

describe('CAD Worker export seam', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('pins a revision and emits a valid STEP export', async () => {
    const currentRevision = revision()
    const lifecycle = {
      pin: vi.fn(() => currentRevision),
      unpin: vi.fn(),
    }
    const events: WorkerEvent[] = []
    const transfers: Transferable[][] = []
    const emit: EventSink = (event, transfer) => {
      events.push(event)
      if (transfer) transfers.push(transfer)
    }
    const bytes = new Uint8Array([1, 2, 3]).buffer
    mocks.exportStepBytes.mockResolvedValue(bytes)

    await exportStepCommand(
      {
        version: 2,
        kind: 'export.step',
        requestId: 'step-request',
        operationId: 'step-operation',
        modelRevision: currentRevision.modelRevision,
        workerEpoch: 'epoch-1',
        file: { name: modelFileName(model), mime: 'model/step' },
      },
      { epoch: 'epoch-1', lifecycle, emit },
    )

    expect(lifecycle.pin).toHaveBeenCalledWith(currentRevision.modelRevision)
    expect(lifecycle.unpin).toHaveBeenCalledWith(currentRevision.modelRevision)
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'export.accepted' }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        format: 'step',
        bytes,
        fileName: modelFileName(model),
      }),
    )
    expect(transfers).toContainEqual([bytes])
  })

  it('pins a revision and emits a valid STL export', async () => {
    const currentRevision = revision()
    const lifecycle = {
      pin: vi.fn(() => currentRevision),
      unpin: vi.fn(),
    }
    const events: WorkerEvent[] = []
    const emit: EventSink = (event) => events.push(event)
    const bytes = new Uint8Array([4, 5, 6]).buffer
    mocks.exportStlBytes.mockResolvedValue(bytes)

    await exportStlCommand(
      {
        version: 2,
        kind: 'export.stl',
        requestId: 'stl-request',
        operationId: 'stl-operation',
        modelRevision: currentRevision.modelRevision,
        workerEpoch: 'epoch-1',
        file: { name: modelStlFileName(model), mime: 'model/stl' },
      },
      { epoch: 'epoch-1', lifecycle, emit },
    )

    expect(lifecycle.pin).toHaveBeenCalledWith(currentRevision.modelRevision)
    expect(lifecycle.unpin).toHaveBeenCalledWith(currentRevision.modelRevision)
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        format: 'stl',
        bytes,
        fileName: modelStlFileName(model),
      }),
    )
  })

  it('preserves the complete OpenConnect organizer identity in STEP and STL exports', async () => {
    const organizerParameters = {
      ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
      holeCountX: 3,
      holeCountY: 4,
      holeSpacingMode: 'independent' as const,
      holeSpacingX: 2.25,
      holeSpacingY: 3.5,
      holeShape: 'pentagon' as const,
      holeDiameter: 18.75,
      holeDepth: 30,
      bottomThickness: 3.25,
      edgeThickness: 4.25,
      tiltAngle: 22,
    }
    const organizerModel = {
      modelId: 'opengrid-openconnect-organizer' as const,
      parameters: organizerParameters,
    }
    const currentRevision = revision(
      organizerModel.modelId,
      organizerParameters,
    )
    const lifecycle = {
      pin: vi.fn(() => currentRevision),
      unpin: vi.fn(),
    }
    const events: WorkerEvent[] = []
    const emit: EventSink = (event) => events.push(event)
    mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1]).buffer)
    mocks.exportStlBytes.mockResolvedValue(new Uint8Array([2]).buffer)

    await exportStepCommand(
      {
        version: 2,
        kind: 'export.step',
        requestId: 'organizer-step-request',
        operationId: 'organizer-step-operation',
        modelRevision: currentRevision.modelRevision,
        workerEpoch: 'epoch-1',
        file: { name: modelFileName(organizerModel), mime: 'model/step' },
      },
      { epoch: 'epoch-1', lifecycle, emit },
    )
    await exportStlCommand(
      {
        version: 2,
        kind: 'export.stl',
        requestId: 'organizer-stl-request',
        operationId: 'organizer-stl-operation',
        modelRevision: currentRevision.modelRevision,
        workerEpoch: 'epoch-1',
        file: { name: modelStlFileName(organizerModel), mime: 'model/stl' },
      },
      { epoch: 'epoch-1', lifecycle, emit },
    )

    const readyEvents = events.filter((event) => event.kind === 'export.ready')
    expect(readyEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          format: 'step',
          fileName: modelFileName(organizerModel),
        }),
        expect.objectContaining({
          format: 'stl',
          fileName: modelStlFileName(organizerModel),
        }),
      ]),
    )
    expect(modelFileName(organizerModel)).toMatch(
      /^opengrid-openconnect-organizer-.*\.step$/,
    )
    expect(modelStlFileName(organizerModel)).toMatch(
      /^opengrid-openconnect-organizer-.*\.stl$/,
    )
    expect(lifecycle.unpin).toHaveBeenCalledTimes(2)
  })

  it('exports a committed label-tag revision as a body/icon 3MF package', async () => {
    const labelTagParameters = {
      widthTier: 40,
      gripThickness: 1.2,
      icon: 'gear-fill',
    } as const
    const labelTagModel = {
      modelId: 'opengrid-label-tag' as const,
      parameters: labelTagParameters,
    }
    const fileName = openGridLabelTagThreeMfFileName(labelTagParameters)
    const bodyShape = { delete: vi.fn() }
    const iconShape = { delete: vi.fn() }
    const currentRevision = revision(labelTagModel.modelId, labelTagParameters)
    ;(currentRevision as { parts?: unknown }).parts = [
      { name: 'body', shape: bodyShape },
      { name: 'icon', shape: iconShape },
    ]
    const lifecycle = {
      pin: vi.fn(() => currentRevision),
      unpin: vi.fn(),
    }
    const events: WorkerEvent[] = []
    const emit: EventSink = (event) => events.push(event)
    const bytes = new Uint8Array([7, 8, 9]).buffer
    mocks.exportThreeMfBytes.mockResolvedValue(bytes)
    mocks.isThreeMfPackage.mockReturnValue(true)

    await exportThreeMfCommand(
      {
        version: 2,
        kind: 'export.3mf',
        requestId: 'label-tag-3mf-request',
        operationId: 'label-tag-3mf-operation',
        modelRevision: currentRevision.modelRevision,
        workerEpoch: 'epoch-1',
        file: { name: fileName, mime: 'model/3mf' },
      },
      { epoch: 'epoch-1', lifecycle, emit },
    )

    expect(mocks.exportThreeMfBytes).toHaveBeenCalledOnce()
    const [parts, , meta] = mocks.exportThreeMfBytes.mock.calls[0]!
    expect(parts).toEqual([
      { name: 'body', shape: bodyShape },
      { name: 'icon', shape: iconShape },
    ])
    expect(meta).toMatchObject({
      modelSettingsName: 'opengrid-label-tag',
      sourceFileName: fileName,
      accentPartName: 'icon',
    })
    expect(mocks.isThreeMfPackage).toHaveBeenCalledWith(
      bytes,
      threeMfExpectationFor(meta),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        format: '3mf',
        bytes,
        fileName,
      }),
    )
  it('preserves cylinder body/rim metadata and rejects rim-disabled exports', async () => {
    const input = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      topRimEnabled: true,
    }
    const current = revision('opengrid-stackable-cylinder', input)
    const body = { delete: vi.fn() }
    const rim = { delete: vi.fn() }
    ;(current as { parts?: unknown }).parts = [
      { name: 'body', shape: body },
      { name: 'rim', shape: rim },
    ]
    const lifecycle = { pin: vi.fn(() => current), unpin: vi.fn() }
    const events: WorkerEvent[] = []
    const bytes = new Uint8Array([1, 2, 3]).buffer
    mocks.exportThreeMfBytes.mockResolvedValue(bytes)
    mocks.isThreeMfPackage.mockReturnValue(true)
    const command = {
      version: 2 as const,
      kind: 'export.3mf' as const,
      requestId: 'cylinder-export',
      operationId: 'cylinder-export',
      modelRevision: current.modelRevision,
      workerEpoch: 'epoch-1',
      file: {
        name: openGridStackableCylinderThreeMfFileName(input),
        mime: 'model/3mf' as const,
      },
    }
    const context = {
      epoch: 'epoch-1',
      lifecycle,
      emit: (event: WorkerEvent) => {
        events.push(event)
      },
    }
    await exportThreeMfCommand(command, context)
    expect(mocks.exportThreeMfBytes.mock.calls[0]![2]).toMatchObject({
      modelSettingsName: 'opengrid-stackable-cylinder',
      sourceFileName: command.file.name,
      accentPartName: 'rim',
    })
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        fileName: command.file.name,
      }),
    )
    current.parameters = { ...input, topRimEnabled: false }
    await expect(exportThreeMfCommand(command, context)).rejects.toThrow(
      'THREEMF_METADATA_INVALID',
    )
    expect(mocks.exportThreeMfBytes).toHaveBeenCalledOnce()
    expect(lifecycle.unpin).toHaveBeenCalledTimes(2)  })

  it('exports a committed label-card revision as a body/accent 3MF package', async () => {
    const labelCardParameters = {
      widthTier: 40,
      style: 'raised',
      iconPosition: 'left',
      icon: 'gear-fill',
    } as const
    const fileName = openGridLabelCardThreeMfFileName(labelCardParameters)
    const bodyShape = { delete: vi.fn() }
    const accentShape = { delete: vi.fn() }
    const currentRevision = revision('opengrid-label-card', labelCardParameters)
    ;(currentRevision as { parts?: unknown }).parts = [
      { name: 'body', shape: bodyShape },
      { name: 'accent', shape: accentShape },
    ]
    const lifecycle = {
      pin: vi.fn(() => currentRevision),
      unpin: vi.fn(),
    }
    const events: WorkerEvent[] = []
    const emit: EventSink = (event) => events.push(event)
    const bytes = new Uint8Array([9, 9, 9]).buffer
    mocks.exportThreeMfBytes.mockResolvedValue(bytes)
    mocks.isThreeMfPackage.mockReturnValue(true)

    await exportThreeMfCommand(
      {
        version: 2,
        kind: 'export.3mf',
        requestId: 'label-card-3mf-request',
        operationId: 'label-card-3mf-operation',
        modelRevision: currentRevision.modelRevision,
        workerEpoch: 'epoch-1',
        file: { name: fileName, mime: 'model/3mf' },
      },
      { epoch: 'epoch-1', lifecycle, emit },
    )

    const [parts, , meta] = mocks.exportThreeMfBytes.mock.calls[0]!
    expect(parts).toEqual([
      { name: 'body', shape: bodyShape },
      { name: 'accent', shape: accentShape },
    ])
    expect(meta).toMatchObject({
      modelSettingsName: 'opengrid-label-card',
      sourceFileName: fileName,
      accentPartName: 'accent',
    })
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        format: '3mf',
        bytes,
        fileName,
      }),
    )
  })

  it('rejects a label-card 3MF request with a mismatched filename or parts', async () => {
    const labelCardParameters = {
      widthTier: 40,
      style: 'raised',
      iconPosition: 'left',
      icon: 'gear-fill',
    } as const
    const currentRevision = revision('opengrid-label-card', labelCardParameters)
    ;(currentRevision as { parts?: unknown }).parts = [
      { name: 'body', shape: { delete: vi.fn() } },
      { name: 'text', shape: { delete: vi.fn() } },
    ]
    const lifecycle = {
      pin: vi.fn(() => currentRevision),
      unpin: vi.fn(),
    }
    const events: WorkerEvent[] = []
    const emit: EventSink = (event) => events.push(event)

    await expect(
      exportThreeMfCommand(
        {
          version: 2,
          kind: 'export.3mf',
          requestId: 'label-card-wrong-file-request',
          operationId: 'label-card-wrong-file-operation',
          modelRevision: currentRevision.modelRevision,
          workerEpoch: 'epoch-1',
          file: { name: 'opengrid-wall-cover.3mf', mime: 'model/3mf' },
        },
        { epoch: 'epoch-1', lifecycle, emit },
      ),
    ).rejects.toThrow('THREEMF_METADATA_INVALID')

    await expect(
      exportThreeMfCommand(
        {
          version: 2,
          kind: 'export.3mf',
          requestId: 'label-card-wrong-parts-request',
          operationId: 'label-card-wrong-parts-operation',
          modelRevision: currentRevision.modelRevision,
          workerEpoch: 'epoch-1',
          file: {
            name: openGridLabelCardThreeMfFileName(labelCardParameters),
            mime: 'model/3mf',
          },
        },
        { epoch: 'epoch-1', lifecycle, emit },
      ),
    ).rejects.toThrow('THREEMF_PARTS_INVALID')

    expect(mocks.exportThreeMfBytes).not.toHaveBeenCalled()
  })
})
