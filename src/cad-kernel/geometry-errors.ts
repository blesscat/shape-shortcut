/**
 * OpenCascade exceptions surface through the WASM boundary as raw values
 * (typically numbers holding exception-object pointers), not Error instances.
 * Normalizing them keeps the engine failure diagnosable instead of being
 * silently rewrapped as an unrelated geometry failure.
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
