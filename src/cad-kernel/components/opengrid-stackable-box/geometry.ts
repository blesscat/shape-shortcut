import {
  makeBox,
  loft,
  makeCompound,
  makeCylinder,
  Sketcher,
  sketchRoundedRectangle,
  type Wire,
  type Shape3D,
} from 'replicad'
import {
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxDerivedGeometryFor,
  externalOpenGridStackableBoxHeightFor,
  openGridStackableBoxBottomDatumZFor,
  openGridStackableBoxUpperInnerRimZFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxOpeningDirection,
  type OpenGridStackableBoxDerivedOpening,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import {
  measureBooleanInScope,
  type BooleanOperationScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import { filletEdgesAtZ } from '../../bottom-edge-fillet'
import { makeOpenGridIntegratedSeat } from '../opengrid-locating-assembly/integrated'
import {
  assertGenerationCurrent,
  deleteShape,
  type OpenGridStackableBoxBuildContext,
} from './shared'
import { cutOpenGridDetachableCornerSeatConsumers } from '../opengrid-locating-assembly/consumer'

type RoundedRectangleSection = {
  width: number
  depth: number
  radius: number
  z: number
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

function innerCavitySections(
  parameters: OpenGridStackableBoxParameters,
): RoundedRectangleSection[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const upperInnerRimZ = openGridStackableBoxUpperInnerRimZFor(parameters)
  const externalHeight = externalOpenGridStackableBoxHeightFor(parameters)
  const cavityStartZ =
    parameters.bottomMode === 'none'
      ? 0
      : openGridStackableBoxBottomDatumZFor(parameters)
  const baseSection = insetSection(
    width,
    depth,
    configuration.outerCornerRadius,
    configuration.wallThickness,
    cavityStartZ,
  )
  if (parameters.topRimMode === 'flat-top') {
    const chamfer = configuration.flatTopRimChamfer
    return [
      baseSection,
      insetSection(
        width,
        depth,
        configuration.outerCornerRadius,
        configuration.wallThickness,
        externalHeight - chamfer,
      ),
      // Flare the cavity past the outer face over the chamfer height so the
      // remaining wall top is one continuous 45° chamfer with its outer
      // edge at the external height, without a horizontal rim plane.
      insetSection(
        width,
        depth,
        configuration.outerCornerRadius,
        -0.02,
        externalHeight + 0.02,
      ),
    ]
  }
  return [
    baseSection,
    ...topRailInnerSections(width, depth, upperInnerRimZ),
  ]
}

function topRailInnerSections(
  width: number,
  depth: number,
  railBaseZ: number,
): RoundedRectangleSection[] {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const firstTransitionZ = railBaseZ + configuration.topRailInnerChamfer
  const firstVerticalTopZ =
    firstTransitionZ + configuration.topRailInnerVerticalHeight
  const secondTransitionZ =
    firstVerticalTopZ + configuration.topRailMiddleChamfer
  const secondVerticalTopZ =
    secondTransitionZ + configuration.topRailOuterVerticalHeight
  const externalHeight = railBaseZ + configuration.topRailHeight
  const finalInset =
    configuration.wallThickness +
    configuration.topRailInnerChamfer -
    configuration.topRailMiddleChamfer -
    configuration.topRailOuterChamfer

  return [
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness,
      railBaseZ,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness + configuration.topRailInnerChamfer,
      firstTransitionZ,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness + configuration.topRailInnerChamfer,
      firstVerticalTopZ,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness +
        configuration.topRailInnerChamfer -
        configuration.topRailMiddleChamfer,
      secondTransitionZ,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness +
        configuration.topRailInnerChamfer -
        configuration.topRailMiddleChamfer,
      secondVerticalTopZ,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      finalInset,
      externalHeight,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      finalInset,
      externalHeight + 0.02,
    ),
  ]
}

function outerEnvelopeSections(
  parameters: OpenGridStackableBoxParameters,
): RoundedRectangleSection[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const externalHeight = externalOpenGridStackableBoxHeightFor(parameters)
  if (parameters.bottomMode === 'thin-shell') {
    const chamfer = configuration.thinShellBottomChamfer
    return [
      insetSection(
        width,
        depth,
        configuration.outerCornerRadius,
        chamfer,
        0,
      ),
      insetSection(
        width,
        depth,
        configuration.outerCornerRadius,
        0,
        chamfer,
      ),
      insetSection(
        width,
        depth,
        configuration.outerCornerRadius,
        0,
        externalHeight,
      ),
    ]
  }
  if (parameters.bottomMode !== 'stacking') {
    return [
      insetSection(width, depth, configuration.outerCornerRadius, 0, 0),
      insetSection(
        width,
        depth,
        configuration.outerCornerRadius,
        0,
        externalHeight,
      ),
    ]
  }
  const supportInset = bottomGuideSupportInset()
  const footInset = supportInset + configuration.bottomFootChamferHeight
  const supportTop = bottomStackingSupportTopZ()
  const transitionTop = bottomGuideTransitionTopZ()

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
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      0,
      externalHeight,
    ),
  ]
}

