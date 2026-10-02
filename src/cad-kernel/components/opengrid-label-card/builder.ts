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
  makeOpenGridScrewModeSideShape,
  parseOpenGridLabelScrewShaftUnits,
} from '../opengrid-label-card/screw-shape'
import { isOpenGridLabelScrewIconId } from '../../../cad-contract/units'
import {
  OPENGRID_LABEL_CARD_SCREW_FRONT_ICONS,
  OPENGRID_LABEL_CARD_SCREW_SIDE,
} from '../../../cad-contract/units'
import { makeOpenGridLabelCardTextShape } from '../opengrid-label-card/flat-text'
import { deleteShape } from '../../lifetime/dispose'

export type OpenGridLabelCardNativePart = {
  name: 'body' | 'accent'
  shape: Shape3D
}

export type OpenGridLabelCardMultipartBuild = {
  shape: Shape3D
  qualityShape: Shape3D
  parts: OpenGridLabelCardNativePart[]
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
    const screwMode = validation.value.screwMode === true
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
    const hasIcon = !screwMode && validation.value.icon !== 'none'
    const safeHalfWidth = halfWidth - OPENGRID_LABEL_GRID.artworkSideInset
    const safeWidth = safeHalfWidth * 2
    const safeHalfHeight =
      config.cardHeight / 2 - OPENGRID_LABEL_GRID.artworkSideInset
    const iconSize = validation.value.iconSize ?? config.iconSize.default
    const screwHead = validation.value.screwHead ?? config.screwMode.defaultHead
    const layout = screwMode
      ? ('stacked' as const)
      : (validation.value.layout ?? 'inline')
    const groupAlign = validation.value.groupAlign ?? 'center'

    // First pass: build every text row and measure it so the widest
    // non-empty row defines the text block width.
    const builtRows: {
      field: 'text' | 'textLine2'
      shape: Shape3D
      width: number
      minX: number
      maxX: number
      minY: number
      maxY: number
      alignment: 'left' | 'center' | 'right'
    }[] = []
    for (const [index, row] of rows.entries()) {
      let textShape: Shape3D | null = null
      try {
        textShape = await makeOpenGridLabelCardTextShape(row.text!, {
          depth: accentDepth,
          maxLength: screwMode ? row.text!.length : config.maxTextLength,
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
            minX: box.bounds[0][0],
            maxX: box.bounds[1][0],
            minY: box.bounds[0][1],
            maxY: box.bounds[1][1],
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
        if (groupWidth > safeWidth) {
          const widest = builtRows.reduce((max, row) =>
            row.width > max.width ? row : max,
          )
          throw new Error(`LABEL_CARD_TEXT_TOO_WIDE:${widest.field}`)
        }
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
      built.minX = x - built.width / 2
      built.maxX = x + built.width / 2
      built.minY = y - textHeight / 2
      built.maxY = y + textHeight / 2
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
            shaftLength: parseOpenGridLabelScrewShaftUnits(
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
          // Icon and text regions are disjoint by layout construction; guard
          // against numeric drift producing an overlapping two-color accent.
          const iconBox = translated.boundingBox
          try {
            for (const row of builtRows) {
              if (
                iconBox.bounds[0][0] < row.maxX &&
                iconBox.bounds[1][0] > row.minX &&
                iconBox.bounds[0][1] < row.maxY &&
                iconBox.bounds[1][1] > row.minY
              ) {
                throw new Error('LABEL_CARD_ICON_TEXT_OVERLAP')
              }
            }
          } finally {
            iconBox.delete()
          }
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

    if (screwMode) {
      const frontIconId = OPENGRID_LABEL_CARD_SCREW_FRONT_ICONS[screwHead]
      let frontIcon: Shape3D | null = null
      let sideIcon: Shape3D | null = null
      try {
        frontIcon = makeLabelCardIconShape(
          frontIconId,
          accentDepth,
          OPENGRID_LABEL_CARD_SCREW_SIDE.headFrontSize,
        )
        sideIcon = makeOpenGridScrewModeSideShape({
          lengthMm:
            validation.value.screwLength ?? config.screwMode.defaultLength,
          depth: accentDepth,
        })
        const frontBox = frontIcon.boundingBox
        const sideBox = sideIcon.boundingBox
        let placements: { shape: Shape3D; x: number }[]
        let pairHeight: number
        try {
          const frontWidth = frontBox.bounds[1][0]! - frontBox.bounds[0][0]!
          const sideWidth = sideBox.bounds[1][0]! - sideBox.bounds[0][0]!
          const pairWidth =
            frontWidth + OPENGRID_LABEL_GRID.iconTextGap + sideWidth
          pairHeight = Math.max(
            frontBox.bounds[1][1]! - frontBox.bounds[0][1]!,
            sideBox.bounds[1][1]! - sideBox.bounds[0][1]!,
          )
          placements = [
            {
              shape: frontIcon,
              x: -pairWidth / 2 - frontBox.bounds[0][0]!,
            },
            {
              shape: sideIcon,
              x: pairWidth / 2 - sideBox.bounds[1][0]!,
            },
          ]
        } finally {
          frontBox.delete()
          sideBox.delete()
        }
        const pairY = safeHalfHeight - pairHeight / 2
        for (const piece of placements) {
          const translated = piece.shape.translate(piece.x, pairY, accentZ)
          try {
            const iconBox = translated.boundingBox
            try {
              for (const row of builtRows) {
                if (
                  iconBox.bounds[0][0] < row.maxX &&
                  iconBox.bounds[1][0] > row.minX &&
                  iconBox.bounds[0][1] < row.maxY &&
                  iconBox.bounds[1][1] > row.minY
                ) {
                  throw new Error('LABEL_CARD_ICON_TEXT_OVERLAP')
                }
              }
            } finally {
              iconBox.delete()
            }
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
        }
      } catch (error) {
        deleteShape(frontIcon)
        deleteShape(sideIcon)
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
