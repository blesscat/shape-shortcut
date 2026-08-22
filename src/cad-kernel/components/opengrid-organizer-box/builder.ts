import {
  loft,
  makeCompound,
  makeCylinder,
  type Shape3D,
  Sketcher,
  sketchRoundedRectangle,
  type Wire,
} from 'replicad'
import {
  openGridOrganizerBoxLayoutFor,
  openGridOrganizerBoxDetachableIndicatorPlacementFor,
  openGridOrganizerBoxDetachableSocketPosesFor,
  openGridOrganizerBoxPolygonPointsFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridOrganizerBoxParameters,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import {
  addMountingSockets,
  applyStackingProfile,
} from '../opengrid-stackable-box/geometry'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import {
  assertGenerationCurrent,
  deleteShape,
  type OpenGridStackableBoxBuildContext,
} from '../opengrid-stackable-box/shared'
import { assertOpenGridOrganizerBoxGeometry } from './quality'
import {
  buildOpenGridDetachableCornerSeatIndicatorCutter,
  buildOpenGridDetachableCornerSeatSocketVoid,
  placeOpenGridDetachableCornerSeatIndicatorShape,
  placeOpenGridDetachableCornerSeatSocketShape,
} from '../opengrid-locating-assembly/reference'

type RoundedRectangleSection = {
  width: number
  depth: number
  radius: number
  z: number
}

const CAVITY_BOOLEAN_BATCH_SIZE = 16
const CAVITY_CUTTER_TOP_OVERLAP = 0.02

export type OpenGridOrganizerBoxBuildContext =
  OpenGridStackableBoxBuildContext & {
    detachableCornerSeatReference?: Shape3D
    detachableCornerSeatHolderReference?: Shape3D
  }

function roundedSectionWire(section: RoundedRectangleSection): Wire {
  const sketch = sketchRoundedRectangle(
    section.width,
    section.depth,
    section.radius,
  )
  const wire = sketch.wire.clone()
  deleteShape(sketch)
  if (section.z === 0) return wire
  return wire.translateZ(section.z)
}

function loftRoundedSections(
  sections: readonly RoundedRectangleSection[],
): Shape3D {
  const wires = sections.map(roundedSectionWire)
  try {
    return loft(wires, { ruled: true })
  } finally {
    wires.forEach(deleteShape)
  }
}

function insetSection(
  width: number,
  depth: number,
  outerRadius: number,
  inset: number,
  z: number,
): RoundedRectangleSection {
  return {
    width: width - 2 * inset,
    depth: depth - 2 * inset,
    radius: outerRadius - inset,
    z,
  }
}

function cornerSeatOuterEnvelopeSections(
  width: number,
  depth: number,
  height: number,
): RoundedRectangleSection[] {
  return [
    {
      width,
      depth,
      radius: OPENGRID_STACKABLE_BOX_CONFIGURATION.outerCornerRadius,
      z: 0,
    },
    {
      width,
      depth,
      radius: OPENGRID_STACKABLE_BOX_CONFIGURATION.outerCornerRadius,
      z: height,
    },
  ]
}

function stackingOuterEnvelopeSections(
  width: number,
  depth: number,
  height: number,
): RoundedRectangleSection[] {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const supportInset =
    configuration.wallThickness +
    configuration.topRailInnerChamfer -
    configuration.topRailMiddleChamfer
  const footInset = supportInset + configuration.bottomFootChamferHeight
  const supportTop =
    configuration.bottomFootChamferHeight +
    configuration.bottomSupportBandHeight
  const transitionTop = supportTop + supportInset

  return [
    insetSection(width, depth, configuration.outerCornerRadius, footInset, 0),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      supportInset,
      configuration.bottomFootChamferHeight,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      supportInset,
      supportTop,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      0,
      transitionTop,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      0,
      configuration.bottomAssemblyHeight,
    ),
    insetSection(width, depth, configuration.outerCornerRadius, 0, height),
  ]
}

function outerEnvelopeFor(parameters: OpenGridOrganizerBoxParameters): Shape3D {
  const layout = openGridOrganizerBoxLayoutFor(parameters)
  const [width, depth] = layout.footprint
  const sections =
    parameters.bottomInterfaceMode === 'stackable'
      ? stackingOuterEnvelopeSections(width, depth, layout.bodyHeight)
      : cornerSeatOuterEnvelopeSections(width, depth, layout.bodyHeight)
  return loftRoundedSections(sections)
}

function stackableAdapterFor(
  parameters: OpenGridOrganizerBoxParameters,
): OpenGridStackableBoxParameters {
  const layout = openGridOrganizerBoxLayoutFor(parameters)
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: layout.gridCountX,
    y: layout.gridCountY,
    height: Math.max(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.minHeight,
      layout.bodyHeight -
        OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight,
    ),
    cornerSeatMode:
      parameters.bottomInterfaceMode === 'corner-seat' ? 'integrated' : 'none',
    fullBottomHoleGrid: false,
    basePlateMode: false,
    thinShellMode: false,
    honeycombMode: false,
  }
}

