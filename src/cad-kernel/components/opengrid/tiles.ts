import { makeBox, Sketcher, type Shape3D } from 'replicad'
import type {
  HalfCellX,
  HalfCellY,
  OpenGridParameters,
  OpenGridPoint2D,
  OpenGridVariant,
} from '../../../cad-contract/units'
import { HALF_CELL_CONFIGURATION } from '../../../cad-contract/units'
import {
  cellCenterForOpenGrid,
  openGridCornerProfile,
  openGridLiteCornerProfile,
  openGridLiteTileProfile,
  openGridNominalBoardConfiguration,
  openGridProfileConstants,
  openGridTileProfile,
  OPENGRID_CONFIGURATION,
} from './profile'
import {
  measureBooleanInScope,
  type BooleanOperationScope,
} from '../../boolean-progress'
import { deleteShape } from '../../lifetime/dispose'
import { fuseBalanced } from './assembly'
import {
  assertGenerationCurrent,
  yieldAtSafeBoundary,
  type OpenGridBuildContext,
} from './builder'
function extrudeProfile(
  plane: 'YZ' | 'XZ',
  origin: [number, number, number],
  profile: readonly [number, number][],
  distance: number,
  direction: [number, number, number],
): Shape3D {
  const sketcher = new Sketcher(plane, origin)
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const first = profile[0]
    if (!first) throw new Error('OPENGRID_PROFILE_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of profile.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(distance, { extrusionDirection: direction })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function buildRail(
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
): Shape3D {
  const tileSize = OPENGRID_CONFIGURATION.gridPitch
  const halfTile = tileSize / 2
  const profile =
    variant === 'Lite'
      ? openGridLiteTileProfile()
      : openGridTileProfile(variant, thickness)
  return extrudeProfile(
    'YZ',
    [-halfTile, -halfTile, 0],
    profile,
    tileSize,
    [1, 0, 0],
  )
}

function buildCornerNode(
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
): Shape3D {
  const constants = openGridProfileConstants(
    OPENGRID_CONFIGURATION.gridPitch,
    thickness,
  )
  const profile =
    variant === 'Lite'
      ? openGridLiteCornerProfile()
      : openGridCornerProfile(thickness)
  const shape = extrudeProfile(
    'XZ',
    [0, -constants.cornerOffset, 0],
    profile,
    constants.cornerOffset * 2,
    [0, 1, 0],
  )
  const rotated = shape.rotate(45, [0, 0, 0], [0, 0, 1])
  if (rotated !== shape) deleteShape(shape)
  const translated = rotated.translate(
    -OPENGRID_CONFIGURATION.gridPitch / 2,
    -OPENGRID_CONFIGURATION.gridPitch / 2,
    0,
  )
  if (translated !== rotated) deleteShape(rotated)
  return translated
}

function cloneRotated(
  shape: Shape3D,
  quarterTurns: number,
  center: [number, number, number] = [0, 0, 0],
): Shape3D {
  const clone = shape.clone()
  if (quarterTurns !== 0) {
    const rotated = clone.rotate(quarterTurns * 90, center, [0, 0, 1])
    if (rotated !== clone) deleteShape(clone)
    return rotated
  }
  return clone
}

async function buildCanonicalTile(
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const rail = buildRail(variant, thickness)
  const parts: Shape3D[] = [rail]
  for (let quarterTurns = 1; quarterTurns < 4; quarterTurns += 1) {
    parts.push(cloneRotated(rail, quarterTurns))
  }
  const clip = makeBox(
    [
      -OPENGRID_CONFIGURATION.gridPitch / 2,
      -OPENGRID_CONFIGURATION.gridPitch / 2,
      -0.01,
    ],
    [
      OPENGRID_CONFIGURATION.gridPitch / 2,
      OPENGRID_CONFIGURATION.gridPitch / 2,
      thickness + 0.01,
    ],
  )
  try {
    const corner = buildCornerNode(variant, thickness)
    const intersectionScope = context.booleanOperations?.createScope(4)
    for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
      const rotated = cloneRotated(corner, quarterTurns)
      const clipped = measureBooleanInScope(
        intersectionScope,
        'intersect',
        () => rotated.intersect(clip),
      )
      if (clipped !== rotated) deleteShape(rotated)
      parts.push(clipped)
    }
    deleteShape(corner)
  } finally {
    deleteShape(clip)
  }
  const canonical = await fuseBalanced(parts, context)
  return canonical
}

