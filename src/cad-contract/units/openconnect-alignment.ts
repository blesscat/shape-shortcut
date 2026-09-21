export const OPENCONNECT_ALIGNMENT_KEYS = [
  'openConnectHorizontalAlignment',
  'openConnectVerticalAlignment',
] as const

export type OpenConnectAlignmentKey =
  (typeof OPENCONNECT_ALIGNMENT_KEYS)[number]
export type OpenConnectHorizontalAlignment = 'left' | 'center' | 'right'
export type OpenConnectVerticalAlignment = 'top' | 'center' | 'bottom'
export type OpenConnectAlignmentParameters = {
  openConnectHorizontalAlignment?: OpenConnectHorizontalAlignment
  openConnectVerticalAlignment?: OpenConnectVerticalAlignment
}
export const OPENCONNECT_ALIGNMENT_DEFAULTS = {
  openConnectHorizontalAlignment: 'center',
  openConnectVerticalAlignment: 'top',
} as const

export function isOpenConnectHorizontalAlignment(
  value: unknown,
): value is OpenConnectHorizontalAlignment {
  return value === 'left' || value === 'center' || value === 'right'
}

export function isOpenConnectVerticalAlignment(
  value: unknown,
): value is OpenConnectVerticalAlignment {
  return value === 'top' || value === 'center' || value === 'bottom'
}

export function openConnectAlignmentIssues(value: Record<string, unknown>) {
  const issues: Array<{ field: OpenConnectAlignmentKey; messageId: string }> =
    []
  if (
    value.openConnectHorizontalAlignment !== undefined &&
    !isOpenConnectHorizontalAlignment(value.openConnectHorizontalAlignment)
  ) {
    issues.push({
      field: 'openConnectHorizontalAlignment',
      messageId: 'validation.invalid',
    })
  }
  if (
    value.openConnectVerticalAlignment !== undefined &&
    !isOpenConnectVerticalAlignment(value.openConnectVerticalAlignment)
  ) {
    issues.push({
      field: 'openConnectVerticalAlignment',
      messageId: 'validation.invalid',
    })
  }
  return issues
}

export function normalizedOpenConnectAlignment(
  parameters: OpenConnectAlignmentParameters,
  defaults: Required<OpenConnectAlignmentParameters> = OPENCONNECT_ALIGNMENT_DEFAULTS,
) {
  return {
    openConnectHorizontalAlignment:
      parameters.openConnectHorizontalAlignment ??
      defaults.openConnectHorizontalAlignment,
    openConnectVerticalAlignment:
      parameters.openConnectVerticalAlignment ??
      defaults.openConnectVerticalAlignment,
  }
}

// Align whole pitch cells, preserving the authored slot's clearance inside each cell.
export function openConnectGridOffsets(
  width: number,
  height: number,
  columns: number,
  rows: number,
  pitch: number,
  parameters: OpenConnectAlignmentParameters,
): { x: number; z: number } {
  const alignment = normalizedOpenConnectAlignment(parameters)
  const spareX = Math.max(0, width - columns * pitch)
  const spareZ = Math.max(0, height - rows * pitch)
  let x = spareX / 2
  if (alignment.openConnectHorizontalAlignment === 'left') x = 0
  if (alignment.openConnectHorizontalAlignment === 'right') x = spareX
  let z = spareZ / 2
  if (alignment.openConnectVerticalAlignment === 'bottom') z = 0
  if (alignment.openConnectVerticalAlignment === 'top') z = spareZ
  return { x: -width / 2 + x, z }
}
