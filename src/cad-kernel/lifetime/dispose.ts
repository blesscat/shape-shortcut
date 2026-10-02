/**
 * Deletes a native shape without letting a delete failure mask the error
 * that triggered cleanup.
 */
export function deleteShape(
  shape: { delete?: () => void } | null | undefined,
): void {
  try {
    shape?.delete?.()
  } catch {
    // A failed native delete must not prevent the rest of the cleanup.
  }
}