function polygonCavityCutter(
  parameters: OpenGridOrganizerBoxParameters,
  center: [number, number],
  bottomZ: number,
  height: number,
): Shape3D {
  const points = openGridOrganizerBoxPolygonPointsFor(
    parameters.holeShape === 'circle' ? 'square' : parameters.holeShape,
    parameters.holeDiameter,
  )
  const sketcher = new Sketcher('XY', [center[0], center[1], bottomZ])
  let sketch: ReturnType<Sketcher['close']> | null = null
  let cavity: Shape3D | null = null
  try {
    const first = points[0]
    if (!first) throw new Error('OPENGRID_ORGANIZER_BOX_POLYGON_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    cavity = sketch.extrude(height, { extrusionDirection: [0, 0, 1] })
    const result = cavity
    cavity = null
    return result
  } finally {
    deleteShape(cavity)
    deleteShape(sketch)
    sketcher.delete()
  }
}

function cavityCutterFor(
  parameters: OpenGridOrganizerBoxParameters,
  center: [number, number],
  layout: ReturnType<typeof openGridOrganizerBoxLayoutFor>,
): Shape3D {
  const bottomZ = layout.bodyHeight - parameters.holeDepth
  const height = parameters.holeDepth + CAVITY_CUTTER_TOP_OVERLAP
  if (parameters.holeShape === 'circle') {
    return makeCylinder(parameters.holeDiameter / 2, height, [
      center[0],
      center[1],
      bottomZ,
    ])
  }
  return polygonCavityCutter(parameters, center, bottomZ, height)
}

function cutCavities(
  shape: Shape3D,
  parameters: OpenGridOrganizerBoxParameters,
  context: OpenGridOrganizerBoxBuildContext,
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  const layout = openGridOrganizerBoxLayoutFor(parameters)
  let current = shape
  try {
    for (
      let start = 0;
      start < layout.cavityCenters.length;
      start += CAVITY_BOOLEAN_BATCH_SIZE
    ) {
      assertGenerationCurrent(context)
      const cutters: Shape3D[] = []
      const centers = layout.cavityCenters.slice(
        start,
        start + CAVITY_BOOLEAN_BATCH_SIZE,
      )
      try {
        for (const center of centers) {
          assertGenerationCurrent(context)
          cutters.push(cavityCutterFor(parameters, center, layout))
        }
        const cutter =
          cutters.length === 1 ? cutters[0] : makeCompound(cutters).asShape3D()
        if (!cutter) throw new Error('OPENGRID_ORGANIZER_BOX_CUTTER_EMPTY')
        try {
          const cut = measureBooleanInScope(
            reporter?.createScope(cutters.length),
            'cut',
            () => current.cut(cutter),
          )
          deleteShape(current)
          current = cut
        } finally {
          if (cutter !== cutters[0]) deleteShape(cutter)
        }
      } finally {
        cutters.forEach(deleteShape)
      }
      assertGenerationCurrent(context)
    }
    return current
  } catch (error) {
    deleteShape(current)
    throw error
  }
}

function cutDetachableCornerSeatSockets(
  shape: Shape3D,
  parameters: OpenGridOrganizerBoxParameters,
  context: OpenGridOrganizerBoxBuildContext,
): Shape3D {
  const holderReference = context.detachableCornerSeatHolderReference
  if (!holderReference) {
    throw new Error('OPENGRID_ORGANIZER_BOX_DETACHABLE_HOLDER_MISSING')
  }

  const sourceVoid =
    buildOpenGridDetachableCornerSeatSocketVoid(holderReference)
  let sourceIndicator: Shape3D | null = null
  const cutters: Shape3D[] = []
  let compound: Shape3D | null = null
  try {
    sourceIndicator = buildOpenGridDetachableCornerSeatIndicatorCutter()
    for (const pose of openGridOrganizerBoxDetachableSocketPosesFor(
      parameters,
    )) {
      cutters.push(
        placeOpenGridDetachableCornerSeatSocketShape(sourceVoid, pose),
      )
      cutters.push(
        placeOpenGridDetachableCornerSeatIndicatorShape(
          sourceIndicator,
          openGridOrganizerBoxDetachableIndicatorPlacementFor(pose),
        ),
      )
    }
    compound = makeCompound(cutters).asShape3D()
    if (!compound) {
      throw new Error('OPENGRID_ORGANIZER_BOX_SOCKET_CUTTER_EMPTY')
    }
    const compoundCutter = compound
    const cut = measureBooleanInScope(
      context.booleanOperations?.createScope(1),
      'cut',
      () => shape.cut(compoundCutter, { optimisation: 'none' }),
    )
    deleteShape(shape)
    return cut
  } finally {
    deleteShape(compound)
    cutters.forEach(deleteShape)
    deleteShape(sourceIndicator)
    deleteShape(sourceVoid)
  }
}

export function buildOpenGridOrganizerBox(
  parameters: OpenGridOrganizerBoxParameters,
  context: OpenGridOrganizerBoxBuildContext = {},
): Shape3D {
  const layout = openGridOrganizerBoxLayoutFor(parameters)
  assertGenerationCurrent(context)

  let shape = outerEnvelopeFor(parameters)
  try {
    const adapter = stackableAdapterFor(parameters)
    if (parameters.bottomInterfaceMode === 'stackable') {
      shape = applyStackingProfile(shape, adapter, context)
    } else if (parameters.bottomInterfaceMode === 'corner-seat') {
      shape = addMountingSockets(shape, adapter, context)
    } else {
      shape = cutDetachableCornerSeatSockets(shape, parameters, context)
    }
    assertGenerationCurrent(context)
    shape = cutCavities(shape, parameters, context, context.booleanOperations)
    assertGenerationCurrent(context)
    assertOpenGridOrganizerBoxGeometry(
      shape,
      parameters,
      context.detachableCornerSeatHolderReference,
      context.detachableCornerSeatReference,
    )
    return shape
  } catch (error) {
    deleteShape(shape)
    throw error
  }
}