export function buildOpenGridCanonicalTile(
  variant: OpenGridVariant,
  context: OpenGridBuildContext = {},
): Promise<Shape3D> {
  const surfaceVariant = variant === 'Hybrid' ? 'Heavy' : variant
  const thickness =
    surfaceVariant === 'Lite'
      ? OPENGRID_CONFIGURATION.variants.Lite.thickness
      : OPENGRID_CONFIGURATION.variants.Full.thickness
  return buildCanonicalTile(surfaceVariant, thickness, context)
}

type HalfExtensionTileSpec = {
  center: OpenGridPoint2D
  width: number
  depth: number
  interfaceX: HalfCellX | null
  interfaceY: HalfCellY | null
}

type HalfExtensionTileFactory = (
  spec: HalfExtensionTileSpec,
) => Promise<Shape3D>

function hasOpenGridHalfCell(parameters: OpenGridParameters): boolean {
  return parameters.halfCellX !== 'none' || parameters.halfCellY !== 'none'
}

function halfExtensionTileSpecs(
  parameters: OpenGridParameters,
): HalfExtensionTileSpec[] {
  const board = openGridNominalBoardConfiguration(parameters)
  const specs: HalfExtensionTileSpec[] = []
  const fullXCenters: number[] = []
  const fullYCenters: number[] = []

  for (let column = 0; column < parameters.columns; column += 1) {
    fullXCenters.push(cellCenterForOpenGrid(parameters, 0, column)[0])
  }
  for (let row = 0; row < parameters.rows; row += 1) {
    fullYCenters.push(cellCenterForOpenGrid(parameters, row, 0)[1])
  }

  if (parameters.halfCellX !== 'none') {
    const centerX =
      parameters.halfCellX === 'left'
        ? -board.width / 2 + HALF_CELL_CONFIGURATION.halfPitch / 2
        : board.width / 2 - HALF_CELL_CONFIGURATION.halfPitch / 2
    for (const centerY of fullYCenters) {
      specs.push({
        center: [centerX, centerY],
        width: HALF_CELL_CONFIGURATION.halfPitch,
        depth: HALF_CELL_CONFIGURATION.fullPitch,
        interfaceX: parameters.halfCellX,
        interfaceY: null,
      })
    }
  }

  if (parameters.halfCellY !== 'none') {
    const centerY =
      parameters.halfCellY === 'top'
        ? board.depth / 2 - HALF_CELL_CONFIGURATION.halfPitch / 2
        : -board.depth / 2 + HALF_CELL_CONFIGURATION.halfPitch / 2
    for (const centerX of fullXCenters) {
      specs.push({
        center: [centerX, centerY],
        width: HALF_CELL_CONFIGURATION.fullPitch,
        depth: HALF_CELL_CONFIGURATION.halfPitch,
        interfaceX: null,
        interfaceY: parameters.halfCellY,
      })
    }
  }

  if (parameters.halfCellX !== 'none' && parameters.halfCellY !== 'none') {
    const centerX =
      parameters.halfCellX === 'left'
        ? -board.width / 2 + HALF_CELL_CONFIGURATION.halfPitch / 2
        : board.width / 2 - HALF_CELL_CONFIGURATION.halfPitch / 2
    const centerY =
      parameters.halfCellY === 'top'
        ? board.depth / 2 - HALF_CELL_CONFIGURATION.halfPitch / 2
        : -board.depth / 2 + HALF_CELL_CONFIGURATION.halfPitch / 2
    specs.push({
      center: [centerX, centerY],
      width: HALF_CELL_CONFIGURATION.halfPitch,
      depth: HALF_CELL_CONFIGURATION.halfPitch,
      interfaceX: parameters.halfCellX,
      interfaceY: parameters.halfCellY,
    })
  }

  return specs
}

function translateShape(shape: Shape3D, x: number, y: number, z = 0): Shape3D {
  const translated = shape.translate(x, y, z)
  if (translated !== shape) deleteShape(shape)
  return translated
}

function clipShapeToBox(
  shape: Shape3D,
  clip: Shape3D,
  scope: BooleanOperationScope | undefined,
): Shape3D {
  const clipped = measureBooleanInScope(scope, 'intersect', () =>
    shape.intersect(clip),
  )
  if (clipped !== shape) deleteShape(shape)
  return clipped
}

