import { deserializeShape, makeCompound, type Shape3D } from 'replicad'
import type { CardBoxSvgOutlineData } from '../../../cad-contract/units'
import {
  CARD_BOX_CONFIGURATION,
  isCardBoxParameters,
  type CardBoxParameters,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'
import { CARD_BOX_CHANNEL_SLOT_DEPTH, buildCardBoxBox } from './box'
import { buildCardBoxLid } from './lid'
import { buildCardBoxDivider, type CardBoxArtPartBuild } from './divider'
import { buildCardBoxCover } from './cover'

export type CardBoxMultipartBuild = {
  shape: Shape3D
  parts?: Array<{ name: 'body' | 'accent'; shape: Shape3D }>
}

function cloneShape(shape: Shape3D): Shape3D {
  return deserializeShape(shape.serialize()).asShape3D()
}

/**
 * Combined body+accent geometry for single-file STEP/STL export (the parts
 * array keeps the separated bodies for two-color 3MF). Clones feed the
 * compound so the exported shape never aliases the exported parts.
 */
function combinedArtShape(body: Shape3D, accent: Shape3D): Shape3D {
  let bodyClone: Shape3D | null = null
  let accentClone: Shape3D | null = null
  try {
    bodyClone = cloneShape(body)
    accentClone = cloneShape(accent)
    return makeCompound([bodyClone, accentClone]).asShape3D()
  } finally {
    deleteShape(bodyClone)
    deleteShape(accentClone)
  }
}

/**
 * Flips the lid 180° around X so its flat plate top lies on the bed and
 * translates it to z ≥ 0 (print orientation).
 */
function flipLidForPrint(lid: Shape3D): Shape3D {
  const flipped = lid.rotate(180, [0, 0, 0], [1, 0, 0])
  if (flipped !== lid) deleteShape(lid)
  const bottomZ = flipped.boundingBox.bounds[0]![2]!
  const placed = flipped.translate(0, 0, -bottomZ)
  if (placed !== flipped) deleteShape(flipped)
  return placed
}

/**
 * Stands the flat divider in the center slot: rotate +90° around X (height
 * becomes Z with the tab up, art faces the cavity −… +Y side), lift onto
 * the floor top and center the thickness on y = 0.
 */
function placeDividerInAssembly(build: CardBoxArtPartBuild): Shape3D {
  const placed = transformArtBuild(build, (shape) => {
    const rotated = shape.rotate(90, [0, 0, 0], [1, 0, 0])
    if (rotated !== shape) deleteShape(shape)
    return rotated.translate(
      0,
      CARD_BOX_CONFIGURATION.dividerPlateThickness / 2,
      CARD_BOX_CONFIGURATION.floorThickness,
    )
  })
  return placed
}

/**
 * Seats the flat cover in the front channel: rotate +90° around X (height
 * becomes Z with the art facing the front), lift onto the floor top and
 * press the plate against the slot's outer face.
 */
function placeCoverInAssembly(
  build: CardBoxArtPartBuild,
  halfSketchY: number,
): Shape3D {
  const slotOuterY = -(halfSketchY + CARD_BOX_CHANNEL_SLOT_DEPTH)
  const plateThickness = CARD_BOX_CONFIGURATION.coverPlateThickness
  return transformArtBuild(build, (shape) => {
    const rotated = shape.rotate(90, [0, 0, 0], [1, 0, 0])
    if (rotated !== shape) deleteShape(shape)
    return rotated.translate(
      0,
      slotOuterY + plateThickness,
      CARD_BOX_CONFIGURATION.floorThickness,
    )
  })
}

/** Transforms each solid of an art build (body + accent when present) and
 * returns them as one compound so the assembly shows the art too. */
function transformArtBuild(
  build: CardBoxArtPartBuild,
  transform: (shape: Shape3D) => Shape3D,
): Shape3D {
  if (build.kind === 'single') return transform(build.shape)
  const body = transform(build.body)
  const accent = transform(build.accent)
  const compound = makeCompound([body, accent]).asShape3D()
  deleteShape(body)
  deleteShape(accent)
  return compound
}

async function buildAssembly(
  parameters: CardBoxParameters,
  coverSvg: CardBoxSvgOutlineData | undefined,
): Promise<Shape3D> {
  const box = buildCardBoxBox(parameters)
  const lid = buildCardBoxLid(parameters)
  let divider: Shape3D | null = null
  let cover: Shape3D | null = null
  try {
    const dividerBuild = await buildCardBoxDivider(parameters)
    const coverBuild = await buildCardBoxCover(parameters, coverSvg)
    const t = CARD_BOX_CONFIGURATION.wallThickness
    const halfSketchY = (parameters.storageDepth + 2 * t - 1.8) / 2
    divider = placeDividerInAssembly(dividerBuild)
    cover = placeCoverInAssembly(coverBuild, halfSketchY)
  } catch (error) {
    deleteShape(box)
    deleteShape(lid)
    deleteShape(divider)
    deleteShape(cover)
    throw error
  }
  const compound = makeCompound([box, lid, divider, cover]).asShape3D()
  for (const part of [box, lid, divider, cover]) deleteShape(part)
  return compound
}

async function buildPrintPart(
  parameters: CardBoxParameters,
  coverSvg: CardBoxSvgOutlineData | undefined,
): Promise<CardBoxMultipartBuild> {
  switch (parameters.part) {
    case 'box':
      return { shape: buildCardBoxBox(parameters) }
    case 'lid':
      return { shape: flipLidForPrint(buildCardBoxLid(parameters)) }
    case 'divider':
    case 'cover': {
      const build =
        parameters.part === 'divider'
          ? await buildCardBoxDivider(parameters)
          : await buildCardBoxCover(parameters, coverSvg)
      if (build.kind === 'single') {
        return { shape: build.shape }
      }
      return {
        // STEP/STL export the combined geometry (label-card precedent);
        // the separated parts ride along for two-color 3MF.
        shape: combinedArtShape(build.body, build.accent),
        parts: [
          { name: 'body', shape: build.body },
          { name: 'accent', shape: build.accent },
        ],
      }
    }
    case 'assembly':
    default:
      throw new Error('CARD_BOX_ASSEMBLY_EXPORT_FORBIDDEN')
  }
}

/**
 * Dispatches a card-box build by part. Single parts return the print
 * orientation (z ≥ 0 on the bed); `assembly` returns the compound of all
 * four parts in the assembled frame. Flat divider/cover builds with accent
 * art additionally return body/accent parts for two-color 3MF export.
 * `coverSvg` carries the cleaned SVG outlines from the dedicated storage
 * when the cover uses imported art.
 */
export async function buildCardBox(
  parameters: CardBoxParameters,
  coverSvg?: CardBoxSvgOutlineData,
): Promise<CardBoxMultipartBuild> {
  if (!isCardBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:card-box')
  }
  if (parameters.part === 'assembly') {
    return { shape: await buildAssembly(parameters, coverSvg) }
  }
  return buildPrintPart(parameters, coverSvg)
}
