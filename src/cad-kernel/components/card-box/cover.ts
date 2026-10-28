import { deserializeShape, makeBox, type Shape3D } from 'replicad'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxInteriorWidth,
  type CardBoxParameters,
  type CardBoxSvgOutlineData,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'
import type { CardBoxArtPartBuild } from './divider'
import {
  cardBoxCoverSafeArea,
  cardBoxCoverStackLayout,
  type CardBoxCoverStackItem,
} from './layout'
import { buildCardBoxSvgShape } from './svg-outline'
import { makeCardBoxTextShape, measureCardBoxText } from './text'

function cloneShape(shape: Shape3D): Shape3D {
  return deserializeShape(shape.serialize()).asShape3D()
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

function fuseAll(solids: readonly Shape3D[]): Shape3D {
  let result: Shape3D | null = null
  try {
    for (const solid of solids) {
      if (!result) {
        result = solid
        continue
      }
      const fused = result.fuse(solid)
      if (fused !== result) deleteShape(result)
      deleteShape(solid)
      result = fused
    }
    const finalShape = result!
    result = null
    return finalShape
  } finally {
    deleteShape(result)
  }
}

type PositionedArt = { x: number; y: number; solid: Shape3D }

/**
 * Builds the cover plate: exactly interior-width × card-height × 0.6 mm in
 * the XY plane. Art (SVG, title, subtitle) is laid out in the safe area as a
 * centered stack; `raised` stacks it 0.4 mm proud of the plate top, `flat`
 * cuts matching recesses and returns the art as a separate accent solid.
 * Layout overflow throws `CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA`.
 */
export async function buildCardBoxCover(
  parameters: CardBoxParameters,
  coverSvg?: CardBoxSvgOutlineData,
): Promise<CardBoxArtPartBuild> {
  const width = cardBoxInteriorWidth(parameters.cardWidth)
  const height = parameters.cardHeight
  const thickness = CARD_BOX_CONFIGURATION.coverPlateThickness
  const depth = CARD_BOX_CONFIGURATION.accentDepth
  const safe = cardBoxCoverSafeArea(parameters)
  const safeWidth = safe.maxX - safe.minX

  const svgArt =
    coverSvg && parameters.usesCoverSvg && coverSvg.groups.length
      ? {
          width: parameters.coverSvgWidth,
          height: (coverSvg.height / coverSvg.width) * parameters.coverSvgWidth,
          svg: coverSvg,
        }
      : null

  const titleText = parameters.coverTitle.trim()
  const subtitleText = parameters.coverSubtitle.trim()

  // Measure each text line at its configured visible glyph height.
  const title = titleText
    ? await measureCardBoxText(titleText, parameters.coverTitleTextHeight)
    : null
  const subtitle = subtitleText
    ? await measureCardBoxText(subtitleText, parameters.coverSubtitleTextHeight)
    : null

  const items: CardBoxCoverStackItem[] = []
  if (svgArt) {
    items.push({ kind: 'svg', width: svgArt.width, height: svgArt.height })
  }
  if (title) {
    items.push({ kind: 'text', width: title.width, height: title.height })
  }
  if (subtitle) {
    items.push({
      kind: 'text',
      width: subtitle.width,
      height: subtitle.height,
    })
  }
  const layout = cardBoxCoverStackLayout(
    items,
    safe,
    parameters.coverVerticalPosition,
  )

  // Same order as `items`: each entry knows how to build its own solid.
  const sources = [
    ...(svgArt
      ? [{ kind: 'svg' as const, svg: svgArt.svg, width: svgArt.width }]
      : []),
    ...(title
      ? [
          {
            kind: 'text' as const,
            text: titleText,
            height: parameters.coverTitleTextHeight,
          },
        ]
      : []),
    ...(subtitle
      ? [
          {
            kind: 'text' as const,
            text: subtitleText,
            height: parameters.coverSubtitleTextHeight,
          },
        ]
      : []),
  ]

  let body: Shape3D | null = makeBox(
    [-width / 2, 0, 0],
    [width / 2, height, thickness],
  ) as unknown as Shape3D
  const art: PositionedArt[] = []
  try {
    for (const placement of layout.placements) {
      const source = sources[placement.index]!
      const centerX = placement.x + placement.width / 2 - width / 2
      const centerY = placement.y + placement.height / 2
      if (source.kind === 'svg') {
        const solid = buildCardBoxSvgShape(source.svg, source.width, depth)
        if (solid) art.push({ x: centerX, y: centerY, solid })
      } else {
        const solid = await makeCardBoxTextShape(source.text, {
          textHeight: source.height,
          maxWidth: safeWidth,
          depth,
        })
        if (solid) art.push({ x: centerX, y: centerY, solid })
      }
    }
    if (!art.length) {
      const single = body
      body = null
      return { kind: 'single', shape: single }
    }

    const raised = parameters.coverStyle === 'raised'
    const accentZ = raised ? thickness : thickness - depth
    let accent: Shape3D | null = null
    try {
      accent = fuseAll(
        art.map((piece) => piece.solid.translate(piece.x, piece.y, accentZ)),
      )
    } finally {
      // fuseAll consumes the translated copies; the untranslated originals
      // must be released whether or not the fuse chain succeeded.
      for (const piece of art) deleteShape(piece.solid)
    }
    if (!raised) {
      const recessCutter = cloneShape(accent)
      body = cutShape(body, recessCutter)
    }
    const finalBody = body
    body = null
    return { kind: 'accent', body: finalBody, accent }
  } catch (error) {
    deleteShape(body)
    for (const piece of art) deleteShape(piece.solid)
    throw error
  }
}
