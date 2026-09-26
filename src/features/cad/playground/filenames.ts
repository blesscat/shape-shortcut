import type { ModelParameterValues } from '../../../cad-contract/units'

const MAX_LABEL_LENGTH = 60

/**
 * Normalizes a user-provided instance label into a file-name-safe segment.
 * Unicode letters and numbers are kept; separators and unsafe characters
 * collapse to hyphens.
 */
export function sanitizeSceneLabel(label: string): string {
  const cleaned = label
    .replace(/[\\/:*?"<>|\x00-\x1f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/\s/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '')
  return cleaned.slice(0, MAX_LABEL_LENGTH).replace(/-$/u, '')
}

/**
 * Appends a distinguishing suffix to a component file name so multiple
 * instances in one scene never collide: the sanitized label when present,
 * otherwise the 1-based instance index.
 */
export function sceneInstanceFileName(
  baseFileName: string,
  options: { label: string | null; index: number },
): string {
  const dot = baseFileName.lastIndexOf('.')
  const stem = dot > 0 ? baseFileName.slice(0, dot) : baseFileName
  const extension = dot > 0 ? baseFileName.slice(dot) : ''
  const suffix = options.label
    ? sanitizeSceneLabel(options.label)
    : String(options.index)
  const safeSuffix = suffix.length > 0 ? suffix : String(options.index)
  return `${stem}-${safeSuffix}${extension}`
}

/**
 * Stable cache key for a (modelId, parameters) pair so identical instances
 * share one proxy geometry. Object keys are sorted recursively.
 */
export function sceneProxyCacheKey(
  modelId: string,
  parameters: ModelParameterValues,
): string {
  return `${modelId}:${stableStringify(parameters)}`
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}
