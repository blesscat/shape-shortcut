import { deserializeShape, makeCompound, type Shape3D } from 'replicad'
import {
  CARD_BOX_CONFIGURATION,
  cardBoxOuterDepth,
  gameBoxDividerStyleKey,
  gameBoxDividerTabPositionKey,
  gameBoxDividerTextKey,
  gameBoxModuleDiceCountKey,
  gameBoxModuleDiceSizeKey,
  gameBoxPartDividerOrdinal,
  gameBoxPartModuleIndex,
  gameBoxStorageDepth,
  isGameBoxParameters,
  type CardBoxParameters,
  type CardBoxSvgOutlineData,
  type GameBoxDividerIndex,
  type GameBoxParameters,
} from '../../../cad-contract/units'
import { deleteShape } from '../../lifetime/dispose'
import {
  CARD_BOX_CHANNEL_SLOT_DEPTH,
  buildCardBoxBoxFromGeometry,
} from '../card-box/box'
import { flipLidForPrint } from '../card-box/builder'
import {
  buildCardBoxDivider,
  buildCardBoxDividerFromGeometry,
  type CardBoxArtPartBuild,
} from '../card-box/divider'
import { buildCardBoxLidFromGeometry } from '../card-box/lid'
import { buildCardBoxCover } from './cover'
import { buildGameBoxDiceHolder } from './dice-holder'
import {
  gameBoxGeometryOf,
  gameBoxModulePlacements,
  type GameBoxDicePlacement,
  type GameBoxGeometry,
} from './geometry'

/**
 * The result of a game-box build. Art parts (the cover, a labelled divider
 * card) additionally carry the separated body/accent solids for two-color
 * 3MF export; every other build only carries the shape.
 */
export type GameBoxBuild = {
  shape: Shape3D
  parts?: Array<{ name: 'body' | 'accent'; shape: Shape3D }>
}

/** Tiny shape helpers shared by the art paths. */
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
 * Re-raises an error from a reused card-box builder with the game-box
 * message prefix, so game-box owns its Worker error rules and
 * `retire-card-box` can delete card-box's rules untouched. Unknown errors
 * are rethrown unchanged.
 */
function wrapGameBoxArtError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('CARD_BOX_DIVIDER_TEXT_TOO_WIDE')) {
    throw new Error('GAME_BOX_DIVIDER_TEXT_TOO_WIDE')
  }
  if (message.includes('CARD_BOX_COVER_ART_OUTSIDE_SAFE_AREA')) {
    throw new Error('GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA')
  }
  if (message.includes('CARD_BOX_SVG_')) {
    throw new Error(message.replaceAll('CARD_BOX_SVG_', 'GAME_BOX_SVG_'))
  }
  throw error
}

/**
 * The card-box-shaped parameter view the reused art builders read. The
 * cover builder ignores the storage depth and the divider fields; the
 * divider builder ignores the cover fields. Filling them from the game-box
 * snapshot (or its defaults) keeps the reused builders untouched.
 */
function cardBoxArtParameters(
  parameters: GameBoxParameters,
  part: 'cover' | 'divider',
  dividerIndex?: GameBoxDividerIndex,
): CardBoxParameters {
  return {
    part,
    cardWidth: parameters.cardWidth,
    cardHeight: parameters.cardHeight,
    storageDepth: gameBoxStorageDepth(parameters),
    dividerTabPosition:
      dividerIndex === undefined
        ? CARD_BOX_CONFIGURATION.defaultTabPosition
        : parameters[gameBoxDividerTabPositionKey(dividerIndex)],
    dividerText:
      dividerIndex === undefined
        ? ''
        : parameters[gameBoxDividerTextKey(dividerIndex)],
    dividerStyle:
      dividerIndex === undefined
        ? CARD_BOX_CONFIGURATION.defaultStyle
        : parameters[gameBoxDividerStyleKey(dividerIndex)],
    coverTitle: parameters.coverTitle,
    coverTitleTextHeight: parameters.coverTitleTextHeight,
    coverSubtitle: parameters.coverSubtitle,
    coverSubtitleTextHeight: parameters.coverSubtitleTextHeight,
    coverSvgWidth: parameters.coverSvgWidth,
    coverVerticalPosition: parameters.coverVerticalPosition,
    coverStyle: parameters.coverStyle,
    usesCoverSvg: parameters.usesCoverSvg,
    coverSvgFingerprint: parameters.coverSvgFingerprint,
  }
}

