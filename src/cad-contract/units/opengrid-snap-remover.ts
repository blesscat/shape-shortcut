import type { FieldDiagnostic } from '../diagnostics'
import { PROTOTYPE_CONFIGURATION } from './prototype-configuration'

export type OpenGridSnapRemoverParameters = Record<never, never>

type ModelBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

type ValidationIssue = FieldDiagnostic

export type OpenGridSnapRemoverValidation =
  | { valid: true; value: OpenGridSnapRemoverParameters }
  | { valid: false; issues: ValidationIssue[] }

function isPlainEmptyObject(
  value: unknown,
): value is OpenGridSnapRemoverParameters {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return false
  return Object.keys(value).length === 0
}

export function validateOpenGridSnapRemoverParameters(
  value: unknown,
): OpenGridSnapRemoverValidation {
  if (!isPlainEmptyObject(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  return { valid: true, value }
}

export function isOpenGridSnapRemoverParameters(
  value: unknown,
): value is OpenGridSnapRemoverParameters {
  return validateOpenGridSnapRemoverParameters(value).valid
}

export function openGridSnapRemoverFileName(
  parameters: OpenGridSnapRemoverParameters,
): string {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return `snap remover${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function openGridSnapRemoverStlFileName(
  parameters: OpenGridSnapRemoverParameters,
): string {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return `snap remover${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function boundsForOpenGridSnapRemover(
  parameters: OpenGridSnapRemoverParameters,
): ModelBounds {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }

  return {
    min: [-17.202743248030416, -20.00551582963562, -5.005506125135993],
    max: [21.276570355137718, 20.00551582963562, 5.005506125135993],
  }
}
