import {
  cast,
  getOC,
  isShape3D,
  makeBox,
  makeCylinder,
  makePolygon,
  Sketch,
  type Shape3D,
} from 'replicad'
import {
  boundsForModel,
  HEXAGONAL_COLUMN_CONFIGURATION,
  validateModelParameters,
  type HexagonalColumnParameters,
  type ModelId,
  type ModelParameters,
  type ModelParameterValues,
} from '../../cad-contract/units'

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

function boxEnvelope(model: ModelParameters): Shape3D {
  const bounds = boundsForModel(model)
  return makeBox(bounds.min, bounds.max)
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

function stackableCylinderProxy(model: ModelParameters): Shape3D {
  const bounds = boundsForModel(model)
  const radius = (bounds.max[0] - bounds.min[0]) / 2
  const height = bounds.max[2] - bounds.min[2]
  return makeCylinder(radius, height, [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    bounds.min[2],
  ])
}

/**
 * Builds the planning-grade proxy B-Rep for a scene instance: an
 * envelope-level representation that omits fine details (cell cutouts,
 * fillets, hole arrays, text). Most components use the analytic bounds box;
 * shape-defining silhouettes (hexagonal columns, cylinders) keep their
 * outline. No canonical assets are required.
 */
export function buildProxyBRep(
  modelId: ModelId,
  parameters: ModelParameterValues,
): Shape3D {
  const validation = validateModelParameters(modelId, parameters)
  if (!validation.valid) {
    throw new Error(`MODEL_PARAMETERS_INVALID:${modelId}`)
  }
  const model = validation.value
  if (modelId === 'hexagonal-column') {
    return hexagonalColumnProxy(model.parameters as HexagonalColumnParameters)
  }
  if (modelId === 'opengrid-stackable-cylinder') {
    return stackableCylinderProxy(model)
  }
  return boxEnvelope(model)
}