/** Single art part export: combined geometry plus the separated parts. */
function artPartExport(build: CardBoxArtPartBuild): GameBoxBuild {
  if (build.kind === 'single') {
    return { shape: build.shape }
  }
  return {
    // STEP/STL export the combined geometry (label-card precedent); the
    // separated parts ride along for two-color 3MF.
    shape: combinedArtShape(build.body, build.accent),
    parts: [
      { name: 'body', shape: build.body },
      { name: 'accent', shape: build.accent },
    ],
  }
}

/**
 * A blank card on the default tab is the plain plate, built from the
 * geometry alone; any other card goes through the reused labelled builder.
 */
async function buildDividerCardForBoundary(
  parameters: GameBoxParameters,
  geometry: GameBoxGeometry,
  dividerIndex: GameBoxDividerIndex,
): Promise<CardBoxArtPartBuild> {
  if (isPlainDivider(parameters, dividerIndex)) {
    return {
      kind: 'single',
      shape: buildCardBoxDividerFromGeometry(geometry.cardBox),
    }
  }
  return buildDividerCard(parameters, dividerIndex)
}

async function buildDividerCard(
  parameters: GameBoxParameters,
  dividerIndex: GameBoxDividerIndex,
): Promise<CardBoxArtPartBuild> {
  try {
    return await buildCardBoxDivider(
      cardBoxArtParameters(parameters, 'divider', dividerIndex),
    )
  } catch (error) {
    wrapGameBoxArtError(error)
  }
}