type HalfBoundaryTileSource = {
  rail: Shape3D
  corner: Shape3D
}

async function buildHalfBoundaryTile(
  source: HalfBoundaryTileSource,
  thickness: number,
  width: number,
  depth: number,
  interfaceX: HalfCellX | null,
  interfaceY: HalfCellY | null,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  const halfTile = OPENGRID_CONFIGURATION.gridPitch / 2
  const parts: Shape3D[] = []
  let clip: Shape3D | null = null

  try {
    const railPlacements: Array<[number, number, number]> = [
      [0, -depth / 2 + halfTile, 0],
      [0, depth / 2 - halfTile, 2],
      [width / 2 - halfTile, 0, 1],
      [-width / 2 + halfTile, 0, 3],
    ]
    for (const [x, y, quarterTurns] of railPlacements) {
      const placed = cloneRotated(source.rail, quarterTurns)
      parts.push(translateShape(placed, x, y))
    }

    const currentAnchors: OpenGridPoint2D[] = [
      [-halfTile, -halfTile],
      [halfTile, -halfTile],
      [halfTile, halfTile],
      [-halfTile, halfTile],
    ]
    const targetAnchors: OpenGridPoint2D[] = [
      [-width / 2, -depth / 2],
      [width / 2, -depth / 2],
      [width / 2, depth / 2],
      [-width / 2, depth / 2],
    ]
    for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
      const placed = cloneRotated(source.corner, quarterTurns)
      const currentAnchor = currentAnchors[quarterTurns]
      const targetAnchor = targetAnchors[quarterTurns]
      if (!currentAnchor || !targetAnchor) {
        throw new Error('OPENGRID_HALF_CORNER_MISSING')
      }
      parts.push(
        translateShape(
          placed,
          targetAnchor[0] - currentAnchor[0],
          targetAnchor[1] - currentAnchor[1],
        ),
      )
    }

    clip = makeBox(
      [-width / 2, -depth / 2, -0.01],
      [width / 2, depth / 2, thickness + 0.01],
    )
    const intersectionScope = context.booleanOperations?.createScope(
      parts.length,
    )
    const clippedParts = parts.map((part) =>
      clipShapeToBox(part, clip!, intersectionScope),
    )
    parts.length = 0
    parts.push(...clippedParts)
    const seamOverlap = 0.2
    if (interfaceX === 'left') {
      parts.push(
        makeBox(
          [width / 2 - seamOverlap, -depth / 2, 0],
          [width / 2 + seamOverlap, depth / 2, thickness],
        ),
      )
    }
    if (interfaceX === 'right') {
      parts.push(
        makeBox(
          [-width / 2 - seamOverlap, -depth / 2, 0],
          [-width / 2 + seamOverlap, depth / 2, thickness],
        ),
      )
    }
    if (interfaceY === 'bottom') {
      parts.push(
        makeBox(
          [-width / 2, depth / 2 - seamOverlap, 0],
          [width / 2, depth / 2 + seamOverlap, thickness],
        ),
      )
    }
    if (interfaceY === 'top') {
      parts.push(
        makeBox(
          [-width / 2, -depth / 2 - seamOverlap, 0],
          [width / 2, -depth / 2 + seamOverlap, thickness],
        ),
      )
    }
    return await fuseBalanced(parts, context)
  } catch (error) {
    for (const part of parts) deleteShape(part)
    throw error
  } finally {
    deleteShape(clip)
  }
}

async function addOfficialHalfCellExtensions(
  source: Shape3D,
  parameters: OpenGridParameters,
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
  zOffset: number,
  mirrorWithinLayer: boolean,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  if (!hasOpenGridHalfCell(parameters)) return source
  try {
    const extensionPieces = await buildOfficialHalfCellExtensionPieces(
      parameters,
      variant,
      thickness,
      zOffset,
      mirrorWithinLayer,
      context,
    )
    return await fuseBalanced([source, ...extensionPieces], context)
  } catch (error) {
    deleteShape(source)
    throw error
  }
}

