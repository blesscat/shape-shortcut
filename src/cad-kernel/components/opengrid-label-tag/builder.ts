import { deserializeShape, makeBox, makeCompound, type Shape3D } from 'replicad'
import {
  OPENGRID_LABEL_TAG_CONFIGURATION,
  validateOpenGridLabelTagParameters,
  type OpenGridLabelTagParameters,
} from '../../../cad-contract/units'
import {
  LABEL_TAG_TEXT_POSITIONS,
  makeOpenGridLabelTagTextShape,
} from './flat-text'
import { makeLabelTagIconShape } from './icon-shape'

export type OpenGridLabelTagNativePart = {
  name: 'body' | 'icon'
  shape: Shape3D
}

export type OpenGridLabelTagMultipartBuild = {
  shape: Shape3D
  qualityShape: Shape3D
  parts: OpenGridLabelTagNativePart[]
}

export const OPENGRID_LABEL_TAG_LAYOUT = {
  /** Distance from the plate top edge to the saddle opening face. */
  backWallThickness: OPENGRID_LABEL_TAG_CONFIGURATION.clipBackWallThickness,
  spineLength: 6,
  spineHalfWidth: 1.5,
  channelHalfWidth: 3,
  lipThickness: 0.6,
  /** Shift applied so the final geometry is centered on Y. */
  centerYShift: 2,
} as const

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not hide the primary geometry error.
  }
}

