import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { beforeAll } from 'vitest'
import {
  makeBox,
  makeCylinder,
  measureVolume,
  setOC,
  type Shape3D,
} from 'replicad'
import {
  openGridOpenShelfDividerCentersFor,
  openGridOpenShelfFootprintFor,
  openGridOpenShelfShelfLowerSurfaceZFor,
  openGridStackableBoxActiveFloorTopZFor,
  openGridStackableCylinderDerivedGeometryFor,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_HONEYCOMB_BOTTOM_FEATURE_CLEARANCE,
  OPENGRID_HONEYCOMB_CELL_RADIUS,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  OPENGRID_HONEYCOMB_LOWER_FRAME,
  OPENGRID_HONEYCOMB_RIB_THICKNESS,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import {
  makeOpenGridStackableBoxBottomHoneycombCutters,
  makeOpenGridStackableBoxSideHoneycombCutters,
  makeOpenGridStackableCylinderBottomHoneycombCutters,
  makeOpenGridStackableCylinderSideHoneycombCutters,
  makeOpenGridOpenShelfPlateHoneycombCutters,
  makeOpenGridOpenShelfWallHoneycombCutters,
  openGridOpenShelfHoneycombCellCountFor,
  openGridStackableBoxBottomHoneycombCellCountFor,
  openGridStackableCylinderBottomHoneycombCellCountFor,
  openGridStackableBoxHoneycombCellCountFor,
  openGridStackableCylinderHoneycombCellCountFor,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb'
import {
  buildOpenGridStackableBox,
  buildOpenGridStackableBoxAsync,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { buildOpenGridStackableCylinder } from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'
import type { BooleanOperationReporter } from '../../src/cad-kernel/boolean-progress'

const createdShapes: Shape3D[] = []

const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const wasmPath =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => wasmPath,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function remember<T extends Shape3D>(shape: T): T {
  createdShapes.push(shape)
  return shape
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function cutterBoundsDescriptor(cutter: Shape3D) {
  const bounds = boundsOf(cutter)
  return {
    cutter,
    minimum: bounds[0]!,
    maximum: bounds[1]!,
    centerX: (bounds[0]![0]! + bounds[1]![0]!) / 2,
    centerY: (bounds[0]![1]! + bounds[1]![1]!) / 2,
    centerZ: (bounds[0]![2]! + bounds[1]![2]!) / 2,
    spanX: bounds[1]![0]! - bounds[0]![0]!,
    spanY: bounds[1]![1]! - bounds[0]![1]!,
    spanZ: bounds[1]![2]! - bounds[0]![2]!,
  }
}

function hasCylindricalFace(shape: Shape3D): boolean {
  const faces = shape.faces
  try {
    return faces.some((face) => face.surface.surfaceType === 'CYLINDRE')
  } finally {
    faces.forEach((face) => face.delete())
  }
}

function positiveXSideCutterDescriptors(cutters: readonly Shape3D[]) {
  return cutters
    .map((cutter) => {
      const bounds = boundsOf(cutter)
      return {
        centerX: (bounds[0]![0]! + bounds[1]![0]!) / 2,
        centerY: (bounds[0]![1]! + bounds[1]![1]!) / 2,
        centerZ: (bounds[0]![2]! + bounds[1]![2]!) / 2,
        spanX: bounds[1]![0]! - bounds[0]![0]!,
        spanY: bounds[1]![1]! - bounds[0]![1]!,
        spanZ: bounds[1]![2]! - bounds[0]![2]!,
      }
    })
    .filter((entry) => entry.centerX > 0 && entry.spanX < entry.spanY)
}

function completePositiveXSideCutterDescriptor(cutters: readonly Shape3D[]) {
  const configuration = OPENGRID_HONEYCOMB_CONFIGURATION
  return positiveXSideCutterDescriptors(cutters).find(
    (entry) =>
      Math.abs(entry.spanY - Math.sqrt(3) * configuration.cellRadius) <=
        0.001 && Math.abs(entry.spanZ - configuration.cellRadius * 2) <= 0.001,
  )
}

function cylinderSideCutterDescriptors(cutters: readonly Shape3D[]) {
  return cutters.map((cutter) => {
    const bounds = boundsOf(cutter)
    const centerX = (bounds[0]![0]! + bounds[1]![0]!) / 2
    const centerY = (bounds[0]![1]! + bounds[1]![1]!) / 2
    return {
      angle: Math.atan2(centerY, centerX),
      centerZ: (bounds[0]![2]! + bounds[1]![2]!) / 2,
      spanZ: bounds[1]![2]! - bounds[0]![2]!,
    }
  })
}

function completeBottomCutterDescriptors(cutters: readonly Shape3D[]) {
  const lattice = OPENGRID_HONEYCOMB_CONFIGURATION.bottomLattice
  const fullSpanX = Math.sqrt(3) * lattice.cellRadius
  const fullSpanY = lattice.cellRadius * 2
  const fullArea = (3 * Math.sqrt(3) * lattice.cellRadius ** 2) / 2
  return cutters.flatMap((cutter) => {
    const bounds = boundsOf(cutter)
    const spanX = bounds[1]![0]! - bounds[0]![0]!
    const spanY = bounds[1]![1]! - bounds[0]![1]!
    const spanZ = bounds[1]![2]! - bounds[0]![2]!
    const hasFullBounds =
      Math.abs(spanX - fullSpanX) <= 0.001 &&
      Math.abs(spanY - fullSpanY) <= 0.001
    const hasFullVolume =
      Math.abs(measureVolume(cutter) - fullArea * spanZ) <= 0.001
    if (!hasFullBounds || !hasFullVolume) return []
    return [
      {
        cutter,
        x: (bounds[0]![0]! + bounds[1]![0]!) / 2,
        y: (bounds[0]![1]! + bounds[1]![1]!) / 2,
      },
    ]
  })
}

function completeBottomCutter(
  cutters: readonly Shape3D[],
): Shape3D | undefined {
  return completeBottomCutterDescriptors(cutters).sort(
    (first, second) =>
      Math.hypot(first.x, first.y) - Math.hypot(second.x, second.y),
  )[0]?.cutter
}

function expectThroughFloorOpening(
  baseline: Shape3D,
  honeycomb: Shape3D,
  cutter: Shape3D | undefined,
) {
  expect(cutter).toBeDefined()
  if (!cutter) return

  const baselineIntersection = baseline.intersect(cutter)
  const honeycombIntersection = honeycomb.intersect(cutter)
  createdShapes.push(baselineIntersection, honeycombIntersection)
  expect(measureVolume(baselineIntersection)).toBeGreaterThan(0)
  expect(measureVolume(honeycombIntersection)).toBeCloseTo(0, 4)
}

afterEach(() => {
  for (const shape of createdShapes.splice(0)) shape.delete()
})

describe('OpenGrid honeycomb material-saving builders', () => {
  it('uses a printable staggered pitch instead of isolated hex holes', () => {
    const configuration = OPENGRID_HONEYCOMB_CONFIGURATION
    const nearestNeighborPitch =
      Math.sqrt(3) * configuration.cellRadius + configuration.ribThickness
    expect(configuration.cellRadius).toBe(OPENGRID_HONEYCOMB_CELL_RADIUS)
    expect(configuration.ribThickness).toBe(OPENGRID_HONEYCOMB_RIB_THICKNESS)
    expect(configuration.bottomLattice.cellRadius).toBe(
      OPENGRID_HONEYCOMB_CELL_RADIUS,
    )
    expect(configuration.bottomLattice.ribThickness).toBe(
      OPENGRID_HONEYCOMB_RIB_THICKNESS,
    )
    expect(configuration.lowerFrame).toBe(OPENGRID_HONEYCOMB_LOWER_FRAME)
    expect(configuration.bottomFeatureClearance).toBe(
      OPENGRID_HONEYCOMB_BOTTOM_FEATURE_CLEARANCE,
    )
    expect(configuration.anchorPitch).toBeCloseTo(nearestNeighborPitch, 8)
    expect(configuration.rowPitch).toBeCloseTo(
      (Math.sqrt(3) * nearestNeighborPitch) / 2,
      8,
    )
    expect(configuration.minimumPanelSpan).toBeGreaterThanOrEqual(
      configuration.cellRadius * 2,
    )
  })

  it('leaves the configured printable rib between neighboring side openings', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
      honeycombMode: true,
    }
    const cutters = makeOpenGridStackableBoxSideHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))

    const positiveXCutters = positiveXSideCutterDescriptors(cutters)

    const configuration = OPENGRID_HONEYCOMB_CONFIGURATION
    const horizontalNeighbors = positiveXCutters.flatMap((first, firstIndex) =>
      positiveXCutters.slice(firstIndex + 1).flatMap((second) => {
        const tangentDistance = Math.abs(second.centerY - first.centerY)
        const verticalDistance = Math.abs(second.centerZ - first.centerZ)
        if (
          Math.abs(tangentDistance - configuration.anchorPitch) > 0.001 ||
          verticalDistance > 0.001
        ) {
          return []
        }
        return [tangentDistance]
      }),
    )

    expect(horizontalNeighbors.length).toBeGreaterThan(0)
    const openingApothem = (Math.sqrt(3) * configuration.cellRadius) / 2
    expect(Math.min(...horizontalNeighbors) - openingApothem * 2).toBeCloseTo(
      configuration.ribThickness,
      2,
    )
  })

  it('orients the hex openings with a point at the top like the reference mesh', () => {
    const cutters = makeOpenGridStackableBoxSideHoneycombCutters({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
      honeycombMode: true,
    })
    cutters.forEach((cutter) => createdShapes.push(cutter))

    const configuration = OPENGRID_HONEYCOMB_CONFIGURATION
    const sample = completePositiveXSideCutterDescriptor(cutters)
    expect(sample).toBeDefined()
    expect(sample!.spanY).toBeCloseTo(
      Math.sqrt(3) * configuration.cellRadius,
      3,
    )
    expect(sample!.spanZ).toBeCloseTo(configuration.cellRadius * 2, 3)
    expect(sample!.spanZ).toBeGreaterThan(sample!.spanY)
  })

  it('uses the shared complete hex opening size on eligible floors and side walls', () => {
    const boxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
      honeycombMode: true,
    }
    const cylinderParameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 96,
      height: 60,
      bottomSeatMode: 'none' as const,
      honeycombMode: true,
    }
    const sideCutters =
      makeOpenGridStackableBoxSideHoneycombCutters(boxParameters)
    const boxFloorCutters =
      makeOpenGridStackableBoxBottomHoneycombCutters(boxParameters)
    const cylinderFloorCutters =
      makeOpenGridStackableCylinderBottomHoneycombCutters(cylinderParameters)
    ;[...sideCutters, ...boxFloorCutters, ...cylinderFloorCutters].forEach(
      (cutter) => createdShapes.push(cutter),
    )

    const sideOpening = completePositiveXSideCutterDescriptor(sideCutters)
    const boxFloorOpening = completeBottomCutter(boxFloorCutters)
    const cylinderFloorOpening = completeBottomCutter(cylinderFloorCutters)
    expect(sideOpening).toBeDefined()
    expect(boxFloorOpening).toBeDefined()
    expect(cylinderFloorOpening).toBeDefined()

    for (const floorOpening of [boxFloorOpening!, cylinderFloorOpening!]) {
      const bounds = boundsOf(floorOpening)
      const spanX = bounds[1]![0]! - bounds[0]![0]!
      const spanY = bounds[1]![1]! - bounds[0]![1]!
      expect(spanX).toBeCloseTo(sideOpening!.spanY, 3)
      expect(spanY).toBeCloseTo(sideOpening!.spanZ, 3)
    }
  })

  it('uses the shared lattice across protected Open Shelf panels', () => {
    const parameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      height: 200,
      cellX: 1,
      cellZ: 1,
      honeycombMode: true,
    }
    const wallCutters = makeOpenGridOpenShelfWallHoneycombCutters(parameters)
    const plateCutters = makeOpenGridOpenShelfPlateHoneycombCutters(parameters)
    ;[...wallCutters, ...plateCutters].forEach((cutter) =>
      createdShapes.push(cutter),
    )

    expect(wallCutters.length).toBeGreaterThan(0)
    expect(plateCutters.length).toBeGreaterThan(0)
    expect(openGridOpenShelfHoneycombCellCountFor(parameters)).toBeGreaterThan(
      0,
    )

    const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
    expect(honeycomb.bottomLattice.cellRadius).toBe(honeycomb.cellRadius)
    expect(honeycomb.bottomLattice.ribThickness).toBe(honeycomb.ribThickness)

    const wallOpening = wallCutters
      .map(cutterBoundsDescriptor)
      .filter((entry) => entry.spanY < entry.spanX)
      .toSorted(
        (first, second) =>
          second.spanX * second.spanZ - first.spanX * first.spanZ,
      )[0]
    const bottomOpeningBounds = plateCutters
      .map((cutter) => boundsOf(cutter))
      .filter((bounds) => bounds[0]![2]! < 0)
      .toSorted((first, second) => {
        const firstArea =
          (first[1]![0]! - first[0]![0]!) * (first[1]![1]! - first[0]![1]!)
        const secondArea =
          (second[1]![0]! - second[0]![0]!) * (second[1]![1]! - second[0]![1]!)
        return secondArea - firstArea
      })[0]!
    const bottomSpanX =
      bottomOpeningBounds[1]![0]! - bottomOpeningBounds[0]![0]!
    const bottomSpanY =
      bottomOpeningBounds[1]![1]! - bottomOpeningBounds[0]![1]!
    const expectedPlateSpanX = Math.sqrt(3) * honeycomb.bottomLattice.cellRadius
    const expectedPlateSpanY = honeycomb.bottomLattice.cellRadius * 2
    expect(wallOpening).toBeDefined()
    expect(wallOpening!.spanX).toBeCloseTo(expectedPlateSpanX, 3)
    expect(wallOpening!.spanZ).toBeCloseTo(expectedPlateSpanY, 3)
    expect(bottomSpanX).toBeCloseTo(expectedPlateSpanX, 3)
    expect(bottomSpanY).toBeCloseTo(expectedPlateSpanY, 3)
  })

  it('clips Open Shelf openings at every panel family and exact peg keep-out', () => {
    const parameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      cellX: 2,
      honeycombMode: true,
    }
    const wallCutters = makeOpenGridOpenShelfWallHoneycombCutters(parameters)
    const plateCutters = makeOpenGridOpenShelfPlateHoneycombCutters(parameters)
    ;[...wallCutters, ...plateCutters].forEach((cutter) =>
      createdShapes.push(cutter),
    )

    const [width] = openGridOpenShelfFootprintFor(parameters)
    const shelfConfiguration = OPENGRID_OPEN_SHELF_CONFIGURATION
    const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
    const wallDescriptors = wallCutters.map(cutterBoundsDescriptor)
    const plateDescriptors = plateCutters.map(cutterBoundsDescriptor)
    const dividerCenter = openGridOpenShelfDividerCentersFor(parameters)[0]!
    const outerWalls = wallDescriptors.filter(
      (entry) =>
        entry.spanX < entry.spanY &&
        Math.abs(entry.centerX) >
          width / 2 - shelfConfiguration.outerWallThickness - 0.2,
    )
    const dividers = wallDescriptors.filter(
      (entry) =>
        entry.spanX < entry.spanY &&
        Math.abs(entry.centerX - dividerCenter) < 0.2,
    )
    const backboard = wallDescriptors.filter(
      (entry) => entry.spanY < entry.spanX,
    )

    const angle = (parameters.angle * Math.PI) / 180
    const completeWallSpanY =
      Math.sqrt(3) * honeycomb.cellRadius * Math.cos(angle) +
      honeycomb.cellRadius * 2 * Math.sin(angle)
    const completeWallSpanZ =
      Math.sqrt(3) * honeycomb.cellRadius * Math.sin(angle) +
      honeycomb.cellRadius * 2 * Math.cos(angle)
    const hasClippedVerticalCell = (
      entries: ReturnType<typeof cutterBoundsDescriptor>[],
    ) =>
      entries.some(
        (entry) =>
          entry.spanY < completeWallSpanY - 0.05 ||
          entry.spanZ < completeWallSpanZ - 0.05,
      )
    expect(hasClippedVerticalCell(outerWalls), 'outer side walls').toBe(true)
    expect(hasClippedVerticalCell(dividers), 'internal dividers').toBe(true)

    const completeSideSpanX = Math.sqrt(3) * honeycomb.cellRadius
    const completeSideSpanZ = honeycomb.cellRadius * 2
    expect(
      backboard.some(
        (entry) =>
          entry.spanX < completeSideSpanX - 0.05 ||
          entry.spanZ < completeSideSpanZ - 0.05,
      ),
      'backboard',
    ).toBe(true)

    const bottom = plateDescriptors.filter((entry) => entry.minimum[2]! < 0)
    const slopedPlates = plateDescriptors.filter(
      (entry) => entry.minimum[2]! >= 0,
    )
    const completePlateSpanX = Math.sqrt(3) * honeycomb.bottomLattice.cellRadius
    const completePlateSpanY = honeycomb.bottomLattice.cellRadius * 2
    expect(
      bottom.some(
        (entry) =>
          entry.spanX < completePlateSpanX - 0.05 ||
          entry.spanY < completePlateSpanY - 0.05,
      ),
      'bottom panel',
    ).toBe(true)
    expect(
      slopedPlates.some((entry) => entry.spanX < completePlateSpanX - 0.05),
      'inclined shelves and top panel',
    ).toBe(true)
    expect(
      bottom.some((entry) => hasCylindricalFace(entry.cutter)),
      'exact circular locating-peg keep-out',
    ).toBe(true)
  })

  it('opens the inclined bottom wedge on outer walls and dividers', () => {
    const parameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      cellX: 2,
      honeycombMode: true,
    }
    const cutters = makeOpenGridOpenShelfWallHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))

    const descriptors = cutters.map(cutterBoundsDescriptor)
    const [width, depth] = openGridOpenShelfFootprintFor(parameters)
    const dividerCenter = openGridOpenShelfDividerCentersFor(parameters)[0]!
    const [shelfFrontZ, shelfRearZ] = openGridOpenShelfShelfLowerSurfaceZFor(
      parameters,
      1,
    )
    const yFront = -depth / 2
    const firstShelfLowerZAt = (y: number) =>
      shelfFrontZ + ((y - yFront) / depth) * (shelfRearZ - shelfFrontZ)
    const wedgeCutters = descriptors.filter(
      (entry) =>
        entry.spanX < entry.spanY &&
        entry.maximum[2]! < firstShelfLowerZAt(entry.centerY) - 0.05,
    )
    const outerWedgeCutter = wedgeCutters.find(
      (entry) =>
        Math.abs(entry.centerX) >
        width / 2 - OPENGRID_OPEN_SHELF_CONFIGURATION.outerWallThickness - 0.2,
    )
    const dividerWedgeCutter = wedgeCutters.find(
      (entry) => Math.abs(entry.centerX - dividerCenter) < 0.2,
    )

    expect(outerWedgeCutter, 'outer side bottom wedge').toBeDefined()
    expect(dividerWedgeCutter, 'divider bottom wedge').toBeDefined()
    const bridge = OPENGRID_HONEYCOMB_CONFIGURATION.ribThickness / 2
    for (const entry of [outerWedgeCutter, dividerWedgeCutter]) {
      if (!entry) continue
      expect(entry.minimum[2]!).toBeGreaterThanOrEqual(
        OPENGRID_OPEN_SHELF_CONFIGURATION.bottomThickness + bridge - 0.01,
      )
      expect(entry.maximum[2]!).toBeLessThanOrEqual(
        firstShelfLowerZAt(entry.minimum[1]!) - bridge + 0.01,
      )
    }
  })

  it('keeps inclined Open Shelf front and rear rails outside every wall cutter', () => {
    const parameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      height: 200,
      cellX: 2,
      cellZ: 2,
      angle: 15,
      honeycombMode: true,
    }
    const cutters = makeOpenGridOpenShelfWallHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))

    const descriptors = cutters.map(cutterBoundsDescriptor)
    const [width, depth] = openGridOpenShelfFootprintFor(parameters)
    const shelfConfiguration = OPENGRID_OPEN_SHELF_CONFIGURATION
    const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
    const outerWallSpan =
      shelfConfiguration.outerWallThickness + honeycomb.cutterMargin * 2
    const dividerSpan =
      shelfConfiguration.innerPlateThickness + honeycomb.cutterMargin * 2
    const outerWallCenters = [
      -width / 2 + shelfConfiguration.outerWallThickness / 2,
      width / 2 - shelfConfiguration.outerWallThickness / 2,
    ]
    const dividerCenters = openGridOpenShelfDividerCentersFor(parameters)
    const verticalPanelCutters = descriptors.filter((entry) => {
      const isOuterWall =
        Math.abs(entry.spanX - outerWallSpan) < 0.01 &&
        outerWallCenters.some(
          (center) => Math.abs(entry.centerX - center) < 0.01,
        )
      const isDivider =
        Math.abs(entry.spanX - dividerSpan) < 0.01 &&
        dividerCenters.some((center) => Math.abs(entry.centerX - center) < 0.01)
      return isOuterWall || isDivider
    })
    expect(verticalPanelCutters.length).toBeGreaterThan(0)

    const safeFrontY = -depth / 2 + honeycomb.sideFrame
    const safeRearY = depth / 2 - honeycomb.sideFrame
    for (const entry of verticalPanelCutters) {
      expect(entry.minimum[1]!, 'front rail').toBeGreaterThanOrEqual(
        safeFrontY - 0.01,
      )
      expect(entry.maximum[1]!, 'rear rail').toBeLessThanOrEqual(
        safeRearY + 0.01,
      )
    }
  })

  it('centers every staggered row within a box panel', () => {
    const cutters = makeOpenGridStackableBoxSideHoneycombCutters({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
      honeycombMode: true,
    })
    cutters.forEach((cutter) => createdShapes.push(cutter))

    const rows = new Map<string, number[]>()
    for (const entry of positiveXSideCutterDescriptors(cutters)) {
      const key = entry.centerZ.toFixed(3)
      const row = rows.get(key) ?? []
      row.push(entry.centerY)
      rows.set(key, row)
    }
    expect(rows.size).toBeGreaterThan(1)
    for (const row of rows.values()) {
      expect(Math.min(...row) + Math.max(...row)).toBeCloseTo(0, 3)
    }
  })

  it('keeps mesh cells on the same side outside an enabled opening', () => {
    const base = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
      honeycombMode: true,
    }
    const withOpening = {
      ...base,
      openingPlusXDepth: 6,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 90,
    }
    const baseCutters = makeOpenGridStackableBoxSideHoneycombCutters(base)
    const openingCutters =
      makeOpenGridStackableBoxSideHoneycombCutters(withOpening)
    baseCutters.forEach((cutter) => createdShapes.push(cutter))
    openingCutters.forEach((cutter) => createdShapes.push(cutter))

    const baseCount = positiveXSideCutterDescriptors(baseCutters).length
    const openingCount = positiveXSideCutterDescriptors(openingCutters).length
    expect(baseCount).toBeGreaterThan(0)
    expect(openingCount).toBeGreaterThan(0)
    expect(openingCount).toBeLessThan(baseCount)
  })

  it('uses the same dense Hex Mesh lattice around a cylinder wall', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 96,
      height: 60,
      honeycombMode: true,
    }
    const cutters =
      makeOpenGridStackableCylinderSideHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))

    const reportedSideCount =
      openGridStackableCylinderHoneycombCellCountFor(parameters) -
      openGridStackableCylinderBottomHoneycombCellCountFor(parameters)
    expect(cutters).toHaveLength(reportedSideCount)

    const rows = new Map<string, number[]>()
    for (const entry of cylinderSideCutterDescriptors(cutters)) {
      const key = entry.centerZ.toFixed(3)
      const row = rows.get(key) ?? []
      row.push(entry.angle)
      rows.set(key, row)
    }
    const fullestRow = [...rows.values()].sort(
      (first, second) => second.length - first.length,
    )[0]
    expect(fullestRow).toBeDefined()
    const sortedAngles = fullestRow!.toSorted((first, second) => first - second)
    const outerRadius =
      openGridStackableCylinderDerivedGeometryFor(parameters).radius
    const tangentGaps = sortedAngles.slice(1).map((angle, index) => {
      const previousAngle = sortedAngles[index]!
      return (angle - previousAngle) * outerRadius
    })
    expect(tangentGaps.length).toBeGreaterThan(0)
    const minimumGap = Math.min(...tangentGaps)
    const maximumGap = Math.max(...tangentGaps)
    expect(minimumGap).toBeGreaterThanOrEqual(
      OPENGRID_HONEYCOMB_CONFIGURATION.anchorPitch - 0.001,
    )
    expect(maximumGap / minimumGap).toBeLessThan(1.01)
    expect(maximumGap).toBeLessThan(
      OPENGRID_HONEYCOMB_CONFIGURATION.anchorPitch * 1.05,
    )
  })

  it('reports cells for the default visible profiles', () => {
    const boxCellCount = openGridStackableBoxHoneycombCellCountFor({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      honeycombMode: true,
    })
    const cylinderCellCount = openGridStackableCylinderHoneycombCellCountFor({
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      honeycombMode: true,
    })
    expect(boxCellCount, 'default box cell count').toBeGreaterThan(0)
    expect(cylinderCellCount, 'default cylinder cell count').toBeGreaterThan(0)
  })

  it('keeps floor mesh cells between the default functional holes', () => {
    const boxBottomCellCount = openGridStackableBoxBottomHoneycombCellCountFor({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      honeycombMode: true,
    })
    const cylinderBottomCellCount =
      openGridStackableCylinderBottomHoneycombCellCountFor({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        honeycombMode: true,
      })
    const deskPreviewBoxBottomCellCount =
      openGridStackableBoxBottomHoneycombCellCountFor({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        x: 4,
        y: 2,
        honeycombMode: true,
      })

    expect(boxBottomCellCount, 'default box floor cells').toBeGreaterThan(0)
    expect(
      cylinderBottomCellCount,
      'default cylinder floor cells',
    ).toBeGreaterThan(0)
    expect(
      deskPreviewBoxBottomCellCount,
      'Desk preview box floor cells',
    ).toBeGreaterThan(0)
  })

  it('removes material at default floor-cell centers while keeping hole keep-outs', () => {
    const boxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      cornerSeatMode: 'none' as const,
      topRimMode: 'flat-top' as const,
      bottomMode: 'thin-shell' as const,
      honeycombMode: true,
    }
    const cylinderParameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      bottomSeatMode: 'none' as const,
      honeycombMode: true,
    }
    const box = remember(buildOpenGridStackableBox(boxParameters))
    const boxBaseline = remember(
      buildOpenGridStackableBox({ ...boxParameters, honeycombMode: false }),
    )
    const cylinder = remember(
      buildOpenGridStackableCylinder(cylinderParameters),
    )
    const cylinderBaseline = remember(
      buildOpenGridStackableCylinder({
        ...cylinderParameters,
        honeycombMode: false,
      }),
    )
    const boxCutters =
      makeOpenGridStackableBoxBottomHoneycombCutters(boxParameters)
    const cylinderCutters =
      makeOpenGridStackableCylinderBottomHoneycombCutters(cylinderParameters)
    ;[...boxCutters, ...cylinderCutters].forEach((cutter) =>
      createdShapes.push(cutter),
    )

    for (const [baseline, shape, cutter] of [
      [
        boxBaseline,
        box,
        completeBottomCutter(boxCutters),
      ],
      [
        cylinderBaseline,
        cylinder,
        completeBottomCutter(cylinderCutters),
      ],
    ] as const) {
      expectThroughFloorOpening(baseline, shape, cutter)
    }
  }, 120000)

  it('materializes bottom openings in every usable default cylinder quadrant', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      bottomSeatMode: 'integrated' as const,
      honeycombMode: true,
    }
    const cutters =
      makeOpenGridStackableCylinderBottomHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))
    const baseline = remember(
      buildOpenGridStackableCylinder({
        ...parameters,
        honeycombMode: false,
      }),
    )
    const honeycomb = remember(buildOpenGridStackableCylinder(parameters))
    const derived = openGridStackableCylinderDerivedGeometryFor(parameters)

    const quadrantCounts = [0, 0, 0, 0]
    const representativeCenters = new Map<number, { x: number; y: number }>()
    for (const center of completeBottomCutterDescriptors(cutters)) {
      const quadrant = (center.x >= 0 ? 1 : 0) + (center.y >= 0 ? 2 : 0)
      quadrantCounts[quadrant]! += 1
      const currentRepresentative = representativeCenters.get(quadrant)
      if (
        !currentRepresentative ||
        Math.hypot(center.x, center.y) >
          Math.hypot(currentRepresentative.x, currentRepresentative.y)
      ) {
        representativeCenters.set(quadrant, center)
      }
    }
    expect(Math.min(...quadrantCounts)).toBeGreaterThanOrEqual(1)
    expect(
      Math.max(...quadrantCounts) - Math.min(...quadrantCounts),
    ).toBeLessThanOrEqual(1)
    expect(representativeCenters.size).toBe(4)

    for (const center of representativeCenters.values()) {
      const probe = makeBox(
        [center.x - 0.2, center.y - 0.2, 0.1],
        [center.x + 0.2, center.y + 0.2, derived.floorThickness - 0.1],
      )
      const baselineIntersection = baseline.intersect(probe)
      const honeycombIntersection = honeycomb.intersect(probe)
      createdShapes.push(probe, baselineIntersection, honeycombIntersection)
      expect(measureVolume(baselineIntersection)).toBeGreaterThan(0)
      expect(measureVolume(honeycombIntersection)).toBeCloseTo(0, 4)
    }
  }, 120000)

  it('clips cylinder-bottom boundary cells inside the protected flat-floor frame', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      bottomSeatMode: 'none' as const,
      honeycombMode: true,
    }
    const cutters =
      makeOpenGridStackableCylinderBottomHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))

    const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
    const protectedRadius =
      derived.flatFloorRadius - OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame
    const fullSpanX =
      Math.sqrt(3) * OPENGRID_HONEYCOMB_CONFIGURATION.bottomLattice.cellRadius
    const fullSpanY =
      OPENGRID_HONEYCOMB_CONFIGURATION.bottomLattice.cellRadius * 2
    const cutterBounds = cutters.map(boundsOf)

    expect(
      cutterBounds.some(
        (bounds) =>
          bounds[1]![0]! - bounds[0]![0]! < fullSpanX - 0.05 ||
          bounds[1]![1]! - bounds[0]![1]! < fullSpanY - 0.05,
      ),
    ).toBe(true)
    expect(
      Math.max(
        ...cutterBounds.flatMap((bounds) => [
          Math.abs(bounds[0]![0]!),
          Math.abs(bounds[1]![0]!),
          Math.abs(bounds[0]![1]!),
          Math.abs(bounds[1]![1]!),
        ]),
      ),
    ).toBeLessThanOrEqual(protectedRadius + 0.001)
  })

  it('fills the default-height side bands with multiple staggered rows', () => {
    const boxCutters = makeOpenGridStackableBoxSideHoneycombCutters({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      honeycombMode: true,
    })
    const cylinderCutters = makeOpenGridStackableCylinderSideHoneycombCutters({
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      honeycombMode: true,
    })
    boxCutters.forEach((cutter) => createdShapes.push(cutter))
    cylinderCutters.forEach((cutter) => createdShapes.push(cutter))

    const boxRows = new Set(
      positiveXSideCutterDescriptors(boxCutters).map((entry) =>
        entry.centerZ.toFixed(3),
      ),
    )
    const cylinderRows = new Set(
      cylinderSideCutterDescriptors(cylinderCutters).map((entry) =>
        entry.centerZ.toFixed(3),
      ),
    )
    expect(boxRows.size, 'default box side rows').toBeGreaterThanOrEqual(2)
    expect(
      cylinderRows.size,
      'default cylinder side rows',
    ).toBeGreaterThanOrEqual(2)
  })

  it('materializes unobstructed cylinder side rows across the periodic seam', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      height: 30,
      bottomSeatMode: 'none' as const,
      honeycombMode: true,
    }
    const cutters =
      makeOpenGridStackableCylinderSideHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))
    const baseline = remember(
      buildOpenGridStackableCylinder({
        ...parameters,
        honeycombMode: false,
      }),
    )
    const honeycomb = remember(buildOpenGridStackableCylinder(parameters))
    const derived = openGridStackableCylinderDerivedGeometryFor(parameters)

    const descriptors = cylinderSideCutterDescriptors(cutters)
    const rows = new Map<string, number[]>()
    for (const descriptor of descriptors) {
      const key = descriptor.centerZ.toFixed(3)
      const row = rows.get(key) ?? []
      row.push(descriptor.angle)
      rows.set(key, row)
    }

    for (const row of rows.values()) {
      const angles = row
        .map((angle) => (angle + Math.PI * 2) % (Math.PI * 2))
        .sort((left, right) => left - right)
      const gaps = angles.map((angle, index) => {
        const next = angles[(index + 1) % angles.length]!
        return (next - angle + Math.PI * 2) % (Math.PI * 2)
      })
      expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.05)
    }

    const completeRows = new Map<string, number[]>()
    for (const descriptor of descriptors) {
      if (
        descriptor.spanZ <
        OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius * 2 - 0.001
      ) {
        continue
      }
      const key = descriptor.centerZ.toFixed(3)
      const row = completeRows.get(key) ?? []
      row.push(descriptor.angle)
      completeRows.set(key, row)
    }
    const seamRow = [...completeRows.entries()].sort(
      ([, first], [, second]) => second.length - first.length,
    )[0]
    expect(seamRow).toBeDefined()
    const [centerZ, seamAngles] = seamRow!
    const sortedSeamAngles = seamAngles.toSorted((left, right) => left - right)
    const edgeAngles = [sortedSeamAngles[0], sortedSeamAngles.at(-1)]
    const probeRadius = derived.radius - derived.wallThickness / 2
    for (const angle of edgeAngles) {
      expect(angle).toBeDefined()
      const probe = makeCylinder(0.15, 0.4, [
        probeRadius * Math.cos(angle!),
        probeRadius * Math.sin(angle!),
        Number(centerZ) - 0.2,
      ])
      const baselineIntersection = baseline.intersect(probe)
      const honeycombIntersection = honeycomb.intersect(probe)
      createdShapes.push(probe, baselineIntersection, honeycombIntersection)
      expect(measureVolume(baselineIntersection)).toBeGreaterThan(0)
      expect(measureVolume(honeycombIntersection)).toBeCloseTo(0, 4)
    }
  }, 120000)

  it('keeps cylinder side cutters below the protected top inner chamfer', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      honeycombMode: true,
    }
    const cutters =
      makeOpenGridStackableCylinderSideHoneycombCutters(parameters)
    cutters.forEach((cutter) => createdShapes.push(cutter))

    const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
    const highestCutterZ = Math.max(
      ...cutters.map((cutter) => boundsOf(cutter)[1]![2]!),
    )
    expect(highestCutterZ).toBeLessThanOrEqual(
      parameters.height - derived.topInnerChamfer + 0.001,
    )
  })

  it('changes the generated default solids when enabled', () => {
    const box = remember(
      buildOpenGridStackableBox({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        cornerSeatMode: 'none',
        honeycombMode: true,
      }),
    )
    const boxBaseline = remember(
      buildOpenGridStackableBox({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        cornerSeatMode: 'none',
      }),
    )
    const cylinder = remember(
      buildOpenGridStackableCylinder({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        bottomSeatMode: 'none',
        honeycombMode: true,
      }),
    )
    const cylinderBaseline = remember(
      buildOpenGridStackableCylinder({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        bottomSeatMode: 'none',
      }),
    )

    expect(measureVolume(box)).toBeLessThan(measureVolume(boxBaseline))
    expect(measureVolume(cylinder)).toBeLessThan(
      measureVolume(cylinderBaseline),
    )
  }, 120000)

  it('anchors safe cells deterministically and falls back on small panels', () => {
    const box = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
      honeycombMode: true,
    }
    const cylinder = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 96,
      height: 60,
      bottomSeatMode: 'none' as const,
      honeycombMode: true,
    }
    const smallBox = {
      ...box,
      x: 0.5,
      y: 0.5,
      height: 10,
    }
    const smallCylinder = {
      ...cylinder,
      innerDiameter: 20,
      height: 10,
      bottomSeatMode: 'none' as const,
    }

    const boxCellCount = openGridStackableBoxHoneycombCellCountFor(box)
    const cylinderCellCount =
      openGridStackableCylinderHoneycombCellCountFor(cylinder)
    expect(boxCellCount).toBeGreaterThan(0)
    expect(openGridStackableBoxHoneycombCellCountFor(box)).toBe(boxCellCount)
    expect(openGridStackableBoxHoneycombCellCountFor(smallBox)).toBeGreaterThan(
      0,
    )
    expect(
      openGridStackableBoxBottomHoneycombCellCountFor(smallBox),
    ).toBe(0)
    expect(cylinderCellCount).toBeGreaterThan(0)
    expect(openGridStackableCylinderHoneycombCellCountFor(smallCylinder)).toBe(
      0,
    )

    const smallBoxShape = remember(
      buildOpenGridStackableBox({
        ...smallBox,
        cornerSeatMode: 'none',
      }),
    )
    const smallCylinderShape = remember(
      buildOpenGridStackableCylinder(smallCylinder),
    )
    expect(measureVolume(smallBoxShape)).toBeGreaterThan(0)
    expect(measureVolume(smallCylinderShape)).toBeGreaterThan(0)
  }, 120_000)

  it('honors stale-generation cancellation before honeycomb output is returned', () => {
    expect(() =>
      buildOpenGridStackableBox(
        {
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          x: 3,
          y: 3,
          height: 60,
          honeycombMode: true,
        },
        { isGenerationCurrent: () => false },
      ),
    ).toThrow('STALE_GENERATION')
    expect(() =>
      buildOpenGridStackableCylinder(
        {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          innerDiameter: 100,
          height: 60,
          honeycombMode: true,
        },
        { isGenerationCurrent: () => false },
      ),
    ).toThrow('STALE_GENERATION')
  })

  it('yields between honeycomb batches so cancellation can interrupt an in-flight build', async () => {
    let current = true
    let yields = 0

    await expect(
      buildOpenGridStackableBoxAsync(
        {
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          x: 7,
          y: 7,
          height: 20,
          cornerSeatMode: 'none',
          fullBottomHoleGrid: false,
          honeycombMode: true,
        },
        {
          isGenerationCurrent: () => current,
          yieldToEventLoop: async () => {
            yields += 1
            current = false
          },
        },
      ),
    ).rejects.toThrow('STALE_GENERATION')
    expect(yields).toBeGreaterThan(0)
  }, 120_000)

  it('deletes the side-cut cylinder when cancellation arrives before floor cutting', () => {
    let completedOperationCount = 0
    let trackedResultDeleted = false
    let disposeTrackedResult: (() => void) | undefined
    const reporter: BooleanOperationReporter = {
      createScope() {
        return {
          measure<T>(_kind: 'cut' | 'fuse' | 'intersect', operation: () => T) {
            const result = operation()
            completedOperationCount += 1
            if (completedOperationCount === 1) {
              const trackedResult = result as unknown as Shape3D
              const originalDelete = trackedResult.delete.bind(trackedResult)
              disposeTrackedResult = originalDelete
              trackedResult.delete = () => {
                trackedResultDeleted = true
                originalDelete()
              }
            }
            return result
          },
          measureCount<T>(
            _kind: 'cut' | 'fuse' | 'intersect',
            _count: number,
            operation: () => T,
          ) {
            return this.measure(_kind, operation)
          },
        }
      },
    }

    expect(() =>
      buildOpenGridStackableCylinder(
        {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          innerDiameter: 56,
          height: 30,
          bottomSeatMode: 'none' as const,
          honeycombMode: true,
        },
        {
          booleanOperations: reporter,
          isGenerationCurrent: () => completedOperationCount === 0,
        },
      ),
    ).toThrow('STALE_GENERATION')

    const deletionObservedBeforeTestCleanup = trackedResultDeleted
    if (!trackedResultDeleted) disposeTrackedResult?.()
    expect(completedOperationCount).toBe(1)
    expect(deletionObservedBeforeTestCleanup).toBe(true)
  }, 120_000)
})
