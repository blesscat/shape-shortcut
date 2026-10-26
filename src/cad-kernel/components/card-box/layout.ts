import {
  CARD_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
  type CardBoxParameters,
} from '../../../cad-contract/units'

export type CardBoxCoverStackItem =
  | { kind: 'svg'; width: number; height: number }
  | { kind: 'text'; height: number; width: number }

/** Plate-local safe rectangle for cover art, in mm. */
export type CardBoxCoverSafeArea = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type CardBoxCoverPlacement = {
  index: number
  /** Top-left corner of the item in plate-local mm. */
  x: number
  y: number
  width: number
  height: number
}

export type CardBoxCoverStackLayout = {
  placements: readonly CardBoxCoverPlacement[]
  totalHeight: number
}

/**
 * Visible window is `(W−10) × (H−10)` — 5 mm hidden left/right/bottom by the
 * box lips and 5 mm at the top by the lid front flange — shrunk by the safe
 * margin on every side.
 */
export function cardBoxCoverSafeArea(
  parameters: CardBoxParameters,
): CardBoxCoverSafeArea {
  const width = cardBoxInteriorWidth(parameters.cardWidth)
  const margin = CARD_BOX_CONFIGURATION.coverSafeAreaMargin
  const hiddenLip = CARD_BOX_CONFIGURATION.hiddenLipWidth
  return {
    minX: hiddenLip + margin,
    maxX: width - hiddenLip - margin,
    minY: CARD_BOX_CONFIGURATION.hiddenBottomHeight + margin,
    maxY:
      parameters.cardHeight - CARD_BOX_CONFIGURATION.hiddenTopHeight - margin,
  }
}

/**
 * Centered horizontal stack. `verticalPositionPercent` 0 = stack top at the
 * safe top, 50 = centered, 100 = stack bottom at the safe bottom.
 */
export function cardBoxCoverStackLayout(
  items: readonly CardBoxCoverStackItem[],
  safe: CardBoxCoverSafeArea,
  verticalPositionPercent: number,
): CardBoxCoverStackLayout {
  const safeWidth = safe.maxX - safe.minX
  const safeHeight = safe.maxY - safe.minY
  const totalHeight = items.reduce((sum, item) => sum + item.height, 0)
  const outside = items.some((item) => item.width > safeWidth)
  if (outside || totalHeight > safeHeight) {
    throw new Error('CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA')
  }
  const ratio = Math.min(Math.max(verticalPositionPercent, 0), 100) / 100
  const stackTop = safe.maxY - ratio * (safeHeight - totalHeight)
  const centerX = (safe.minX + safe.maxX) / 2
  const placements: CardBoxCoverPlacement[] = []
  let top = stackTop
  for (const [index, item] of items.entries()) {
    placements.push({
      index,
      x: centerX - item.width / 2,
      y: top - item.height,
      width: item.width,
      height: item.height,
    })
    top -= item.height
  }
  return { placements, totalHeight }
}