function makeOpenBottomCornerPads(
  parameters: OpenGridStackableBoxParameters,
  outer: Shape3D,
): Shape3D | null {
  const centers = openGridStackableBoxSocketCentersFor(parameters)
  if (centers.length === 0) return null
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const padRadius = configuration.openBottomCornerPadRadius
  const padTopZ = openGridStackableBoxBottomDatumZFor(parameters)
  const pads: Shape3D[] = []
  let compound: Shape3D | null = null
  let clipped: Shape3D | null = null
  try {
    for (const [centerX, centerY] of centers) {
      pads.push(
        makeCylinder(
          padRadius,
          padTopZ + 0.02,
          [centerX, centerY, -0.02],
        ),
      )
    }
    // Clip the pad blocks to the outer envelope so they can never protrude
    // past the footprint, then rely on the wall overlap for a single-solid
    // fuse even when a deduplicated center leaves one full-width pad.
    const padCompound = makeCompound(pads).asShape3D()
    compound = padCompound
    const activePads = padCompound
    clipped = activePads.intersect(outer)
    return clipped
  } catch (error) {
    deleteShape(clipped)
    throw error
  } finally {
    deleteShape(compound)
    pads.forEach(deleteShape)
  }
}

export function makeBoxShell(
  parameters: OpenGridStackableBoxParameters,
  reporter: BooleanOperationReporter | undefined = undefined,
): Shape3D {
  const outer = loftRoundedSections(outerEnvelopeSections(parameters))
  let cavity: Shape3D | null = null
  let shell: Shape3D | null = null
  let pads: Shape3D | null = null
  try {
    cavity = loftRoundedSections(innerCavitySections(parameters))
    if (parameters.bottomMode === 'none') {
      pads = makeOpenBottomCornerPads(parameters, outer)
    }
    const activeCavity = cavity
    const cutScope = reporter?.createScope(1)
    shell = measureBooleanInScope(cutScope, 'cut', () =>
      outer.cut(activeCavity),
    )
    deleteShape(outer)
    deleteShape(cavity)
    cavity = null
    if (pads) {
      const activePads = pads
      const fusedScope = reporter?.createScope(1)
      const fused = measureBooleanInScope(fusedScope, 'fuse', () =>
        shell!.fuse(activePads),
      )
      deleteShape(shell)
      deleteShape(pads)
      shell = fused
    }
    // OCC bounding boxes overshoot for the R0.5 bottom fillet on a full
    // outer-radius perimeter, so the flat-bottom variants keep a sharp bottom
    // edge instead of relying on the filleted envelope.
    if (parameters.bottomMode === 'stacking') {
      const rounded = filletEdgesAtZ(
        shell,
        0,
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius,
      )
      shell = null
      return rounded
    }
    const result = shell
    shell = null
    return result
  } catch (error) {
    deleteShape(outer)
    deleteShape(cavity)
    deleteShape(shell)
    deleteShape(pads)
    throw error
  }
}

