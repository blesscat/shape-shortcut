import type { ExportReadyEvent } from '../../../cad-contract/messages'
import {
  isValidThreeMfPackage,
  threeMfExpectationForFileName,
  type ThreeMfPackageExpectation,
} from '../../../cad-contract/three-mf'
import {
  diagnostic,
  type DiagnosticDescriptor,
} from '../../../cad-contract/diagnostics'
import { PROTOTYPE_CONFIGURATION } from '../../../cad-contract/units'

export type ExportFormat = 'step' | 'stl' | '3mf'

export type FixedFileDownload = {
  url: string
  fileName: string
}

export function validateStepResponse(
  event: ExportReadyEvent,
  expectedRevision: string,
  expectedWorkerEpoch?: string,
  expectedFileName?: string,
): { valid: true } | { valid: false; message: DiagnosticDescriptor } {
  if (event.modelRevision !== expectedRevision)
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  if (expectedWorkerEpoch && event.workerEpoch !== expectedWorkerEpoch) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (
    event.format !== 'step' ||
    event.mime !== PROTOTYPE_CONFIGURATION.stepMime
  ) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (!event.fileName.endsWith(PROTOTYPE_CONFIGURATION.stepExtension)) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (expectedFileName && event.fileName !== expectedFileName) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (!(event.bytes instanceof ArrayBuffer) || event.bytes.byteLength === 0) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  return { valid: true }
}

export function triggerStepDownload(event: ExportReadyEvent): () => void {
  const blob = new Blob([event.bytes], { type: event.mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = event.fileName
  anchor.click()
  return () => URL.revokeObjectURL(url)
}

export function triggerFixedStepDownload(download: FixedFileDownload): void {
  const anchor = document.createElement('a')
  anchor.href = download.url
  anchor.download = download.fileName
  anchor.click()
}

export function validateStlResponse(
  event: ExportReadyEvent,
  expectedRevision: string,
  expectedWorkerEpoch?: string,
  expectedFileName?: string,
): { valid: true } | { valid: false; message: DiagnosticDescriptor } {
  if (event.modelRevision !== expectedRevision)
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  if (expectedWorkerEpoch && event.workerEpoch !== expectedWorkerEpoch) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (
    event.format !== 'stl' ||
    event.mime !== PROTOTYPE_CONFIGURATION.stlMime
  ) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (!event.fileName.endsWith(PROTOTYPE_CONFIGURATION.stlExtension)) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (expectedFileName && event.fileName !== expectedFileName) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (!(event.bytes instanceof ArrayBuffer) || event.bytes.byteLength === 0) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }

  const structuralValidation = validateBinaryStl(event.bytes)
  if (!structuralValidation.valid) return structuralValidation
  return { valid: true }
}

function validateBinaryStl(
  bytes: ArrayBuffer,
): { valid: true } | { valid: false; message: DiagnosticDescriptor } {
  const headerBytes = 80
  const countBytes = 4
  const facetBytes = 50
  const minimumBytes = headerBytes + countBytes
  if (bytes.byteLength < minimumBytes) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }

  const triangleCount = new DataView(bytes).getUint32(headerBytes, true)
  if (triangleCount === 0) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  const expectedByteLength = minimumBytes + triangleCount * facetBytes
  if (expectedByteLength !== bytes.byteLength) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  return { valid: true }
}

export function triggerStlDownload(event: ExportReadyEvent): () => void {
  const blob = new Blob([event.bytes], { type: event.mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = event.fileName
  anchor.click()
  return () => URL.revokeObjectURL(url)
}

export function validateThreeMfResponse(
  event: ExportReadyEvent,
  expectedRevision: string,
  expectedWorkerEpoch?: string,
  expectedFileName?: string,
): { valid: true } | { valid: false; message: DiagnosticDescriptor } {
  if (event.modelRevision !== expectedRevision)
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  if (expectedWorkerEpoch && event.workerEpoch !== expectedWorkerEpoch) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (
    event.format !== '3mf' ||
    event.mime !== PROTOTYPE_CONFIGURATION.threeMfMime
  ) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (!event.fileName.endsWith(PROTOTYPE_CONFIGURATION.threeMfExtension)) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (expectedFileName && event.fileName !== expectedFileName) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  if (!(event.bytes instanceof ArrayBuffer) || event.bytes.byteLength === 0) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }

  if (!validateThreeMfPackage(event.bytes, expectedFileName)) {
    return { valid: false, message: diagnostic('diagnostic.exportInvalid') }
  }
  return { valid: true }
}

export function validateThreeMfPackage(
  bytes: ArrayBuffer,
  expectedFileName?: string,
): boolean {
  return isValidThreeMfPackage(
    bytes,
    expectedFileName
      ? threeMfExpectationForFileName(expectedFileName)
      : undefined,
  )
}

export function triggerThreeMfDownload(event: ExportReadyEvent): () => void {
  const blob = new Blob([event.bytes], { type: event.mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = event.fileName
  anchor.click()
  return () => URL.revokeObjectURL(url)
}
