import { cardBoxInteriorWidth } from '../../../../cad-contract/units'

/** Stands for a measure that is not a number yet. */
export const UNKNOWN_MEASURE = '—'

/** The bounds of the assembled product. */
export type GameBoxProductBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

/**
 * A length in millimetres, rounded to at most two decimals so the
 * floating-point noise of a computed measurement never reaches the panel.
 * Trailing zeros are dropped: 70.50 reads 70.5 and 63.00 reads 63.
 */
function formatLength(value: number): string {
  return Number(value.toFixed(2)).toString()
}

/**
 * A length in millimetres; a value that is not a number shows a dash
 * instead of a broken measurement.
 */
export function formatMillimetres(value: number): string {
  if (!Number.isFinite(value)) return UNKNOWN_MEASURE
  return `${formatLength(value)} mm`
}

/** The three axes of a size in millimetres. */
export function formatSize(
  width: number,
  depth: number,
  height: number,
): string {
  if (!Number.isFinite(width)) return UNKNOWN_MEASURE
  if (!Number.isFinite(depth)) return UNKNOWN_MEASURE
  if (!Number.isFinite(height)) return UNKNOWN_MEASURE
  return `${formatLength(width)} × ${formatLength(depth)} × ${formatLength(height)} mm`
}

/**
 * The read-only sizes of the panel.
 *
 * The interior size describes the cavity the cards and the dice occupy, the
 * outer size the whole product: the box body with the sliding lid on top,
 * measured in the assembled frame.
 */
export function gameBoxDerivedSizes(input: {
  cardWidth: number
  cardHeight: number
  storageDepth: number
  productBounds: GameBoxProductBounds
}): { interior: string; outer: string; storageDepth: string } {
  const { cardWidth, cardHeight, storageDepth, productBounds } = input
  return {
    interior: formatSize(
      cardBoxInteriorWidth(cardWidth),
      storageDepth,
      cardHeight,
    ),
    outer: formatSize(
      productBounds.max[0] - productBounds.min[0],
      productBounds.max[1] - productBounds.min[1],
      productBounds.max[2] - productBounds.min[2],
    ),
    storageDepth: formatMillimetres(storageDepth),
  }
}
