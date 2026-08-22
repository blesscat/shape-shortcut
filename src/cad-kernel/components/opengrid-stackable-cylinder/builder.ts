import {
  getOC,
  makeBox,
  makeCylinder,
  makeCompound,
  measureVolume,
  Sketcher,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridStackableCylinder,
  openGridStackableCylinderDerivedGeometryFor,
  openGridStackableCylinderHoleCentersFor,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS,
  validateOpenGridStackableCylinderParameters,
  type ModelBounds,
  type OpenGridStackableCylinderOpeningDirection,
  type OpenGridStackableCylinderParameters,
  type OpenGridStackableCylinderPoint2D,
  type OpenGridStackableCylinderProfile,
  type OpenGridStackableCylinderSeatMode,
} from '../../../cad-contract/units'
import {
  measureBoolean,
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import { filletEdgesAtZ } from '../../bottom-edge-fillet'
import {
  makeOpenGridStackableCylinderBottomHoneycombCutters,
  makeOpenGridStackableCylinderSideHoneycombCutters,
  openGridStackableCylinderHoneycombCellCountFor,
} from '../../lattice/opengrid-honeycomb'

const HONEYCOMB_CUT_BATCH_SIZE = 128
const CENTER_HOOK_QUALITY_PROBE_MARGIN = 0.1

export type OpenGridStackableCylinderBuildContext = {
  isGenerationCurrent?: () => boolean
  booleanOperations?: BooleanOperationReporter
}

type Bounds = [[number, number, number], [number, number, number]]

export type OpenGridStackableCylinderHoleSection = {
  diameter: number
  minZ: number
  maxZ: number
}

export type OpenGridStackableCylinderIntegratedSeatRecord = {
  center: OpenGridStackableCylinderPoint2D
  diameter: number
  minZ: number
  maxZ: number
}

export type OpenGridStackableCylinderCenterHookQuality = {
  bounds: ModelBounds
  headBounds: ModelBounds
  stemBounds: ModelBounds
  planWidth: number
  planDepth: number
  headPlanWidth: number
  headPlanDepth: number
  stemPlanWidth: number
  stemPlanDepth: number
  minZ: number
  headHeight: number
  stemHeight: number
  footprintVolume: number
  headVolume: number
  stemVolume: number
  insertionClearancePerSide: number
  rotationClearance: number
  quarterTurnCaptureOverhang: number
}

export type OpenGridStackableCylinderHoleQuality = {
  center: OpenGridStackableCylinderPoint2D
  sections: OpenGridStackableCylinderHoleSection[]
}

export type OpenGridStackableCylinderOpeningQuality = {
  direction: OpenGridStackableCylinderOpeningDirection
  enabled: boolean
  bottomZ: number
  bottomLength: number
  upperWidth: number
  bottomBoundaryProbeVolume: number
  topBoundaryProbeVolume: number
  valid: boolean
}

export type OpenGridStackableCylinderInterfaceQualityReport = {
  honeycombMode: boolean
  honeycombCellCount: number
  profile: OpenGridStackableCylinderProfile
  thinBottomMode: boolean
  bottomPlateMode: boolean
  bottomSeatMode: OpenGridStackableCylinderSeatMode
  floorThickness: number
  bottomHoleSectionDepth: number
  bounds: ModelBounds
  volume: number
  solidCount: number
  brepValid: boolean
  holeRecordCount: number
  holes: OpenGridStackableCylinderHoleQuality[]
  integratedSeatRecordCount: number
  integratedSeats: OpenGridStackableCylinderIntegratedSeatRecord[]
  centerHook: OpenGridStackableCylinderCenterHookQuality | null
  openings: OpenGridStackableCylinderOpeningQuality[]
  neighboringOpeningProbeCount: number
  neighboringOpeningExpectedProbeCount: number
  holeOuterClearances: number[]
  holeFlatFloorClearances: number[]
  bottomProtrusionVolume: number
  bottomGrooveResidualVolume: number
  topOuterConicalFaceCount: number
  topInnerChamferFaceCount: number
  topInnerChamferHeight: number
  bottomFootChamferFaceCount: number
  bottomFootChamferHeight: number
  bottomOuterChamferFaceCount: number
  bottomOuterChamferHeight: number
  bottomOuterFilletFaceCount: number
  lowerUnexpectedConicalFaceCount: number
  centralFloorBelowVolume: number
  centralFloorAboveVolume: number
  straightWallThickness: number
  straightWallBoundaryProbeCount: number
  innerRampFaceCount: number
  innerRampHeight: number
  innerRampAngleDegrees: number
  innerRampNormalThickness: number
  innerRampBoundaryProbeCount: number
  bottomMatingClearance: number
  bottomMatingBoundaryProbeCount: number
  matingIntersectionVolume: number
  internalFilletFaceCount: number
  internalFilletHeight: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

function edgeIsNearZ(
  edge: {
    startPoint: { z?: number; delete: () => void }
    endPoint: { z?: number; delete: () => void }
  },
  z: number,
  tolerance = 0.02,
): boolean {
  const start = edge.startPoint
  const end = edge.endPoint
  try {
    return (
      start.z !== undefined &&
      end.z !== undefined &&
      Math.abs(start.z - z) <= tolerance &&
      Math.abs(end.z - z) <= tolerance
    )
  } finally {
    start.delete()
    end.delete()
  }
}

function assertGenerationCurrent(
  context: OpenGridStackableCylinderBuildContext,
): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

function throwStageError(prefix: string, error: unknown): never {
  if (error instanceof Error && error.message === 'STALE_GENERATION') {
    throw error
  }
  const message = error instanceof Error ? error.message : String(error)
  throw new Error(`${prefix}:${message}`)
}

function makeAnnularRing(
  outerRadius: number,
  innerRadius: number,
  height: number,
  z: number,
): Shape3D {
  const outer = makeCylinder(outerRadius, height, [0, 0, z])
  const inner = makeCylinder(innerRadius, height + 0.04, [0, 0, z - 0.02])
  try {
    const ring = outer.cut(inner)
    return ring
  } finally {
    deleteShape(outer)
    deleteShape(inner)
  }
}

function compatibilityFixturePasses(
  shape: Shape3D,
  floorThickness: number,
  bottomHoleSectionDepth: number,
): boolean {
  const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION
  const shaft = makeCylinder(
    configuration.testShaftDiameter / 2,
    configuration.testShaftLengthForFloor(floorThickness),
    [0, 0, -configuration.testShaftExposure],
  )
  const flange = makeCylinder(
    configuration.testFlangeDiameter / 2,
    configuration.testFlangeHeight,
    [0, 0, floorThickness],
  )
  const fixture = shaft.fuse(flange)
  deleteShape(shaft)
  deleteShape(flange)

  let seatedIntersection: Shape3D | null = null
  let loweredFixture: Shape3D | null = null
  let loweredIntersection: Shape3D | null = null
  try {
    seatedIntersection = shape.intersect(fixture)
    const retentionProbeOffset = Math.max(
      0.2,
      floorThickness - bottomHoleSectionDepth + 0.2,
    )
    loweredFixture = fixture.clone().translateZ(-retentionProbeOffset)
    loweredIntersection = shape.intersect(loweredFixture)
    return (
      measureVolume(seatedIntersection) <= 0.01 &&
      measureVolume(loweredIntersection) > 0.01
    )
  } catch {
    return false
  } finally {
    deleteShape(seatedIntersection)
    deleteShape(loweredIntersection)
    deleteShape(loweredFixture)
    deleteShape(fixture)
  }
}

function makeCylinderShell(
  parameters: OpenGridStackableCylinderParameters,
): Shape3D {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const effectiveTopInnerChamfer =
    derived.topInnerChamfer - configuration.topInnerChamferLand
  const topInnerChamferRadius = derived.innerRadius + effectiveTopInnerChamfer
  const sketcher = new Sketcher('XZ')
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    sketcher.movePointerTo([0, 0])
    if (derived.profile === 'bottom-plate') {
      sketcher.lineTo([derived.lowerFootRadius, 0])
      sketcher.lineTo([
        derived.outerTransitionEndRadius,
        derived.outerTransitionEndZ,
      ])
    } else {
      sketcher.lineTo([derived.lowerFootRadius, 0])
      sketcher.lineTo([
        derived.matingProtrusionRadius,
        configuration.bottomFootBevel,
      ])
      sketcher.lineTo([
        derived.matingProtrusionRadius,
        configuration.bottomVerticalHeight,
      ])
      sketcher.lineTo([
        derived.outerTransitionEndRadius,
        derived.outerTransitionEndZ,
      ])
    }
    sketcher.lineTo([derived.radius, parameters.height])
    if (topInnerChamferRadius < derived.radius - 0.0001) {
      sketcher.lineTo([topInnerChamferRadius, parameters.height])
    }
    sketcher.lineTo([
      derived.innerRadius,
      parameters.height - effectiveTopInnerChamfer,
    ])
    if (derived.profile === 'thin') {
      sketcher.lineTo([derived.innerRampEndRadius, derived.innerRampEndZ])
      sketcher.lineTo([derived.flatFloorRadius, derived.flatFloorZ])
    } else {
      sketcher.lineTo([derived.innerRadius, derived.flatFloorZ])
    }
    sketcher.lineTo([0, derived.flatFloorZ])
    sketch = sketcher.close()
    const revolved = sketch.revolve([0, 0, 1])
    if (derived.profile === 'thin') {
      return filletEdgesAtZ(
        revolved,
        0,
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius,
      )
    }
    const filleted = revolved.fillet(derived.innerFloorFilletRadius, (finder) =>
      finder.when(({ element }) =>
        edgeIsNearZ(element, derived.floorThickness),
      ),
    )
    deleteShape(revolved)
    const simplified = filleted.simplify()
    if (simplified !== filleted) deleteShape(filleted)
    return filletEdgesAtZ(
      simplified,
      0,
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius,
    )
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function cutSteppedHole(
  shape: Shape3D,
  parameters: OpenGridStackableCylinderParameters,
  center: OpenGridStackableCylinderPoint2D,
  reporter: BooleanOperationReporter | undefined,
): Shape3D {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const lower = makeCylinder(
    configuration.bottomHoleDiameter / 2,
    derived.bottomHoleSectionDepth + 0.02,
    [center[0], center[1], -0.01],
  )
  let lowerCut: Shape3D | null = null
  const cutScope = reporter?.createScope(2)
  try {
    lowerCut = measureBooleanInScope(cutScope, 'cut', () => shape.cut(lower))
  } finally {
    deleteShape(lower)
  }

  let upper: Shape3D | null = null
  try {
    upper = makeCylinder(
      configuration.innerHoleDiameter / 2,
      configuration.innerHoleSectionDepth + 0.02,
      [center[0], center[1], derived.bottomHoleSectionDepth],
    )
    if (!lowerCut) throw new Error('OPENGRID_STACKABLE_CYLINDER_HOLE_INVALID')
    const activeLowerCut = lowerCut
    const activeUpper = upper
    const steppedCut = measureBooleanInScope(cutScope, 'cut', () =>
      activeLowerCut.cut(activeUpper),
    )
    deleteShape(lowerCut)
    lowerCut = null
    return steppedCut
  } finally {
    deleteShape(lowerCut)
    deleteShape(upper)
  }
}

function addBottomHoles(
  shape: Shape3D,
  parameters: OpenGridStackableCylinderParameters,
  context: OpenGridStackableCylinderBuildContext,
): Shape3D {
  let current = shape
  for (const center of openGridStackableCylinderHoleCentersFor(parameters)) {
    assertGenerationCurrent(context)
    const cut = cutSteppedHole(
      current,
      parameters,
      center,
      context.booleanOperations,
    )
    deleteShape(current)
    current = cut
  }
  return current
}

function addIntegratedSeats(
  shape: Shape3D,
  parameters: OpenGridStackableCylinderParameters,
  context: OpenGridStackableCylinderBuildContext,
): Shape3D {
  const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION
  const centers = openGridStackableCylinderHoleCentersFor(parameters)
  const fuseScope =
    centers.length > 0
      ? context.booleanOperations?.createScope(centers.length)
      : undefined
  let current = shape

  for (const [x, y] of centers) {
    assertGenerationCurrent(context)
    const seat = makeCylinder(
      configuration.integratedSeatDiameter / 2,
      configuration.integratedSeatHeight,
      [x, y, configuration.integratedSeatMinZ],
    )
    let roundedSeat: Shape3D | null = null
    try {
      roundedSeat = filletEdgesAtZ(
        seat,
        configuration.integratedSeatMinZ,
        configuration.bottomEdgeFilletRadius,
      )
      if (!roundedSeat) throw new Error('OPENGRID_INTEGRATED_SEAT_EMPTY')
      const activeRoundedSeat = roundedSeat
      const fused = measureBooleanInScope(fuseScope, 'fuse', () =>
        current.fuse(activeRoundedSeat, { optimisation: 'commonFace' }),
      )
      deleteShape(current)
      current = fused
    } finally {
      deleteShape(roundedSeat)
      deleteShape(seat)
    }
  }

  return current
}

function addCenterHook(
  shape: Shape3D,
  context: OpenGridStackableCylinderBuildContext,
): Shape3D {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const head = makeBox(
    [
      -configuration.centerHookWidth / 2,
      -configuration.centerHookDepth / 2,
      configuration.centerHookHeadMinZ,
    ],
    [
      configuration.centerHookWidth / 2,
      configuration.centerHookDepth / 2,
      configuration.centerHookHeadMaxZ,
    ],
  )
  const stem = makeCylinder(
    configuration.centerHookStemDiameter / 2,
    configuration.centerHookStemHeight,
    [0, 0, configuration.centerHookStemMinZ],
  )
  let hook: Shape3D | null = null
  let headReleased = false
  let stemReleased = false
  const fuseScope = context.booleanOperations?.createScope(2)
  try {
    assertGenerationCurrent(context)
    hook = measureBooleanInScope(fuseScope, 'fuse', () =>
      head.fuse(stem, { optimisation: 'commonFace' }),
    )
    if (hook !== head) {
      deleteShape(head)
      headReleased = true
    }
    if (hook !== stem) {
      deleteShape(stem)
      stemReleased = true
    }
    if (!hook) throw new Error('OPENGRID_CENTER_HOOK_EMPTY')
    const activeHook = hook
    const fused = measureBooleanInScope(fuseScope, 'fuse', () =>
      shape.fuse(activeHook, { optimisation: 'commonFace' }),
    )
    deleteShape(shape)
    return fused
  } finally {
    if (!headReleased && hook !== head) deleteShape(head)
    if (!stemReleased && hook !== stem) deleteShape(stem)
    deleteShape(hook)
  }
}

function addBottomLocatingFeatures(
  shape: Shape3D,
  parameters: OpenGridStackableCylinderParameters,
  context: OpenGridStackableCylinderBuildContext,
): Shape3D {
  if (parameters.bottomSeatMode === 'none') return shape
  if (parameters.bottomSeatMode === 'integrated') {
    return addIntegratedSeats(shape, parameters, context)
  }
  if (parameters.bottomSeatMode === 'center-hook') {
    return addCenterHook(shape, context)
  }
  return addBottomHoles(shape, parameters, context)
}

function quarterTurnsForOpening(
  direction: OpenGridStackableCylinderOpeningDirection,
): number {
  if (direction === '+X') return 0
  if (direction === '+Y') return 1
  if (direction === '-X') return 2
  return -1
}

function makeSideOpeningCutter(
  parameters: OpenGridStackableCylinderParameters,
  direction: OpenGridStackableCylinderOpeningDirection,
): Shape3D {
  // The cutter is an open-top U/V notch: one flat bottom, two fixed-radius
  // transition arcs, and straight side walls whose slope is controlled by
  // the opening angle. It is not a cylindrical or circular-hole cutter.
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const opening = derived.openings[direction]
  if (!opening.enabled) {
    throw new Error('OPENGRID_STACKABLE_CYLINDER_OPENING_DISABLED')
  }

  const halfBottomLength = opening.bottomLength / 2
  const cornerRadius = opening.arcRadius
  const bottomZ = opening.bottomZ
  const topZ = parameters.height
  const angleRadians = (opening.angle * Math.PI) / 180
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
  const sketcher = new Sketcher('YZ')
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
    current = sketch.extrude(parameters.diameter + topExtension, {
      extrusionDirection: [1, 0, 0],
    })

    const quarterTurns = quarterTurnsForOpening(direction)
    if (quarterTurns !== 0) {
      const rotated = current.rotate(quarterTurns * 90, [0, 0, 0], [0, 0, 1])
      if (rotated !== current) deleteShape(current)
      current = rotated
    }

    const result = current
    current = null
    return result
  } finally {
    deleteShape(current)
    deleteShape(sketch)
    sketcher.delete()
  }
}

function addSideOpenings(
  shape: Shape3D,
  parameters: OpenGridStackableCylinderParameters,
  context: OpenGridStackableCylinderBuildContext,
): Shape3D {
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  let current = shape
  const directions = (['+X', '-X', '+Y', '-Y'] as const).filter(
    (direction) => derived.openings[direction].enabled,
  )
  const cutScope = context.booleanOperations?.createScope(directions.length)
  for (const direction of directions) {
    assertGenerationCurrent(context)

    let cutter: Shape3D | null = null
    try {
      cutter = makeSideOpeningCutter(parameters, direction)
      const activeCutter = cutter
      if (!activeCutter)
        throw new Error('OPENGRID_STACKABLE_CYLINDER_CUTTER_EMPTY')
      const cut = measureBooleanInScope(cutScope, 'cut', () =>
        current.cut(activeCutter),
      )
      deleteShape(current)
      current = cut
    } finally {
      deleteShape(cutter)
    }
  }
  return current
}

function applyHoneycombMode(
  shape: Shape3D,
  parameters: OpenGridStackableCylinderParameters,
  context: OpenGridStackableCylinderBuildContext,
): Shape3D {
  if (!parameters.honeycombMode) return shape
  assertGenerationCurrent(context)

  const cutPanel = (current: Shape3D, cutters: Shape3D[]): Shape3D => {
    const batchCount = Math.ceil(cutters.length / HONEYCOMB_CUT_BATCH_SIZE)
    const scope = context.booleanOperations?.createScope(batchCount)
    let result = current
    try {
      while (cutters.length > 0) {
        assertGenerationCurrent(context)
        const batch = cutters.splice(0, HONEYCOMB_CUT_BATCH_SIZE)
        let cutter: Shape3D | null = null
        try {
          if (batch.length === 1) {
            cutter = batch[0] ?? null
          } else {
            cutter = makeCompound(batch).asShape3D()
          }
          if (!cutter) throw new Error('OPENGRID_HONEYCOMB_CUTTER_EMPTY')
          const activeCutter = cutter
          const cut = measureBooleanInScope(scope, 'cut', () =>
            result.cut(activeCutter),
          )
          deleteShape(result)
          result = cut
        } finally {
          batch.forEach(deleteShape)
          if (cutter !== batch[0]) deleteShape(cutter)
        }
      }
      return result
    } catch (error) {
      if (result !== current) deleteShape(result)
      throw error
    }
  }

  let sideCutters: Shape3D[] = []
  let bottomCutters: Shape3D[] = []
  const inputShape = shape
  try {
    sideCutters = makeOpenGridStackableCylinderSideHoneycombCutters(
      parameters,
      context,
    )
    assertGenerationCurrent(context)
    shape = cutPanel(shape, sideCutters)
    sideCutters = []
    assertGenerationCurrent(context)
    bottomCutters = makeOpenGridStackableCylinderBottomHoneycombCutters(
      parameters,
      context,
    )
    shape = cutPanel(shape, bottomCutters)
    bottomCutters = []
    return shape
  } catch (error) {
    if (shape !== inputShape) deleteShape(shape)
    throw error
  } finally {
    sideCutters.forEach(deleteShape)
    bottomCutters.forEach(deleteShape)
  }
}

function directionalBoxProbe(
  direction: OpenGridStackableCylinderOpeningDirection,
  minimumRadius: number,
  maximumRadius: number,
  tangentHalfWidth: number,
  minimumZ: number,
  maximumZ: number,
): Shape3D {
  const probe = makeBox(
    [minimumRadius, -tangentHalfWidth, minimumZ],
    [maximumRadius, tangentHalfWidth, maximumZ],
  )
  const quarterTurns = quarterTurnsForOpening(direction)
  if (quarterTurns === 0) return probe

  const rotated = probe.rotate(quarterTurns * 90, [0, 0, 0], [0, 0, 1])
  if (rotated !== probe) deleteShape(probe)
  return rotated
}

function volumeInDirectionalBoxProbe(
  shape: Shape3D,
  direction: OpenGridStackableCylinderOpeningDirection,
  minimumRadius: number,
  maximumRadius: number,
  tangentHalfWidth: number,
  minimumZ: number,
  maximumZ: number,
): number {
  const probe = directionalBoxProbe(
    direction,
    minimumRadius,
    maximumRadius,
    tangentHalfWidth,
    minimumZ,
    maximumZ,
  )
  try {
    return volumeInProbe(shape, probe)
  } finally {
    deleteShape(probe)
  }
}

function volumeAtRadialProbe(
  shape: Shape3D,
  radius: number,
  angleDegrees: number,
  z: number,
): number {
  const angleRadians = (angleDegrees * Math.PI) / 180
  const probe = makeCylinder(0.18, 0.04, [
    radius * Math.cos(angleRadians),
    radius * Math.sin(angleRadians),
    z,
  ])
  try {
    return volumeInProbe(shape, probe)
  } finally {
    deleteShape(probe)
  }
}

function readBounds(shape: Shape3D): Bounds {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as Bounds
  } finally {
    boundingBox.delete()
  }
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  let count = 0
  try {
    while (explorer.More()) {
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

function isBRepValid(shape: Shape3D): boolean {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    return analyzer.IsValid_2()
  } finally {
    analyzer.delete()
  }
}

function closeEnough(first: number, second: number, tolerance = 0.05): boolean {
  return Math.abs(first - second) <= tolerance
}

function normalizeParameters(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderParameters {
  const validation = validateOpenGridStackableCylinderParameters(parameters)
  if (!validation.valid) {
    throw new Error('OPENGRID_STACKABLE_CYLINDER_PARAMETERS_INVALID')
  }
  return validation.value
}

function volumeInProbe(shape: Shape3D, probe: Shape3D): number {
  const intersection = shape.intersect(probe)
  try {
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
  }
}

function volumeInAnnularProbe(
  shape: Shape3D,
  outerRadius: number,
  innerRadius: number,
  height: number,
  z: number,
): number {
  const probe = makeAnnularRing(outerRadius, innerRadius, height, z)
  try {
    return volumeInProbe(shape, probe)
  } finally {
    deleteShape(probe)
  }
}

function volumeInCylindricalProbe(
  shape: Shape3D,
  radius: number,
  height: number,
  z: number,
): number {
  const probe = makeCylinder(radius, height, [0, 0, z])
  try {
    return volumeInProbe(shape, probe)
  } finally {
    deleteShape(probe)
  }
}

function volumeInOffsetCylindricalProbe(
  shape: Shape3D,
  radius: number,
  height: number,
  x: number,
  y: number,
  z: number,
): number {
  const probe = makeCylinder(radius, height, [x, y, z])
  try {
    return volumeInProbe(shape, probe)
  } finally {
    deleteShape(probe)
  }
}

type RadialBoundaryProbe = {
  insideVolume: number
  outsideVolume: number
  valid: boolean
}

function inspectRadialBoundaryAtZ(
  shape: Shape3D,
  radius: number,
  z: number,
  solidInside: boolean,
): RadialBoundaryProbe {
  const probeHeight = 0.04
  const insideVolume = volumeInAnnularProbe(
    shape,
    radius - 0.02,
    radius - 0.08,
    probeHeight,
    z - probeHeight / 2,
  )
  const outsideVolume = volumeInAnnularProbe(
    shape,
    radius + 0.08,
    radius + 0.02,
    probeHeight,
    z - probeHeight / 2,
  )
  const volumeThreshold = 0.0001
  const insideMatches = solidInside
    ? insideVolume > volumeThreshold
    : insideVolume < volumeThreshold
  const outsideMatches = solidInside
    ? outsideVolume < volumeThreshold
    : outsideVolume > volumeThreshold

  return {
    insideVolume,
    outsideVolume,
    valid: insideMatches && outsideMatches,
  }
}

type CylindricalFaceRecord = {
  center: [number, number]
  diameter: number
  minZ: number
  maxZ: number
}

function readCylindricalFaceRecords(shape: Shape3D): CylindricalFaceRecord[] {
  const records: CylindricalFaceRecord[] = []
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      if (face.surface.surfaceType !== 'CYLINDRE') continue
      const [min, max] = boundingBox.bounds as Bounds
      records.push({
        center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2],
        diameter: Math.max(max[0] - min[0], max[1] - min[1]),
        minZ: min[2],
        maxZ: max[2],
      })
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return records
}

function readHoleQuality(
  parameters: OpenGridStackableCylinderParameters,
  records: CylindricalFaceRecord[],
): OpenGridStackableCylinderHoleQuality[] {
  const centers =
    parameters.bottomSeatMode === 'hole'
      ? openGridStackableCylinderHoleCentersFor(parameters)
      : []
  return centers.map((center) => ({
    center,
    sections: records
      .filter(
        (record) =>
          closeEnough(record.center[0], center[0], 0.08) &&
          closeEnough(record.center[1], center[1], 0.08),
      )
      .map((record) => ({
        diameter: record.diameter,
        minZ: record.minZ,
        maxZ: record.maxZ,
      }))
      .sort((first, second) => first.minZ - second.minZ),
  }))
}

function readFloorHoleRecords(
  shape: Shape3D,
  floorThickness: number,
  holeCenters: OpenGridStackableCylinderPoint2D[],
): CylindricalFaceRecord[] {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const largestHoleDiameter = Math.max(
    configuration.bottomHoleDiameter,
    configuration.innerHoleDiameter,
  )
  return readCylindricalFaceRecords(shape).filter(
    (record) =>
      record.diameter <= largestHoleDiameter + 0.2 &&
      record.minZ >= -0.1 &&
      record.minZ <= floorThickness + 0.1 &&
      record.maxZ >= -0.1 &&
      holeCenters.some(
        (center) =>
          closeEnough(record.center[0], center[0], 0.08) &&
          closeEnough(record.center[1], center[1], 0.08),
      ),
  )
}

function readIntegratedSeatRecords(
  shape: Shape3D,
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderIntegratedSeatRecord[] {
  const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION
  const centers = openGridStackableCylinderHoleCentersFor(parameters)
  const records = readCylindricalFaceRecords(shape).filter(
    (record) =>
      closeEnough(record.diameter, configuration.integratedSeatDiameter, 0.2) &&
      record.minZ <=
        configuration.integratedSeatMinZ +
          configuration.bottomEdgeFilletRadius +
          0.1 &&
      record.maxZ >= -0.1,
  )
  return centers.flatMap((center) =>
    records
      .filter(
        (record) =>
          closeEnough(record.center[0], center[0], 0.08) &&
          closeEnough(record.center[1], center[1], 0.08),
      )
      .map((record) => ({ ...record, center })),
  )
}

function readCenterHookQuality(
  shape: Shape3D,
): OpenGridStackableCylinderCenterHookQuality {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const margin = CENTER_HOOK_QUALITY_PROBE_MARGIN
  const partQuality = (
    width: number,
    depth: number,
    minZ: number,
    maxZ: number,
    probeMinimumZ = minZ - margin,
    probeMaximumZ = maxZ - margin,
  ) => {
    const probe = makeBox(
      [-width / 2 - margin, -depth / 2 - margin, probeMinimumZ],
      [width / 2 + margin, depth / 2 + margin, probeMaximumZ],
    )
    let intersection: Shape3D | null = null
    try {
      intersection = shape.intersect(probe)
      const bounds = readBounds(intersection)
      return {
        bounds: { min: bounds[0], max: bounds[1] },
        planWidth: bounds[1][0] - bounds[0][0],
        planDepth: bounds[1][1] - bounds[0][1],
        volume: measureVolume(intersection),
      }
    } finally {
      deleteShape(intersection)
      deleteShape(probe)
    }
  }

  const head = partQuality(
    configuration.centerHookWidth,
    configuration.centerHookDepth,
    configuration.centerHookHeadMinZ,
    configuration.centerHookHeadMaxZ,
  )
  const stem = partQuality(
    configuration.centerHookStemDiameter,
    configuration.centerHookStemDiameter,
    configuration.centerHookStemMinZ,
    configuration.centerHookStemMaxZ,
    configuration.centerHookStemMinZ + margin,
    configuration.centerHookStemMaxZ - margin,
  )
  const bounds: ModelBounds = {
    min: [head.bounds.min[0], head.bounds.min[1], head.bounds.min[2]],
    max: [head.bounds.max[0], head.bounds.max[1], stem.bounds.max[2]],
  }
  return {
    bounds,
    headBounds: head.bounds,
    stemBounds: stem.bounds,
    planWidth: head.planWidth,
    planDepth: head.planDepth,
    headPlanWidth: head.planWidth,
    headPlanDepth: head.planDepth,
    stemPlanWidth: stem.planWidth,
    stemPlanDepth: stem.planDepth,
    minZ: head.bounds.min[2],
    headHeight: configuration.centerHookHeadHeight,
    stemHeight: configuration.centerHookStemHeight,
    footprintVolume: head.volume + stem.volume,
    headVolume: head.volume,
    stemVolume: stem.volume,
    insertionClearancePerSide: Math.min(
      (configuration.centerHookNominalShortSide - head.planWidth) / 2,
      (configuration.centerHookNominalLongSide - head.planDepth) / 2,
    ),
    rotationClearance:
      configuration.centerHookStemHeight -
      configuration.centerHookFullPassageDepth,
    quarterTurnCaptureOverhang:
      head.planDepth - configuration.centerHookNominalShortSide,
  }
}

function countConicalFacesInRadialBand(
  shape: Shape3D,
  minZ: number,
  maxZ: number,
  minRadius: number,
  maxRadius = Number.POSITIVE_INFINITY,
): number {
  let count = 0
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      if (face.surface.surfaceType !== 'CONE') continue
      const [min, max] = boundingBox.bounds as Bounds
      const radialExtent = Math.max(
        Math.abs(min[0]),
        Math.abs(max[0]),
        Math.abs(min[1]),
        Math.abs(max[1]),
      )
      const zRangeMatches = min[2] >= minZ - 0.05 && max[2] <= maxZ + 0.05
      if (
        zRangeMatches &&
        radialExtent >= minRadius - 0.05 &&
        radialExtent <= maxRadius + 0.05
      ) {
        count += 1
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return count
}

function maxConicalFaceHeightInRadialBand(
  shape: Shape3D,
  minZ: number,
  maxZ: number,
  minRadius: number,
  maxRadius = Number.POSITIVE_INFINITY,
): number {
  let maximumHeight = 0
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      if (face.surface.surfaceType !== 'CONE') continue
      const [min, max] = boundingBox.bounds as Bounds
      const radialExtent = Math.max(
        Math.abs(min[0]),
        Math.abs(max[0]),
        Math.abs(min[1]),
        Math.abs(max[1]),
      )
      const zRangeMatches = min[2] >= minZ - 0.05 && max[2] <= maxZ + 0.05
      if (
        zRangeMatches &&
        radialExtent >= minRadius - 0.05 &&
        radialExtent <= maxRadius + 0.05
      ) {
        maximumHeight = Math.max(maximumHeight, max[2] - min[2])
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return maximumHeight
}

function conicalFaceAngleDegreesInRadialBand(
  shape: Shape3D,
  minZ: number,
  maxZ: number,
  minRadius: number,
  maxRadius: number,
): number {
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    let surface: { surfaceType: string; delete: () => void } | null = null
    let normal: ReturnType<typeof face.normalAt> | null = null
    try {
      surface = face.surface
      if (surface.surfaceType !== 'CONE') continue
      const [min, max] = boundingBox.bounds as Bounds
      const radialExtent = Math.max(
        Math.abs(min[0]),
        Math.abs(max[0]),
        Math.abs(min[1]),
        Math.abs(max[1]),
      )
      const zRangeMatches = min[2] >= minZ - 0.05 && max[2] <= maxZ + 0.05
      if (
        !zRangeMatches ||
        radialExtent < minRadius - 0.05 ||
        radialExtent > maxRadius + 0.05
      ) {
        continue
      }
      normal = face.normalAt()
      const radialNormal = Math.hypot(normal.x, normal.y)
      if (radialNormal <= 0.0001) continue
      return (Math.atan2(Math.abs(normal.z), radialNormal) * 180) / Math.PI
    } finally {
      normal?.delete()
      surface?.delete()
      boundingBox.delete()
      face.delete()
    }
  }
  return 0
}

function countSurfaceFacesInZBand(
  shape: Shape3D,
  surfaceType: string,
  minZ: number,
  maxZ: number,
  minRadius: number,
  maxRadius: number,
): number {
  let count = 0
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      if (face.surface.surfaceType !== surfaceType) continue
      const [min, max] = boundingBox.bounds as Bounds
      const radialExtent = Math.max(
        Math.abs(min[0]),
        Math.abs(max[0]),
        Math.abs(min[1]),
        Math.abs(max[1]),
      )
      const zRangeMatches = min[2] >= minZ - 0.05 && max[2] <= maxZ + 0.05
      if (
        zRangeMatches &&
        radialExtent >= minRadius - 0.05 &&
        radialExtent <= maxRadius + 0.05
      ) {
        count += 1
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return count
}

function maxSurfaceHeightInZBand(
  shape: Shape3D,
  surfaceType: string,
  minZ: number,
  maxZ: number,
  minRadius: number,
  maxRadius: number,
): number {
  let maximumHeight = 0
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      if (face.surface.surfaceType !== surfaceType) continue
      const [min, max] = boundingBox.bounds as Bounds
      const radialExtent = Math.max(
        Math.abs(min[0]),
        Math.abs(max[0]),
        Math.abs(min[1]),
        Math.abs(max[1]),
      )
      const zRangeMatches = min[2] >= minZ - 0.05 && max[2] <= maxZ + 0.05
      if (
        zRangeMatches &&
        radialExtent >= minRadius - 0.05 &&
        radialExtent <= maxRadius + 0.05
      ) {
        maximumHeight = Math.max(maximumHeight, max[2] - min[2])
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return maximumHeight
}

function expectedInterfaceProbes(
  parameters: OpenGridStackableCylinderParameters,
): {
  protrusionRadius: number
  grooveOuterRadius: number
} {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  return {
    protrusionRadius: derived.matingProtrusionRadius,
    grooveOuterRadius: derived.radius + configuration.stackFitClearance,
  }
}

function expectedLowerConicalFaceCount(
  profile: OpenGridStackableCylinderProfile,
): number {
  if (profile === 'thin') return 3
  if (profile === 'bottom-plate') return 1
  return 2
}

export function inspectOpenGridStackableCylinderInterface(
  shape: Shape3D,
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderInterfaceQualityReport {
  parameters = normalizeParameters(parameters)
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const expected = expectedInterfaceProbes(parameters)
  const actualBounds = readBounds(shape)
  const holeCenters =
    parameters.bottomSeatMode === 'hole'
      ? openGridStackableCylinderHoleCentersFor(parameters)
      : []
  const floorHoleRecords = readFloorHoleRecords(
    shape,
    derived.floorThickness,
    holeCenters,
  )
  const integratedSeatRecords =
    parameters.bottomSeatMode === 'integrated'
      ? readIntegratedSeatRecords(shape, parameters)
      : []
  const centerHook =
    parameters.bottomSeatMode === 'center-hook'
      ? readCenterHookQuality(shape)
      : null
  const openingQuality = OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS.map(
    (direction): OpenGridStackableCylinderOpeningQuality => {
      const opening = derived.openings[direction]
      if (!opening.enabled) {
        return {
          direction,
          enabled: false,
          bottomZ: opening.bottomZ,
          bottomLength: opening.bottomLength,
          upperWidth: opening.upperWidth,
          bottomBoundaryProbeVolume: 0,
          topBoundaryProbeVolume: 0,
          valid: true,
        }
      }

      const bottomProbeWidth = Math.min(opening.bottomLength / 4, 0.25)
      const topProbeWidth = Math.min(opening.upperWidth / 4, 0.25)
      const radialProbeMinimum = derived.radius - derived.wallThickness - 0.1
      const radialProbeMaximum = derived.radius + 0.1
      const bottomBoundaryProbeVolume = volumeInDirectionalBoxProbe(
        shape,
        direction,
        radialProbeMinimum,
        radialProbeMaximum,
        bottomProbeWidth,
        opening.bottomZ + 0.05,
        opening.bottomZ + 0.15,
      )
      const topBoundaryProbeVolume = volumeInDirectionalBoxProbe(
        shape,
        direction,
        radialProbeMinimum,
        radialProbeMaximum,
        topProbeWidth,
        parameters.height - 0.1,
        parameters.height + 0.01,
      )
      return {
        direction,
        enabled: true,
        bottomZ: opening.bottomZ,
        bottomLength: opening.bottomLength,
        upperWidth: opening.upperWidth,
        bottomBoundaryProbeVolume,
        topBoundaryProbeVolume,
        valid:
          bottomBoundaryProbeVolume < 0.0001 && topBoundaryProbeVolume < 0.0001,
      }
    },
  )
  const directionAngles: Record<
    OpenGridStackableCylinderOpeningDirection,
    number
  > = {
    '+X': 0,
    '+Y': 90,
    '-X': 180,
    '-Y': 270,
  }
  const adjacentDirections = [
    ['+X', '+Y'],
    ['+Y', '-X'],
    ['-X', '-Y'],
    ['-Y', '+X'],
  ] as const
  let neighboringOpeningProbeCount = 0
  let neighboringOpeningExpectedProbeCount = 0
  for (const [firstDirection, secondDirection] of adjacentDirections) {
    const first = derived.openings[firstDirection]
    const second = derived.openings[secondDirection]
    if (!first.enabled || !second.enabled) continue
    neighboringOpeningExpectedProbeCount += 1
    const firstAngle =
      directionAngles[firstDirection] + (first.angularHalfWidth * 180) / Math.PI
    const secondAngle =
      directionAngles[secondDirection] -
      (second.angularHalfWidth * 180) / Math.PI
    const gapAngle = (firstAngle + secondAngle) / 2
    const gapVolume = volumeAtRadialProbe(
      shape,
      derived.radius - derived.wallThickness / 2,
      gapAngle,
      parameters.height -
        (derived.topInnerChamfer - configuration.topInnerChamferLand) -
        0.08,
    )
    if (gapVolume > 0.0000001) neighboringOpeningProbeCount += 1
  }
  const cavityRadius = derived.innerRadius
  const bottomProtrusionVolume = volumeInCylindricalProbe(
    shape,
    expected.protrusionRadius - 0.02,
    Math.max(configuration.bottomVerticalHeight - 0.08, 0.1),
    0.04,
  )
  const bottomGrooveResidualVolume =
    derived.profile === 'bottom-plate'
      ? volumeInAnnularProbe(
          shape,
          expected.grooveOuterRadius + 0.02,
          expected.protrusionRadius + 0.01,
          0.01,
          0,
        )
      : volumeInAnnularProbe(
          shape,
          expected.grooveOuterRadius + 0.02,
          expected.protrusionRadius + 0.02,
          0.2,
          0.05,
        )
  const topOuterConicalFaceCount = countConicalFacesInRadialBand(
    shape,
    parameters.height - 0.05,
    parameters.height + 0.05,
    parameters.diameter / 2 - 0.01,
  )
  const topInnerChamferFaceCount = countConicalFacesInRadialBand(
    shape,
    parameters.height -
      (derived.topInnerChamfer - configuration.topInnerChamferLand) -
      0.05,
    parameters.height + 0.05,
    cavityRadius - 0.2,
    cavityRadius +
      derived.topInnerChamfer -
      configuration.topInnerChamferLand +
      0.2,
  )
  const topInnerChamferHeight = maxConicalFaceHeightInRadialBand(
    shape,
    parameters.height -
      (derived.topInnerChamfer - configuration.topInnerChamferLand) -
      0.05,
    parameters.height + 0.05,
    cavityRadius - 0.2,
    cavityRadius +
      derived.topInnerChamfer -
      configuration.topInnerChamferLand +
      0.2,
  )
  const bottomFootChamferFaceCount =
    derived.profile === 'bottom-plate'
      ? 0
      : countConicalFacesInRadialBand(
          shape,
          -0.05,
          configuration.bottomFootBevel + 0.05,
          derived.lowerFootRadius - 0.2,
          expected.protrusionRadius + 0.2,
        )
  const bottomFootChamferHeight =
    derived.profile === 'bottom-plate'
      ? 0
      : maxConicalFaceHeightInRadialBand(
          shape,
          -0.05,
          configuration.bottomFootBevel + 0.05,
          derived.lowerFootRadius - 0.2,
          expected.protrusionRadius + 0.2,
        )
  const bottomOuterChamferFaceCount = countConicalFacesInRadialBand(
    shape,
    derived.outerTransitionStartZ - 0.05,
    derived.outerTransitionEndZ + 0.05,
    derived.outerTransitionStartRadius - 0.2,
    parameters.diameter / 2 + 0.2,
  )
  const bottomOuterChamferHeight = maxConicalFaceHeightInRadialBand(
    shape,
    derived.outerTransitionStartZ - 0.05,
    derived.outerTransitionEndZ + 0.05,
    derived.outerTransitionStartRadius - 0.2,
    parameters.diameter / 2 + 0.2,
  )
  const innerRampFaceCount =
    derived.profile === 'thin'
      ? countConicalFacesInRadialBand(
          shape,
          derived.flatFloorZ - 0.05,
          derived.innerRampEndZ + 0.05,
          derived.flatFloorRadius - 0.2,
          derived.innerRampEndRadius + 0.2,
        )
      : 0
  const innerRampHeight =
    derived.profile === 'thin'
      ? maxConicalFaceHeightInRadialBand(
          shape,
          derived.flatFloorZ - 0.05,
          derived.innerRampEndZ + 0.05,
          derived.flatFloorRadius - 0.2,
          derived.innerRampEndRadius + 0.2,
        )
      : 0
  const largestHoleRadius =
    Math.max(
      configuration.bottomHoleDiameter,
      configuration.innerHoleDiameter,
    ) / 2
  const locatingSeatRadius =
    parameters.bottomSeatMode === 'integrated'
      ? OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatDiameter / 2
      : largestHoleRadius
  const outerHoleCenters =
    openGridStackableCylinderHoleCentersFor(parameters).slice(1)
  const holeOuterClearances = outerHoleCenters.map(
    (center) =>
      derived.radius - Math.hypot(center[0], center[1]) - locatingSeatRadius,
  )
  const holeFlatFloorClearances =
    derived.profile === 'thin'
      ? outerHoleCenters.map(
          (center) =>
            derived.flatFloorRadius -
            Math.hypot(center[0], center[1]) -
            locatingSeatRadius,
        )
      : []
  const solidFrameProbeInset =
    (OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame -
      OPENGRID_HONEYCOMB_CONFIGURATION.bottomLattice.cellRadius) /
    2
  const floorProbeOffset = parameters.honeycombMode
    ? Math.max(0, derived.flatFloorRadius - solidFrameProbeInset)
    : Math.min(derived.flatFloorRadius - 0.4, largestHoleRadius + 0.5)
  const floorProbeZ = parameters.honeycombMode
    ? Math.max(0.02, derived.flatFloorZ / 2)
    : derived.flatFloorZ - 0.04
  const centralFloorBelowVolume = volumeInOffsetCylindricalProbe(
    shape,
    0.1,
    0.04,
    floorProbeOffset,
    0,
    floorProbeZ,
  )
  const centralFloorAboveVolume = volumeInOffsetCylindricalProbe(
    shape,
    0.1,
    0.04,
    floorProbeOffset,
    0,
    derived.flatFloorZ + 0.04,
  )

  const effectiveTopInnerChamfer =
    derived.topInnerChamfer - configuration.topInnerChamferLand
  const straightWallProbeZ = parameters.height - effectiveTopInnerChamfer - 0.5
  const straightWallInnerProbe = inspectRadialBoundaryAtZ(
    shape,
    derived.innerRadius,
    straightWallProbeZ,
    false,
  )
  const straightWallOuterProbe = inspectRadialBoundaryAtZ(
    shape,
    derived.radius,
    straightWallProbeZ,
    true,
  )
  const straightWallBoundaryProbeCount =
    Number(straightWallInnerProbe.valid) + Number(straightWallOuterProbe.valid)
  const straightWallThickness = derived.radius - derived.innerRadius

  let innerRampBoundaryProbeCount = 0
  if (derived.profile === 'thin') {
    const rampProbeStartZ = Math.max(
      derived.flatFloorZ,
      derived.outerTransitionStartZ,
    )
    const rampSampleZs = [
      rampProbeStartZ + 0.25,
      rampProbeStartZ + 0.75,
      rampProbeStartZ + 1.25,
    ]
    for (const sampleZ of rampSampleZs) {
      const innerRampRadius =
        derived.flatFloorRadius + (sampleZ - derived.flatFloorZ)
      const outerTransitionRadius =
        sampleZ >= derived.outerTransitionEndZ
          ? derived.outerTransitionEndRadius
          : derived.outerTransitionStartRadius +
            (sampleZ - derived.outerTransitionStartZ)
      const innerProbe = inspectRadialBoundaryAtZ(
        shape,
        innerRampRadius,
        sampleZ,
        false,
      )
      const outerProbe = inspectRadialBoundaryAtZ(
        shape,
        outerTransitionRadius,
        sampleZ,
        true,
      )
      innerRampBoundaryProbeCount += Number(innerProbe.valid)
      innerRampBoundaryProbeCount += Number(outerProbe.valid)
    }
  }
  const innerRampAngleDegrees =
    derived.profile === 'thin'
      ? conicalFaceAngleDegreesInRadialBand(
          shape,
          derived.flatFloorZ - 0.05,
          derived.innerRampEndZ + 0.05,
          derived.flatFloorRadius - 0.2,
          derived.innerRampEndRadius + 0.2,
        )
      : 0
  const innerRampNormalThickness =
    derived.profile === 'thin'
      ? (() => {
          const rampMidpointZ = Math.max(
            derived.flatFloorZ + 0.75,
            derived.outerTransitionStartZ + 0.75,
          )
          const rampMidpointInnerRadius =
            derived.flatFloorRadius + (rampMidpointZ - derived.flatFloorZ)
          const rampMidpointOuterRadius =
            rampMidpointZ >= derived.outerTransitionEndZ
              ? derived.outerTransitionEndRadius
              : derived.outerTransitionStartRadius +
                (rampMidpointZ - derived.outerTransitionStartZ)
          return (
            (rampMidpointOuterRadius - rampMidpointInnerRadius) / Math.SQRT2
          )
        })()
      : 0

  const bottomMatingProbeZ =
    derived.profile === 'bottom-plate'
      ? 0.05
      : configuration.bottomFootBevel + 0.2
  const bottomMatingProbeRadius =
    derived.profile === 'bottom-plate'
      ? derived.outerTransitionStartRadius +
        (bottomMatingProbeZ - derived.outerTransitionStartZ)
      : expected.protrusionRadius
  const bottomMatingProbe = inspectRadialBoundaryAtZ(
    shape,
    bottomMatingProbeRadius,
    bottomMatingProbeZ,
    true,
  )
  const bottomMatingClearance = derived.innerRadius - expected.protrusionRadius
  const bottomMatingBoundaryProbeCount = Number(bottomMatingProbe.valid)

  const positionedMating = shape
    .clone()
    .translate(0, 0, parameters.height - configuration.stackGrooveDepth)
  let matingIntersection: Shape3D | null = null
  let matingIntersectionVolume = 0
  try {
    matingIntersection = shape.intersect(positionedMating)
    matingIntersectionVolume = measureVolume(matingIntersection)
  } finally {
    deleteShape(matingIntersection)
    deleteShape(positionedMating)
  }

  const lowerConicalFaceCount = countConicalFacesInRadialBand(
    shape,
    -0.05,
    derived.innerRampEndZ + 0.05,
    derived.lowerFootRadius - 0.2,
    derived.radius + 0.2,
  )
  const expectedLowerConicalFaces = expectedLowerConicalFaceCount(
    derived.profile,
  )
  const lowerUnexpectedConicalFaceCount = Math.max(
    0,
    lowerConicalFaceCount - expectedLowerConicalFaces,
  )
  const bottomOuterFilletFaceCount = countSurfaceFacesInZBand(
    shape,
    'TORUS',
    -0.05,
    OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius + 0.05,
    0,
    Number.POSITIVE_INFINITY,
  )
  const internalFilletFaceCount = countSurfaceFacesInZBand(
    shape,
    'TORUS',
    derived.flatFloorZ - 0.05,
    derived.floorThickness + derived.innerFloorFilletRadius + 0.05,
    0,
    Number.POSITIVE_INFINITY,
  )
  const internalFilletHeight = maxSurfaceHeightInZBand(
    shape,
    'TORUS',
    derived.flatFloorZ - 0.05,
    derived.floorThickness + derived.innerFloorFilletRadius + 0.05,
    0,
    Number.POSITIVE_INFINITY,
  )
  // OpenCascade can expose the full underlying fillet torus in its bounds.
  // Normalize that representation only after an outside-radius probe confirms
  // that the physical solid still ends at the requested outer radius.
  const reportBounds =
    volumeInAnnularProbe(
      shape,
      derived.radius + 0.12,
      derived.radius + 0.02,
      0.04,
      derived.floorThickness + 0.3,
    ) < 0.0001
      ? {
          min: [
            -derived.radius,
            -derived.radius,
            boundsForOpenGridStackableCylinder(parameters).min[2],
          ] as [number, number, number],
          max: [derived.radius, derived.radius, parameters.height] as [
            number,
            number,
            number,
          ],
        }
      : { min: actualBounds[0], max: actualBounds[1] }
  return {
    honeycombMode: parameters.honeycombMode,
    honeycombCellCount:
      openGridStackableCylinderHoneycombCellCountFor(parameters),
    profile: derived.profile,
    thinBottomMode: parameters.thinBottomMode,
    bottomPlateMode: parameters.bottomPlateMode,
    bottomSeatMode: parameters.bottomSeatMode,
    floorThickness: derived.floorThickness,
    bottomHoleSectionDepth: derived.bottomHoleSectionDepth,
    bounds: reportBounds,
    volume: measureVolume(shape),
    solidCount: countSolids(shape),
    brepValid: isBRepValid(shape),
    holeRecordCount: floorHoleRecords.length,
    holes: readHoleQuality(parameters, floorHoleRecords),
    integratedSeatRecordCount: integratedSeatRecords.length,
    integratedSeats: integratedSeatRecords,
    centerHook,
    openings: openingQuality,
    neighboringOpeningProbeCount,
    neighboringOpeningExpectedProbeCount,
    holeOuterClearances,
    holeFlatFloorClearances,
    bottomProtrusionVolume,
    bottomGrooveResidualVolume,
    topOuterConicalFaceCount,
    topInnerChamferFaceCount,
    topInnerChamferHeight,
    bottomFootChamferFaceCount,
    bottomFootChamferHeight,
    bottomOuterChamferFaceCount,
    bottomOuterChamferHeight,
    bottomOuterFilletFaceCount,
    lowerUnexpectedConicalFaceCount,
    centralFloorBelowVolume,
    centralFloorAboveVolume,
    straightWallThickness,
    straightWallBoundaryProbeCount,
    innerRampFaceCount,
    innerRampHeight,
    innerRampAngleDegrees,
    innerRampNormalThickness,
    innerRampBoundaryProbeCount,
    bottomMatingClearance,
    bottomMatingBoundaryProbeCount,
    matingIntersectionVolume,
    internalFilletFaceCount,
    internalFilletHeight,
  }
}

function assertQuality(
  shape: Shape3D,
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderInterfaceQualityReport {
  parameters = normalizeParameters(parameters)
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const report = inspectOpenGridStackableCylinderInterface(shape, parameters)
  const expectedBounds = boundsForOpenGridStackableCylinder(parameters)
  const failures: string[] = []
  const actualCoordinates = [...report.bounds.min, ...report.bounds.max]
  const expectedCoordinates = [...expectedBounds.min, ...expectedBounds.max]

  if (
    actualCoordinates.some(
      (coordinate, index) =>
        !closeEnough(coordinate, expectedCoordinates[index]),
    )
  ) {
    failures.push('bounds')
  }
  if (!(report.volume > 0)) failures.push('volume')
  if (report.solidCount !== 1) failures.push('single-solid')
  if (!report.brepValid) failures.push('brep')
  if (report.openings.some((opening) => !opening.valid)) {
    failures.push('opening-profile')
  }
  if (
    report.neighboringOpeningProbeCount !==
    report.neighboringOpeningExpectedProbeCount
  ) {
    failures.push('opening-neighbor-bridge')
  }
  if (report.centralFloorBelowVolume <= 0.0001) {
    failures.push('central-floor-thickness')
  }
  if (report.centralFloorAboveVolume > 0.0001) {
    failures.push('central-floor-surface')
  }
  if (
    !closeEnough(report.straightWallThickness, derived.wallThickness) ||
    report.straightWallBoundaryProbeCount !== 2
  ) {
    failures.push('straight-wall-thickness')
  }
  const expectedLocatingCenters =
    openGridStackableCylinderHoleCentersFor(parameters)
  const expectedHoleCenters =
    parameters.bottomSeatMode === 'hole' ? expectedLocatingCenters : []
  const expectedHoleSectionCount = expectedHoleCenters.length * 2
  if (report.holeRecordCount !== expectedHoleSectionCount) {
    failures.push('hole-layout')
  }
  if (parameters.bottomSeatMode === 'hole') {
    for (const hole of report.holes) {
      if (hole.sections.length !== 2) {
        failures.push('stepped-holes')
        continue
      }
      const [lower, upper] = hole.sections
      if (
        !lower ||
        !upper ||
        !closeEnough(lower.diameter, configuration.bottomHoleDiameter) ||
        !closeEnough(lower.minZ, 0) ||
        !closeEnough(lower.maxZ, derived.bottomHoleSectionDepth) ||
        !closeEnough(upper.diameter, configuration.innerHoleDiameter) ||
        !closeEnough(upper.minZ, derived.bottomHoleSectionDepth) ||
        !closeEnough(
          upper.maxZ,
          derived.bottomHoleSectionDepth + configuration.innerHoleSectionDepth,
        )
      ) {
        failures.push('stepped-hole-profile')
      }
    }
  }
  if (
    parameters.bottomSeatMode === 'hole' &&
    !compatibilityFixturePasses(
      shape,
      derived.floorThickness,
      derived.bottomHoleSectionDepth,
    )
  ) {
    failures.push('compatibility-fixture')
  }
  const expectedIntegratedSeatCount =
    parameters.bottomSeatMode === 'integrated'
      ? expectedLocatingCenters.length
      : 0
  if (report.integratedSeatRecordCount !== expectedIntegratedSeatCount) {
    failures.push('integrated-seat-layout')
  }
  for (const seat of report.integratedSeats) {
    if (
      !closeEnough(
        seat.diameter,
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatDiameter,
      ) ||
      !closeEnough(
        seat.minZ,
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ +
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius,
      ) ||
      !closeEnough(seat.maxZ, 0)
    ) {
      failures.push('integrated-seat-profile')
    }
  }
  if (parameters.bottomSeatMode === 'center-hook') {
    const centerHook = report.centerHook
    const expectedHeadVolume =
      configuration.centerHookWidth *
      configuration.centerHookDepth *
      (configuration.centerHookHeadHeight - CENTER_HOOK_QUALITY_PROBE_MARGIN)
    const expectedStemVolume =
      Math.PI *
      (configuration.centerHookStemDiameter / 2) ** 2 *
      (configuration.centerHookStemHeight -
        2 * CENTER_HOOK_QUALITY_PROBE_MARGIN)
    if (!centerHook) {
      failures.push('center-hook-missing')
    } else {
      if (
        !closeEnough(centerHook.headPlanWidth, configuration.centerHookWidth) ||
        !closeEnough(centerHook.headPlanDepth, configuration.centerHookDepth) ||
        !closeEnough(centerHook.minZ, configuration.centerHookMinZ) ||
        centerHook.headVolume < expectedHeadVolume * 0.95
      ) {
        failures.push('center-hook-envelope')
      }
      if (
        !closeEnough(
          centerHook.stemPlanWidth,
          configuration.centerHookStemDiameter,
        ) ||
        !closeEnough(
          centerHook.stemPlanDepth,
          configuration.centerHookStemDiameter,
        ) ||
        centerHook.stemVolume < expectedStemVolume * 0.95
      ) {
        failures.push('center-hook-rotation-neck')
      }
      if (centerHook.insertionClearancePerSide <= 0) {
        failures.push('center-hook-clearance')
      }
      if (
        centerHook.rotationClearance <= 0 ||
        centerHook.quarterTurnCaptureOverhang <= 0
      ) {
        failures.push('center-hook-quarter-turn')
      }
    }
  } else if (report.centerHook !== null) {
    failures.push('center-hook-unexpected')
  }
  const largestHoleRadius =
    Math.max(
      configuration.bottomHoleDiameter,
      configuration.innerHoleDiameter,
    ) / 2
  const locatingSeatRadius =
    parameters.bottomSeatMode === 'integrated'
      ? OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatDiameter / 2
      : largestHoleRadius
  for (const center of expectedLocatingCenters.slice(1)) {
    const centerRadius = Math.hypot(center[0], center[1])
    const clearance = derived.radius - centerRadius - locatingSeatRadius
    if (clearance < configuration.outerEdgeClearance - 0.05) {
      failures.push('hole-edge-clearance')
    }
    if (derived.profile === 'thin') {
      const flatFloorClearance =
        derived.flatFloorRadius - centerRadius - locatingSeatRadius
      if (flatFloorClearance < configuration.flatFloorClearance - 0.05) {
        failures.push('hole-flat-floor-clearance')
      }
    }
  }
  if (report.bottomProtrusionVolume <= 0) failures.push('bottom-protrusion')
  if (report.bottomGrooveResidualVolume > 0.01) {
    failures.push('bottom-groove')
  }
  if (report.topOuterConicalFaceCount > 0) {
    failures.push('top-outer-interface')
  }
  if (report.topInnerChamferFaceCount === 0) {
    failures.push('top-inner-chamfer')
  }
  if (report.topInnerChamferHeight < derived.topInnerChamfer - 0.05) {
    failures.push('top-inner-chamfer-height')
  }
  if (derived.profile === 'bottom-plate') {
    if (
      report.bottomFootChamferFaceCount !== 0 ||
      report.bottomFootChamferHeight > 0.05
    ) {
      failures.push('bottom-foot-present')
    }
  } else {
    if (report.bottomFootChamferFaceCount === 0) {
      failures.push('bottom-foot-bevel')
    }
    if (
      report.bottomFootChamferHeight <
      configuration.bottomFootBevel -
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius -
        0.05
    ) {
      failures.push('bottom-foot-bevel-height')
    }
  }
  if (report.bottomOuterChamferFaceCount === 0) {
    failures.push('bottom-outer-slope')
  }
  const outerTransitionHeight =
    derived.outerTransitionEndZ - derived.outerTransitionStartZ
  const outerTransitionRun =
    derived.outerTransitionEndRadius - derived.outerTransitionStartRadius
  const outerTransitionAngle = Math.atan2(
    outerTransitionHeight,
    outerTransitionRun,
  )
  const bottomOuterFilletTrim =
    derived.profile === 'bottom-plate'
      ? OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.bottomEdgeFilletRadius *
        (1 - Math.cos(outerTransitionAngle))
      : 0
  if (
    report.bottomOuterChamferHeight <
    outerTransitionHeight - bottomOuterFilletTrim - 0.05
  ) {
    failures.push('bottom-outer-slope-height')
  }
  if (derived.profile === 'thin') {
    if (report.innerRampFaceCount === 0) {
      failures.push('inner-ramp')
    }
    if (
      report.innerRampHeight <
      derived.innerRampEndZ - derived.flatFloorZ - 0.05
    ) {
      failures.push('inner-ramp-height')
    }
    if (
      !closeEnough(report.innerRampAngleDegrees, 45, 0.1) ||
      (derived.profile === 'thin' &&
        !closeEnough(
          report.innerRampNormalThickness,
          derived.wallThickness,
          0.05,
        )) ||
      report.innerRampBoundaryProbeCount !== 6
    ) {
      failures.push('inner-ramp-profile')
    }
  } else if (
    report.internalFilletFaceCount !== 1 ||
    report.internalFilletHeight < configuration.innerFloorFilletRadius - 0.05
  ) {
    failures.push('internal-floor-fillet')
  }
  if (report.lowerUnexpectedConicalFaceCount !== 0) {
    failures.push('lower-filler')
  }
  if (
    !closeEnough(
      report.bottomMatingClearance,
      configuration.stackFitClearance,
    ) ||
    report.bottomMatingBoundaryProbeCount !== 1
  ) {
    failures.push('bottom-mating-clearance')
  }
  if (report.matingIntersectionVolume > 0.01) {
    failures.push('same-diameter-interference')
  }
  if (report.bottomOuterFilletFaceCount === 0) {
    failures.push('bottom-outer-fillet-missing')
  }
  if (
    derived.profile === 'thin' &&
    (report.internalFilletFaceCount !== 0 || report.internalFilletHeight > 0.05)
  ) {
    failures.push('internal-fillet-present')
  }
  if (failures.length > 0) {
    throw new Error(
      `OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID:${failures.join(';')}`,
    )
  }
  return report
}

export function assertOpenGridStackableCylinderQuality(
  shape: Shape3D,
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderInterfaceQualityReport {
  return assertQuality(shape, parameters)
}

export function buildOpenGridStackableCylinder(
  parameters: OpenGridStackableCylinderParameters,
  context: OpenGridStackableCylinderBuildContext = {},
): Shape3D {
  const validation = validateOpenGridStackableCylinderParameters(parameters)
  if (!validation.valid) {
    throw new Error('OPENGRID_STACKABLE_CYLINDER_PARAMETERS_INVALID')
  }
  const normalizedParameters = validation.value

  assertGenerationCurrent(context)
  let shape: Shape3D
  try {
    shape = makeCylinderShell(normalizedParameters)
  } catch (error) {
    throwStageError('OPENGRID_STACKABLE_CYLINDER_SHELL_INVALID', error)
  }
  try {
    try {
      shape = addBottomLocatingFeatures(shape, normalizedParameters, context)
    } catch (error) {
      throwStageError('OPENGRID_STACKABLE_CYLINDER_HOLES_INVALID', error)
    }
    try {
      shape = addSideOpenings(shape, normalizedParameters, context)
    } catch (error) {
      throwStageError('OPENGRID_STACKABLE_CYLINDER_OPENINGS_INVALID', error)
    }
    try {
      shape = applyHoneycombMode(shape, normalizedParameters, context)
    } catch (error) {
      throwStageError('OPENGRID_STACKABLE_CYLINDER_HONEYCOMB_INVALID', error)
    }
    assertGenerationCurrent(context)
    assertQuality(shape, normalizedParameters)
    return shape
  } catch (error) {
    deleteShape(shape)
    throw error
  }
}
