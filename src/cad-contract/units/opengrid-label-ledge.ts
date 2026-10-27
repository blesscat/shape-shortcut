import {
  OPENGRID_LABEL_CARD_HEIGHT,
  OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  OPENGRID_LABEL_CARD_RAISED_HEIGHT,
  OPENGRID_LABEL_GRID,
  OPENGRID_LABEL_SLOT,
  openGridLabelWidthFor,
} from './opengrid-label-shared'

/**
 * Inside label ledge shared by the stackable box and the ledge test coupon.
 *
 * The ledge is described in the wall frame: `u` runs along the wall, `v` runs
 * inward from the interior wall face and `z` is measured from the inner rim
 * datum (positive up). The card lies on a 45-degree face described by the
 * slope frame: `s` runs down the face from the wall contact point and `n`
 * runs along the face normal (up and inward).
 */

export const OPENGRID_LABEL_SNAP_FITS = ['loose', 'normal', 'tight'] as const

export type OpenGridLabelSnapFit = (typeof OPENGRID_LABEL_SNAP_FITS)[number]

export const OPENGRID_LABEL_SNAP_BUMP_HEIGHTS: Record<
  OpenGridLabelSnapFit,
  number
> = { loose: 0.5, normal: 0.6, tight: 0.7 }

export const OPENGRID_LABEL_DEFAULT_SNAP_FIT: OpenGridLabelSnapFit = 'normal'

export function isOpenGridLabelSnapFit(
  value: unknown,
): value is OpenGridLabelSnapFit {
  return (
    typeof value === 'string' &&
    (OPENGRID_LABEL_SNAP_FITS as readonly string[]).includes(value)
  )
}

export const OPENGRID_LABEL_LEDGE = {
  minUnits: 2,
  defaultUnits: 4,
  /** Horizontal reach of the 45-degree top face. */
  reach: 10,
  /** Vertical face at the inner edge; avoids a knife edge under the bumps. */
  tipThickness: 1,
  /** How far the wedge and rails sink into the wall for a clean fuse. */
  wallEmbed: 0.5,
  /** Gap between the card's upper end and the wall along the slope. */
  cardStopClearance: 0.15,
  /** Gap between the seated card's lower edge and the bump catch face. */
  catchGap: 0.1,
  bumpCrestLength: 0.3,
  bumpLeadInAngle: 30,
  bumpWidth: 2,
  bumpCenterOffset: 2.5,
  notchWidth: 3,
  notchDepth: 1,
  notchEndClearance: 0.65,
} as const

const SLOPE_UNIT = Math.SQRT1_2

export function isOpenGridLabelLedgeUnits(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= OPENGRID_LABEL_LEDGE.minUnits &&
    value <= OPENGRID_LABEL_GRID.maxUnits
  )
}

/** Units that fit on a wall flat of the given width (mm); 0 when none fit. */
export function openGridLabelLedgeMaxUnitsFor(flatWidth: number): number {
  const slot = OPENGRID_LABEL_SLOT
  const units = Math.floor(
    (flatWidth - 2 * (slot.sideClearance + slot.sideWall)) /
      OPENGRID_LABEL_GRID.pitch,
  )
  if (units < OPENGRID_LABEL_LEDGE.minUnits) return 0
  return Math.min(OPENGRID_LABEL_GRID.maxUnits, units)
}

export function openGridLabelLedgeLayoutFor(
  gridUnits: number,
  snapFit: OpenGridLabelSnapFit,
) {
  const ledge = OPENGRID_LABEL_LEDGE
  const slot = OPENGRID_LABEL_SLOT
  const cardWidth = openGridLabelWidthFor(gridUnits)
  const pocketHalfWidth = cardWidth / 2 + slot.sideClearance
  const channelDepth =
    OPENGRID_LABEL_CARD_INSERTION_THICKNESS + slot.depthClearance
  const bumpHeight = OPENGRID_LABEL_SNAP_BUMP_HEIGHTS[snapFit]
  const leadInRun =
    bumpHeight / Math.tan((ledge.bumpLeadInAngle * Math.PI) / 180)
  const slopeLength = ledge.reach / SLOPE_UNIT
  const cardTopS = ledge.cardStopClearance
  const cardBottomS = cardTopS + OPENGRID_LABEL_CARD_HEIGHT
  const catchS = cardBottomS + ledge.catchGap
  const wallTopZ = -slot.topMargin
  const tipTopZ = wallTopZ - ledge.reach
  const tipBottomZ = tipTopZ - ledge.tipThickness
  const wallBottomZ = tipBottomZ - ledge.reach
  return {
    cardWidth,
    pocketHalfWidth,
    outerHalfWidth: pocketHalfWidth + slot.sideWall,
    lipInnerHalfWidth: pocketHalfWidth - slot.lipOverlap,
    channelDepth,
    projection: channelDepth + slot.lipThickness,
    cardNormalMin: slot.depthClearance / 2,
    cardNormalMax:
      slot.depthClearance / 2 + OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
    raisedNormalMax:
      slot.depthClearance / 2 +
      OPENGRID_LABEL_CARD_INSERTION_THICKNESS +
      OPENGRID_LABEL_CARD_RAISED_HEIGHT,
    slopeLength,
    cardTopS,
    cardBottomS,
    catchS,
    crestEndS: catchS + ledge.bumpCrestLength,
    leadInEndS: catchS + ledge.bumpCrestLength + leadInRun,
    bumpHeight,
    bumpHalfWidth: ledge.bumpWidth / 2,
    bumpCenterOffset: ledge.bumpCenterOffset,
    notchHalfWidth: ledge.notchWidth / 2,
    notchStartS: cardBottomS - ledge.notchEndClearance,
    wallTopZ,
    tipTopZ,
    tipBottomZ,
    wallBottomZ,
    /** Smallest clear interior height that still holds the wedge block. */
    minClearHeight: -tipBottomZ,
    /** Clear height at which the underside hangs free of the floor. */
    freeHangingHeight: -wallBottomZ,
  }
}

export type OpenGridLabelLedgeLayout = ReturnType<
  typeof openGridLabelLedgeLayoutFor
>

/** Wall-frame `[v, z]` of a slope-frame point. */
export function openGridLabelLedgeSlopePoint(
  layout: Pick<OpenGridLabelLedgeLayout, 'wallTopZ'>,
  s: number,
  n: number,
): [number, number] {
  return [(s + n) * SLOPE_UNIT, layout.wallTopZ + (n - s) * SLOPE_UNIT]
}

/** Contact depth from the wall where the wedge underside meets a floor. */
export function openGridLabelLedgeFloorContactDepth(
  layout: OpenGridLabelLedgeLayout,
  clearHeight: number,
): number {
  return Math.max(
    0,
    Math.min(
      OPENGRID_LABEL_LEDGE.reach,
      layout.freeHangingHeight - clearHeight,
    ),
  )
}
