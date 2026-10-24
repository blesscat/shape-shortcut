import type { CardBoxSvgOutlineData } from '../../../cad-contract/units/card-box'

export const CARD_BOX_SVG_STORAGE_KEY = 'shape-shortcut:card-box-cover-svg:v1'

/** Serialized payloads above this size stay session-only. */
const MAX_PERSISTED_LENGTH = 256 * 1024

export type CardBoxSvgStored = {
  fingerprint: string
  outlines: CardBoxSvgOutlineData
}

export type CardBoxSvgStorage = {
  /** Persisted record if valid, else the session-only copy, else null. */
  load(): CardBoxSvgStored | null
  /** Persists the (single) record; oversized payloads stay session-only. */
  save(record: CardBoxSvgStored): 'saved' | 'session-only'
  /** Removes both the persisted record and any session-only copy. */
  clear(): void
}

/** Shape-validates a parsed localStorage payload. */
function isValidStored(value: unknown): value is CardBoxSvgStored {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate['fingerprint'] !== 'string') return false
  const outlines = candidate['outlines']
  if (typeof outlines !== 'object' || outlines === null) return false
  const outlineRecord = outlines as Record<string, unknown>
  return (
    typeof outlineRecord['fingerprint'] === 'string' &&
    typeof outlineRecord['width'] === 'number' &&
    typeof outlineRecord['height'] === 'number' &&
    Array.isArray(outlineRecord['groups'])
  )
}

function readPersisted(storage: Storage | null): CardBoxSvgStored | null {
  if (storage === null) return null
  let raw: string | null
  try {
    raw = storage.getItem(CARD_BOX_SVG_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isValidStored(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function defaultStorageBackend(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/**
 * Card-box cover SVG import persistence. Holds exactly one record; a new
 * save replaces the old one. Payloads over 256 KB never touch localStorage
 * (quota-friendly): they live in an in-memory session-only copy that
 * `load` falls back to until `clear` or the session ends. The session-only
 * copy is module-level so any instance (panel, generate-command lookup)
 * observes it within the same session.
 */
const moduleSession: { record: CardBoxSvgStored | null } = { record: null }

export function createCardBoxSvgStorage(storage?: Storage): CardBoxSvgStorage {
  const backend: Storage | null = storage ?? defaultStorageBackend()

  return {
    load(): CardBoxSvgStored | null {
      const persisted = readPersisted(backend)
      if (persisted !== null) return persisted
      return moduleSession.record
    },

    save(record: CardBoxSvgStored): 'saved' | 'session-only' {
      const serialized = JSON.stringify({ version: 1, ...record })
      if (serialized.length > MAX_PERSISTED_LENGTH) {
        moduleSession.record = record
        if (backend !== null) {
          try {
            // A stale persisted record must not shadow the session record:
            // the new import replaces the old one, whichever tier it lands in.
            backend.removeItem(CARD_BOX_SVG_STORAGE_KEY)
          } catch {
            // Load falls back to the session copy either way.
          }
        }
        return 'session-only'
      }
      let persisted = false
      if (backend !== null) {
        try {
          backend.setItem(CARD_BOX_SVG_STORAGE_KEY, serialized)
          persisted = true
        } catch {
          persisted = false
        }
      }
      moduleSession.record = null
      if (persisted) {
        return 'saved'
      }
      // Write rejected: keep the record for this session.
      moduleSession.record = record
      return 'session-only'
    },

    clear(): void {
      moduleSession.record = null
      if (backend === null) return
      try {
        backend.removeItem(CARD_BOX_SVG_STORAGE_KEY)
      } catch {
        // Nothing to clear if storage access fails.
      }
    },
  }
}

/**
 * Request-time lookup for the card-box generate command: returns the stored
 * outlines only when the fingerprint still matches the current parameter,
 * so missing, corrupt, or replaced data falls back to the text-only layout.
 */
export function loadCardBoxCoverSvgForRequest(
  fingerprint: string,
): CardBoxSvgOutlineData | undefined {
  if (fingerprint === '') return undefined
  const record = createCardBoxSvgStorage().load()
  if (record === null || record.fingerprint !== fingerprint) return undefined
  return record.outlines
}

/** Test isolation: clears the module-level session-only copy. */
export function resetCardBoxSvgSessionForTests(): void {
  moduleSession.record = null
}