async function buildCoverCard(
  parameters: GameBoxParameters,
  coverSvg: CardBoxSvgOutlineData | undefined,
): Promise<CardBoxArtPartBuild> {
  try {
    return await buildCardBoxCover(
      cardBoxArtParameters(parameters, 'cover'),
      coverSvg,
    )
  } catch (error) {
    wrapGameBoxArtError(error)
  }
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

function disposeArtBuild(build: CardBoxArtPartBuild): void {
  if (build.kind === 'single') {
    deleteShape(build.shape)
    return
  }
  deleteShape(build.body)
  deleteShape(build.accent)
}

/**
 * Stands the flat divider plate in its slot: rotate +90° around X (the
 * height becomes Z with the tab up), lift it onto the floor top and centre
 * its thickness on the divider position. Labelled builds keep their accent
 * solid, so the assembly shows the label too.
 */
function placeDividerInAssembly(
  build: CardBoxArtPartBuild,
  y: number,
): Shape3D {
  return transformArtBuild(build, (shape) => {
    const rotated = shape.rotate(90, [0, 0, 0], [1, 0, 0])
    if (rotated !== shape) deleteShape(shape)
    return rotated.translate(
      0,
      y + CARD_BOX_CONFIGURATION.dividerPlateThickness / 2,
      CARD_BOX_CONFIGURATION.floorThickness,
    )
  })
}

/**
 * Seats the flat cover in the front channel: rotate +90° around X (height
 * becomes Z with the art facing the front), lift onto the floor top and
 * press the plate against the slot's outer face. The card-box placement,
 * at the game-box derived depth.
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

/**
 * Builds the dice holder in its installed state: the tenons stand in the
 * divider slots of the box walls, so the holder is built at its natural
 * width.
 */
function buildInstalledDiceHolder(
  parameters: GameBoxParameters,
  placement: GameBoxDicePlacement,
): Shape3D {
  const diceSize = parameters[gameBoxModuleDiceSizeKey(placement.index)]
  const diceCount = parameters[gameBoxModuleDiceCountKey(placement.index)]
  const holder = buildGameBoxDiceHolder({
    cardWidth: parameters.cardWidth,
    cardHeight: parameters.cardHeight,
    diceSize,
    diceCount,
  })
  return holder.translate(
    0,
    placement.holderFrontY,
    CARD_BOX_CONFIGURATION.floorThickness,
  )
}

/** A blank card on the default tab is the plain plate: geometry-only path. */
function isPlainDivider(
  parameters: GameBoxParameters,
  dividerIndex: GameBoxDividerIndex,
): boolean {
  return (
    parameters[gameBoxDividerTextKey(dividerIndex)].trim() === '' &&
    parameters[gameBoxDividerTabPositionKey(dividerIndex)] ===
      CARD_BOX_CONFIGURATION.defaultTabPosition
  )
}

/**
 * The assembly in the assembled frame: the box, the lid, one divider per
 * pair of neighbouring card modules (each with its own label art), one dice
 * holder per dice module and the cover seated in the front channel. No
 * divider stands next to a dice holder: the holder is its own divider.
 *
 * Every part is built inside the guarded region, so a failing build frees
 * the parts it already created.
 */
async function buildAssembly(
  parameters: GameBoxParameters,
  geometry: GameBoxGeometry,
  coverSvg: CardBoxSvgOutlineData | undefined,
): Promise<Shape3D> {
  const parts: Shape3D[] = []
  const artBuilds: CardBoxArtPartBuild[] = []
  try {
    parts.push(
      buildCardBoxBoxFromGeometry(geometry.cardBox, geometry.slotCentres),
    )
    parts.push(buildCardBoxLidFromGeometry(geometry.cardBox))
    for (const [position, y] of geometry.dividerCentres.entries()) {
      const ordinal = (position + 1) as GameBoxDividerIndex
      const build = await buildDividerCardForBoundary(
        parameters,
        geometry,
        ordinal,
      )
      artBuilds.push(build)
      parts.push(placeDividerInAssembly(build, y))
    }
    for (const placement of gameBoxModulePlacements(parameters)) {
      if (placement.type !== 'dice') continue
      parts.push(buildInstalledDiceHolder(parameters, placement))
    }
    const coverBuild = await buildCoverCard(parameters, coverSvg)
    artBuilds.push(coverBuild)
    const halfSketchY = cardBoxOuterDepth(geometry.cardBox.storageDepth) / 2
    parts.push(placeCoverInAssembly(coverBuild, halfSketchY))
  } catch (error) {
    for (const part of parts) deleteShape(part)
    for (const build of artBuilds) disposeArtBuild(build)
    throw error
  }
  const compound = makeCompound(parts).asShape3D()
  for (const part of parts) deleteShape(part)
  for (const build of artBuilds) disposeArtBuild(build)
  return compound
}

/**
 * Builds the part the parameters select. Single parts come back in their
 * print orientation (z ≥ 0 on the bed); `assembly` returns the compound of
 * all parts in the assembled frame. Cover and labelled divider builds with
 * accent art additionally return body/accent parts for two-color 3MF
 * export. `coverSvg` carries the cleaned SVG outlines from the dedicated
 * storage when the cover uses imported art.
 */
export async function buildGameBox(
  parameters: GameBoxParameters,
  coverSvg?: CardBoxSvgOutlineData,
): Promise<GameBoxBuild> {
  if (!isGameBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:game-box')
  }
  const geometry = gameBoxGeometryOf(parameters)
  if (parameters.part === 'assembly') {
    return { shape: await buildAssembly(parameters, geometry, coverSvg) }
  }
  const moduleIndex = gameBoxPartModuleIndex(parameters.part)
  if (moduleIndex !== null) {
    const diceSize = parameters[gameBoxModuleDiceSizeKey(moduleIndex)]
    const diceCount = parameters[gameBoxModuleDiceCountKey(moduleIndex)]
    return {
      shape: buildGameBoxDiceHolder({
        cardWidth: parameters.cardWidth,
        cardHeight: parameters.cardHeight,
        diceSize,
        diceCount,
      }),
    }
  }
  const dividerOrdinal = gameBoxPartDividerOrdinal(parameters.part)
  if (dividerOrdinal !== null) {
    const build = await buildDividerCardForBoundary(
      parameters,
      geometry,
      dividerOrdinal,
    )
    return artPartExport(build)
  }
  switch (parameters.part) {
    case 'box':
      return {
        shape: buildCardBoxBoxFromGeometry(
          geometry.cardBox,
          geometry.slotCentres,
        ),
      }
    case 'lid':
      return {
        shape: flipLidForPrint(buildCardBoxLidFromGeometry(geometry.cardBox)),
      }
    case 'cover':
      return artPartExport(await buildCoverCard(parameters, coverSvg))
    default:
      throw new Error('GAME_BOX_PART_INVALID')
  }
}
