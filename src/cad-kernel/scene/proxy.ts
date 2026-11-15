import {
  cast,
  getOC,
  isShape3D,
  makeBox,
  makePolygon,
  Sketch,
  type Shape3D,
} from 'replicad'
import {
  cardBoxOuterDepth,
  cardBoxDividerTabCenterX,
  cardBoxDividerWidth,
  cardBoxInteriorWidth,
  cardBoxOuterWidth,
  CARD_BOX_CONFIGURATION,
  HEXAGONAL_COLUMN_CONFIGURATION,
  gameBoxDiceHolderOuterWidth,
  gameBoxDiceHolderThickness,
  gameBoxModuleDiceSizeKey,
  gameBoxPartModuleIndex,
  gameBoxStorageDepth,
  validateModelParameters,
  type CardBoxParameters,
  type GameBoxModuleIndex,
  type GameBoxParameters,
  type HexagonalColumnParameters,
  type ModelId,
  type ModelParameterValues,
} from '../../cad-contract/units'
import { buildModelBRep, type KernelBuildContext } from '../model'
import { GAME_BOX_DICE_HOLDER } from '../components/game-box/dice-holder'
import {
  gameBoxGeometryOf,
  gameBoxModulePlacements,
} from '../components/game-box/geometry'

/**
 * Half extents of the hexagonal-column planning envelope. They match the
 * `boundsForHexagonalColumn` cross-section extents (X `4.243524`, Y `4.7`)
 * so the proxy mesh bounding box stays within ±0.01 mm of the analytic
 * bounds while keeping the recognizable hexagonal outline.
 */
const HEX_PROXY_HALF_X = 2.121762
const HEX_PROXY_HALF_Y = 2.35

type HexPoint = [number, number]

const HEX_PROXY_PROFILE: readonly HexPoint[] = [
  [0, HEX_PROXY_HALF_Y],
  [HEX_PROXY_HALF_X, HEX_PROXY_HALF_Y / 2],
  [HEX_PROXY_HALF_X, -HEX_PROXY_HALF_Y / 2],
  [0, -HEX_PROXY_HALF_Y],
  [-HEX_PROXY_HALF_X, -HEX_PROXY_HALF_Y / 2],
  [-HEX_PROXY_HALF_X, HEX_PROXY_HALF_Y / 2],
]

/**
 * Preview parameter overrides that turn off material-saving (省料) honeycomb
 * features so the preview renders the component's characteristic geometry
 * without the expensive lattice systems. The instance's real parameters —
 * including these features — are unchanged for export.
 */
export function parametersForScenePreview(
  modelId: ModelId,
  parameters: ModelParameterValues,
): ModelParameterValues {
  const stripped = { ...parameters } as Record<string, unknown>
  if (
    modelId === 'opengrid-divider' ||
    modelId === 'opengrid-stackable-box' ||
    modelId === 'opengrid-open-shelf'
  ) {
    stripped.honeycombMode = false
  }
  return stripped as ModelParameterValues
}

function compoundShapes(shapes: Shape3D[]): Shape3D {
  if (shapes.length === 1) return shapes[0]
  const oc = getOC()
  const builder = new oc.TopoDS_Builder()
  const compound = new oc.TopoDS_Compound()
  builder.MakeCompound(compound)
  for (const shape of shapes) {
    builder.Add(compound, shape.wrapped)
  }
  const castResult = cast(compound)
  if (!isShape3D(castResult)) {
    throw new Error('SCENE_PROXY_COMPOUND_INVALID')
  }
  return castResult
}