export type OpenGridStackingTopRailInput = {
  footprint: readonly [number, number]
  hostTopZ: number
  riserHeight: number
}

export function makeOpenGridStackingTopRail(
  input: OpenGridStackingTopRailInput,
  reporter: BooleanOperationReporter | undefined = undefined,
): Shape3D {
  const [width, depth] = input.footprint
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const overlap = 0.02
  const railBaseZ = input.hostTopZ + input.riserHeight
  const externalTopZ = railBaseZ + configuration.topRailHeight
  const outer = loftRoundedSections([
    {
      width,
      depth,
      radius: configuration.outerCornerRadius,
      z: input.hostTopZ - overlap,
    },
    {
      width,
      depth,
      radius: configuration.outerCornerRadius,
      z: externalTopZ,
    },
  ])
  let inner: Shape3D | null = null
  try {
    inner = loftRoundedSections([
      insetSection(
        width,
        depth,
        configuration.outerCornerRadius,
        configuration.wallThickness,
        input.hostTopZ - overlap,
      ),
      ...topRailInnerSections(width, depth, railBaseZ),
    ])
    const cut = measureBooleanInScope(reporter?.createScope(1), 'cut', () =>
      outer.cut(inner!),
    )
    deleteShape(outer)
    return cut
  } catch (error) {
    deleteShape(outer)
    throw error
  } finally {
    deleteShape(inner)
  }
}

export function bottomStackingSupportTopZ(): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return (
    configuration.bottomFootChamferHeight +
    configuration.bottomSupportBandHeight
  )
}

export function bottomStackingProfileTopZ(): number {
  return (
    bottomStackingSupportTopZ() +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomStackingLeadIn
  )
}

export function bottomGridSeamApexTopZ(): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return (
    bottomStackingProfileTopZ() + configuration.bottomGridSeamOpeningWidth / 2
  )
}

export function bottomGuideSupportInset(): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return (
    configuration.wallThickness +
    configuration.topRailInnerChamfer -
    configuration.topRailMiddleChamfer
  )
}

export function bottomGuideTransitionTopZ(): number {
  return bottomStackingSupportTopZ() + bottomGuideSupportInset()
}

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

