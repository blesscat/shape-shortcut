import {
  openGridLabelWidthFor,
  OPENGRID_LABEL_GRID,
} from '../../../cad-contract/units/opengrid-label-shared'
import { deserializeShape, makeBox, makeCompound, type Shape3D } from 'replicad'
import {
  OPENGRID_LABEL_CARD_CONFIGURATION,
  validateOpenGridLabelCardParameters,
  type OpenGridLabelCardParameters,
} from '../../../cad-contract/units'
import { makeLabelCardIconShape } from '../opengrid-label-card/icon-shape'
import { makeOpenGridLabelCardTextShape } from '../opengrid-label-card/flat-text'

export type OpenGridLabelCardNativePart = {
  name: 'body' | 'accent'
  shape: Shape3D
}

export type OpenGridLabelCardMultipartBuild = {
  shape: Shape3D
  qualityShape: Shape3D
  parts: OpenGridLabelCardNativePart[]
}

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

function buildQualityShape(body: Shape3D, accent: Shape3D | null): Shape3D {
  if (!accent) return cloneShape(body)
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

/**
 * Builds the label card: a flat 0.6 mm plate whose outward (+Z) face carries
 * the icon/text accent. `flat` seats the accent flush at Z = plateThickness
 * in a matching recess; `raised` stacks the accent 0.4 mm proud of the face.
 * The insertion thickness stays 0.6 mm in both styles.
 */
export async function buildOpenGridLabelCardWithParts(
  parameters: OpenGridLabelCardParameters,
  context: {
    isGenerationCurrent?: () => boolean
    yieldToEventLoop?: () => Promise<void>
  },
): Promise<OpenGridLabelCardMultipartBuild> {
  const validation = validateOpenGridLabelCardParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }

  const config = OPENGRID_LABEL_CARD_CONFIGURATION
  const halfWidth = openGridLabelWidthFor(validation.value.gridUnits) / 2
  const halfHeight = config.cardHeight / 2
  const plateTop = config.plateThickness
  const raised = validation.value.style === 'raised'

  let body: Shape3D | null = boxBetween(
    [-halfWidth, -halfHeight, 0],
    [halfWidth, halfHeight, plateTop],
  )
  let accent: Shape3D | null = null
  let quality: Shape3D | null = null
  try {
    const rows = [
      {
        field: 'text',
        text: validation.value.text,
        alignment: validation.value.textAlignment ?? 'center',
      },
      {
        field: 'textLine2',
        text: validation.value.textLine2,
        alignment: validation.value.textLine2Alignment ?? 'center',
      },
    ].filter((row) => Boolean(row.text))
    const textHeight = validation.value.textHeight ?? config.textHeight.default
    const accentDepth = raised ? config.raisedHeight : config.accentDepth
    const accentZ = raised ? plateTop : plateTop - accentDepth
    const hasIcon = validation.value.icon !== 'none'
    const safeHalfWidth = halfWidth - OPENGRID_LABEL_GRID.artworkSideInset
    let textMinX = -safeHalfWidth
    let textMaxX = safeHalfWidth
    if (hasIcon) {
      let iconX = 0
      if (rows.length > 0) {
        const iconSpace =
          OPENGRID_LABEL_GRID.iconSize + OPENGRID_LABEL_GRID.iconTextGap
        if (validation.value.iconPosition === 'left') {
          iconX = -safeHalfWidth + OPENGRID_LABEL_GRID.iconSize / 2
          textMinX += iconSpace
        } else {
          iconX = safeHalfWidth - OPENGRID_LABEL_GRID.iconSize / 2
          textMaxX -= iconSpace
        }
      }
      const iconShape = makeLabelCardIconShape(
        validation.value.icon,
        accentDepth,
      )
      accent = iconShape.translate(iconX, 0, accentZ)
      if (accent !== iconShape) deleteShape(iconShape)
    }

    for (const [index, row] of rows.entries()) {
      let textShape: Shape3D | null = null
      try {
        textShape = await makeOpenGridLabelCardTextShape(row.text!, {
          depth: accentDepth,
          maxLength: config.maxTextLength,
          textHeight,
        })
      } catch (error) {
        if (error instanceof Error && row.field === 'textLine2')
          throw new Error(`${error.message}:textLine2`)
        throw error
      }
      if (!textShape) continue
      try {
        const box = textShape.boundingBox
        let textWidth: number
        try {
          textWidth = box.bounds[1][0] - box.bounds[0][0]
        } finally {
          box.delete()
        }
        if (textWidth > textMaxX - textMinX)
          throw new Error(`LABEL_CARD_TEXT_TOO_WIDE:${row.field}`)
        let x = (textMinX + textMaxX) / 2
        if (row.alignment === 'left') x = textMinX + textWidth / 2
        if (row.alignment === 'right') x = textMaxX - textWidth / 2
        const y =
          ((rows.length - 1) / 2 - index) * (textHeight + config.textRowGap)
        textShape = textShape.translate(x, y, accentZ)
        if (accent) {
          const pieces = makeCompound([accent, textShape]).asShape3D()
          deleteShape(accent)
          accent = pieces
        } else {
          accent = textShape
          textShape = null
        }
      } finally {
        deleteShape(textShape)
      }
    }

    if (!raised && accent) {
      const recessCutter = cloneShape(accent)
      body = cutShape(body, recessCutter)
    }

    if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
      throw new Error('STALE_GENERATION')
    }
    await context.yieldToEventLoop?.()

    quality = buildQualityShape(body, accent)
    const preview = buildQualityShape(body, accent)
    const finalBody = body
    const finalAccent = accent
    body = null
    accent = null
    const parts: OpenGridLabelCardNativePart[] = [
      { name: 'body', shape: finalBody },
    ]
    if (finalAccent) parts.push({ name: 'accent', shape: finalAccent })
    return {
      shape: preview,
      qualityShape: quality,
      parts,
    }
  } catch (error) {
    deleteShape(body)
    deleteShape(accent)
    deleteShape(quality)
    throw error
  }
}

export async function buildOpenGridLabelCard(
  parameters: OpenGridLabelCardParameters,
  context: {
    isGenerationCurrent?: () => boolean
    yieldToEventLoop?: () => Promise<void>
  } = {},
): Promise<Shape3D> {
  const result = await buildOpenGridLabelCardWithParts(parameters, context)
  for (const part of result.parts) deleteShape(part.shape)
  deleteShape(result.qualityShape)
  return result.shape
}