function hexColumnPrism(parameters: HexagonalColumnParameters): Shape3D {
  const points = HEX_PROXY_PROFILE.map(
    (point) => [point[0], point[1], 0] as [number, number, number],
  )
  // The Sketch consumes the polygon face during extrusion; the face must not
  // be deleted separately (replicad owns it from here on).
  const sketch = new Sketch(makePolygon(points).outerWire())
  const prism = sketch.extrude(parameters.height)
  if (parameters.orientation === 'lying') {
    // Rotation about Y maps the extrusion axis onto X; the hexagon profile
    // ends up centered on Z, while the analytic bounds keep the base at Z=0.
    // replicad transforms return fresh shape wrappers; always use the value.
    return prism
      .rotate(90, [0, 0, 0], [0, 1, 0])
      .translate(-parameters.height / 2, 0, HEX_PROXY_HALF_X)
  }
  return prism
}

function hexagonalColumnProxy(parameters: HexagonalColumnParameters): Shape3D {
  const extentY = HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentY
  const gap = parameters.gap
  const rowExtent = extentY * parameters.count + gap * (parameters.count - 1)
  const prisms: Shape3D[] = []
  for (let index = 0; index < parameters.count; index += 1) {
    const prism = hexColumnPrism(parameters)
    const offset = -rowExtent / 2 + extentY / 2 + index * (extentY + gap)
    prisms.push(prism.translate(0, offset, 0))
  }
  // compoundShapes returns the single prism untouched.
  return compoundShapes(prisms)
}

/**
 * Simplified card-box silhouette: the hollow wall tube with floor, the lid
 * plate and the interior divider as plain boxes — far cheaper than the full
 * rails/grooves/text build, and enough for planning previews.
 */
function cardBoxProxy(parameters: CardBoxParameters): Shape3D {
  const c = CARD_BOX_CONFIGURATION
  const t = c.wallThickness
  const outerWidth = cardBoxOuterWidth(parameters.cardWidth)
  const outerDepth = cardBoxOuterDepth(parameters.storageDepth)
  const height = parameters.cardHeight + 2
  const halfW = outerWidth / 2
  const halfD = outerDepth / 2
  const showTube = parameters.part === 'assembly' || parameters.part === 'box'
  const shapes: Shape3D[] = []
  if (showTube) {
    shapes.push(
      // Floor
      makeBox([-halfW, -halfD, 0], [halfW, halfD, c.floorThickness]) as Shape3D,
      // Front / back walls
      makeBox([-halfW, -halfD, 0], [halfW, -halfD + t, height]) as Shape3D,
      makeBox([-halfW, halfD - t, 0], [halfW, halfD, height]) as Shape3D,
      // Left / right walls
      makeBox(
        [-halfW, -halfD + t, 0],
        [-halfW + t, halfD - t, height],
      ) as Shape3D,
      makeBox(
        [halfW - t, -halfD + t, 0],
        [halfW, halfD - t, height],
      ) as Shape3D,
    )
  }
  if (parameters.part === 'assembly' || parameters.part === 'lid') {
    const lidZ =
      parameters.part === 'assembly' ? parameters.cardHeight + 7.2 : 0
    shapes.push(
      makeBox(
        [-halfW, -(halfD + 0.9), lidZ],
        [halfW, halfD + 0.9, lidZ + c.lidRoofThickness],
      ) as Shape3D,
    )
  }
  if (parameters.part === 'assembly' || parameters.part === 'divider') {
    // Assembly: the divider stands in the center slot. Single-part scene
    // preview: flat on the bed, matching the print-orientation bounds.
    const halfPlate = cardBoxDividerWidth(parameters.cardWidth) / 2
    const tabX = cardBoxDividerTabCenterX(
      parameters.dividerTabPosition,
      halfPlate * 2,
    )
    const tabMin = tabX - c.dividerTabBaseWidth / 2
    const tabMax = tabX + c.dividerTabBaseWidth / 2
    const bodyHeight = parameters.cardHeight
    const tabHeight = c.dividerTabHeight
    if (parameters.part === 'assembly') {
      const floor = c.floorThickness
      const halfThickness = c.dividerPlateThickness / 2
      shapes.push(
        makeBox(
          [-halfPlate, -halfThickness, floor],
          [halfPlate, halfThickness, floor + bodyHeight],
        ) as Shape3D,
        makeBox(
          [tabMin, -halfThickness, floor + bodyHeight],
          [tabMax, halfThickness, floor + bodyHeight + tabHeight],
        ) as Shape3D,
      )
    } else {
      shapes.push(
        makeBox(
          [-halfPlate, 0, 0],
          [halfPlate, bodyHeight, c.dividerPlateThickness],
        ) as Shape3D,
        makeBox(
          [tabMin, bodyHeight, 0],
          [tabMax, bodyHeight + tabHeight, c.dividerPlateThickness],
        ) as Shape3D,
      )
    }
  }
  if (parameters.part === 'assembly' || parameters.part === 'cover') {
    // Assembly: the cover stands in the front channel, art facing the
    // front. Single-part scene preview: flat on the bed, matching the
    // print-orientation contract bounds.
    if (parameters.part === 'assembly') {
      const channelOuterY = -(halfD + 0.85)
      shapes.push(
        makeBox(
          [-halfW + t, channelOuterY, c.floorThickness],
          [
            halfW - t,
            channelOuterY + c.coverPlateThickness,
            c.floorThickness + parameters.cardHeight,
          ],
        ) as Shape3D,
      )
    } else {
      shapes.push(
        makeBox(
          [-halfW + t, 0, 0],
          [halfW - t, parameters.cardHeight, c.coverPlateThickness],
        ) as Shape3D,
      )
    }
  }
  return compoundShapes(shapes)
}