function extrudeSideOpeningProfile(
  plane: 'YZ' | 'XZ',
  origin: [number, number, number],
  opening: OpenGridStackableBoxDerivedOpening,
  topZ: number,
  distance: number,
  direction: [number, number, number],
): Shape3D {
  const halfBottomLength = opening.bottomLength / 2
  const cornerRadius = opening.arcRadius
  const angleRadians = (opening.angle * Math.PI) / 180
  const bottomZ = opening.bottomZ
  const rightBottom: [number, number] = [halfBottomLength, bottomZ]
  const rightTransition: [number, number] = [
    halfBottomLength + opening.cornerRun,
    bottomZ + opening.cornerRise,
  ]
  const leftTransition: [number, number] = [
    -rightTransition[0],
    rightTransition[1],
  ]
  const leftBottom: [number, number] = [-halfBottomLength, bottomZ]
  const rightTopArcStart: [number, number] = [
    rightTransition[0] + opening.straightSideRun,
    topZ - opening.cornerRise,
  ]
  const leftTopArcStart: [number, number] = [
    -rightTopArcStart[0],
    rightTopArcStart[1],
  ]
  const rightTopEdge: [number, number] = [
    rightTopArcStart[0] + opening.cornerRun,
    topZ,
  ]
  const leftTopEdge: [number, number] = [-rightTopEdge[0], topZ]
  const rightBottomMidpoint: [number, number] = [
    halfBottomLength + cornerRadius * Math.sin(angleRadians / 2),
    bottomZ + cornerRadius * (1 - Math.cos(angleRadians / 2)),
  ]
  const leftBottomMidpoint: [number, number] = [
    -rightBottomMidpoint[0],
    rightBottomMidpoint[1],
  ]
  const rightTopMidpoint: [number, number] = [
    rightTopArcStart[0] +
      cornerRadius * (Math.sin(angleRadians) - Math.sin(angleRadians / 2)),
    rightTopArcStart[1] +
      cornerRadius * (Math.cos(angleRadians / 2) - Math.cos(angleRadians)),
  ]
  const leftTopMidpoint: [number, number] = [
    -rightTopMidpoint[0],
    rightTopMidpoint[1],
  ]
  const topExtension = 0.04
  const rightTopOuter: [number, number] = [rightTopEdge[0] + topExtension, topZ]
  const leftTopOuter: [number, number] = [-rightTopOuter[0], topZ]
  const rightTopOuterAbove: [number, number] = [
    rightTopOuter[0],
    topZ + topExtension,
  ]
  const leftTopOuterAbove: [number, number] = [
    leftTopOuter[0],
    topZ + topExtension,
  ]
  const sketcher = new Sketcher(plane, origin)
  let sketch: ReturnType<Sketcher['close']> | null = null
  let current: Shape3D | null = null
  try {
    sketcher.movePointerTo(leftBottom)
    if (halfBottomLength > 0) sketcher.lineTo(rightBottom)
    sketcher.threePointsArcTo(rightTransition, rightBottomMidpoint)
    sketcher.lineTo(rightTopArcStart)
    sketcher.threePointsArcTo(rightTopEdge, rightTopMidpoint)
    sketcher.lineTo(rightTopOuter)
    sketcher.lineTo(rightTopOuterAbove)
    sketcher.lineTo(leftTopOuterAbove)
    sketcher.lineTo(leftTopOuter)
    sketcher.lineTo(leftTopEdge)
    sketcher.threePointsArcTo(leftTopArcStart, leftTopMidpoint)
    sketcher.lineTo(leftTransition)
    sketcher.threePointsArcTo(leftBottom, leftBottomMidpoint)
    sketch = sketcher.close()
    current = sketch.extrude(distance, { extrusionDirection: direction })
    const result = current
    current = null
    return result
  } finally {
    deleteShape(current)
    deleteShape(sketch)
    sketcher.delete()
  }
}

function fuseSideOpeningCutterParts(
  plane: 'YZ' | 'XZ',
  wallOrigin: [number, number, number],
  railOrigin: [number, number, number],
  opening: OpenGridStackableBoxDerivedOpening,
  topZ: number,
  railStartZ: number,
  width: number,
  depth: number,
  wallDistance: number,
  railDistance: number,
  direction: [number, number, number],
  scopes: {
    fuse?: BooleanOperationScope
    intersect?: BooleanOperationScope
  },
): Shape3D {
  const wallCutter = extrudeSideOpeningProfile(
    plane,
    wallOrigin,
    opening,
    topZ,
    wallDistance,
    direction,
  )
  let railCutter: Shape3D | null = extrudeSideOpeningProfile(
    plane,
    railOrigin,
    opening,
    topZ,
    railDistance,
    direction,
  )
  let railClip: Shape3D | null = makeBox(
    [-width / 2 - 0.04, -depth / 2 - 0.04, railStartZ],
    [width / 2 + 0.04, depth / 2 + 0.04, topZ + 0.04],
  )
  let clippedRailCutter: Shape3D | null = null
  try {
    const activeRailCutter = railCutter
    const activeRailClip = railClip
    clippedRailCutter = measureBooleanInScope(
      scopes.intersect,
      'intersect',
      () => activeRailCutter.intersect(activeRailClip),
    )
    deleteShape(railCutter)
    railCutter = null
    deleteShape(railClip)
    railClip = null
    const activeClippedRailCutter = clippedRailCutter
    const result = measureBooleanInScope(scopes.fuse, 'fuse', () =>
      wallCutter.fuse(activeClippedRailCutter),
    )
    deleteShape(wallCutter)
    deleteShape(clippedRailCutter)
    clippedRailCutter = null
    return result
  } catch (error) {
    deleteShape(wallCutter)
    deleteShape(railCutter)
    deleteShape(railClip)
    deleteShape(clippedRailCutter)
    throw error
  }
}