async function buildOfficialHalfCellExtensionPieces(
  parameters: OpenGridParameters,
  variant: 'Full' | 'Lite' | 'Heavy',
  thickness: number,
  zOffset: number,
  mirrorWithinLayer: boolean,
  context: OpenGridBuildContext,
): Promise<Shape3D[]> {
  let rail: Shape3D | null = null
  let corner: Shape3D | null = null
  const cachePrototype = context.getOpenGridHalfCellPrototype
  try {
    rail = cachePrototype
      ? await cachePrototype(`rail:${variant}:${thickness}`, () =>
          buildRail(variant, thickness),
        )
      : buildRail(variant, thickness)
    corner = cachePrototype
      ? await cachePrototype(`corner:${variant}:${thickness}`, () =>
          buildCornerNode(variant, thickness),
        )
      : buildCornerNode(variant, thickness)
    const tileSource: HalfBoundaryTileSource = { rail, corner }
    return await buildHalfCellExtensionPieces(
      parameters,
      (spec) =>
        buildHalfBoundaryTile(
          tileSource,
          thickness,
          spec.width,
          spec.depth,
          spec.interfaceX,
          spec.interfaceY,
          context,
        ),
      `boundary:${variant}:${thickness}`,
      thickness,
      zOffset,
      mirrorWithinLayer,
      context,
    )
  } finally {
    if (!cachePrototype) {
      deleteShape(rail)
      deleteShape(corner)
    }
  }
}

async function buildHalfCellExtensionPieces(
  parameters: OpenGridParameters,
  tileFactory: HalfExtensionTileFactory,
  prototypeKeyPrefix: string,
  thickness: number,
  zOffset: number,
  mirrorWithinLayer: boolean,
  context: OpenGridBuildContext,
): Promise<Shape3D[]> {
  if (!hasOpenGridHalfCell(parameters)) return []

  const pieces: Shape3D[] = []
  const prototypes = new Map<string, Shape3D>()
  try {
    for (const spec of halfExtensionTileSpecs(parameters)) {
      assertGenerationCurrent(context)
      const prototypeKey = `${prototypeKeyPrefix}:${spec.width}:${spec.depth}:${spec.interfaceX ?? 'none'}:${spec.interfaceY ?? 'none'}`
      let prototype = prototypes.get(prototypeKey)
      if (!prototype) {
        prototype = context.getOpenGridHalfCellPrototype
          ? await context.getOpenGridHalfCellPrototype(prototypeKey, () =>
              tileFactory(spec),
            )
          : await tileFactory(spec)
        prototypes.set(prototypeKey, prototype)
      }
      let piece = prototype.clone()
      if (mirrorWithinLayer) {
        const mirrored = mirrorSurfaceWithinLayer(piece, thickness)
        if (mirrored !== piece) deleteShape(piece)
        piece = mirrored
      }
      pieces.push(
        translateShape(piece, spec.center[0], spec.center[1], zOffset),
      )
      await yieldAtSafeBoundary(context)
    }
    return pieces
  } catch (error) {
    for (const piece of pieces) deleteShape(piece)
    throw error
  } finally {
    if (!context.getOpenGridHalfCellPrototype) {
      for (const prototype of prototypes.values()) deleteShape(prototype)
    }
  }
}

async function addHalfCellExtensions(
  source: Shape3D,
  parameters: OpenGridParameters,
  tileFactory: HalfExtensionTileFactory,
  thickness: number,
  zOffset: number,
  mirrorWithinLayer: boolean,
  context: OpenGridBuildContext,
): Promise<Shape3D> {
  if (!hasOpenGridHalfCell(parameters)) return source
  try {
    const extensionPieces = await buildHalfCellExtensionPieces(
      parameters,
      tileFactory,
      'heavy-bridge',
      thickness,
      zOffset,
      mirrorWithinLayer,
      context,
    )
    return await fuseBalanced([source, ...extensionPieces], context)
  } catch (error) {
    deleteShape(source)
    throw error
  }
}

function mirrorSurfaceWithinLayer(shape: Shape3D, thickness: number): Shape3D {
  return shape.mirror([0, 0, 1], [0, 0, thickness / 2])
}

export {
  addHalfCellExtensions,
  addOfficialHalfCellExtensions,
  buildCanonicalTile,
  buildHalfCellExtensionPieces,
  buildOfficialHalfCellExtensionPieces,
  cloneRotated,
  extrudeProfile,
  halfExtensionTileSpecs,
  hasOpenGridHalfCell,
  mirrorSurfaceWithinLayer,
}
