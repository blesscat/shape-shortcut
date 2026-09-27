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
import {
  makeOpenGridLabelScrewShape,
  parseOpenGridLabelScrewShaftRatio,
} from '../opengrid-label-card/screw-shape'
import { isOpenGridLabelScrewIconId } from '../../../cad-contract/units'
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
        field: 'text' as const,
        text: validation.value.text,
        alignment: validation.value.textAlignment ?? 'center',
      },
      {
        field: 'textLine2' as const,
        text: validation.value.textLine2,
        alignment: validation.value.textLine2Alignment ?? 'center',
      },
    ].filter((row) => Boolean(row.text))
    const textHeight = validation.value.textHeight ?? config.textHeight.default
    const accentDepth = raised ? config.raisedHeight : config.accentDepth
    const accentZ = raised ? plateTop : plateTop - accentDepth
    const hasIcon = validation.value.icon !== 'none'
    const safeHalfWidth = halfWidth - OPENGRID_LABEL_GRID.artworkSideInset
    const safeWidth = safeHalfWidth * 2
    const safeHalfHeight =
      config.cardHeight / 2 - OPENGRID_LABEL_GRID.artworkSideInset
    const iconSize = validation.value.iconSize ?? config.iconSize.default
    const layout = validation.value.layout ?? 'inline'
    const groupAlign = validation.value.groupAlign ?? 'center'

    // First pass: build every text row and measure it so the widest
    // non-empty row defines the text block width.
    const builtRows: {
      field: 'text' | 'textLine2'
      shape: Shape3D
      width: number
      alignment: 'left' | 'center' | 'right'
    }[] = []
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
        try {
          builtRows.push({
            field: row.field,
            shape: textShape,
            width: box.bounds[1][0] - box.bounds[0][0],
            alignment: row.alignment,
          })
        } finally {
          box.delete()
        }
        textShape = null
      } finally {
        deleteShape(textShape)
      }
    }

    const blockWidth = builtRows.reduce(
      (max, row) => Math.max(max, row.width),
      0,
    )
    const hasText = builtRows.length > 0

    // Group layout: icon + minimum gap + text block positioned as one unit.
    let iconX = 0
    let iconY = 0
    let textMinX = -safeHalfWidth
    let textMaxX = safeHalfWidth
    if (hasIcon && hasText) {
      if (layout === 'stacked') {
        iconX = 0
        iconY = safeHalfHeight - iconSize / 2
      } else {
        const groupWidth =
          iconSize + OPENGRID_LABEL_GRID.iconTextGap + blockWidth
        if (groupWidth > safeWidth)
          throw new Error(`LABEL_CARD_TEXT_TOO_WIDE:${builtRows[0]!.field}`)
        const groupLeft =
          groupAlign === 'left'
            ? -safeHalfWidth
            : groupAlign === 'right'
              ? safeHalfWidth - groupWidth
              : -groupWidth / 2
        if (validation.value.iconPosition === 'left') {
          iconX = groupLeft + iconSize / 2
          textMinX = groupLeft + iconSize + OPENGRID_LABEL_GRID.iconTextGap
        } else {
          iconX = groupLeft + groupWidth - iconSize / 2
          textMinX = groupLeft
        }
        textMaxX = textMinX + blockWidth
      }
    } else if (hasIcon) {
      // Icon-only cards stay centered regardless of groupAlign.
    } else if (hasText) {
      const groupLeft =
        groupAlign === 'left'
          ? -safeHalfWidth
          : groupAlign === 'right'
            ? safeHalfWidth - blockWidth
            : -blockWidth / 2
      textMinX = groupLeft
      textMaxX = groupLeft + blockWidth
    }

    for (const [index, built] of builtRows.entries()) {
      let x: number
      if (hasIcon && hasText && layout === 'inline') {
        if (built.alignment === 'left') x = textMinX + built.width / 2
        else if (built.alignment === 'right') x = textMaxX - built.width / 2
        else x = (textMinX + textMaxX) / 2
      } else if (layout === 'stacked') {
        x = 0
      } else if (!hasIcon && hasText) {
        if (builtRows.length > 1 && built.alignment === 'left')
          x = textMinX + built.width / 2
        else if (builtRows.length > 1 && built.alignment === 'right')
          x = textMaxX - built.width / 2
        else x = (textMinX + textMaxX) / 2
      } else {
        x = 0
      }
      const y =
        layout === 'stacked'
          ? -safeHalfHeight + textHeight / 2
          : ((builtRows.length - 1) / 2 - index) *
            (textHeight + config.textRowGap)
      let rowShape: Shape3D | null = built.shape.translate(x, y, accentZ)
      try {
        if (accent) {
          const pieces = makeCompound([accent, rowShape]).asShape3D()
          deleteShape(accent)
          accent = pieces
        } else {
          accent = rowShape
          rowShape = null
        }
      } finally {
        deleteShape(rowShape)
      }
    }

    if (hasIcon) {
      let iconShape: Shape3D | null = null
      try {
        if (isOpenGridLabelScrewIconId(validation.value.icon)) {
          iconShape = makeOpenGridLabelScrewShape({
            iconId: validation.value.icon,
            shaftRatio: parseOpenGridLabelScrewShaftRatio(
              validation.value.text,
            ),
            size: iconSize,
            depth: accentDepth,
          })
        } else {
          iconShape = makeLabelCardIconShape(
            validation.value.icon,
            accentDepth,
            iconSize,
          )
        }
        const translated = iconShape.translate(iconX, iconY, accentZ)
        try {
          if (accent) {
            const fused = makeCompound([accent, translated]).asShape3D()
            deleteShape(accent)
            accent = fused
          } else {
            accent = translated
          }
        } finally {
          if (translated !== (accent as unknown)) deleteShape(translated)
        }
      } catch (error) {
        deleteShape(iconShape)
        throw error
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
