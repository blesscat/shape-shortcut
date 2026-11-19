import type { CardBoxParameters } from '../../../cad-contract/units'

/**
 * Plain geometry input for the reusable card-box part builders (mm).
 *
 * Components that reuse the card-box geometry (for example `game-box`)
 * compute their own parameter set and hand it over as geometry, so the
 * builders never depend on a `CardBoxParameters` snapshot.
 */
export type CardBoxGeometry = {
  /** Card width; the interior width adds the fixed 0.5 mm sheet allowance. */
  cardWidth: number
  /** Card height, which is also the interior height. */
  cardHeight: number
  /** Storage depth of the cavity. */
  storageDepth: number
}

/**
 * Geometry subset of a card-box parameter snapshot: the three fields the
 * box, lid and divider builders read. The remaining card-box parameters
 * (art, text, tab position) belong to the card-box front end only.
 */
export function cardBoxGeometryOf(
  parameters: CardBoxParameters,
): CardBoxGeometry {
  return {
    cardWidth: parameters.cardWidth,
    cardHeight: parameters.cardHeight,
    storageDepth: parameters.storageDepth,
  }
}