function makeSideOpeningCutter(
  parameters: OpenGridStackableBoxParameters,
  direction: OpenGridStackableBoxOpeningDirection,
  scopes: {
    fuse?: BooleanOperationScope
    intersect?: BooleanOperationScope
  },
): Shape3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const opening = derived.openings[direction]
  const margin = 0.04
  const wallStart = configuration.wallThickness + margin
  const wallDistance = configuration.wallThickness + 2 * margin
  const topZ = derived.activeUpperOuterEdgeZ

  if (parameters.topRimMode === 'flat-top') {
    if (direction === '+X') {
      return extrudeSideOpeningProfile(
        'YZ',
        [width / 2 - wallStart, 0, 0],
        opening,
        topZ,
        wallDistance,
        [1, 0, 0],
      )
    }
    if (direction === '-X') {
      return extrudeSideOpeningProfile(
        'YZ',
        [-width / 2 - margin, 0, 0],
        opening,
        topZ,
        wallDistance,
        [1, 0, 0],
      )
    }
    if (direction === '+Y') {
      return extrudeSideOpeningProfile(
        'XZ',
        [0, depth / 2 - wallStart, 0],
        opening,
        topZ,
        wallDistance,
        [0, 1, 0],
      )
    }
    return extrudeSideOpeningProfile(
      'XZ',
      [0, -depth / 2 - margin, 0],
      opening,
      topZ,
      wallDistance,
      [0, 1, 0],
    )
  }
  const upperRailInnerInset =
    configuration.wallThickness + configuration.topRailInnerChamfer
  const railStartZ = derived.activeUpperInnerRimZ - margin
  const railDistance = upperRailInnerInset + 2 * margin
  const railNormalInset = upperRailInnerInset + margin

  if (direction === '+X') {
    return fuseSideOpeningCutterParts(
      'YZ',
      [width / 2 - wallStart, 0, 0],
      [width / 2 - railNormalInset, 0, 0],
      opening,
      topZ,
      railStartZ,
      width,
      depth,
      wallDistance,
      railDistance,
      [1, 0, 0],
      scopes,
    )
  }
  if (direction === '-X') {
    return fuseSideOpeningCutterParts(
      'YZ',
      [-width / 2 - margin, 0, 0],
      [-width / 2 - margin, 0, 0],
      opening,
      topZ,
      railStartZ,
      width,
      depth,
      wallDistance,
      railDistance,
      [1, 0, 0],
      scopes,
    )
  }
  if (direction === '+Y') {
    return fuseSideOpeningCutterParts(
      'XZ',
      [0, depth / 2 - wallStart, 0],
      [0, depth / 2 - railNormalInset, 0],
      opening,
      topZ,
      railStartZ,
      width,
      depth,
      wallDistance,
      railDistance,
      [0, 1, 0],
      scopes,
    )
  }
  return fuseSideOpeningCutterParts(
    'XZ',
    [0, -depth / 2 - margin, 0],
    [0, -depth / 2 - margin, 0],
    opening,
    topZ,
    railStartZ,
    width,
    depth,
    wallDistance,
    railDistance,
    [0, 1, 0],
    scopes,
  )
}

