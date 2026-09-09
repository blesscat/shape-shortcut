/**
 * OpenCascade exceptions cross the WASM boundary as raw values (often a
 * number containing an exception-object pointer), not Error instances.
 * Normalize them before a higher-level quality or build gate wraps them.
 */
export function toGeometryError(thrown: unknown): Error {
  if (thrown instanceof Error) return thrown
  return new Error(`OCCT_EXCEPTION:${describeThrown(thrown)}`)
}

function describeThrown(thrown: unknown): string {
  if (typeof thrown === 'string') return thrown
  if (typeof thrown === 'number' || typeof thrown === 'boolean') {
    return String(thrown)
  }
  if (typeof thrown === 'bigint') return String(thrown)
  if (thrown === undefined) return 'undefined'
  if (thrown === null) return 'null'
  try {
    return JSON.stringify(thrown) ?? String(thrown)
  } catch {
    return String(thrown)
  }
}
