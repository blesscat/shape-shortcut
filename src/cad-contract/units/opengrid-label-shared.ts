/**
 * Shared constants binding `opengrid-label-card` and `opengrid-label-holder`
 * (and the v1 `opengrid-label-tag`) into one interchangeable label system:
 * a card of a given width tier fits the holder pocket of the same tier.
 */

export const OPENGRID_LABEL_WIDTH_TIERS = [20, 30, 40, 60] as const

export type OpenGridLabelWidthTier = (typeof OPENGRID_LABEL_WIDTH_TIERS)[number]

/** Card height along the hang direction (mm). */
export const OPENGRID_LABEL_CARD_HEIGHT = 10

/** Card thickness at the insertion faces — the portion the pocket walls grip (mm). */
export const OPENGRID_LABEL_CARD_INSERTION_THICKNESS = 0.6

/** Accent depth for flush (flat) styling (mm). */
export const OPENGRID_LABEL_ACCENT_DEPTH = 0.3

/** Raised-style accent protrusion beyond the outward face (mm). */
export const OPENGRID_LABEL_CARD_RAISED_HEIGHT = 0.4

/** Card visible-face proud height when seated in the holder pocket (mm). */
export const OPENGRID_LABEL_CARD_POCKET_PROUD = 0.15

export function isOpenGridLabelWidthTier(
  value: unknown,
): value is OpenGridLabelWidthTier {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    OPENGRID_LABEL_WIDTH_TIERS.includes(value as OpenGridLabelWidthTier)
  )
}