export function addSideOpenings(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  let current = shape
  const directions = OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS.filter(
    (direction) => derived.openings[direction].enabled,
  )
  const cutScope = context.booleanOperations?.createScope(directions.length)
  const cutterScopes = {
    fuse: context.booleanOperations?.createScope(directions.length),
    intersect: context.booleanOperations?.createScope(directions.length),
  }

  for (const direction of directions) {
    assertGenerationCurrent(context)
    const cutter = makeSideOpeningCutter(parameters, direction, cutterScopes)
    try {
      const cut = measureBooleanInScope(cutScope, 'cut', () =>
        current.cut(cutter),
      )
      deleteShape(current)
      current = cut
    } finally {
      deleteShape(cutter)
    }
    assertGenerationCurrent(context)
  }

  return current
}

export type OpenGridStackableBoxBottomGridSeam = {
  axis: 'x' | 'y'
  position: number
}

export function bottomGridSeamsFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxBottomGridSeam[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const seams: OpenGridStackableBoxBottomGridSeam[] = []

  for (let index = 1; index < Math.ceil(parameters.x); index += 1) {
    seams.push({
      axis: 'x',
      position: -width / 2 + index * configuration.gridPitch,
    })
  }
  for (let index = 1; index < Math.ceil(parameters.y); index += 1) {
    seams.push({
      axis: 'y',
      position: -depth / 2 + index * configuration.gridPitch,
    })
  }
  return seams
}

function makeBottomGridSeamCutter(
  seam: OpenGridStackableBoxBottomGridSeam,
  parameters: OpenGridStackableBoxParameters,
): Shape3D {
  const [width, footprintDepth] =
    nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const footChamferHeight = configuration.bottomFootChamferHeight
  const supportTop = bottomStackingSupportTopZ()
  const transitionTop = bottomStackingProfileTopZ()
  const bedHalfOpening = configuration.bottomGridSeamBedOpeningWidth / 2
  const supportHalfOpening = configuration.bottomGridSeamSupportOpeningWidth / 2
  const transitionHalfOpening = configuration.bottomGridSeamOpeningWidth / 2
  const transitionApexTop = bottomGridSeamApexTopZ()
  const margin = 0.02
  const profile: readonly [number, number][] = [
    [-bedHalfOpening, -margin],
    [bedHalfOpening, -margin],
    [supportHalfOpening, footChamferHeight],
    [supportHalfOpening, supportTop],
    [transitionHalfOpening, transitionTop],
    [0, transitionApexTop],
    [-transitionHalfOpening, transitionTop],
    [-supportHalfOpening, supportTop],
    [-supportHalfOpening, footChamferHeight],
  ]

  if (seam.axis === 'x') {
    return extrudeProfile(
      'XZ',
      [seam.position, -footprintDepth / 2 - margin, 0],
      profile,
      footprintDepth + 2 * margin,
      [0, 1, 0],
    )
  }

  return extrudeProfile(
    'YZ',
    [-width / 2 - margin, seam.position, 0],
    profile,
    width + 2 * margin,
    [1, 0, 0],
  )
}

