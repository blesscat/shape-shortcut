/** Dimensions shared by label cards and integrated slots. */

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

/** Label units are independent of the 28 mm OpenGrid mounting pitch. */
export const OPENGRID_LABEL_GRID = {
  pitch: 10,
  minUnits: 1,
  maxUnits: 10,
  artworkSideInset: 1,
  textFontSize: 7,
  textSpacing: 8,
  iconSize: 6,
  iconTextGap: 2,
} as const

export function isOpenGridLabelGridUnits(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= OPENGRID_LABEL_GRID.minUnits &&
    value <= OPENGRID_LABEL_GRID.maxUnits
  )
}

export function openGridLabelWidthFor(gridUnits: number): number {
  return gridUnits * OPENGRID_LABEL_GRID.pitch
}

export const OPENGRID_LABEL_SLOT = {
  sideClearance: 0.15,
  depthClearance: 0.3,
  sideWall: 1.2,
  lipThickness: 0.9,
  lipOverlap: 0.8,
  topMargin: 2,
  gripExposure: 1,
} as const

export function openGridLabelSlotLayoutFor(
  body: {
    bodyWidth: number
    bodyDepth: number
    bodyThickness: number
    frontCornerRadius: number
  },
  gridUnits: number,
) {
  const config = OPENGRID_LABEL_SLOT
  const cardWidth = openGridLabelWidthFor(gridUnits)
  const pocketHalfWidth = cardWidth / 2 + config.sideClearance
  const outerHalfWidth = pocketHalfWidth + config.sideWall
  const channelDepth =
    OPENGRID_LABEL_CARD_INSERTION_THICKNESS + config.depthClearance
  const projection = channelDepth + config.lipThickness
  const cardTop = body.bodyThickness - config.topMargin
  const cardBottom = cardTop - OPENGRID_LABEL_CARD_HEIGHT
  const flatWidth = body.bodyWidth - 2 * body.frontCornerRadius
  const maxUnits = Math.max(
    0,
    Math.min(
      OPENGRID_LABEL_GRID.maxUnits,
      Math.floor(
        (flatWidth - 2 * (config.sideClearance + config.sideWall)) /
          OPENGRID_LABEL_GRID.pitch,
      ),
    ),
  )
  return {
    cardWidth,
    pocketHalfWidth,
    outerHalfWidth,
    channelDepth,
    projection,
    frontY: -body.bodyDepth,
    cardTop,
    cardBottom,
    railTop: cardTop - config.gripExposure,
    bottomZ: cardBottom - projection,
    maxUnits,
    fits: gridUnits <= maxUnits && cardBottom - projection >= 0,
  }
}

export type OpenGridLabelSlotLayout = ReturnType<
  typeof openGridLabelSlotLayoutFor
>

/** Vertices of the outward envelope, including the wedge's sloped underside. */
export function openGridLabelSlotPointsFor(
  slot: OpenGridLabelSlotLayout,
): [number, number, number][] {
  const points: [number, number, number][] = []
  for (const x of [-slot.outerHalfWidth, slot.outerHalfWidth]) {
    points.push(
      [x, slot.frontY, slot.bottomZ],
      [x, slot.frontY - slot.projection, slot.cardBottom],
      [x, slot.frontY - slot.projection, slot.railTop],
      [x, slot.frontY, slot.railTop],
    )
  }
  return points
}