function cloneShape(shape: Shape3D): Shape3D {
  return deserializeShape(shape.serialize()).asShape3D()
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
 * Builds the label tag body: a 0.6 mm plate with a saddle clip whose opening
 * grips a panel edge of the validated grip thickness. All coordinates live in
 * the canonical (print) frame: plate face up at Z = plateThickness, hang
 * direction along +Y, opening along +Y, spring flexure along Z.
 */
function buildLabelTagBody(parameters: OpenGridLabelTagParameters): Shape3D {
  const config = OPENGRID_LABEL_TAG_CONFIGURATION
  const layout = OPENGRID_LABEL_TAG_LAYOUT
  const halfWidth = parameters.widthTier / 2
  const grip = parameters.gripThickness
  const plateTop = config.plateThickness
  const lowerArmTop = plateTop + config.clipArmThickness
  const channelBottom = lowerArmTop
  const channelTop = channelBottom + config.gripClearance + grip
  const totalHeight = channelTop + config.clipArmThickness
  const plateMinY = -layout.backWallThickness
  const plateMaxY = config.plateHangLength
  const lipHalfWidth = layout.channelHalfWidth + layout.lipThickness
  const edgeEngagement = config.clipEdgeEngagement

  const plate = boxBetween(
    [-halfWidth, plateMinY, 0],
    [halfWidth, plateMaxY, plateTop],
  )
  const backWall = boxBetween(
    [-layout.channelHalfWidth, -layout.backWallThickness, plateTop],
    [layout.channelHalfWidth, 0, totalHeight],
  )
  const spine = boxBetween(
    [-layout.spineHalfWidth, -layout.spineLength, 0],
    [layout.spineHalfWidth, -layout.backWallThickness, totalHeight],
  )
  const lowerArm = boxBetween(
    [-layout.channelHalfWidth, 0, plateTop],
    [layout.channelHalfWidth, edgeEngagement, channelBottom],
  )
  const upperArm = boxBetween(
    [-layout.channelHalfWidth, 0, channelTop],
    [layout.channelHalfWidth, edgeEngagement, totalHeight],
  )
  const lipPositive = boxBetween(
    [layout.channelHalfWidth, 0, plateTop],
    [lipHalfWidth, edgeEngagement, totalHeight],
  )
  const lipNegative = boxBetween(
    [-lipHalfWidth, 0, plateTop],
    [-layout.channelHalfWidth, edgeEngagement, totalHeight],
  )

  const body = fuseAll([
    plate,
    backWall,
    spine,
    lowerArm,
    upperArm,
    lipPositive,
    lipNegative,
  ])
  return body.translate(0, -layout.centerYShift, 0)
}

/**
 * Builds the accent compound (icon plus optional text) seated flush with the
 * outward plate face (Z = 0, facing away from the gripped panel so the clip
 * arms never occlude it), and cuts the matching recess into the body.
 */
async function buildAccentWithRecess(
  body: Shape3D,
  parameters: OpenGridLabelTagParameters,
): Promise<{ body: Shape3D; accent: Shape3D }> {
  const hasText = parameters.text !== undefined && parameters.text.length > 0
  const iconCenterY =
    (hasText
      ? LABEL_TAG_TEXT_POSITIONS.iconCenterYWithText
      : LABEL_TAG_TEXT_POSITIONS.iconCenterYIconOnly) -
    OPENGRID_LABEL_TAG_LAYOUT.centerYShift

  const iconShape = makeLabelTagIconShape(parameters.icon)
  const icon = iconShape.translate(0, iconCenterY, 0)
  if (icon !== iconShape) deleteShape(iconShape)
  const accentPieces: Shape3D[] = [icon]
  let textShape: Shape3D | null = null
  if (hasText) {
    textShape = await makeOpenGridLabelTagTextShape(parameters.text!)
    if (textShape) {
      const translated = textShape.translate(
        0,
        -OPENGRID_LABEL_TAG_LAYOUT.centerYShift,
        0,
      )
      if (translated !== textShape) deleteShape(textShape)
      textShape = translated
      accentPieces.push(textShape)
    }
  }
  const accent = makeCompound(accentPieces).asShape3D()
  accentPieces.length = 0

  const recessCutter = cloneShape(accent)
  const carved = cutShape(body, recessCutter)
  return { body: carved, accent }
}

function buildQualityShape(body: Shape3D, accent: Shape3D): Shape3D {
  let bodyClone: Shape3D | null = null
  let accentClone: Shape3D | null = null
  try {
    bodyClone = cloneShape(body)
    accentClone = cloneShape(accent)
    const quality = makeCompound([bodyClone, accentClone]).asShape3D()
    bodyClone = null
    accentClone = null
    return quality
  } finally {
    deleteShape(bodyClone)
    deleteShape(accentClone)
  }
}

function buildPreviewShape(body: Shape3D, accent: Shape3D): Shape3D {
  return buildQualityShape(body, accent)
}

export async function buildOpenGridLabelTagWithParts(
  parameters: OpenGridLabelTagParameters,
  context: {
    isGenerationCurrent?: () => boolean
    yieldToEventLoop?: () => Promise<void>
  },
): Promise<OpenGridLabelTagMultipartBuild> {
  const validation = validateOpenGridLabelTagParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-tag')
  }
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }

  let body: Shape3D | null = buildLabelTagBody(validation.value)
  let accent: Shape3D | null = null
  let quality: Shape3D | null = null
  try {
    const accentResult = await buildAccentWithRecess(body, validation.value)
    body = accentResult.body
    accent = accentResult.accent
    if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
      throw new Error('STALE_GENERATION')
    }
    await context.yieldToEventLoop?.()

    quality = buildQualityShape(body, accent)
    const preview = buildPreviewShape(body, accent)
    const finalBody = body
    const finalAccent = accent
    body = null
    accent = null
    return {
      shape: preview,
      qualityShape: quality,
      parts: [
        { name: 'body', shape: finalBody },
        { name: 'icon', shape: finalAccent },
      ],
    }
  } catch (error) {
    deleteShape(body)
    deleteShape(accent)
    deleteShape(quality)
    throw error
  }
}

export async function buildOpenGridLabelTag(
  parameters: OpenGridLabelTagParameters,
  context: {
    isGenerationCurrent?: () => boolean
    yieldToEventLoop?: () => Promise<void>
  } = {},
): Promise<Shape3D> {
  const result = await buildOpenGridLabelTagWithParts(parameters, context)
  for (const part of result.parts) deleteShape(part.shape)
  deleteShape(result.qualityShape)
  return result.shape
}