function makeBottomGridSeamTools(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
  axis: OpenGridStackableBoxBottomGridSeam['axis'],
): Shape3D[] {
  const seams = bottomGridSeamsFor(parameters).filter(
    (seam) => seam.axis === axis,
  )
  const cutters: Shape3D[] = []
  try {
    for (const seam of seams) {
      assertGenerationCurrent(context)
      cutters.push(makeBottomGridSeamCutter(seam, parameters))
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

function cutWithToolBatch(
  shape: Shape3D,
  tools: Shape3D[],
  scope: BooleanOperationScope | undefined,
): Shape3D {
  if (tools.length === 0) return shape

  const tool = tools.length === 1 ? tools[0] : makeCompound(tools).asShape3D()
  if (!tool) {
    return shape
  }

  try {
    const cut = measureBooleanInScope(scope, 'cut', () => shape.cut(tool))
    deleteShape(shape)
    return cut
  } finally {
    deleteShape(tool)
  }
}

function fuseWithToolBatch(
  shape: Shape3D,
  tools: Shape3D[],
  scope: BooleanOperationScope | undefined,
): Shape3D {
  if (tools.length === 0) return shape

  const tool = tools.length === 1 ? tools[0] : makeCompound(tools).asShape3D()
  if (!tool) {
    return shape
  }

  try {
    const fused = measureBooleanInScope(scope, 'fuse', () =>
      shape.fuse(tool, { optimisation: 'commonFace' }),
    )
    deleteShape(shape)
    return fused
  } finally {
    deleteShape(tool)
  }
}

function addIntegratedStackingProfile(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  let current = shape
  const seams = bottomGridSeamsFor(parameters)
  const cutTotal = (['x', 'y'] as const).filter((axis) =>
    seams.some((seam) => seam.axis === axis),
  ).length
  const cutScope =
    cutTotal > 0 ? context.booleanOperations?.createScope(cutTotal) : undefined
  for (const axis of ['x', 'y'] as const) {
    const cutters = makeBottomGridSeamTools(parameters, context, axis)
    if (cutters.length === 0) continue

    assertGenerationCurrent(context)
    current = cutWithToolBatch(current, cutters, cutScope)
  }
  return current
}

function activeBottomThicknessFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (parameters.bottomMode === 'stacking') {
    return configuration.bottomAssemblyHeight
  }
  return configuration.thinShellFloorThickness
}

function makeOrdinaryBottomHoleCutter(
  parameters: OpenGridStackableBoxParameters,
): Shape3D {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const depth = activeBottomThicknessFor(parameters)
  return makeCylinder(
    configuration.bottomGridHoleDiameter / 2,
    depth + 0.12,
    [0, 0, -0.1],
  )
}

function makeIntegratedSeatTools(
  centers: readonly (readonly [number, number])[],
): Shape3D[] {
  const seats: Shape3D[] = []
  try {
    for (const [x, y] of centers) {
      seats.push(makeOpenGridIntegratedSeat([x, y]))
    }
    return seats
  } catch (error) {
    seats.forEach(deleteShape)
    throw error
  }
}

function translateShape(
  shape: Shape3D,
  x: number,
  y: number,
  z: number,
): Shape3D {
  return shape.translate(x, y, z)
}

export function addMountingSockets(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  const centers = openGridStackableBoxSocketCentersFor(parameters)
  const integratedSeats =
    parameters.cornerSeatMode === 'integrated'
      ? makeIntegratedSeatTools(centers)
      : []
  if (parameters.cornerSeatMode === 'detachable-corner-seat') {
    shape = cutOpenGridDetachableCornerSeatConsumers(
      shape,
      centers,
      context,
      'OPENGRID_STACKABLE_BOX_DETACHABLE_CORNER_SEAT',
    )
  }
  const socketCutters: Shape3D[] = []
  const ordinaryCenters =
    openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)
  const operationTotal =
    Number(integratedSeats.length > 0) +
    Number(socketCutters.length > 0) +
    Number(ordinaryCenters.length > 0)
  const operationScope =
    operationTotal > 0
      ? context.booleanOperations?.createScope(operationTotal)
      : undefined
  assertGenerationCurrent(context)
  let current: Shape3D
  try {
    current = fuseWithToolBatch(shape, integratedSeats, operationScope)
  } finally {
    integratedSeats.forEach(deleteShape)
  }
  current = cutWithToolBatch(current, socketCutters, operationScope)

  const ordinaryCutters = ordinaryCenters.map(([x, y]) =>
    translateShape(makeOrdinaryBottomHoleCutter(parameters), x, y, 0),
  )
  assertGenerationCurrent(context)
  current = cutWithToolBatch(current, ordinaryCutters, operationScope)

  return current
}

export function applyStackingProfile(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  if (parameters.bottomMode !== 'stacking') return shape
  return addIntegratedStackingProfile(shape, parameters, context)
}