/**
 * Simplified game-box silhouette: the hollow wall tube with floor, the lid
 * plate, the dividers on the module boundaries and the dice holders as
 * plain boxes — far cheaper than the full build, and enough for planning
 * previews.
 */
function gameBoxProxy(parameters: GameBoxParameters): Shape3D {
  const c = CARD_BOX_CONFIGURATION
  const t = c.wallThickness
  const storageDepth = gameBoxStorageDepth(parameters)
  const outerWidth = cardBoxOuterWidth(parameters.cardWidth)
  const outerDepth = cardBoxOuterDepth(storageDepth)
  const height = parameters.cardHeight + 2
  const halfW = outerWidth / 2
  const halfD = outerDepth / 2
  const showTube = parameters.part === 'assembly' || parameters.part === 'box'
  const shapes: Shape3D[] = []
  if (showTube) {
    shapes.push(
      // Floor
      makeBox([-halfW, -halfD, 0], [halfW, halfD, c.floorThickness]) as Shape3D,
      // Front / back walls
      makeBox([-halfW, -halfD, 0], [halfW, -halfD + t, height]) as Shape3D,
      makeBox([-halfW, halfD - t, 0], [halfW, halfD, height]) as Shape3D,
      // Left / right walls
      makeBox(
        [-halfW, -halfD + t, 0],
        [-halfW + t, halfD - t, height],
      ) as Shape3D,
      makeBox(
        [halfW - t, -halfD + t, 0],
        [halfW, halfD - t, height],
      ) as Shape3D,
    )
  }
  if (parameters.part === 'assembly' || parameters.part === 'lid') {
    const lidZ =
      parameters.part === 'assembly' ? parameters.cardHeight + 7.2 : 0
    shapes.push(
      makeBox(
        [-halfW, -(halfD + 0.9), lidZ],
        [halfW, halfD + 0.9, lidZ + c.lidRoofThickness],
      ) as Shape3D,
    )
  }
  if (parameters.part === 'assembly' || parameters.part === 'divider') {
    const halfPlate = cardBoxDividerWidth(parameters.cardWidth) / 2
    const bodyHeight = parameters.cardHeight
    const tabHeight = c.dividerTabHeight
    const halfThickness = c.dividerPlateThickness / 2
    if (parameters.part === 'assembly') {
      // The dividers stand on the module boundaries.
      for (const y of gameBoxGeometryOf(parameters).dividerCentres) {
        shapes.push(
          makeBox(
            [-halfPlate, y - halfThickness, c.floorThickness],
            [halfPlate, y + halfThickness, c.floorThickness + bodyHeight],
          ) as Shape3D,
        )
      }
    } else {
      // Single-part scene preview: flat on the bed, matching the
      // print-orientation contract bounds.
      const tabX = cardBoxDividerTabCenterX(c.defaultTabPosition, halfPlate * 2)
      shapes.push(
        makeBox(
          [-halfPlate, 0, 0],
          [halfPlate, bodyHeight, c.dividerPlateThickness],
        ) as Shape3D,
        makeBox(
          [tabX - c.dividerTabBaseWidth / 2, bodyHeight, 0],
          [
            tabX + c.dividerTabBaseWidth / 2,
            bodyHeight + tabHeight,
            c.dividerPlateThickness,
          ],
        ) as Shape3D,
      )
    }
  }
  const moduleIndex = gameBoxPartModuleIndex(parameters.part)
  if (parameters.part === 'assembly' || moduleIndex !== null) {
    for (const holder of gameBoxProxyHolders(parameters, moduleIndex)) {
      shapes.push(holder)
    }
  }
  return compoundShapes(shapes)
}

