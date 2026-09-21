import { makeBox, type Shape3D } from 'replicad'
import {
  OPENGRID_LABEL_HOLDER_CONFIGURATION,
  validateOpenGridLabelHolderParameters,
  type OpenGridLabelHolderParameters,
} from '../../../cad-contract/units'

export const OPENGRID_LABEL_HOLDER_LAYOUT = {
  backWallThickness: OPENGRID_LABEL_HOLDER_CONFIGURATION.clipBackWallThickness,
  spineEndY: -6,
  spineHalfWidth: 1.5,
  channelHalfWidth: 3,
  lipThickness: 0.6,
  /** Shift applied so the final geometry is centered on Y (bounds ±8). */
  centerYShift: 2,
} as const

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not hide the primary geometry error.
  }
}

function boxBetween(
  min: [number, number, number],
  max: [number, number, number],
): Shape3D {
  return makeBox(min, max) as unknown as Shape3D
}

function fuseAll(shapes: readonly Shape3D[]): Shape3D {
  let fused = shapes[0]!
  try {
    for (let index = 1; index < shapes.length; index += 1) {
      const next = shapes[index]!
      const result = fused.fuse(next)
      if (result !== fused) deleteShape(fused)
      deleteShape(next)
      fused = result
    }
    return fused
  } catch (error) {
    deleteShape(fused)
    throw error
  }
}

function cutShape(source: Shape3D, cutter: Shape3D): Shape3D {
  try {
    const result = source.cut(cutter)
    if (result !== source) deleteShape(source)
    deleteShape(cutter)
    return result
  } catch (error) {
    deleteShape(cutter)
    throw error
  }
}

/**
 * Builds the label holder: a base plate carrying a shallow card pocket on
 * its outward (+Z) face, with the v1 saddle clip stacked behind it (−Y).
 * Canonical (print) frame: base Z ∈ [0, baseThickness]; the pocket mouth
 * faces +Z so the card drops in face-up, its visible face sitting slightly
 * proud of the base face; saddle arms wrap the panel at −Y.
 *
 * Retention: the pocket's four walls contain the card in every mounting
 * orientation; two detent nubs on the pocket's X walls near the mouth click
 * behind the card's side edges for the snap fit.
 */
function buildLabelHolderBody(
  parameters: OpenGridLabelHolderParameters,
): Shape3D {
  const config = OPENGRID_LABEL_HOLDER_CONFIGURATION
  const layout = OPENGRID_LABEL_HOLDER_LAYOUT
  const pocketHalfWidth = parameters.widthTier / 2 + config.pocketWallClearance
  const outerHalfWidth = parameters.widthTier / 2 + config.pocketFrameWidth
  const grip = parameters.gripThickness
  const baseTop = config.baseThickness
  const pocketBottom = baseTop - config.pocketDepth
  const lowerArmTop = baseTop + config.clipArmThickness
  const channelBottom = lowerArmTop
  const channelTop = channelBottom + config.gripClearance + grip
  const totalHeight = channelTop + config.clipArmThickness
  const pocketMinY = 0
  const pocketMaxY = 10
  const detentYCenter = pocketMaxY - 1.5
  const detentSize = config.detentLength
  const detentZCenter = pocketBottom + config.pocketDepth / 2
  const detentZHalf = config.pocketDepth / 2 - 0.05

  const base = boxBetween(
    [-outerHalfWidth, -layout.backWallThickness, 0],
    [outerHalfWidth, pocketMaxY, baseTop],
  )
  const pocket = boxBetween(
    [-pocketHalfWidth, pocketMinY, pocketBottom],
    [pocketHalfWidth, pocketMaxY, baseTop],
  )
  let body = cutShape(base, pocket)

  const detentPositive = boxBetween(
    [
      pocketHalfWidth - config.detentProtrusion,
      detentYCenter - detentSize / 2,
      detentZCenter - detentZHalf,
    ],
    [
      pocketHalfWidth + 0.01,
      detentYCenter + detentSize / 2,
      detentZCenter + detentZHalf,
    ],
  )
  const detentNegative = boxBetween(
    [
      -pocketHalfWidth - 0.01,
      detentYCenter - detentSize / 2,
      detentZCenter - detentZHalf,
    ],
    [
      -pocketHalfWidth + config.detentProtrusion,
      detentYCenter + detentSize / 2,
      detentZCenter + detentZHalf,
    ],
  )
  body = fuseAll([body, detentPositive, detentNegative])

  const backWall = boxBetween(
    [-layout.channelHalfWidth, -layout.backWallThickness, baseTop],
    [layout.channelHalfWidth, 0, totalHeight],
  )
  const spine = boxBetween(
    [-layout.spineHalfWidth, layout.spineEndY, 0],
    [layout.spineHalfWidth, -layout.backWallThickness, totalHeight],
  )
  const lowerArm = boxBetween(
    [-layout.channelHalfWidth, 0, baseTop],
    [layout.channelHalfWidth, config.clipEdgeEngagement, channelBottom],
  )
  const upperArm = boxBetween(
    [-layout.channelHalfWidth, 0, channelTop],
    [layout.channelHalfWidth, config.clipEdgeEngagement, totalHeight],
  )
  const lipHalfWidth = layout.channelHalfWidth + layout.lipThickness
  const lipPositive = boxBetween(
    [layout.channelHalfWidth, 0, baseTop],
    [lipHalfWidth, config.clipEdgeEngagement, totalHeight],
  )
  const lipNegative = boxBetween(
    [-lipHalfWidth, 0, baseTop],
    [-layout.channelHalfWidth, config.clipEdgeEngagement, totalHeight],
  )

  return fuseAll([
    body,
    backWall,
    spine,
    lowerArm,
    upperArm,
    lipPositive,
    lipNegative,
  ]).translate(0, -layout.centerYShift, 0)
}

export async function buildOpenGridLabelHolder(
  parameters: OpenGridLabelHolderParameters,
  context: {
    isGenerationCurrent?: () => boolean
    yieldToEventLoop?: () => Promise<void>
  } = {},
): Promise<Shape3D> {
  const validation = validateOpenGridLabelHolderParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-holder')
  }
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }

  return buildLabelHolderBody(validation.value)
}
