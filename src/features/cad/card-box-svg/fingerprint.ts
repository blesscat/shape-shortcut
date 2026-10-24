/**
 * Stable content fingerprint for imported card-box cover SVG sources.
 *
 * FNV-1a over 64 bits (BigInt), rendered as 16 lowercase hex characters.
 * Synchronous by design: the fingerprint is needed during parameter
 * validation, so `crypto.subtle` (async-only) is not usable here.
 */
export function fingerprintCardBoxSvg(source: string): string {
  const prime = 0x100000001b3n
  let hash = 0xcbf29ce484222325n
  for (let index = 0; index < source.length; index += 1) {
    hash ^= BigInt(source.charCodeAt(index))
    hash = (hash * prime) & 0xffffffffffffffffn
  }
  return hash.toString(16).padStart(16, '0')
}