/**
 * The dice holders of the preview: in the assembly they stand between the
 * dividers of their module, the single part stands on the bed in its print
 * orientation.
 */
function gameBoxProxyHolders(
  parameters: GameBoxParameters,
  moduleIndex: GameBoxModuleIndex | null,
): Shape3D[] {
  const c = CARD_BOX_CONFIGURATION
  const holders: Shape3D[] = []
  for (const placement of gameBoxModulePlacements(parameters)) {
    if (placement.type !== 'dice') continue
    if (moduleIndex !== null && placement.index !== moduleIndex) continue
    const diceSize = parameters[gameBoxModuleDiceSizeKey(placement.index)]
    const thickness = gameBoxDiceHolderThickness(diceSize)
    const outerWidth =
      moduleIndex === null
        ? gameBoxDiceHolderOuterWidth(parameters.cardWidth)
        : cardBoxInteriorWidth(parameters.cardWidth) -
          GAME_BOX_DICE_HOLDER.pressedClearance
    const halfHolder = outerWidth / 2
    if (moduleIndex === null) {
      const y =
        placement.frontY + (placement.backY - placement.frontY - thickness) / 2
      holders.push(
        makeBox(
          [-halfHolder, y, c.floorThickness],
          [halfHolder, y + thickness, c.floorThickness + parameters.cardHeight],
        ) as Shape3D,
      )
      continue
    }
    holders.push(
      makeBox(
        [-halfHolder, 0, 0],
        [halfHolder, thickness, parameters.cardHeight],
      ) as Shape3D,
    )
  }
  return holders
}

/**
 * Builds the scene preview B-Rep for an instance. The preview renders the
 * component's real characteristic geometry through the production builders
 * (grid cutouts, openings, stacking rails, seats, wall-mount interfaces,
 * the stackable cylinder's rim and openings) with only the material-saving
 * (省料) honeycomb features turned off; the hexagonal column keeps its
 * dedicated silhouette, which is cheaper than a full build.
 */
export async function buildScenePreviewBRep(
  modelId: ModelId,
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  const validation = validateModelParameters(modelId, parameters)
  if (!validation.valid) {
    throw new Error(`MODEL_PARAMETERS_INVALID:${modelId}`)
  }
  const model = validation.value
  if (modelId === 'hexagonal-column') {
    return hexagonalColumnProxy(model.parameters as HexagonalColumnParameters)
  }
  if (modelId === 'card-box') {
    return cardBoxProxy(model.parameters as CardBoxParameters)
  }
  if (modelId === 'game-box') {
    return gameBoxProxy(model.parameters as GameBoxParameters)
  }
  return buildModelBRep(
    modelId,
    parametersForScenePreview(modelId, parameters),
    context,
  )
}
