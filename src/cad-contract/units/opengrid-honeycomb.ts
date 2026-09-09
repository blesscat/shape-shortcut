export const OPENGRID_HONEYCOMB_CELL_RADIUS = 3
export const OPENGRID_HONEYCOMB_RIB_THICKNESS = 2.5
export const OPENGRID_HONEYCOMB_LOWER_FRAME = 1.25
export const OPENGRID_HONEYCOMB_BOTTOM_FEATURE_CLEARANCE = 1.25

function honeycombLatticeFor(cellRadius: number) {
  const anchorPitch =
    Math.sqrt(3) * cellRadius + OPENGRID_HONEYCOMB_RIB_THICKNESS
  return {
    anchorPitch,
    rowPitch: (Math.sqrt(3) * anchorPitch) / 2,
    cellRadius,
    ribThickness: OPENGRID_HONEYCOMB_RIB_THICKNESS,
    minimumPanelSpan: cellRadius * 2,
  } as const
}

const SHARED_HONEYCOMB_LATTICE = honeycombLatticeFor(
  OPENGRID_HONEYCOMB_CELL_RADIUS,
)

/**
 * Fixed lattice dimensions shared by the OpenGrid containers and open shelf.
 * Side and plate cells use the same hex size and printable rib width. The
 * protected-boundary clearances remain independent of the visible rib width.
 */
export const OPENGRID_HONEYCOMB_CONFIGURATION = {
  ...SHARED_HONEYCOMB_LATTICE,
  bottomLattice: SHARED_HONEYCOMB_LATTICE,
  sideFrame: 3.5,
  bottomFrame: 5,
  bottomHoleSafetyRing: 2,
  topFrame: 1.5,
  lowerFrame: OPENGRID_HONEYCOMB_LOWER_FRAME,
  featureClearance: 3,
  bottomFeatureClearance: OPENGRID_HONEYCOMB_BOTTOM_FEATURE_CLEARANCE,
  cutterMargin: 0.04,
} as const
